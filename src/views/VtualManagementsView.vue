<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions, { type RowAction } from '@/components/RowActions.vue'
import { confirmDialog } from '@/lib/swal'
import { useVtualManagements } from '@/composables/useVtualManagements'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { useServerDataTable } from '@/composables/useServerDataTable'
import type { ListParams } from '@/composables/useResource'
import type { VtualManagement } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { fetchList, destroy, pagination, error } = useVtualManagements()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

const items = ref<VtualManagement[]>([])
const loading = ref(true)
const searchQuery = ref('')
const canManage = computed(() => hasPermission('manage any vtual resource'))
const emptyTitle = computed(() =>
  searchQuery.value.trim()
    ? t('web.vtual-managements.datatable.zero_records')
    : t('web.vtual-managements.datatable.empty'),
)

async function loadList(params?: ListParams): Promise<VtualManagement[]> {
  loading.value = true
  try {
    items.value = await fetchList(params)
    return items.value
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.load_failed'))
    items.value = []
    return []
  } finally {
    loading.value = false
  }
}

const { load, onPage, onPerPage, onSearch } = useServerDataTable(loadList, pagination)

function handleSearch(search: string): void {
  searchQuery.value = search
  onSearch(search)
}

const columns = computed<DataTableColumn[]>(() => [
  { key: 'name', label: t('web.vtual-managements.datatable.columns.name'), sortable: true },
  { key: 'slug', label: t('web.vtual-managements.datatable.columns.slug'), sortable: true },
  { key: 'status', label: t('web.vtual-managements.datatable.columns.status'), sortable: true, align: 'center' },
  { key: 'created_at', label: t('web.vtual-managements.datatable.columns.created_at'), sortable: true, align: 'end' },
])

function editManagement(row: VtualManagement): void {
  router.push({ name: 'vtual.managements.edit.view', params: { id: row.id } })
}

function managementActions(row: VtualManagement): RowAction[] {
  return [
    {
      key: 'edit',
      icon: 'pencil',
      label: t('ui.actions.edit'),
      variant: 'secondary',
      to: { name: 'vtual.managements.edit.view', params: { id: row.id } },
    },
    {
      key: 'archive',
      icon: 'trash3',
      label: t('ui.actions.delete'),
      variant: 'danger',
      onClick: () => {
        void archiveManagement(row)
      },
    },
  ]
}

async function archiveManagement(row: VtualManagement): Promise<void> {
  const confirmed = await confirmDialog({
    title: t('ui.datatable.delete'),
    text: t('web.vtual-managements.datatable.confirm_delete'),
    confirmText: t('ui.actions.delete'),
  })
  if (!confirmed) {
    return
  }

  try {
    await destroy(row.id)
    showSuccess(t('api.vtual.management.updated'))
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.archive_failed'))
  }
}
</script>

<template>
  <Card :title="t('web.vtual-managements.list_title')">
    <template #actions>
      <router-link
        v-if="canManage"
        class="btn btn-primary btn-sm"
        :to="{ name: 'vtual.managements.create.view' }"
      >
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.vtual-managements.add_button') }}
      </router-link>
    </template>

    <p class="text-muted small mb-3">{{ t('web.vtual-managements.subtitle') }}</p>

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
      :search-placeholder="t('web.vtual-managements.datatable.search_placeholder')"
      empty-icon="bi-people"
      :empty-title="emptyTitle"
      @row-click="editManagement"
      @update:page="onPage"
      @update:per-page="onPerPage"
      @update:search="handleSearch"
    >
      <template #cell-slug="{ row }: { row: VtualManagement }">
        <code>{{ row.slug }}</code>
      </template>

      <template #cell-status="{ row }: { row: VtualManagement }">
        <span class="badge" :class="row.status === 'active' ? 'text-bg-success' : 'text-bg-secondary'">
          {{ row.status }}
        </span>
      </template>

      <template #cell-created_at="{ row }: { row: VtualManagement }">
        <span class="text-muted small">{{ row.created_at_formatted ?? row.created_at ?? '-' }}</span>
      </template>

      <template v-if="canManage" #actions="{ row }: { row: VtualManagement }">
        <RowActions :actions="managementActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
