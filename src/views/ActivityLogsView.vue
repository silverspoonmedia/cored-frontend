<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import { useActivityLogs } from '@/composables/useActivityLogs'
import { useServerDataTable } from '@/composables/useServerDataTable'
import type { ActivityLog } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { items, loading, error, fetchList, pagination } = useActivityLogs()
const { onPage, onPerPage, onSearch } = useServerDataTable(fetchList, pagination)

const columns: DataTableColumn[] = [
  { key: 'event', label: t('web.activity-log.columns.event'), sortable: true },
  { key: 'subject', label: t('web.activity-log.columns.subject'), sortable: false },
  { key: 'causer', label: t('web.activity-log.columns.causer'), sortable: false },
  { key: 'created_at', label: t('web.activity-log.columns.time'), sortable: true, align: 'end' },
]

function viewDetail(row: ActivityLog): void {
  router.push({ name: 'activity-logs.show.view', params: { id: row.id } })
}

function timeLabel(row: ActivityLog): string {
  return row.created_at_human ?? row.created_at_formatted ?? row.created_at ?? '—'
}
</script>

<template>
  <Card :title="t('web.activity-log.list_title')">
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
      :search-placeholder="t('web.activity-log.search_placeholder')"
      empty-icon="bi-clock-history"
      :empty-title="t('web.activity-log.empty_title')"
      @row-click="viewDetail"
      @update:page="onPage"
      @update:per-page="onPerPage"
      @update:search="onSearch"
    >
      <template #cell-event="{ row }: { row: ActivityLog }">
        <div>
          <span v-if="row.log_name" class="badge text-bg-light border me-1">{{ row.log_name }}</span>
          <span v-else class="text-muted me-1">—</span>
          {{ row.event_label ?? row.event ?? row.description ?? '—' }}
        </div>
      </template>

      <template #cell-subject="{ row }: { row: ActivityLog }">
        <span class="text-muted small">{{ row.subject_label ?? '—' }}</span>
      </template>

      <template #cell-causer="{ row }: { row: ActivityLog }">
        <span class="text-muted small">{{ row.causer?.name ?? '—' }}</span>
      </template>

      <template #cell-created_at="{ row }: { row: ActivityLog }">
        <span class="text-muted small">{{ timeLabel(row) }}</span>
      </template>

      <template #actions="{ row }: { row: ActivityLog }">
        <RowActions
          :actions="[{ key: 'view', icon: 'eye', label: t('web.activity-log.view_detail'), variant: 'secondary', to: { name: 'activity-logs.show.view', params: { id: row.id } } }]"
        />
      </template>
    </DataTable>
  </Card>
</template>
