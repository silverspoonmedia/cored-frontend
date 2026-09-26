import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { VtualPublicContentFilters } from '@/api/types'
import { defaultProfileFilters } from '@/valkivid3/composables/useVtualPublic'

/**
 * URL <-> filter-state codec for the public vTuber profile grid.
 *
 * The filtered grid is shareable: `?platform=youtube&type=vod&sort=oldest&page=3`
 * must survive a reload, a paste and a back/forward. Both directions are pure
 * functions so the view never has to reason about string coercion, and so the
 * contract is unit-testable without mounting the router.
 *
 * Unknown values are dropped on the way in. The backend tolerates a stray
 * `platform` key by returning an empty page, but the UI would then render an
 * empty grid with no pressed chip — a dead end for the visitor.
 */

/** `type` values the backend filter accepts. */
export const PROFILE_TYPE_VALUES = ['live', 'archive', 'vod'] as const

/** `sort` values the backend filter accepts. */
export const PROFILE_SORT_VALUES = ['newest', 'oldest'] as const

/** Platform keys known to the backend (`App\Domain\Vtual\Enums\PlatformKey`). */
export const PROFILE_PLATFORM_VALUES = ['youtube', 'twitch', 'kick'] as const

export interface ProfileQueryState {
  filters: VtualPublicContentFilters
  page: number
}

function firstValue(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') {
    return null
  }
  const trimmed = raw.trim()

  return trimmed === '' ? null : trimmed
}

function isOneOf<T extends string>(value: string | null, allowed: readonly T[]): value is T {
  return value !== null && (allowed as readonly string[]).includes(value)
}

/**
 * Read filter state out of a route query. Invalid or unknown entries fall back
 * to the default (unfiltered, newest, page 1) instead of being sent upstream.
 */
export function profileFiltersFromQuery(query: LocationQuery): ProfileQueryState {
  const platform = firstValue(query.platform)
  const type = firstValue(query.type)
  const sort = firstValue(query.sort)

  const rawPage = firstValue(query.page)
  const parsedPage = rawPage === null ? Number.NaN : Number.parseInt(rawPage, 10)

  return {
    filters: {
      platform: isOneOf(platform, PROFILE_PLATFORM_VALUES) ? platform : null,
      type: isOneOf(type, PROFILE_TYPE_VALUES) ? type : null,
      sort: isOneOf(sort, PROFILE_SORT_VALUES) ? sort : 'newest',
    },
    page: Number.isFinite(parsedPage) && parsedPage > 1 ? parsedPage : 1,
  }
}

/**
 * Serialize filter state into a route query. Defaults are omitted, so the
 * canonical unfiltered first page is a bare `/vtual/vtubers/<slug>` URL and
 * identical states always produce an identical URL (no replace loop).
 */
export function profileQueryFromFilters(
  filters: VtualPublicContentFilters,
  page: number,
): LocationQueryRaw {
  const query: LocationQueryRaw = {}

  if (filters.platform !== null) {
    query.platform = filters.platform
  }
  if (filters.type !== null) {
    query.type = filters.type
  }
  if (filters.sort !== 'newest') {
    query.sort = filters.sort
  }
  if (page > 1) {
    query.page = String(page)
  }

  return query
}

/** Stable comparison key for a query object (order-insensitive). */
export function profileQueryKey(query: LocationQueryRaw): string {
  return Object.keys(query)
    .sort()
    .map((key) => `${key}=${String(query[key])}`)
    .join('&')
}

export function profileFiltersEqual(
  a: VtualPublicContentFilters,
  b: VtualPublicContentFilters,
): boolean {
  return a.platform === b.platform && a.type === b.type && a.sort === b.sort
}

export function defaultProfileQueryState(): ProfileQueryState {
  return { filters: defaultProfileFilters(), page: 1 }
}
