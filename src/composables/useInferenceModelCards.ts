import { useResource } from '@/composables/useResource'
import type { AiModelCard } from '@/api/types'

export function useInferenceModelCards() {
  const base = useResource<AiModelCard>('inference/model-cards')
  return {
    items: base.items,
    pagination: base.pagination,
    loading: base.loading,
    error: base.error,
    fetchList: base.fetchList,
    fetchOne: base.fetchOne,
    create: base.create,
    update: base.update,
    destroy: base.destroy,
  }
}
