import { getEcho, subscribeWhenEchoReady } from '@/composables/useEcho'

export type ActivityLogRealtimeHandlers = {
  onActivityAppended?: (payload: { log_name: string; event: string }) => void
}

const handlerSet = new Set<ActivityLogRealtimeHandlers>()
let channelActive = false

function ensureChannel(): boolean {
  if (channelActive) return true
  const echo = getEcho()
  if (!echo) return false
  try {
    const ch = echo.private('logs.activity')
    ch.listen('.log.activity.appended', (e: { log_name: string; event: string }) => {
      for (const h of handlerSet) h.onActivityAppended?.(e)
    })
    channelActive = true
    return true
  } catch {
    return false
  }
}

function maybeLeave(): void {
  if (handlerSet.size > 0) return
  if (!channelActive) return
  const echo = getEcho()
  if (echo) {
    try {
      echo.leave('logs.activity')
    } catch {
      // ignore
    }
  }
  channelActive = false
}

export function subscribeActivityLogRealtime(handlers: ActivityLogRealtimeHandlers): boolean {
  handlerSet.add(handlers)
  subscribeWhenEchoReady(ensureChannel)
  return channelActive
}

export function unsubscribeActivityLogRealtime(handlers: ActivityLogRealtimeHandlers): void {
  handlerSet.delete(handlers)
  maybeLeave()
}

export function useActivityLogRealtime() {
  return {
    subscribe: subscribeActivityLogRealtime,
    unsubscribe: unsubscribeActivityLogRealtime,
  }
}
