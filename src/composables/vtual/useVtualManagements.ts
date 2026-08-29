import { useI18n } from 'vue-i18n'
import { post, del } from '@/api/client'
import type { ApiResponse, VtualManagement } from '@/api/types'
import { useResource } from '@/composables/useResource'

export function useVtualManagements() {
  const { t } = useI18n()
  const base = useResource<VtualManagement>('vtual/managements')

  async function assignCreator(managementId: string, creatorId: string): Promise<VtualManagement> {
    const res = await post<ApiResponse<{ management: VtualManagement }>>(
      `vtual/managements/${managementId}/creators`,
      { creator_id: creatorId },
    )
    if (res.status === 'success' && res.data?.management) {
      return res.data.management
    }
    throw new Error(res.message ?? t('web.vtual-managements.errors.assign_failed'))
  }

  async function unassignCreator(managementId: string, creatorId: string): Promise<VtualManagement> {
    const res = await del<ApiResponse<VtualManagement>>(
      `vtual/managements/${managementId}/creators/${creatorId}`,
    )
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.vtual-managements.errors.unassign_failed'))
  }

  return {
    ...base,
    assignCreator,
    unassignCreator,
  }
}
