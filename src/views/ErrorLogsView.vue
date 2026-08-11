<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useErrorLogs } from '@/composables/useErrorLogs'
import type { ErrorLog } from '@/api/types'

const router = useRouter()
const { items, loading, fetchList } = useErrorLogs()

const filters = ref({
  status: '',
  level: '',
  type: '',
  q: '',
})

const columns: DataTableColumn[] = [
  { key: 'level', label: 'Level', sortable: true },
  { key: 'message', label: 'Message', sortable: false },
  { key: 'occurrence_count', label: 'Count', sortable: true, align: 'center' },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'last_seen_at', label: 'Last Seen', sortable: true, align: 'end' },
]

const filtered = computed<ErrorLog[]>(() => {
  let result = items.value
  if (filters.value.status) {
    result = result.filter((e) => e.status === filters.value.status)
  }
  if (filters.value.level) {
    result = result.filter((e) => e.level === filters.value.level)
  }
  if (filters.value.type) {
    result = result.filter((e) => e.type === filters.value.type)
  }
  if (filters.value.q.trim()) {
    const q = filters.value.q.toLowerCase().trim()
    result = result.filter((e) =>
      (e.message ?? '').toLowerCase().includes(q) ||
      (e.exception_class ?? '').toLowerCase().includes(q),
    )
  }
  return result
})

function levelClass(level: string | null): string {
  return level === 'error' ? 'text-bg-danger' : 'text-bg-dark'
}

function statusClass(status: string): string {
  if (status === 'resolved') return 'text-bg-success'
  if (status === 'ignored') return 'text-bg-secondary'
  return 'text-bg-warning'
}

function viewDetail(row: ErrorLog): void {
  router.push({ name: 'error-logs.show.view', params: { id: row.id } })
}

function resetFilters(): void {
  filters.value = { status: '', level: '', type: '', q: '' }
}

onMounted(() => fetchList({ limit: 100 }))
</script>

<template>
  <Card title="Error Logs">
    <!-- Filters -->
    <div class="row g-2 mb-3">
      <div class="col-auto">
        <select v-model="filters.status" class="form-select form-select-sm">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
        </select>
      </div>
      <div class="col-auto">
        <select v-model="filters.level" class="form-select form-select-sm">
          <option value="">All levels</option>
          <option value="error">error</option>
          <option value="critical">critical</option>
          <option value="alert">alert</option>
          <option value="emergency">emergency</option>
        </select>
      </div>
      <div class="col-auto">
        <select v-model="filters.type" class="form-select form-select-sm">
          <option value="">All types</option>
          <option value="exception">Exception</option>
          <option value="log">Log</option>
        </select>
      </div>
      <div class="col-auto">
        <input
          v-model="filters.q"
          type="search"
          class="form-control form-control-sm"
          placeholder="Search message…"
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
      :rows="filtered"
      :loading="loading"
      :searchable="false"
      empty-icon="bi-bug"
      empty-title="No error logs found"
      @row-click="viewDetail"
    >
      <template #cell-level="{ row }: { row: ErrorLog }">
        <span class="badge me-1" :class="levelClass(row.level)">{{ row.level ?? '—' }}</span>
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
        <span class="badge" :class="statusClass(row.status)">{{ row.status_label ?? row.status }}</span>
      </template>

      <template #cell-last_seen_at="{ row }: { row: ErrorLog }">
        <span class="text-muted small">{{ row.last_seen_at_human ?? row.last_seen_at_formatted ?? row.last_seen_at ?? '—' }}</span>
      </template>

      <template #actions="{ row }: { row: ErrorLog }">
        <button class="btn btn-outline-secondary btn-sm" @click.stop="viewDetail(row)">
          View Detail
        </button>
      </template>
    </DataTable>
  </Card>
</template>
