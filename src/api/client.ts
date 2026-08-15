import { apiUrl } from './baseUrl'
import { ApiError, type ApiResponse, type ValidationErrors } from './types'

type RefreshHandler = () => Promise<boolean>
type UnauthorizedHandler = () => void

let refreshHandler: RefreshHandler | null = null
let unauthorizedHandler: UnauthorizedHandler | null = null
let refreshPromise: Promise<boolean> | null = null

export function setRefreshHandler(handler: RefreshHandler): void {
  refreshHandler = handler
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler
}

function buildHeaders(hasBody: boolean, isFormData: boolean): Headers {
  const headers = new Headers()
  headers.set('Accept', 'application/json')
  headers.set('X-Requested-With', 'XMLHttpRequest')

  if (hasBody && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  return headers
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
    throw new ApiError(body.message || 'Validation failed', res.status, body.errors)
  }

  if (isEnvelope(json)) {
    const env = json as ApiResponse
    throw new ApiError(env.message ?? 'Request failed', res.status)
  }

  throw new ApiError(extractMessage(json, `HTTP ${res.status}`), res.status)
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

function skipAuthRefresh(uri: string): boolean {
  return uri === 'auth/refresh' || uri === 'auth/logout'
}

async function request<T>(
  method: string,
  uri: string,
  body: Record<string, unknown> | FormData | null = null,
  query: Record<string, unknown> | null = null,
): Promise<T> {
  const url = apiUrl(uri, query)

  const isFormData = body instanceof FormData
  const bodyStr = body === null ? undefined : isFormData ? body : JSON.stringify(body)

  const doFetch = (): Promise<Response> =>
    fetch(url.toString(), {
      method,
      headers: buildHeaders(body !== null, isFormData),
      body: bodyStr,
      credentials: 'same-origin',
    })

  const response = await doFetch()
  const json = await readJson(response)

  if (response.ok) {
    return json as T
  }

  if (response.status === 401 && refreshHandler && !skipAuthRefresh(uri)) {
    const refreshed = await ensureRefresh()
    if (refreshed) {
      const retryRes = await doFetch()
      const retryJson = await readJson(retryRes)
      if (retryRes.ok) {
        return retryJson as T
      }
      throwForStatus(retryRes, retryJson)
    } else {
      unauthorizedHandler?.()
      throw new ApiError('Session expired', 401)
    }
  }

  throwForStatus(response, json)
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
 * Fan several read-only calls into one HTTP request so the Worker BFF spends
 * a single invocation per view hydrate. Each entry keeps its own API envelope
 * inside `body`; `status` mirrors what the direct call would have returned.
 * Paths are API-relative (`auth/me`), matching the other helpers.
 */
export async function batch<T = unknown>(
  requests: ReadonlyArray<BatchSubRequest>,
): Promise<Array<BatchSubResponse<T>>> {
  const payload = requests.map((entry) => {
    const url = apiUrl(entry.path, entry.query ?? null)
    const path = `${url.pathname}${url.search}`
    return { method: entry.method ?? 'GET', path }
  })

  const res = await post<ApiResponse<Array<BatchSubResponse<T>>>>('batch', { requests: payload })
  return res.data ?? []
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null
  const utf = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf?.[1]) return decodeURIComponent(utf[1])
  const ascii = header.match(/filename="?([^";]+)"?/i)
  return ascii?.[1] ?? null
}

/** GET a non-JSON payload (CSV export, file download). Same cookie session + 401 refresh as `get()`. */
export async function getBlob(
  uri: string,
  query?: Record<string, unknown>,
): Promise<{ blob: Blob; filename: string | null }> {
  const url = apiUrl(uri, query)

  const headers = (): Headers => {
    const h = new Headers()
    h.set('Accept', '*/*')
    h.set('X-Requested-With', 'XMLHttpRequest')
    return h
  }

  const doFetch = (): Promise<Response> =>
    fetch(url.toString(), { method: 'GET', headers: headers(), credentials: 'same-origin' })

  let response = await doFetch()

  if (response.status === 401 && refreshHandler) {
    const refreshed = await ensureRefresh()
    if (refreshed) {
      response = await doFetch()
    } else {
      unauthorizedHandler?.()
      throw new ApiError('Session expired', 401)
    }
  }

  if (!response.ok) {
    const json = await readJson(response)
    throwForStatus(response, json)
  }

  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get('Content-Disposition')),
  }
}
