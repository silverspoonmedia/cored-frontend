import { useI18n } from 'vue-i18n'
import { get, post, patch, del } from '@/api/client'
import type { ApiResponse, VtualManagement, VtualManagementInvite, VtualManagementMember } from '@/api/types'
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

  async function listMembers(managementId: string): Promise<VtualManagementMember[]> {
    const res = await get<ApiResponse<VtualManagementMember[]>>(
      `vtual/managements/${managementId}/members`,
    )
    return (res.data ?? []) as VtualManagementMember[]
  }

  async function inviteMember(managementId: string, payload: { email: string; role: string }): Promise<VtualManagementInvite> {
    const res = await post<ApiResponse<VtualManagementInvite>>(
      `vtual/managements/${managementId}/invites`,
      payload,
    )
    if (res.status === 'success' && res.data) {
      return res.data as VtualManagementInvite
    }
    throw new Error(res.message ?? t('web.vtual-managements.errors.invite_send_failed'))
  }

  async function listInvites(managementId: string): Promise<VtualManagementInvite[]> {
    const res = await get<ApiResponse<VtualManagementInvite[]>>(
      `vtual/managements/${managementId}/invites`,
    )
    return (res.data ?? []) as VtualManagementInvite[]
  }

  async function cancelInvite(managementId: string, inviteId: string): Promise<VtualManagementInvite> {
    const res = await del<ApiResponse<VtualManagementInvite>>(
      `vtual/managements/${managementId}/invites/${inviteId}`,
    )
    if (res.status === 'success' && res.data) {
      return res.data as VtualManagementInvite
    }
    throw new Error(res.message ?? t('web.vtual-managements.errors.invite_cancel_failed'))
  }

  async function updateMember(managementId: string, memberId: string, payload: { role: string }): Promise<VtualManagementMember> {
    const res = await patch<ApiResponse<VtualManagementMember>>(
      `vtual/managements/${managementId}/members/${memberId}`,
      payload,
    )
    if (res.status === 'success' && res.data) {
      return res.data as VtualManagementMember
    }
    throw new Error(res.message ?? t('web.vtual-managements.errors.member_update_failed'))
  }

  async function removeMember(managementId: string, memberId: string): Promise<void> {
    const res = await del<ApiResponse<null>>(
      `vtual/managements/${managementId}/members/${memberId}`,
    )
    if (res.status !== 'success') {
      throw new Error(res.message ?? t('web.vtual-managements.errors.member_remove_failed'))
    }
  }

  return {
    ...base,
    assignCreator,
    unassignCreator,
    listMembers,
    inviteMember,
    listInvites,
    cancelInvite,
    updateMember,
    removeMember,
  }
}
