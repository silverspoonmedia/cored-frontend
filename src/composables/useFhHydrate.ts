import { batch } from '@/api/client'
import { bodyOf } from '@/api/batch'
import type {
  FhBrowsePayload,
  FhQuota,
  FhWorkspace,
  FhWorkspaceMember,
  FhWorkspaceActivity,
  MicrostockSlotStatus,
} from '@/api/types'

export interface FhHydrateParams {
  /** Current folder being browsed, if any. */
  folderId?: string | null
  /** Shared ctx params (workspace_id / user_id) applied to browse + quota. */
  ctx?: Record<string, unknown>
}

export interface FhHydrateResult {
  browse: FhBrowsePayload | null
  quota: FhQuota | null
  workspaces: FhWorkspace[] | null
  slots: MicrostockSlotStatus | null
}

/**
 * Fan the four independent File Hosting reads into one Worker invocation.
 * Every field is null when its sub-request failed so the caller can fall back
 * to the per-feature loader with its own error handling intact.
 */
export async function hydrateFileHosting(params: FhHydrateParams = {}): Promise<FhHydrateResult> {
  const ctx = params.ctx ?? {}

  const browseQuery: Record<string, unknown> = { ...ctx }
  if (params.folderId) browseQuery.folder_id = params.folderId

  const empty: FhHydrateResult = { browse: null, quota: null, workspaces: null, slots: null }

  let entries
  try {
    entries = await batch<unknown>([
      { path: 'file-hosting/browse', query: browseQuery },
      { path: 'file-hosting/quota', query: { ...ctx } },
      { path: 'file-hosting/workspaces' },
      { path: 'microstock/slots' },
    ])
  } catch {
    return empty
  }

  const [browse, quota, workspaces, slots] = entries

  const browseBody = bodyOf<FhBrowsePayload>(browse)
  const quotaBody = bodyOf<FhQuota>(quota)
  const workspacesBody = bodyOf<FhWorkspace[]>(workspaces)
  const slotsBody = bodyOf<MicrostockSlotStatus>(slots)

  return {
    browse: browseBody?.data ?? null,
    quota: quotaBody?.data ?? null,
    workspaces: Array.isArray(workspacesBody?.data) ? workspacesBody.data : null,
    slots: slotsBody?.data ?? null,
  }
}

export interface FhWorkspaceDetailResult {
  workspaces: FhWorkspace[] | null
  members: FhWorkspaceMember[] | null
  activity: FhWorkspaceActivity[] | null
}

/**
 * Fan the workspace list + first-workspace detail into one invocation.
 * Members/activity are null when the batch missed or there is no workspace.
 */
export async function hydrateWorkspaceDetail(workspaceId: string | null): Promise<FhWorkspaceDetailResult> {
  const requests: Array<{ path: string; query?: Record<string, string> }> = [
    { path: 'file-hosting/workspaces' },
  ]
  if (workspaceId) {
    requests.push({ path: `file-hosting/workspaces/${workspaceId}/members` })
    requests.push({ path: `file-hosting/workspaces/${workspaceId}/activity`, query: { limit: '50' } })
  }

  const empty: FhWorkspaceDetailResult = { workspaces: null, members: null, activity: null }

  let entries
  try {
    entries = await batch<unknown>(requests)
  } catch {
    return empty
  }

  const [workspacesRes, membersRes, activityRes] = entries

  const workspacesBody = bodyOf<FhWorkspace[]>(workspacesRes)
  const membersBody = workspaceId ? bodyOf<FhWorkspaceMember[]>(membersRes) : null
  const activityBody = workspaceId ? bodyOf<FhWorkspaceActivity[]>(activityRes) : null

  return {
    workspaces: Array.isArray(workspacesBody?.data) ? workspacesBody.data : null,
    members: membersBody && Array.isArray(membersBody.data) ? membersBody.data : null,
    activity: activityBody && Array.isArray(activityBody.data) ? activityBody.data : null,
  }
}

export function useFhHydrate() {
  return { hydrateFileHosting, hydrateWorkspaceDetail }
}
