import { getEcho } from '@/composables/useEcho'

export type InferenceRealtimeHandlers = {
  onCatalogChanged?: (payload: { entity: string; action: string; entity_id: string | null }) => void
}

const handlerSet = new Set<InferenceRealtimeHandlers>()
let channelActive = false

function ensureChannel(): boolean {
  if (channelActive) return true
  const echo = getEcho()
  if (!echo) return false
  try {
    const ch = echo.private('inference.catalog')
    ch.listen('.inference.catalog.changed', (e: { entity: string; action: string; entity_id: string | null }) => {
      for (const h of handlerSet) h.onCatalogChanged?.(e)
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
      echo.leave('inference.catalog')
    } catch {
      // ignore
    }
  }
  channelActive = false
}

export function subscribeInferenceCatalogRealtime(handlers: InferenceRealtimeHandlers): boolean {
  handlerSet.add(handlers)
  return ensureChannel()
}

export function unsubscribeInferenceCatalogRealtime(handlers: InferenceRealtimeHandlers): void {
  handlerSet.delete(handlers)
  maybeLeave()
}

export function useInferenceRealtime() {
  return {
    subscribe: subscribeInferenceCatalogRealtime,
    unsubscribe: unsubscribeInferenceCatalogRealtime,
  }
}
