import { get } from '@/api/client'
import type {
  ApiResponse,
  VtualPublicContentFeed,
  VtualPublicContentFilters,
  VtualPublicDirectory,
  VtualPublicLanding,
  VtualPublicManagementProfile,
  VtualPublicProfile,
} from '@/api/types'

// Guest-safe payload is cached in this tab for 60 seconds. The in-memory layer
// adds stale-while-revalidate so back/forward navigation renders instantly while
// a background refresh revalidates.
const TTL_MS = 60_000

interface CacheEntry<T> {
  data: T
  at: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

function isFresh(at: number): boolean {
  return Date.now() - at < TTL_MS
}

async function swr<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key) as CacheEntry<T> | undefined
  if (cached && isFresh(cached.at)) {
    return cached.data
  }

  const pending = inflight.get(key) as Promise<T> | undefined
  if (pending) {
    return pending
  }

  const request = fetcher()
    .then((data) => {
      cache.set(key, { data, at: Date.now() })
      return data
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, request as Promise<unknown>)

  if (cached) {
    // Stale entry: serve it now, revalidate in the background.
    void request.catch(() => undefined)
    return cached.data
  }

  return request
}

// Warms the profile cache without awaiting (used on directory-card hover). Key
// must match the show-view's first-page entry — see `profileCacheKey` with the
// default (unfiltered) filter set.
export function prefetchVtualProfile(slug: string): void {
  const filters = defaultProfileFilters()
  void swr(profileCacheKey(slug, 1, 12, filters), () =>
    fetchVtualProfile(slug, 1, 12, filters),
  ).catch(() => undefined)
}

export function defaultProfileFilters(): VtualPublicContentFilters {
  return { platform: null, type: null, sort: 'newest' }
}

// Single source of truth for the profile SWR key. Filters MUST be part of the
// key: otherwise a filtered request would serve (or overwrite) the unfiltered
// first-page payload.
function profileCacheKey(
  slug: string,
  page: number,
  perPage: number,
  filters: VtualPublicContentFilters,
): string {
  return `profile:${slug}:${page}:${perPage}:${filters.platform ?? '-'}:${filters.type ?? '-'}:${filters.sort}`
}

async function fetchVtualDirectory(
  page: number = 1,
  search: string = '',
  perPage: number = 12,
): Promise<VtualPublicDirectory> {
  const res = await get<ApiResponse<VtualPublicDirectory>>('vtual/public/vtubers', {
    page,
    per_page: perPage,
    ...(search.trim() !== '' ? { search: search.trim() } : {}),
  })
  return res.data as VtualPublicDirectory
}

async function fetchVtualContents(
  page: number = 1,
  perPage: number = 12,
): Promise<VtualPublicContentFeed> {
  const res = await get<ApiResponse<VtualPublicContentFeed>>('vtual/public/contents', {
    page,
    per_page: perPage,
  })
  return res.data as VtualPublicContentFeed
}

async function fetchVtualProfile(
  slug: string,
  page: number = 1,
  perPage: number = 12,
  filters: VtualPublicContentFilters = defaultProfileFilters(),
): Promise<VtualPublicProfile> {
  const res = await get<ApiResponse<VtualPublicProfile>>(
    `vtual/public/vtubers/${encodeURIComponent(slug)}`,
    {
      page,
      per_page: perPage,
      ...(filters.platform !== null ? { platform: filters.platform } : {}),
      ...(filters.type !== null ? { type: filters.type } : {}),
      ...(filters.sort !== 'newest' ? { sort: filters.sort } : {}),
    },
  )
  return res.data as VtualPublicProfile
}

async function fetchVtualLanding(): Promise<VtualPublicLanding> {
  const res = await get<ApiResponse<VtualPublicLanding>>('vtual/public/landing')
  return res.data as VtualPublicLanding
}

async function fetchVtualManagementProfile(slug: string): Promise<VtualPublicManagementProfile> {
  const res = await get<ApiResponse<VtualPublicManagementProfile>>(
    `vtual/public/managements/${encodeURIComponent(slug)}`,
  )
  return res.data as VtualPublicManagementProfile
}

export function useVtualPublic() {
  function fetchDirectory(
    page: number = 1,
    search: string = '',
    perPage: number = 12,
  ): Promise<VtualPublicDirectory> {
    const q = search.trim()
    return swr(`directory:${page}:${perPage}:${q}`, () => fetchVtualDirectory(page, q, perPage))
  }

  function fetchContents(page: number = 1, perPage: number = 12): Promise<VtualPublicContentFeed> {
    return swr(`contents:${page}:${perPage}`, () => fetchVtualContents(page, perPage))
  }

  function fetchProfile(
    slug: string,
    page: number = 1,
    perPage: number = 12,
    filters: VtualPublicContentFilters = defaultProfileFilters(),
  ): Promise<VtualPublicProfile> {
    return swr(profileCacheKey(slug, page, perPage, filters), () =>
      fetchVtualProfile(slug, page, perPage, filters),
    )
  }

  function fetchLanding(): Promise<VtualPublicLanding> {
    return swr('landing', () => fetchVtualLanding())
  }

  function fetchManagementProfile(slug: string): Promise<VtualPublicManagementProfile> {
    return swr(`mgmt-profile:${slug}`, () => fetchVtualManagementProfile(slug))
  }

  return {
    fetchDirectory,
    fetchContents,
    fetchProfile,
    fetchLanding,
    fetchManagementProfile,
    prefetchProfile: prefetchVtualProfile,
  }
}
