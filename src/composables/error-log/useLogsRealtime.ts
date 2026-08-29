import { getEcho } from '@/composables/useEcho'

export type LogsRealtimeHandlers = {
  onErrorRecorded?: (payload: { level: string; type: string }) => void
}

const handlerSet = new Set<LogsRealtimeHandlers>()
let channelActive = false

function ensureChannel(): boolean {
  if (channelActive) return true
  const echo = getEcho()
  if (!echo) return false
  try {
    const ch = echo.private('logs.errors')
    ch.listen('.log.error.recorded', (e: { level: string; type: string }) => {
      for (const h of handlerSet) h.onErrorRecorded?.(e)
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
      echo.leave('logs.errors')
    } catch {
      // ignore
    }
  }
  channelActive = false
}

export function subscribeErrorLogsRealtime(handlers: LogsRealtimeHandlers): boolean {
  handlerSet.add(handlers)
  return ensureChannel()
}

export function unsubscribeErrorLogsRealtime(handlers: LogsRealtimeHandlers): void {
  handlerSet.delete(handlers)
  maybeLeave()
}

export function useLogsRealtime() {
  return {
    subscribeErrors: subscribeErrorLogsRealtime,
    unsubscribeErrors: unsubscribeErrorLogsRealtime,
  }
}
