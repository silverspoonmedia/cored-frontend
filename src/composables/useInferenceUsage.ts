import { ref } from 'vue'
import { get } from '@/api/client'
import type {
  ApiResponse,
  AiModelCardDetail,
  InferenceUsageEventListPayload,
  InferenceUsageOverview,
} from '@/api/types'

export function useInferenceUsage() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchModelCardDetail(id: string): Promise<AiModelCardDetail> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<AiModelCardDetail>>(`inference/model-cards/${id}`)
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? 'Failed to fetch model card')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch model card'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchOverview(
    params: Record<string, unknown> = {},
  ): Promise<InferenceUsageOverview> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<InferenceUsageOverview>>(
        'inference/usage/overview',
        params,
      )
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? 'Failed to fetch usage overview')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch usage overview'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchUsageEvents(
    params: Record<string, unknown> = {},
  ): Promise<InferenceUsageEventListPayload> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<InferenceUsageEventListPayload>>(
        'inference/usage-events',
        params,
      )
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? 'Failed to fetch usage events')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch usage events'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fetchModelCardDetail,
    fetchOverview,
    fetchUsageEvents,
  }
}
