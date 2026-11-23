import Echo, { type EchoOptions } from 'laravel-echo'
import Pusher from 'pusher-js'
import type { ChannelAuthorizerGenerator } from 'pusher-js'
import { onUnmounted, ref, type Ref } from 'vue'
import * as authStore from '@/stores/auth'
import { post } from '@/api/client'
import { whenCsrfCookieQuiet } from '@/api/csrf'
import { resolveApiUrl } from '@/api/baseUrl'
import { acquireChannel } from '@/composables/echo/channelRegistry'
import { registerEchoBindings } from '@/composables/echo/echoBindings'
import i18n, { ensureI18nMessages } from '@/i18n'

/**
 * The auth store namespace (`import * as`), bound at module evaluation without
 * reading a single binding — ES live bindings mean `loadAuth()` sees the store
 * no matter which side of the `client → csrf → channelRegistry → useEcho → auth
 * → client` cycle finished first. A named import would let this module's body
 * run `setRefreshHandler` while `client` is half-initialised.
 */
type AuthModule = typeof authStore

let authModule: AuthModule | null = null

function loadAuth(): AuthModule {
  authModule ??= authStore
  return authModule
}

/** The i18n singleton, with every feature pack's eager English merged. */
function loadI18n(): typeof i18n {
  ensureI18nMessages()
  return i18n
}

type PusherEcho = Echo<'pusher'>
type PusherEchoOptions = EchoOptions<'pusher'> & { broadcaster: 'pusher' }

export interface BroadcastAuthPayload {
  auth: string
  channel_data?: string
  shared_secret?: string
}

/**
 * Private-channel auth via the same fetch wrapper as /batch: CSRF mint,
 * 419 refresh+retry, and 401 session refresh. A raw fetch here used to
 * surface CSRF mismatches as a browser CORS error because it never retried.
 *
 * Echo authorizes channels at unpredictable times (connect, reconnect, late
 * subscribe) — usually outside the client's 5s session-settle window. That is
 * covered because `broadcasting/auth` is server-side read-only, so
 * `client.ts` retries its transient (cross-tab cookie-race) failures
 * unconditionally. This authorizer additionally waits out
 * `whenCsrfCookieQuiet()` first, so the *first* attempt does not overlap a
 * `__Host-spa_csrf` write and never has to be retried at all.
 */
export async function authorizeBroadcastChannel(
  channelName: string,
  socketId: string,
): Promise<BroadcastAuthPayload> {
  await whenCsrfCookieQuiet()

  const data = await post<unknown>('broadcasting/auth', {
    socket_id: socketId,
    channel_name: channelName,
  })

  if (
    typeof data !== 'object'
    || data === null
    || !('auth' in data)
    || typeof (data as { auth: unknown }).auth !== 'string'
  ) {
    throw new Error(loadI18n().global.t('ui.realtime.broadcast_auth_invalid'))
  }

  const payload = data as { auth: string; channel_data?: unknown; shared_secret?: unknown }
  return {
    auth: payload.auth,
    ...(typeof payload.channel_data === 'string' ? { channel_data: payload.channel_data } : {}),
    ...(typeof payload.shared_secret === 'string' ? { shared_secret: payload.shared_secret } : {}),
  }
}

let echoInstance: PusherEcho | null = null
let stopConnectionWatch: (() => void) | null = null
const connected = ref(false)

// Tracks a prior outage so a later "connected" is known to be a RE-connect
// (events were potentially missed) rather than the initial subscription.
let hadOutage = false

// Resync bus: views/stores register a refetch; fired once when the socket
// recovers from an outage. WebSocket-only realtime means events during a
// disconnect are lost permanently, so recovery must re-pull state.
type ResyncFn = () => void
const resyncListeners = new Set<ResyncFn>()

export function onEchoResync(fn: ResyncFn): () => void {
  resyncListeners.add(fn)
  return () => resyncListeners.delete(fn)
}

function fireResync(): void {
  for (const fn of resyncListeners) {
    try {
      fn()
    } catch {
      // a failing resync must not block the others
    }
  }
}

export interface BroadcastConfig {
  key: string
  cluster?: string
  host?: string
  port?: number
  scheme?: string
  authEndpoint: string
}

function readConfig(): BroadcastConfig | null {
  const key = import.meta.env.VITE_PUSHER_APP_KEY as string | undefined
  if (!key) return null

  const authEndpoint = resolveApiUrl('broadcasting/auth')

  const rawHost = import.meta.env.VITE_PUSHER_HOST as string | undefined
  const host = typeof rawHost === 'string' && rawHost.trim() !== ''
    && !/^api-[a-z0-9-]+\.pusher\.com$/i.test(rawHost.trim())
    ? rawHost.trim()
    : undefined

  return {
    key,
    cluster: (import.meta.env.VITE_PUSHER_APP_CLUSTER as string | undefined) ?? 'mt1',
    host,
    port: Number(import.meta.env.VITE_PUSHER_PORT as string | undefined) || 443,
    scheme: (import.meta.env.VITE_PUSHER_SCHEME as string | undefined) ?? 'https',
    authEndpoint,
  }
}

function createEcho(config: BroadcastConfig): PusherEcho {
  // Serialized authorizer: pusher-js fires one authorize per channel in
  // parallel, and when Echo connects right after init that is a ~15-request
  // burst of POST /broadcasting/auth. Parallel 419s would rotate the shared
  // CSRF cookie against in-flight retries (surfacing as CORS TypeErrors),
  // and the burst pressures the global rate limiter. Queueing keeps at most
  // one auth request in flight — each takes ~10-50ms, so total connect time
  // stays well under a second.
  let authQueue: Promise<void> = Promise.resolve()

  const authorizer: ChannelAuthorizerGenerator = (channel) => ({
    authorize: (socketId, callback) => {
      const run = authQueue.then(async () => {
        try {
          const auth = await authorizeBroadcastChannel(channel.name, socketId)
          callback(null, auth)
        } catch (err: unknown) {
          callback(err instanceof Error ? err : new Error(String(err)), null)
        }
      })
      authQueue = run.catch(() => undefined)
    },
  })

  const options: PusherEchoOptions = {
    broadcaster: 'pusher',
    key: config.key,
    cluster: config.cluster,
    forceTLS: config.scheme === 'https',
    encrypted: true,
    Pusher,
    authorizer,
    authEndpoint: config.authEndpoint,
  }

  if (config.host) {
    Object.assign(options, {
      wsHost: config.host,
      wsPort: config.port,
      wssPort: config.port,
      enabledTransports: ['ws', 'wss'],
    })
  }

  return new Echo(options)
}

export function useEcho(): {
  connected: Ref<boolean>
  init: () => boolean
  disconnect: () => void
} {
  function init(): boolean {
    if (echoInstance) return true

    const config = readConfig()
    if (!config) return false

    try {
      echoInstance = createEcho(config)
      stopConnectionWatch = echoInstance.connector.onConnectionChange((status) => {
        const isConnected = status === 'connected'
        if (isConnected && hadOutage) {
          // Recovered from an outage: any events during the gap are gone, so
          // tell every listener to re-pull its state.
          hadOutage = false
          connected.value = true
          fireResync()
          return
        }
        if (!isConnected) {
          hadOutage = true
        }
        connected.value = isConnected
      })
      connected.value = echoInstance.connectionStatus() === 'connected'

      fireReady()

      return true
    } catch {
      echoInstance = null
      stopConnectionWatch = null
      return false
    }
  }

  function disconnect(): void {
    stopConnectionWatch?.()
    stopConnectionWatch = null
    if (echoInstance) {
      echoInstance.disconnect()
      echoInstance = null
      connected.value = false
      hadOutage = false
    }
    readyListeners.clear()
  }

  return {
    connected,
    init,
    disconnect,
  }
}

export function getEcho(): PusherEcho | null {
  return echoInstance
}

/** Test hook: inject/remove a fake Echo instance (unit tests only). */
export function __setEchoForTests(echo: PusherEcho | null): void {
  echoInstance = echo
  if (echo !== null) fireReady()
}

// Ready bus: composables that subscribe before Echo is initialized (init is
// async in AppNavbar, after the shell batch) can re-attach here. Listeners
// registered after init run immediately.
type ReadyFn = () => void
const readyListeners = new Set<ReadyFn>()

export function onEchoReady(fn: ReadyFn): () => void {
  if (echoInstance) {
    fn()
    return () => readyListeners.delete(fn)
  }
  readyListeners.add(fn)
  return () => readyListeners.delete(fn)
}

function fireReady(): void {
  for (const fn of readyListeners) {
    try {
      fn()
    } catch {
      // a failing listener must not block the others
    }
  }
  readyListeners.clear()
}

/**
 * Race-safe subscribe for realtime composables. Views mount before Echo is
 * initialized (init is async in AppNavbar after the shell batch), so a plain
 * `if (!echo) return` leaves the tab deaf for the whole session. This runs
 * `attach()` immediately when Echo exists, otherwise defers it to the ready
 * bus. Returns an unsubscribe that also cancels a pending defer.
 *
 * @param attach  Bind channel listeners; return true when attached.
 */
export function subscribeWhenEchoReady(attach: () => boolean): () => void {
  if (echoInstance !== null) {
    attach()
    return () => {}
  }

  let stopReady: (() => void) | null = onEchoReady(() => {
    attach()
    stopReady = null
  })

  return () => {
    stopReady?.()
    stopReady = null
  }
}

/**
 * View-level resync registration: refetch after a socket outage, auto-stopped
 * on unmount. One line per view instead of the mount/unmount boilerplate.
 */
export function useEchoResync(fn: ResyncFn): void {
  const stop = onEchoResync(fn)
  onUnmounted(() => {
    stop()
  })
}

// ---- Personal channel (App.Models.User.{id}) --------------------------------
// Shared by the notification bell (useNotifications) and auth-self events
// (useAuthSelfRealtime). Ref-counting lives in the channel registry, so one
// consumer unsubscribing never tears the channel out from under the other.

type PersonalListener = (e: unknown) => void

function resolvePersonalChannel(): string | null {
  const id = loadAuth().useAuth().user.value?.id
  return id ? `App.Models.User.${id}` : null
}

/**
 * Listen on the user's personal channel with shared ownership. Returns an
 * unsubscribe; the channel is left only when the last listener detaches.
 *
 * The id is resolved per call: after logout/login the consumer re-listens and
 * acquires the new `App.Models.User.{id}` while releasing the previous one.
 */
export function listenPersonalChannel(events: Record<string, PersonalListener>): () => void {
  const channel = resolvePersonalChannel()
  if (channel === null) {
    return () => {}
  }

  const subscription = acquireChannel(channel, events)

  return () => subscription.release()
}

// Bind the realtime primitives into the leaf module `channelRegistry` reads, so
// it never imports this file (the two share a cycle through `@/api/client`).
registerEchoBindings({ getEcho, subscribeWhenEchoReady })


