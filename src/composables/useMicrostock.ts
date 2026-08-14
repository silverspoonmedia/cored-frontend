import { get, post, patch, getBlob } from '@/api/client'
import { saveBlob } from '@/utils/download'
import type {
  ApiResponse,
  FhWorkspace,
  MicrostockAssetMetadata,
  MicrostockCollectionPayload,
  MicrostockCollectionStatusPayload,
  MicrostockCollectionExportPayload,
  MicrostockSlotStatus,
} from '@/api/types'

export function useMicrostock() {
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

  async function downloadCollectionCsv(folderId: string): Promise<void> {
    const { blob, filename } = await getBlob(`microstock/collections/${folderId}/download`)
    saveBlob(blob, filename ?? `collection-${folderId}.csv`)
  }

  async function fetchAssetMetadata(fileId: string): Promise<MicrostockAssetMetadata> {
    const res = await get<ApiResponse<MicrostockAssetMetadata>>(
      `microstock/assets/${fileId}/metadata`,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to load metadata')
  }

  async function updateAssetMetadata(
    fileId: string,
    title: string,
    keywords: string[],
  ): Promise<MicrostockAssetMetadata> {
    const res = await patch<ApiResponse<MicrostockAssetMetadata>>(
      `microstock/assets/${fileId}/metadata`,
      { title, keywords },
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to save metadata')
  }

  async function analyzeAsset(fileId: string): Promise<MicrostockAssetMetadata> {
    const res = await post<ApiResponse<MicrostockAssetMetadata>>(
      `microstock/assets/${fileId}/analyze`,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to queue analysis')
  }

  async function fetchSlots(): Promise<MicrostockSlotStatus> {
    const res = await get<ApiResponse<MicrostockSlotStatus>>('microstock/slots')
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to load slots')
  }

  async function createWorkspace(name?: string | null): Promise<FhWorkspace> {
    const body: Record<string, unknown> = {}
    if (name?.trim()) body.name = name.trim()
    const res = await post<ApiResponse<{
      id: string
      name: string
      kind: string
      status: string
      owner_user_id: string
    }>>('microstock/workspaces', body)
    if (res.status === 'success' && res.data) {
      return {
        id: res.data.id,
        owner_user_id: res.data.owner_user_id,
        name: res.data.name,
        kind: res.data.kind,
        status: res.data.status,
        is_owner: true,
        my_role: 'Owner',
        created_at: null,
        updated_at: null,
      }
    }
    throw new Error(res.message ?? 'Failed to create workspace')
  }

  return {
    lockCollection,
    analyzeCollection,
    fetchCollectionStatus,
    exportCollection,
    downloadCollectionCsv,
    fetchAssetMetadata,
    updateAssetMetadata,
    analyzeAsset,
    fetchSlots,
    createWorkspace,
  }
}