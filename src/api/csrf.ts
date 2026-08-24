import { apiUrl } from './baseUrl'
import { applySpaRequestHeader } from './requestHeaders'

/**
 * Double-submit CSRF token for the SPA's cross-site cookie auth.
 *
 * Laravel mints a nonce at `GET /api/v1/csrf`, returns it in the JSON body
 * (`data.token`) AND sets it on the non-HttpOnly `spa_csrf` cookie
 * (SameSite=None; Secure). The SPA echoes the value back in the `X-CSRF-Token`
 * header on every cross-origin mutation; `VerifySpaCsrf` accepts only when the
 * header matches the cookie.
 *
 * The token is kept in module memory, sourced from the response body — never
 * from `document.cookie`. Reading the cookie is unreliable here: a stale value
 * from an older session can linger, the browser commits Set-Cookie
 * asynchronously, and duplicate host/path entries can race. The response body
 * is always the authoritative plaintext nonce, and re-fetching it overwrites a
 * stale cookie with a fresh one as a side effect.
 *
 * The token is session-scoped and carries no privilege, so holding it in memory
 * is equivalent (in security terms) to the readable cookie by design.
 *
 * Multi-tab: the cookie is shared per origin but each tab keeps its own
 * in-memory copy. A tab that fetches a fresh nonce rotates the shared cookie,
 * which would strand every other tab on its stale in-memory value (their next
 * mutation sends header=old vs cookie=new and gets a 419). To keep all tabs on
 * one nonce, whichever tab fetches broadcasts it on the `monolith-csrf`
 * BroadcastChannel; every other tab adopts it. Same pattern as `authChannel`
 * in `stores/auth.ts`.
 */

const CSRF_HEADER = 'X-CSRF-Token'

type CsrfChannelMessage = { type: 'csrf'; token: string } | { type: 'csrf-clear' }

let token: string | null = null
let pendingFetch: Promise<void> | null = null

const csrfChannel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('monolith-csrf') : null

function broadcastNonce(value: string): void {
  try {
    csrfChannel?.postMessage({ type: 'csrf', token: value } satisfies CsrfChannelMessage)
  } catch {
    // Broadcast is best-effort; a tab without a channel just keeps its own copy.
  }
}

if (csrfChannel) {
  csrfChannel.onmessage = (e: MessageEvent) => {
    const data = e.data as CsrfChannelMessage | undefined
    if (!data) return
    if (data.type === 'csrf-clear') {
      // Another tab logged out: drop our copy so we stop sending a dead nonce.
      token = null
      return
    }
    if (data.type !== 'csrf') return
    if (typeof data.token !== 'string' || data.token === '') return

    // Adopt the nonce another tab just fetched: it matches the shared cookie.
    token = data.token
  }
}

/**
 * Drop the in-memory nonce and tell other tabs to drop theirs. Called on
 * logout: the session nonce is dead, and keeping it would send a stale header
 * on the next pre-login mutation (e.g. a fresh login attempt).
 */
export function clearCsrf(): void {
  token = null
  try {
    csrfChannel?.postMessage({ type: 'csrf-clear' } satisfies CsrfChannelMessage)
  } catch {
    // best-effort
  }
}

/** Current CSRF token, if one has been fetched this page load. */
export function csrfToken(): string | null {
  return token
}

async function fetchNonce(): Promise<void> {
  try {
    const headers = new Headers({ Accept: 'application/json' })
    applySpaRequestHeader(headers)
    const res = await fetch(apiUrl('csrf').toString(), {
      method: 'GET',
      credentials: 'include',
      headers,
    })
    const json = (await res.json().catch(() => null)) as { data?: { token?: unknown } } | null
    const t = json?.data?.token
    if (typeof t === 'string' && t !== '') {
      token = t
      broadcastNonce(t)
    }
  } catch {
    // A failed CSRF fetch surfaces later as a 419 on the real mutation; the
    // client retries that path via refreshCsrf().
  }
}

/**
 * Ensure a CSRF nonce exists, fetching one from the API when missing. Safe to
 * call concurrently — the network fetch is single-flighted.
 */
export async function ensureCsrf(): Promise<void> {
  if (token !== null) return
  if (pendingFetch) return pendingFetch

  pendingFetch = fetchNonce().finally(() => {
    pendingFetch = null
  })

  return pendingFetch
}

/**
 * Force a fresh nonce after a 419 (token rotated / session replaced).
 *
 * Waits for any in-flight fetch to settle first so its Set-Cookie is committed,
 * then clears and fetches exactly one new nonce. Starting a second fetch while
 * one is already running would let two different nonces race — the in-memory
 * token and the cookie could come from different responses and never match.
 */
export async function refreshCsrf(): Promise<void> {
  if (pendingFetch) {
    await pendingFetch.catch(() => undefined)
  }

  token = null
  pendingFetch = fetchNonce().finally(() => {
    pendingFetch = null
  })

  return pendingFetch
}

/** Attach the CSRF header to a cross-origin mutation request. */
export function applyCsrfHeader(headers: Headers): void {
  if (token !== null && token !== '') {
    headers.set(CSRF_HEADER, token)
  }
}
