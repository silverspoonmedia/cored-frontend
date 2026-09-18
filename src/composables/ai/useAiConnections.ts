import { useResource } from '@/composables/useResource'
import { post } from '@/api/client'
import i18n from '@/i18n'
import type { AiConnection, AiConnectionTestPayload, ApiResponse } from '@/api/types'

/**
 * Central AI connections (`/api/v1/ai/connections`).
 *
 * The list endpoint is a query-mode list: row controls come from
 * `row.actions[]` (test / default / edit / delete) built server-side by
 * `AiConnectionQueryRowActions`. Only the manual Test payload needs unwrapping
 * here — it nests the refreshed connection beside the probe result.
 */
export function useAiConnections() {
  const base = useResource<AiConnection>('ai/connections')

  /** Manual Test gate: on success the row flips to `active` + `verified_at`. */
  async function test(id: string): Promise<AiConnectionTestPayload> {
    const res = await post<ApiResponse<AiConnectionTestPayload>>(`ai/connections/${id}/test`)
    if (res.data) return res.data
    throw new Error(res.message ?? i18n.global.t('web.ai-connections.test_failed'))
  }

  /** Promote to the single default connection (demotes every other row). */
  async function setDefault(id: string): Promise<AiConnection> {
    const res = await post<ApiResponse<AiConnection>>(`ai/connections/${id}/default`)
    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? i18n.global.t('web.ai-connections.default_failed'))
  }

  return {
    items: base.items,
    loading: base.loading,
    error: base.error,
    fetchList: base.fetchList,
    fetchOne: base.fetchOne,
    // PATCH-only on the backend: an omitted field keeps its stored value.
    patchOne: base.patchOne,
    create: base.create,
    destroy: base.destroy,
    test,
    setDefault,
  }
}
