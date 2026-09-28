import { describe, expect, it, vi } from 'vitest'

/**
 * Public vTuber profile grid <-> URL codec. The filtered grid is shareable:
 * a reload, a paste or a back/forward must land on the same state, and the
 * canonical unfiltered first page must stay a bare URL.
 */

vi.mock('@/api/client', () => ({
  get: vi.fn(),
}))

type QueryModule = typeof import('../src/valkivid3/composables/useVtualProfileQuery')

async function importCodec(): Promise<QueryModule> {
  return import('../src/valkivid3/composables/useVtualProfileQuery')
}

describe('profileFiltersFromQuery', () => {
  it('seeds platform, type, content_type, sort and page from the query', async () => {
    const { profileFiltersFromQuery } = await importCodec()

    const state = profileFiltersFromQuery({
      platform: 'youtube',
      type: 'vod',
      content_type: 'music',
      sort: 'oldest',
      page: '3',
    })

    expect(state.filters).toEqual({
      platform: 'youtube',
      type: 'vod',
      content_type: 'music',
      sort: 'oldest',
    })
    expect(state.page).toBe(3)
  })

  it('falls back to the default state for an empty query', async () => {
    const { profileFiltersFromQuery } = await importCodec()

    expect(profileFiltersFromQuery({})).toEqual({
      filters: { platform: null, type: null, content_type: null, sort: 'newest' },
      page: 1,
    })
  })

  it('drops unknown values instead of forwarding them', async () => {
    const { profileFiltersFromQuery } = await importCodec()

    const state = profileFiltersFromQuery({
      platform: 'myspace',
      type: 'shorts',
      content_type: 'podcast',
      sort: 'random',
      page: '0',
    })

    expect(state.filters).toEqual({
      platform: null,
      type: null,
      content_type: null,
      sort: 'newest',
    })
    expect(state.page).toBe(1)
  })

  it('tolerates repeated params and whitespace', async () => {
    const { profileFiltersFromQuery } = await importCodec()

    const state = profileFiltersFromQuery({
      platform: ['twitch', 'youtube'],
      type: ' live ',
      content_type: ['music', 'non_music'],
    })

    expect(state.filters.platform).toBe('twitch')
    expect(state.filters.type).toBe('live')
    expect(state.filters.content_type).toBe('music')
  })
})

describe('profileQueryFromFilters', () => {
  it('omits defaults so the unfiltered first page is a bare URL', async () => {
    const { profileQueryFromFilters } = await importCodec()

    expect(
      profileQueryFromFilters({ platform: null, type: null, content_type: null, sort: 'newest' }, 1),
    ).toEqual({})
  })

  it('serializes every non-default filter plus the page', async () => {
    const { profileQueryFromFilters } = await importCodec()

    expect(
      profileQueryFromFilters(
        { platform: 'youtube', type: 'vod', content_type: 'non_music', sort: 'oldest' },
        3,
      ),
    ).toEqual({
      platform: 'youtube',
      type: 'vod',
      content_type: 'non_music',
      sort: 'oldest',
      page: '3',
    })
  })
})

describe('round trip and normalization', () => {
  it('survives query -> state -> query unchanged', async () => {
    const { profileFiltersFromQuery, profileQueryFromFilters, profileQueryKey } = await importCodec()

    const raw = {
      platform: 'twitch',
      type: 'live',
      content_type: 'music',
      sort: 'oldest',
      page: '2',
    }
    const state = profileFiltersFromQuery(raw)

    expect(profileQueryKey(profileQueryFromFilters(state.filters, state.page))).toBe(
      profileQueryKey(raw),
    )
  })

  it('normalizes a hand-written default URL to the bare form', async () => {
    const { profileFiltersFromQuery, profileQueryFromFilters, profileQueryKey } = await importCodec()

    const state = profileFiltersFromQuery({ sort: 'newest', page: '1' })

    // sort=newest and page=1 are defaults — they must not survive a rewrite.
    expect(profileQueryFromFilters(state.filters, state.page)).toEqual({})
  })

  it('treats an equal-but-reordered query as already canonical', async () => {
    const { profileQueryKey } = await importCodec()

    expect(profileQueryKey({ type: 'vod', platform: 'youtube' })).toBe(
      profileQueryKey({ platform: 'youtube', type: 'vod' }),
    )
  })
})
