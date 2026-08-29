import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get, post, patch, del } from '@/api/client'
import type {
  ApiResponse,
  HostedFile,
  FhFolder,
  FhBrowsePayload,
  FhTrashPayload,
  FhQuota,
  FhPublicFile,
  FhPublicBrowsePayload,
  FhHashBlocklistEntry,
  FhWorkspace,
  FhWorkspaceMember,
  FhWorkspaceInvite,
  FhWorkspaceActivity,
} from '@/api/types'

export function useFileHosting() {
  const { t } = useI18n()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBrowse(
    params: Record<string, unknown> = {},
  ): Promise<FhBrowsePayload> {
    const res = await get<ApiResponse<FhBrowsePayload>>('file-hosting/browse', params)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.load_failed'))
  }

  async function fetchTrash(
    params: Record<string, unknown> = {},
  ): Promise<FhTrashPayload> {
    const res = await get<ApiResponse<FhTrashPayload>>('file-hosting/trash', params)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.load_failed'))
  }

  async function fetchQuota(
    params: Record<string, unknown> = {},
  ): Promise<FhQuota> {
    const res = await get<ApiResponse<FhQuota>>('file-hosting/quota', params)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.load_failed'))
  }

  async function searchFiles(
    q: string,
    params: Record<string, unknown> = {},
  ): Promise<HostedFile[]> {
    const res = await get<ApiResponse<HostedFile[]>>('file-hosting/search', {
      q,
      ...params,
    })
    if (res.status === 'success' && res.data) return res.data
    return []
  }

  async function fetchFile(id: string): Promise<HostedFile> {
    const res = await get<ApiResponse<HostedFile>>(`file-hosting/files/${id}`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.failed_load_file'))
  }

  async function fetchFileDownload(
    id: string,
    params: Record<string, unknown> = {},
  ): Promise<{ url: string; expires_at: string }> {
    const res = await get<ApiResponse<{ url: string; expires_at: string }>>(
      `file-hosting/files/${id}/download`,
      params,
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.failed_download_url'))
  }

  // Folder mutations
  async function createFolder(
    name: string,
    params: { parent_id?: string; user_id?: string; workspace_id?: string } = {},
  ): Promise<FhFolder> {
    const res = await post<ApiResponse<FhFolder>>('file-hosting/folders', {
      name,
      ...params,
    })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.operation_failed'))
  }

  async function renameFolder(id: string, name: string, ctx: Record<string, unknown> = {}): Promise<FhFolder> {
    const res = await patch<ApiResponse<FhFolder>>(`file-hosting/folders/${id}/rename`, { name, ...ctx })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.failed_rename'))
  }

  async function moveFolder(id: string, parentId: string | null, ctx: Record<string, unknown> = {}): Promise<FhFolder> {
    const res = await patch<ApiResponse<FhFolder>>(`file-hosting/folders/${id}/move`, { parent_id: parentId, ...ctx })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.move_failed'))
  }

  async function setFolderVisibility(id: string, visibility: string, ctx: Record<string, unknown> = {}): Promise<FhFolder> {
    const res = await patch<ApiResponse<FhFolder>>(`file-hosting/folders/${id}/visibility`, { visibility, ...ctx })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.failed_visibility'))
  }

  async function restoreFolder(id: string, ctx: Record<string, unknown> = {}): Promise<FhFolder> {
    const res = await post<ApiResponse<FhFolder>>(`file-hosting/folders/${id}/restore`, ctx)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.move_failed'))
  }

  async function deleteFolder(id: string, ctx: Record<string, unknown> = {}): Promise<void> {
    await del<ApiResponse<null>>(`file-hosting/folders/${id}`, ctx)
  }

  async function forceDeleteFolder(id: string, ctx: Record<string, unknown> = {}): Promise<void> {
    await del<ApiResponse<null>>(`file-hosting/folders/${id}/force`, ctx)
  }

  // File mutations
  async function renameFile(id: string, name: string, ctx: Record<string, unknown> = {}): Promise<HostedFile> {
    const res = await patch<ApiResponse<HostedFile>>(`file-hosting/files/${id}/rename`, { name, ...ctx })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.failed_rename'))
  }

  async function moveFile(id: string, folderId: string | null, ctx: Record<string, unknown> = {}): Promise<HostedFile> {
    const res = await patch<ApiResponse<HostedFile>>(`file-hosting/files/${id}/move`, { folder_id: folderId, ...ctx })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.move_failed'))
  }

  async function setFileVisibility(id: string, visibility: string, ctx: Record<string, unknown> = {}): Promise<HostedFile> {
    const res = await patch<ApiResponse<HostedFile>>(`file-hosting/files/${id}/visibility`, { visibility, ...ctx })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.failed_visibility'))
  }

  async function restoreFile(id: string, ctx: Record<string, unknown> = {}): Promise<HostedFile> {
    const res = await post<ApiResponse<HostedFile>>(`file-hosting/files/${id}/restore`, ctx)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.move_failed'))
  }

  async function deleteFile(id: string, ctx: Record<string, unknown> = {}): Promise<void> {
    await del<ApiResponse<null>>(`file-hosting/files/${id}`, ctx)
  }

  async function forceDeleteFile(id: string, ctx: Record<string, unknown> = {}): Promise<void> {
    await del<ApiResponse<null>>(`file-hosting/files/${id}/force`, ctx)
  }

  // Bulk
  async function bulkDeleteFolders(ids: string[], ctx: Record<string, unknown> = {}): Promise<number> {
    const res = await del<ApiResponse<{ affected: number }>>('file-hosting/folders/bulk', { ids, ...ctx })
    if (res.status === 'success' && res.data) return res.data.affected
    return 0
  }

  async function bulkDeleteFiles(ids: string[], ctx: Record<string, unknown> = {}): Promise<number> {
    const res = await del<ApiResponse<{ affected: number }>>('file-hosting/files/bulk', { ids, ...ctx })
    if (res.status === 'success' && res.data) return res.data.affected
    return 0
  }

  async function bulkSetFolderVisibility(ids: string[], visibility: string, ctx: Record<string, unknown> = {}): Promise<number> {
    const res = await post<ApiResponse<{ affected: number }>>('file-hosting/folders/bulk-visibility', { ids, visibility, ...ctx })
    if (res.status === 'success' && res.data) return res.data.affected
    return 0
  }

  async function bulkSetFileVisibility(ids: string[], visibility: string, ctx: Record<string, unknown> = {}): Promise<number> {
    const res = await post<ApiResponse<{ affected: number }>>('file-hosting/files/bulk-visibility', { ids, visibility, ...ctx })
    if (res.status === 'success' && res.data) return res.data.affected
    return 0
  }

  // Public
  async function fetchPublicFile(id: string): Promise<HostedFile> {
    const res = await get<ApiResponse<HostedFile>>(`file-hosting/public/files/${id}`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.public.file_not_found'))
  }

  async function fetchPublicFileDownload(id: string): Promise<{ url: string }> {
    const res = await get<ApiResponse<{ url: string }>>(`file-hosting/public/files/${id}/download`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.failed_download_url'))
  }

  async function fetchPublicFolder(id: string): Promise<FhPublicBrowsePayload> {
    const res = await get<ApiResponse<FhPublicBrowsePayload>>(`file-hosting/public/folders/${id}`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.public.folder_not_found'))
  }

  // Blocklist
  async function fetchBlocklist(): Promise<FhHashBlocklistEntry[]> {
    const res = await get<ApiResponse<FhHashBlocklistEntry[]>>('file-hosting/blocklist')
    if (res.status === 'success' && res.data) return res.data
    return []
  }

  async function addBlocklistEntry(sha256: string, reason: string | null = null): Promise<FhHashBlocklistEntry> {
    const res = await post<ApiResponse<FhHashBlocklistEntry>>('file-hosting/blocklist', { sha256, reason })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.blocklist_failed_add'))
  }

  async function removeBlocklistEntry(id: string): Promise<void> {
    await del<ApiResponse<null>>(`file-hosting/blocklist/${id}`)
  }

  // Workspaces
  async function fetchWorkspaces(): Promise<FhWorkspace[]> {
    const res = await get<ApiResponse<FhWorkspace[]>>('file-hosting/workspaces')
    if (res.status === 'success' && res.data) return res.data
    return []
  }

  async function fetchWorkspace(id: string): Promise<FhWorkspace> {
    const res = await get<ApiResponse<FhWorkspace>>(`file-hosting/workspaces/${id}`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.failed_load_workspace_detail'))
  }

  async function createWorkspace(name: string): Promise<FhWorkspace> {
    const res = await post<ApiResponse<FhWorkspace>>('file-hosting/workspaces', { name })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.failed_create_workspace'))
  }

  async function archiveWorkspace(id: string): Promise<FhWorkspace> {
    const res = await post<ApiResponse<FhWorkspace>>(`file-hosting/workspaces/${id}/archive`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.failed_archive_workspace'))
  }

  async function fetchMembers(workspaceId: string): Promise<FhWorkspaceMember[]> {
    const res = await get<ApiResponse<FhWorkspaceMember[]>>(`file-hosting/workspaces/${workspaceId}/members`)
    if (res.status === 'success' && res.data) return res.data
    return []
  }

  async function inviteMember(workspaceId: string, email: string, role: string): Promise<FhWorkspaceInvite> {
    const res = await post<ApiResponse<FhWorkspaceInvite>>(`file-hosting/workspaces/${workspaceId}/invites`, { email, role })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.failed_invite_member'))
  }

  async function acceptInvite(token: string): Promise<FhWorkspaceMember> {
    const res = await post<ApiResponse<FhWorkspaceMember>>('file-hosting/workspaces/invites/accept', { token })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.failed_accept_invite'))
  }

  async function updateMemberRole(workspaceId: string, userId: string, role: string): Promise<FhWorkspaceMember> {
    const res = await patch<ApiResponse<FhWorkspaceMember>>(`file-hosting/workspaces/${workspaceId}/members/${userId}`, { role })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.file-hosting.failed_update_role'))
  }

  async function removeMember(workspaceId: string, userId: string): Promise<void> {
    await del<ApiResponse<null>>(`file-hosting/workspaces/${workspaceId}/members/${userId}`)
  }

  async function fetchActivity(workspaceId: string, limit = 50): Promise<FhWorkspaceActivity[]> {
    const res = await get<ApiResponse<FhWorkspaceActivity[]>>(`file-hosting/workspaces/${workspaceId}/activity`, { limit })
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
