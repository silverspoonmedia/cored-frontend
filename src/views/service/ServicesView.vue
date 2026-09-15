<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useServices } from '@/composables/service/useServices'
import { useAuth } from '@/stores/auth'
import { useServerDataTable } from '@/composables/useServerDataTable'
import { useAlert } from '@/composables/useAlert'
import { useListingLiveUpdate } from '@/composables/useListingLiveUpdate'
import { useEchoResync } from '@/composables/useEcho'
import { useServicesRealtime } from '@/composables/service/useServicesRealtime'
import type { Service } from '@/api/types'
import { SERVICE_STATUS_BADGE } from '@/utils/statusBadge'
import { confirmQueryMutate, findQueryRowAction, mapQueryRowActions, queryRowActionTo } from '@/utils/mapQueryRowActions'

const router = useRouter()
const { t } = useI18n()
const { items, loading, error, fetchList, pagination, destroy } = useServices()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const canManage = computed(() => hasPermission('manage service'))
const { onPage, onPerPage, onSearch } = useServerDataTable(fetchList, pagination)
const deleteTarget = ref<Service | null>(null)

useListingLiveUpdate('services', fetchList)

const { subscribeCatalog, unsubscribeCatalog } = useServicesRealtime()
const catalogHandlers = { onCatalogChanged: () => fetchList() }

const columns: DataTableColumn[] = [
  { key: 'code', label: t('web.services.columns.code'), sortable: true },
  { key: 'name', label: t('web.services.columns.name'), sortable: true },
  { key: 'billing_interval', label: t('web.services.columns.interval'), sortable: true, align: 'center' },
  { key: 'status', label: t('web.services.columns.status'), sortable: true, align: 'center' },
  { key: 'updated_at', label: t('web.archivd.updated'), sortable: true, align: 'end' },
]

function showService(row: Service): void {
  const to = queryRowActionTo(findQueryRowAction(row.actions, 'view'))
  if (to) void router.push(to)
}

function serviceActions(row: Service) {
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
    showSuccess(t('web.services.deleted'))
    deleteTarget.value = null
    await fetchList()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.operation_failed'))
  }
}

onMounted(() => {
  subscribeCatalog(catalogHandlers)
})

onUnmounted(() => {
  unsubscribeCatalog(catalogHandlers)
})

useEchoResync(() => { void fetchList() })
</script>

<template>
  <Card :title="t('web.services.title')">
    <template #actions>
      <router-link v-if="canManage" class="btn btn-primary btn-sm" :to="{ name: 'services.create.view' }">
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.services.add_button') }}
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
      :search-placeholder="t('web.services.search_placeholder')"
      empty-icon="bi-box-seam"
      :empty-title="t('web.services.empty_title')"
      @row-click="showService"
      @update:page="onPage"
      @update:per-page="onPerPage"
      @update:search="onSearch"
    >
      <template #cell-code="{ row }: { row: Service }">
        <code>{{ row.code }}</code>
      </template>

      <template #cell-billing_interval="{ row }: { row: Service }">
        <span class="text-muted small">{{ row.billing_interval }}</span>
      </template>

      <template #cell-status="{ row }: { row: Service }">
        <StatusBadge :status="row.status" :mapping="SERVICE_STATUS_BADGE" fallback="info" />
      </template>

      <template #cell-updated_at="{ row }: { row: Service }">
        <span class="text-muted small">{{ row.updated_at_formatted ?? row.updated_at ?? '—' }}</span>
      </template>

      <template #actions="{ row }: { row: Service }">
        <RowActions :actions="serviceActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
