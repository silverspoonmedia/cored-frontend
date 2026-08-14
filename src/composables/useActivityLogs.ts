import { useResource } from '@/composables/useResource'
import { get } from '@/api/client'
import type { ActivityLog, ApiResponse } from '@/api/types'

export function useActivityLogs() {
  const base = useResource<ActivityLog>('activity-logs')

  async function forUser(userId: string | number): Promise<ActivityLog[]> {
    const res = await get<ApiResponse<ActivityLog[]>>(`users/${userId}/activity-logs`, {
      display_mode: 'query',
    })
    return res.data ?? []
  }

  return {
    items: base.items,
    pagination: base.pagination,
    loading: base.loading,
    error: base.error,
    fetchList: base.fetchList,
    fetchOne: base.fetchOne,
    forUser,
  }
}
