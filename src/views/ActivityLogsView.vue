<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useActivityLogs } from '@/composables/useActivityLogs'
import type { ActivityLog } from '@/api/types'

const router = useRouter()
const { items, loading, fetchList } = useActivityLogs()

const columns: DataTableColumn[] = [
  { key: 'event', label: 'Event', sortable: true },
  { key: 'subject', label: 'Subject', sortable: false },
  { key: 'causer', label: 'Causer', sortable: false },
  { key: 'created_at', label: 'Time', sortable: true, align: 'end' },
]

onMounted(() => fetchList({ limit: 100 }))

function viewDetail(row: ActivityLog): void {
  router.push({ name: 'activity-logs.show.view', params: { id: row.id } })
}

function timeLabel(row: ActivityLog): string {
  return row.created_at_human ?? row.created_at_formatted ?? row.created_at ?? '—'
}
</script>

<template>
  <Card title="Activity Logs">
    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      search-placeholder="Search activity logs…"
      empty-icon="bi-clock-history"
      empty-title="No activity logs found"
      @row-click="viewDetail"
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
        <button
          class="btn btn-outline-secondary btn-sm"
          @click.stop="viewDetail(row)"
        >
          View Detail
        </button>
      </template>
    </DataTable>
  </Card>
</template>
