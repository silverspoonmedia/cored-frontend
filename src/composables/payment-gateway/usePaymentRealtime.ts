import { createKeyedRealtimeChannel, createRealtimeChannel } from '@/composables/echo/realtimeChannel'
import type { InvoiceStatusPayload } from '@/api/types'

type InvoiceStatusListener = (payload: InvoiceStatusPayload) => void

// payments.invoice.{id}: one ref-counted channel per invoice, so InvoiceShowView
// and CheckoutPanel can hold subscriptions to different invoices at once.
const invoiceChannels = createKeyedRealtimeChannel<string, InvoiceStatusListener>({
  channel: (invoiceId: string) => `payments.invoice.${invoiceId}`,
  events: () => [
    {
      event: '.invoice.status.changed',
      handle: (handlers, payload: InvoiceStatusPayload) => {
        for (const h of handlers) h(payload)
      },
    },
  ],
})

const routingChannel = createRealtimeChannel<() => void>({
  channel: 'payments.routing',
  events: [
    {
      event: '.routing.catalog.changed',
      handle: (handlers) => {
        for (const h of handlers) h()
      },
    },
  ],
})

/**
 * payments.admin is shared by four handler streams (invoice list, gateway,
 * channel, subscription). One channel + one ref-count over the union of the
 * attached streams; a stream binds its own callback and the channel leaves when
 * the last one detaches.
 */
type AdminStreamHandlers = {
  onInvoiceListChanged?: () => void
  onGatewayChanged?: () => void
  onChannelChanged?: () => void
  onSubscriptionChanged?: () => void
}

const adminChannel = createRealtimeChannel<AdminStreamHandlers>({
  channel: 'payments.admin',
  events: [
    {
      event: '.invoice.list.changed',
      handle: (handlers) => {
        for (const h of handlers) h.onInvoiceListChanged?.()
      },
    },
    {
      event: '.payments.gateway.changed',
      handle: (handlers) => {
        for (const h of handlers) h.onGatewayChanged?.()
      },
    },
    {
      event: '.payments.channel.changed',
      handle: (handlers) => {
        for (const h of handlers) h.onChannelChanged?.()
      },
    },
    {
      event: '.payments.subscription.changed',
      handle: (handlers) => {
        for (const h of handlers) h.onSubscriptionChanged?.()
      },
    },
  ],
})

// Registry release needs the exact handler identity that was subscribed, and
// several of the view-facing unsubscribe helpers take no argument — the stable
// binding object per callback bridges the two.
const adminBindings = new Map<() => void, AdminStreamHandlers>()

function bindAdminStream(stream: keyof AdminStreamHandlers, onChanged: () => void): boolean {
  let binding = adminBindings.get(onChanged)
  if (binding === undefined) {
    binding = {}
    adminBindings.set(onChanged, binding)
  }
  binding[stream] = onChanged
  return adminChannel.subscribe(binding)
}

function unbindAdminStream(stream: keyof AdminStreamHandlers, onChanged: () => void): void {
  const binding = adminBindings.get(onChanged)
  if (binding === undefined) return
  adminChannel.unsubscribe(binding)
  adminBindings.delete(onChanged)
}

export function usePaymentRealtime() {
  const invoiceBindings: Array<{ id: string; handler: InvoiceStatusListener }> = []
  const routingHandlers: Array<() => void> = []

  function subscribeInvoice(invoiceId: string, onStatusChanged: InvoiceStatusListener): boolean {
    invoiceBindings.push({ id: invoiceId, handler: onStatusChanged })
    return invoiceChannels.subscribe(invoiceId, onStatusChanged)
  }

  function unsubscribeInvoice(): void {
    for (const { id, handler } of invoiceBindings) {
      invoiceChannels.unsubscribe(id, handler)
    }
    invoiceBindings.length = 0
  }

  function subscribeRoutingCatalog(onCatalogChanged: () => void): boolean {
    routingHandlers.push(onCatalogChanged)
    return routingChannel.subscribe(onCatalogChanged)
  }

  function unsubscribeRoutingCatalog(): void {
    for (const handler of routingHandlers) {
      routingChannel.unsubscribe(handler)
    }
    routingHandlers.length = 0
  }

  /**
   * Admin invoice list live updates. Multiple views may listen at once —
   * the shared channel binds when the first stream attaches, leaves when every
   * stream is empty.
   */
  function subscribeAdminList(onListChanged: () => void): boolean {
    return bindAdminStream('onInvoiceListChanged', onListChanged)
  }

  function unsubscribeAdminList(onListChanged: () => void): void {
    unbindAdminStream('onInvoiceListChanged', onListChanged)
  }

  /** Payment gateway list live updates (shares the payments.admin channel). */
  function subscribeGatewayList(onGatewayChanged: () => void): boolean {
    return bindAdminStream('onGatewayChanged', onGatewayChanged)
  }

  function unsubscribeGatewayList(onGatewayChanged: () => void): void {
    unbindAdminStream('onGatewayChanged', onGatewayChanged)
  }

  /** Payment channel list live updates (shares the payments.admin channel). */
  function subscribeChannelList(onChannelChanged: () => void): boolean {
    return bindAdminStream('onChannelChanged', onChannelChanged)
  }

  function unsubscribeChannelList(onChannelChanged: () => void): void {
    unbindAdminStream('onChannelChanged', onChannelChanged)
  }

  /** Subscription list live updates (shares the payments.admin channel). */
  function subscribeSubscriptionList(onSubscriptionChanged: () => void): boolean {
    return bindAdminStream('onSubscriptionChanged', onSubscriptionChanged)
  }

  function unsubscribeSubscriptionList(onSubscriptionChanged: () => void): void {
    unbindAdminStream('onSubscriptionChanged', onSubscriptionChanged)
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
