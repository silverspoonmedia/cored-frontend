import { useI18n } from 'vue-i18n'
import { get, post, del } from '@/api/client'
import type { ApiResponse, VtualCreatorInvite, VtualCreatorInviteCandidate } from '@/api/types'

/**
 * vTuber-profile invite management for a management org (list/send/cancel)
 * plus the token-based respond flow (kind=creator). Gated server-side by
 * email match — any authenticated user may hold a valid token addressed to
 * their account.
 */
export function useVtualCreatorInvites() {
  const { t } = useI18n()

  async function listInvites(managementId: string): Promise<VtualCreatorInvite[]> {
    const res = await get<ApiResponse<VtualCreatorInvite[]>>(
      `vtual/managements/${managementId}/creator-invites`,
    )
    return (res.data ?? []) as VtualCreatorInvite[]
  }

  async function inviteCreator(
    managementId: string,
    payload: { email: string; mode: string; creator_id?: string; new_display_name?: string },
  ): Promise<VtualCreatorInvite> {
    const res = await post<ApiResponse<VtualCreatorInvite>>(
      `vtual/managements/${managementId}/creator-invites`,
      payload,
    )
    if (res.status === 'success' && res.data) {
      return res.data as VtualCreatorInvite
    }
    throw new Error(res.message ?? t('web.vtual-managements.creator_invites.errors.send_failed'))
  }

  async function cancelInvite(managementId: string, inviteId: string): Promise<VtualCreatorInvite> {
    const res = await del<ApiResponse<VtualCreatorInvite>>(
      `vtual/managements/${managementId}/creator-invites/${inviteId}`,
    )
    if (res.status === 'success' && res.data) {
      return res.data as VtualCreatorInvite
    }
    throw new Error(res.message ?? t('web.vtual-managements.creator_invites.errors.cancel_failed'))
  }

  async function fetchCandidates(managementId: string, email: string): Promise<VtualCreatorInviteCandidate[]> {
    const res = await get<ApiResponse<VtualCreatorInviteCandidate[]>>(
      `vtual/managements/${managementId}/creator-invite-candidates`,
      { email },
    )
    return (res.data ?? []) as VtualCreatorInviteCandidate[]
  }

  async function fetchInvite(token: string): Promise<VtualCreatorInvite> {
    const res = await get<ApiResponse<VtualCreatorInvite>>(
      `vtual/creator-invites/respond/${encodeURIComponent(token)}`,
    )
    if (res.status === 'success' && res.data) {
      return res.data as VtualCreatorInvite
    }
    throw new Error(res.message ?? t('web.vtual-invites.errors.load_failed'))
  }

  async function acceptInvite(token: string): Promise<VtualCreatorInvite> {
    const res = await post<ApiResponse<VtualCreatorInvite>>(
      `vtual/creator-invites/respond/${encodeURIComponent(token)}/accept`,
    )
    if (res.status === 'success' && res.data) {
      return res.data as VtualCreatorInvite
    }
    throw new Error(res.message ?? t('web.vtual-invites.errors.accept_failed'))
  }

  async function declineInvite(token: string): Promise<VtualCreatorInvite> {
    const res = await post<ApiResponse<VtualCreatorInvite>>(
      `vtual/creator-invites/respond/${encodeURIComponent(token)}/decline`,
    )
    if (res.status === 'success' && res.data) {
      return res.data as VtualCreatorInvite
    }
    throw new Error(res.message ?? t('web.vtual-invites.errors.decline_failed'))
  }

  return {
    listInvites,
    inviteCreator,
    cancelInvite,
    fetchCandidates,
    fetchInvite,
    acceptInvite,
    declineInvite,
  }
}
