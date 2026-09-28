import { useI18n } from 'vue-i18n'
import { patch } from '@/api/client'
import type { ApiResponse, VtualIncident } from '@/api/types'
import { useResource } from '@/composables/useResource'
import {
  subscribeVtualIncidentsRealtime,
  unsubscribeVtualIncidentsRealtime,
} from '@/composables/vtual/useVtualRealtime'

/**
 * Incident triage queue (`/apps/vtual/incidents`).
 *
 * Read + triage only — the queue is fed by the failure paths themselves
 * (`VtualIncidentRecorder`), so nothing here creates or deletes a row. The
 * server decides which triage transition is legal for the actor on each row
 * (`VtualIncidentQueryRowActions`); this composable only routes the click.
 *
 * `private-vtual.incidents` carries ids + enums and nothing else: the incident
 * `title`/`detail` are free text assembled from platform errors and fan out to
 * every staff subscriber at once. A ping therefore means **refetch**, never a
 * local row patch. The channel itself lives in `useVtualRealtime` — one home per
 * channel name, so two composables can never bind it twice.
 */

/** Triage transitions the queue exposes as row actions. */
export type VtualIncidentTriageAction = 'acknowledge' | 'resolve'

/**
 * Action key → the status the endpoint expects. The status is derived here, not
 * taken from the row payload: a tampered action set cannot ask for a transition
 * the row-action builder would not have offered.
 */
const TRIAGE_STATUS: Record<VtualIncidentTriageAction, string> = {
  acknowledge: 'acknowledged',
  resolve: 'resolved',
}

export function useVtualIncidents() {
  const { t } = useI18n()
  const base = useResource<VtualIncident>('vtual/admin/incidents')

  /**
   * Apply a triage transition. The endpoint re-checks `manage vtual incident`,
   * so a stale row action fails loudly instead of silently doing nothing.
   */
  async function triage(id: string, action: VtualIncidentTriageAction): Promise<VtualIncident> {
    const res = await patch<ApiResponse<VtualIncident>>(`vtual/admin/incidents/${id}/status`, {
      status: TRIAGE_STATUS[action],
    })

    if (res.status === 'success' && res.data) return res.data
    throw new Error(res.message ?? t('web.vtual.incidents.errors.action_failed'))
  }

  return {
    ...base,
    triage,
    subscribeRealtime: subscribeVtualIncidentsRealtime,
    unsubscribeRealtime: unsubscribeVtualIncidentsRealtime,
  }
}
