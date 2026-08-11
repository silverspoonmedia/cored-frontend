<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { usePaymentGateways } from '@/composables/usePaymentGateways'
import { useAuth } from '@/stores/auth'
import type { PaymentGateway } from '@/api/types'

const router = useRouter()
const { items, loading, fetchList } = usePaymentGateways()
const { hasPermission } = useAuth()
const canManage = computed(() => hasPermission('manage payment gateway'))

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'display_name', label: 'Display Name', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true, align: 'center' },
  { key: 'is_active', label: 'Active', sortable: true, align: 'center' },
  { key: 'updated_at', label: 'Updated', sortable: true, align: 'end' },
]

onMounted(() => fetchList())

function editGateway(row: PaymentGateway): void {
  router.push({ name: 'payment-gateways.edit.view', params: { id: row.id } })
}
</script>

<template>
  <Card title="Payment Gateways">
    <template #actions>
      <button v-if="canManage" class="btn btn-primary btn-sm" @click="router.push({ name: 'payment-gateways.create.view' })">
        <i class="bi bi-plus-lg me-1"></i> Add Gateway
      </button>
    </template>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      search-placeholder="Search gateways…"
      empty-icon="bi-credit-card"
      empty-title="No gateways found"
      @row-click="editGateway"
    >
      <template #cell-name="{ row }: { row: PaymentGateway }">
        <code>{{ row.name }}</code>
      </template>

      <template #cell-priority="{ row }: { row: PaymentGateway }">
        <span class="badge text-bg-light border">{{ row.priority }}</span>
      </template>

      <template #cell-is_active="{ row }: { row: PaymentGateway }">
        <span class="badge" :class="row.is_active ? 'text-bg-success' : 'text-bg-secondary'">
          {{ row.is_active ? 'Active' : 'Inactive' }}
        </span>
      </template>

      <template #cell-updated_at="{ row }: { row: PaymentGateway }">
        <span class="text-muted small">{{ row.updated_at_formatted ?? row.updated_at ?? '—' }}</span>
      </template>

      <template v-if="canManage" #actions="{ row }: { row: PaymentGateway }">
        <button class="btn btn-outline-primary btn-sm" @click.stop="editGateway(row)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
        </button>
      </template>
    </DataTable>
  </Card>
</template>
