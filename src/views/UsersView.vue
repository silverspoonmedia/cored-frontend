<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useUsers } from '@/composables/useUsers'
import { useAuth } from '@/stores/auth'
import { useListingLiveUpdate } from '@/composables/useListingLiveUpdate'
import type { UserManagement } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { items, loading, fetchList } = useUsers()
const { hasPermission } = useAuth()

const canCreate = computed(() => hasPermission('create user'))

const columns: DataTableColumn[] = [
  { key: 'name', label: t('web.users.datatable.columns.name'), sortable: true },
  { key: 'email', label: t('web.users.datatable.columns.email'), sortable: true },
  { key: 'roles', label: t('web.users.datatable.columns.roles'), sortable: false },
  { key: 'created_at', label: t('web.users.datatable.columns.created'), sortable: true, align: 'end' },
]

useListingLiveUpdate('users-table', () => fetchList())

onMounted(() => {
  fetchList()
})

function editUser(row: UserManagement): void {
  router.push({ name: 'users.edit.view', params: { id: row.id } })
}
</script>

<template>
  <Card :title="t('web.users.list_title')">
    <template #actions>
      <button
        v-if="canCreate"
        class="btn btn-primary btn-sm"
        @click="router.push({ name: 'users.create.view' })"
      >
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.users.add_button') }}
      </button>
    </template>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :search-placeholder="t('web.users.search_placeholder')"
      empty-icon="bi-people"
      :empty-title="t('web.users.empty_title')"
      @row-click="editUser"
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
        <button class="btn btn-outline-secondary btn-sm" @click.stop="editUser(row)">
          {{ t('ui.actions.edit') }}
        </button>
      </template>
    </DataTable>
  </Card>
</template>
