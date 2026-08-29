<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import { useMenus } from '@/composables/navigation/useMenus'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import type { MenuTrashedItem } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { trashedItems, loading, error, fetchTrashed, restoreMenu } = useMenus()
const { success: showSuccess, error: showError } = useAlert()
const { hasPermission } = useAuth()

const layout = ref((router.currentRoute.value.query.layout as string) || 'sidebar')
const canRestore = computed(() => hasPermission('restore menu'))
const restoringId = ref<string | null>(null)

const columns: DataTableColumn[] = [
  { key: 'name', label: t('web.menus.columns.name'), sortable: true },
  { key: 'ancestor_path', label: t('web.menus.columns.ancestors'), sortable: false },
  { key: 'type', label: t('web.menus.columns.type'), sortable: true, align: 'center' },
  { key: 'route', label: t('web.menus.columns.route'), sortable: false },
]

async function load(): Promise<void> {
  await fetchTrashed(layout.value)
}

async function handleRestore(row: MenuTrashedItem): Promise<void> {
  restoringId.value = row.id
  try {
    await restoreMenu(row.id)
    showSuccess(t('web.menus.restored', { name: row.name }))
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.menus.restore_failed'))
  } finally {
    restoringId.value = null
  }
}

onMounted(load)
</script>

<template>
  <Card :title="t('web.menus.trashed_title')">
    <template #actions>
      <div class="d-flex gap-2">
        <select v-model="layout" class="form-select form-select-sm" style="width: auto;" @change="load">
          <option value="sidebar">{{ t('web.menus.form.layouts.sidebar') }}</option>
          <option value="navbar">{{ t('web.menus.form.layouts.navbar') }}</option>
        </select>
        <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'menus.index.view', query: { layout: layout } }">
          <i class="bi bi-arrow-left me-1"></i> {{ t('web.menus.back_to_list') }}
        </router-link>
      </div>
    </template>

    <DataTable
      :columns="columns"
      :rows="trashedItems"
      :loading="loading"
      :error="error"
      @retry="fetchTrashed()"
      :search-placeholder="t('web.menus.search_placeholder')"
      empty-icon="bi-trash3"
      :empty-title="t('web.menus.empty_trashed')"
    >
      <template #cell-name="{ row }: { row: MenuTrashedItem }">
        <i v-if="row.icon" class="bi me-1" :class="row.icon" aria-hidden="true"></i>
        <span class="fw-semibold">{{ row.name }}</span>
        <div class="text-muted small">Deleted {{ row.deleted_at_human ?? row.deleted_at_formatted ?? row.deleted_at ?? '' }}</div>
      </template>

      <template #cell-ancestor_path="{ row }: { row: MenuTrashedItem }">
        <template v-if="row.ancestor_path">
          {{ row.ancestor_path }}
        </template>
        <span v-else class="text-muted">—</span>
      </template>

      <template #cell-type="{ row }: { row: MenuTrashedItem }">
        <code>{{ row.type }}</code>
      </template>

      <template #cell-route="{ row }: { row: MenuTrashedItem }">
        {{ row.route ?? '—' }}
      </template>

      <template v-if="canRestore" #actions="{ row }: { row: MenuTrashedItem }">
        <RowActions
          :actions="[{
            key: 'restore',
            icon: 'arrow-counterclockwise',
            label: t('actions.restore'),
            variant: 'success',
            disabled: restoringId === row.id,
            onClick: () => handleRestore(row),
          }]"
        />
      </template>
    </DataTable>
  </Card>
</template>
