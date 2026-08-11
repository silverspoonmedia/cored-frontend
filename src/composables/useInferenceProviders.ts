import { useResource } from '@/composables/useResource'
import type { InferenceProvider } from '@/api/types'

export function useInferenceProviders() {
  const base = useResource<InferenceProvider>('inference/providers')
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
