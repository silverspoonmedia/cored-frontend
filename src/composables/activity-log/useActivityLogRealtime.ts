import { createRealtimeChannel } from '@/composables/echo/realtimeChannel'

export type ActivityLogRealtimeHandlers = {
  onActivityAppended?: (payload: { log_name: string; event: string }) => void
}

const channel = createRealtimeChannel<ActivityLogRealtimeHandlers>({
  channel: 'logs.activity',
  events: [
    {
      event: '.log.activity.appended',
      handle: (handlers, payload: { log_name: string; event: string }) => {
        for (const h of handlers) h.onActivityAppended?.(payload)
      },
    },
  ],
})

export function subscribeActivityLogRealtime(handlers: ActivityLogRealtimeHandlers): boolean {
  return channel.subscribe(handlers)
}

export function unsubscribeActivityLogRealtime(handlers: ActivityLogRealtimeHandlers): void {
  channel.unsubscribe(handlers)
}

export function useActivityLogRealtime() {
  return {
    subscribe: subscribeActivityLogRealtime,
    unsubscribe: unsubscribeActivityLogRealtime,
  }
}
