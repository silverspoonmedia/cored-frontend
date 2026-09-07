import { useI18n } from 'vue-i18n'
import { get, post, del } from '@/api/client'
import { ApiError, type ApiResponse } from '@/api/types'
import type { VtualEventPagedList, VtualManagementEvent } from '@/api/types'
import { useResource } from '@/composables/useResource'

export function useVtualEvents() {
  const { t } = useI18n()
  const base = useResource<VtualManagementEvent>('vtual/events')

  async function fetchPagedList(params?: { page?: number; per_page?: number }): Promise<VtualEventPagedList> {
    const res = await get<ApiResponse<VtualManagementEvent[] | VtualEventPagedList>>('vtual/events', params)
    if (res.status === 'success' && res.data) {
      const data = res.data as VtualEventPagedList
      if (Array.isArray(data)) {
        return { items: data, pagination: { current_page: 1, per_page: data.length, total: data.length, has_more: false } }
      }
      return data
    }
    throw new Error(res.message ?? t('web.vtual-events.errors.load_failed'))
  }

  async function listForManagement(managementId: string): Promise<VtualManagementEvent[]> {
    const res = await get<ApiResponse<VtualManagementEvent[] | VtualEventPagedList>>(
      `vtual/managements/${managementId}/events`,
    )
    if (res.status === 'success' && res.data) {
      const data = res.data as VtualEventPagedList
      return Array.isArray(data) ? data : data.items
    }
    return []
  }

  async function createEvent(managementId: string, payload: Record<string, unknown>): Promise<VtualManagementEvent> {
    try {
      const res = await post<ApiResponse<VtualManagementEvent>>(
        `vtual/managements/${managementId}/events`,
        payload,
      )
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? t('web.vtual-events.errors.save_failed'))
    } catch (e) {
      if (e instanceof ApiError) throw e
      throw new Error(e instanceof Error ? e.message : t('web.vtual-events.errors.save_failed'))
    }
  }

  async function cancelEvent(managementId: string, eventId: string): Promise<VtualManagementEvent> {
    const res = await del<ApiResponse<VtualManagementEvent>>(
      `vtual/managements/${managementId}/events/${eventId}`,
    )
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.vtual-events.errors.cancel_failed'))
  }

  return {
    ...base,
    fetchPagedList,
    listForManagement,
    createEvent,
    cancelEvent,
  }
}
