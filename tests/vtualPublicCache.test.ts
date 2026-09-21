import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VtualPublicContentFilters } from '../src/api/types'

/**
 * Guest profile SWR cache contract. The cache key MUST include the content-grid
 * filters, otherwise a filtered request would serve (or overwrite) the
 * unfiltered first-page payload.
 */

const get = vi.fn()

vi.mock('@/api/client', () => ({
  get: (...args: unknown[]) => get(...args),
}))

type ComposableModule = typeof import('../src/valkivid3/composables/useVtualPublic')

function profilePayload(slug: string, total: number) {
  return {
    status: 'success',
    message: 'ok',
    data: {
      slug,
      display_name: 'Neon Fox',
      bio: null,
      avatar_url: null,
      is_claimable: false,
      is_live: false,
      total_subscribers: 100,
      total_subscribers_formatted: '100',
      channels: [],
      links: [],
      contents: {
        items: [],
        pagination: { current_page: 1, last_page: 1, per_page: 12, total, has_more: false },
      },
    },
  }
}

function filters(partial: Partial<VtualPublicContentFilters> = {}): VtualPublicContentFilters {
  return { platform: null, type: null, sort: 'newest', ...partial }
}

async function importComposable(): Promise<ComposableModule> {
  return import('../src/valkivid3/composables/useVtualPublic')
}

beforeEach(() => {
  get.mockReset()
  get.mockImplementation((_uri: string, query: Record<string, unknown>) =>
    Promise.resolve(profilePayload('neon-fox', typeof query.type === 'string' ? 1 : 3)),
  )
  vi.resetModules()
})

describe('useVtualPublic profile cache keys', () => {
  it('issues a separate request per filter set', async () => {
    const { useVtualPublic } = await importComposable()
    const { fetchProfile } = useVtualPublic()

    await fetchProfile('neon-fox', 1, 12, filters())
    await fetchProfile('neon-fox', 1, 12, filters({ platform: 'twitch' }))
    await fetchProfile('neon-fox', 1, 12, filters({ platform: 'twitch', type: 'vod', sort: 'oldest' }))

    expect(get).toHaveBeenCalledTimes(3)
    expect(get).toHaveBeenNthCalledWith(1, 'vtual/public/vtubers/neon-fox', {
      page: 1,
      per_page: 12,
    })
    expect(get).toHaveBeenNthCalledWith(2, 'vtual/public/vtubers/neon-fox', {
      page: 1,
      per_page: 12,
      platform: 'twitch',
    })
    expect(get).toHaveBeenNthCalledWith(3, 'vtual/public/vtubers/neon-fox', {
      page: 1,
      per_page: 12,
      platform: 'twitch',
      type: 'vod',
      sort: 'oldest',
    })
  })

  it('serves a repeated identical filter set from the cache', async () => {
    const { useVtualPublic } = await importComposable()
    const { fetchProfile } = useVtualPublic()

    const first = await fetchProfile('neon-fox', 1, 12, filters({ type: 'vod' }))
    const second = await fetchProfile('neon-fox', 1, 12, filters({ type: 'vod' }))

    expect(get).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
    expect(second.contents.pagination.total).toBe(1)
  })

  it('keeps the filtered payload out of the unfiltered cache slot', async () => {
    const { useVtualPublic } = await importComposable()
    const { fetchProfile } = useVtualPublic()

    const filtered = await fetchProfile('neon-fox', 1, 12, filters({ type: 'vod' }))
    const unfiltered = await fetchProfile('neon-fox', 1, 12, filters())

    expect(filtered.contents.pagination.total).toBe(1)
    expect(unfiltered.contents.pagination.total).toBe(3)
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('hover prefetch warms the default first-page key', async () => {
    const { useVtualPublic, prefetchVtualProfile } = await importComposable()

    prefetchVtualProfile('neon-fox')
    await useVtualPublic().fetchProfile('neon-fox')

    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith('vtual/public/vtubers/neon-fox', {
      page: 1,
      per_page: 12,
    })
  })
})
