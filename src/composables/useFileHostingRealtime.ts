import { getEcho } from '@/composables/useEcho'
import { useAuth } from '@/stores/auth'

export type FileHostingRealtimeHandlers = {
  onListingChanged?: () => void
  onQuotaChanged?: () => void
  onMembersChanged?: () => void
  onActivityAppended?: () => void
  onCollectionAnalysisProgress?: (payload: unknown) => void
  onAssetMetadataProgress?: (payload: unknown) => void
}

const handlerSet = new Set<FileHostingRealtimeHandlers>()
let activeChannel: string | null = null

function resolveChannel(): string | null {
  const { user } = useAuth()
  const userId = user.value?.id
  if (!userId) return null
  return `file-hosting.user.${userId}`
}

function ensureChannel(): boolean {
  const channel = resolveChannel()
  if (!channel) return false

  if (activeChannel === channel) return true

  const echo = getEcho()
  if (!echo) return false

  try {
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
    activeChannel = channel
    return true
  } catch {
    return false
  }
}

function maybeLeave(): void {
  if (handlerSet.size > 0) return
  if (!activeChannel) return
  const echo = getEcho()
  if (echo) {
    try {
      echo.leave(activeChannel)
    } catch {
      // ignore
    }
  }
  activeChannel = null
}

export function subscribeFileHostingRealtime(handlers: FileHostingRealtimeHandlers): boolean {
  handlerSet.add(handlers)
  return ensureChannel()
}

export function unsubscribeFileHostingRealtime(handlers: FileHostingRealtimeHandlers): void {
  handlerSet.delete(handlers)
  maybeLeave()
}

export function useFileHostingRealtime() {
  return {
    subscribe: subscribeFileHostingRealtime,
    unsubscribe: unsubscribeFileHostingRealtime,
  }
}
