import { getEcho, subscribeWhenEchoReady } from '@/composables/useEcho'
import { useAuth } from '@/stores/auth'

export type ArchivdRealtimeHandlers = {
  onListingChanged?: () => void
  onQuotaChanged?: () => void
  onMembersChanged?: () => void
  onActivityAppended?: () => void
  onCollectionAnalysisProgress?: (payload: unknown) => void
  onAssetMetadataProgress?: (payload: unknown) => void
  onFileStatsChanged?: (payload: { file_id: string; view_count: number; download_count: number }) => void
  onMicrostockBillingChanged?: (payload: { owner_user_id: string; action: string }) => void
  onMicrostockCredentialsChanged?: (payload: { action: string; credential_id: string | null }) => void
}

const handlerSet = new Set<ArchivdRealtimeHandlers>()

// Two simultaneous channels (mirrors backend fan-out in
// App\Domain\Archivd\Events\ListingChanged):
// - user channel  -> personal listing, quota, microstock billing/credentials
// - workspace channel -> team listing/members/activity + collection progress
let activeUserChannel: string | null = null
let activeWorkspaceId: string | null = null

function resolveUserChannel(): string | null {
  const { user } = useAuth()
  const userId = user.value?.id
  if (!userId) return null
  return `archivd.user.${userId}`
}

function attachUserChannelListeners(channel: string): void {
  const echo = getEcho()
  if (!echo) return

  const ch = echo.private(channel)
  ch.listen('.listing.changed', () => {
    for (const h of handlerSet) h.onListingChanged?.()
  })
  ch.listen('.quota.changed', () => {
    for (const h of handlerSet) h.onQuotaChanged?.()
  })
  ch.listen('.members.changed', () => {
    for (const h of handlerSet) h.onMembersChanged?.()
  })
  ch.listen('.activity.appended', () => {
    for (const h of handlerSet) h.onActivityAppended?.()
  })
  ch.listen('.collection.analysis.progress', (e: unknown) => {
    for (const h of handlerSet) h.onCollectionAnalysisProgress?.(e)
  })
  ch.listen('.asset.metadata.progress', (e: unknown) => {
    for (const h of handlerSet) h.onAssetMetadataProgress?.(e)
  })
  ch.listen('.file.stats.changed', (e: { file_id: string; view_count: number; download_count: number }) => {
    for (const h of handlerSet) h.onFileStatsChanged?.(e)
  })
  ch.listen('.microstock.billing.changed', (e: { owner_user_id: string; action: string }) => {
    for (const h of handlerSet) h.onMicrostockBillingChanged?.(e)
  })
  ch.listen('.microstock.credentials.changed', (e: { action: string; credential_id: string | null }) => {
    for (const h of handlerSet) h.onMicrostockCredentialsChanged?.(e)
  })
}

function attachWorkspaceChannelListeners(workspaceId: string): void {
  const echo = getEcho()
  if (!echo) return

  const ch = echo.private(`archivd.workspace.${workspaceId}`)
  ch.listen('.listing.changed', () => {
    for (const h of handlerSet) h.onListingChanged?.()
  })
  ch.listen('.members.changed', () => {
    for (const h of handlerSet) h.onMembersChanged?.()
  })
  ch.listen('.activity.appended', () => {
    for (const h of handlerSet) h.onActivityAppended?.()
  })
  ch.listen('.collection.analysis.progress', (e: unknown) => {
    for (const h of handlerSet) h.onCollectionAnalysisProgress?.(e)
  })
  ch.listen('.asset.metadata.progress', (e: unknown) => {
    for (const h of handlerSet) h.onAssetMetadataProgress?.(e)
  })
  ch.listen('.file.stats.changed', (e: { file_id: string; view_count: number; download_count: number }) => {
    for (const h of handlerSet) h.onFileStatsChanged?.(e)
  })
}

function ensureUserChannel(): boolean {
  const channel = resolveUserChannel()
  if (!channel) return false

  if (activeUserChannel === channel) return true

  const echo = getEcho()
  if (!echo) return false

  try {
    attachUserChannelListeners(channel)
    activeUserChannel = channel
    return true
  } catch {
    return false
  }
}

function leaveWorkspaceChannel(): void {
  const echo = getEcho()
  if (echo && activeWorkspaceId !== null) {
    try {
      echo.leave(`archivd.workspace.${activeWorkspaceId}`)
    } catch {
      // ignore
    }
  }
  activeWorkspaceId = null
}

function ensureChannels(): void {
  ensureUserChannel()
  if (activeWorkspaceId !== null) {
    attachWorkspaceChannelListeners(activeWorkspaceId)
  }
}

/**
 * Join (or switch / leave with `null`) the workspace-scoped private channel.
 * Views call this on mount and on workspace route changes; the upload/listing
 * backend broadcasts team mutations on `archivd.workspace.{id}`, so without
 * this join other tabs never hear about uploads in a workspace.
 */
export function setArchivdWorkspaceChannel(workspaceId: string | null): void {
  if (activeWorkspaceId === workspaceId) return

  leaveWorkspaceChannel()
  if (workspaceId === null) return

  if (getEcho() === null) {
    // Echo not initialized yet — remember the target; onEchoReady re-attaches.
    activeWorkspaceId = workspaceId
    return
  }

  try {
    attachWorkspaceChannelListeners(workspaceId)
    activeWorkspaceId = workspaceId
  } catch {
    activeWorkspaceId = null
  }
}

function maybeLeave(): void {
  if (handlerSet.size > 0) return
  const echo = getEcho()
  if (echo) {
    if (activeUserChannel) {
      try {
        echo.leave(activeUserChannel)
      } catch {
        // ignore
      }
    }
    leaveWorkspaceChannel()
  }
  activeUserChannel = null
}

export function subscribeArchivdRealtime(handlers: ArchivdRealtimeHandlers): boolean {
  handlerSet.add(handlers)

  const attached = ensureUserChannel()
  if (!attached) {
    // Echo not ready yet (views mount before the async AppNavbar init) —
    // shared helper defers the attach instead of staying deaf for the session.
    subscribeWhenEchoReady(() => {
      ensureChannels()
      return true
    })
  }
  return attached
}

export function unsubscribeArchivdRealtime(handlers: ArchivdRealtimeHandlers): void {
  handlerSet.delete(handlers)
  maybeLeave()
}

export function useArchivdRealtime() {
  return {
    subscribe: subscribeArchivdRealtime,
    unsubscribe: unsubscribeArchivdRealtime,
    setWorkspaceChannel: setArchivdWorkspaceChannel,
  }
}
