import { ref } from 'vue'
import { get, put } from '@/api/client'
import type {
  ApiResponse,
  AssignableRole,
  NotificationAudience,
  NotificationAudienceListPayload,
} from '@/api/types'

const items = ref<NotificationAudience[]>([])
const assignableRoles = ref<AssignableRole[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let loaded = false
let fetchPromise: Promise<void> | null = null

const BASE = 'admin/notification-audiences'

async function load(force = false): Promise<void> {
  if ((loaded || fetchPromise) && !force) return fetchPromise ?? Promise.resolve()

  loading.value = true
  error.value = null

  fetchPromise = (async () => {
    try {
      const res = await get<ApiResponse<NotificationAudienceListPayload>>(BASE)
      if (res.status === 'success' && res.data) {
        items.value = res.data.items
        assignableRoles.value = res.data.assignable_roles
        loaded = true
      } else {
        error.value = res.message ?? 'Failed to load notification audiences'
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load notification audiences'
    } finally {
      loading.value = false
      fetchPromise = null
    }
  })()

  return fetchPromise
}

async function refetch(): Promise<void> {
  loaded = false
  fetchPromise = null
  return load()
}

async function fetchOne(type: string): Promise<NotificationAudience | null> {
  try {
    const res = await get<ApiResponse<NotificationAudience>>(`${BASE}/${type}`)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    error.value = res.message ?? 'Failed to load notification audience'
    return null
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load notification audience'
    return null
  }
}

async function update(
  type: string,
  payload: { notify_subject_user: boolean; roles: string[] },
): Promise<NotificationAudience | null> {
  try {
    const res = await put<ApiResponse<NotificationAudience>>(`${BASE}/${type}`, {
      notify_subject_user: payload.notify_subject_user,
      roles: payload.roles,
      users: [],
    })
    if (res.status === 'success' && res.data) {
      const updated = res.data
      const idx = items.value.findIndex((a) => a.type === updated.type)
      if (idx !== -1) {
        const next = [...items.value]
        next[idx] = updated
        items.value = next
      }
      return updated
    }
    error.value = res.message ?? 'Failed to update notification audience'
    return null
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to update notification audience'
    return null
  }
}

export function useNotificationAudiences() {
  return {
    items,
    assignableRoles,
    loading,
    error,
    load,
    refetch,
    fetchOne,
    update,
  }
}
