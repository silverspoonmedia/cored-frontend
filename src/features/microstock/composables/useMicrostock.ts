import { useI18n } from 'vue-i18n'
import { get, post, patch, getBlob } from '@/api/client'
import { saveBlob } from '@/utils/download'
import type { ApiResponse } from '@/api/types'
import type { ArWorkspace } from '@/features/archivd/types'
import type {
  MicrostockAssetMetadata,
  MicrostockCollectionPayload,
  MicrostockCollectionStatusPayload,
  MicrostockCollectionExportPayload,
  MicrostockMarketplaceUpload,
  MicrostockSlotStatus,
} from '../types'

export function useMicrostock() {
  const { t } = useI18n()

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
    throw new Error(res.message ?? t('web.archivd.lock_collection_failed'))
  }

  async function analyzeCollection(folderId: string): Promise<MicrostockCollectionPayload> {
    const res = await post<ApiResponse<MicrostockCollectionPayload>>(
      `microstock/collections/${folderId}/analyze`,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.microstock.ai_failed'))
  }

  async function fetchCollectionStatus(
    folderId: string,
  ): Promise<MicrostockCollectionStatusPayload> {
    const res = await get<ApiResponse<MicrostockCollectionStatusPayload>>(
      `microstock/collections/${folderId}/status`,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.operation_failed'))
  }

  async function exportCollection(folderId: string): Promise<MicrostockCollectionExportPayload> {
    const res = await post<ApiResponse<MicrostockCollectionExportPayload>>(
      `microstock/collections/${folderId}/export`,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.microstock.ai_failed'))
  }

  async function downloadCollectionCsv(folderId: string): Promise<void> {
    const { blob, filename } = await getBlob(`microstock/collections/${folderId}/download`)
    saveBlob(blob, filename ?? `collection-${folderId}.csv`)
  }

  /**
   * Queue a marketplace upload (202). Additive to the CSV path: the decision
   * record keeps export as the primary route out.
   */
  async function uploadCollection(
    folderId: string,
    credentialId: string,
  ): Promise<MicrostockMarketplaceUpload> {
    const res = await post<ApiResponse<MicrostockMarketplaceUpload>>(
      `microstock/collections/${folderId}/upload`,
      { credential_id: credentialId },
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.operation_failed'))
  }

  /** Latest attempt for this collection, or null when never attempted. */
  async function fetchUploadStatus(folderId: string): Promise<MicrostockMarketplaceUpload | null> {
    const res = await get<ApiResponse<MicrostockMarketplaceUpload | null>>(
      `microstock/collections/${folderId}/upload`,
    )
    if (res.status === 'success') return res.data ?? null
    throw new Error(res.message ?? t('web.archivd.operation_failed'))
  }

  async function fetchAssetMetadata(fileId: string): Promise<MicrostockAssetMetadata> {
    const res = await get<ApiResponse<MicrostockAssetMetadata>>(
      `microstock/assets/${fileId}/metadata`,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.microstock.metadata_load_failed'))
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
    throw new Error(res.message ?? t('web.microstock.metadata_save_failed'))
  }

  async function analyzeAsset(fileId: string): Promise<MicrostockAssetMetadata> {
    const res = await post<ApiResponse<MicrostockAssetMetadata>>(
      `microstock/assets/${fileId}/analyze`,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.microstock.ai_failed'))
  }

  async function fetchSlots(): Promise<MicrostockSlotStatus> {
    const res = await get<ApiResponse<MicrostockSlotStatus>>('microstock/slots')
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.microstock.slots_load_failed'))
  }

  async function createWorkspace(name?: string | null): Promise<ArWorkspace> {
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
    throw new Error(res.message ?? t('web.archivd.failed_create_workspace'))
  }

  return {
    lockCollection,
    analyzeCollection,
    fetchCollectionStatus,
    exportCollection,
    downloadCollectionCsv,
    uploadCollection,
    fetchUploadStatus,
    fetchAssetMetadata,
    updateAssetMetadata,
    analyzeAsset,
    fetchSlots,
    createWorkspace,
  }
}