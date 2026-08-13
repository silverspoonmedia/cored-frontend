import { ref } from 'vue'
import { get, post } from '@/api/client'
import type {
  ApiResponse,
  MicrostockCollectionPayload,
  MicrostockCollectionStatusPayload,
  MicrostockCollectionExportPayload,
} from '@/api/types'

export function useMicrostock() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function lockCollection(
    folderId: string,
    hint: string | null,
    billingMode: string | null = null,
  ): Promise<MicrostockCollectionPayload> {
    const body: Record<string, unknown> = {}
    if (hint) body.hint = hint
    if (billingMode) body.billing_mode = billingMode
    const res = await post<ApiResponse<MicrostockCollectionPayload>>(
      `microstock/collections/${folderId}/lock`,
      body,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to lock collection')
  }

  async function analyzeCollection(folderId: string): Promise<MicrostockCollectionPayload> {
    const res = await post<ApiResponse<MicrostockCollectionPayload>>(
      `microstock/collections/${folderId}/analyze`,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to analyze collection')
  }

  async function fetchCollectionStatus(
    folderId: string,
  ): Promise<MicrostockCollectionStatusPayload> {
    const res = await get<ApiResponse<MicrostockCollectionStatusPayload>>(
      `microstock/collections/${folderId}/status`,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to fetch collection status')
  }

  async function exportCollection(folderId: string): Promise<MicrostockCollectionExportPayload> {
    const res = await post<ApiResponse<MicrostockCollectionExportPayload>>(
      `microstock/collections/${folderId}/export`,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to export collection')
  }

  return {
    loading,
    error,
    lockCollection,
    analyzeCollection,
    fetchCollectionStatus,
    exportCollection,
  }
}
