/**
 * Global listing-reload registry.
 *
 * Maps table_id -> Set<refetch callbacks>. The notification bell calls
 * `triggerListingReload(tableId)` when it receives an
 * `.activity-notification.received` event carrying a `table_id` payload
 * (set by `NotificationType::tableId()` on the backend). Any listing view
 * that wants live-update registers its refetch function on mount and
 * unregisters on unmount.
 *
 * Pure module-level singleton — no reactive state, no Pinia. This mirrors
 * Monolith Blade's `window.dataTables[tableId].ajax.reload()` pattern.
 */

const registry = new Map<string, Set<() => void>>()

export function registerListing(tableId: string, fn: () => void): void {
  let set = registry.get(tableId)
  if (!set) {
    set = new Set()
    registry.set(tableId, set)
  }
  set.add(fn)
}

export function unregisterListing(tableId: string, fn: () => void): void {
  const set = registry.get(tableId)
  if (!set) return
  set.delete(fn)
  if (set.size === 0) {
    registry.delete(tableId)
  }
}

export function triggerListingReload(tableId: string): void {
  const set = registry.get(tableId)
  if (!set) return
  for (const fn of set) {
    try {
      fn()
    } catch {
      // a failing refetch must not block other callbacks
    }
  }
}

export function useListingReload() {
  return {
    registerListing,
    unregisterListing,
    triggerListingReload,
  }
}
