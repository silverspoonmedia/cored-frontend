import { acquireChannel, type ChannelSubscription } from '@/composables/echo/channelRegistry'

/**
 * Declarative wrapper over {@see acquireChannel} for the shape almost every
 * realtime composable has: one handler set, one or more events, and a channel
 * name that is either fixed or derived from the current route/entity.
 *
 * Keeps the "subscribe/unsubscribe ref-count + defer attach" boilerplate out
 * of the composables, so each one is a binding declaration instead of ~45
 * lines of copy-pasted channel management.
 */

export interface RealtimeEvent<H> {
  /** Event name as delivered by the broadcaster (leading dot included). */
  event: string
  /** Fan the payload out to every currently subscribed handler. */
  handle: (handlers: Iterable<H>, payload: any) => void
}

export interface RealtimeChannel<H> {
  /** Add a handler; returns whether the channel is attached right now. */
  subscribe(handlers: H): boolean
  /** Remove a handler; the channel leaves when the last one detaches. */
  unsubscribe(handlers: H): void
  /**
   * Rebind to a different channel name (dynamic names such as
   * `settings.{group}` or `archivd.workspace.{id}`). `null` detaches until the
   * next retarget. No-op when the name is unchanged.
   */
  retarget(name: string | null): void
  readonly active: boolean
  /** Number of subscribed handlers. */
  readonly size: number
}

export function createRealtimeChannel<H>(options: {
  /**
   * Static channel name, a getter for names that change at runtime, or `null`
   * for a channel that only ever binds through {@link RealtimeChannel.retarget}.
   */
  channel: string | null | (() => string | null)
  events: ReadonlyArray<RealtimeEvent<H>>
}): RealtimeChannel<H> {
  const handlers = new Set<H>()
  let override: string | null | undefined
  let subscription: ChannelSubscription | null = null

  const resolve = (): string | null => {
    if (override !== undefined) return override
    return typeof options.channel === 'function' ? options.channel() : options.channel
  }

  const bind = (): void => {
    if (subscription !== null || handlers.size === 0) return

    const name = resolve()
    if (name === null || name === '') return

    const listeners: Record<string, (payload: any) => void> = {}
    for (const { event, handle } of options.events) {
      listeners[event] = (payload: any) => handle(handlers, payload)
    }

    subscription = acquireChannel(name, listeners)
  }

  const unbind = (): void => {
    subscription?.release()
    subscription = null
  }

  return {
    subscribe(handlersToAdd: H): boolean {
      handlers.add(handlersToAdd)
      bind()
      return subscription?.active ?? false
    },
    unsubscribe(handlersToRemove: H): void {
      handlers.delete(handlersToRemove)
      if (handlers.size === 0) unbind()
    },
    retarget(name: string | null): void {
      const previous = resolve()
      override = name
      if (previous === name) return
      unbind()
      bind()
    },
    get active(): boolean {
      return subscription?.active ?? false
    },
    get size(): number {
      return handlers.size
    },
  }
}

export interface KeyedRealtimeChannel<K, H> {
  subscribe(key: K, handlers: H): boolean
  unsubscribe(key: K, handlers: H): void
  active(key: K): boolean
}

/**
 * Family of channels addressed by a key (`payments.invoice.{id}`,
 * `vtual.claim.{id}`, `services.purchase.{id}`). Each key gets its own
 * ref-counted channel, created lazily and dropped when its last handler
 * detaches — so N simultaneous entities never share (or tear down) one channel.
 */
export function createKeyedRealtimeChannel<K, H>(options: {
  channel: (key: K) => string
  events: (key: K) => ReadonlyArray<RealtimeEvent<H>>
}): KeyedRealtimeChannel<K, H> {
  const channels = new Map<K, RealtimeChannel<H>>()

  const channelFor = (key: K): RealtimeChannel<H> => {
    let channel = channels.get(key)
    if (channel === undefined) {
      channel = createRealtimeChannel<H>({
        channel: options.channel(key),
        events: options.events(key),
      })
      channels.set(key, channel)
    }
    return channel
  }

  return {
    subscribe(key: K, handlers: H): boolean {
      return channelFor(key).subscribe(handlers)
    },
    unsubscribe(key: K, handlers: H): void {
      const channel = channels.get(key)
      if (channel === undefined) return

      channel.unsubscribe(handlers)
      if (channel.size === 0) {
        channels.delete(key)
      }
    },
    active(key: K): boolean {
      return channels.get(key)?.active ?? false
    },
  }
}
