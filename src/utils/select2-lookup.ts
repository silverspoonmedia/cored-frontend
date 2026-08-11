/**
 * Unwrap Monolith API envelope `{ data: { results, pagination } }` for Select2.
 *
 * Port of resources/js/select2-lookup.js — used by FormSelect2 processResults.
 */
export interface Select2Result {
  id: string | number
  text: string
}

export interface Select2Paginated {
  results: Select2Result[]
  pagination: { more: boolean }
}

export function processLookupResults(data: unknown): Select2Paginated {
  const payload =
    data && typeof data === 'object' && 'data' in data && data.data != null
      ? (data as Record<string, unknown>).data
      : data
  const source = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}

  return {
    results: Array.isArray(source.results) ? (source.results as Select2Result[]) : [],
    pagination:
      source.pagination && typeof source.pagination === 'object'
        ? { more: Boolean((source.pagination as Record<string, unknown>).more) }
        : { more: false },
  }
}
