import type { ApiResponse } from '@/api/types'

interface BatchEntry {
  status: number
  body: unknown
}

/**
 * Unwrap a batch sub-response into its API envelope only when it is a 200 success.
 *
 * Returns null for any non-200 status, missing body, or non-success envelope so
 * callers can distinguish "batch call succeeded but this entry failed" from
 * "batch call itself failed" without extra branching.
 */
export function bodyOf<T>(entry: BatchEntry | undefined): ApiResponse<T> | null {
  if (!entry || entry.status !== 200) return null
  const body = entry.body as ApiResponse<T> | null
  if (!body || body.status !== 'success') return null
  return body
}

/**
 * Unwrap the `data` key from a batch entry's API envelope, or null if the
 * entry is not a 200 success.
 */
export function dataOf<T>(entry: BatchEntry | undefined): T | null {
  return bodyOf<T>(entry)?.data ?? null
}
