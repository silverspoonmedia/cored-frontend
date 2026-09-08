import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface FakeChannel {
  postMessage: ReturnType<typeof vi.fn>
  onmessage: ((event: MessageEvent) => void) | null
}

let channels: FakeChannel[]
const post = vi.fn()
const clearCsrf = vi.fn()
const resetShellHydration = vi.fn()
const resetRouterHydration = vi.fn()
const revokeCurrentProtectedRoute = vi.fn()
const resetNavigationState = vi.fn()
const resetNotificationState = vi.fn()

vi.mock('@/i18n', () => ({ default: { global: { t: (key: string) => key } } }))
vi.mock('@/api/client', () => ({
  post: (...args: unknown[]) => post(...args),
  get: vi.fn(),
  setRefreshHandler: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
  markSessionIssued: vi.fn(),
  clearSessionIssued: vi.fn(),
  isSessionSettling: vi.fn(() => false),
}))
vi.mock('@/api/csrf', () => ({ clearCsrf: () => clearCsrf(), refreshCsrf: vi.fn() }))
vi.mock('@/composables/useShellHydrate', () => ({ resetShellHydration: () => resetShellHydration() }))
vi.mock('@/router', () => ({
  resetRouterHydration: () => resetRouterHydration(),
  revokeCurrentProtectedRoute: () => revokeCurrentProtectedRoute(),
}))
vi.mock('@/composables/navigation/useNavigation', () => ({ resetNavigationState: () => resetNavigationState() }))
vi.mock('@/composables/notification/useNotifications', () => ({ resetNotificationState: () => resetNotificationState() }))

function fakeBroadcastChannel() {
  return class {
    postMessage = vi.fn()
    onmessage: ((event: MessageEvent) => void) | null = null

    constructor() {
      channels.push(this as unknown as FakeChannel)
    }
  }
}

function createWindow() {
  const listeners = new Map<string, (event: StorageEvent) => void>()
  return {
    addEventListener: vi.fn((type: string, listener: (event: StorageEvent) => void) => listeners.set(type, listener)),
    dispatchStorage: (event: StorageEvent) => listeners.get('storage')?.(event),
  }
}

type AuthModule = typeof import('../src/stores/auth')

async function importAuth(): Promise<AuthModule> {
  return import('../src/stores/auth')
}

beforeEach(() => {
  channels = []
  post.mockReset()
  clearCsrf.mockReset()
  resetShellHydration.mockReset()
  resetRouterHydration.mockReset()
  revokeCurrentProtectedRoute.mockReset()
  resetNavigationState.mockReset()
  resetNotificationState.mockReset()
  vi.resetModules()
  vi.stubGlobal('BroadcastChannel', fakeBroadcastChannel())
  vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() })
  vi.stubGlobal('sessionStorage', { removeItem: vi.fn() })
  vi.stubGlobal('window', createWindow())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('cross-tab logout', () => {
  it('clears receiver auth and protected shell state without rebroadcasting', async () => {
    post.mockResolvedValueOnce({ status: 'success', data: { user: { id: 'user-1' }, expires_in: 3600, remember: false } })
    const auth = await importAuth()
    await auth.useAuth().login('user@example.test', 'secret', false)

    channels[0]?.onmessage?.({ data: { type: 'logout', epoch: 4 } } as MessageEvent)
    await vi.dynamicImportSettled()

    expect(auth.useAuth().user.value).toBeNull()
    expect(clearCsrf).toHaveBeenCalled()
    expect(resetShellHydration).toHaveBeenCalled()
    expect(resetNavigationState).toHaveBeenCalled()
    expect(resetNotificationState).toHaveBeenCalled()
    expect(revokeCurrentProtectedRoute).toHaveBeenCalled()
    expect(channels[0]?.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'logout' }))
  })

  it('uses storage event fallback and blocks delayed session hydration', async () => {
    post.mockResolvedValueOnce({ status: 'success', data: { user: { id: 'user-1' }, expires_in: 3600, remember: false } })
    const auth = await importAuth()
    await auth.useAuth().login('user@example.test', 'secret', false)

    const fakeWindow = window as unknown as { dispatchStorage(event: StorageEvent): void }
    fakeWindow.dispatchStorage({ key: 'mw_logout_event', newValue: '7' } as StorageEvent)
    await vi.dynamicImportSettled()

    expect(auth.useAuth().user.value).toBeNull()
    await expect(auth.useAuth().fetchMe()).rejects.toThrow('web.auth.fetch_user_failed')
  })
})
