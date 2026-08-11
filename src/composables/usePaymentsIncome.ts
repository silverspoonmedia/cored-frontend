import { ref } from 'vue'
import { get } from '@/api/client'
import type {
  ApiResponse,
  PaymentIncomeOverview,
  PaymentIncomeInvoicesPayload,
} from '@/api/types'

export function usePaymentsIncome() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchOverview(
    params: Record<string, unknown> = {},
  ): Promise<PaymentIncomeOverview> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<PaymentIncomeOverview>>(
        'payments/income/overview',
        params,
      )
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? 'Failed to fetch income overview')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch income overview'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchInvoices(
    params: Record<string, unknown> = {},
  ): Promise<PaymentIncomeInvoicesPayload> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<PaymentIncomeInvoicesPayload>>(
        'payments/income/invoices',
        params,
      )
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? 'Failed to fetch invoices')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch invoices'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fetchOverview,
    fetchInvoices,
  }
}
