import { useI18n } from 'vue-i18n'
import { get, post } from '@/api/client'
import type { ApiResponse, VtualManagementInvite } from '@/api/types'

/**
 * Token-based invite respond flow. Gated server-side by email match — any
 * authenticated user may hold a valid token addressed to their account.
 */
export function useVtualInvites() {
  const { t } = useI18n()

  async function fetchInvite(token: string): Promise<VtualManagementInvite> {
    const res = await get<ApiResponse<VtualManagementInvite>>(
      `vtual/invites/respond/${encodeURIComponent(token)}`,
    )
    if (res.status === 'success' && res.data) {
      return res.data as VtualManagementInvite
    }
    throw new Error(res.message ?? t('web.vtual-invites.errors.load_failed'))
  }

  async function acceptInvite(token: string): Promise<VtualManagementInvite> {
    const res = await post<ApiResponse<VtualManagementInvite>>(
      `vtual/invites/respond/${encodeURIComponent(token)}/accept`,
    )
    if (res.status === 'success' && res.data) {
      return res.data as VtualManagementInvite
    }
    throw new Error(res.message ?? t('web.vtual-invites.errors.accept_failed'))
  }

  async function declineInvite(token: string): Promise<VtualManagementInvite> {
    const res = await post<ApiResponse<VtualManagementInvite>>(
      `vtual/invites/respond/${encodeURIComponent(token)}/decline`,
    )
    if (res.status === 'success' && res.data) {
      return res.data as VtualManagementInvite
    }
    throw new Error(res.message ?? t('web.vtual-invites.errors.decline_failed'))
  }

  return { fetchInvite, acceptInvite, declineInvite }
}
