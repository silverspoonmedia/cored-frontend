<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useMenus } from '@/composables/useMenus'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import type { MenuTrashedItem } from '@/api/types'

const router = useRouter()
const { trashedItems, loading, fetchTrashed, restoreMenu } = useMenus()
const { success: showSuccess, error: showError } = useAlert()
const { hasPermission } = useAuth()

const layout = ref((router.currentRoute.value.query.layout as string) || 'sidebar')
const canRestore = computed(() => hasPermission('restore menu'))
const restoringId = ref<string | null>(null)

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'ancestor_path', label: 'Ancestors', sortable: false },
  { key: 'type', label: 'Type', sortable: true, align: 'center' },
  { key: 'route', label: 'Route', sortable: false },
]

async function load(): Promise<void> {
  await fetchTrashed(layout.value)
}

async function handleRestore(row: MenuTrashedItem): Promise<void> {
  restoringId.value = row.id
  try {
    await restoreMenu(row.id)
    showSuccess(`Menu "${row.name}" restored.`)
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to restore menu')
  } finally {
    restoringId.value = null
  }
}

onMounted(load)
</script>

<template>
  <Card title="Trashed Menus">
    <template #actions>
      <div class="d-flex gap-2">
        <select v-model="layout" class="form-select form-select-sm" style="width: auto;" @change="load">
          <option value="sidebar">Sidebar</option>
          <option value="navbar">Navbar</option>
        </select>
        <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'menus.index.view', query: { layout: layout } })">
          <i class="bi bi-arrow-left me-1"></i> Back to List
        </button>
      </div>
    </template>

    <DataTable
      :columns="columns"
      :rows="trashedItems"
      :loading="loading"
      search-placeholder="Search trashed menus…"
      empty-icon="bi-trash3"
      empty-title="No trashed menus found"
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
        <button
          class="btn btn-success btn-sm"
          :disabled="restoringId === row.id"
          @click.stop="handleRestore(row)"
        >
          <i class="bi bi-arrow-counterclockwise me-1"></i> Restore
        </button>
      </template>
    </DataTable>
  </Card>
</template>
