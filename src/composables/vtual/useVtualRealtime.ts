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

export function useVtualRealtime() {
  return {
    subscribe: subscribeVtualPlatformCredentialsRealtime,
    unsubscribe: unsubscribeVtualPlatformCredentialsRealtime,
  }
}
