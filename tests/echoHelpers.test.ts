import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PusherEcho } from 'laravel-echo'

/**
 * Shared realtime primitives in useEcho.ts:
 * - subscribeWhenEchoReady: race-safe subscribe (views mount before the async
 *   AppNavbar Echo init; a plain `if (!echo) return` leaves the tab deaf).
 * - useEchoResync: outage refetch tied to unmount.
 * - listenPersonalChannel: ref-counted App.Models.User.{id} shared by the
 *   notification bell and auth-self events — one consumer leaving must never
 *   kill the other's live updates (leave-hygiene regression).
 */

const leftChannels: string[] = []
const channels = new Map<string, { listen: ReturnType<typeof vi.fn>; listeners: Record<string, unknown> }>()

function makeFakeEcho(): PusherEcho {
  return {
    private: vi.fn((name: string) => {
      let ch = channels.get(name)
      if (!ch) {
        ch = {
          listen: vi.fn((event: string, fn: unknown) => {
            ch!.listeners[event] = fn
          }),
          listeners: {},
        }
        channels.set(name, ch)
      }
      return ch as unknown as never
    }),
    leave: vi.fn((name: string) => {
      leftChannels.push(name)
      channels.delete(name)
    }),
  } as unknown as PusherEcho
}

vi.mock('@/stores/auth', () => ({
  useAuth: () => ({ user: { value: { id: 'user-1' } } }),
}))

function channelOf(name: string) {
  return channels.get(name)
}

beforeEach(() => {
  channels.clear()
  leftChannels.length = 0
})

afterEach(() => {
  vi.resetModules()
})

describe('subscribeWhenEchoReady', () => {
  it('attaches immediately when Echo exists', async () => {
    const mod = await import('../src/composables/useEcho')
    mod.__setEchoForTests(makeFakeEcho())

    const attach = vi.fn(() => true)
    mod.subscribeWhenEchoReady(attach)

    expect(attach).toHaveBeenCalledTimes(1)
  })

  it('defers attach until Echo init, cancels cleanly on unsubscribe', async () => {
    const mod = await import('../src/composables/useEcho')
    // Echo NOT initialized yet.

    const attach = vi.fn(() => true)
    const unsubscribe = mod.subscribeWhenEchoReady(attach)

    expect(attach).not.toHaveBeenCalled()

    // Unsubscribe before init: attach must never run.
    unsubscribe()

    mod.__setEchoForTests(makeFakeEcho())
    expect(attach).not.toHaveBeenCalled()
  })

  it('re-attaches exactly once when Echo initializes after subscribe', async () => {
    const mod = await import('../src/composables/useEcho')

    const attach = vi.fn(() => true)
    mod.subscribeWhenEchoReady(attach)
    expect(attach).not.toHaveBeenCalled()

    mod.__setEchoForTests(makeFakeEcho())
    expect(attach).toHaveBeenCalledTimes(1)
  })
})

describe('listenPersonalChannel ref-count (leave hygiene)', () => {
  it('keeps the channel alive for the bell after auth-self detaches; leaves on last detach', async () => {
    const mod = await import('../src/composables/useEcho')
    const echo = makeFakeEcho()
    mod.__setEchoForTests(echo)

    // Consumer 1: notification bell. Consumer 2: auth-self events.
    const detachBell = mod.listenPersonalChannel({
      '.activity-notification.received': () => {},
    })
    const detachAuth = mod.listenPersonalChannel({
      '.auth.state.changed': () => {},
    })

    expect(channelOf('App.Models.User.user-1')).toBeDefined()

    // auth-self unsubscribes first — bell must stay live (no leave).
    detachAuth()
    expect(leftChannels).not.toContain('App.Models.User.user-1')
    expect(channelOf('App.Models.User.user-1')).toBeDefined()

    // bell detaches — last consumer gone, channel leaves.
    detachBell()
    expect(leftChannels).toContain('App.Models.User.user-1')
    expect(channelOf('App.Models.User.user-1')).toBeUndefined()
  })

  it('binds events for every consumer on the shared channel', async () => {
    const mod = await import('../src/composables/useEcho')
    mod.__setEchoForTests(makeFakeEcho())

    mod.listenPersonalChannel({ '.activity-notification.received': () => {} })
    mod.listenPersonalChannel({ '.auth.state.changed': () => {} })

    const ch = channelOf('App.Models.User.user-1')
    expect(ch?.listeners['.activity-notification.received']).toBeTypeOf('function')
    expect(ch?.listeners['.auth.state.changed']).toBeTypeOf('function')
  })
})

describe('navigation.menus shared channel (useMenusChannel)', () => {
  it('survives MenusView unmount while the shell is still listening', async () => {
    const { listenMenusChannel } = await import('../src/composables/navigation/useMenusChannel')
    const mod = await import('../src/composables/useEcho')
    mod.__setEchoForTests(makeFakeEcho())

    const shellHandler = vi.fn()
    const viewHandler = vi.fn()

    const stopShell = listenMenusChannel(shellHandler)
    const stopView = listenMenusChannel(viewHandler)

    // Event reaches both consumers.
    const ch = channelOf('navigation.menus')
    expect(ch).toBeDefined()
    ch?.listeners['.menu.tree.changed']?.({ layout: 'sidebar' })
    expect(shellHandler).toHaveBeenCalledTimes(1)
    expect(viewHandler).toHaveBeenCalledTimes(1)

    // MenusView unmounts — shell nav must stay live.
    stopView()
    expect(leftChannels).not.toContain('navigation.menus')

    ch?.listeners['.menu.tree.changed']?.({ layout: 'navbar' })
    expect(shellHandler).toHaveBeenCalledTimes(2)

    // Last consumer gone — channel leaves.
    stopShell()
    expect(leftChannels).toContain('navigation.menus')
    expect(channelOf('navigation.menus')).toBeUndefined()
  })
})
