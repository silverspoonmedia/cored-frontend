import { getEcho, subscribeWhenEchoReady } from '@/composables/useEcho'

export type PlatformCredentialChangedPayload = {
  platform_id: string
  credential_id: string | null
  action: string
  status: string | null
}

export type VtualRealtimeHandlers = {
  onCredentialChanged?: (payload: PlatformCredentialChangedPayload) => void
}

const handlerSet = new Set<VtualRealtimeHandlers>()
let channelActive = false

function ensureChannel(): boolean {
  if (channelActive) return true
  const echo = getEcho()
  if (!echo) return false
  try {
    const ch = echo.private('vtual.platform-credentials')
    ch.listen('.platform.credential.changed', (e: PlatformCredentialChangedPayload) => {
      for (const h of handlerSet) h.onCredentialChanged?.(e)
    })
    channelActive = true
    return true
  } catch {
    return false
  }
}

function maybeLeave(): void {
  if (handlerSet.size > 0) return
  if (!channelActive) return
  const echo = getEcho()
  if (echo) {
    try {
      echo.leave('vtual.platform-credentials')
    } catch {
      // ignore
    }
  }
  channelActive = false
}

export function subscribeVtualPlatformCredentialsRealtime(handlers: VtualRealtimeHandlers): boolean {
  handlerSet.add(handlers)
  subscribeWhenEchoReady(ensureChannel)
  return channelActive
}

export function unsubscribeVtualPlatformCredentialsRealtime(handlers: VtualRealtimeHandlers): void {
  handlerSet.delete(handlers)
  maybeLeave()
}

// --- Creator channel snapshot updates (fetch-pool flush) ---

export type ChannelSnapshotUpdatedPayload = {
  creator_id: string
  channel_ids: string[]
}

const snapshotHandlers = new Map<string, Set<(payload: ChannelSnapshotUpdatedPayload) => void>>()
const snapshotChannels = new Set<string>()

function ensureSnapshotChannel(creatorId: string): boolean {
  if (snapshotChannels.has(creatorId)) return true
  const echo = getEcho()
  if (!echo) return false
  try {
    const ch = echo.private(`vtual.creator.${creatorId}`)
    ch.listen('.channel.snapshot.updated', (e: ChannelSnapshotUpdatedPayload) => {
      const set = snapshotHandlers.get(creatorId)
      if (!set) return
      for (const handler of set) handler(e)
    })
    snapshotChannels.add(creatorId)
    return true
  } catch {
    return false
  }
}

export function subscribeVtualCreatorSnapshots(
  creatorId: string,
  handler: (payload: ChannelSnapshotUpdatedPayload) => void,
): boolean {
  let set = snapshotHandlers.get(creatorId)
  if (!set) {
    set = new Set()
    snapshotHandlers.set(creatorId, set)
  }
  set.add(handler)
  subscribeWhenEchoReady(() => ensureSnapshotChannel(creatorId))
  return snapshotChannels.has(creatorId)
}

export function unsubscribeVtualCreatorSnapshots(
  creatorId: string,
  handler: (payload: ChannelSnapshotUpdatedPayload) => void,
): void {
  const set = snapshotHandlers.get(creatorId)
  if (!set) return
  set.delete(handler)
  if (set.size > 0) return
  snapshotHandlers.delete(creatorId)
  if (!snapshotChannels.has(creatorId)) return
  const echo = getEcho()
  if (echo) {
    try {
      echo.leave(`vtual.creator.${creatorId}`)
    } catch {
      // ignore
    }
  }
  snapshotChannels.delete(creatorId)
}

// --- Management org updates (members / invites / creator assignments) ---

export type ManagementUpdatedPayload = {
  management_id: string
  kind: 'management' | 'member' | 'invite' | 'creator'
  ref_id: string | null
  action: string
}

const managementHandlers = new Map<string, Set<(payload: ManagementUpdatedPayload) => void>>()
const managementChannels = new Set<string>()

function ensureManagementChannel(managementId: string): boolean {
  if (managementChannels.has(managementId)) return true
  const echo = getEcho()
  if (!echo) return false
  try {
    const ch = echo.private(`vtual.management.${managementId}`)
    ch.listen('.management.updated', (e: ManagementUpdatedPayload) => {
      const set = managementHandlers.get(managementId)
      if (!set) return
      for (const handler of set) handler(e)
    })
    managementChannels.add(managementId)
    return true
  } catch {
    return false
  }
}

export function subscribeVtualManagement(
  managementId: string,
  handler: (payload: ManagementUpdatedPayload) => void,
): boolean {
  let set = managementHandlers.get(managementId)
  if (!set) {
    set = new Set()
    managementHandlers.set(managementId, set)
  }
  set.add(handler)
  subscribeWhenEchoReady(() => ensureManagementChannel(managementId))
  return managementChannels.has(managementId)
}

export function unsubscribeVtualManagement(
  managementId: string,
  handler: (payload: ManagementUpdatedPayload) => void,
): void {
  const set = managementHandlers.get(managementId)
  if (!set) return
  set.delete(handler)
  if (set.size > 0) return
  managementHandlers.delete(managementId)
  if (!managementChannels.has(managementId)) return
  const echo = getEcho()
  if (echo) {
    try {
      echo.leave(`vtual.management.${managementId}`)
    } catch {
      // ignore
    }
  }
  managementChannels.delete(managementId)
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
