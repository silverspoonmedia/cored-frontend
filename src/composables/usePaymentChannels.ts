import { ref } from 'vue'
import { get, put, post } from '@/api/client'
import type { ApiResponse, PaymentChannel, PaymentChannelRoute } from '@/api/types'

export function usePaymentChannels() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchList(): Promise<PaymentChannel[]> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<PaymentChannel[]>>('payment-channels', {
        scope: 'admin',
      })
      if (res.status === 'success' && res.data) {
        return res.data
      }
      return []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch channels'
      return []
    } finally {
      loading.value = false
    }
  }

  async function updateChannel(code: string, data: Record<string, unknown>): Promise<PaymentChannel> {
    const res = await put<ApiResponse<PaymentChannel>>(`payment-channels/${code}`, data)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to update channel')
  }

  async function updateRoute(routeId: string, data: Record<string, unknown>): Promise<PaymentChannelRoute> {
    const res = await put<ApiResponse<PaymentChannelRoute>>(`payment-channel-routes/${routeId}`, data)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to update route')
  }

  async function syncPolicy(): Promise<{ channels: number; routes: number; skipped: number }> {
    const res = await post<ApiResponse<{ channels: number; routes: number; skipped: number }>>(
      'payment-channels/sync-policy',
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to sync policy')
  }

  return {
    loading,
    error,
    fetchList,
    updateChannel,
    updateRoute,
    syncPolicy,
  }
}
