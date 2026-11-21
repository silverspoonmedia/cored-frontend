import { get } from '@/api/client'
import type { ApiResponse } from '@/api/types'
import type { Select2Result } from '@/utils/select2-lookup'

export type LookupResult = Select2Result

interface LookupPayload {
  results: LookupResult[]
  pagination: { more: boolean }
}

/**
 * Pre-hydrate Select2 selected options for AJAX-backed menu fields.
 *
 * Mirrors Monolith's LookupService hydrate* methods — pass `ids[]` to fetch
 * `{id, text}` for already-selected values so they render without a search.
 */
export function useLookups() {
  async function fetchUsers(ids: string[]): Promise<LookupResult[]> {
    if (ids.length === 0) return []
    const res = await get<ApiResponse<LookupPayload>>('lookups/users', { 'ids[]': ids })
    return res.data?.results ?? []
  }

  async function fetchMenus(
    ids: string[],
    layout: string,
    exclude?: string,
  ): Promise<LookupResult[]> {
    if (ids.length === 0) return []
    const params: Record<string, unknown> = { 'ids[]': ids, layout }
    if (exclude) params.exclude = exclude
    const res = await get<ApiResponse<LookupPayload>>('navigation/lookups/menus', params)
    return res.data?.results ?? []
  }

  async function fetchRoles(ids: string[]): Promise<LookupResult[]> {
    if (ids.length === 0) return []
    const res = await get<ApiResponse<LookupPayload>>('lookups/roles', { 'ids[]': ids })
    return res.data?.results ?? []
  }

  return { fetchUsers, fetchMenus, fetchRoles }
}
