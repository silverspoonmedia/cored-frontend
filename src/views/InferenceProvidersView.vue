<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions, { type RowAction } from '@/components/RowActions.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useInferenceProviders } from '@/composables/useInferenceProviders'
import { useAuth } from '@/stores/auth'
import { useServerDataTable } from '@/composables/useServerDataTable'
import { useAlert } from '@/composables/useAlert'
import { useListingLiveUpdate } from '@/composables/useListingLiveUpdate'
import { useInferenceRealtime } from '@/composables/useInferenceRealtime'
import type { InferenceProvider } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { items, loading, fetchList, pagination, destroy } = useInferenceProviders()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const canManage = computed(() => hasPermission('manage inference catalog'))
const { onPage, onPerPage, onSearch } = useServerDataTable(fetchList, pagination)
const deleteTarget = ref<InferenceProvider | null>(null)
const showDeleteModal = ref(false)

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
  router.push({ name: 'inference.providers.edit.view', params: { id: row.id } })
}

function viewProvider(row: InferenceProvider): void {
  router.push({ name: 'inference.providers.show.view', params: { id: row.id } })
}

function providerActions(row: InferenceProvider): RowAction[] {
  const actions: RowAction[] = [
    { key: 'view', icon: 'eye', label: t('actions.view'), variant: 'secondary', onClick: () => viewProvider(row) },
  ]
  if (canManage.value) {
    actions.push({ key: 'edit', icon: 'pencil', label: t('ui.actions.edit'), variant: 'primary', onClick: () => editProvider(row) })
    actions.push({
      key: 'delete',
      icon: 'trash3',
      label: t('ui.actions.delete'),
      variant: 'danger',
      onClick: () => {
        deleteTarget.value = row
        showDeleteModal.value = true
      },
    })
  }
  return actions
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
      <button v-if="canManage" class="btn btn-primary btn-sm" @click="router.push({ name: 'inference.providers.create.view' })">
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.inference.providers.add_button') }}
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

    <ConfirmModal
      v-model="showDeleteModal"
      :title="t('ui.datatable.delete')"
      :message="t('web.inference.confirm.delete')"
      :confirm-label="t('ui.actions.delete')"
      confirm-variant="danger"
      @confirm="handleDelete"
    />
  </Card>
</template>
