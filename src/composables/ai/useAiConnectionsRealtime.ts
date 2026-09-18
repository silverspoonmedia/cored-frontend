import { createRealtimeChannel } from '@/composables/echo/realtimeChannel'

/**
 * `ai.connections` private channel. Payload carries ids + status only — the
 * endpoint and the API key never travel over the wire.
 */
export type AiConnectionsRealtimeHandlers = {
  onConnectionChanged?: (payload: {
    action: string
    connection_id: string | null
    slug: string | null
    status: string | null
  }) => void
}

const channel = createRealtimeChannel<AiConnectionsRealtimeHandlers>({
  channel: 'ai.connections',
  events: [
    {
      event: '.ai.connection.changed',
      handle: (handlers, payload: {
        action: string
        connection_id: string | null
        slug: string | null
        status: string | null
      }) => {
        for (const h of handlers) h.onConnectionChanged?.(payload)
      },
    },
  ],
})

export function subscribeAiConnectionsRealtime(handlers: AiConnectionsRealtimeHandlers): boolean {
  return channel.subscribe(handlers)
}

export function unsubscribeAiConnectionsRealtime(handlers: AiConnectionsRealtimeHandlers): void {
  channel.unsubscribe(handlers)
}

export function useAiConnectionsRealtime() {
  return {
    subscribe: subscribeAiConnectionsRealtime,
    unsubscribe: unsubscribeAiConnectionsRealtime,
  }
}
