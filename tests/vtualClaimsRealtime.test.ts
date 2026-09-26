import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PusherEcho } from 'laravel-echo'
import type { VtualCreatorClaim } from '../src/api/types'

/**
 * `useVtualClaims` is the claims hub's data + realtime seam:
 *
 * - `runAction` routes a row-action key to the endpoint the server declared
 *   legal for that row, and refuses anything else instead of guessing.
 * - the staff queue rides `private-vtual.claims`, whose pushed payload is
 *   ids + action + status **only**. The composable must pass that through
 *   untouched — a view that expects `creator`/`channel` on a pushed row would
 *   read `undefined` and a `token` leaking into the payload would be a
 *   security defect, so both are asserted here.
 * - the owner side binds one keyed channel per own pending claim and releases
 *   the ones that dropped out of the page.
 */

const api = vi.hoisted(() => ({
  fetchMyClaims: vi.fn(),
  fetchPendingClaims: vi.fn(),
  verifyClaim: vi.fn(),
  cancelClaim: vi.fn(),
  acceptAnywayClaim: vi.fn(),
}))

vi.mock('../src/composables/vtual/useVtual', () => ({
  useVtual: () => ({
    fetchMyClaims: api.fetchMyClaims,
    fetchPendingClaims: api.fetchPendingClaims,
    verifyClaim: api.verifyClaim,
    cancelClaim: api.cancelClaim,
    acceptAnywayClaim: api.acceptAnywayClaim,
  }),
}))

const leftChannels: string[] = []
const channels = new Map<string, { listen: ReturnType<typeof vi.fn>; listeners: Record<string, (payload: unknown) => void> }>()

function makeFakeEcho(): PusherEcho {
  return {
    private: vi.fn((name: string) => {
      let ch = channels.get(name)
      if (!ch) {
        ch = {
          listen: vi.fn((event: string, fn: (payload: unknown) => void) => {
            ch!.listeners[event] = fn
          }),
          listeners: {},
        }
        channels.set(name, ch)
      }
      return ch as unknown as never
    }),
    leave: vi.fn((name: string) => {
      leftChannels.push(name)
      channels.delete(name)
    }),
  } as unknown as PusherEcho
}

const claim = (id: string): VtualCreatorClaim => ({ id }) as VtualCreatorClaim

async function loadComposable() {
  const echo = await import('../src/composables/useEcho')
  echo.__setEchoForTests(makeFakeEcho())
  const { useVtualClaims } = await import('../src/composables/vtual/useVtualClaims')
  return useVtualClaims()
}

beforeEach(() => {
  channels.clear()
  leftChannels.length = 0
  vi.clearAllMocks()
})

afterEach(() => {
  vi.resetModules()
})

describe('runAction', () => {
  it('routes each declared key to its endpoint', async () => {
    const claims = await loadComposable()
    api.verifyClaim.mockResolvedValue({ id: 'c1' })
    api.cancelClaim.mockResolvedValue({ id: 'c1' })
    api.acceptAnywayClaim.mockResolvedValue({ id: 'c1' })

    await claims.runAction('verify', claim('c1'))
    expect(api.verifyClaim).toHaveBeenCalledWith('c1')

    await claims.runAction('cancel', claim('c1'))
    expect(api.cancelClaim).toHaveBeenCalledWith('c1')

    await claims.runAction('accept_anyway', claim('c1'))
    expect(api.acceptAnywayClaim).toHaveBeenCalledWith('c1')
  })

  it('refuses an action key the server never declares', async () => {
    const claims = await loadComposable()

    await expect(claims.runAction('delete', claim('c1'))).rejects.toThrow('Unsupported claim action: delete')
    expect(api.verifyClaim).not.toHaveBeenCalled()
    expect(api.cancelClaim).not.toHaveBeenCalled()
  })
})

describe('staff queue realtime', () => {
  it('binds private-vtual.claims and forwards the pushed payload untouched', async () => {
    const claims = await loadComposable()
    const handler = vi.fn()

    claims.subscribeStaffRealtime({ onClaimChanged: handler })

    const channel = channels.get('vtual.claims')
    expect(channel).toBeDefined()

    const payload = { claim_id: 'c1', creator_id: 'cr1', action: 'verified', status: 'verified' }
    channel?.listeners['.claim.changed']?.(payload)

    expect(handler).toHaveBeenCalledTimes(1)
    // Same object: nothing is enriched locally.
    expect(handler.mock.calls[0]?.[0]).toBe(payload)
    // No claim snapshot, no bio token — the pushed row cannot carry either.
    expect(handler.mock.calls[0]?.[0]).not.toHaveProperty('token')
    expect(handler.mock.calls[0]?.[0]).not.toHaveProperty('creator')
    expect(handler.mock.calls[0]?.[0]).not.toHaveProperty('channel')
  })

  it('leaves the staff channel when the last consumer detaches', async () => {
    const claims = await loadComposable()
    const handlers = { onClaimChanged: vi.fn() }

    claims.subscribeStaffRealtime(handlers)
    expect(leftChannels).not.toContain('vtual.claims')

    claims.unsubscribeStaffRealtime(handlers)
    expect(leftChannels).toContain('vtual.claims')
    expect(channels.get('vtual.claims')).toBeUndefined()
  })
})

describe('owner per-claim channels', () => {
  it('binds one channel per pending claim and releases the ones that dropped out', async () => {
    const claims = await loadComposable()
    const onChange = vi.fn()

    claims.syncOwnerClaimChannels(['c1', 'c2'], onChange)
    expect(channels.get('vtual.claim.c1')).toBeDefined()
    expect(channels.get('vtual.claim.c2')).toBeDefined()

    // Second page / refetch: c1 is gone, c3 appeared.
    claims.syncOwnerClaimChannels(['c2', 'c3'], onChange)
    expect(leftChannels).toContain('vtual.claim.c1')
    expect(channels.get('vtual.claim.c2')).toBeDefined()
    expect(channels.get('vtual.claim.c3')).toBeDefined()

    channels.get('vtual.claim.c2')?.listeners['.claim.progress']?.({ phase: 'verified' })
    expect(onChange).toHaveBeenCalledTimes(1)

    claims.releaseOwnerClaimChannels()
    expect(leftChannels).toContain('vtual.claim.c2')
    expect(leftChannels).toContain('vtual.claim.c3')
  })

  it('keeps a claim channel bound across a refetch that still contains it', async () => {
    const claims = await loadComposable()
    const onChange = vi.fn()

    claims.syncOwnerClaimChannels(['c1'], onChange)
    claims.syncOwnerClaimChannels(['c1'], onChange)

    expect(leftChannels).not.toContain('vtual.claim.c1')
    channels.get('vtual.claim.c1')?.listeners['.claim.progress']?.({ phase: 'pending' })
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe('pagination passthrough', () => {
  it('forwards list params to both queues', async () => {
    const claims = await loadComposable()
    api.fetchMyClaims.mockResolvedValue({ items: [], pagination: {} })
    api.fetchPendingClaims.mockResolvedValue({ items: [], pagination: {} })

    await claims.fetchMine({ page: 2, per_page: 10 })
    expect(api.fetchMyClaims).toHaveBeenCalledWith({ page: 2, per_page: 10 })

    await claims.fetchPending({ page: 3 })
    expect(api.fetchPendingClaims).toHaveBeenCalledWith({ page: 3 })
  })
})
