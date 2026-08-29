import { getEcho } from '@/composables/useEcho'
import type { InvoiceStatusPayload } from '@/api/types'

let invoiceChannel: string | null = null
let routingBound = false
let adminListBound = false

export function usePaymentRealtime() {
  function subscribeInvoice(
    invoiceId: string,
    onStatusChanged: (payload: InvoiceStatusPayload) => void,
  ): boolean {
    const echo = getEcho()
    if (!echo) return false

    const channel = `payments.invoice.${invoiceId}`
    if (invoiceChannel === channel) return true

    unsubscribeInvoice()

    try {
      echo.private(channel).listen('.invoice.status.changed', (e: InvoiceStatusPayload) => {
        onStatusChanged(e)
      })
      invoiceChannel = channel
      return true
    } catch {
      return false
    }
  }

  function unsubscribeInvoice(): void {
    if (!invoiceChannel) return
    const echo = getEcho()
    if (echo) {
      try {
        echo.leave(invoiceChannel)
      } catch {
        // ignore
      }
    }
    invoiceChannel = null
  }

  function subscribeRoutingCatalog(onCatalogChanged: () => void): boolean {
    if (routingBound) return true
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

  function subscribeAdminList(onListChanged: () => void): boolean {
    if (adminListBound) return true
    const echo = getEcho()
    if (!echo) return false

    try {
      echo.private('payments.admin').listen('.invoice.list.changed', () => {
        onListChanged()
      })
      adminListBound = true
      return true
    } catch {
      return false
    }
  }

  function unsubscribeAdminList(): void {
    if (!adminListBound) return
    const echo = getEcho()
    if (echo) {
      try {
        echo.leave('payments.admin')
      } catch {
        // ignore
      }
    }
    adminListBound = false
  }

  return {
    subscribeInvoice,
    unsubscribeInvoice,
    subscribeRoutingCatalog,
    unsubscribeRoutingCatalog,
    subscribeAdminList,
    unsubscribeAdminList,
  }
}
