import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get, post, patch, del } from '@/api/client'
import type {
  ApiResponse,
  HostedFile,
  ArFolder,
  ArBrowsePayload,
  ArTrashPayload,
  ArQuota,
  ArPublicFile,
  ArPublicBrowsePayload,
  ArHashBlocklistEntry,
  ArWorkspace,
  ArWorkspaceMember,
  ArWorkspaceInvite,
  ArWorkspaceActivity,
} from '@/api/types'

export function useArchivd() {
  const { t } = useI18n()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBrowse(
    params: Record<string, unknown> = {},
  ): Promise<ArBrowsePayload> {
    const res = await get<ApiResponse<ArBrowsePayload>>('archivd/browse', params)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.load_failed'))
  }

  async function fetchTrash(
    params: Record<string, unknown> = {},
  ): Promise<ArTrashPayload> {
    const res = await get<ApiResponse<ArTrashPayload>>('archivd/trash', params)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.load_failed'))
  }

  async function fetchQuota(
    params: Record<string, unknown> = {},
  ): Promise<ArQuota> {
    const res = await get<ApiResponse<ArQuota>>('archivd/quota', params)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.load_failed'))
  }

  async function searchFiles(
    q: string,
    params: Record<string, unknown> = {},
  ): Promise<HostedFile[]> {
    const res = await get<ApiResponse<HostedFile[]>>('archivd/search', {
      q,
      ...params,
    })
    if (res.status === 'success' && res.data) return res.data
    return []
  }

  async function fetchFile(id: string): Promise<HostedFile> {
    const res = await get<ApiResponse<HostedFile>>(`archivd/files/${id}`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.failed_load_file'))
  }

  async function fetchFileDownload(
    id: string,
    params: Record<string, unknown> = {},
  ): Promise<{ url: string; expires_at: string }> {
    const res = await get<ApiResponse<{ url: string; expires_at: string }>>(
      `archivd/files/${id}/download`,
      params,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.failed_download_url'))
  }

  // Folder mutations
  async function createFolder(
    name: string,
    params: { parent_id?: string; user_id?: string; workspace_id?: string } = {},
  ): Promise<ArFolder> {
    const res = await post<ApiResponse<ArFolder>>('archivd/folders', {
      name,
      ...params,
    })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.operation_failed'))
  }

  async function renameFolder(id: string, name: string, ctx: Record<string, unknown> = {}): Promise<ArFolder> {
    const res = await patch<ApiResponse<ArFolder>>(`archivd/folders/${id}/rename`, { name, ...ctx })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.failed_rename'))
  }

  async function moveFolder(id: string, parentId: string | null, ctx: Record<string, unknown> = {}): Promise<ArFolder> {
    const res = await patch<ApiResponse<ArFolder>>(`archivd/folders/${id}/move`, { parent_id: parentId, ...ctx })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.move_failed'))
  }

  async function setFolderVisibility(id: string, visibility: string, ctx: Record<string, unknown> = {}): Promise<ArFolder> {
    const res = await patch<ApiResponse<ArFolder>>(`archivd/folders/${id}/visibility`, { visibility, ...ctx })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.failed_visibility'))
  }

  async function restoreFolder(id: string, ctx: Record<string, unknown> = {}): Promise<ArFolder> {
    const res = await post<ApiResponse<ArFolder>>(`archivd/folders/${id}/restore`, ctx)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.move_failed'))
  }

  async function deleteFolder(id: string, ctx: Record<string, unknown> = {}): Promise<void> {
    await del<ApiResponse<null>>(`archivd/folders/${id}`, ctx)
  }

  async function forceDeleteFolder(id: string, ctx: Record<string, unknown> = {}): Promise<void> {
    await del<ApiResponse<null>>(`archivd/folders/${id}/force`, ctx)
  }

  // File mutations
  async function renameFile(id: string, name: string, ctx: Record<string, unknown> = {}): Promise<HostedFile> {
    const res = await patch<ApiResponse<HostedFile>>(`archivd/files/${id}/rename`, { name, ...ctx })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.failed_rename'))
  }

  async function moveFile(id: string, folderId: string | null, ctx: Record<string, unknown> = {}): Promise<HostedFile> {
    const res = await patch<ApiResponse<HostedFile>>(`archivd/files/${id}/move`, { folder_id: folderId, ...ctx })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.move_failed'))
  }

  async function setFileVisibility(id: string, visibility: string, ctx: Record<string, unknown> = {}): Promise<HostedFile> {
    const res = await patch<ApiResponse<HostedFile>>(`archivd/files/${id}/visibility`, { visibility, ...ctx })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.failed_visibility'))
  }

  async function restoreFile(id: string, ctx: Record<string, unknown> = {}): Promise<HostedFile> {
    const res = await post<ApiResponse<HostedFile>>(`archivd/files/${id}/restore`, ctx)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.move_failed'))
  }

  async function deleteFile(id: string, ctx: Record<string, unknown> = {}): Promise<void> {
    await del<ApiResponse<null>>(`archivd/files/${id}`, ctx)
  }

  async function forceDeleteFile(id: string, ctx: Record<string, unknown> = {}): Promise<void> {
    await del<ApiResponse<null>>(`archivd/files/${id}/force`, ctx)
  }

  // Bulk
  async function bulkDeleteFolders(ids: string[], ctx: Record<string, unknown> = {}): Promise<number> {
    const res = await del<ApiResponse<{ affected: number }>>('archivd/folders/bulk', { ids, ...ctx })
    if (res.status === 'success' && res.data) return res.data.affected
    return 0
  }

  async function bulkDeleteFiles(ids: string[], ctx: Record<string, unknown> = {}): Promise<number> {
    const res = await del<ApiResponse<{ affected: number }>>('archivd/files/bulk', { ids, ...ctx })
    if (res.status === 'success' && res.data) return res.data.affected
    return 0
  }

  async function bulkSetFolderVisibility(ids: string[], visibility: string, ctx: Record<string, unknown> = {}): Promise<number> {
    const res = await post<ApiResponse<{ affected: number }>>('archivd/folders/bulk-visibility', { ids, visibility, ...ctx })
    if (res.status === 'success' && res.data) return res.data.affected
    return 0
  }

  async function bulkSetFileVisibility(ids: string[], visibility: string, ctx: Record<string, unknown> = {}): Promise<number> {
    const res = await post<ApiResponse<{ affected: number }>>('archivd/files/bulk-visibility', { ids, visibility, ...ctx })
    if (res.status === 'success' && res.data) return res.data.affected
    return 0
  }

  // Public
  async function fetchPublicFile(id: string): Promise<HostedFile> {
    const res = await get<ApiResponse<HostedFile>>(`archivd/public/files/${id}`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.public.file_not_found'))
  }

  async function fetchPublicFileDownload(id: string): Promise<{ url: string }> {
    const res = await get<ApiResponse<{ url: string }>>(`archivd/public/files/${id}/download`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.failed_download_url'))
  }

  async function fetchPublicFolder(id: string): Promise<ArPublicBrowsePayload> {
    const res = await get<ApiResponse<ArPublicBrowsePayload>>(`archivd/public/folders/${id}`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.public.folder_not_found'))
  }

  // Blocklist
  async function fetchBlocklist(): Promise<ArHashBlocklistEntry[]> {
    const res = await get<ApiResponse<ArHashBlocklistEntry[]>>('archivd/blocklist')
    if (res.status === 'success' && res.data) return res.data
    return []
  }

  async function addBlocklistEntry(sha256: string, reason: string | null = null): Promise<ArHashBlocklistEntry> {
    const res = await post<ApiResponse<ArHashBlocklistEntry>>('archivd/blocklist', { sha256, reason })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.blocklist_failed_add'))
  }

  async function removeBlocklistEntry(id: string): Promise<void> {
    await del<ApiResponse<null>>(`archivd/blocklist/${id}`)
  }

  // Workspaces
  async function fetchWorkspaces(): Promise<ArWorkspace[]> {
    const res = await get<ApiResponse<ArWorkspace[]>>('archivd/workspaces')
    if (res.status === 'success' && res.data) return res.data
    return []
  }

  async function fetchWorkspace(id: string): Promise<ArWorkspace> {
    const res = await get<ApiResponse<ArWorkspace>>(`archivd/workspaces/${id}`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.failed_load_workspace_detail'))
  }

  async function createWorkspace(name: string): Promise<ArWorkspace> {
    const res = await post<ApiResponse<ArWorkspace>>('archivd/workspaces', { name })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.failed_create_workspace'))
  }

  async function archiveWorkspace(id: string): Promise<ArWorkspace> {
    const res = await post<ApiResponse<ArWorkspace>>(`archivd/workspaces/${id}/archive`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.failed_archive_workspace'))
  }

  async function fetchMembers(workspaceId: string): Promise<ArWorkspaceMember[]> {
    const res = await get<ApiResponse<ArWorkspaceMember[]>>(`archivd/workspaces/${workspaceId}/members`)
    if (res.status === 'success' && res.data) return res.data
    return []
  }

  async function inviteMember(workspaceId: string, email: string, role: string): Promise<ArWorkspaceInvite> {
    const res = await post<ApiResponse<ArWorkspaceInvite>>(`archivd/workspaces/${workspaceId}/invites`, { email, role })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.failed_invite_member'))
  }

  async function acceptInvite(token: string): Promise<ArWorkspaceMember> {
    const res = await post<ApiResponse<ArWorkspaceMember>>('archivd/workspaces/invites/accept', { token })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.failed_accept_invite'))
  }

  async function updateMemberRole(workspaceId: string, userId: string, role: string): Promise<ArWorkspaceMember> {
    const res = await patch<ApiResponse<ArWorkspaceMember>>(`archivd/workspaces/${workspaceId}/members/${userId}`, { role })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.archivd.failed_update_role'))
  }

  async function removeMember(workspaceId: string, userId: string): Promise<void> {
    await del<ApiResponse<null>>(`archivd/workspaces/${workspaceId}/members/${userId}`)
  }

  async function fetchActivity(workspaceId: string, limit = 50): Promise<ArWorkspaceActivity[]> {
    const res = await get<ApiResponse<ArWorkspaceActivity[]>>(`archivd/workspaces/${workspaceId}/activity`, { limit })
    if (res.status === 'success' && res.data) return res.data
    return []
  }

  return {
    loading,
    error,
    fetchBrowse,
    fetchTrash,
    fetchQuota,
    searchFiles,
    fetchFile,
    fetchFileDownload,
    createFolder,
    renameFolder,
    moveFolder,
    setFolderVisibility,
    restoreFolder,
    deleteFolder,
    forceDeleteFolder,
    renameFile,
    moveFile,
    setFileVisibility,
    restoreFile,
    deleteFile,
    forceDeleteFile,
    bulkDeleteFolders,
    bulkDeleteFiles,
    bulkSetFolderVisibility,
    bulkSetFileVisibility,
    fetchPublicFile,
    fetchPublicFileDownload,
    fetchPublicFolder,
    fetchBlocklist,
    addBlocklistEntry,
    removeBlocklistEntry,
    fetchWorkspaces,
    fetchWorkspace,
    createWorkspace,
    archiveWorkspace,
    fetchMembers,
    inviteMember,
    acceptInvite,
    updateMemberRole,
    removeMember,
    fetchActivity,
  }
}
