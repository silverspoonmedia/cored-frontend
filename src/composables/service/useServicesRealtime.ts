import { getEcho } from '@/composables/useEcho'

export type ServicesRealtimeHandlers = {
  onCatalogChanged?: () => void
}

export type PurchaseRealtimeHandlers = {
  onPurchaseChanged?: (payload: { purchase_id: string; action: string }) => void
}

const catalogHandlers = new Set<ServicesRealtimeHandlers>()
let catalogChannelActive = false

function ensureCatalogChannel(): boolean {
  if (catalogChannelActive) return true
  const echo = getEcho()
  if (!echo) return false
  try {
    const ch = echo.private('services.catalog')
    ch.listen('.service.catalog.changed', () => {
      for (const h of catalogHandlers) h.onCatalogChanged?.()
    })
    catalogChannelActive = true
    return true
  } catch {
    return false
  }
}

function maybeLeaveCatalog(): void {
  if (catalogHandlers.size > 0) return
  if (!catalogChannelActive) return
  const echo = getEcho()
  if (echo) {
    try {
      echo.leave('services.catalog')
    } catch {
      // ignore
    }
  }
  catalogChannelActive = false
}

export function subscribeServiceCatalogRealtime(handlers: ServicesRealtimeHandlers): boolean {
  catalogHandlers.add(handlers)
  return ensureCatalogChannel()
}

export function unsubscribeServiceCatalogRealtime(handlers: ServicesRealtimeHandlers): void {
  catalogHandlers.delete(handlers)
  maybeLeaveCatalog()
}

const purchaseHandlers = new Set<PurchaseRealtimeHandlers>()
let purchaseChannelId: string | null = null

function ensurePurchaseChannel(purchaseId: string): boolean {
  const echo = getEcho()
  if (!echo) return false

  if (purchaseChannelId === purchaseId) return true

  if (purchaseChannelId !== null) {
    try {
      echo.leave(`services.purchase.${purchaseChannelId}`)
    } catch {
      // ignore
    }
    purchaseChannelId = null
  }

  try {
    const ch = echo.private(`services.purchase.${purchaseId}`)
    ch.listen('.service.purchase.changed', (e: { purchase_id: string; action: string }) => {
      for (const h of purchaseHandlers) h.onPurchaseChanged?.(e)
    })
    purchaseChannelId = purchaseId
    return true
  } catch {
    return false
  }
}

function maybeLeavePurchase(): void {
  if (purchaseHandlers.size > 0) return
  if (purchaseChannelId === null) return
  const echo = getEcho()
  if (echo) {
    try {
      echo.leave(`services.purchase.${purchaseChannelId}`)
    } catch {
      // ignore
    }
  }
  purchaseChannelId = null
}

export function subscribePurchaseRealtime(purchaseId: string, handlers: PurchaseRealtimeHandlers): boolean {
  purchaseHandlers.add(handlers)
  return ensurePurchaseChannel(purchaseId)
}

export function unsubscribePurchaseRealtime(handlers: PurchaseRealtimeHandlers): void {
  purchaseHandlers.delete(handlers)
  maybeLeavePurchase()
}

export function useServicesRealtime() {
  return {
    subscribeCatalog: subscribeServiceCatalogRealtime,
    unsubscribeCatalog: unsubscribeServiceCatalogRealtime,
    subscribePurchase: subscribePurchaseRealtime,
    unsubscribePurchase: unsubscribePurchaseRealtime,
  }
}
