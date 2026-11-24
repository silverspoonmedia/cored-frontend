import { echoBindings } from '@/composables/echo/echoBindings'

/**
 * One place that owns private-channel lifecycles.
 *
 * Every realtime composable used to hand-roll the same trio: a module-level
 * handler set, an `ensureChannel()` that called `echo.private(...).listen(...)`,
 * and a `maybeLeave()` that called `echo.leave(...)`. Beyond the duplication,
 * that pattern produced a recurring class of bugs:
 *
 * - two consumers of one channel (`navigation.menus`, `App.Models.User.{id}`)
 *   each calling `echo.leave()` and killing the other's live updates;
 * - dynamic channel names (`settings.{group}`, `purchase.{id}`) where
 *   the "leave the old name" branch was easy to forget;
 * - deferred attach (views mount before `AppNavbar` finishes `initEcho()`) that
 *   was sometimes missed entirely, leaving the tab deaf for the session.
 *
 * The registry fixes all three by construction: subscriptions are ref-counted
 * **per channel name**, attach is always deferred through
 * {@see subscribeWhenEchoReady}, and the channel leaves exactly when the last
 * holder releases it. Composables must not call `echo.private()` themselves —
 * `tests/echoConventions.test.ts` enforces that.
 */

/** Event name (leading dot for broadcast events) -> handler. */
export type ChannelListeners = Record<string, (payload: any) => void>

interface BoundChannel {
  listen: (event: string, handler: (payload: any) => void) => unknown
}

interface ChannelState {
  refs: number
  listeners: Map<string, Set<(payload: any) => void>>
  dispatchers: Map<string, (payload: any) => void>
  channel: BoundChannel | null
  cancelDeferred: (() => void) | null
}

export interface ChannelSubscription {
  /** True once the channel is attached to a live Echo instance. */
  readonly active: boolean
  release(): void
}

const states = new Map<string, ChannelState>()

function bindEvent(state: ChannelState, event: string): void {
  if (state.channel === null || state.dispatchers.has(event)) return

  const dispatcher = (payload: unknown): void => {
    for (const handler of state.listeners.get(event) ?? []) {
      handler(payload)
    }
  }

  state.dispatchers.set(event, dispatcher)
  state.channel.listen(event, dispatcher)
}

function attach(state: ChannelState, name: string): boolean {
  const echo = echoBindings().getEcho()
  if (echo === null) return false

  try {
    const channel = echo.private(name) as unknown as BoundChannel
    state.channel = channel
    for (const event of state.listeners.keys()) {
      bindEvent(state, event)
    }
    return true
  } catch {
    state.channel = null
    return false
  }
}

function ensureAttached(state: ChannelState, name: string): void {
  if (state.channel !== null || state.cancelDeferred !== null) return
  if (attach(state, name)) return

  // `echo.private()` threw: retrying would spin, so only a missing Echo
  // instance (the normal pre-init case) is worth deferring.
  if (echoBindings().getEcho() !== null) return

  state.cancelDeferred = echoBindings().subscribeWhenEchoReady(() => {
    state.cancelDeferred = null
    return attach(state, name)
  })
}

function releaseChannel(name: string, state: ChannelState, listeners: ChannelListeners): void {
  for (const [event, handler] of Object.entries(listeners)) {
    state.listeners.get(event)?.delete(handler)
  }

  state.refs -= 1
  if (state.refs > 0) return

  state.cancelDeferred?.()
  state.cancelDeferred = null

  const echo = echoBindings().getEcho()
  if (echo !== null && state.channel !== null) {
    try {
      echo.leave(name)
    } catch {
      // A channel that never fully joined has nothing to leave.
    }
  }

  state.channel = null
  state.dispatchers.clear()
  state.listeners.clear()
  states.delete(name)
}

/**
 * Acquire (or join) a private channel. Release is ref-counted per name, so the
 * channel is left only when every holder has released it.
 */
export function acquireChannel(name: string, listeners: ChannelListeners): ChannelSubscription {
  let state = states.get(name)

  if (state === undefined) {
    state = {
      refs: 0,
      listeners: new Map(),
      dispatchers: new Map(),
      channel: null,
      cancelDeferred: null,
    }
    states.set(name, state)
  }

  state.refs += 1

  for (const [event, handler] of Object.entries(listeners)) {
    let handlers = state.listeners.get(event)
    if (handlers === undefined) {
      handlers = new Set()
      state.listeners.set(event, handlers)
    }
    handlers.add(handler)

    // Binds immediately when the channel is already attached; a fresh attach
    // binds every registered event instead.
    bindEvent(state, event)
  }

  ensureAttached(state, name)

  const bound = state
  let released = false

  return {
    get active(): boolean {
      return bound.channel !== null
    },
    release(): void {
      if (released) return
      released = true
      releaseChannel(name, bound, listeners)
    },
  }
}
