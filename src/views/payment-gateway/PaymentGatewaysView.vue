<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { usePaymentGateways } from '@/composables/payment-gateway/usePaymentGateways'
import { useAuth } from '@/stores/auth'
import { useServerDataTable } from '@/composables/useServerDataTable'
import { useAlert } from '@/composables/useAlert'
import type { PaymentGateway } from '@/api/types'
import { confirmQueryMutate, findQueryRowAction, mapQueryRowActions, queryRowActionTo } from '@/utils/mapQueryRowActions'

const router = useRouter()
const { t } = useI18n()
const { items, loading, error, fetchList, pagination, destroy } = usePaymentGateways()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const canManage = computed(() => hasPermission('manage payment gateway'))
const { onPage, onPerPage, onSearch } = useServerDataTable(fetchList, pagination)
const deleteTarget = ref<PaymentGateway | null>(null)

const columns = computed<DataTableColumn[]>(() => [
  { key: 'name', label: t('web.payments.gateways.datatable.columns.name'), sortable: true },
  { key: 'display_name', label: t('web.payments.gateways.datatable.columns.display_name'), sortable: true },
  { key: 'priority', label: t('web.payments.gateways.datatable.columns.priority'), sortable: true, align: 'center' },
  { key: 'is_active', label: t('web.payments.gateways.datatable.columns.is_active'), sortable: true, align: 'center' },
  { key: 'updated_at', label: t('web.archivd.updated'), sortable: true, align: 'end' },
])

function editGateway(row: PaymentGateway): void {
  const to = queryRowActionTo(findQueryRowAction(row.actions, 'edit'))
  if (to) void router.push(to)
}

function gatewayActions(row: PaymentGateway) {
  return mapQueryRowActions(row.actions, {
    delete: (action) => {
      void (async () => {
        deleteTarget.value = row
        if (await confirmQueryMutate(action, t('ui.actions.delete'))) await handleDelete()
      })()
    },
  })
}

async function handleDelete(): Promise<void> {
  if (!deleteTarget.value) return
  try {
    await destroy(deleteTarget.value.id)
    showSuccess(t('api.payments.gateways.deleted'))
    deleteTarget.value = null
    await fetchList()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.operation_failed'))
  }
}
</script>

<template>
  <Card :title="t('web.payments.gateways.title')">
    <template #actions>
      <router-link v-if="canManage" class="btn btn-primary btn-sm" :to="{ name: 'payment-gateways.create.view' }">
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.payments.gateways.create') }}
      </router-link>
    </template>

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
      :search-placeholder="t('web.payments.gateways.search_placeholder')"
      empty-icon="bi-credit-card"
      :empty-title="t('web.payments.gateways.empty_title')"
      @row-click="editGateway"
      @update:page="onPage"
      @update:per-page="onPerPage"
      @update:search="onSearch"
    >
      <template #cell-name="{ row }: { row: PaymentGateway }">
        <code>{{ row.name }}</code>
      </template>

      <template #cell-priority="{ row }: { row: PaymentGateway }">
        <span class="badge text-bg-light border">{{ row.priority }}</span>
      </template>

      <template #cell-is_active="{ row }: { row: PaymentGateway }">
        <StatusBadge
          :status="row.is_active ? 'active' : 'inactive'"
          :label="row.is_active ? t('web.payments.gateways.status.active') : t('web.payments.gateways.status.inactive')"
        />
      </template>

      <template #cell-updated_at="{ row }: { row: PaymentGateway }">
        <span class="text-muted small">{{ row.updated_at_formatted ?? row.updated_at ?? '—' }}</span>
      </template>

      <template v-if="canManage" #actions="{ row }: { row: PaymentGateway }">
        <RowActions :actions="gatewayActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
