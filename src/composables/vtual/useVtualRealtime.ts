import { createKeyedRealtimeChannel, createRealtimeChannel } from '@/composables/echo/realtimeChannel'

export type PlatformCredentialChangedPayload = {
  platform_id: string
  credential_id: string | null
  action: string
  status: string | null
}

export type VtualRealtimeHandlers = {
  onCredentialChanged?: (payload: PlatformCredentialChangedPayload) => void
}

const credentialsChannel = createRealtimeChannel<VtualRealtimeHandlers>({
  channel: 'vtual.platform-credentials',
  events: [
    {
      event: '.platform.credential.changed',
      handle: (handlers, payload: PlatformCredentialChangedPayload) => {
        for (const h of handlers) h.onCredentialChanged?.(payload)
      },
    },
  ],
})

export function subscribeVtualPlatformCredentialsRealtime(handlers: VtualRealtimeHandlers): boolean {
  return credentialsChannel.subscribe(handlers)
}

export function unsubscribeVtualPlatformCredentialsRealtime(handlers: VtualRealtimeHandlers): void {
  credentialsChannel.unsubscribe(handlers)
}

// --- Creator channel snapshot updates (fetch-pool flush) ---

export type ChannelSnapshotUpdatedPayload = {
  creator_id: string
  channel_ids: string[]
}

type SnapshotHandler = (payload: ChannelSnapshotUpdatedPayload) => void

// One channel per creator: VtualProfilesView tracks a set of creators at once,
// so each id keeps its own ref-counted channel.
const snapshotChannels = createKeyedRealtimeChannel<string, SnapshotHandler>({
  channel: (creatorId: string) => `vtual.creator.${creatorId}`,
  events: () => [
    {
      event: '.channel.snapshot.updated',
      handle: (handlers, payload: ChannelSnapshotUpdatedPayload) => {
        for (const h of handlers) h(payload)
      },
    },
  ],
})

export function subscribeVtualCreatorSnapshots(creatorId: string, handler: SnapshotHandler): boolean {
  return snapshotChannels.subscribe(creatorId, handler)
}

export function unsubscribeVtualCreatorSnapshots(creatorId: string, handler: SnapshotHandler): void {
  snapshotChannels.unsubscribe(creatorId, handler)
}

// --- Management org updates (members / invites / creator assignments) ---

export type ManagementUpdatedPayload = {
  management_id: string
  kind: 'management' | 'member' | 'invite' | 'creator'
  ref_id: string | null
  action: string
}

type ManagementHandler = (payload: ManagementUpdatedPayload) => void

const managementChannels = createKeyedRealtimeChannel<string, ManagementHandler>({
  channel: (managementId: string) => `vtual.management.${managementId}`,
  events: () => [
    {
      event: '.management.updated',
      handle: (handlers, payload: ManagementUpdatedPayload) => {
        for (const h of handlers) h(payload)
      },
    },
  ],
})

export function subscribeVtualManagement(managementId: string, handler: ManagementHandler): boolean {
  return managementChannels.subscribe(managementId, handler)
}

export function unsubscribeVtualManagement(managementId: string, handler: ManagementHandler): void {
  managementChannels.unsubscribe(managementId, handler)
}

export function useVtualRealtime() {
  return {
    subscribe: subscribeVtualPlatformCredentialsRealtime,
    unsubscribe: unsubscribeVtualPlatformCredentialsRealtime,
    subscribeCreatorSnapshots: subscribeVtualCreatorSnapshots,
    unsubscribeCreatorSnapshots: unsubscribeVtualCreatorSnapshots,
    subscribeManagement: subscribeVtualManagement,
    unsubscribeManagement: unsubscribeVtualManagement,
  }
}
