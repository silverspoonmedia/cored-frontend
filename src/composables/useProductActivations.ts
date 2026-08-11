import { ref } from 'vue'
import { get, post } from '@/api/client'
import type {
  ApiResponse,
  ProductActivation,
  ProductActivationSummary,
  ProductActivationShowPayload,
} from '@/api/types'

export function useProductActivations() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProducts(): Promise<ProductActivationSummary[]> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<ProductActivationSummary[]>>(
        'admin/product-activations/products',
      )
      if (res.status === 'success' && res.data) {
        return res.data
      }
      return []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch products'
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchProductShow(
    productKey: string,
    state?: string,
    page?: number,
  ): Promise<ProductActivationShowPayload> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, unknown> = {}
      if (state) params.state = state
      if (page) params.page = page

      const res = await get<ApiResponse<ProductActivationShowPayload>>(
        `admin/product-activations/products/${productKey}`,
        params,
      )
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? 'Failed to fetch product activations')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch product activations'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchIndex(params: Record<string, unknown> = {}): Promise<{
    items: ProductActivation[]
    pagination: { current_page: number; last_page: number; per_page: number; total: number }
  }> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<{ data: ProductActivation[]; pagination: unknown }>>(
        'admin/product-activations',
        params,
      )
      if (res.status === 'success' && res.data) {
        return {
          items: res.data.data ?? [],
          pagination: (res.data.pagination as {
            current_page: number
            last_page: number
            per_page: number
            total: number
          }) ?? { current_page: 1, last_page: 1, per_page: 50, total: 0 },
        }
      }
      return { items: [], pagination: { current_page: 1, last_page: 1, per_page: 50, total: 0 } }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch activations'
      return { items: [], pagination: { current_page: 1, last_page: 1, per_page: 50, total: 0 } }
    } finally {
      loading.value = false
    }
  }

  async function approve(id: string, payload?: Record<string, unknown>): Promise<ProductActivation> {
    const res = await post<ApiResponse<ProductActivation>>(
      `admin/product-activations/${id}/approve`,
      { payload: payload ?? [] },
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to approve')
  }

  async function reject(id: string, reason: string): Promise<ProductActivation> {
    const res = await post<ApiResponse<ProductActivation>>(
      `admin/product-activations/${id}/reject`,
      { reason },
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to reject')
  }

  async function suspend(id: string, reason?: string): Promise<ProductActivation> {
    const res = await post<ApiResponse<ProductActivation>>(
      `admin/product-activations/${id}/suspend`,
      { reason: reason ?? null },
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to suspend')
  }

  async function reactivate(id: string): Promise<ProductActivation> {
    const res = await post<ApiResponse<ProductActivation>>(
      `admin/product-activations/${id}/reactivate`,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to reactivate')
  }

  return {
    loading,
    error,
    fetchProducts,
    fetchProductShow,
    fetchIndex,
    approve,
    reject,
    suspend,
    reactivate,
  }
}
