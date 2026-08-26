<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions, { type RowAction } from '@/components/RowActions.vue'
import { confirmDialog } from '@/lib/swal'
import { useUsers } from '@/composables/useUsers'
import { useAuth } from '@/stores/auth'
import { useListingLiveUpdate } from '@/composables/useListingLiveUpdate'
import { useAdminRealtime } from '@/composables/useAdminRealtime'
import { useServerDataTable } from '@/composables/useServerDataTable'
import { useAlert } from '@/composables/useAlert'
import type { UserManagement } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { items, loading, error, fetchList, pagination, deleteUser } = useUsers()
const { hasPermission, user } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const { onPage, onPerPage, onSearch } = useServerDataTable(fetchList, pagination)

const canCreate = computed(() => hasPermission('create user'))
const canDelete = computed(() => hasPermission('delete user'))
const deleteTarget = ref<UserManagement | null>(null)
const deleting = ref(false)

const columns = computed<DataTableColumn[]>(() => [
  { key: 'name', label: t('web.users.datatable.columns.name'), sortable: true },
  { key: 'email', label: t('web.users.datatable.columns.email'), sortable: true },
  { key: 'roles', label: t('web.users.datatable.columns.roles'), sortable: false },
  { key: 'created_at', label: t('web.users.datatable.columns.created'), sortable: true, align: 'end' },
])

useListingLiveUpdate('users-table', () => fetchList())

const { subscribe: subscribeAdmin, unsubscribe: unsubscribeAdmin } = useAdminRealtime()
const adminHandlers = { onRbacChanged: () => fetchList() }

function editUser(row: UserManagement): void {
  router.push({ name: 'users.edit.view', params: { id: row.id } })
}

function userActions(row: UserManagement): RowAction[] {
  const actions: RowAction[] = [
    { key: 'edit', icon: 'pencil', label: t('ui.actions.edit'), variant: 'secondary', to: { name: 'users.edit.view', params: { id: row.id } } },
  ]
  if (canDelete.value && String(row.id) !== String(user.value?.id)) {
    actions.push({
      key: 'delete',
      icon: 'trash3',
      label: t('ui.actions.delete'),
      variant: 'danger',
      onClick: async () => {
        deleteTarget.value = row
        const confirmed = await confirmDialog({
          title: t('ui.datatable.delete'),
          text: t('ui.datatable.confirm.delete_user'),
          confirmText: t('ui.actions.delete'),
        })
        if (confirmed) await handleDelete()
      },
    })
  }
  return actions
}

onMounted(() => {
  subscribeAdmin(adminHandlers)
})

onUnmounted(() => {
  unsubscribeAdmin(adminHandlers)
})

async function handleDelete(): Promise<void> {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteUser(deleteTarget.value.id)
    showSuccess(t('api.users.deleted'))
    deleteTarget.value = null
    await fetchList()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.operation_failed'))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <Card :title="t('web.users.list_title')">
    <template #actions>
      <router-link
        v-if="canCreate"
        class="btn btn-primary btn-sm"
        :to="{ name: 'users.create.view' }"
      >
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.users.add_button') }}
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
      :search-placeholder="t('web.users.search_placeholder')"
      empty-icon="bi-people"
      :empty-title="t('web.users.empty_title')"
      @row-click="editUser"
      @update:page="onPage"
      @update:per-page="onPerPage"
      @update:search="onSearch"
    >
      <template #cell-name="{ row }: { row: UserManagement }">
        <div class="fw-medium">{{ row.name }}</div>
      </template>

      <template #cell-email="{ row }: { row: UserManagement }">
        {{ row.email }}
      </template>

      <template #cell-roles="{ row }: { row: UserManagement }">
        <span
          v-for="role in row.roles"
          :key="role.name"
          class="badge text-bg-info me-1"
        >
          {{ role.name }}
        </span>
        <span v-if="!row.roles || row.roles.length === 0" class="text-muted">—</span>
      </template>

      <template #cell-created_at="{ row }: { row: UserManagement }">
        <span class="text-muted small">{{ row.created_at_formatted ?? row.created_at ?? '—' }}</span>
      </template>

      <template #actions="{ row }: { row: UserManagement }">
        <RowActions :actions="userActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
