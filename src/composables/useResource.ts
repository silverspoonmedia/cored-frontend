import { ref } from 'vue'
import type { Ref } from 'vue'
import { get, post, put, patch, del } from '@/api/client'
import { ApiError, type ApiResponse } from '@/api/types'

export interface ListParams {
  [key: string]: unknown
}

export function useResource<T>(baseUri: string) {
  const items: Ref<T[]> = ref([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchList(params?: ListParams): Promise<T[]> {
    loading.value = true
    error.value = null

    try {
      const query: Record<string, unknown> = { display_mode: 'query' }
      if (params) {
        Object.assign(query, params)
      }

      const res = await get<ApiResponse<T[]>>(baseUri, query)
      if (res.status === 'success' && res.data) {
        items.value = res.data
        return res.data
      }

      items.value = []
      return []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch data'
      items.value = []
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
      throw new Error(res.message ?? 'Failed to fetch record')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch record'
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
      throw new Error(res.message ?? 'Failed to create record')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create record'
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
      throw new Error(res.message ?? 'Failed to update record')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update record'
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
      throw new Error(res.message ?? 'Failed to update record')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update record'
      throw e
    }
  }

  async function destroy(id: string | number): Promise<void> {
    error.value = null
    try {
      await del<ApiResponse<null>>(`${baseUri}/${id}`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete record'
      throw e
    }
  }

  return {
    items,
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

export function isValidationError(e: unknown): e is ApiError {
  return e instanceof ApiError && e.isValidation
}

export function getValidationErrors(e: unknown): Record<string, string[]> {
  if (e instanceof ApiError && e.isValidation) {
    return e.errors ?? {}
  }
  return {}
}
