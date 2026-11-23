import { onUnmounted } from 'vue'

/**
 * Shell signal bus — the seam that lets a product feature wake the core shell.
 *
 * The core dashboard refreshes the current user when a product changes
 * something the shell shows (for example a quota counter). The shell must not
 * import the product's realtime composable to do that, so the product raises a
 * named signal here and the shell listens for it:
 *
 *   feature boot : provideShellSignal('quota', () => { join(); return leave })
 *   shell view   : useShellSignal('quota', () => { void fetchMe() })
 *
 * The provider's source is only opened while at least one consumer is mounted,
 * which keeps the product's channel out of a session that never opens it.
 * A fork without that product simply never receives the signal.
 */
export type ShellSignal = 'quota' | 'entitlements'

type Provider = () => () => void

const listeners = new Map<ShellSignal, Set<() => void>>()
const providers = new Map<ShellSignal, { open: Provider; stop: (() => void) | null }>()

/** Raise a shell signal. Safe before any listener registered; never throws. */
export function notifyShellSignal(signal: ShellSignal): void {
  for (const listener of listeners.get(signal) ?? []) {
    try {
      listener()
    } catch {
      // A failing listener must not block the other consumers.
    }
  }
}

function openProvider(signal: ShellSignal): void {
  const provider = providers.get(signal)
  if (provider === undefined || provider.stop !== null || !(listeners.get(signal)?.size)) return

  try {
    provider.stop = provider.open()
  } catch {
    provider.stop = null
  }
}

function closeProvider(signal: ShellSignal): void {
  const provider = providers.get(signal)
  if (provider === undefined || provider.stop === null) return

  try {
    provider.stop()
  } catch {
    // A provider that fails to tear down must not wedge the bus.
  }
  provider.stop = null
}

/**
 * Register the source behind a shell signal. Called once from a feature's
 * `boot()`; `open` must return its teardown.
 */
export function provideShellSignal(signal: ShellSignal, open: Provider): void {
  providers.set(signal, { open, stop: null })
  openProvider(signal)
}

/** Register a shell listener that detaches automatically on component unmount. */
export function useShellSignal(signal: ShellSignal, listener: () => void): void {
  let bucket = listeners.get(signal)
  if (bucket === undefined) {
    bucket = new Set()
    listeners.set(signal, bucket)
  }
  bucket.add(listener)
  openProvider(signal)

  onUnmounted(() => {
    bucket.delete(listener)
    if (bucket.size === 0) {
      listeners.delete(signal)
      closeProvider(signal)
    }
  })
}
