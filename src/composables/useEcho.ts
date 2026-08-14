import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { ref, type Ref } from 'vue'
import { resolveApiUrl } from '@/api/baseUrl'

let echoInstance: Echo | null = null
const connected = ref(false)

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
    port: Number(import.meta.env.VITE_PUSHER_PORT as string | undefined) ?? 443,
    scheme: (import.meta.env.VITE_PUSHER_SCHEME as string | undefined) ?? 'https',
    authEndpoint,
  }
}

function createEcho(config: BroadcastConfig, tokenProvider: () => string | null): Echo {
  Pusher.Runtime = Pusher.Runtime || {}

  const options: Echo.Options = {
    broadcaster: 'pusher',
    key: config.key,
    cluster: config.cluster,
    forceTLS: config.scheme === 'https',
    encrypted: true,
    authorizer: (channel) => ({
      authorize: (socketId, callback) => {
        const token = tokenProvider()
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }

        fetch(config.authEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
        })
          .then((res) => res.json())
          .then((data) => callback(null, data))
          .catch((err) => callback(err, null))
      },
    }),
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

export function useEcho(tokenProvider: () => string | null): {
  echo: Ref<Echo | null>
  connected: Ref<boolean>
  init: () => boolean
  disconnect: () => void
} {
  function init(): boolean {
    if (echoInstance) return true

    const config = readConfig()
    if (!config) return false

    try {
      echoInstance = createEcho(config, tokenProvider)

      const connection = (echoInstance as unknown as { connector?: { pusher?: { connection?: { state?: string; bind?: (event: string, cb: (data: { current?: string }) => void) => void } } } }).connector?.pusher?.connection
      if (connection) {
        connection.bind('state_change', ({ current }) => {
          connected.value = current === 'connected'
        })
        if (connection.state === 'connected') {
          connected.value = true
        }
      }

      return true
    } catch {
      echoInstance = null
      return false
    }
  }

  function disconnect(): void {
    if (echoInstance) {
      echoInstance.disconnect()
      echoInstance = null
      connected.value = false
    }
  }

  return {
    echo: ref(echoInstance),
    connected,
    init,
    disconnect,
  }
}

export function getEcho(): Echo | null {
  return echoInstance
}
