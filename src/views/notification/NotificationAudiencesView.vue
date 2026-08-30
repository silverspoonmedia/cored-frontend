<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useNotificationAudiences } from '@/composables/notification/useNotificationAudiences'
import { useAuth } from '@/stores/auth'
import type { NotificationAudience } from '@/api/types'

const { items, loading, error, load } = useNotificationAudiences()
const { hasPermission } = useAuth()
const { t } = useI18n()
const router = useRouter()

const canManage = computed(() => hasPermission('manage settings'))

const columns = computed<DataTableColumn[]>(() => [
  { key: 'type', label: t('web.notification-audiences.type_col'), sortable: true },
  { key: 'roles', label: t('web.notification-audiences.roles_col'), sortable: false },
  { key: 'notify_subject_user', label: t('web.notification-audiences.include_subject_col'), sortable: true },
])

function editAudience(row: NotificationAudience): void {
  if (!canManage.value) return
  router.push({ name: 'notification-audiences.edit.view', params: { type: row.type } })
}

onMounted(() => {
  load()
})
</script>

<template>
  <Card :title="t('web.notification-audiences.index_title')">
    <template #actions>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        :disabled="loading"
        @click="load(true)"
      >
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
      </button>
    </template>

    <p class="text-muted small mb-3">
      {{ t('web.notification-audiences.index_subtitle') }}
    </p>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading && !items.length"
      :error="error && !items.length ? error : null"
      empty-icon="bi-bell-slash"
      :empty-title="t('web.notification-audiences.empty_title')"
      @retry="load(true)"
      @row-click="editAudience"
    >
      <template #cell-type="{ row }: { row: NotificationAudience }">
        <i :class="row.icon || 'bi bi-bell'" class="me-2" aria-hidden="true"></i>
        {{ row.label || row.type }}
        <div class="text-muted small">
          <code>{{ row.type }}</code>
        </div>
      </template>

      <template #cell-roles="{ row }: { row: NotificationAudience }">
        <template v-if="row.roles.length">
          {{ row.roles.join(', ') }}
        </template>
        <span v-else class="text-muted">—</span>
      </template>

      <template #cell-notify_subject_user="{ row }: { row: NotificationAudience }">
        {{ row.notify_subject_user ? t('web.currencies.yes') : t('web.currencies.no') }}
      </template>

      <template v-if="canManage" #actions="{ row }: { row: NotificationAudience }">
        <router-link
          :to="{ name: 'notification-audiences.edit.view', params: { type: row.type } }"
          class="btn btn-sm btn-outline-primary"
        >
          <i class="bi bi-pencil" aria-hidden="true"></i> {{ t('actions.edit') }}
        </router-link>
      </template>
    </DataTable>
  </Card>
</template>
