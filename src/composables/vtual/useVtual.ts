import { get, post, patch, del } from '@/api/client'
import type {
  ApiResponse,
  PagedList,
  VtualCreator,
  VtualPlatform,
  VtualPlatformCredential,
  VtualPlatformCredentialTestPayload,
  VtualChannel,
  VtualChannelClaim,
  VtualCreatorClaim,
  VtualVtuberProfile,
  VtualExternalLink,
} from '@/api/types'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ListParams } from '@/composables/useResource'
import { emptyListPagination, unwrapListPayload } from '@/composables/useResource'

export function credentialFromTestResponse(
  res: ApiResponse<VtualPlatformCredentialTestPayload>,
  fallbackMessage: string,
): VtualPlatformCredential {
  if (res.status === 'success' && res.data?.credential) {
    return res.data.credential
  }
  throw new Error(res.message ?? fallbackMessage)
}

export function useVtual() {
  const { t } = useI18n()
  const orphanPagination = ref(emptyListPagination())

  async function fetchOwned(): Promise<VtualCreator[]> {
    const res = await get<ApiResponse<VtualCreator[]>>('vtual/creators/owned')
    if (res.status === 'success' && res.data) {
      return res.data
    }
    return []
  }

  async function fetchOrphans(params?: ListParams): Promise<VtualCreator[]> {
    const query: Record<string, unknown> = { display_mode: 'query', ...params }
    const res = await get<ApiResponse<VtualCreator[] | PagedList<VtualCreator>>>('vtual/creators/orphans', query)
    if (res.status === 'success' && res.data) {
      const parsed = unwrapListPayload<VtualCreator>(res.data)
      orphanPagination.value = parsed.pagination
      return parsed.items
    }
    orphanPagination.value = emptyListPagination()
    return []
  }

  async function fetchOrphan(id: string): Promise<VtualCreator> {
    const res = await get<ApiResponse<VtualCreator>>(`vtual/creators/orphans/${id}`)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.vtual-orphans.errors.load_failed'))
  }

  async function createOrphan(data: Record<string, unknown>): Promise<VtualCreator> {
    const res = await post<ApiResponse<VtualCreator>>('vtual/creators/orphan', data)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.vtual-orphans.errors.save_failed'))
  }

  async function updateCreator(id: string, data: Record<string, unknown>): Promise<VtualCreator> {
    const res = await patch<ApiResponse<VtualCreator>>(`vtual/creators/${id}`, data)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.vtual.profiles.errors.update_failed'))
  }

  async function deleteCreator(id: string): Promise<void> {
    const res = await del<ApiResponse<null>>(`vtual/creators/${id}`)
    if (res.status === 'success') {
      return
    }
    throw new Error(res.message ?? t('web.vtual-orphans.errors.archive_failed'))
  }

  async function mergeCreator(sourceId: string, destinationId: string): Promise<VtualCreator> {
    const res = await post<ApiResponse<VtualCreator>>(`vtual/creators/${sourceId}/merge`, {
      destination_id: destinationId,
    })
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.vtual.profiles.errors.merge_failed'))
  }

  async function fetchPlatforms(): Promise<VtualPlatform[]> {
    const res = await get<ApiResponse<VtualPlatform[]>>('vtual/platforms')
    if (res.status === 'success' && res.data) {
      return res.data
    }
    return []
  }

  async function fetchCredentials(platformId: string): Promise<VtualPlatformCredential[]> {
    const res = await get<ApiResponse<VtualPlatformCredential[]>>(
      `vtual/admin/platforms/${platformId}/credentials`,
    )
    if (res.status === 'success' && res.data) {
      return res.data
    }
    return []
  }

  async function fetchCredential(id: string): Promise<VtualPlatformCredential> {
    const res = await get<ApiResponse<VtualPlatformCredential>>(`vtual/admin/credentials/${id}`)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.vtual-platform-credentials.load_failed'))
  }

  async function createCredential(
    platformId: string,
    data: Record<string, unknown>,
  ): Promise<VtualPlatformCredential> {
    const res = await post<ApiResponse<VtualPlatformCredential>>(
      `vtual/admin/platforms/${platformId}/credentials`,
      data,
    )
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.vtual-platform-credentials.save_failed'))
  }

  async function updateCredential(
    id: string,
    data: Record<string, unknown>,
  ): Promise<VtualPlatformCredential> {
    const res = await patch<ApiResponse<VtualPlatformCredential>>(`vtual/admin/credentials/${id}`, data)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.vtual-platform-credentials.save_failed'))
  }

  async function deleteCredential(id: string): Promise<void> {
    await del<ApiResponse<null>>(`vtual/admin/credentials/${id}`)
  }

  async function revokeCredential(id: string): Promise<VtualPlatformCredential> {
    const res = await post<ApiResponse<VtualPlatformCredential>>(`vtual/admin/credentials/${id}/revoke`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual.credentials.revoke_failed'))
  }

  async function testCredential(id: string): Promise<VtualPlatformCredential> {
    const res = await post<ApiResponse<VtualPlatformCredentialTestPayload>>(`vtual/admin/credentials/${id}/test`)
    return credentialFromTestResponse(res, t('web.vtual.credentials.test_failed'))
  }

  // --- Profile show ---

  async function fetchCreator(id: string): Promise<VtualCreator> {
    const res = await get<ApiResponse<VtualCreator>>(`vtual/creators/${id}`)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.vtual.profiles.errors.load_failed'))
  }

  async function fetchChannels(creatorId: string): Promise<VtualChannel[]> {
    const res = await get<ApiResponse<VtualChannel[]>>(`vtual/creators/${creatorId}/channels`)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    return []
  }

  async function fetchArchivedChannels(creatorId: string): Promise<VtualChannel[]> {
    const res = await get<ApiResponse<VtualChannel[]>>(`vtual/creators/${creatorId}/channels/archived`)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    return []
  }

  async function fetchChannelClaims(creatorId: string): Promise<VtualChannelClaim[]> {
    const res = await get<ApiResponse<VtualChannelClaim[]>>(`vtual/creators/${creatorId}/channel-claims`)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    return []
  }

  async function fetchLinks(creatorId: string): Promise<VtualExternalLink[]> {
    const res = await get<ApiResponse<VtualExternalLink[]>>(`vtual/creators/${creatorId}/links`)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    return []
  }

  // Channel actions
  async function archiveChannel(channelId: string): Promise<VtualChannel> {
    const res = await post<ApiResponse<VtualChannel>>(`vtual/channels/${channelId}/archive`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual.profiles.errors.archive_failed'))
  }

  async function deletePendingChannel(channelId: string): Promise<void> {
    const res = await del<ApiResponse<null>>(`vtual/channels/${channelId}`)
    if (res.status === 'success') {
      return
    }
    throw new Error(res.message ?? t('web.vtual.profiles.errors.channel_delete_failed'))
  }

  async function restoreChannel(channelId: string): Promise<VtualChannel> {
    const res = await post<ApiResponse<VtualChannel>>(`vtual/channels/${channelId}/restore`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual.profiles.errors.restore_failed'))
  }

  async function promoteChannel(channelId: string): Promise<VtualChannel> {
    const res = await post<ApiResponse<VtualChannel>>(`vtual/channels/${channelId}/promote`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual.profiles.errors.promote_failed'))
  }

  // Channel claim actions
  async function addChannel(creatorId: string, platformKey: string, profile: string): Promise<VtualChannelClaim | VtualChannel> {
    const res = await post<ApiResponse<VtualChannelClaim | VtualChannel>>(
      `vtual/creators/${creatorId}/channels`,
      { platform_key: platformKey, profile },
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual.profiles.errors.channel_add_failed'))
  }

  async function verifyChannelClaim(claimId: string): Promise<VtualChannelClaim> {
    const res = await post<ApiResponse<VtualChannelClaim>>(`vtual/channel-claims/${claimId}/verify`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual.profiles.errors.verify_failed'))
  }

  async function verifyDiscordChannelClaim(claimId: string): Promise<VtualChannelClaim> {
    const res = await post<ApiResponse<VtualChannelClaim>>(`vtual/channel-claims/${claimId}/verify-discord`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual-vtuber.errors.discord_verify_failed'))
  }

  async function cancelChannelClaim(claimId: string): Promise<VtualChannelClaim> {
    const res = await post<ApiResponse<VtualChannelClaim>>(`vtual/channel-claims/${claimId}/cancel`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual.profiles.errors.cancel_failed'))
  }

  async function acceptAnywayChannelClaim(claimId: string): Promise<VtualChannelClaim> {
    const res = await post<ApiResponse<VtualChannelClaim>>(`vtual/channel-claims/${claimId}/accept-anyway`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual.profiles.errors.accept_failed'))
  }

  // Links
  async function addLink(creatorId: string, data: { label: string; url: string; kind: string }): Promise<VtualExternalLink> {
    const res = await post<ApiResponse<VtualExternalLink>>(`vtual/creators/${creatorId}/links`, data)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual.profiles.errors.link_save_failed'))
  }

  async function updateLink(linkId: string, data: Partial<{ label: string; url: string; kind: string }>): Promise<VtualExternalLink> {
    const res = await patch<ApiResponse<VtualExternalLink>>(`vtual/links/${linkId}`, data)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual.profiles.errors.update_failed'))
  }

  async function deleteLink(linkId: string): Promise<void> {
    await del<ApiResponse<null>>(`vtual/links/${linkId}`)
  }

  // --- Vtuber public profile ---

  async function fetchVtuberProfile(slugOrId: string): Promise<VtualVtuberProfile> {
    const res = await get<ApiResponse<VtualVtuberProfile>>(`vtual/vtubers/${slugOrId}`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual-vtuber.show.errors.load_failed'))
  }

  // --- Creator claims ---

  async function fetchMyClaims(): Promise<VtualCreatorClaim[]> {
    const res = await get<ApiResponse<VtualCreatorClaim[]>>('vtual/claims/mine')
    if (res.status === 'success' && res.data) return res.data
    return []
  }

  async function fetchClaim(claimId: string): Promise<VtualCreatorClaim> {
    const res = await get<ApiResponse<VtualCreatorClaim>>(`vtual/claims/${claimId}`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual-vtuber.errors.load_failed'))
  }

  async function startClaim(creatorId: string, channelId: string): Promise<VtualCreatorClaim> {
    const res = await post<ApiResponse<VtualCreatorClaim>>('vtual/claims', {
      creator_id: creatorId,
      channel_id: channelId,
    })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual-vtuber.errors.start_failed'))
  }

  async function verifyClaim(claimId: string): Promise<VtualCreatorClaim> {
    const res = await post<ApiResponse<VtualCreatorClaim>>(`vtual/claims/${claimId}/verify`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual-vtuber.errors.verify_failed'))
  }

  async function verifyDiscordClaim(claimId: string): Promise<VtualCreatorClaim> {
    const res = await post<ApiResponse<VtualCreatorClaim>>(`vtual/claims/${claimId}/verify-discord`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual-vtuber.errors.discord_verify_failed'))
  }

  async function cancelClaim(claimId: string): Promise<VtualCreatorClaim> {
    const res = await post<ApiResponse<VtualCreatorClaim>>(`vtual/claims/${claimId}/cancel`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual.profiles.errors.cancel_failed'))
  }

  async function acceptAnywayClaim(claimId: string): Promise<VtualCreatorClaim> {
    const res = await post<ApiResponse<VtualCreatorClaim>>(`vtual/claims/${claimId}/accept-anyway`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual.profiles.errors.accept_failed'))
  }

  return {
    fetchOwned,
    fetchOrphans,
    orphanPagination,
    fetchOrphan,
    createOrphan,
    updateCreator,
    deleteCreator,
    mergeCreator,
    fetchPlatforms,
    fetchCredentials,
    fetchCredential,
    createCredential,
    updateCredential,
    deleteCredential,
    revokeCredential,
    testCredential,
    fetchCreator,
    fetchChannels,
    fetchArchivedChannels,
    fetchChannelClaims,
    fetchLinks,
    archiveChannel,
    deletePendingChannel,
    restoreChannel,
    promoteChannel,
    addChannel,
    verifyChannelClaim,
    verifyDiscordChannelClaim,
    cancelChannelClaim,
    acceptAnywayChannelClaim,
    addLink,
    updateLink,
    deleteLink,
    fetchVtuberProfile,
    fetchMyClaims,
    fetchClaim,
    startClaim,
    verifyClaim,
    verifyDiscordClaim,
    cancelClaim,
    acceptAnywayClaim,
  }
}
