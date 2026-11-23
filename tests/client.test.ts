import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Cross-origin fetch wrapper: auth-session POSTs must not mint CSRF, and a
 * 419 on POST /batch must refresh the nonce and retry once.
 */

// This suite exercises the real client, so it defeats any mock a sibling suite
// registered. Vitest hoists both calls above the module under test's imports.
vi.unmock('@/api/client')
vi.mock('@/stores/auth', () => ({
  useAuth: () => ({ user: { value: null } }),
}))

type ClientModule = typeof import('../src/api/client')

interface FakeChannel {
  postMessage: ReturnType<typeof vi.fn>
  onmessage: ((e: MessageEvent) => void) | null
  close: ReturnType<typeof vi.fn>
  name: string
}

let channels: FakeChannel[]

function fakeBroadcastChannel() {
  return class {
    name: string
    postMessage = vi.fn()
    onmessage: ((e: MessageEvent) => void) | null = null
    close = vi.fn()

    constructor(name: string) {
      this.name = name
      channels.push(this as unknown as FakeChannel)
    }
  }
}

const ORIGINAL_ENV = { ...import.meta.env }

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function importClient(): Promise<ClientModule> {
  return import('../src/api/client')
}

beforeEach(() => {
  channels = []
  vi.resetModules()
  // The client now reaches the realtime registry, and a view inside that chain
  // imports the router shell; give it a history even in the node environment.
  vi.stubGlobal('history', { state: null, replaceState: () => {}, pushState: () => {} })
  vi.stubGlobal('BroadcastChannel', fakeBroadcastChannel())
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } })
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined })
  vi.stubGlobal('navigator', { language: 'en' })
  ;(import.meta.env as Record<string, unknown>).VITE_API_BASE_URL = 'https://api.example.com/api/v1'
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  for (const key of Object.keys(import.meta.env)) {
    delete (import.meta.env as Record<string, unknown>)[key]
  }
  Object.assign(import.meta.env, ORIGINAL_ENV)
})

describe('client CSRF sequencing', () => {
  it('does not fetch a CSRF nonce before an auth-session POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { status: 'success', message: 'ok' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = await importClient()
    await client.post('auth/login', { email: 'a@b.c', password: 'secret' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/auth/login')
    expect(url).not.toContain('/csrf')
  })

  it('refreshes CSRF and retries POST /batch after a 419', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/csrf')) {
        return Promise.resolve(jsonResponse(200, { status: 'success', data: { token: 'nonce-retry' } }))
      }
      if (url.includes('/batch')) {
        if (fetchMock.mock.calls.filter((c) => String(c[0]).includes('/batch')).length === 1) {
          return Promise.resolve(jsonResponse(419, { status: 'error', message: 'CSRF token mismatch.' }))
        }
        return Promise.resolve(jsonResponse(200, { status: 'success', message: 'ok', data: [] }))
      }
      return Promise.resolve(jsonResponse(500, { status: 'error', message: 'unexpected' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = await importClient()
    const out = await client.batch([{ path: 'auth/me' }])

    expect(out).toEqual([])
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.filter((u) => u.includes('/csrf')).length).toBeGreaterThanOrEqual(2)
    expect(urls.filter((u) => u.includes('/batch')).length).toBe(2)
  })

  it('refreshes CSRF and retries POST /broadcasting/auth after a 419', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/csrf')) {
        return Promise.resolve(jsonResponse(200, { status: 'success', data: { token: 'nonce-echo' } }))
      }
      if (url.includes('/broadcasting/auth')) {
        if (fetchMock.mock.calls.filter((c) => String(c[0]).includes('/broadcasting/auth')).length === 1) {
          return Promise.resolve(jsonResponse(419, { status: 'error', message: 'CSRF token mismatch.' }))
        }
        return Promise.resolve(jsonResponse(200, { auth: 'app-key:signature' }))
      }
      return Promise.resolve(jsonResponse(500, { status: 'error', message: 'unexpected' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = await importClient()
    const out = await client.post<{ auth: string }>('broadcasting/auth', {
      socket_id: '1.1',
      channel_name: 'private-navigation.menus',
    })

    expect(out).toEqual({ auth: 'app-key:signature' })
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.filter((u) => u.includes('/csrf')).length).toBeGreaterThanOrEqual(2)
    expect(urls.filter((u) => u.includes('/broadcasting/auth')).length).toBe(2)
  })
})

describe('client 401 sequencing', () => {
  it('does not POST /auth/refresh when GET auth/me returns 401', async () => {
    const refresh = vi.fn().mockResolvedValue(false)
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(401, { status: 'error', message: 'Unauthenticated.' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = await importClient()
    client.setRefreshHandler(refresh)

    await expect(client.get('auth/me')).rejects.toMatchObject({ status: 401 })

    expect(refresh).not.toHaveBeenCalled()
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('/auth/refresh'))).toBe(false)
    expect(urls.filter((u) => u.includes('/auth/me')).length).toBe(1)
  })

  it('retries the original URI once after markSessionIssued without refreshing', async () => {
    const refresh = vi.fn().mockResolvedValue(false)
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/notifications')) {
        if (fetchMock.mock.calls.filter((c) => String(c[0]).includes('/notifications')).length === 1) {
          return Promise.resolve(jsonResponse(401, { status: 'error', message: 'Unauthenticated.' }))
        }
        return Promise.resolve(jsonResponse(200, { status: 'success', message: 'ok', data: [] }))
      }
      return Promise.resolve(jsonResponse(500, { status: 'error', message: 'unexpected' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = await importClient()
    client.setRefreshHandler(refresh)
    client.markSessionIssued()

    const out = await client.get<{ status: string; data: unknown[] }>('notifications')

    expect(out.data).toEqual([])
    expect(refresh).not.toHaveBeenCalled()
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('/auth/refresh'))).toBe(false)
    expect(urls.filter((u) => u.includes('/notifications')).length).toBe(2)
  })

  it('does not POST /auth/refresh when GET navigation/menus returns 401', async () => {
    const refresh = vi.fn().mockResolvedValue(false)
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(401, { status: 'error', message: 'Unauthenticated.' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = await importClient()
    client.setRefreshHandler(refresh)

    await expect(client.get('navigation/menus?layout=sidebar')).rejects.toMatchObject({ status: 401 })

    expect(refresh).not.toHaveBeenCalled()
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('/auth/refresh'))).toBe(false)
  })

  it('retries Failed to fetch during settle without refreshing', async () => {
    const refresh = vi.fn().mockResolvedValue(false)
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(200, { status: 'success', message: 'ok', data: [] }))
    vi.stubGlobal('fetch', fetchMock)

    const client = await importClient()
    client.setRefreshHandler(refresh)
    client.markSessionIssued()

    const out = await client.get<{ status: string; data: unknown[] }>('notifications')

    expect(out.data).toEqual([])
    expect(refresh).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries getBlob Failed to fetch during settle without refreshing', async () => {
    const refresh = vi.fn().mockResolvedValue(false)
    const blob = new Blob(['a,b'], { type: 'text/csv' })
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(blob, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const client = await importClient()
    client.setRefreshHandler(refresh)
    client.markSessionIssued()

    const out = await client.getBlob('invoices/export')

    expect(out.blob.size).toBe(blob.size)
    expect(refresh).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('client CSRF cookie-write gate', () => {
  it('waits for an in-flight CSRF nonce fetch before other credentialed requests', async () => {
    let resolveCsrf: ((r: Response) => void) | null = null
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/csrf')) {
        return new Promise<Response>((res) => {
          resolveCsrf = res
        })
      }
      if (url.includes('/notifications')) {
        return Promise.resolve(jsonResponse(200, { status: 'success', message: 'ok', data: [] }))
      }
      return Promise.resolve(jsonResponse(500, { status: 'error', message: 'unexpected' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const csrf = await import('../src/api/csrf')
    const client = await importClient()

    const csrfP = csrf.ensureCsrf()
    await Promise.resolve()
    const getP = client.get('notifications')
    await Promise.resolve()
    await Promise.resolve()

    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/notifications'))).toBe(false)

    resolveCsrf?.(jsonResponse(200, { status: 'success', data: { token: 'nonce-gate' } }))
    await csrfP
    await getP

    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    const csrfIdx = urls.findIndex((u) => u.includes('/csrf'))
    const notifIdx = urls.findIndex((u) => u.includes('/notifications'))
    expect(csrfIdx).toBeGreaterThanOrEqual(0)
    expect(notifIdx).toBeGreaterThan(csrfIdx)
  })
})

describe('client cookie-race retry policy', () => {
  it('retries a transient TypeError on POST /batch outside the settle window', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/csrf')) {
        return Promise.resolve(jsonResponse(200, { status: 'success', data: { token: 'nonce-batch' } }))
      }
      if (url.includes('/batch')) {
        if (fetchMock.mock.calls.filter((c) => String(c[0]).includes('/batch')).length === 1) {
          return Promise.reject(new TypeError('Failed to fetch'))
        }
        return Promise.resolve(jsonResponse(200, { status: 'success', message: 'ok', data: [] }))
      }
      return Promise.resolve(jsonResponse(500, { status: 'error', message: 'unexpected' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = await importClient()
    // No markSessionIssued(): the settle window is CLOSED. A cross-tab cookie
    // race must still recover — this is the regression that surfaced as a
    // random CORS error on an arbitrary endpoint.
    const out = await client.batch([{ path: 'auth/me' }])

    expect(out).toEqual([])
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.filter((u) => u.includes('/batch')).length).toBe(2)
  })

  it('retries a transient TypeError on a read-only GET outside the settle window', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(200, { status: 'success', message: 'ok', data: [] }))
    vi.stubGlobal('fetch', fetchMock)

    const client = await importClient()
    const out = await client.get<{ status: string; data: unknown[] }>('notifications')

    expect(out.data).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry a transient TypeError on a non-idempotent mutation outside the settle window', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/csrf')) {
        return Promise.resolve(jsonResponse(200, { status: 'success', data: { token: 'nonce-put' } }))
      }
      if (url.includes('/auth/password')) {
        return Promise.reject(new TypeError('Failed to fetch'))
      }
      return Promise.resolve(jsonResponse(500, { status: 'error', message: 'unexpected' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = await importClient()

    // A retried PUT could be applied twice (Chromium may already have sent the
    // aborted request), so the settle window stays the only gate for it.
    await expect(client.put('auth/password', { current_password: 'a', password: 'b' }))
      .rejects.toThrow('Failed to fetch')

    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.filter((u) => u.includes('/auth/password')).length).toBe(1)
  })

  it('refreshes CSRF a second time when a peer tab rotates the nonce again', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/csrf')) {
        return Promise.resolve(jsonResponse(200, { status: 'success', data: { token: `nonce-${Date.now()}` } }))
      }
      if (url.includes('/batch')) {
        const batchCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/batch')).length
        if (batchCalls <= 2) {
          return Promise.resolve(jsonResponse(419, { status: 'error', message: 'CSRF token mismatch.' }))
        }
        return Promise.resolve(jsonResponse(200, { status: 'success', message: 'ok', data: [] }))
      }
      return Promise.resolve(jsonResponse(500, { status: 'error', message: 'unexpected' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = await importClient()
    const out = await client.batch([{ path: 'auth/me' }])

    expect(out).toEqual([])
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    // ensureCsrf() once + one refresh per 419 round (two rounds).
    expect(urls.filter((u) => u.includes('/csrf')).length).toBe(3)
    expect(urls.filter((u) => u.includes('/batch')).length).toBe(3)
  })
})
