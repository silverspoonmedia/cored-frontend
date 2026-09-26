import { ref } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get, post, put, patch, del } from '@/api/client'
import { type ApiResponse, type ListPagination, type PagedList } from '@/api/types'

export interface ListParams {
  [key: string]: unknown
}

export function emptyListPagination(): ListPagination {
  return {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    has_more: false,
  }
}

function isPagedList<T>(data: unknown): data is PagedList<T> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false
  const record = data as Record<string, unknown>
  return Array.isArray(record.items) && typeof record.pagination === 'object' && record.pagination !== null
}

export function unwrapListPayload<T>(data: unknown): { items: T[]; pagination: ListPagination } {
  if (isPagedList<T>(data)) {
    return { items: data.items, pagination: data.pagination }
  }
  const items = Array.isArray(data) ? data as T[] : []
  return {
    items,
    pagination: {
      current_page: 1,
      last_page: 1,
      per_page: items.length || 10,
      total: items.length,
      has_more: false,
    },
  }
}

function compactParams(params: ListParams): ListParams {
  const out: ListParams = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out
}

function wantsPaging(params?: ListParams): boolean {
  if (!params) return false
  return 'page' in params || 'per_page' in params || 'search' in params
}

export function useResource<T>(baseUri: string) {
  const { t } = useI18n()
  const items: Ref<T[]> = ref([])
  const pagination: Ref<ListPagination> = ref(emptyListPagination())
  const loading = ref(false)
  const error = ref<string | null>(null)
  let lastPaged: ListParams | null = null

  async function fetchList(params?: ListParams): Promise<T[]> {
    loading.value = true
    error.value = null

    try {
      const query: Record<string, unknown> = { display_mode: 'query' }
      if (params === undefined && lastPaged) {
        Object.assign(query, lastPaged)
      } else if (wantsPaging(params)) {
        lastPaged = compactParams({
          page: 1,
          per_page: 10,
          ...lastPaged,
          ...params,
        })
        Object.assign(query, lastPaged)
      } else if (params) {
        Object.assign(query, compactParams(params))
      }

      const res = await get<ApiResponse<T[] | PagedList<T>>>(baseUri, query)
      if (res.status === 'success' && res.data) {
        const parsed = unwrapListPayload<T>(res.data)
        items.value = parsed.items
        pagination.value = parsed.pagination
        return parsed.items
      }

      items.value = []
      pagination.value = emptyListPagination()
      error.value = t('ui.shared.load_failed')
      return []
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('ui.shared.load_failed')
      items.value = []
      pagination.value = emptyListPagination()
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchOne(id: string | number, params?: ListParams): Promise<T> {
    loading.value = true
    error.value = null

    try {
      const res = await get<ApiResponse<T>>(`${baseUri}/${id}`, params)
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? t('ui.shared.load_failed'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('ui.shared.load_failed')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function create(data: Record<string, unknown>): Promise<T> {
    error.value = null
    try {
      const res = await post<ApiResponse<T>>(baseUri, data)
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? t('ui.shared.create_failed'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('ui.shared.create_failed')
      throw e
    }
  }

  async function update(id: string | number, data: Record<string, unknown>): Promise<T> {
    error.value = null
    try {
      const res = await put<ApiResponse<T>>(`${baseUri}/${id}`, data)
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? t('ui.shared.update_failed'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('ui.shared.update_failed')
      throw e
    }
  }

  async function patchOne(id: string | number, data: Record<string, unknown>): Promise<T> {
    error.value = null
    try {
      const res = await patch<ApiResponse<T>>(`${baseUri}/${id}`, data)
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? t('ui.shared.update_failed'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('ui.shared.update_failed')
      throw e
    }
  }

  async function destroy(id: string | number): Promise<void> {
    error.value = null
    try {
      await del<ApiResponse<null>>(`${baseUri}/${id}`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('ui.shared.delete_failed')
      throw e
    }
  }

  return {
    items,
    pagination,
    loading,
    error,
    fetchList,
    fetchOne,
    create,
    update,
    patchOne,
    destroy,
  }
}
