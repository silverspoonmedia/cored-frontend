import { createKeyedRealtimeChannel, createRealtimeChannel } from '@/composables/echo/realtimeChannel'

export type ServicesRealtimeHandlers = {
  onCatalogChanged?: () => void
}

export type PurchaseRealtimeHandlers = {
  onPurchaseChanged?: (payload: { purchase_id: string; action: string }) => void
}

const catalogChannel = createRealtimeChannel<ServicesRealtimeHandlers>({
  channel: 'services.catalog',
  events: [
    {
      event: '.service.catalog.changed',
      handle: (handlers) => {
        for (const h of handlers) h.onCatalogChanged?.()
      },
    },
  ],
})

const purchaseChannels = createKeyedRealtimeChannel<string, PurchaseRealtimeHandlers>({
  channel: (purchaseId: string) => `services.purchase.${purchaseId}`,
  events: () => [
    {
      event: '.service.purchase.changed',
      handle: (handlers, payload: { purchase_id: string; action: string }) => {
        for (const h of handlers) h.onPurchaseChanged?.(payload)
      },
    },
  ],
})

// The view-facing `unsubscribePurchase(handlers)` carries no id, so the last
// subscribed purchase is remembered here.
let activePurchaseId: string | null = null

export function subscribeServiceCatalogRealtime(handlers: ServicesRealtimeHandlers): boolean {
  return catalogChannel.subscribe(handlers)
}

export function unsubscribeServiceCatalogRealtime(handlers: ServicesRealtimeHandlers): void {
  catalogChannel.unsubscribe(handlers)
}

export function subscribePurchaseRealtime(purchaseId: string, handlers: PurchaseRealtimeHandlers): boolean {
  activePurchaseId = purchaseId
  return purchaseChannels.subscribe(purchaseId, handlers)
}

export function unsubscribePurchaseRealtime(handlers: PurchaseRealtimeHandlers): void {
  if (activePurchaseId === null) return
  purchaseChannels.unsubscribe(activePurchaseId, handlers)
  activePurchaseId = null
}

export function useServicesRealtime() {
  return {
    subscribeCatalog: subscribeServiceCatalogRealtime,
    unsubscribeCatalog: unsubscribeServiceCatalogRealtime,
    subscribePurchase: subscribePurchaseRealtime,
    unsubscribePurchase: unsubscribePurchaseRealtime,
  }
}
