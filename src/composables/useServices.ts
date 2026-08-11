import { useResource } from '@/composables/useResource'
import { get } from '@/api/client'
import type { ApiResponse, Service, ServiceOptions } from '@/api/types'

export function useServices() {
  const base = useResource<Service>('services')

  async function fetchOptions(): Promise<ServiceOptions> {
    const res = await get<ApiResponse<ServiceOptions>>('services/options')
    if (res.status === 'success' && res.data) {
      return res.data
    }
    return { billing_intervals: [], plan_kinds: [], statuses: [] }
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
  }
}
