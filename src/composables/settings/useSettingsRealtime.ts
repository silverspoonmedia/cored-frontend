import { getEcho, subscribeWhenEchoReady } from '@/composables/useEcho'

export type SettingsRealtimeHandlers = {
  onGroupChanged?: (payload: { group: string; action: string }) => void
}

const handlerSet = new Set<SettingsRealtimeHandlers>()
let activeGroup: string | null = null

function ensureChannel(group: string): boolean {
  const echo = getEcho()
  if (!echo) return false

  if (activeGroup === group) return true

  if (activeGroup !== null) {
    try {
      echo.leave(`settings.${activeGroup}`)
    } catch {
      // ignore
    }
    activeGroup = null
  }

  try {
    const ch = echo.private(`settings.${group}`)
    ch.listen('.settings.group.changed', (e: { group: string; action: string }) => {
      for (const h of handlerSet) h.onGroupChanged?.(e)
    })
    activeGroup = group
    return true
  } catch {
    return false
  }
}

function maybeLeave(): void {
  if (handlerSet.size > 0) return
  if (activeGroup === null) return
  const echo = getEcho()
  if (echo) {
    try {
      echo.leave(`settings.${activeGroup}`)
    } catch {
      // ignore
    }
  }
  activeGroup = null
}

export function subscribeSettingsRealtime(group: string, handlers: SettingsRealtimeHandlers): boolean {
  handlerSet.add(handlers)
  subscribeWhenEchoReady(() => ensureChannel(group))
  return activeGroup === group
}

export function unsubscribeSettingsRealtime(handlers: SettingsRealtimeHandlers): void {
  handlerSet.delete(handlers)
  maybeLeave()
}

export function useSettingsRealtime() {
  return {
    subscribe: subscribeSettingsRealtime,
    unsubscribe: unsubscribeSettingsRealtime,
  }
}
