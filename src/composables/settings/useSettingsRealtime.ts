import { createRealtimeChannel } from '@/composables/echo/realtimeChannel'

export type SettingsRealtimeHandlers = {
  onGroupChanged?: (payload: { group: string; action: string }) => void
}

// Channel name follows the settings group currently on screen; `retarget`
// moves the subscription and releases the previous group's channel.
const channel = createRealtimeChannel<SettingsRealtimeHandlers>({
  channel: null,
  events: [
    {
      event: '.settings.group.changed',
      handle: (handlers, payload: { group: string; action: string }) => {
        for (const h of handlers) h.onGroupChanged?.(payload)
      },
    },
  ],
})

export function subscribeSettingsRealtime(group: string, handlers: SettingsRealtimeHandlers): boolean {
  channel.retarget(`settings.${group}`)
  return channel.subscribe(handlers)
}

export function unsubscribeSettingsRealtime(handlers: SettingsRealtimeHandlers): void {
  channel.unsubscribe(handlers)
  if (channel.size === 0) {
    channel.retarget(null)
  }
}

export function useSettingsRealtime() {
  return {
    subscribe: subscribeSettingsRealtime,
    unsubscribe: unsubscribeSettingsRealtime,
  }
}
