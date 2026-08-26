<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions, { type RowAction } from '@/components/RowActions.vue'
import { confirmDialog } from '@/lib/swal'
import { useVtual } from '@/composables/useVtual'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { useServerDataTable } from '@/composables/useServerDataTable'
import type { ListParams } from '@/composables/useResource'
import type { VtualCreator } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { fetchOrphans, deleteCreator, orphanPagination } = useVtual()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

const items = ref<VtualCreator[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const searchQuery = ref('')
const canManage = computed(() => hasPermission('manage any vtual resource'))
const emptyTitle = computed(() =>
  searchQuery.value.trim()
    ? t('web.vtual-orphans.datatable.zero_records')
    : t('web.vtual-orphans.datatable.empty'),
)

async function fetchList(params?: ListParams): Promise<VtualCreator[]> {
  loading.value = true
  loadError.value = null
  try {
    items.value = await fetchOrphans(params)
    return items.value
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.vtual-orphans.errors.load_failed')
    items.value = []
    return []
  } finally {
    loading.value = false
  }
}

const { load, onPage, onPerPage, onSearch } = useServerDataTable(fetchList, orphanPagination)

function handleSearch(search: string): void {
  searchQuery.value = search
  onSearch(search)
}

const columns = computed<DataTableColumn[]>(() => [
  { key: 'display_name', label: t('web.vtual-orphans.datatable.columns.display_name'), sortable: true },
  { key: 'slug', label: t('web.vtual-orphans.datatable.columns.slug'), sortable: true },
  { key: 'channels_count', label: t('web.vtual-orphans.datatable.columns.channels'), sortable: true, align: 'center' },
  { key: 'created_at', label: t('web.vtual-orphans.datatable.columns.created_at'), sortable: true, align: 'end' },
])

function editOrphan(row: VtualCreator): void {
  router.push({ name: 'vtual.orphans.edit.view', params: { id: row.id } })
}

function orphanActions(row: VtualCreator): RowAction[] {
  return [
    {
      key: 'edit',
      icon: 'pencil',
      label: t('ui.actions.edit'),
      variant: 'secondary',
      to: { name: 'vtual.orphans.edit.view', params: { id: row.id } },
    },
    {
      key: 'delete',
      icon: 'trash3',
      label: t('ui.actions.delete'),
      variant: 'danger',
      onClick: () => {
        void archiveOrphan(row)
      },
    },
  ]
}

async function archiveOrphan(row: VtualCreator): Promise<void> {
  const confirmed = await confirmDialog({
    title: t('ui.datatable.delete'),
    text: t('web.vtual-orphans.datatable.confirm_delete'),
    confirmText: t('ui.actions.delete'),
  })
  if (!confirmed) {
    return
  }

  try {
    await deleteCreator(row.id)
    showSuccess(t('api.vtual.creator.archived'))
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-orphans.errors.archive_failed'))
  }
}
</script>

<template>
  <Card :title="t('web.vtual-orphans.list_title')">
    <template #actions>
      <router-link
        v-if="canManage"
        class="btn btn-primary btn-sm"
        :to="{ name: 'vtual.orphans.create.view' }"
      >
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.vtual-orphans.add_button') }}
      </router-link>
    </template>

    <p class="text-muted small mb-3">{{ t('web.vtual-orphans.subtitle') }}</p>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :error="loadError"
      @retry="load()"
      server
      :total="orphanPagination.total"
      :page="orphanPagination.current_page"
      :per-page="orphanPagination.per_page"
      :search-placeholder="t('web.vtual-orphans.datatable.search_placeholder')"
      empty-icon="bi-person-plus"
      :empty-title="emptyTitle"
      @row-click="editOrphan"
      @update:page="onPage"
      @update:per-page="onPerPage"
      @update:search="handleSearch"
    >
      <template #cell-slug="{ row }: { row: VtualCreator }">
        <code>{{ row.slug }}</code>
      </template>

      <template #cell-channels_count="{ row }: { row: VtualCreator }">
        {{ row.channels_count ?? 0 }}
      </template>

      <template #cell-created_at="{ row }: { row: VtualCreator }">
        <span class="text-muted small">{{ row.created_at_formatted ?? row.created_at ?? '—' }}</span>
      </template>

      <template v-if="canManage" #actions="{ row }: { row: VtualCreator }">
        <RowActions :actions="orphanActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
