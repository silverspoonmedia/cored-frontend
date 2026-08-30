<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useInvoices } from '@/composables/payment-gateway/useInvoices'
import { useAlert } from '@/composables/useAlert'
import { useServerDataTable } from '@/composables/useServerDataTable'
import type { Invoice } from '@/api/types'
import { INVOICE_STATUS_BADGE } from '@/utils/statusBadge'
import { findQueryRowAction, mapQueryRowActions, queryRowActionTo } from '@/utils/mapQueryRowActions'

const router = useRouter()
const { t } = useI18n()
const { items, loading, error, fetchList, exportCsv, pagination } = useInvoices()
const { error: showError } = useAlert()
const exporting = ref(false)
const { onPage, onPerPage, onSearch } = useServerDataTable(fetchList, pagination)

const columns: DataTableColumn[] = [
  { key: 'invoice_number', label: t('web.payments.invoices.datatable.columns.invoice_number'), sortable: true },
  { key: 'status', label: t('web.payments.invoices.datatable.columns.status'), sortable: true, align: 'center' },
  { key: 'subtotal', label: t('web.payments.invoices.datatable.columns.subtotal'), sortable: false, align: 'end' },
  { key: 'payment_channel_fee', label: t('web.payments.invoices.datatable.columns.fee'), sortable: false, align: 'end' },
  { key: 'customer_gross_total', label: t('web.payments.invoices.datatable.columns.total'), sortable: false, align: 'end' },
  { key: 'created_at', label: t('web.payments.invoices.datatable.columns.created_at'), sortable: true, align: 'end' },
]

async function handleExport(): Promise<void> {
  if (exporting.value) return
  exporting.value = true
  try {
    await exportCsv()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.operation_failed'))
  } finally {
    exporting.value = false
  }
}

function viewInvoice(row: Invoice): void {
  const to = queryRowActionTo(findQueryRowAction(row.actions, 'view'))
  if (to) void router.push(to)
}
</script>

<template>
  <Card :title="t('web.payments.invoices.title')">
    <template #actions>
      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="exporting" @click="handleExport">
        <span v-if="exporting" class="spinner-border spinner-border-sm me-1"></span>
        <i v-else class="bi bi-download me-1"></i>{{ t('web.payments.invoices.export_csv') }}
      </button>
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
      :search-placeholder="t('web.payments.invoices.search_placeholder')"
      empty-icon="bi-receipt"
      :empty-title="t('web.payments.invoices.empty_title')"
      @row-click="viewInvoice"
      @update:page="onPage"
      @update:per-page="onPerPage"
      @update:search="onSearch"
    >
      <template #cell-invoice_number="{ row }: { row: Invoice }">
        <code>{{ row.invoice_number }}</code>
      </template>

      <template #cell-status="{ row }: { row: Invoice }">
        <StatusBadge :status="row.status" :mapping="INVOICE_STATUS_BADGE" fallback="light" />
      </template>

      <template #cell-subtotal="{ row }: { row: Invoice }">
        {{ row.subtotal_formatted ?? row.subtotal ?? '—' }}
      </template>

      <template #cell-payment_channel_fee="{ row }: { row: Invoice }">
        {{ row.payment_channel_fee_formatted ?? row.payment_channel_fee ?? '—' }}
      </template>

      <template #cell-customer_gross_total="{ row }: { row: Invoice }">
        {{ row.customer_gross_total_formatted ?? row.customer_gross_total ?? '—' }}
      </template>

      <template #cell-created_at="{ row }: { row: Invoice }">
        <span class="text-muted small">{{ row.created_at_formatted ?? row.created_at ?? '—' }}</span>
      </template>

      <template #actions="{ row }: { row: Invoice }">
        <RowActions :actions="mapQueryRowActions(row.actions)" />
      </template>
    </DataTable>
  </Card>
</template>
