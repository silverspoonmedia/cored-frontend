// --- Claim progress updates (VtulVtuberClaimView) ---

import { createKeyedRealtimeChannel } from '@/composables/echo/realtimeChannel'
import type { VtualCreatorClaim } from '@/api/types'

export type ClaimProgressPayload = {
  phase?: string
  claim?: VtualCreatorClaim
}

type ClaimHandler = (payload: ClaimProgressPayload) => void

const claimChannels = createKeyedRealtimeChannel<string, ClaimHandler>({
  channel: (claimId: string) => `vtual.claim.${claimId}`,
  events: () => [
    {
      event: '.claim.progress',
      handle: (handlers, payload: ClaimProgressPayload) => {
        for (const h of handlers) h(payload)
      },
    },
  ],
})

export function subscribeVtulClaim(claimId: string, handler: ClaimHandler): boolean {
  return claimChannels.subscribe(claimId, handler)
}

export function unsubscribeVtulClaim(claimId: string, handler: ClaimHandler): void {
  claimChannels.unsubscribe(claimId, handler)
}
