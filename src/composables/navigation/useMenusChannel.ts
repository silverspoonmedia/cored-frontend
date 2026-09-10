import { getEcho, subscribeWhenEchoReady } from '@/composables/useEcho'

/**
 * Shared ownership of the `navigation.menus` private channel.
 *
 * Two consumers listen on it: the app shell (useNavigation — sidebar/navbar
 * tree refetch, lives for the whole session) and admin views
 * (useMenusRealtime — MenusView/MenuEdit/MenusTrashed refetch). Before this
 * module, each consumer `echo.leave`d the channel independently, so leaving a
 * menus view killed the shell's live navigation until reload.
 *
 * Ref-counted: the channel binds when the first listener attaches and leaves
 * only when the last detaches.
 */

export type MenuTreeChangedPayload = { layout?: string; target_user_id?: string | null }

type MenuListener = (payload: MenuTreeChangedPayload) => void
const listeners = new Set<MenuListener>()
let detach: (() => void) | null = null

function ensure(): boolean {
  if (detach !== null) return true
  const echo = getEcho()
  if (!echo) return false

  try {
    const ch = echo.private('navigation.menus')
    ch.listen('.menu.tree.changed', (e: MenuTreeChangedPayload) => {
      for (const fn of listeners) fn(e)
    })
    detach = () => {
      try {
        echo.leave('navigation.menus')
      } catch {
        // ignore
      }
    }
    return true
  } catch {
    return false
  }
}

export function listenMenusChannel(fn: MenuListener): () => void {
  listeners.add(fn)
  subscribeWhenEchoReady(ensure)
  return () => {
    listeners.delete(fn)
    if (listeners.size === 0 && detach !== null) {
      detach()
      detach = null
    }
  }
}
