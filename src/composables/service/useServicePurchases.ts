import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get, patch } from '@/api/client'
import type { ApiResponse, ServicePurchase } from '@/api/types'

export function useServicePurchases() {
  const { t } = useI18n()
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
      throw new Error(res.message ?? t('web.services.purchases.load_failed'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.services.purchases.load_failed')
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
      throw new Error(res.message ?? t('web.services.purchases.update_failed'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.services.purchases.update_failed')
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
