import { onMounted, onUnmounted } from 'vue'
import { useListingReload } from '@/composables/useListingReload'
import { useEcho } from '@/composables/useEcho'

const IDLE_POLLS_BEFORE_BACKOFF = 5
const MAX_POLL_MS = 300_000

export function useListingLiveUpdate(
  tableId: string,
  fetchFn: () => void,
  options: { pollMs?: number } = {},
): void {
  const { registerListing, unregisterListing } = useListingReload()
  const { connected: echoConnected } = useEcho()

  const basePollMs = options.pollMs ?? 90_000

  const reloadFn = () => fetchFn()

  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let idlePolls = 0
  let lastRowCount: number | null = null

  function scheduleNext(delayMs: number): void {
    pollTimer = setTimeout(tick, delayMs)
  }

  async function tick(): Promise<void> {
    if (pollTimer === null) return
    if (document.visibilityState !== 'visible') {
      scheduleNext(basePollMs)
      return
    }
    if (echoConnected.value) {
      stopPolling()
      return
    }

    // Back off while the listing stays unchanged so idle tabs stop hammering
    // the Worker quota; any change (or a fetch error) resets to the base
    // interval so fresh activity is picked up quickly again. Row count is a
    // cheap change signal — pagination size is fixed, so it only moves when
    // rows appear or disappear.
    try {
      const before = lastRowCount
      await fetchFn()
      const after = document.querySelectorAll('table tbody tr').length
      if (before !== null && after === before) {
        idlePolls += 1
      } else {
        idlePolls = 0
        lastRowCount = after
      }
    } catch {
      idlePolls = 0
    }

    const delay = idlePolls >= IDLE_POLLS_BEFORE_BACKOFF
      ? Math.min(basePollMs * 2 ** (idlePolls - IDLE_POLLS_BEFORE_BACKOFF + 1), MAX_POLL_MS)
      : basePollMs
    scheduleNext(delay)
  }

  function startPolling(): void {
    if (pollTimer) return
    idlePolls = 0
    lastRowCount = null
    scheduleNext(basePollMs)
  }

  function stopPolling(): void {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  onMounted(() => {
    registerListing(tableId, reloadFn)
    if (!echoConnected.value) {
      startPolling()
    }
  })

  onUnmounted(() => {
    unregisterListing(tableId, reloadFn)
    stopPolling()
  })
}
