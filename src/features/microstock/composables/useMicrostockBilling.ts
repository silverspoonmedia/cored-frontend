import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get } from '@/api/client'
import type { ApiResponse, InferenceUsageEventListPayload } from '@/api/types'
import type {
  MicrostockBillingSummary,
  MicrostockLedgerEntry,
  MicrostockUsageEvent,
  MicrostockPlatformOverview,
} from '../types'

export function useMicrostockBilling() {
  const { t } = useI18n()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBilling(): Promise<MicrostockBillingSummary> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<MicrostockBillingSummary>>(
        'microstock/billing',
      )
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? t('web.microstock.usage.load_failed_billing'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.microstock.usage.load_failed_billing')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchLedger(
    params: Record<string, unknown> = {},
  ): Promise<{ items: MicrostockLedgerEntry[]; pagination: { has_more: boolean } }> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<{ items: MicrostockLedgerEntry[]; pagination: { has_more: boolean } }>>(
        'microstock/billing/ledger',
        params,
      )
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? t('web.microstock.usage.load_failed_ledger'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.microstock.usage.load_failed_ledger')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchUsageEvents(
    params: Record<string, unknown> = {},
  ): Promise<{ items: MicrostockUsageEvent[]; pagination: { has_more: boolean } }> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<{ items: MicrostockUsageEvent[]; pagination: { has_more: boolean } }>>(
        'microstock/billing/usage-events',
        params,
      )
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? t('web.microstock.usage.load_failed_usage'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.microstock.usage.load_failed_usage')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchAdminOverview(
    params: Record<string, unknown> = {},
  ): Promise<MicrostockPlatformOverview> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<MicrostockPlatformOverview>>(
        'admin/microstock/billing/overview',
        params,
      )
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? t('web.microstock.usage.load_failed_platform'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.microstock.usage.load_failed_platform')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchAdminUsageEvents(
    params: Record<string, unknown> = {},
  ): Promise<InferenceUsageEventListPayload> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<InferenceUsageEventListPayload>>(
        'admin/microstock/billing/usage-events',
        params,
      )
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? t('web.microstock.usage.load_failed_platform_events'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.microstock.usage.load_failed_platform_events')
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fetchBilling,
    fetchLedger,
    fetchUsageEvents,
    fetchAdminOverview,
    fetchAdminUsageEvents,
  }
}
