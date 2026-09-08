import { useI18n } from 'vue-i18n'
import { useResource } from '@/composables/useResource'
import { patch } from '@/api/client'
import type { ErrorLog, ApiResponse } from '@/api/types'

export function useErrorLogs() {
  const { t } = useI18n()
  const base = useResource<ErrorLog>('error-logs')

  async function updateStatus(id: number | string, status: string): Promise<ErrorLog> {
    const res = await patch<ApiResponse<ErrorLog>>(`error-logs/${id}/status`, { status })
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.error-log.update_failed'))
  }

  return {
    items: base.items,
    pagination: base.pagination,
    loading: base.loading,
    error: base.error,
    fetchList: base.fetchList,
    fetchOne: base.fetchOne,
    updateStatus,
  }
}
