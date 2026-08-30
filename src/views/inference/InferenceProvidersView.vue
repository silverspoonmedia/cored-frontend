<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useInferenceProviders } from '@/composables/inference/useInferenceProviders'
import { useAuth } from '@/stores/auth'
import { useServerDataTable } from '@/composables/useServerDataTable'
import { useAlert } from '@/composables/useAlert'
import { useListingLiveUpdate } from '@/composables/useListingLiveUpdate'
import { useInferenceRealtime } from '@/composables/inference/useInferenceRealtime'
import type { InferenceProvider } from '@/api/types'
import { confirmQueryMutate, findQueryRowAction, mapQueryRowActions, queryRowActionTo } from '@/utils/mapQueryRowActions'

const router = useRouter()
const { t } = useI18n()
const { items, loading, error, fetchList, pagination, destroy } = useInferenceProviders()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const canManage = computed(() => hasPermission('manage inference catalog'))
const { onPage, onPerPage, onSearch } = useServerDataTable(fetchList, pagination)
const deleteTarget = ref<InferenceProvider | null>(null)

useListingLiveUpdate('inference-providers', fetchList)

const { subscribe, unsubscribe } = useInferenceRealtime()
const realtimeHandlers = { onCatalogChanged: () => fetchList() }

const columns: DataTableColumn[] = [
  { key: 'slug', label: t('web.inference.providers.datatable.columns.slug'), sortable: true },
  { key: 'name', label: t('web.inference.providers.datatable.columns.name'), sortable: true },
  { key: 'is_active', label: t('web.inference.providers.datatable.columns.is_active'), sortable: true, align: 'center' },
  { key: 'model_rates_count', label: t('web.inference.providers.datatable.columns.model_rates_count'), sortable: false, align: 'center' },
  { key: 'updated_at', label: t('web.inference.providers.datatable.columns.updated_at'), sortable: true, align: 'end' },
]

function editProvider(row: InferenceProvider): void {
  const to = queryRowActionTo(findQueryRowAction(row.actions, 'edit'))
    ?? queryRowActionTo(findQueryRowAction(row.actions, 'view'))
  if (to) void router.push(to)
}

function providerActions(row: InferenceProvider) {
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
    showSuccess(t('api.inference.providers.deleted'))
    deleteTarget.value = null
    await fetchList()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.operation_failed'))
  }
}

onMounted(() => {
  subscribe(realtimeHandlers)
})

onUnmounted(() => {
  unsubscribe(realtimeHandlers)
})
</script>

<template>
  <Card :title="t('web.inference.providers.list_title')">
    <template #actions>
      <router-link v-if="canManage" class="btn btn-primary btn-sm" :to="{ name: 'inference.providers.create.view' }">
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.inference.providers.add_button') }}
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
      :search-placeholder="t('web.inference.providers.search_placeholder')"
      empty-icon="bi-hdd-network"
      :empty-title="t('web.inference.providers.empty_title')"
      @row-click="editProvider"
      @update:page="onPage"
      @update:per-page="onPerPage"
      @update:search="onSearch"
    >
      <template #cell-slug="{ row }: { row: InferenceProvider }">
        <code>{{ row.slug }}</code>
      </template>

      <template #cell-is_active="{ row }: { row: InferenceProvider }">
        <StatusBadge
          :status="row.is_active ? 'active' : 'inactive'"
          :label="row.is_active ? t('web.inference.providers.active') : t('web.inference.providers.inactive')"
        />
      </template>

      <template #cell-model_rates_count="{ row }: { row: InferenceProvider }">
        <span class="text-muted small">{{ row.model_rates_count ?? 0 }}</span>
      </template>

      <template #cell-updated_at="{ row }: { row: InferenceProvider }">
        <span class="text-muted small">{{ row.updated_at_formatted ?? row.updated_at ?? '—' }}</span>
      </template>

      <template #actions="{ row }: { row: InferenceProvider }">
        <RowActions :actions="providerActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
