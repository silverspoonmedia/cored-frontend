import i18n from '@/i18n'
import { apiUrl, isCrossOrigin } from './baseUrl'
import { applyCsrfHeader, ensureCsrf, refreshCsrfOnce, whenCsrfCookieQuiet } from './csrf'
import { applySpaRequestHeader } from './requestHeaders'
import { translateFallback } from '@/i18n/fallbacks'
import { ApiError, type ApiResponse, type ValidationErrors } from './types'

// Mirrors BatchController::MAX_REQUESTS. Keep in sync with the server cap.
const MAX_BATCH_REQUESTS = 10

type RefreshHandler = () => Promise<boolean>
type UnauthorizedHandler = () => void

let refreshHandler: RefreshHandler | null = null
let unauthorizedHandler: UnauthorizedHandler | null = null
let refreshPromise: Promise<boolean> | null = null

/** Window after login/register/refresh where a 401/TypeError is cookie-settle, not expiry. */
const SESSION_SETTLE_MS = 5_000
let sessionIssuedAt = 0

/** Backoff between settle retries (401 or browser TypeError / "CORS" Failed to fetch). */
export const SESSION_SETTLE_BACKOFF_MS = [50, 150, 400] as const

export function setRefreshHandler(handler: RefreshHandler): void {
  refreshHandler = handler
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler
}

/** Call from applyAuth after a new JWT cookie is minted (login/register/2FA/refresh). */
export function markSessionIssued(): void {
  sessionIssuedAt = Date.now()
}

export function clearSessionIssued(): void {
  sessionIssuedAt = 0
}

export function isSessionSettling(): boolean {
  return sessionIssuedAt > 0 && Date.now() - sessionIssuedAt < SESSION_SETTLE_MS
}

export function settleBackoff(attempt: number): Promise<void> {
  const capped = Math.min(Math.max(attempt, 0), SESSION_SETTLE_BACKOFF_MS.length - 1)
  return sleep(SESSION_SETTLE_BACKOFF_MS[capped] ?? 400)
}

function buildHeaders(hasBody: boolean, isFormData: boolean, crossOrigin: boolean, mutating: boolean): Headers {
  const headers = new Headers()
  headers.set('Accept', 'application/json')
  headers.set('X-Requested-With', 'XMLHttpRequest')
  applySpaRequestHeader(headers)

  if (hasBody && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  // Cross-origin cookie auth: send the double-submit CSRF token on mutations.
  if (crossOrigin && mutating) {
    applyCsrfHeader(headers)
  }

  return headers
}

function isMutating(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
}

function credentialsFor(crossOrigin: boolean): RequestCredentials {
  // Same-origin local development uses same-origin credentials. Direct API calls
  // use include so the browser attaches the cross-site HttpOnly auth cookie.
  return crossOrigin ? 'include' : 'same-origin'
}

function isValidationBody(json: unknown): json is { message: string; errors: ValidationErrors } {
  return (
    typeof json === 'object' &&
    json !== null &&
    'errors' in json &&
    typeof (json as Record<string, unknown>).errors === 'object'
  )
}

function isEnvelope(json: unknown): json is ApiResponse {
  return (
    typeof json === 'object' &&
    json !== null &&
    'status' in json &&
    'message' in json
  )
}

function extractMessage(json: unknown, fallback: string): string {
  if (
    typeof json === 'object' &&
    json !== null &&
    'message' in json &&
    typeof (json as Record<string, unknown>).message === 'string'
  ) {
    return (json as Record<string, unknown>).message as string
  }
  return fallback
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function throwForStatus(res: Response, json: unknown): never {
  if (isValidationBody(json)) {
    const body = json as { message: string; errors: ValidationErrors }
    throw new ApiError(body.message || translateFallback(i18n.global.t, 'validationFailed'), res.status, body.errors)
  }

  if (isEnvelope(json)) {
    const env = json as ApiResponse
    throw new ApiError(env.message ?? translateFallback(i18n.global.t, 'requestFailed'), res.status)
  }

  throw new ApiError(
    extractMessage(json, translateFallback(i18n.global.t, 'requestFailed')),
    res.status,
  )
}

function ensureRefresh(): Promise<boolean> {
  if (!refreshHandler) {
    return Promise.resolve(false)
  }
  if (!refreshPromise) {
    refreshPromise = refreshHandler().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

function requestPath(uri: string): string {
  return uri.split('?')[0] ?? uri
}

function skipAuthRefresh(uri: string): boolean {
  // auth/me 401 means no session cookie, not an expired JWT. Guest cold-boot
  // and post-login settle must not POST /auth/refresh (that 401s without a
  // cookie and used to clearAuth the session that login just created).
  // navigation/menus is jwt.optional (guest 200); a 401 there is not expiry.
  const path = requestPath(uri)
  return path === 'auth/refresh' || path === 'auth/logout' || path === 'auth/me' || path === 'navigation/menus'
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false
  const msg = error.message.toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed')
  )
}

async function fetchUntilSettled(doFetch: () => Promise<Response>): Promise<Response> {
  let attempt = 0
  while (true) {
    await whenCsrfCookieQuiet()
    try {
      return await doFetch()
    } catch (error) {
      if (!isTransientNetworkError(error) || !isSessionSettling()) {
        throw error
      }
      await settleBackoff(attempt++)
      if (!isSessionSettling()) {
        throw error
      }
    }
  }
}

async function retry401WhileSettling(
  doFetch: () => Promise<Response>,
  first: Response,
): Promise<Response> {
  let response = first
  let attempt = 0
  while (response.status === 401) {
    await settleBackoff(attempt++)
    response = await fetchUntilSettled(doFetch)
    if (response.ok || response.status !== 401 || !isSessionSettling()) {
      return response
    }
  }
  return response
}

// Auth-session endpoints are CSRF-skipped server-side (a guest has no nonce
// yet). A 419 there means something else is wrong, so do not burn the single
// retry re-fetching a nonce that would not help.
function isAuthSessionPath(uri: string): boolean {
  const path = requestPath(uri)
  return (
    path === 'auth/login' ||
    path === 'auth/register' ||
    path === 'auth/refresh' ||
    path === 'auth/logout' ||
    path === 'auth/forgot-password' ||
    path === 'auth/reset-password' ||
    path === 'auth/two-factor/login'
  )
}

async function request<T>(
  method: string,
  uri: string,
  body: Record<string, unknown> | FormData | null = null,
  query: Record<string, unknown> | null = null,
): Promise<T> {
  const url = apiUrl(uri, query)
  const crossOrigin = isCrossOrigin(url)
  const mutating = isMutating(method)

  // Cross-origin mutations need the double-submit CSRF nonce before they run.
  // Auth-session paths skip it server-side (no session to ride yet); fetching
  // a nonce here would mint __Host-spa_csrf before login and race the first
  // authenticated POST /batch against a second cookie.
  if (crossOrigin && mutating && !isAuthSessionPath(uri)) {
    await ensureCsrf()
  }

  const isFormData = body instanceof FormData
  const bodyStr = body === null ? undefined : isFormData ? body : JSON.stringify(body)

  const doFetch = (): Promise<Response> =>
    fetch(url.toString(), {
      method,
      headers: buildHeaders(body !== null, isFormData, crossOrigin, mutating),
      body: bodyStr,
      credentials: credentialsFor(crossOrigin),
    })

  let response = await fetchUntilSettled(doFetch)

  // Stale/rotated CSRF nonce: refresh once and retry before treating as an error.
  // Single-flighted: N concurrent 419s share one nonce mint (see csrf.ts) so the
  // retries do not invalidate each other's header-vs-cookie pair.
  if (response.status === 419 && crossOrigin && mutating && !isAuthSessionPath(uri)) {
    await refreshCsrfOnce()
    response = await fetchUntilSettled(doFetch)
  }

  if (response.ok) {
    return (await readJson(response)) as T
  }

  if (response.status === 401 && !skipAuthRefresh(uri)) {
    // Brand-new session: the JWT Set-Cookie may not be in the jar yet.
    // Retry the original request with backoff until the settle window ends;
    // do not POST /auth/refresh (no cookie → 401, and a successful refresh
    // would blacklist the login token).
    if (isSessionSettling()) {
      response = await retry401WhileSettling(doFetch, response)
      if (response.ok) {
        return (await readJson(response)) as T
      }
    }

    if (response.status === 401 && refreshHandler) {
      const refreshed = await ensureRefresh()
      if (refreshed) {
        const retryRes = await fetchUntilSettled(doFetch)
        if (retryRes.ok) {
          return (await readJson(retryRes)) as T
        }
        throwForStatus(retryRes, await readJson(retryRes))
      } else {
        unauthorizedHandler?.()
        throw new ApiError(translateFallback(i18n.global.t, 'sessionExpired'), 401)
      }
    }
  }

  throwForStatus(response, await readJson(response))
}

export function get<T>(uri: string, query?: Record<string, unknown>): Promise<T> {
  return request<T>('GET', uri, null, query ?? null)
}

export function post<T>(uri: string, data?: Record<string, unknown> | FormData): Promise<T> {
  return request<T>('POST', uri, data ?? null)
}

export function put<T>(uri: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>('PUT', uri, data ?? null)
}

export function patch<T>(uri: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>('PATCH', uri, data ?? null)
}

export function del<T>(uri: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>('DELETE', uri, data ?? null)
}

export interface BatchSubRequest {
  method?: 'GET' | 'HEAD'
  path: string
  query?: Record<string, unknown>
}

export interface BatchSubResponse<T = unknown> {
  status: number
  body: T
}

/**
 * Fan several read-only calls into one HTTP request so one API request can
 * hydrate several independent widgets. Each entry keeps its own API envelope
 * inside `body`; `status` mirrors what the direct call would have returned.
 * Paths are API-relative (`auth/me`), matching the other helpers.
 */
export async function batch<T = unknown>(
  requests: ReadonlyArray<BatchSubRequest>,
): Promise<Array<BatchSubResponse<T>>> {
  // Server cap is 10 per call (BatchController::MAX_REQUESTS). A larger fan-out
  // (e.g. hydrateCredentials' 1 + N platforms) is split into sequential chunks
  // and the positional results re-joined, so every entry is honored instead of
  // silently dropped.
  if (requests.length === 0) return []

  const chunks: Array<ReadonlyArray<BatchSubRequest>> = []
  for (let i = 0; i < requests.length; i += MAX_BATCH_REQUESTS) {
    chunks.push(requests.slice(i, i + MAX_BATCH_REQUESTS))
  }

  const out: Array<BatchSubResponse<T>> = []
  for (const chunk of chunks) {
    const payload = chunk.map((entry) => {
      const url = apiUrl(entry.path, entry.query ?? null)
      const path = `${url.pathname}${url.search}`
      return { method: entry.method ?? 'GET', path }
    })

    const res = await post<ApiResponse<Array<BatchSubResponse<T>>>>('batch', { requests: payload })
    out.push(...(res.data ?? []))
  }

  return out
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null
  const utf = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf?.[1]) return decodeURIComponent(utf[1])
  const ascii = header.match(/filename="?([^";]+)"?/i)
  return ascii?.[1] ?? null
}

/** GET a non-JSON payload (CSV export, file download). Same cookie session + settle/401 as `get()`. */
export async function getBlob(
  uri: string,
  query?: Record<string, unknown>,
): Promise<{ blob: Blob; filename: string | null }> {
  const url = apiUrl(uri, query)
  const crossOrigin = isCrossOrigin(url)

  const headers = (): Headers => {
    const h = new Headers()
    h.set('Accept', '*/*')
    h.set('X-Requested-With', 'XMLHttpRequest')
    applySpaRequestHeader(h)
    return h
  }

  const doFetch = (): Promise<Response> =>
    fetch(url.toString(), { method: 'GET', headers: headers(), credentials: credentialsFor(crossOrigin) })

  let response = await fetchUntilSettled(doFetch)

  if (response.status === 401 && !skipAuthRefresh(uri)) {
    if (isSessionSettling()) {
      response = await retry401WhileSettling(doFetch, response)
    }
    if (response.status === 401 && refreshHandler) {
      const refreshed = await ensureRefresh()
      if (refreshed) {
        response = await fetchUntilSettled(doFetch)
      } else {
        unauthorizedHandler?.()
        throw new ApiError(translateFallback(i18n.global.t, 'sessionExpired'), 401)
      }
    }
  }

  if (!response.ok) {
    throwForStatus(response, await readJson(response))
  }

  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get('Content-Disposition')),
  }
}
