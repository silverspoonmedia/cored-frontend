import { useResource } from '@/composables/useResource'
import { get, post } from '@/api/client'
import type {
  ApiResponse,
  Invoice,
  PaymentChannel,
  CheckoutResult,
  SyncStatusResult,
} from '@/api/types'

export function useInvoices() {
  const base = useResource<Invoice>('invoices')

  async function fetchCheckoutChannels(invoiceId: string): Promise<PaymentChannel[]> {
    const res = await get<ApiResponse<PaymentChannel[]>>(
      `invoices/${invoiceId}/checkout-channels`,
    )
    if (res.status === 'success' && res.data) {
      return res.data
    }
    return []
  }

  async function channelCheckout(
    invoiceId: string,
    channelCode: string,
    quantity?: number,
  ): Promise<CheckoutResult> {
    const body: Record<string, unknown> = { channel_code: channelCode }
    if (quantity) body.quantity = quantity

    const res = await post<ApiResponse<CheckoutResult>>(
      `invoices/${invoiceId}/channel-checkout`,
      body,
    )
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? 'Checkout failed')
  }

  async function syncStatus(invoiceId: string, provider: string): Promise<SyncStatusResult> {
    const res = await post<ApiResponse<SyncStatusResult>>(
      `payments/providers/${provider}/invoices/${invoiceId}/sync-status`,
    )
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? 'Sync failed')
  }

  return {
    items: base.items,
    loading: base.loading,
    error: base.error,
    fetchList: base.fetchList,
    fetchOne: base.fetchOne,
    fetchCheckoutChannels,
    channelCheckout,
    syncStatus,
  }
}
