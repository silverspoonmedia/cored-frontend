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

/**
 * Thrown when a batch sub-entry came back with a terminal status (401/403/429):
 * the request was rejected by auth/RBAC/throttle, so re-firing it standalone
 * would just repeat the same rejection (and a 401 would trip the global
 * force-logout). Callers must NOT fall back to the standalone loader for these.
 */
export class TerminalBatchError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Batch entry rejected with terminal status ${status}`)
    this.name = 'TerminalBatchError'
    this.status = status
  }
}

const TERMINAL_STATUSES = new Set([401, 403, 429])

export function isTerminalEntry(entry: BatchEntry | undefined): boolean {
  return entry !== undefined && TERMINAL_STATUSES.has(entry.status)
}

/**
 * Like {@link bodyOf} but throws {@link TerminalBatchError} on 401/403/429 so a
 * hydrate caller can distinguish "transient failure — fall back to standalone"
 * from "terminal rejection — do not retry".
 */
export function bodyOfOrThrow<T>(entry: BatchEntry | undefined): ApiResponse<T> | null {
  if (isTerminalEntry(entry)) {
    throw new TerminalBatchError((entry as BatchEntry).status)
  }
  return bodyOf<T>(entry)
}

export function isTerminalBatchError(e: unknown): e is TerminalBatchError {
  return e instanceof TerminalBatchError
}
