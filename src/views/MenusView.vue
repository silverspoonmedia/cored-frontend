<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useMenus } from '@/composables/useMenus'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import type { MenuListItem } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { items, loading, fetchList, deleteMenu } = useMenus()
const { success: showSuccess, error: showError } = useAlert()
const { hasPermission } = useAuth()

const layout = ref('sidebar')
const canManage = computed(() => hasPermission('manage menu'))

const deleteTarget = ref<MenuListItem | null>(null)
const showDeleteModal = ref(false)
const cascade = ref(false)
const deleting = ref(false)

const deleteMessage = computed(() => {
  if (!deleteTarget.value) return ''
  return t('web.menus.delete_confirm_question', { name: deleteTarget.value.name })
})

const columns: DataTableColumn[] = [
  { key: 'name', label: t('web.menus.columns.name'), sortable: true },
  { key: 'type', label: t('web.menus.columns.type'), sortable: true, align: 'center' },
  { key: 'route', label: t('web.menus.columns.route'), sortable: false },
  { key: 'order', label: t('web.menus.columns.order'), sortable: true, align: 'center' },
  { key: 'attributes', label: t('web.menus.columns.attributes'), sortable: false },
]

async function load(): Promise<void> {
  await fetchList(layout.value)
}

function confirmDelete(row: MenuListItem): void {
  deleteTarget.value = row
  cascade.value = (row.children_count ?? 0) > 0
  showDeleteModal.value = true
}

async function handleDelete(): Promise<void> {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteMenu(deleteTarget.value.id, cascade.value)
    showSuccess(t('web.menus.deleted', { name: deleteTarget.value.name }))
    deleteTarget.value = null
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.menus.delete_failed'))
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card :title="t('web.menus.card_title')">
    <template #actions>
      <div class="d-flex gap-2">
        <select v-model="layout" class="form-select form-select-sm" style="width: auto;" @change="load">
          <option value="sidebar">{{ t('web.menus.form.layouts.sidebar') }}</option>
          <option value="navbar">{{ t('web.menus.form.layouts.navbar') }}</option>
        </select>
        <button v-if="canManage" class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'menus.trashed.view', query: { layout: layout } })">
          <i class="bi bi-trash3 me-1"></i> Trashed
        </button>
        <button v-if="canManage" class="btn btn-primary btn-sm" @click="router.push({ name: 'menus.create.view', query: { layout: layout } })">
          <i class="bi bi-plus-lg me-1"></i> Add Menu
        </button>
      </div>
    </template>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :searchable="true"
      :search-placeholder="t('web.menus.search_placeholder')"
      empty-icon="bi-list-nested"
      :empty-title="t('web.menus.empty_list')"
    >
      <template #cell-name="{ row }: { row: MenuListItem }">
        <span :class="{ 'ps-3': row.type === 'p', 'ps-4': row.type === 'c' }">
          <i v-if="row.icon" class="bi me-1" :class="row.icon" aria-hidden="true"></i>
          <span :class="{ 'fw-bold': (row.children_count ?? 0) > 0 }">{{ row.name }}</span>
          <span v-if="(row.children_count ?? 0) > 0" class="badge text-bg-light border ms-1" :title="`${row.children_count} children`">
            <i class="bi bi-diagram-3" aria-hidden="true"></i> {{ row.children_count }}
          </span>
        </span>
      </template>

      <template #cell-type="{ row }: { row: MenuListItem }">
        <code>{{ row.type }}</code>
      </template>

      <template #cell-route="{ row }: { row: MenuListItem }">
        {{ row.route ?? '—' }}
      </template>

      <template #cell-order="{ row }: { row: MenuListItem }">
        {{ row.order ?? '—' }}
      </template>

      <template #cell-attributes="{ row }: { row: MenuListItem }">
        <span v-if="row.is_authenticate" class="badge text-bg-info me-1">auth</span>
        <span v-if="row.is_guest_only" class="badge text-bg-secondary me-1">guest</span>
        <span v-if="!row.is_authenticate && !row.is_guest_only" class="text-muted">—</span>
      </template>

      <template v-if="canManage" #actions="{ row }: { row: MenuListItem }">
        <button class="btn btn-outline-primary btn-sm" @click.stop="router.push({ name: 'menus.edit.view', params: { id: row.id }, query: { layout: layout } })">
          <i class="bi bi-pencil" aria-hidden="true"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm" @click.stop="confirmDelete(row)">
          <i class="bi bi-trash3" aria-hidden="true"></i>
        </button>
      </template>
    </DataTable>

    <ConfirmModal
      v-model="showDeleteModal"
      :title="`Delete &quot;${deleteTarget?.name ?? ''}&quot;`"
      :message="deleteMessage"
      :confirm-label="t('ui.actions.delete')"
      confirm-variant="danger"
      @confirm="handleDelete"
    >
    </ConfirmModal>
  </Card>
</template>
