/**
 * Single retry policy for the browser's transient `TypeError` fetch failures.
 *
 * Chromium reports a cross-tab `Set-Cookie` collision on the shared
 * `__Host-spa_csrf` cookie as `TypeError: Failed to fetch` — indistinguishable
 * from a CORS error, which is how it reaches the user. `whenCsrfCookieQuiet()`
 * only covers nonce fetches *this* tab started; a peer tab rotating the same
 * cookie aborts our in-flight request at an arbitrary moment, so the only
 * recovery is to retry once the write has settled.
 *
 * This module is the one copy of that policy. It must not import `./csrf`
 * (that module consumes it) — callers inject their own pre-attempt hook, e.g.
 * `beforeAttempt: whenCsrfCookieQuiet`.
 */

/**
 * Backoff between attempts. Length is also the retry budget: one initial try
 * plus one per entry, so the worst case is ~1.4 s of waiting.
 */
export const COOKIE_RACE_BACKOFF_MS = [50, 150, 400, 800] as const

/** Browsers report every network-layer abort as a `TypeError` with one of these messages. */
export function isTransientFetchError(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false
  const msg = error.message.toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed')
  )
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface CookieRaceRetryOptions {
  /**
   * Runs before every attempt, including the first — e.g. the CSRF
   * cookie-write gate. Must not await the caller's own in-flight work.
   */
  beforeAttempt?: () => Promise<void>
  /**
   * Extra gate on the caught error. `isTransientFetchError` has already been
   * checked, so this carries the caller's method/URI-specific policy.
   */
  retryable?: (error: unknown) => boolean
}

/**
 * Run `run`, retrying transient fetch failures with bounded backoff.
 *
 * A non-transient error, or one rejected by `retryable`, throws immediately so
 * callers keep their existing error semantics.
 */
export async function withCookieRaceRetry<T>(
  run: () => Promise<T>,
  { beforeAttempt, retryable }: CookieRaceRetryOptions = {},
): Promise<T> {
  let attempt = 0
  while (true) {
    // Guarded (not `await beforeAttempt?.()`) so a caller without a gate still
    // invokes `run` in the same tick — the previous inline loops did.
    if (beforeAttempt) {
      await beforeAttempt()
    }
    try {
      return await run()
    } catch (error) {
      if (!isTransientFetchError(error)) throw error
      if (retryable && !retryable(error)) throw error
      if (attempt >= COOKIE_RACE_BACKOFF_MS.length) throw error
      await sleep(COOKIE_RACE_BACKOFF_MS[attempt] ?? 800)
      attempt++
    }
  }
}
