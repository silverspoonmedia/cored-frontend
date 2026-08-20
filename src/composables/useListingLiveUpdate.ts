import { onMounted, onUnmounted } from 'vue'
import { useListingReload } from '@/composables/useListingReload'

/**
 * Registers a listing's reload fn on the Echo-driven reload bus. Live updates
 * arrive only over the websocket; there is no polling fallback — Echo/Pusher
 * auto-reconnect is the recovery path.
 */
export function useListingLiveUpdate(
  tableId: string,
  fetchFn: () => void,
): void {
  const { registerListing, unregisterListing } = useListingReload()

  const reloadFn = () => fetchFn()

  onMounted(() => {
    registerListing(tableId, reloadFn)
  })

  onUnmounted(() => {
    unregisterListing(tableId, reloadFn)
  })
}
