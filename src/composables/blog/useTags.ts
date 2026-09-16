import { useResource } from '@/composables/useResource'
import type { BlogTag } from '@/api/types'

export function useTags() {
  const base = useResource<BlogTag>('blog/tags')
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
