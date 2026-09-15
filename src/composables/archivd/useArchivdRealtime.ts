import { createRealtimeChannel } from '@/composables/echo/realtimeChannel'
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

function resolveUserChannel(): string | null {
  const { user } = useAuth()
  const userId = user.value?.id
  return userId ? `archivd.user.${userId}` : null
}

// Two channels mirror the backend fan-out in
// App\Domain\Archivd\Events\ListingChanged:
// - user channel  -> personal listing, quota, microstock billing/credentials
// - workspace channel -> team listing/members/activity + collection progress
const userChannel = createRealtimeChannel<ArchivdRealtimeHandlers>({
  channel: () => resolveUserChannel(),
  events: [
    {
      event: '.listing.changed',
      handle: (handlers) => {
        for (const h of handlers) h.onListingChanged?.()
      },
    },
    {
      event: '.quota.changed',
      handle: (handlers) => {
        for (const h of handlers) h.onQuotaChanged?.()
      },
    },
    {
      event: '.members.changed',
      handle: (handlers) => {
        for (const h of handlers) h.onMembersChanged?.()
      },
    },
    {
      event: '.activity.appended',
      handle: (handlers) => {
        for (const h of handlers) h.onActivityAppended?.()
      },
    },
    {
      event: '.collection.analysis.progress',
      handle: (handlers, payload: unknown) => {
        for (const h of handlers) h.onCollectionAnalysisProgress?.(payload)
      },
    },
    {
      event: '.asset.metadata.progress',
      handle: (handlers, payload: unknown) => {
        for (const h of handlers) h.onAssetMetadataProgress?.(payload)
      },
    },
    {
      event: '.file.stats.changed',
      handle: (handlers, payload: { file_id: string; view_count: number; download_count: number }) => {
        for (const h of handlers) h.onFileStatsChanged?.(payload)
      },
    },
    {
      event: '.microstock.billing.changed',
      handle: (handlers, payload: { owner_user_id: string; action: string }) => {
        for (const h of handlers) h.onMicrostockBillingChanged?.(payload)
      },
    },
    {
      event: '.microstock.credentials.changed',
      handle: (handlers, payload: { action: string; credential_id: string | null }) => {
        for (const h of handlers) h.onMicrostockCredentialsChanged?.(payload)
      },
    },
  ],
})

const workspaceChannel = createRealtimeChannel<ArchivdRealtimeHandlers>({
  channel: null,
  events: [
    {
      event: '.listing.changed',
      handle: (handlers) => {
        for (const h of handlers) h.onListingChanged?.()
      },
    },
    {
      event: '.members.changed',
      handle: (handlers) => {
        for (const h of handlers) h.onMembersChanged?.()
      },
    },
    {
      event: '.activity.appended',
      handle: (handlers) => {
        for (const h of handlers) h.onActivityAppended?.()
      },
    },
    {
      event: '.collection.analysis.progress',
      handle: (handlers, payload: unknown) => {
        for (const h of handlers) h.onCollectionAnalysisProgress?.(payload)
      },
    },
    {
      event: '.asset.metadata.progress',
      handle: (handlers, payload: unknown) => {
        for (const h of handlers) h.onAssetMetadataProgress?.(payload)
      },
    },
    {
      event: '.file.stats.changed',
      handle: (handlers, payload: { file_id: string; view_count: number; download_count: number }) => {
        for (const h of handlers) h.onFileStatsChanged?.(payload)
      },
    },
  ],
})

/**
 * Join (or switch / leave with `null`) the workspace-scoped private channel.
 * Views call this on mount and on workspace route changes; the upload/listing
 * backend broadcasts team mutations on `archivd.workspace.{id}`, so without
 * this join other tabs never hear about uploads in a workspace.
 */
export function setArchivdWorkspaceChannel(workspaceId: string | null): void {
  workspaceChannel.retarget(workspaceId === null ? null : `archivd.workspace.${workspaceId}`)
}

export function subscribeArchivdRealtime(handlers: ArchivdRealtimeHandlers): boolean {
  // The workspace channel records the handler but only binds once a workspace
  // is targeted via `setArchivdWorkspaceChannel`; it shares the same handler set
  // so both channels fan out to the same consumers.
  workspaceChannel.subscribe(handlers)
  return userChannel.subscribe(handlers)
}

export function unsubscribeArchivdRealtime(handlers: ArchivdRealtimeHandlers): void {
  userChannel.unsubscribe(handlers)
  workspaceChannel.unsubscribe(handlers)
}

export function useArchivdRealtime() {
  return {
    subscribe: subscribeArchivdRealtime,
    unsubscribe: unsubscribeArchivdRealtime,
    setWorkspaceChannel: setArchivdWorkspaceChannel,
  }
}
