const API_PREFIX = '/api/v1'

/**
 * Resolve a composable-relative API path (`auth/me`) to a fetchable URL.
 * Empty `VITE_API_BASE_URL` → same-origin `/api/v1/...` (Worker hostname mask).
 * Set override to an absolute prefix (`https://host/api/v1`) to bypass the Worker.
 */
export function resolveApiUrl(uri: string): string {
  const path = uri.replace(/^\//, '')
  const override = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
  if (override !== '') {
    return `${override}/${path}`
  }
  return `${API_PREFIX}/${path}`
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
