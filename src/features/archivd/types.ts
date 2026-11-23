// Payload shapes of the Archivd product domain. Moved out of `src/api/types.ts`
// so a fork that deletes `src/features/archivd` leaves no product type behind.

import type { QueryRowAction } from '@/api/types'

// --- Archivd ---

export interface ArMicrostock {
  title: string | null
  keywords: string[]
  status: string | null
  stages: unknown
  phase: string | null
}

export interface HostedFile {
  id: string
  user_id: string | null
  workspace_id: string | null
  created_by: string | null
  folder_id: string | null
  name: string
  disk?: string
  region?: string
  path?: string
  size: number
  size_human?: string
  mime: string
  checksum?: string | null
  is_hash_blocked: boolean
  visibility: string
  share_url: string | null
  microstock?: ArMicrostock | null
  workspace?: { id: string; kind: string; name: string } | null
  download_count: number
  view_count: number
  last_downloaded_at: string | null
  last_downloaded_at_formatted?: string | null
  last_downloaded_at_human?: string | null
  last_viewed_at: string | null
  last_viewed_at_formatted?: string | null
  last_viewed_at_human?: string | null
  deleted_at: string | null
  deleted_at_formatted?: string | null
  deleted_at_human?: string | null
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

export interface ArFolder {
  id: string
  user_id: string | null
  workspace_id: string | null
  parent_id: string | null
  name: string
  order: number | null
  visibility: string
  share_url: string | null
  collection_status: string | null
  collection_hint: string | null
  collection_locked: boolean
  deleted_at: string | null
  deleted_at_formatted?: string | null
  deleted_at_human?: string | null
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

export interface ArBreadcrumbItem {
  id: string
  name: string
  parent_id: string | null
}

export interface ArWorkspace {
  id: string
  owner_user_id: string
  name: string
  kind: string
  status: string
  is_owner: boolean
  my_role: string | null
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

export interface ArBrowsePayload {
  owner_id: string
  workspace_id: string | null
  workspace: { id: string; kind: string; name: string } | null
  folder: ArFolder | null
  breadcrumb: ArBreadcrumbItem[]
  folders: ArFolder[]
  files: HostedFile[]
}

export interface ArTrashPayload {
  folders: ArFolder[]
  files: HostedFile[]
}

export interface ArQuota {
  used_bytes: number
  used_bytes_human: string | null
  pending_bytes: number
  pending_bytes_human: string | null
  reserved_bytes: number
  reserved_bytes_human: string | null
  quota_bytes: number
  quota_bytes_human: string | null
  remaining_bytes: number | null
  remaining_bytes_human: string | null
  state: string
  collaborative_works: boolean
  can_create_workspace: boolean
  owned_workspace_used: number
  owned_workspace_limit: number
}

export interface ArPublicFile {
  id: string
  name: string
  mime: string
  size: number
  size_human: string
}

export interface ArPublicFolder {
  id: string
  name: string
}

export interface ArPublicBrowsePayload {
  owner_id?: string
  folder: ArPublicFolder
  breadcrumb: ArBreadcrumbItem[]
  folders: ArPublicFolder[]
  files: ArPublicFile[]
}

export interface ArHashBlocklistEntry {
  actions?: QueryRowAction[]
  id: string
  sha256: string
  reason: string | null
  created_by: string | null
  creator?: { id: string; name: string; email: string } | null
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

export interface ArWorkspaceOwner {
  id: string
  name: string
  email?: string
}

export interface ArWorkspace {
  id: string
  owner_user_id: string
  name: string
  kind: string
  status: string
  is_owner: boolean
  my_role: string | null
  owner?: ArWorkspaceOwner | null
  members?: ArWorkspaceMember[]
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

export interface ArWorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: string
  status: string
  joined_at: string | null
  joined_at_formatted?: string | null
  joined_at_human?: string | null
  user?: { id: string; name: string; email?: string } | null
}

export interface ArWorkspaceInvite {
  id: string
  workspace_id: string
  email: string
  role: string
  status: string
  token: string
  expires_at: string | null
  expires_at_formatted?: string | null
  expires_at_human?: string | null
  accepted_at: string | null
  accepted_at_formatted?: string | null
  accepted_at_human?: string | null
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
}

export interface ArWorkspaceActivity {
  id: string
  event: string | null
  description: string | null
  causer: { id: string; name: string | null; email: string | null } | null
  subject_type: string | null
  subject_id: string | null
  properties: unknown[]
  created_at: string | null
}

export interface ArUploadPart {
  part_number: number
  url: string
  headers?: Record<string, string[]> | null
}

export interface ArUploadSession {
  upload_id: string
  strategy: 'single' | 'multipart'
  path: string
  chunk_size: number
  part_count: number
  parts: ArUploadPart[]
  expires_at: string | null
  expires_at_formatted?: string | null
  expires_at_human?: string | null
  folder_id: string | null
}

export interface ArUploadCompleteResult {
  upload_id: string
  file: HostedFile
}
