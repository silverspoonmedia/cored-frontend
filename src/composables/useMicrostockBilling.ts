import { ref } from 'vue'
import { get } from '@/api/client'
import type {
  ApiResponse,
  MicrostockBillingSummary,
  MicrostockLedgerEntry,
  MicrostockUsageEvent,
  MicrostockPlatformOverview,
  InferenceUsageEventListPayload,
} from '@/api/types'

export function useMicrostockBilling() {
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
      throw new Error(res.message ?? 'Failed to fetch billing')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch billing'
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
      throw new Error(res.message ?? 'Failed to fetch ledger')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch ledger'
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
      throw new Error(res.message ?? 'Failed to fetch usage events')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch usage events'
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
      throw new Error(res.message ?? 'Failed to fetch admin overview')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch admin overview'
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
      throw new Error(res.message ?? 'Failed to fetch admin usage events')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch admin usage events'
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
