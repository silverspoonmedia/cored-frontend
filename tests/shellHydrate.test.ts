import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const batch = vi.fn()
const isSessionSettling = vi.fn(() => false)
const settleBackoff = vi.fn(async () => undefined)
const setUser = vi.fn()
const seedTree = vi.fn()
const seedUnreadCount = vi.fn()
const seedList = vi.fn()

vi.mock('@/api/client', () => ({
  batch: (...args: unknown[]) => batch(...args),
  isSessionSettling: () => isSessionSettling(),
  settleBackoff: (attempt: number) => settleBackoff(attempt),
}))

vi.mock('@/stores/auth', () => ({
  useAuth: () => ({ setUser }),
}))

vi.mock('@/composables/navigation/useNavigation', () => ({
  useNavigation: () => ({ seedTree }),
}))

vi.mock('@/composables/notification/useNotifications', () => ({
  useNotifications: () => ({ seedUnreadCount, seedList }),
}))

type ShellModule = typeof import('../src/composables/useShellHydrate')

async function importShell(): Promise<ShellModule> {
  return import('../src/composables/useShellHydrate')
}

function okEntry(data: unknown) {
  return { status: 200, body: { status: 'success', message: 'ok', data } }
}

function okShellBatch(overrides?: {
  sidebar?: { status: number; body: unknown }
}) {
  return [
    okEntry({ id: 'user-1' }),
    overrides?.sidebar ?? okEntry([{ id: 'side' }]),
    okEntry([{ id: 'nav' }]),
    okEntry({ unread: 2 }),
    okEntry([{ id: 'n1' }]),
  ]
}

beforeEach(() => {
  batch.mockReset()
  isSessionSettling.mockReset()
  isSessionSettling.mockReturnValue(false)
  settleBackoff.mockReset()
  settleBackoff.mockResolvedValue(undefined)
  setUser.mockReset()
  seedTree.mockReset()
  seedUnreadCount.mockReset()
  seedList.mockReset()
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hydrateShell', () => {
  it('retries a failed batch during settle then seeds', async () => {
    isSessionSettling.mockReturnValue(true)
    batch.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(okShellBatch())

    const shell = await importShell()
    await shell.hydrateShell()

    expect(batch).toHaveBeenCalledTimes(2)
    expect(settleBackoff).toHaveBeenCalled()
    expect(seedTree).toHaveBeenCalledWith('sidebar', [{ id: 'side' }])
    expect(shell.isShellHydrated()).toBe(true)
    expect(shell.isShellFallbackBlocked('sidebar')).toBe(false)
  })

  it('blocks standalone fallback when a menu sub-entry is terminal', async () => {
    batch.mockResolvedValueOnce(
      okShellBatch({
        sidebar: { status: 401, body: { status: 'error', message: 'Unauthenticated.' } },
      }),
    )

    const shell = await importShell()
    await shell.hydrateShell()

    expect(shell.isShellFallbackBlocked('sidebar')).toBe(true)
    expect(seedTree).not.toHaveBeenCalledWith('sidebar', expect.anything())
    expect(seedTree).toHaveBeenCalledWith('navbar', [{ id: 'nav' }])
    expect(shell.isShellHydrated()).toBe(true)
  })

  it('does not retry a failed batch after the settle window', async () => {
    isSessionSettling.mockReturnValue(false)
    batch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const shell = await importShell()
    await shell.hydrateShell()

    expect(batch).toHaveBeenCalledTimes(1)
    expect(settleBackoff).not.toHaveBeenCalled()
    expect(shell.isShellHydrated()).toBe(false)
    expect(shell.isShellFallbackBlocked('sidebar')).toBe(false)
  })
})
