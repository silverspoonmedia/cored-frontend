import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Multi-tab CSRF nonce sync. Each test re-imports the module fresh so the
 * module-level `token` / `pendingFetch` / channel state does not leak between
 * cases. A fake BroadcastChannel captures broadcasts and lets a test inject a
 * peer message.
 */

type CsrfModule = typeof import('../src/api/csrf')

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

function nonceResponse(token: string): Response {
  return new Response(JSON.stringify({ data: { token } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function importFresh(): Promise<CsrfModule> {
  return import('../src/api/csrf')
}

beforeEach(() => {
  channels = []
  vi.resetModules()
  vi.stubGlobal('BroadcastChannel', fakeBroadcastChannel())
  // apiUrl() builds from window.location.origin; node env has no window.
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('csrf nonce multi-tab sync', () => {
  it('ensureCsrf fetches the nonce and broadcasts it to other tabs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(nonceResponse('nonce-A'))
    vi.stubGlobal('fetch', fetchMock)

    const csrf = await importFresh()
    await csrf.ensureCsrf()

    expect(csrf.csrfToken()).toBe('nonce-A')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(channels[0].postMessage).toHaveBeenCalledWith({ type: 'csrf', token: 'nonce-A' })
  })

  it('adopts a nonce broadcast by another tab without fetching', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const csrf = await importFresh()
    const channel = channels[0]

    channel.onmessage?.({ data: { type: 'csrf', token: 'nonce-peer' } } as MessageEvent)

    expect(csrf.csrfToken()).toBe('nonce-peer')
    // Adoption makes a subsequent ensureCsrf a no-op (no fetch).
    await csrf.ensureCsrf()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ignores malformed channel messages', async () => {
    const fetchMock = vi.fn().mockResolvedValue(nonceResponse('nonce-A'))
    vi.stubGlobal('fetch', fetchMock)

    const csrf = await importFresh()
    await csrf.ensureCsrf()
    const channel = channels[0]

    channel.onmessage?.({ data: { type: 'csrf', token: '' } } as MessageEvent)
    channel.onmessage?.({ data: { type: 'other', token: 'x' } } as MessageEvent)
    channel.onmessage?.({ data: null } as MessageEvent)

    expect(csrf.csrfToken()).toBe('nonce-A')
  })

  it('refreshCsrf fetches a fresh nonce and broadcasts it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(nonceResponse('nonce-old'))
      .mockResolvedValueOnce(nonceResponse('nonce-new'))
    vi.stubGlobal('fetch', fetchMock)

    const csrf = await importFresh()
    await csrf.ensureCsrf()
    expect(csrf.csrfToken()).toBe('nonce-old')

    await csrf.refreshCsrf()

    expect(csrf.csrfToken()).toBe('nonce-new')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(channels[0].postMessage).toHaveBeenLastCalledWith({ type: 'csrf', token: 'nonce-new' })
  })

  it('single-flights concurrent ensureCsrf calls into one fetch', async () => {
    let resolveFetch: ((r: Response) => void) | null = null
    const fetchMock = vi.fn().mockImplementation(
      () => new Promise<Response>((res) => (resolveFetch = res)),
    )
    vi.stubGlobal('fetch', fetchMock)

    const csrf = await importFresh()
    const p1 = csrf.ensureCsrf()
    const p2 = csrf.ensureCsrf()

    resolveFetch?.(nonceResponse('nonce-shared'))
    await Promise.all([p1, p2])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(csrf.csrfToken()).toBe('nonce-shared')
  })

  it('whenCsrfCookieQuiet waits until an in-flight nonce fetch settles', async () => {
    let resolveFetch: ((r: Response) => void) | null = null
    const fetchMock = vi.fn().mockImplementation(
      () => new Promise<Response>((res) => (resolveFetch = res)),
    )
    vi.stubGlobal('fetch', fetchMock)

    const csrf = await importFresh()
    const fetchP = csrf.ensureCsrf()
    let quiet = false
    const quietP = csrf.whenCsrfCookieQuiet().then(() => {
      quiet = true
    })

    await Promise.resolve()
    expect(quiet).toBe(false)

    resolveFetch?.(nonceResponse('nonce-wait'))
    await fetchP
    await quietP
    expect(quiet).toBe(true)
    expect(csrf.csrfToken()).toBe('nonce-wait')
  })

  it('applyCsrfHeader writes the X-CSRF-Token header when a token exists', async () => {
    const fetchMock = vi.fn().mockResolvedValue(nonceResponse('nonce-A'))
    vi.stubGlobal('fetch', fetchMock)

    const csrf = await importFresh()
    await csrf.ensureCsrf()

    const headers = new Headers()
    csrf.applyCsrfHeader(headers)
    expect(headers.get('X-CSRF-Token')).toBe('nonce-A')
  })

  it('applyCsrfHeader leaves headers untouched without a token', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const csrf = await importFresh()

    const headers = new Headers()
    csrf.applyCsrfHeader(headers)
    expect(headers.get('X-CSRF-Token')).toBeNull()
  })
})
