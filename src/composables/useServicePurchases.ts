import { ref } from 'vue'
import { get, patch } from '@/api/client'
import type { ApiResponse, ServicePurchase } from '@/api/types'

export function useServicePurchases() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchOne(id: string): Promise<ServicePurchase> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<ServicePurchase>>(`service-purchases/${id}`)
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? 'Failed to fetch service purchase')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch service purchase'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateQuantity(id: string, quantity: number): Promise<ServicePurchase> {
    loading.value = true
    error.value = null
    try {
      const res = await patch<ApiResponse<ServicePurchase>>(`service-purchases/${id}/quantity`, {
        quantity,
      })
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? 'Failed to update quantity')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update quantity'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fetchOne,
    updateQuantity,
  }
}
