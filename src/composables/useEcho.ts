import Echo, { type EchoOptions } from 'laravel-echo'
import Pusher from 'pusher-js'
import type { ChannelAuthorizerGenerator } from 'pusher-js'
import { ref, type Ref } from 'vue'
import { post } from '@/api/client'
import { resolveApiUrl } from '@/api/baseUrl'
import i18n from '@/i18n'

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
 */
export async function authorizeBroadcastChannel(
  channelName: string,
  socketId: string,
): Promise<BroadcastAuthPayload> {
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
    throw new Error(i18n.global.t('ui.realtime.broadcast_auth_invalid'))
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
  const authorizer: ChannelAuthorizerGenerator = (channel) => ({
    authorize: (socketId, callback) => {
      authorizeBroadcastChannel(channel.name, socketId)
        .then((auth) => callback(null, auth))
        .catch((err: unknown) => {
          callback(err instanceof Error ? err : new Error(String(err)), null)
        })
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
