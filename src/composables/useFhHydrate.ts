import { batch } from '@/api/client'
import type {
  ApiResponse,
  FhBrowsePayload,
  FhQuota,
  FhWorkspace,
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

/** Unwrap a batch entry into its envelope only on a 200 success. */
function bodyOf<T>(entry: { status: number; body: unknown } | undefined): ApiResponse<T> | null {
  if (!entry || entry.status !== 200) return null
  const body = entry.body as ApiResponse<T> | null
  if (!body || body.status !== 'success') return null
  return body
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

export function useFhHydrate() {
  return { hydrateFileHosting }
}
