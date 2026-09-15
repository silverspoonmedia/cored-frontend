<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useNotifications } from '@/composables/notification/useNotifications'
import { useAuthSelfRealtime } from '@/composables/identity/useAuthSelfRealtime'
import { useEchoResync } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import type { AppNotification } from '@/api/types'
import { resolveNotificationLocation } from '@/utils/notificationTarget'

const { t } = useI18n()
const router = useRouter()
const { items, loading, error, fetchList, markAllRead, markAsRead } = useNotifications()
const { success: showSuccess, error: showError } = useAlert()

// Live update: new notifications arriving anywhere refresh this list. The
// channel is shared with the navbar bell (App.Models.User.{id}).
const { subscribe: subscribeAuthSelf, unsubscribe: unsubscribeAuthSelf } = useAuthSelfRealtime()
const authSelfHandlers = {
  onAuthStateChanged: () => { void fetchList() },
}

// Socket-outage recovery: mirror the realtime handler.
useEchoResync(() => { void fetchList() })

onMounted(() => {
  fetchList()
  subscribeAuthSelf(authSelfHandlers)
})

onUnmounted(() => {
  unsubscribeAuthSelf(authSelfHandlers)
})

async function handleMarkAllRead(): Promise<void> {
  try {
    await markAllRead()
    showSuccess(t('web.navbar.all_notifications_marked_read'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.notifications.mark_all_failed'))
  }
}

async function handleClick(n: AppNotification): Promise<void> {
  if (!n.is_read) {
    try {
      await markAsRead(n.id)
    } catch {
      // silent — still allow navigation
    }
  }
  const target = resolveNotificationLocation(router, n.action_route, n.action_params)
  if (target) {
    await router.push(target)
  }
}

function timeLabel(n: AppNotification): string {
  return n.created_at_human ?? n.created_at_formatted ?? n.created_at ?? '—'
}

const columns = computed<DataTableColumn[]>(() => [
  { key: 'message', label: t('web.notifications.columns.message'), sortable: true },
  { key: 'is_read', label: t('web.notifications.columns.status'), sortable: true },
  { key: 'created_at', label: t('web.notifications.columns.time'), sortable: true, align: 'end' },
])
</script>

<template>
  <Card :title="t('web.notifications.title')">
    <template #actions>
      <button
        v-if="items.length > 0"
        class="btn btn-outline-secondary btn-sm"
        :disabled="loading"
        @click="handleMarkAllRead"
      >
        <i class="bi bi-check2-all me-1"></i> {{ t('web.notifications.mark_all_read') }}
      </button>
    </template>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :error="error"
      empty-icon="bi-bell-slash"
      :empty-title="t('web.notifications.empty')"
      @retry="fetchList()"
      @row-click="handleClick"
    >
      <template #cell-message="{ row }: { row: AppNotification }">
        <span :class="{ 'fw-semibold': !row.is_read }">
          <i :class="row.icon || 'bi bi-bell'" class="me-2" aria-hidden="true"></i>
          {{ row.message }}
        </span>
      </template>

      <template #cell-is_read="{ row }: { row: AppNotification }">
        <span v-if="row.is_read" class="badge text-bg-light border text-muted">{{ t('web.notifications.status.read') }}</span>
        <span v-else class="badge text-bg-primary">{{ t('web.notifications.status.unread') }}</span>
      </template>

      <template #cell-created_at="{ row }: { row: AppNotification }">
        <span class="text-muted small">{{ timeLabel(row) }}</span>
      </template>
    </DataTable>
  </Card>
</template>
