const API_PREFIX = '/api/v1'

function apiOrigin(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
}

/**
 * Resolve a composable-relative API path (`auth/me`) to a fetchable URL.
 *
 * Every path — auth session and data alike — goes **direct to the Laravel API
 * origin** (`VITE_API_BASE_URL`). The API sets the cross-site HttpOnly
 * `__Host-spa_jwt` cookie on its own origin, so the browser attaches it to all
 * direct calls via `credentials: 'include'`. The Cloudflare Worker is no longer
 * in any request path; it only serves static assets.
 *
 * When `VITE_API_BASE_URL` is empty every path falls back to same-origin, which
 * keeps local `wrangler dev` working against a same-origin API.
 */
export function resolveApiUrl(uri: string): string {
  const path = uri.replace(/^\//, '')
  const origin = apiOrigin()

  if (origin === '') {
    return `${API_PREFIX}/${path}`
  }
  return `${origin}/${path}`
}

/**
 * True when `resolveApiUrl` produced a cross-origin URL. Such requests need
 * `credentials: 'include'` so the browser attaches the cross-site auth cookie,
 * plus the double-submit CSRF header on mutations.
 */
export function isCrossOrigin(url: string | URL): boolean {
  if (typeof window === 'undefined') return false
  try {
    const u = url instanceof URL ? url : new URL(url, window.location.origin)
    return u.origin !== window.location.origin
  } catch {
    return false
  }
}

export function apiUrl(uri: string, query?: Record<string, unknown> | null): URL {
  const url = new URL(resolveApiUrl(uri), window.location.origin)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url
}
