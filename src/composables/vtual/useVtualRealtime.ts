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

// --- Integration incident triage queue ping ---

/**
 * Ids + enums only: the incident `title`/`detail` are assembled from platform
 * error text and fan out to every staff subscriber, so the payload must never
 * grow a snapshot. The correct reaction to a ping is a refetch.
 */
export type VtualIncidentChangedPayload = {
  action: string
  incident_id: string | null
  kind: string | null
  severity: string | null
  status: string | null
}

export type VtualIncidentsRealtimeHandlers = {
  onIncidentChanged?: (payload: VtualIncidentChangedPayload) => void
}

const incidentsQueueChannel = createRealtimeChannel<VtualIncidentsRealtimeHandlers>({
  channel: 'vtual.incidents',
  events: [
    {
      event: '.incident.changed',
      handle: (handlers, payload: VtualIncidentChangedPayload) => {
        for (const h of handlers) h.onIncidentChanged?.(payload)
      },
    },
  ],
})

export function subscribeVtualIncidentsRealtime(handlers: VtualIncidentsRealtimeHandlers): boolean {
  return incidentsQueueChannel.subscribe(handlers)
}

export function unsubscribeVtualIncidentsRealtime(handlers: VtualIncidentsRealtimeHandlers): void {
  incidentsQueueChannel.unsubscribe(handlers)
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

// --- Management org updates (members / invites / creator assignments / events) ---

/**
 * `kind` mirrors `VtualManagementRealtime::changed()` on the backend, which
 * passes one of seven values. Keep this union in step with the PHP docblock — a
 * kind the SPA cannot name is a push a subscriber silently ignores.
 */
export type ManagementUpdatedKind =
  | 'management'
  | 'member'
  | 'invite'
  | 'creator'
  | 'creator_grant'
  | 'creator_invite'
  | 'event'

export type ManagementUpdatedPayload = {
  management_id: string
  kind: ManagementUpdatedKind
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

/**
 * Hold a subscription on several management channels at once, dropping the ones
 * that left the set. The cross-management event list has no channel of its own
 * (there is no "all managements" private channel), so it binds the channels of
 * the orgs on the current page instead.
 */

/** Which management channels each multi-channel handler currently holds. */
const boundManagementChannels = new WeakMap<ManagementHandler, Set<string>>()

export function syncVtualManagementChannels(
  managementIds: readonly string[],
  handler: ManagementHandler,
): void {
  const wanted = new Set(managementIds.filter((id) => id !== ''))
  const bound = boundManagementChannels.get(handler) ?? new Set<string>()

  for (const id of bound) {
    if (!wanted.has(id)) {
      managementChannels.unsubscribe(id, handler)
      bound.delete(id)
    }
  }
  for (const id of wanted) {
    if (!bound.has(id)) {
      managementChannels.subscribe(id, handler)
      bound.add(id)
    }
  }

  if (bound.size === 0) {
    boundManagementChannels.delete(handler)
  } else {
    boundManagementChannels.set(handler, bound)
  }
}

export function releaseVtualManagementChannels(handler: ManagementHandler): void {
  const bound = boundManagementChannels.get(handler)
  if (bound === undefined) return

  for (const id of bound) {
    managementChannels.unsubscribe(id, handler)
  }
  boundManagementChannels.delete(handler)
}

export function useVtualRealtime() {
  return {
    subscribe: subscribeVtualPlatformCredentialsRealtime,
    unsubscribe: unsubscribeVtualPlatformCredentialsRealtime,
    subscribeIncidents: subscribeVtualIncidentsRealtime,
    unsubscribeIncidents: unsubscribeVtualIncidentsRealtime,
    subscribeCreatorSnapshots: subscribeVtualCreatorSnapshots,
    unsubscribeCreatorSnapshots: unsubscribeVtualCreatorSnapshots,
    subscribeManagement: subscribeVtualManagement,
    unsubscribeManagement: unsubscribeVtualManagement,
    syncManagementChannels: syncVtualManagementChannels,
    releaseManagementChannels: releaseVtualManagementChannels,
  }
}
