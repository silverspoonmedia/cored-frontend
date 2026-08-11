<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useMenus } from '@/composables/useMenus'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import type { MenuListItem } from '@/api/types'

const router = useRouter()
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
  const hasChildren = (deleteTarget.value.children_count ?? 0) > 0
  return `Are you sure you want to delete this menu?${hasChildren ? ' This menu has children — they will be orphaned unless cascade is enabled.' : ''}`
})

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'type', label: 'Type', sortable: true, align: 'center' },
  { key: 'route', label: 'Route', sortable: false },
  { key: 'order', label: 'Order', sortable: true, align: 'center' },
  { key: 'attributes', label: 'Attributes', sortable: false },
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
    showSuccess(`Menu "${deleteTarget.value.name}" deleted.`)
    deleteTarget.value = null
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to delete menu')
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card title="Navigation Menus">
    <template #actions>
      <div class="d-flex gap-2">
        <select v-model="layout" class="form-select form-select-sm" style="width: auto;" @change="load">
          <option value="sidebar">Sidebar</option>
          <option value="navbar">Navbar</option>
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
      search-placeholder="Search menus…"
      empty-icon="bi-list-nested"
      empty-title="No menus found"
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
      confirm-label="Delete"
      confirm-variant="danger"
      @confirm="handleDelete"
    >
    </ConfirmModal>
  </Card>
</template>
