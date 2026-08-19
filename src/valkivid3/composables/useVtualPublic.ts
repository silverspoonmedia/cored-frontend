import { get } from '@/api/client'
import type {
  ApiResponse,
  VtualPublicContentFeed,
  VtualPublicDirectory,
  VtualPublicLanding,
  VtualPublicProfile,
} from '@/api/types'

// Guest-safe payload is already edge-cached by the BFF (public, max-age=60). This
// in-memory layer adds stale-while-revalidate on top so back/forward navigation
// renders instantly from cache while a background refresh revalidates.
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
// must match the show-view's first-page entry (profile:{slug}:1:12).
export function prefetchVtualProfile(slug: string): void {
  void swr('profile:' + slug + ':1:12', () => fetchVtualProfile(slug, 1)).catch(() => undefined)
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
): Promise<VtualPublicProfile> {
  const res = await get<ApiResponse<VtualPublicProfile>>(
    `vtual/public/vtubers/${encodeURIComponent(slug)}`,
    { page, per_page: perPage },
  )
  return res.data as VtualPublicProfile
}

async function fetchVtualLanding(): Promise<VtualPublicLanding> {
  const res = await get<ApiResponse<VtualPublicLanding>>('vtual/public/landing')
  return res.data as VtualPublicLanding
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
  ): Promise<VtualPublicProfile> {
    return swr(`profile:${slug}:${page}:${perPage}`, () => fetchVtualProfile(slug, page, perPage))
  }

  function fetchLanding(): Promise<VtualPublicLanding> {
    return swr('landing', () => fetchVtualLanding())
  }

  return {
    fetchDirectory,
    fetchContents,
    fetchProfile,
    fetchLanding,
    prefetchProfile: prefetchVtualProfile,
  }
}
