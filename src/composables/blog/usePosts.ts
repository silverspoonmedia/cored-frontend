import { useResource } from '@/composables/useResource'
import { get, post } from '@/api/client'
import type { ApiResponse, PagedList } from '@/api/types'
import type { BlogPost } from '@/api/types'

export function usePosts() {
  const base = useResource<BlogPost>('blog/posts')
  return {
    items: base.items,
    pagination: base.pagination,
    loading: base.loading,
    error: base.error,
    fetchList: base.fetchList,
    fetchOne: base.fetchOne,
    create: base.create,
    update: base.update,
    patchOne: base.patchOne,
    destroy: base.destroy,
    fetchTrashed,
    restore,
  }

  /** GET blog/posts/trashed — soft-deleted posts. */
  async function fetchTrashed(params?: Record<string, unknown>): Promise<BlogPost[]> {
    const res = await get<ApiResponse<PagedList<BlogPost> | BlogPost[]>>('blog/posts/trashed', params)
    if (res.status === 'success' && res.data) {
      const data = res.data
      if (Array.isArray(data)) return data
      return data.items ?? []
    }
    return []
  }

  /** POST blog/posts/{id}/restore — requires `restore posts` permission. */
  async function restore(id: string): Promise<BlogPost> {
    const res = await post<ApiResponse<BlogPost>>(`blog/posts/${id}/restore`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Restore failed')
  }
}
