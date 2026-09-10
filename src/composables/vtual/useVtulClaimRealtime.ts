// --- Claim progress updates (VtulVtuberClaimView) ---

import { getEcho, subscribeWhenEchoReady } from '@/composables/useEcho'
import type { VtualCreatorClaim } from '@/api/types'

export type ClaimProgressPayload = {
  phase?: string
  claim?: VtualCreatorClaim
}

const claimHandlers = new Map<string, Set<(payload: ClaimProgressPayload) => void>>()
const claimChannels = new Set<string>()

function ensureClaimChannel(claimId: string): boolean {
  if (claimChannels.has(claimId)) return true
  const echo = getEcho()
  if (!echo) return false
  try {
    const ch = echo.private(`vtual.claim.${claimId}`)
    ch.listen('.claim.progress', (e: ClaimProgressPayload) => {
      const set = claimHandlers.get(claimId)
      if (!set) return
      for (const handler of set) handler(e)
    })
    claimChannels.add(claimId)
    return true
  } catch {
    return false
  }
}

export function subscribeVtulClaim(
  claimId: string,
  handler: (payload: ClaimProgressPayload) => void,
): boolean {
  let set = claimHandlers.get(claimId)
  if (!set) {
    set = new Set()
    claimHandlers.set(claimId, set)
  }
  set.add(handler)
  subscribeWhenEchoReady(() => ensureClaimChannel(claimId))
  return claimChannels.has(claimId)
}

export function unsubscribeVtulClaim(claimId: string, handler: (payload: ClaimProgressPayload) => void): void {
  const set = claimHandlers.get(claimId)
  if (!set) return
  set.delete(handler)
  if (set.size > 0) return
  claimHandlers.delete(claimId)
  if (!claimChannels.has(claimId)) return
  const echo = getEcho()
  if (echo) {
    try {
      echo.leave(`vtual.claim.${claimId}`)
    } catch {
      // ignore
    }
  }
  claimChannels.delete(claimId)
}
