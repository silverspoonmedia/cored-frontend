import type { ListParams } from '@/composables/useResource'
import { useVtual } from '@/composables/vtual/useVtual'
import { createRealtimeChannel } from '@/composables/echo/realtimeChannel'
import { subscribeVtualClaim, unsubscribeVtualClaim } from '@/composables/vtual/useVtualClaimRealtime'
import type { VtualClaimPagedList, VtualCreatorClaim } from '@/api/types'

/**
 * Creator-claim surface for the claims hub (`/apps/vtual/claims`).
 *
 * Two audiences share one screen:
 *
 * - **Owner** (`vtual/claims/mine`) — the actor's own pending claims. The
 *   payload carries the bio token; the endpoint only ever returns rows the
 *   actor owns.
 * - **Staff** (`vtual/claims/pending`) — the moderation queue. Needs
 *   `manage any vtual resource`; 403 otherwise, so the view must gate the tab
 *   on the same permission rather than discover it by failing.
 *
 * Staff realtime rides `private-vtual.claims` (`CreatorClaimStaffChanged`),
 * whose payload is ids + action + status only — deliberately no snapshot, so
 * nothing here may assume `creator`/`channel` are present on a pushed row.
 * The correct reaction to a ping is a refetch, not a local row patch.
 */

export type VtualClaimStaffChangedPayload = {
  claim_id: string
  creator_id: string
  action: string
  status: string | null
}

export type VtualClaimsRealtimeHandlers = {
  onClaimChanged?: (payload: VtualClaimStaffChangedPayload) => void
}

const staffQueueChannel = createRealtimeChannel<VtualClaimsRealtimeHandlers>({
  channel: 'vtual.claims',
  events: [
    {
      event: '.claim.changed',
      handle: (handlers, payload: VtualClaimStaffChangedPayload) => {
        for (const h of handlers) h.onClaimChanged?.(payload)
      },
    },
  ],
})

/** Join the staff queue ping. Returns whether the channel is attached now. */
export function subscribeVtualClaimsStaffRealtime(handlers: VtualClaimsRealtimeHandlers): boolean {
  return staffQueueChannel.subscribe(handlers)
}

export function unsubscribeVtualClaimsStaffRealtime(handlers: VtualClaimsRealtimeHandlers): void {
  staffQueueChannel.unsubscribe(handlers)
}

// --- Owner-side per-claim progress (one channel per own pending claim) ---
//
// The owner list is short by construction (`vtual.claim.max_pending_per_user`),
// so one keyed channel per row is cheaper than polling and is the only way to
// learn that a claim left `pending` (verified / cancelled / expired) — the
// staff channel is not authorized for claimants.

const ownerHandlers = new Map<string, () => void>()

/** Bind exactly the given claim ids; ids that dropped out are released. */
function syncOwnerClaimChannels(claimIds: string[], onChange: () => void): void {
  const wanted = new Set(claimIds)

  for (const [id, handler] of ownerHandlers) {
    if (wanted.has(id)) continue
    unsubscribeVtualClaim(id, handler)
    ownerHandlers.delete(id)
  }

  for (const id of wanted) {
    if (ownerHandlers.has(id)) continue
    const handler = (): void => onChange()
    ownerHandlers.set(id, handler)
    subscribeVtualClaim(id, handler)
  }
}

function releaseOwnerClaimChannels(): void {
  for (const [id, handler] of ownerHandlers) {
    unsubscribeVtualClaim(id, handler)
  }
  ownerHandlers.clear()
}

export function useVtualClaims() {
  const vtual = useVtual()

  /** Owner's own pending claims, paginated (`display_mode=query`). */
  function fetchMine(params?: ListParams): Promise<VtualClaimPagedList> {
    return vtual.fetchMyClaims(params)
  }

  /** Staff moderation queue, paginated. Throws 403 without the permission. */
  function fetchPending(params?: ListParams): Promise<VtualClaimPagedList> {
    return vtual.fetchPendingClaims(params)
  }

  /**
   * Run a row action by key. The server decides which keys are legal for this
   * actor on this row (see `VtualClaimQueryRowActions`), so the view only
   * routes the click — it never widens the action set locally.
   */
  async function runAction(key: string, claim: VtualCreatorClaim): Promise<VtualCreatorClaim> {
    switch (key) {
      case 'verify':
        return vtual.verifyClaim(claim.id)
      case 'cancel':
        return vtual.cancelClaim(claim.id)
      case 'accept_anyway':
        return vtual.acceptAnywayClaim(claim.id)
      default:
        throw new Error(`Unsupported claim action: ${key}`)
    }
  }

  return {
    fetchMine,
    fetchPending,
    runAction,
    subscribeStaffRealtime: subscribeVtualClaimsStaffRealtime,
    unsubscribeStaffRealtime: unsubscribeVtualClaimsStaffRealtime,
    syncOwnerClaimChannels,
    releaseOwnerClaimChannels,
  }
}
