<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useErrorLogs } from '@/composables/useErrorLogs'
import { useServerDataTable } from '@/composables/useServerDataTable'
import { useLogsRealtime } from '@/composables/useLogsRealtime'
import type { ErrorLog } from '@/api/types'
import { ERROR_LOG_LEVEL_BADGE, ERROR_LOG_STATUS_BADGE } from '@/utils/statusBadge'

const router = useRouter()
const { t } = useI18n()
const { items, loading, error, fetchList, pagination } = useErrorLogs()

const filters = ref({
  status: '',
  level: '',
  type: '',
  q: '',
})

const { load, onPage, onPerPage } = useServerDataTable(fetchList, pagination, () => ({
  status: filters.value.status,
  level: filters.value.level,
  type: filters.value.type,
  q: filters.value.q,
}))

let filterTimer: ReturnType<typeof setTimeout> | null = null
watch(filters, () => {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => { void load({ page: 1 }) }, 300)
}, { deep: true })

const columns: DataTableColumn[] = [
  { key: 'level', label: t('web.error-log.columns.level'), sortable: true },
  { key: 'message', label: t('web.error-log.columns.message'), sortable: false },
  { key: 'occurrence_count', label: t('web.error-log.columns.count'), sortable: true, align: 'center' },
  { key: 'status', label: t('web.error-log.columns.status'), sortable: true },
  { key: 'last_seen_at', label: t('web.error-log.columns.last_seen'), sortable: true, align: 'end' },
]

function viewDetail(row: ErrorLog): void {
  router.push({ name: 'error-logs.show.view', params: { id: row.id } })
}

function resetFilters(): void {
  filters.value = { status: '', level: '', type: '', q: '' }
}

const { subscribeErrors, unsubscribeErrors } = useLogsRealtime()
const realtimeHandlers = { onErrorRecorded: () => fetchList() }

onMounted(() => {
  subscribeErrors(realtimeHandlers)
})

onUnmounted(() => {
  unsubscribeErrors(realtimeHandlers)
})
</script>

<template>
  <Card :title="t('web.error-log.list_title')">
    <!-- Filters -->
    <div class="row g-2 mb-3">
      <div class="col-auto">
        <select v-model="filters.status" class="form-select form-select-sm">
          <option value="">{{ t('web.error-log.filters.all_statuses') }}</option>
          <option value="open">{{ t('web.error-log.statuses.open') }}</option>
          <option value="resolved">{{ t('web.error-log.statuses.resolved') }}</option>
          <option value="ignored">{{ t('web.error-log.statuses.ignored') }}</option>
        </select>
      </div>
      <div class="col-auto">
        <select v-model="filters.level" class="form-select form-select-sm">
          <option value="">{{ t('web.error-log.filters.all_levels') }}</option>
          <option value="error">{{ t('web.error-log.levels.error') }}</option>
          <option value="critical">{{ t('web.error-log.levels.critical') }}</option>
          <option value="alert">{{ t('web.error-log.levels.alert') }}</option>
          <option value="emergency">{{ t('web.error-log.levels.emergency') }}</option>
        </select>
      </div>
      <div class="col-auto">
        <select v-model="filters.type" class="form-select form-select-sm">
          <option value="">{{ t('web.error-log.filters.all_types') }}</option>
          <option value="exception">{{ t('web.error-log.types.exception') }}</option>
          <option value="log">{{ t('web.error-log.types.log') }}</option>
        </select>
      </div>
      <div class="col-auto">
        <input
          v-model="filters.q"
          type="search"
          class="form-control form-control-sm"
          :placeholder="t('web.error-log.filters.search')"
        >
      </div>
      <div class="col-auto">
        <button class="btn btn-outline-secondary btn-sm" @click="resetFilters">
          <i class="bi bi-arrow-counterclockwise"></i>
        </button>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :error="error"
      @retry="fetchList()"
      server
      :total="pagination.total"
      :page="pagination.current_page"
      :per-page="pagination.per_page"
      :searchable="false"
      empty-icon="bi-bug"
      :empty-title="t('web.error-log.empty_title')"
      @row-click="viewDetail"
      @update:page="onPage"
      @update:per-page="onPerPage"
    >
      <template #cell-level="{ row }: { row: ErrorLog }">
        <StatusBadge :status="row.level" :mapping="ERROR_LOG_LEVEL_BADGE" fallback="dark" extra-class="me-1" />
        <span v-if="row.type" class="badge text-bg-light border">{{ row.type }}</span>
      </template>

      <template #cell-message="{ row }: { row: ErrorLog }">
        <div class="fw-medium text-truncate" style="max-width: 400px;" :title="row.message ?? ''">
          {{ row.message ?? '—' }}
        </div>
        <div v-if="row.exception_class" class="text-muted small text-truncate" style="max-width: 400px;">
          {{ row.exception_class }}
        </div>
      </template>

      <template #cell-occurrence_count="{ row }: { row: ErrorLog }">
        <span class="text-muted small">{{ row.occurrence_count ?? 1 }}</span>
      </template>

      <template #cell-status="{ row }: { row: ErrorLog }">
        <StatusBadge :status="row.status" :mapping="ERROR_LOG_STATUS_BADGE" fallback="warning" :label="row.status_label ?? row.status" />
      </template>

      <template #cell-last_seen_at="{ row }: { row: ErrorLog }">
        <span class="text-muted small">{{ row.last_seen_at_human ?? row.last_seen_at_formatted ?? row.last_seen_at ?? '—' }}</span>
      </template>

      <template #actions="{ row }: { row: ErrorLog }">
        <RowActions
          :actions="[{ key: 'view', icon: 'eye', label: t('web.error-log.view_detail'), variant: 'secondary', to: { name: 'error-logs.show.view', params: { id: row.id } } }]"
        />
      </template>
    </DataTable>
  </Card>
</template>
