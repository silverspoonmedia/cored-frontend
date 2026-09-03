import { getEcho } from '@/composables/useEcho'

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
  return ensureChannel()
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
  return ensureSnapshotChannel(creatorId)
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

export function useVtualRealtime() {
  return {
    subscribe: subscribeVtualPlatformCredentialsRealtime,
    unsubscribe: unsubscribeVtualPlatformCredentialsRealtime,
    subscribeCreatorSnapshots: subscribeVtualCreatorSnapshots,
    unsubscribeCreatorSnapshots: unsubscribeVtualCreatorSnapshots,
  }
}
