<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useSubscriptions } from '@/composables/useSubscriptions'
import { useAuth } from '@/stores/auth'
import type { Subscription } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { items, loading, fetchList } = useSubscriptions()
const { hasPermission } = useAuth()
const canManage = computed(() => hasPermission('manage subscription'))

const columns = computed<DataTableColumn[]>(() => [
  { key: 'subscription_number', label: t('web.payments.subscriptions.datatable.columns.subscription_number'), sortable: true },
  { key: 'subscriber_name', label: t('web.payments.subscriptions.datatable.columns.subscriber_name'), sortable: true },
  { key: 'plan_name', label: t('web.payments.subscriptions.datatable.columns.plan_name'), sortable: true },
  { key: 'amount', label: t('web.payments.subscriptions.datatable.columns.amount'), sortable: true, align: 'end' },
  { key: 'status', label: t('web.payments.subscriptions.datatable.columns.status'), sortable: true, align: 'center' },
  { key: 'expires_at', label: t('web.payments.subscriptions.datatable.columns.expires_at'), sortable: true, align: 'end' },
])

onMounted(() => fetchList())

function showSub(row: Subscription): void {
  router.push({ name: 'subscriptions.show.view', params: { id: row.id } })
}

function editSub(row: Subscription): void {
  router.push({ name: 'subscriptions.edit.view', params: { id: row.id } })
}

function statusClass(status: string): string {
  if (status === 'active') return 'text-bg-success'
  if (status === 'cancelled') return 'text-bg-danger'
  if (status === 'expired') return 'text-bg-secondary'
  if (status === 'trialing') return 'text-bg-info'
  return 'text-bg-warning'
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
      :search-placeholder="t('web.payments.subscriptions.datatable.search_placeholder')"
      empty-icon="bi-receipt"
      :empty-title="t('web.payments.subscriptions.datatable.empty')"
      @row-click="showSub"
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
        <span class="badge" :class="statusClass(row.status)">{{ row.status }}</span>
      </template>

      <template #cell-expires_at="{ row }: { row: Subscription }">
        <span class="text-muted small">{{ row.expires_at_formatted ?? row.expires_at ?? '—' }}</span>
      </template>

      <template v-if="canManage" #actions="{ row }: { row: Subscription }">
        <button class="btn btn-outline-info btn-sm" @click.stop="showSub(row)">
          <i class="bi bi-eye" aria-hidden="true"></i>
        </button>
        <button class="btn btn-outline-primary btn-sm ms-1" @click.stop="editSub(row)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
        </button>
      </template>
    </DataTable>
  </Card>
</template>
