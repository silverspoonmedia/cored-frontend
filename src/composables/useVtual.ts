import { get, post, patch, del } from '@/api/client'
import type {
  ApiResponse,
  VtualCreator,
  VtualPlatform,
  VtualPlatformCredential,
  VtualChannel,
  VtualChannelClaim,
  VtualCreatorClaim,
  VtualVtuberProfile,
  VtualExternalLink,
} from '@/api/types'

export function useVtual() {
  async function fetchOwned(): Promise<VtualCreator[]> {
    const res = await get<ApiResponse<VtualCreator[]>>('vtual/creators/owned')
    if (res.status === 'success' && res.data) {
      return res.data
    }
    return []
  }

  async function fetchOrphans(): Promise<VtualCreator[]> {
    const res = await get<ApiResponse<VtualCreator[]>>('vtual/creators/orphans', {
      display_mode: 'query',
    })
    if (res.status === 'success' && res.data) {
      return res.data
    }
    return []
  }

  async function fetchOrphan(id: string): Promise<VtualCreator> {
    const res = await get<ApiResponse<VtualCreator>>(`vtual/creators/orphans/${id}`)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? 'Failed to fetch orphan')
  }

  async function createOrphan(data: Record<string, unknown>): Promise<VtualCreator> {
    const res = await post<ApiResponse<VtualCreator>>('vtual/creators/orphan', data)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? 'Failed to create orphan')
  }

  async function updateCreator(id: string, data: Record<string, unknown>): Promise<VtualCreator> {
    const res = await patch<ApiResponse<VtualCreator>>(`vtual/creators/${id}`, data)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? 'Failed to update creator')
  }

  async function mergeCreator(sourceId: string, destinationId: string): Promise<VtualCreator> {
    const res = await post<ApiResponse<VtualCreator>>(`vtual/creators/${sourceId}/merge`, {
      destination_id: destinationId,
    })
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? 'Failed to merge creators')
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
    throw new Error(res.message ?? 'Failed to fetch credential')
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
    throw new Error(res.message ?? 'Failed to create credential')
  }

  async function updateCredential(
    id: string,
    data: Record<string, unknown>,
  ): Promise<VtualPlatformCredential> {
    const res = await patch<ApiResponse<VtualPlatformCredential>>(`vtual/admin/credentials/${id}`, data)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? 'Failed to update credential')
  }

  async function deleteCredential(id: string): Promise<void> {
    await del<ApiResponse<null>>(`vtual/admin/credentials/${id}`)
  }

  async function revokeCredential(id: string): Promise<VtualPlatformCredential> {
    const res = await post<ApiResponse<VtualPlatformCredential>>(`vtual/admin/credentials/${id}/revoke`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to revoke')
  }

  async function testCredential(id: string): Promise<VtualPlatformCredential> {
    const res = await post<ApiResponse<VtualPlatformCredential>>(`vtual/admin/credentials/${id}/test`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to test')
  }

  // --- Profile show ---

  async function fetchCreator(id: string): Promise<VtualCreator> {
    const res = await get<ApiResponse<VtualCreator>>(`vtual/creators/${id}`)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? 'Failed to fetch creator')
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
  async function refreshChannel(channelId: string): Promise<VtualChannel> {
    const res = await post<ApiResponse<VtualChannel>>(`vtual/channels/${channelId}/refresh`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to refresh channel')
  }

  async function archiveChannel(channelId: string): Promise<VtualChannel> {
    const res = await post<ApiResponse<VtualChannel>>(`vtual/channels/${channelId}/archive`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to archive channel')
  }

  async function restoreChannel(channelId: string): Promise<VtualChannel> {
    const res = await post<ApiResponse<VtualChannel>>(`vtual/channels/${channelId}/restore`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to restore channel')
  }

  async function promoteChannel(channelId: string): Promise<VtualChannel> {
    const res = await post<ApiResponse<VtualChannel>>(`vtual/channels/${channelId}/promote`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to promote channel')
  }

  // Channel claim actions
  async function addChannel(creatorId: string, platformKey: string, profile: string): Promise<VtualChannelClaim | VtualChannel> {
    const res = await post<ApiResponse<VtualChannelClaim | VtualChannel>>(
      `vtual/creators/${creatorId}/channels`,
      { platform_key: platformKey, profile },
    )
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to add channel')
  }

  async function verifyChannelClaim(claimId: string): Promise<VtualChannelClaim> {
    const res = await post<ApiResponse<VtualChannelClaim>>(`vtual/channel-claims/${claimId}/verify`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to verify channel claim')
  }

  async function verifyDiscordChannelClaim(claimId: string): Promise<VtualChannelClaim> {
    const res = await post<ApiResponse<VtualChannelClaim>>(`vtual/channel-claims/${claimId}/verify-discord`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed Discord verify')
  }

  async function cancelChannelClaim(claimId: string): Promise<VtualChannelClaim> {
    const res = await post<ApiResponse<VtualChannelClaim>>(`vtual/channel-claims/${claimId}/cancel`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to cancel claim')
  }

  async function acceptAnywayChannelClaim(claimId: string): Promise<VtualChannelClaim> {
    const res = await post<ApiResponse<VtualChannelClaim>>(`vtual/channel-claims/${claimId}/accept-anyway`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to accept claim')
  }

  // Links
  async function addLink(creatorId: string, data: { label: string; url: string; kind: string }): Promise<VtualExternalLink> {
    const res = await post<ApiResponse<VtualExternalLink>>(`vtual/creators/${creatorId}/links`, data)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to add link')
  }

  async function updateLink(linkId: string, data: Partial<{ label: string; url: string; kind: string }>): Promise<VtualExternalLink> {
    const res = await patch<ApiResponse<VtualExternalLink>>(`vtual/links/${linkId}`, data)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to update link')
  }

  async function deleteLink(linkId: string): Promise<void> {
    await del<ApiResponse<null>>(`vtual/links/${linkId}`)
  }

  // --- Vtuber public profile ---

  async function fetchVtuberProfile(slugOrId: string): Promise<VtualVtuberProfile> {
    const res = await get<ApiResponse<VtualVtuberProfile>>(`vtual/vtubers/${slugOrId}`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to fetch profile')
  }

  // --- Creator claims ---

  async function fetchClaimable(): Promise<VtualCreator[]> {
    const res = await get<ApiResponse<VtualCreator[]>>('vtual/claims/claimable-creators')
    if (res.status === 'success' && res.data) return res.data
    return []
  }

  async function fetchMyClaims(): Promise<VtualCreatorClaim[]> {
    const res = await get<ApiResponse<VtualCreatorClaim[]>>('vtual/claims/mine')
    if (res.status === 'success' && res.data) return res.data
    return []
  }

  async function fetchClaim(claimId: string): Promise<VtualCreatorClaim> {
    const res = await get<ApiResponse<VtualCreatorClaim>>(`vtual/claims/${claimId}`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to fetch claim')
  }

  async function startClaim(creatorId: string, channelId: string): Promise<VtualCreatorClaim> {
    const res = await post<ApiResponse<VtualCreatorClaim>>('vtual/claims', {
      creator_id: creatorId,
      channel_id: channelId,
    })
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to start claim')
  }

  async function verifyClaim(claimId: string): Promise<VtualCreatorClaim> {
    const res = await post<ApiResponse<VtualCreatorClaim>>(`vtual/claims/${claimId}/verify`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to verify claim')
  }

  async function verifyDiscordClaim(claimId: string): Promise<VtualCreatorClaim> {
    const res = await post<ApiResponse<VtualCreatorClaim>>(`vtual/claims/${claimId}/verify-discord`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed Discord verify')
  }

  async function cancelClaim(claimId: string): Promise<VtualCreatorClaim> {
    const res = await post<ApiResponse<VtualCreatorClaim>>(`vtual/claims/${claimId}/cancel`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to cancel claim')
  }

  async function acceptAnywayClaim(claimId: string): Promise<VtualCreatorClaim> {
    const res = await post<ApiResponse<VtualCreatorClaim>>(`vtual/claims/${claimId}/accept-anyway`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? 'Failed to accept claim')
  }

  return {
    fetchOwned,
    fetchOrphans,
    fetchOrphan,
    createOrphan,
    updateCreator,
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
    refreshChannel,
    archiveChannel,
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
    fetchClaimable,
    fetchMyClaims,
    fetchClaim,
    startClaim,
    verifyClaim,
    verifyDiscordClaim,
    cancelClaim,
    acceptAnywayClaim,
  }
}
