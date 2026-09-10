import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * useArchivdRealtime must join BOTH the user channel (personal listing,
 * quota, microstock billing/credentials) and the workspace channel
 * (team listing/members/activity + collection progress) — the backend
 * routes workspace-scoped events to archivd.workspace.{id}; without the
 * join other browser tabs never hear about uploads done in another tab.
 */

type Listener = (e: unknown) => void

function makeMockChannel() {
  const listeners: Record<string, Listener> = {}
  return {
    listen: vi.fn((event: string, fn: Listener) => {
      listeners[event] = fn
    }),
    __listeners: listeners,
  }
}

const channels = new Map<string, ReturnType<typeof makeMockChannel>>()
const leftChannels: string[] = []
let echoInstance: {
  private: (name: string) => ReturnType<typeof makeMockChannel>
  leave: (name: string) => void
} | null

vi.mock('@/composables/useEcho', () => ({
  getEcho: () => echoInstance,
  subscribeWhenEchoReady: (attach: () => boolean) => {
    if (echoInstance !== null) {
      attach()
      return () => {}
    }
    onReadyCbs.push(attach)
    return () => {
      const i = onReadyCbs.indexOf(attach)
      if (i >= 0) onReadyCbs.splice(i, 1)
    }
  },
  onEchoReady: (fn: () => void) => {
    readyCbs.push(fn)
    return () => {
      const i = readyCbs.indexOf(fn)
      if (i >= 0) readyCbs.splice(i, 1)
    }
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuth: () => ({ user: { value: { id: 'user-1' } } }),
}))

const readyCbs: Array<() => void> = []
const onReadyCbs: Array<() => boolean> = []

function setEcho(echo: typeof echoInstance): void {
  echoInstance = echo
}

function makeEcho() {
  return {
    private: vi.fn((name: string) => {
      let ch = channels.get(name)
      if (!ch) {
        ch = makeMockChannel()
        channels.set(name, ch)
      }
      return ch
    }),
    leave: vi.fn((name: string) => {
      leftChannels.push(name)
      channels.delete(name)
    }),
  }
}

function importRealtime(): Promise<typeof import('../src/composables/archivd/useArchivdRealtime')> {
  return import('../src/composables/archivd/useArchivdRealtime')
}

function userChannel() {
  return channels.get('archivd.user.user-1')
}

function workspaceChannel(id: string) {
  return channels.get(`archivd.workspace.${id}`)
}

beforeEach(() => {
  channels.clear()
  leftChannels.length = 0
  readyCbs.length = 0
  onReadyCbs.length = 0
  echoInstance = null
})

afterEach(() => {
  vi.resetModules()
})

describe('useArchivdRealtime', () => {
  it('attaches the user channel and returns true when echo is ready', async () => {
    setEcho(makeEcho())
    const rt = await importRealtime()

    const ok = rt.subscribeArchivdRealtime({})

    expect(ok).toBe(true)
    expect(userChannel()).toBeDefined()
    // user-channel-only events stay on the user channel
    expect(userChannel()?.__listeners['.quota.changed']).toBeTypeOf('function')
    expect(userChannel()?.__listeners['.microstock.credentials.changed']).toBeTypeOf('function')
  })

  it('returns false and defers attach via subscribeWhenEchoReady when echo is not initialized', async () => {
    setEcho(null)
    const rt = await importRealtime()

    const ok = rt.subscribeArchivdRealtime({})
    expect(ok).toBe(false)
    expect(userChannel()).toBeUndefined()
    expect(onReadyCbs).toHaveLength(1)

    // Echo initializes (AppNavbar after shell batch) -> queued attach fires
    setEcho(makeEcho())
    onReadyCbs[0]()

    expect(userChannel()).toBeDefined()
    expect(userChannel()?.__listeners['.listing.changed']).toBeTypeOf('function')
  })

  it('joins and leaves the workspace channel via setArchivdWorkspaceChannel', async () => {
    setEcho(makeEcho())
    const rt = await importRealtime()
    const onListing = vi.fn()
    rt.subscribeArchivdRealtime({ onListingChanged: onListing })

    rt.setArchivdWorkspaceChannel('ws-1')

    const ws1 = workspaceChannel('ws-1')
    expect(ws1).toBeDefined()
    expect(ws1?.__listeners['.listing.changed']).toBeTypeOf('function')
    // workspace events only — quota is user-channel
    expect(ws1?.__listeners['.quota.changed']).toBeUndefined()

    // workspace listing event reaches the handler
    ws1?.__listeners['.listing.changed']({})
    expect(onListing).toHaveBeenCalledTimes(1)

    rt.setArchivdWorkspaceChannel(null)

    expect(leftChannels).toContain('archivd.workspace.ws-1')
    expect(workspaceChannel('ws-1')).toBeUndefined()
  })

  it('switches the workspace channel on route change (leave old, join new)', async () => {
    setEcho(makeEcho())
    const rt = await importRealtime()
    rt.subscribeArchivdRealtime({})

    rt.setArchivdWorkspaceChannel('ws-1')
    rt.setArchivdWorkspaceChannel('ws-2')

    expect(leftChannels).toContain('archivd.workspace.ws-1')
    expect(workspaceChannel('ws-1')).toBeUndefined()
    expect(workspaceChannel('ws-2')).toBeDefined()

    // switching to the same id is a no-op
    rt.setArchivdWorkspaceChannel('ws-2')
    expect(leftChannels.filter((c) => c === 'archivd.workspace.ws-2')).toHaveLength(0)
  })

  it('re-attaches the remembered workspace channel when Echo initializes', async () => {
    setEcho(null)
    const rt = await importRealtime()
    rt.subscribeArchivdRealtime({})
    rt.setArchivdWorkspaceChannel('ws-9')

    setEcho(makeEcho())
    onReadyCbs[0]!()

    expect(workspaceChannel('ws-9')).toBeDefined()
    expect(workspaceChannel('ws-9')?.__listeners['.listing.changed']).toBeTypeOf('function')
  })

  it('leaves all channels when the last handler unsubscribes', async () => {
    setEcho(makeEcho())
    const rt = await importRealtime()
    const handlers = {}
    rt.subscribeArchivdRealtime(handlers)
    rt.setArchivdWorkspaceChannel('ws-1')

    rt.unsubscribeArchivdRealtime(handlers)

    expect(leftChannels).toContain('archivd.user.user-1')
    expect(leftChannels).toContain('archivd.workspace.ws-1')
  })
})
