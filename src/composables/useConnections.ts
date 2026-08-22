import { useI18n } from 'vue-i18n'
import { get, del } from '@/api/client'
import type { ApiResponse, DiscordAuthorizeUrl, ProfileConnections } from '@/api/types'
import { safeDiscordAuthorizeUrl } from '@/utils/safeUrl'

export type DiscordAuthorizeIntent =
  | 'profile'
  | 'claim_verify'
  | 'claim_channel'
  | 'channel_claim_verify'

export function useConnections() {
  const { t } = useI18n()

  async function fetchConnections(): Promise<ProfileConnections> {
    const res = await get<ApiResponse<ProfileConnections>>('profile/connections')
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.identity-connections.load_failed'))
  }

  async function disconnectDiscord(): Promise<void> {
    const res = await del<ApiResponse<null>>('profile/connections/discord')
    if (res.status !== 'success') {
      throw new Error(res.message ?? t('web.identity-connections.disconnect_failed'))
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
      const safeUrl = safeDiscordAuthorizeUrl(res.data.url)
      if (safeUrl) {
        return safeUrl
      }
    }
    throw new Error(res.message ?? t('web.identity-connections.authorization_failed'))
  }

  return {
    fetchConnections,
    disconnectDiscord,
    authorizeUrl,
  }
}
