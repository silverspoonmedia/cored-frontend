import { getEcho, subscribeWhenEchoReady } from '@/composables/useEcho'
import type { InvoiceStatusPayload } from '@/api/types'

let routingBound = false

// payments.admin is shared by 4 handler streams (invoice list, gateway,
// channel, subscription). One channel bind + one ref-count over the union of
// attached handlers; dummy-handler tricks are gone — every stream registers
// its real handler and the channel leaves when all streams are empty.
const adminHandlers = {
  invoiceList: new Set<() => void>(),
  gateway: new Set<() => void>(),
  channel: new Set<() => void>(),
  subscription: new Set<() => void>(),
}
let adminBound = false

function adminWanted(): boolean {
  return adminHandlers.invoiceList.size > 0
    || adminHandlers.gateway.size > 0
    || adminHandlers.channel.size > 0
    || adminHandlers.subscription.size > 0
}

function ensureAdminChannel(): boolean {
  if (adminBound) return true
  const echo = getEcho()
  if (!echo) return false

  try {
    const ch = echo.private('payments.admin')
    ch.listen('.invoice.list.changed', () => {
      for (const h of adminHandlers.invoiceList) h()
    })
    ch.listen('.payments.gateway.changed', () => {
      for (const h of adminHandlers.gateway) h()
    })
    ch.listen('.payments.channel.changed', () => {
      for (const h of adminHandlers.channel) h()
    })
    ch.listen('.payments.subscription.changed', () => {
      for (const h of adminHandlers.subscription) h()
    })
    adminBound = true
    return true
  } catch {
    return false
  }
}

function maybeLeaveAdmin(): void {
  if (adminWanted() || !adminBound) return
  const echo = getEcho()
  if (echo) {
    try {
      echo.leave('payments.admin')
    } catch {
      // ignore
    }
  }
  adminBound = false
}

export function usePaymentRealtime() {
  // Invoice status channel: ref-counted per caller so InvoiceShowView and
  // CheckoutPanel can hold subscriptions at the same time.
  const invoiceBindings = new Map<symbol, { channel: string; handler: (payload: InvoiceStatusPayload) => void }>()

  function subscribeInvoice(
    invoiceId: string,
    onStatusChanged: (payload: InvoiceStatusPayload) => void,
  ): boolean {
    const echo = getEcho()
    if (!echo) return false

    const channel = `payments.invoice.${invoiceId}`
    try {
      const key = Symbol('invoice-binding')
      echo.private(channel).listen('.invoice.status.changed', (e: InvoiceStatusPayload) => {
        onStatusChanged(e)
      })
      invoiceBindings.set(key, { channel, handler: onStatusChanged })
      return true
    } catch {
      return false
    }
  }

  function unsubscribeInvoice(): void {
    if (invoiceBindings.size === 0) return
    const echo = getEcho()
    for (const { channel } of invoiceBindings.values()) {
      if (echo) {
        try {
          echo.leave(channel)
        } catch {
          // ignore
        }
      }
    }
    invoiceBindings.clear()
  }

  function subscribeRoutingCatalog(onCatalogChanged: () => void): boolean {
    if (routingBound) return true

    subscribeWhenEchoReady(() => {
      const echo = getEcho()
      if (!echo) return false
      try {
        echo.private('payments.routing').listen('.routing.catalog.changed', () => {
          onCatalogChanged()
        })
        routingBound = true
        return true
      } catch {
        return false
      }
    })

    return routingBound
  }

  function unsubscribeRoutingCatalog(): void {
    if (!routingBound) return
    const echo = getEcho()
    if (echo) {
      try {
        echo.leave('payments.routing')
      } catch {
        // ignore
      }
    }
    routingBound = false
  }

  /**
   * Admin invoice list live updates. Multiple views may listen at once —
   * the shared channel binds when the first handler of any stream attaches,
   * leaves when every stream is empty.
   */
  function subscribeAdminList(onListChanged: () => void): boolean {
    adminHandlers.invoiceList.add(onListChanged)
    const ok = ensureAdminChannel()
    if (!ok) subscribeWhenEchoReady(ensureAdminChannel)
    return adminBound
  }

  function unsubscribeAdminList(onListChanged: () => void): void {
    adminHandlers.invoiceList.delete(onListChanged)
    maybeLeaveAdmin()
  }

  /**
   * Payment gateway list live updates (shares the payments.admin channel).
   */
  function subscribeGatewayList(onGatewayChanged: () => void): boolean {
    adminHandlers.gateway.add(onGatewayChanged)
    const ok = ensureAdminChannel()
    if (!ok) subscribeWhenEchoReady(ensureAdminChannel)
    return adminBound
  }

  function unsubscribeGatewayList(onGatewayChanged: () => void): void {
    adminHandlers.gateway.delete(onGatewayChanged)
    maybeLeaveAdmin()
  }

  /**
   * Payment channel list live updates (shares the payments.admin channel).
   */
  function subscribeChannelList(onChannelChanged: () => void): boolean {
    adminHandlers.channel.add(onChannelChanged)
    const ok = ensureAdminChannel()
    if (!ok) subscribeWhenEchoReady(ensureAdminChannel)
    return adminBound
  }

  function unsubscribeChannelList(onChannelChanged: () => void): void {
    adminHandlers.channel.delete(onChannelChanged)
    maybeLeaveAdmin()
  }

  /**
   * Subscription list live updates (shares the payments.admin channel).
   */
  function subscribeSubscriptionList(onSubscriptionChanged: () => void): boolean {
    adminHandlers.subscription.add(onSubscriptionChanged)
    const ok = ensureAdminChannel()
    if (!ok) subscribeWhenEchoReady(ensureAdminChannel)
    return adminBound
  }

  function unsubscribeSubscriptionList(onSubscriptionChanged: () => void): void {
    adminHandlers.subscription.delete(onSubscriptionChanged)
    maybeLeaveAdmin()
  }

  return {
    subscribeInvoice,
    unsubscribeInvoice,
    subscribeRoutingCatalog,
    unsubscribeRoutingCatalog,
    subscribeAdminList,
    unsubscribeAdminList,
    subscribeGatewayList,
    unsubscribeGatewayList,
    subscribeChannelList,
    unsubscribeChannelList,
    subscribeSubscriptionList,
    unsubscribeSubscriptionList,
  }
}
