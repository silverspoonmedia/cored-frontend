import { createRealtimeChannel } from '@/composables/echo/realtimeChannel'

export type LogsRealtimeHandlers = {
  onErrorRecorded?: (payload: { level: string; type: string }) => void
}

const channel = createRealtimeChannel<LogsRealtimeHandlers>({
  channel: 'logs.errors',
  events: [
    {
      event: '.log.error.recorded',
      handle: (handlers, payload: { level: string; type: string }) => {
        for (const h of handlers) h.onErrorRecorded?.(payload)
      },
    },
  ],
})

export function subscribeErrorLogsRealtime(handlers: LogsRealtimeHandlers): boolean {
  return channel.subscribe(handlers)
}

export function unsubscribeErrorLogsRealtime(handlers: LogsRealtimeHandlers): void {
  channel.unsubscribe(handlers)
}

export function useLogsRealtime() {
  return {
    subscribeErrors: subscribeErrorLogsRealtime,
    unsubscribeErrors: unsubscribeErrorLogsRealtime,
  }
}
