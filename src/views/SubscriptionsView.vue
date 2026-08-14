<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions, { type RowAction } from '@/components/RowActions.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useSubscriptions } from '@/composables/useSubscriptions'
import { useAuth } from '@/stores/auth'
import { useServerDataTable } from '@/composables/useServerDataTable'
import type { Subscription } from '@/api/types'
import { SUBSCRIPTION_STATUS_BADGE } from '@/utils/statusBadge'

const router = useRouter()
const { t } = useI18n()
const { items, loading, fetchList, pagination } = useSubscriptions()
const { hasPermission } = useAuth()
const canManage = computed(() => hasPermission('manage subscription'))
const { onPage, onPerPage, onSearch } = useServerDataTable(fetchList, pagination)

const columns = computed<DataTableColumn[]>(() => [
  { key: 'subscription_number', label: t('web.payments.subscriptions.datatable.columns.subscription_number'), sortable: true },
  { key: 'subscriber_name', label: t('web.payments.subscriptions.datatable.columns.subscriber_name'), sortable: true },
  { key: 'plan_name', label: t('web.payments.subscriptions.datatable.columns.plan_name'), sortable: true },
  { key: 'amount', label: t('web.payments.subscriptions.datatable.columns.amount'), sortable: true, align: 'end' },
  { key: 'status', label: t('web.payments.subscriptions.datatable.columns.status'), sortable: true, align: 'center' },
  { key: 'expires_at', label: t('web.payments.subscriptions.datatable.columns.expires_at'), sortable: true, align: 'end' },
])

function showSub(row: Subscription): void {
  router.push({ name: 'subscriptions.show.view', params: { id: row.id } })
}

function editSub(row: Subscription): void {
  router.push({ name: 'subscriptions.edit.view', params: { id: row.id } })
}

function subscriptionActions(row: Subscription): RowAction[] {
  return [
    { key: 'view', icon: 'eye', label: t('actions.view'), variant: 'info', onClick: () => showSub(row) },
    { key: 'edit', icon: 'pencil', label: t('ui.actions.edit'), variant: 'primary', onClick: () => editSub(row) },
  ]
}
</script>

<template>
  <Card :title="t('web.payments.subscriptions.title')">
    <template #actions>
      <button v-if="canManage" class="btn btn-primary btn-sm" @click="router.push({ name: 'subscriptions.create.view' })">
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.payments.subscriptions.add_button') }}
      </button>
    </template>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      server
      :total="pagination.total"
      :page="pagination.current_page"
      :per-page="pagination.per_page"
      :search-placeholder="t('web.payments.subscriptions.datatable.search_placeholder')"
      empty-icon="bi-receipt"
      :empty-title="t('web.payments.subscriptions.datatable.empty')"
      @row-click="showSub"
      @update:page="onPage"
      @update:per-page="onPerPage"
      @update:search="onSearch"
    >
      <template #cell-subscription_number="{ row }: { row: Subscription }">
        <code>{{ row.subscription_number }}</code>
      </template>

      <template #cell-subscriber_name="{ row }: { row: Subscription }">
        <div>{{ row.subscriber_name }}</div>
        <div class="text-muted small">{{ row.subscriber_email }}</div>
      </template>

      <template #cell-plan_name="{ row }: { row: Subscription }">
        {{ row.plan_name }}
        <div class="text-muted small">{{ row.billing_cycle }}</div>
      </template>

      <template #cell-amount="{ row }: { row: Subscription }">
        {{ row.amount_formatted ?? row.amount }} <span class="text-muted small">{{ row.currency }}</span>
      </template>

      <template #cell-status="{ row }: { row: Subscription }">
        <StatusBadge :status="row.status" :mapping="SUBSCRIPTION_STATUS_BADGE" fallback="warning" />
      </template>

      <template #cell-expires_at="{ row }: { row: Subscription }">
        <span class="text-muted small">{{ row.expires_at_formatted ?? row.expires_at ?? '—' }}</span>
      </template>

      <template v-if="canManage" #actions="{ row }: { row: Subscription }">
        <RowActions :actions="subscriptionActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
