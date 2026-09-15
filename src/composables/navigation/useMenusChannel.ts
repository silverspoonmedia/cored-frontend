import { acquireChannel } from '@/composables/echo/channelRegistry'

/**
 * Shared ownership of the `navigation.menus` private channel.
 *
 * Two consumers listen on it: the app shell (useNavigation — sidebar/navbar
 * tree refetch, lives for the whole session) and admin views
 * (useMenusRealtime — MenusView/MenuEdit/MenusTrashed refetch). Before this
 * module, each consumer `echo.leave`d the channel independently, so leaving a
 * menus view killed the shell's live navigation until reload.
 *
 * Ref-counting now lives in the channel registry, so this is a thin typed
 * wrapper: the channel binds with the first listener and leaves with the last.
 */

export type MenuTreeChangedPayload = { layout?: string; target_user_id?: string | null }

type MenuListener = (payload: MenuTreeChangedPayload) => void

export function listenMenusChannel(fn: MenuListener): () => void {
  const subscription = acquireChannel('navigation.menus', {
    '.menu.tree.changed': (payload: MenuTreeChangedPayload) => fn(payload),
  })

  return () => subscription.release()
}
