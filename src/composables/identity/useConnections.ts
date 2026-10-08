import { useI18n } from 'vue-i18n'
import { get, post, del } from '@/api/client'
import type {
  ApiResponse,
  DiscordAuthorizeUrl,
  OAuthProviderConnection,
  ProfileConnections,
} from '@/api/types'
import { safeDiscordAuthorizeUrl } from '@/utils/safeUrl'

export type DiscordAuthorizeIntent = 'profile'

export function providerByKey(
  snapshot: ProfileConnections | null | undefined,
  key: string,
): OAuthProviderConnection | undefined {
  return snapshot?.providers.find((row) => row.key === key)
}

export function useConnections() {
  const { t } = useI18n()

  async function fetchConnections(): Promise<ProfileConnections> {
    const res = await get<ApiResponse<ProfileConnections>>('profile/connections')
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.identity-connections.load_failed'))
  }

  async function syncProvider(provider: string): Promise<ProfileConnections> {
    const res = await post<ApiResponse<ProfileConnections>>(
      `profile/connections/${encodeURIComponent(provider)}/sync`,
    )
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.identity-connections.sync_failed'))
  }

  async function disconnectProvider(provider: string): Promise<void> {
    const res = await del<ApiResponse<null>>(
      `profile/connections/${encodeURIComponent(provider)}`,
    )
    if (res.status !== 'success') {
      throw new Error(res.message ?? t('web.identity-connections.disconnect_failed'))
    }
  }

  async function authorizeUrl(params: {
    intent: DiscordAuthorizeIntent
    return_path: string
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
    syncProvider,
    disconnectProvider,
    authorizeUrl,
  }
}
