import { ref } from 'vue'
import i18n from '@/i18n'
import { get, post } from '@/api/client'
import { listenPersonalChannel } from '@/composables/useEcho'
import { useAuth } from '@/stores/auth'
import { triggerListingReload } from '@/composables/useListingReload'
import type { AppNotification, ApiResponse, UnreadCountPayload } from '@/api/types'

const items = ref<AppNotification[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const unreadCount = ref(0)
const hasSeededUnread = ref(false)
const hasSeededList = ref(false)
let echoListener: (() => void) | null = null
let notifChannel: BroadcastChannel | null = null

export function resetNotificationState(): void {
  items.value = []
  unreadCount.value = 0
  hasSeededUnread.value = false
  hasSeededList.value = false
  error.value = null
}

export function useNotifications() {
  async function fetchList(limit = 50): Promise<AppNotification[]> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<AppNotification[]>>('notifications', {
        display_mode: 'query',
        limit,
      })
      items.value = res.data ?? []
      hasSeededList.value = true
      return items.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : i18n.global.t('web.notifications.load_failed')
      items.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchUnreadCount(): Promise<number> {
    try {
      const res = await get<ApiResponse<UnreadCountPayload>>('notifications/unread-count')
      unreadCount.value = res.data?.unread ?? 0
      hasSeededUnread.value = true
      return unreadCount.value
    } catch {
      return unreadCount.value
    }
  }

  async function markAllRead(): Promise<void> {
    await post<ApiResponse<null>>('notifications/read-all')
    items.value = items.value.map((n) => ({ ...n, is_read: true }))
    unreadCount.value = 0
    notifChannel?.postMessage({ type: 'read-all' })
  }

  async function markAsRead(id: number | string): Promise<void> {
    await post<ApiResponse<null>>(`notifications/${id}/read`)
    const idx = items.value.findIndex((n) => n.id === id)
    if (idx >= 0 && !items.value[idx]!.is_read) {
      items.value[idx]!.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    notifChannel?.postMessage({ type: 'read', id })
  }

  function startRealtime(): void {
    if (echoListener) return

    const { user } = useAuth()
    const userId = user.value?.id
    if (!userId) return

    if (typeof BroadcastChannel !== 'undefined' && !notifChannel) {
      notifChannel = new BroadcastChannel(`activity-notifications.${userId}`)
      notifChannel.addEventListener('message', (event) => {
        const data = event.data as { type?: string; id?: number | string } | null
        if (!data) return
        if (data.type === 'read-all') {
          unreadCount.value = 0
          items.value = items.value.map((n) => ({ ...n, is_read: true }))
        } else if (data.type === 'read' && data.id != null) {
          const idx = items.value.findIndex((n) => n.id === data.id)
          if (idx >= 0 && !items.value[idx]!.is_read) {
            items.value[idx]!.is_read = true
            unreadCount.value = Math.max(0, unreadCount.value - 1)
          }
        }
      })
    }

    // Personal channel is ref-counted in useEcho.ts (shared with
    // useAuthSelfRealtime) — this detach never leaves the channel while the
    // other consumer is still listening.
    echoListener = listenPersonalChannel({
      '.activity-notification.received': (raw) => {
        const e = raw as { unread_count?: number; table_id?: string }
        if (typeof e.unread_count === 'number') {
          unreadCount.value = e.unread_count
        } else {
          fetchUnreadCount()
        }
        fetchList(5)
        if (typeof e.table_id === 'string') {
          triggerListingReload(e.table_id)
        }
      },
    })
  }

  function stopRealtime(): void {
    if (echoListener) {
      echoListener()
      echoListener = null
    }
    if (notifChannel) {
      notifChannel.close()
      notifChannel = null
    }
  }

  /** Seed the bell count from a shell-hydrate batch payload without a fetch. */
  function seedUnreadCount(n: number): void {
    unreadCount.value = n
    hasSeededUnread.value = true
  }

  function seedList(list: AppNotification[]): void {
    items.value = list
    hasSeededList.value = true
  }

  return {
    items,
    loading,
    error,
    unreadCount,
    hasSeededUnread,
    hasSeededList,
    fetchList,
    fetchUnreadCount,
    markAllRead,
    markAsRead,
    startRealtime,
    stopRealtime,
    seedUnreadCount,
    seedList,
    resetNotificationState,
  }
}
