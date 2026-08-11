<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useServices } from '@/composables/useServices'
import { useAuth } from '@/stores/auth'
import type { Service } from '@/api/types'

const router = useRouter()
const { items, loading, fetchList } = useServices()
const { hasPermission } = useAuth()
const canManage = computed(() => hasPermission('manage service'))

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Code', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'billing_interval', label: 'Interval', sortable: true, align: 'center' },
  { key: 'status', label: 'Status', sortable: true, align: 'center' },
  { key: 'updated_at', label: 'Updated', sortable: true, align: 'end' },
]

onMounted(() => fetchList())

function showService(row: Service): void {
  router.push({ name: 'services.show.view', params: { id: row.id } })
}

function editService(row: Service): void {
  router.push({ name: 'services.edit.view', params: { id: row.id } })
}

function statusClass(status: string): string {
  if (status === 'active') return 'text-bg-success'
  if (status === 'inactive') return 'text-bg-secondary'
  if (status === 'draft') return 'text-bg-warning'
  return 'text-bg-info'
}
</script>

<template>
  <Card title="Services">
    <template #actions>
      <button v-if="canManage" class="btn btn-primary btn-sm" @click="router.push({ name: 'services.create.view' })">
        <i class="bi bi-plus-lg me-1"></i> Add Service
      </button>
    </template>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      search-placeholder="Search services…"
      empty-icon="bi-box-seam"
      empty-title="No services found"
      @row-click="showService"
    >
      <template #cell-code="{ row }: { row: Service }">
        <code>{{ row.code }}</code>
      </template>

      <template #cell-billing_interval="{ row }: { row: Service }">
        <span class="text-muted small">{{ row.billing_interval }}</span>
      </template>

      <template #cell-status="{ row }: { row: Service }">
        <span class="badge" :class="statusClass(row.status)">{{ row.status }}</span>
      </template>

      <template #cell-updated_at="{ row }: { row: Service }">
        <span class="text-muted small">{{ row.updated_at_formatted ?? row.updated_at ?? '—' }}</span>
      </template>

      <template #actions="{ row }: { row: Service }">
        <button class="btn btn-outline-info btn-sm" @click.stop="showService(row)">
          <i class="bi bi-eye" aria-hidden="true"></i>
        </button>
        <button v-if="canManage" class="btn btn-outline-primary btn-sm ms-1" @click.stop="editService(row)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
        </button>
      </template>
    </DataTable>
  </Card>
</template>
