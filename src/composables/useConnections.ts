import { get, del } from '@/api/client'
import type { ApiResponse, DiscordAuthorizeUrl, ProfileConnections } from '@/api/types'

export type DiscordAuthorizeIntent =
  | 'profile'
  | 'claim_verify'
  | 'claim_channel'
  | 'channel_claim_verify'

export function useConnections() {
  async function fetchConnections(): Promise<ProfileConnections> {
    const res = await get<ApiResponse<ProfileConnections>>('profile/connections')
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? 'Failed to load connections')
  }

  async function disconnectDiscord(): Promise<void> {
    const res = await del<ApiResponse<null>>('profile/connections/discord')
    if (res.status !== 'success') {
      throw new Error(res.message ?? 'Failed to disconnect Discord')
    }
  }

  async function authorizeUrl(params: {
    intent: DiscordAuthorizeIntent
    return_path: string
    slug?: string
    claim_id?: string
    channel_id?: string
  }): Promise<string> {
    const res = await get<ApiResponse<DiscordAuthorizeUrl>>('auth/discord/authorize-url', params)
    if (res.status === 'success' && res.data?.url) {
      return res.data.url
    }
    throw new Error(res.message ?? 'Failed to start Discord authorization')
  }

  return {
    fetchConnections,
    disconnectDiscord,
    authorizeUrl,
  }
}
