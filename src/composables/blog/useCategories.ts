import { useResource } from '@/composables/useResource'
import type { BlogCategory } from '@/api/types'

export function useCategories() {
  const base = useResource<BlogCategory>('blog/categories')
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
