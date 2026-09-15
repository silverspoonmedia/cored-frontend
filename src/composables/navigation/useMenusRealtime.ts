import { listenMenusChannel, type MenuTreeChangedPayload } from '@/composables/navigation/useMenusChannel'

export type MenusRealtimeHandlers = {
  onMenuTreeChanged?: (payload: { layout: string; action: string; target_user_id?: string | null }) => void
}

const handlerSet = new Set<MenusRealtimeHandlers>()
let detach: (() => void) | null = null

export function subscribeMenusRealtime(handlers: MenusRealtimeHandlers): boolean {
  handlerSet.add(handlers)

  if (detach === null) {
    // Shared navigation.menus channel (useMenusChannel) — ref-counted with
    // the app shell, so unmount here can't kill sidebar/navbar live updates.
    detach = listenMenusChannel((e: MenuTreeChangedPayload) => {
      for (const h of handlerSet) h.onMenuTreeChanged?.(e as { layout: string; action: string; target_user_id?: string | null })
    })
  }

  return true
}

export function unsubscribeMenusRealtime(handlers: MenusRealtimeHandlers): void {
  handlerSet.delete(handlers)
  if (handlerSet.size === 0 && detach !== null) {
    detach()
    detach = null
  }
}

export function useMenusRealtime() {
  return {
    subscribe: subscribeMenusRealtime,
    unsubscribe: unsubscribeMenusRealtime,
  }
}
