<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import { useVtualIncidents } from '@/composables/vtual/useVtualIncidents'
import { useServerDataTable } from '@/composables/useServerDataTable'
import { useAlert } from '@/composables/useAlert'
import { useEchoResync } from '@/composables/useEcho'
import type { ListParams } from '@/composables/useResource'
import type { QueryRowAction, VtualIncident } from '@/api/types'
import { confirmQueryMutate, mapQueryRowActions } from '@/utils/mapQueryRowActions'

/**
 * Integration incident triage queue (`/apps/vtual/incidents`).
 *
 * Rows are written by the failure paths themselves (`VtualIncidentRecorder`),
 * never by this screen: the endpoint has no create and no delete, because an
 * incident is the record of an integration having been broken. A recurrence
 * reopens a row automatically, so the only decisions here are acknowledge and
 * resolve — and the server decides which of those this actor may make on this
 * row (`VtualIncidentQueryRowActions`). The view only routes the click.
 *
 * `private-vtual.incidents` carries ids + enums, so a push means refetch. Enum
 * labels come from the API (`kind_label`, `severity_label`, `status_label`) and
 * are never re-mapped here; the local `filters`/`kind`/`severity`/`status` keys
 * only label the dropdowns, which must render before any row has loaded.
 */

const { t, locale } = useI18n()
const { fetchList, triage, pagination, subscribeRealtime, unsubscribeRealtime } = useVtualIncidents()
const { success: showSuccess, error: showError } = useAlert()

const items = ref<VtualIncident[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

const statusFilter = ref('')
const severityFilter = ref('')
const kindFilter = ref('')

const STATUS_VALUES = ['open', 'acknowledged', 'resolved'] as const
const SEVERITY_VALUES = ['critical', 'warning', 'info'] as const
const KIND_VALUES = [
  'websub',
  'eventsub',
  'eventsub_notification',
  'credential',
  'platform_http',
  'ingestion',
] as const

const hasFilters = computed(
  () => statusFilter.value !== '' || severityFilter.value !== '' || kindFilter.value !== '',
)

const emptyTitle = computed(() =>
  hasFilters.value
    ? t('web.vtual.incidents.datatable.zero_records')
    : t('web.vtual.incidents.datatable.empty'),
)

/** Filter selects ride every list request; empty values are dropped upstream. */
function filters(): ListParams {
  return {
    status: statusFilter.value,
    severity: severityFilter.value,
    kind: kindFilter.value,
  }
}

async function loadList(params?: ListParams): Promise<VtualIncident[]> {
  loading.value = true
  loadError.value = null

  try {
    items.value = await fetchList(params)
    return items.value
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.vtual.incidents.errors.load_failed')
    items.value = []
    return []
  } finally {
    loading.value = false
  }
}

const { load, onPage, onPerPage, onSearch } = useServerDataTable(loadList, pagination, filters)

/** Any filter change restarts at page 1 — page 4 of a narrower queue is empty. */
function applyFilters(): void {
  void load({ page: 1 })
}

function clearFilters(): void {
  if (!hasFilters.value) return
  statusFilter.value = ''
  severityFilter.value = ''
  kindFilter.value = ''
  applyFilters()
}

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function severityVariant(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-bg-danger'
    case 'warning': return 'text-bg-warning'
    default: return 'text-bg-secondary'
  }
}

function statusVariant(status: string): string {
  switch (status) {
    case 'open': return 'text-bg-danger'
    case 'acknowledged': return 'text-bg-info'
    case 'resolved': return 'text-bg-success'
    default: return 'text-bg-secondary'
  }
}

/** Subject the incident is about, narrowed from credential → channel → platform. */
function subjectLabel(row: VtualIncident): string {
  return row.credential_label ?? row.channel_display_name ?? row.platform_name ?? '-'
}

function subjectDetail(row: VtualIncident): string | null {
  if (row.credential_label) return row.platform_name
  if (row.channel_display_name) return row.channel_handle
  return null
}

const columns = computed<DataTableColumn[]>(() => [
  { key: 'kind', label: t('web.vtual.incidents.columns.kind'), sortable: false },
  { key: 'subject', label: t('web.vtual.incidents.columns.subject'), sortable: false },
  { key: 'title', label: t('web.vtual.incidents.columns.title'), sortable: false },
  { key: 'severity', label: t('web.vtual.incidents.columns.severity'), sortable: false, align: 'center' },
  { key: 'status', label: t('web.vtual.incidents.columns.status'), sortable: false, align: 'center' },
  { key: 'occurrences', label: t('web.vtual.incidents.columns.occurrences'), sortable: false, align: 'center' },
  { key: 'last_seen_at', label: t('web.vtual.incidents.columns.last_seen'), sortable: false },
])

function incidentActions(row: VtualIncident) {
  return mapQueryRowActions(row.actions ?? [], {
    acknowledge: (action) => { void runTriage(row, action) },
    resolve: (action) => { void runTriage(row, action) },
  })
}

async function runTriage(row: VtualIncident, action: QueryRowAction): Promise<void> {
  if (action.key !== 'acknowledge' && action.key !== 'resolve') return

  if (action.confirm && !(await confirmQueryMutate(action, t('actions.confirm')))) {
    return
  }

  try {
    await triage(row.id, action.key)
    showSuccess(t('web.vtual.incidents.action_done'))
    void load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.incidents.errors.action_failed'))
  }
}

// A ping is ids + enums, so the only correct reaction is to re-pull the queue.
const realtimeHandlers = {
  onIncidentChanged: () => {
    void load()
  },
}

onMounted(() => {
  subscribeRealtime(realtimeHandlers)
})

onUnmounted(() => {
  unsubscribeRealtime(realtimeHandlers)
})

// Socket-outage recovery: events missed during the gap are gone for good.
useEchoResync(() => { void load() })
</script>

<template>
  <Card :title="t('web.vtual.incidents.list_title')">
    <p class="text-muted small mb-3">{{ t('web.vtual.incidents.subtitle') }}</p>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :error="loadError"
      server
      :total="pagination.total"
      :page="pagination.current_page"
      :per-page="pagination.per_page"
      :search-placeholder="t('web.vtual.incidents.search_placeholder')"
      empty-icon="bi-exclamation-triangle"
      :empty-title="emptyTitle"
      @update:page="onPage"
      @update:per-page="onPerPage"
      @update:search="onSearch"
      @retry="load()"
    >
      <template #toolbar>
        <select v-model="statusFilter" class="form-select form-select-sm" style="width: auto;" @change="applyFilters">
          <option value="">{{ t('web.vtual.incidents.filters.all_statuses') }}</option>
          <option v-for="value in STATUS_VALUES" :key="value" :value="value">
            {{ t(`web.vtual.incidents.status.${value}`) }}
          </option>
        </select>

        <select v-model="severityFilter" class="form-select form-select-sm" style="width: auto;" @change="applyFilters">
          <option value="">{{ t('web.vtual.incidents.filters.all_severities') }}</option>
          <option v-for="value in SEVERITY_VALUES" :key="value" :value="value">
            {{ t(`web.vtual.incidents.severity.${value}`) }}
          </option>
        </select>

        <select v-model="kindFilter" class="form-select form-select-sm" style="width: auto;" @change="applyFilters">
          <option value="">{{ t('web.vtual.incidents.filters.all_kinds') }}</option>
          <option v-for="value in KIND_VALUES" :key="value" :value="value">
            {{ t(`web.vtual.incidents.kind.${value}`) }}
          </option>
        </select>

        <button v-if="hasFilters" class="btn btn-outline-secondary btn-sm" type="button" @click="clearFilters">
          <i class="bi bi-x-lg me-1" aria-hidden="true"></i> {{ t('web.vtual.incidents.filters.clear') }}
        </button>
      </template>

      <template #cell-kind="{ row }: { row: VtualIncident }">
        <span class="fw-semibold">{{ row.kind_label }}</span>
      </template>

      <template #cell-subject="{ row }: { row: VtualIncident }">
        <span>{{ subjectLabel(row) }}</span>
        <span v-if="subjectDetail(row)" class="text-muted small d-block">{{ subjectDetail(row) }}</span>
      </template>

      <template #cell-title="{ row }: { row: VtualIncident }">
        <span>{{ row.title }}</span>
        <span v-if="row.detail" class="text-muted small d-block">{{ row.detail }}</span>
      </template>

      <template #cell-severity="{ row }: { row: VtualIncident }">
        <span class="badge" :class="severityVariant(row.severity)">{{ row.severity_label }}</span>
      </template>

      <template #cell-status="{ row }: { row: VtualIncident }">
        <span class="badge" :class="statusVariant(row.status)">{{ row.status_label }}</span>
      </template>

      <template #cell-occurrences="{ row }: { row: VtualIncident }">
        {{ row.occurrences }}
      </template>

      <template #cell-last_seen_at="{ row }: { row: VtualIncident }">
        <span class="text-muted small">{{ formatDateTime(row.last_seen_at) }}</span>
      </template>

      <template #actions="{ row }: { row: VtualIncident }">
        <RowActions :actions="incidentActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
