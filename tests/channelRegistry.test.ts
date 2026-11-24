import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PusherEcho } from 'laravel-echo'

/**
 * The channel registry is the single owner of private-channel lifecycles
 * (`src/composables/echo/channelRegistry.ts`). These cases lock the properties
 * that the old per-composable copies kept getting wrong:
 *
 * - ref-count per channel NAME, so a second consumer of a shared channel
 *   (`navigation.menus`, `App.Models.User.{id}`) can never leave it out from
 *   under the first;
 * - deferred attach while Echo is still initializing;
 * - dynamic names (`settings.{group}`) release the previous channel;
 * - keyed families (`payments.invoice.{id}`) keep one channel per entity.
 */

type Listener = (payload: unknown) => void

interface FakeChannel {
  listen: ReturnType<typeof vi.fn>
  stopListening: ReturnType<typeof vi.fn>
  listeners: Record<string, Listener>
}

const channels = new Map<string, FakeChannel>()
const leftChannels: string[] = []

function makeFakeEcho(): PusherEcho {
  return {
    private: vi.fn((name: string) => {
      let channel = channels.get(name)
      if (!channel) {
        channel = {
          listen: vi.fn((event: string, fn: Listener) => {
            channel!.listeners[event] = fn
          }),
          stopListening: vi.fn(),
          listeners: {},
        }
        channels.set(name, channel)
      }
      return channel as unknown as never
    }),
    leave: vi.fn((name: string) => {
      leftChannels.push(name)
      channels.delete(name)
    }),
  } as unknown as PusherEcho
}

function listenersOf(name: string): Record<string, Listener> {
  return channels.get(name)?.listeners ?? {}
}

async function importRegistry() {
  return import('../src/composables/echo/channelRegistry')
}

async function importRealtimeChannel() {
  return import('../src/composables/echo/realtimeChannel')
}

beforeEach(() => {
  channels.clear()
  leftChannels.length = 0
})

afterEach(() => {
  vi.resetModules()
})

describe('acquireChannel ref-count', () => {
  it('binds one Echo channel for N holders and leaves only after the last release', async () => {
    const useEcho = await import('../src/composables/useEcho')
    const { acquireChannel } = await importRegistry()
    const echo = makeFakeEcho()
    useEcho.__setEchoForTests(echo)

    const first = acquireChannel('navigation.menus', {
      '.menu.tree.changed': () => {},
    })
    const second = acquireChannel('navigation.menus', {
      '.menu.tree.changed': () => {},
    })

    // One join, both listeners registered.
    expect(echo.private).toHaveBeenCalledTimes(1)
    expect(Object.keys(listenersOf('navigation.menus'))).toEqual(['.menu.tree.changed'])

    first.release()
    expect(leftChannels).not.toContain('navigation.menus')

    second.release()
    expect(leftChannels).toContain('navigation.menus')
  })

  it('fans an event out to every holder of the shared channel', async () => {
    const useEcho = await import('../src/composables/useEcho')
    const { acquireChannel } = await importRegistry()
    useEcho.__setEchoForTests(makeFakeEcho())

    const a = vi.fn()
    const b = vi.fn()
    acquireChannel('navigation.menus', { '.menu.tree.changed': a })
    acquireChannel('navigation.menus', { '.menu.tree.changed': b })

    listenersOf('navigation.menus')['.menu.tree.changed']?.({ layout: 'sidebar' })

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('defers the attach until Echo initializes, then binds every registered event', async () => {
    const useEcho = await import('../src/composables/useEcho')
    const { acquireChannel } = await importRegistry()

    // Echo NOT initialized yet.
    const subscription = acquireChannel('logs.activity', {
      '.log.activity.appended': () => {},
    })

    expect(subscription.active).toBe(false)
    expect(channels.size).toBe(0)

    useEcho.__setEchoForTests(makeFakeEcho())

    expect(subscription.active).toBe(true)
    expect(listenersOf('logs.activity')['.log.activity.appended']).toBeTypeOf('function')
  })

  it('releasing before Echo initializes cancels the deferred attach', async () => {
    const useEcho = await import('../src/composables/useEcho')
    const { acquireChannel } = await importRegistry()

    const subscription = acquireChannel('logs.activity', { '.log.activity.appended': () => {} })
    subscription.release()

    useEcho.__setEchoForTests(makeFakeEcho())

    expect(channels.has('logs.activity')).toBe(false)
  })
})

describe('createRealtimeChannel', () => {
  it('retargets a dynamic name and leaves the previous channel', async () => {
    const useEcho = await import('../src/composables/useEcho')
    const { createRealtimeChannel } = await importRealtimeChannel()
    useEcho.__setEchoForTests(makeFakeEcho())

    const channel = createRealtimeChannel<{ onChanged?: () => void }>({
      channel: null,
      events: [
        {
          event: '.settings.group.changed',
          handle: (handlers) => {
            for (const h of handlers) h.onChanged?.()
          },
        },
      ],
    })

    channel.retarget('settings.platform')
    channel.subscribe({ onChanged: () => {} })
    expect(channels.has('settings.platform')).toBe(true)

    channel.retarget('settings.product')
    expect(leftChannels).toContain('settings.platform')
    expect(channels.has('settings.product')).toBe(true)

    // Same name again is a no-op (no leave/join churn on re-render).
    leftChannels.length = 0
    channel.retarget('settings.product')
    expect(leftChannels).toHaveLength(0)
  })

  it('does not bind while no handlers are subscribed', async () => {
    const useEcho = await import('../src/composables/useEcho')
    const { createRealtimeChannel } = await importRealtimeChannel()
    useEcho.__setEchoForTests(makeFakeEcho())

    const channel = createRealtimeChannel<{ onChanged?: () => void }>({
      channel: 'logs.errors',
      events: [{ event: '.log.error.recorded', handle: () => {} }],
    })

    expect(channel.active).toBe(false)
    expect(channels.size).toBe(0)
  })
})

describe('createKeyedRealtimeChannel', () => {
  it('keeps one channel per key and drops it when its last handler detaches', async () => {
    const useEcho = await import('../src/composables/useEcho')
    const { createKeyedRealtimeChannel } = await importRealtimeChannel()
    useEcho.__setEchoForTests(makeFakeEcho())

    const keyed = createKeyedRealtimeChannel<string, () => void>({
      channel: (invoiceId) => `payments.invoice.${invoiceId}`,
      events: () => [
        {
          event: '.invoice.status.changed',
          handle: (handlers) => {
            for (const h of handlers) h()
          },
        },
      ],
    })

    const a = vi.fn()
    const b = vi.fn()
    keyed.subscribe('inv-1', a)
    keyed.subscribe('inv-2', b)

    expect(channels.has('payments.invoice.inv-1')).toBe(true)
    expect(channels.has('payments.invoice.inv-2')).toBe(true)

    listenersOf('payments.invoice.inv-1')['.invoice.status.changed']?.({})
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).not.toHaveBeenCalled()

    keyed.unsubscribe('inv-1', a)
    expect(leftChannels).toContain('payments.invoice.inv-1')
    expect(channels.has('payments.invoice.inv-2')).toBe(true)
  })
})
