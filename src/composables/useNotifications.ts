import { ref } from 'vue'
import { get, post } from '@/api/client'
import type { AppNotification, ApiResponse, UnreadCountPayload } from '@/api/types'

const items = ref<AppNotification[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const unreadCount = ref(0)

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
      return items.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch notifications'
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
      return unreadCount.value
    } catch {
      return unreadCount.value
    }
  }

  async function markAllRead(): Promise<void> {
    await post<ApiResponse<null>>('notifications/read-all')
    items.value = items.value.map((n) => ({ ...n, is_read: true }))
    unreadCount.value = 0
  }

  async function markAsRead(id: number | string): Promise<void> {
    await post<ApiResponse<null>>(`notifications/${id}/read`)
    const idx = items.value.findIndex((n) => n.id === id)
    if (idx >= 0 && !items.value[idx]!.is_read) {
      items.value[idx]!.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  return {
    items,
    loading,
    error,
    unreadCount,
    fetchList,
    fetchUnreadCount,
    markAllRead,
    markAsRead,
  }
}
