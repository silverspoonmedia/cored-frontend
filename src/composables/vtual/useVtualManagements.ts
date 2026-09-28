import { useI18n } from 'vue-i18n'
import { get, post, patch, del } from '@/api/client'
import type { ApiResponse, VtualGrantCapability, VtualManagement, VtualManagementCreatorGrant, VtualManagementInvite, VtualManagementMember } from '@/api/types'
import { useResource } from '@/composables/useResource'

export function useVtualManagements() {
  const { t } = useI18n()
  const base = useResource<VtualManagement>('vtual/managements')

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

  async function grantCreatorCapability(
    managementId: string,
    payload: { member_id: string; creator_id: string; capability: VtualGrantCapability },
  ): Promise<VtualManagementCreatorGrant> {
    const res = await post<ApiResponse<VtualManagementCreatorGrant>>(
      `vtual/managements/${managementId}/creator-grants`,
      payload,
    )
    if (res.status === 'success' && res.data) {
      return res.data as VtualManagementCreatorGrant
    }
    throw new Error(res.message ?? t('web.vtual-managements.errors.grant_save_failed'))
  }

  async function revokeCreatorCapability(managementId: string, grantId: string): Promise<void> {
    const res = await del<ApiResponse<null>>(
      `vtual/managements/${managementId}/creator-grants/${grantId}`,
    )
    if (res.status !== 'success') {
      throw new Error(res.message ?? t('web.vtual-managements.errors.grant_revoke_failed'))
    }
  }

  async function createOrphan(payload: Record<string, unknown>): Promise<VtualManagement> {
    const res = await post<ApiResponse<VtualManagement>>('vtual/managements/orphan', payload)
    if (res.status === 'success' && res.data) {
      return res.data as unknown as VtualManagement
    }
    throw new Error(res.message ?? t('web.vtual-managements.errors.save_failed'))
  }

  return {
    ...base,
    createOrphan,
    inviteMember,
    listInvites,
    cancelInvite,
    updateMember,
    grantCreatorCapability,
    revokeCreatorCapability,
  }
}
