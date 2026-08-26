<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions, { type RowAction } from '@/components/RowActions.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { confirmDialog } from '@/lib/swal'
import { useInferenceModelCards } from '@/composables/useInferenceModelCards'
import { useAuth } from '@/stores/auth'
import { useListingLiveUpdate } from '@/composables/useListingLiveUpdate'
import { useInferenceRealtime } from '@/composables/useInferenceRealtime'
import { useServerDataTable } from '@/composables/useServerDataTable'
import { useAlert } from '@/composables/useAlert'
import type { AiModelCard } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { items, loading, error, fetchList, pagination, destroy } = useInferenceModelCards()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const canManage = computed(() => hasPermission('manage inference catalog'))
const { onPage, onPerPage, onSearch } = useServerDataTable(fetchList, pagination)
const deleteTarget = ref<AiModelCard | null>(null)

const columns: DataTableColumn[] = [
  { key: 'slug', label: t('web.inference.model_cards.datatable.columns.slug'), sortable: true },
  { key: 'display_name', label: t('web.inference.model_cards.datatable.columns.display_name'), sortable: true },
  { key: 'is_active', label: t('web.inference.model_cards.datatable.columns.is_active'), sortable: true, align: 'center' },
  { key: 'needs_rate_classification', label: t('web.inference.model_cards.needs_rate_label'), sortable: false, align: 'center' },
  { key: 'updated_at', label: t('web.inference.model_cards.datatable.columns.updated_at'), sortable: true, align: 'end' },
]

useListingLiveUpdate('inference-model-cards-table', () => fetchList())

const { subscribe, unsubscribe } = useInferenceRealtime()
const realtimeHandlers = { onCatalogChanged: () => fetchList() }

function showCard(row: AiModelCard): void {
  router.push({ name: 'inference.model-cards.show.view', params: { id: row.id } })
}

function editCard(row: AiModelCard): void {
  router.push({ name: 'inference.model-cards.edit.view', params: { id: row.id } })
}

function cardActions(row: AiModelCard): RowAction[] {
  const actions: RowAction[] = [
    { key: 'view', icon: 'eye', label: t('actions.view'), variant: 'info', to: { name: 'inference.model-cards.show.view', params: { id: row.id } } },
  ]
  if (canManage.value) {
    actions.push({ key: 'edit', icon: 'pencil', label: t('ui.actions.edit'), variant: 'primary', to: { name: 'inference.model-cards.edit.view', params: { id: row.id } } })
    actions.push({
      key: 'delete',
      icon: 'trash3',
      label: t('ui.actions.delete'),
      variant: 'danger',
      onClick: async () => {
        deleteTarget.value = row
        const confirmed = await confirmDialog({
          title: t('ui.datatable.delete'),
          text: t('web.inference.confirm.delete'),
          confirmText: t('ui.actions.delete'),
        })
        if (confirmed) await handleDelete()
      },
    })
  }
  return actions
}

async function handleDelete(): Promise<void> {
  if (!deleteTarget.value) return
  try {
    await destroy(deleteTarget.value.id)
    showSuccess(t('api.inference.model_cards.deleted'))
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
  <Card :title="t('web.inference.model_cards.list_title')">
    <template #actions>
      <router-link v-if="canManage" class="btn btn-primary btn-sm" :to="{ name: 'inference.model-cards.create.view' }">
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.inference.model_cards.add_button') }}
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
      :search-placeholder="t('web.inference.model_cards.search_placeholder')"
      empty-icon="bi-cpu"
      :empty-title="t('web.inference.model_cards.empty_title')"
      @row-click="showCard"
      @update:page="onPage"
      @update:per-page="onPerPage"
      @update:search="onSearch"
    >
      <template #cell-slug="{ row }: { row: AiModelCard }">
        <code>{{ row.slug }}</code>
      </template>

      <template #cell-display_name="{ row }: { row: AiModelCard }">
        {{ row.display_name ?? '—' }}
      </template>

      <template #cell-is_active="{ row }: { row: AiModelCard }">
        <StatusBadge
          :status="row.is_active ? 'active' : 'inactive'"
          :label="row.is_active ? t('web.inference.model_cards.active_badge') : t('web.inference.model_cards.inactive_badge')"
        />
      </template>

      <template #cell-needs_rate_classification="{ row }: { row: AiModelCard }">
        <span v-if="row.needs_rate_classification" class="badge text-bg-warning">{{ t('web.inference.model_cards.yes_badge') }}</span>
        <span v-else class="text-muted">—</span>
      </template>

      <template #cell-updated_at="{ row }: { row: AiModelCard }">
        <span class="text-muted small">{{ row.updated_at_formatted ?? row.updated_at ?? '—' }}</span>
      </template>

      <template #actions="{ row }: { row: AiModelCard }">
        <RowActions :actions="cardActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
