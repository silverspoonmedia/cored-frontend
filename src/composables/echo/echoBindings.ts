/**
 * The lazily-bound realtime primitives `channelRegistry` needs from `useEcho`.
 *
 * `useEcho` imports `channelRegistry` (it subscribes through it), and
 * `channelRegistry` subscribes through `useEcho` — one of the two edges must be
 * deferred. This module is that edge: `useEcho` registers the two functions when
 * it evaluates, `channelRegistry` reads them only inside a subscribe call, by
 * which time both modules exist. Keeping it a leaf (no runtime imports) means
 * neither module ever sees a half-initialised namespace in the
 * `client → csrf → channelRegistry → useEcho → auth → client` cycle.
 */
export type EchoBindings = {
  getEcho: () => EchoInstance | null
  subscribeWhenEchoReady: (attach: () => boolean) => () => void
}

/** Structural shape of the Laravel Echo client `useEcho` owns. */
export interface EchoInstance {
  private: (channel: string) => { listen: (event: string, handler: (payload: unknown) => void) => unknown }
  leave: (channel: string) => void
}

let bindings: EchoBindings | null = null

/** Called once by `useEcho` at module evaluation. */
export function registerEchoBindings(next: EchoBindings): void {
  bindings = next
}

/** Read by `channelRegistry` inside a subscribe; throws if `useEcho` never ran. */
export function echoBindings(): EchoBindings {
  if (bindings === null) {
    throw new Error('Realtime bindings are not registered: import @/composables/useEcho before subscribing to a channel.')
  }
  return bindings
}
