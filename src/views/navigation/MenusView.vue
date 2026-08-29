<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import RowActions, { type RowAction } from '@/components/RowActions.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import ErrorState from '@/components/ErrorState.vue'
import EmptyState from '@/components/EmptyState.vue'
import { confirmDialog } from '@/lib/swal'
import { useMenus } from '@/composables/navigation/useMenus'
import { useMenuLayouts } from '@/composables/navigation/useMenuLayouts'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import type { MenuListItem } from '@/api/types'

const { t } = useI18n()
const { items, loading, error, fetchList, deleteMenu } = useMenus()
const { layouts: availableLayouts, loadLayouts } = useMenuLayouts()
const { success: showSuccess, error: showError } = useAlert()
const { hasPermission } = useAuth()

const layout = ref('sidebar')
const layoutLabel = (key: string): string => {
  const fallback: Record<string, string> = {
    sidebar: t('web.menus.form.layouts.sidebar'),
    navbar: t('web.menus.form.layouts.navbar'),
    vtual: t('web.menus.form.layouts.vtual'),
  }
  return fallback[key] ?? key
}
const canManage = computed(() => hasPermission('manage menu'))

const searchQuery = ref('')

const filtered = computed<MenuListItem[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((row) => {
    const name = String(row.name ?? '').toLowerCase()
    const route = String(row.route ?? '').toLowerCase()
    return name.includes(q) || route.includes(q)
  })
})

const deleteTarget = ref<MenuListItem | null>(null)
const cascade = ref(false)
const deleting = ref(false)

function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[ch] ?? ch)
}

function menuActions(row: MenuListItem): RowAction[] {
  return [
    {
      key: 'edit',
      icon: 'pencil',
      label: t('ui.actions.edit'),
      variant: 'primary',
      to: { name: 'menus.edit.view', params: { id: row.id }, query: { layout: layout.value } },
    },
    {
      key: 'delete',
      icon: 'trash3',
      label: t('ui.actions.delete'),
      variant: 'danger',
      onClick: () => confirmDelete(row),
    },
  ]
}

async function confirmDelete(row: MenuListItem): Promise<void> {
  deleteTarget.value = row
  cascade.value = (row.children_count ?? 0) > 0
  const confirmed = await confirmDialog({
    title: `Delete &quot;${escapeHtml(row.name)}&quot;`,
    text: t('web.menus.delete_confirm_question', { name: row.name }),
    confirmText: t('ui.actions.delete'),
  })
  if (confirmed) await handleDelete()
  else deleteTarget.value = null
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

async function load(): Promise<void> {
  loadLayouts().catch(() => {})
  await fetchList(layout.value)
}

onMounted(load)
</script>

<template>
  <Card :title="t('web.menus.card_title')">
    <template #actions>
      <div class="d-flex gap-2">
        <select v-model="layout" class="form-select form-select-sm" style="width: auto;" @change="load">
          <option v-for="key in (availableLayouts.length ? availableLayouts : ['sidebar', 'navbar'])" :key="key" :value="key">{{ layoutLabel(key) }}</option>
        </select>
        <router-link v-if="canManage" class="btn btn-outline-secondary btn-sm" :to="{ name: 'menus.trashed.view', query: { layout: layout } }">
          <i class="bi bi-trash3 me-1"></i> Trashed
        </router-link>
        <router-link v-if="canManage" class="btn btn-primary btn-sm" :to="{ name: 'menus.create.view', query: { layout: layout } }">
          <i class="bi bi-plus-lg me-1"></i> Add Menu
        </router-link>
      </div>
    </template>

    <SkeletonBlock v-if="loading" variant="line" :lines="10" />
    <ErrorState v-else-if="error" :message="error" @retry="fetchList(layout)" />
    <div v-else>
      <div class="mb-3">
        <input
          v-model="searchQuery"
          type="search"
          class="form-control form-control-sm"
          :placeholder="t('web.menus.search_placeholder')"
          aria-label="Search menus"
        />
      </div>

      <EmptyState
        v-if="filtered.length === 0"
        icon="bi-list-nested"
        :title="t('web.menus.empty_list')"
      />

      <div v-else class="table-responsive">
        <table class="table table-sm table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>{{ t('web.menus.columns.name') }}</th>
              <th class="text-center" style="width: 60px;">{{ t('web.menus.columns.type') }}</th>
              <th style="width: 25%;">{{ t('web.menus.columns.route') }}</th>
              <th class="text-center" style="width: 60px;">{{ t('web.menus.columns.order') }}</th>
              <th style="width: 120px;">{{ t('web.menus.columns.attributes') }}</th>
              <th v-if="canManage" class="text-end" style="width: 100px;">{{ t('ui.labels.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filtered" :key="row.id">
              <td>
                <span :class="{ 'ps-3': row.type === 'p', 'ps-4': row.type === 'c' }">
                  <i v-if="row.icon" class="bi me-1" :class="row.icon" aria-hidden="true"></i>
                  <span :class="{ 'fw-bold': (row.children_count ?? 0) > 0 }">{{ row.name }}</span>
                  <span v-if="(row.children_count ?? 0) > 0" class="badge text-bg-light border ms-1" :title="`${row.children_count} children`">
                    <i class="bi bi-diagram-3" aria-hidden="true"></i> {{ row.children_count }}
                  </span>
                </span>
              </td>
              <td class="text-center"><code>{{ row.type }}</code></td>
              <td>{{ row.route ?? '—' }}</td>
              <td class="text-center">{{ row.order ?? '—' }}</td>
              <td>
                <span v-if="row.is_authenticate" class="badge text-bg-info me-1">auth</span>
                <span v-if="row.is_guest_only" class="badge text-bg-secondary me-1">guest</span>
                <span v-if="!row.is_authenticate && !row.is_guest_only" class="text-muted">—</span>
              </td>
              <td v-if="canManage" class="text-end">
                <RowActions :actions="menuActions(row)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </Card>
</template>
