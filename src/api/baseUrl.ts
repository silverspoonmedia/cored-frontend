const API_PREFIX = '/api/v1'

/**
 * Force the configured base onto the API root.
 *
 * `resolveApiUrl()` appends API-relative paths (`broadcasting/auth`) straight
 * to this origin, so a base without the `/api/v1` prefix silently points them
 * at the **web** surface — where Laravel registers a second, CSRF-guarded
 * `POST /broadcasting/auth` that answers 403 with no CORS headers, surfacing
 * as an opaque browser CORS error. Normalizing here keeps every caller on the
 * versioned API regardless of how the env var was written.
 */
function normalizeApiPath(pathname: string): { path: string; adjusted: boolean } {
  const path = pathname.replace(/\/+$/, '')

  if (path === '' || path === '/') {
    return { path: API_PREFIX, adjusted: true }
  }
  if (path.endsWith(API_PREFIX)) {
    return { path, adjusted: false }
  }
  if (path.endsWith('/api')) {
    return { path: `${path}${API_PREFIX.slice('/api'.length)}`, adjusted: true }
  }

  return { path: `${path}${API_PREFIX}`, adjusted: true }
}

function apiOrigin(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
  if (raw === '') return ''

  try {
    const url = new URL(raw)
    if (
      (import.meta.env.DEV ? !['http:', 'https:'].includes(url.protocol) : url.protocol !== 'https:')
      || url.username
      || url.password
      || url.search
      || url.hash
    ) {
      return ''
    }

    const { path, adjusted } = normalizeApiPath(url.pathname)
    if (adjusted && import.meta.env.DEV) {
      console.warn(
        `[api] VITE_API_BASE_URL must end with ${API_PREFIX}; using ${url.origin}${path} instead of ${raw}`,
      )
    }
    url.pathname = path

    return url.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
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
      if (value === undefined || value === null) continue
      // Array values become repeated params (`ids[]=a&ids[]=b`), matching the
      // Laravel `ids[]` contract. `searchParams.set` would stringify the array
      // into one comma-joined value, which `ids.* => uuid` validation rejects.
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null) {
            url.searchParams.append(key, String(item))
          }
        }
        continue
      }
      url.searchParams.set(key, String(value))
    }
  }
  return url
}
