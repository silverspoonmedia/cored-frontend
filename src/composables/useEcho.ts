import Echo, { type EchoOptions } from 'laravel-echo'
import Pusher from 'pusher-js'
import type { ChannelAuthorizerGenerator } from 'pusher-js'
import { ref, type Ref } from 'vue'
import { resolveApiUrl, isCrossOrigin } from '@/api/baseUrl'
import { applyCsrfHeader, ensureCsrf } from '@/api/csrf'
import { applySpaRequestHeader } from '@/api/requestHeaders'

type PusherEcho = Echo<'pusher'>
type PusherEchoOptions = EchoOptions<'pusher'> & { broadcaster: 'pusher' }

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
      const crossOrigin = isCrossOrigin(config.authEndpoint)
      const run = async (): Promise<Response> => {
        if (crossOrigin) {
          await ensureCsrf()
        }
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        }
        const headerObj = new Headers(headers)
        applySpaRequestHeader(headerObj)
        if (crossOrigin) {
          applyCsrfHeader(headerObj)
        }
        return fetch(config.authEndpoint, {
          method: 'POST',
          credentials: crossOrigin ? 'include' : 'same-origin',
          headers: headerObj,
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
        })
      }
      run()
        .then(async (res) => {
          const data: unknown = await res.json()
          if (!res.ok) {
            callback(new Error('Broadcast auth failed'), null)
            return
          }
          if (
            typeof data !== 'object'
            || data === null
            || !('auth' in data)
            || typeof data.auth !== 'string'
          ) {
            callback(new Error('Invalid broadcast auth response'), null)
            return
          }
          callback(null, {
            auth: data.auth,
            ...('channel_data' in data && typeof data.channel_data === 'string'
              ? { channel_data: data.channel_data }
              : {}),
            ...('shared_secret' in data && typeof data.shared_secret === 'string'
              ? { shared_secret: data.shared_secret }
              : {}),
          })
        })
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
