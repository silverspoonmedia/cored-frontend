<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useInvoices } from '@/composables/useInvoices'
import type { Invoice } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { items, loading, fetchList } = useInvoices()

const columns: DataTableColumn[] = [
  { key: 'invoice_number', label: 'Invoice Number', sortable: true },
  { key: 'status', label: 'Status', sortable: true, align: 'center' },
  { key: 'subtotal', label: 'Subtotal', sortable: false, align: 'end' },
  { key: 'payment_channel_fee', label: 'Fee', sortable: false, align: 'end' },
  { key: 'customer_gross_total', label: 'Total', sortable: false, align: 'end' },
  { key: 'created_at', label: 'Created', sortable: true, align: 'end' },
]

onMounted(() => fetchList())

function viewInvoice(row: Invoice): void {
  router.push({ name: 'invoices.show.view', params: { id: row.id } })
}

function statusClass(status: string): string {
  const map: Record<string, string> = {
    paid: 'text-bg-success',
    pending: 'text-bg-warning',
    expired: 'text-bg-secondary',
    failed: 'text-bg-danger',
    cancelled: 'text-bg-dark',
    refunded: 'text-bg-info',
  }
  return map[status.toLowerCase()] ?? 'text-bg-light'
}
</script>

<template>
  <Card :title="t('web.payments.invoices.title')">
    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :search-placeholder="t('web.payments.invoices.search_placeholder')"
      empty-icon="bi-receipt"
      :empty-title="t('web.payments.invoices.empty_title')"
      @row-click="viewInvoice"
    >
      <template #cell-invoice_number="{ row }: { row: Invoice }">
        <code>{{ row.invoice_number }}</code>
      </template>

      <template #cell-status="{ row }: { row: Invoice }">
        <span class="badge" :class="statusClass(row.status)">{{ row.status }}</span>
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
        <button class="btn btn-outline-primary btn-sm" @click.stop="viewInvoice(row)">
          <i class="bi bi-eye" aria-hidden="true"></i>
        </button>
      </template>
    </DataTable>
  </Card>
</template>
