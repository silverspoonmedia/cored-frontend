import { useResource } from '@/composables/useResource'
import { get, post } from '@/api/client'
import type { ApiResponse, Service, ServiceOptions, ServicePurchase } from '@/api/types'

export function useServices() {
  const base = useResource<Service>('services')

  async function fetchOptions(): Promise<ServiceOptions> {
    const res = await get<ApiResponse<ServiceOptions>>('services/options')
    if (res.status === 'success' && res.data) {
      return res.data
    }
    return { billing_intervals: [], plan_kinds: [], statuses: [] }
  }

  async function checkout(serviceId: string, currency: string, quantity = 1): Promise<ServicePurchase> {
    const res = await post<ApiResponse<ServicePurchase>>(`services/${serviceId}/checkout`, {
      currency,
      quantity,
    })
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? 'Checkout failed')
  }

  return {
    items: base.items,
    loading: base.loading,
    error: base.error,
    fetchList: base.fetchList,
    fetchOne: base.fetchOne,
    fetchOptions,
    create: base.create,
    update: base.update,
    destroy: base.destroy,
    checkout,
  }
}
