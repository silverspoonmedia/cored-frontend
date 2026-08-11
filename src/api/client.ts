import { ApiError, type ApiResponse, type ValidationErrors } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL

type TokenGetter = () => string | null
type RefreshHandler = () => Promise<string | null>
type UnauthorizedHandler = () => void

let tokenGetter: TokenGetter | null = null
let refreshHandler: RefreshHandler | null = null
let unauthorizedHandler: UnauthorizedHandler | null = null
let refreshPromise: Promise<string | null> | null = null

export function setTokenGetter(getter: TokenGetter): void {
  tokenGetter = getter
}

export function setRefreshHandler(handler: RefreshHandler): void {
  refreshHandler = handler
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler
}

function buildHeaders(hasBody: boolean, isFormData: boolean): Headers {
  const headers = new Headers()
  headers.set('Accept', 'application/json')

  if (hasBody && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  const token = tokenGetter?.()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
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

function ensureRefresh(): Promise<string | null> {
  if (!refreshHandler) {
    return Promise.resolve(null)
  }
  if (!refreshPromise) {
    refreshPromise = refreshHandler().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function request<T>(
  method: string,
  uri: string,
  body: Record<string, unknown> | FormData | null = null,
  query: Record<string, unknown> | null = null,
): Promise<T> {
  const url = new URL(`${BASE_URL}/${uri.replace(/^\//, '')}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const isFormData = body instanceof FormData
  const bodyStr = body === null ? undefined : isFormData ? body : JSON.stringify(body)

  const doFetch = (): Promise<Response> =>
    fetch(url.toString(), {
      method,
      headers: buildHeaders(body !== null, isFormData),
      body: bodyStr,
    })

  const response = await doFetch()
  const json = await readJson(response)

  if (response.ok) {
    return json as T
  }

  // 401: try one refresh + retry, then bail to unauthorized handler.
  if (response.status === 401 && refreshHandler) {
    const newToken = await ensureRefresh()
    if (newToken) {
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
