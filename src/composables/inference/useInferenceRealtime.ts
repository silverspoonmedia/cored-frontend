import { createRealtimeChannel } from '@/composables/echo/realtimeChannel'

export type InferenceRealtimeHandlers = {
  onCatalogChanged?: (payload: { entity: string; action: string; entity_id: string | null }) => void
}

const channel = createRealtimeChannel<InferenceRealtimeHandlers>({
  channel: 'inference.catalog',
  events: [
    {
      event: '.inference.catalog.changed',
      handle: (handlers, payload: { entity: string; action: string; entity_id: string | null }) => {
        for (const h of handlers) h.onCatalogChanged?.(payload)
      },
    },
  ],
})

export function subscribeInferenceCatalogRealtime(handlers: InferenceRealtimeHandlers): boolean {
  return channel.subscribe(handlers)
}

export function unsubscribeInferenceCatalogRealtime(handlers: InferenceRealtimeHandlers): void {
  channel.unsubscribe(handlers)
}

export function useInferenceRealtime() {
  return {
    subscribe: subscribeInferenceCatalogRealtime,
    unsubscribe: unsubscribeInferenceCatalogRealtime,
  }
}
