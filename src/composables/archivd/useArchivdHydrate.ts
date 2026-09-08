import { batch } from '@/api/client'
import { bodyOf } from '@/api/batch'
import type {
  ArBrowsePayload,
  ArQuota,
  ArWorkspace,
  ArWorkspaceMember,
  ArWorkspaceActivity,
  MicrostockSlotStatus,
} from '@/api/types'

export interface ArHydrateParams {
  /** Current folder being browsed, if any. */
  folderId?: string | null
  /** Shared ctx params (workspace_id / user_id) applied to browse + quota. */
  ctx?: Record<string, unknown>
}

export interface ArHydrateResult {
  browse: ArBrowsePayload | null
  quota: ArQuota | null
  workspaces: ArWorkspace[] | null
  slots: MicrostockSlotStatus | null
}

/**
 * Fan the four independent Archivd reads into one Worker invocation.
 * Every field is null when its sub-request failed so the caller can fall back
 * to the per-feature loader with its own error handling intact.
 */
export async function hydrateArchivd(params: ArHydrateParams = {}): Promise<ArHydrateResult> {
  const ctx = params.ctx ?? {}

  const browseQuery: Record<string, unknown> = { ...ctx }
  if (params.folderId) browseQuery.folder_id = params.folderId

  const empty: ArHydrateResult = { browse: null, quota: null, workspaces: null, slots: null }

  let entries
  try {
    entries = await batch<unknown>([
      { path: 'archivd/browse', query: browseQuery },
      { path: 'archivd/quota', query: { ...ctx } },
      { path: 'archivd/workspaces' },
      { path: 'microstock/slots' },
    ])
  } catch {
    return empty
  }

  const [browse, quota, workspaces, slots] = entries

  const browseBody = bodyOf<ArBrowsePayload>(browse)
  const quotaBody = bodyOf<ArQuota>(quota)
  const workspacesBody = bodyOf<ArWorkspace[]>(workspaces)
  const slotsBody = bodyOf<MicrostockSlotStatus>(slots)

  return {
    browse: browseBody?.data ?? null,
    quota: quotaBody?.data ?? null,
    workspaces: Array.isArray(workspacesBody?.data) ? workspacesBody.data : null,
    slots: slotsBody?.data ?? null,
  }
}

export interface ArWorkspaceDetailResult {
  workspaces: ArWorkspace[] | null
  members: ArWorkspaceMember[] | null
  activity: ArWorkspaceActivity[] | null
}

/**
 * Fan the workspace list + first-workspace detail into one invocation.
 * Members/activity are null when the batch missed or there is no workspace.
 */
export async function hydrateWorkspaceDetail(workspaceId: string | null): Promise<ArWorkspaceDetailResult> {
  const requests: Array<{ path: string; query?: Record<string, string> }> = [
    { path: 'archivd/workspaces' },
  ]
  if (workspaceId) {
    requests.push({ path: `archivd/workspaces/${workspaceId}/members` })
    requests.push({ path: `archivd/workspaces/${workspaceId}/activity`, query: { limit: '50' } })
  }

  const empty: ArWorkspaceDetailResult = { workspaces: null, members: null, activity: null }

  let entries
  try {
    entries = await batch<unknown>(requests)
  } catch {
    return empty
  }

  const [workspacesRes, membersRes, activityRes] = entries

  const workspacesBody = bodyOf<ArWorkspace[]>(workspacesRes)
  const membersBody = workspaceId ? bodyOf<ArWorkspaceMember[]>(membersRes) : null
  const activityBody = workspaceId ? bodyOf<ArWorkspaceActivity[]>(activityRes) : null

  return {
    workspaces: Array.isArray(workspacesBody?.data) ? workspacesBody.data : null,
    members: membersBody && Array.isArray(membersBody.data) ? membersBody.data : null,
    activity: activityBody && Array.isArray(activityBody.data) ? activityBody.data : null,
  }
}

export function useArchivdHydrate() {
  return { hydrateArchivd, hydrateWorkspaceDetail }
}
