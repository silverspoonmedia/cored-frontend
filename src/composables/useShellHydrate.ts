import { batch, isSessionSettling, settleBackoff } from '@/api/client'
import { bodyOf, isTerminalEntry } from '@/api/batch'
import { useAuth } from '@/stores/auth'
import { useNavigation } from '@/composables/navigation/useNavigation'
import { useNotifications } from '@/composables/notification/useNotifications'
import type { NavigationTreeNode, UnreadCountPayload, User, AppNotification } from '@/api/types'

export type ShellWidget = 'sidebar' | 'navbar' | 'unread' | 'list'

let hydrated = false
let inflight: Promise<void> | null = null
const blockedFallbacks = new Set<ShellWidget>()

/**
 * Fan the authenticated shell's bootstrap reads into one HTTP batch.
 *
 * Callers must already have a session: the route guard probes GET auth/me
 * first and only then invokes this. A guest POST /batch would mint CSRF
 * before the JWT cookie exists and race the first authenticated batch.
 *
 * Each entry is checked independently: a sub-response only seeds its store when
 * it is a 200 success envelope. Terminal sub-statuses (401/403/429) block the
 * standalone GET fallback (re-firing would repeat the rejection). Transient
 * failures leave the owning composable untouched so chrome can retry after
 * the batch settles. During the post-login settle window a failed batch is
 * retried with backoff instead of immediately falling through to GET menus.
 */
export async function hydrateShell(): Promise<void> {
  if (hydrated) return
  if (inflight) return inflight

  inflight = (async () => {
    const { setUser, getSessionEpoch } = useAuth()
    const epoch = getSessionEpoch()
    const { seedTree } = useNavigation()
    const { seedUnreadCount, seedList } = useNotifications()

    let attempt = 0
    while (true) {
      blockedFallbacks.clear()
      try {
        const [me, sidebar, navbar, unread, notifList] = await batch<unknown>([
          { path: 'auth/me' },
          { path: 'navigation/menus', query: { layout: 'sidebar' } },
          { path: 'navigation/menus', query: { layout: 'navbar' } },
          { path: 'notifications/unread-count' },
          { path: 'notifications', query: { display_mode: 'query', limit: '5' } },
        ])

        if (getSessionEpoch() !== epoch) {
          return
        }

        const meBody = bodyOf<User>(me)
        if (meBody?.data) setUser(meBody.data)

        seedOrBlock('sidebar', sidebar, (nodes: NavigationTreeNode[]) => seedTree('sidebar', nodes))
        seedOrBlock('navbar', navbar, (nodes: NavigationTreeNode[]) => seedTree('navbar', nodes))

        if (isTerminalEntry(unread)) {
          blockedFallbacks.add('unread')
        } else {
          const unreadBody = bodyOf<UnreadCountPayload>(unread)
          if (typeof unreadBody?.data?.unread === 'number') seedUnreadCount(unreadBody.data.unread)
        }

        if (isTerminalEntry(notifList)) {
          blockedFallbacks.add('list')
        } else {
          const notifListBody = bodyOf<AppNotification[]>(notifList)
          if (Array.isArray(notifListBody?.data)) seedList(notifListBody.data)
        }

        hydrated = true
        return
      } catch {
        if (!isSessionSettling()) {
          return
        }
        await settleBackoff(attempt++)
        if (!isSessionSettling()) {
          return
        }
      }
    }
  })().finally(() => {
    inflight = null
  })

  return inflight
}

function seedOrBlock(
  widget: 'sidebar' | 'navbar',
  entry: { status: number; body: unknown } | undefined,
  seed: (nodes: NavigationTreeNode[]) => void,
): void {
  if (isTerminalEntry(entry)) {
    blockedFallbacks.add(widget)
    return
  }
        const body = bodyOf<NavigationTreeNode[]>(entry)
        if (body && Array.isArray(body.data)) seed(body.data)
}

export function isShellFallbackBlocked(widget: ShellWidget): boolean {
  return blockedFallbacks.has(widget)
}

export function isShellHydrated(): boolean {
  return hydrated
}

/** Test/diagnostic hook: allow re-hydration after logout. Not used by views. */
export function resetShellHydration(): void {
  hydrated = false
  blockedFallbacks.clear()
}

export function useShellHydrate() {
  return { hydrateShell, resetShellHydration, isShellFallbackBlocked, isShellHydrated }
}
