const FALLBACK = '/apps/dashboard'

/**
 * Internal SPA path only. Reject protocol-relative, absolute URLs, and
 * anything that is not a same-app path — used for login/register `redirect`.
 */
export function safeInternalRedirect(raw: unknown, fallback: string = FALLBACK): string {
  if (typeof raw !== 'string') {
    return fallback
  }

  const value = raw.trim()
  if (value === '' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback
  }

  const lower = value.toLowerCase()
  if (lower.startsWith('/http:') || lower.startsWith('/https:') || value.includes('://')) {
    return fallback
  }

  return value
}
