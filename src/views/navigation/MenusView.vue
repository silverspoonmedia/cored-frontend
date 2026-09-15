<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import RowActions from '@/components/RowActions.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import ErrorState from '@/components/ErrorState.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import { useMenus } from '@/composables/navigation/useMenus'
import { useMenuLayouts } from '@/composables/navigation/useMenuLayouts'
import { useMenusRealtime } from '@/composables/navigation/useMenusRealtime'
import { useEchoResync } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import type { MenuListItem, QueryRowAction } from '@/api/types'
import { confirmQueryMutate, mapQueryRowActions } from '@/utils/mapQueryRowActions'

const { t } = useI18n()
const { items, loading, error, fetchList, deleteMenu } = useMenus()
const { layouts: availableLayouts, loadLayouts } = useMenuLayouts()
const { success: showSuccess, error: showError } = useAlert()
const { hasPermission } = useAuth()

const layout = ref('sidebar')
const layoutLabel = (key: string): string => t(`web.menus.form.layouts.${key}`)
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

function menuActions(row: MenuListItem) {
  return mapQueryRowActions(row.actions, {
    delete: (action) => {
      void confirmDelete(row, action)
    },
  })
}

async function confirmDelete(row: MenuListItem, action: QueryRowAction): Promise<void> {
  deleteTarget.value = row
  cascade.value = (row.children_count ?? 0) > 0
  const confirmed = await confirmQueryMutate(action, t('ui.actions.delete'))
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

// Live update: menu mutations anywhere refresh the admin list live.
const { subscribe: subscribeMenus, unsubscribe: unsubscribeMenus } = useMenusRealtime()
const realtimeHandlers = { onMenuTreeChanged: () => { void load() } }

useEchoResync(() => { void load() })

onMounted(() => {
  load()
  subscribeMenus(realtimeHandlers)
})

onUnmounted(() => {
  unsubscribeMenus(realtimeHandlers)
})
</script>

<template>
  <Card :title="t('web.menus.card_title')">
    <template #actions>
      <div class="d-flex gap-2">
        <select v-model="layout" class="form-select form-select-sm" style="width: auto;" @change="load">
          <option v-for="key in (availableLayouts.length ? availableLayouts : ['sidebar', 'navbar'])" :key="key" :value="key">{{ layoutLabel(key) }}</option>
        </select>
        <router-link v-if="canManage" class="btn btn-outline-secondary btn-sm" :to="{ name: 'menus.trashed.view', query: { layout: layout } }">
          <i class="bi bi-trash3 me-1"></i> {{ t('web.menus.trashed_breadcrumb') }}
        </router-link>
        <router-link v-if="canManage" class="btn btn-primary btn-sm" :to="{ name: 'menus.create.view', query: { layout: layout } }">
          <i class="bi bi-plus-lg me-1"></i> {{ t('web.menus.add_button') }}
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
          :aria-label="t('web.menus.search_aria_label')"
        />
      </div>

      <div class="table-responsive">
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
            <TableEmptyRow
              v-if="filtered.length === 0"
              :colspan="canManage ? 6 : 5"
              icon="bi-list-nested"
              :title="t('web.menus.empty_list')"
            />
            <tr v-for="row in filtered" :key="row.id">
              <td>
                <span :class="{ 'ps-3': row.type === 'p', 'ps-4': row.type === 'c' }">
                  <i v-if="row.icon" class="bi me-1" :class="row.icon" aria-hidden="true"></i>
                  <span :class="{ 'fw-bold': (row.children_count ?? 0) > 0 }">{{ row.name }}</span>
                  <span v-if="(row.children_count ?? 0) > 0" class="badge text-bg-light border ms-1" :title="t('web.menus.has_children_title', { count: row.children_count })">
                    <i class="bi bi-diagram-3" aria-hidden="true"></i> {{ row.children_count }}
                  </span>
                </span>
              </td>
              <td class="text-center"><code>{{ row.type }}</code></td>
              <td>{{ row.route ?? '—' }}</td>
              <td class="text-center">{{ row.order ?? '—' }}</td>
              <td>
                <span v-if="row.audience === 'auth'" class="badge text-bg-info me-1">{{ t('web.menus.attributes.auth') }}</span>
                <span v-else-if="row.audience === 'role'" class="badge text-bg-warning me-1">{{ t('web.menus.attributes.role') }}</span>
                <span v-else-if="row.audience === 'guest'" class="badge text-bg-secondary me-1">{{ t('web.menus.attributes.guest') }}</span>
                <span v-else class="text-muted">—</span>
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
