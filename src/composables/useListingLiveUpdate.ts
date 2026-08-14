import { onMounted, onUnmounted } from 'vue'
import { useListingReload } from '@/composables/useListingReload'
import { useEcho } from '@/composables/useEcho'

export function useListingLiveUpdate(
  tableId: string,
  fetchFn: () => void,
  options: { pollMs?: number } = {},
): void {
  const { registerListing, unregisterListing } = useListingReload()
  const { connected: echoConnected } = useEcho()

  const pollMs = options.pollMs ?? 60_000

  const reloadFn = () => fetchFn()

  let pollTimer: ReturnType<typeof setInterval> | null = null

  function startPolling(): void {
    if (pollTimer) return
    pollTimer = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (echoConnected.value) {
        stopPolling()
        return
      }
      fetchFn()
    }, pollMs)
  }

  function stopPolling(): void {
    if (pollTimer) {
      clearInterval(pollTimer)
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
