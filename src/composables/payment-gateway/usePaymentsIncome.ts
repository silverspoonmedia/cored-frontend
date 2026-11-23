import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get } from '@/api/client'
import type { ApiResponse, PaymentIncomeOverview, PaymentIncomeInvoicesPayload } from '@/api/types'

export function usePaymentsIncome() {
  const { t } = useI18n()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchOverview(
    params: Record<string, unknown> = {},
  ): Promise<PaymentIncomeOverview> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<PaymentIncomeOverview>>(
        'payments/income',
        params,
      )
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? t('web.payments.income.load_failed'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.payments.income.load_failed')
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
      throw new Error(res.message ?? t('web.payments.income.load_failed'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.payments.income.load_failed')
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
