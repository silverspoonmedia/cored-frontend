import { batch } from '@/api/client'
import { useAuth } from '@/stores/auth'
import { useNavigation } from '@/composables/useNavigation'
import { useNotifications } from '@/composables/useNotifications'
import type { ApiResponse, NavigationTreeNode, UnreadCountPayload, User } from '@/api/types'

let hydrated = false
let inflight: Promise<void> | null = null

/**
 * Fan the authenticated shell's bootstrap reads into one Worker invocation.
 *
 * Each entry is checked independently: a sub-response only seeds its store when
 * it is a 200 success envelope, and anything that fails leaves the owning
 * composable untouched so its own lazy loader stays the fallback. The shell is
 * never blocked by a single bad sub-request.
 */
export async function hydrateShell(): Promise<void> {
  if (hydrated) return
  if (inflight) return inflight

  inflight = (async () => {
    const { setUser } = useAuth()
    const { seedTree } = useNavigation()
    const { seedUnreadCount } = useNotifications()

    try {
      const [me, sidebar, navbar, unread] = await batch<unknown>([
        { path: 'auth/me' },
        { path: 'navigation/menus', query: { layout: 'sidebar' } },
        { path: 'navigation/menus', query: { layout: 'navbar' } },
        { path: 'notifications/unread-count' },
      ])

      const meBody = bodyOf<User>(me)
      if (meBody?.data) setUser(meBody.data)

      const sidebarBody = bodyOf<NavigationTreeNode[]>(sidebar)
      if (Array.isArray(sidebarBody?.data)) seedTree('sidebar', sidebarBody.data)

      const navbarBody = bodyOf<NavigationTreeNode[]>(navbar)
      if (Array.isArray(navbarBody?.data)) seedTree('navbar', navbarBody.data)

      const unreadBody = bodyOf<UnreadCountPayload>(unread)
      if (typeof unreadBody?.data?.unread === 'number') seedUnreadCount(unreadBody.data.unread)

      hydrated = true
    } catch {
      // Batch itself failed (401 handled by the client's refresh path, or a
      // network/Worker error). Leave every store untouched — the per-feature
      // loaders in AppLayout/AppNavbar remain the source of truth.
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/** Unwrap a batch entry into its API envelope only when it is a 200 success. */
function bodyOf<T>(entry: { status: number; body: unknown } | undefined): ApiResponse<T> | null {
  if (!entry || entry.status !== 200) return null
  const body = entry.body as ApiResponse<T> | null
  if (!body || body.status !== 'success') return null
  return body
}

/** Test/diagnostic hook: allow re-hydration after logout. Not used by views. */
export function resetShellHydration(): void {
  hydrated = false
}

export function useShellHydrate() {
  return { hydrateShell, resetShellHydration }
}
