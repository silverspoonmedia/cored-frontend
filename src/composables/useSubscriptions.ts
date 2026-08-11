import { useResource } from '@/composables/useResource'
import type { Subscription } from '@/api/types'

export function useSubscriptions() {
  const base = useResource<Subscription>('subscriptions')
  return {
    items: base.items,
    loading: base.loading,
    error: base.error,
    fetchList: base.fetchList,
    fetchOne: base.fetchOne,
    create: base.create,
    update: base.update,
    destroy: base.destroy,
  }
}
