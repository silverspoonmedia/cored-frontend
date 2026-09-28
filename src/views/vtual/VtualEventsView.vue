<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import { useVtualEvents } from '@/composables/vtual/useVtualEvents'
import { useEchoResync } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import { useVtualRealtime, type ManagementUpdatedPayload } from '@/composables/vtual/useVtualRealtime'
import type { QueryRowAction, VtualManagementEvent } from '@/api/types'
import { confirmQueryMutate, mapQueryRowActions } from '@/utils/mapQueryRowActions'

const { t, locale } = useI18n()
const events = useVtualEvents()
const { success: showSuccess, error: showError } = useAlert()

const items = ref<VtualManagementEvent[]>([])
const total = ref(0)
const currentPage = ref(1)
const perPage = ref(10)
const loading = ref(true)

const emptyTitle = computed(() => t('web.vtual-events.datatable.empty'))

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

async function loadList(params?: { page?: number; per_page?: number }): Promise<void> {
  loading.value = true
  try {
    const list = await events.fetchPagedList(params)
    items.value = list.items
    total.value = list.pagination.total
    currentPage.value = list.pagination.current_page
    perPage.value = list.pagination.per_page
    syncEventChannels()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-events.errors.load_failed'))
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// --- Realtime ---------------------------------------------------------------
// The cross-management list has no channel of its own, so it binds one channel
// per management visible on the page and refetches when that org's events
// change. Only `kind=event` matters here: a member or invite push would reload
// the page for a row that cannot have changed.

const { syncManagementChannels, releaseManagementChannels } = useVtualRealtime()

function onManagementUpdated(payload: ManagementUpdatedPayload): void {
  if (payload.kind !== 'event') return
  void loadList({ page: currentPage.value, per_page: perPage.value })
}

function syncEventChannels(): void {
  const managementIds = items.value
    .map((row) => row.management_id)
    .filter((id): id is string => typeof id === 'string' && id !== '')

  syncManagementChannels([...new Set(managementIds)], onManagementUpdated)
}

onUnmounted(() => {
  releaseManagementChannels(onManagementUpdated)
})

function handlePage(page: number): void {
  void loadList({ page, per_page: perPage.value })
}

function handlePerPage(count: number): void {
  void loadList({ page: 1, per_page: count })
}

const columns = computed<DataTableColumn[]>(() => [
  { key: 'title', label: t('web.vtual-events.datatable.columns.title'), sortable: false },
  { key: 'management', label: t('web.vtual-events.datatable.columns.management'), sortable: false },
  { key: 'starts_at', label: t('web.vtual-events.datatable.columns.starts_at'), sortable: false },
  { key: 'status', label: t('web.vtual-events.datatable.columns.status'), sortable: false, align: 'center' },
])

function statusVariant(status: string): string {
  switch (status) {
    case 'scheduled': return 'text-bg-info'
    case 'live': return 'text-bg-success'
    case 'ended': return 'text-bg-secondary'
    case 'cancelled': return 'text-bg-danger'
    default: return 'text-bg-secondary'
  }
}

function eventActions(row: VtualManagementEvent) {
  return mapQueryRowActions(row.actions ?? [], {
    cancel: (action) => {
      void cancelEvent(row, action)
    },
  })
}

async function cancelEvent(row: VtualManagementEvent, action: QueryRowAction): Promise<void> {
  const confirmed = await confirmQueryMutate(action, t('web.vtual-events.datatable.confirm_cancel'))
  if (!confirmed || !row.management_id) {
    return
  }

  try {
    await events.cancelEvent(row.management_id, row.id)
    showSuccess(t('api.vtual.management.event_cancelled'))
    await loadList({ page: currentPage.value, per_page: perPage.value })
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-events.errors.cancel_failed'))
  }
}

onMounted(() => {
  void loadList({ page: 1, per_page: 10 })
})

// Socket-outage recovery: mirror the onMounted load (fresh page 1).
useEchoResync(() => { void loadList({ page: 1, per_page: 10 }) })
</script>

<template>
  <Card :title="t('web.vtual-events.list_title')">
    <template #actions>
      <router-link
        class="btn btn-primary btn-sm"
        :to="{ name: 'vtual.events.create.view' }"
      >
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.vtual-events.add_button') }}
      </router-link>
    </template>

    <p class="text-muted small mb-3">{{ t('web.vtual-events.subtitle') }}</p>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :searchable="false"
      server
      :total="total"
      :page="currentPage"
      :per-page="perPage"
      empty-icon="bi-calendar-event"
      :empty-title="emptyTitle"
      @update:page="handlePage"
      @update:per-page="handlePerPage"
    >
      <template #cell-title="{ row }: { row: VtualManagementEvent }">
        <span class="fw-semibold">{{ row.title }}</span>
        <span v-if="row.is_featured" class="badge text-bg-warning ms-1">{{ t('web.vtual-events.status.featured') }}</span>
      </template>

      <template #cell-management="{ row }: { row: VtualManagementEvent }">
        {{ row.management?.name ?? '-' }}
      </template>

      <template #cell-starts_at="{ row }: { row: VtualManagementEvent }">
        <span class="text-muted small">{{ formatDateTime(row.starts_at) }}</span>
      </template>

      <template #cell-status="{ row }: { row: VtualManagementEvent }">
        <span class="badge" :class="statusVariant(row.status)">
          {{ t(`web.vtual-events.status.${row.status}`) }}
        </span>
      </template>

      <template #actions="{ row }: { row: VtualManagementEvent }">
        <RowActions :actions="eventActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
