<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import { useNotifications } from '@/composables/useNotifications'
import { useAlert } from '@/composables/useAlert'
import type { AppNotification } from '@/api/types'

const { t } = useI18n()
const { items, loading, fetchList, markAllRead, markAsRead } = useNotifications()
const { success: showSuccess, error: showError } = useAlert()

onMounted(() => fetchList())

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
}

function timeLabel(n: AppNotification): string {
  return n.created_at_human ?? n.created_at_formatted ?? n.created_at ?? '—'
}
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

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else-if="items.length === 0" class="text-center text-muted py-5" role="status">
      <i class="bi bi-bell-slash" style="font-size: 2.5rem; opacity: 0.4;" aria-hidden="true"></i>
      <p class="fw-semibold mb-1 d-block mt-2">{{ t('web.notifications.empty') }}</p>
    </div>

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>{{ t('web.notifications.columns.message') }}</th>
            <th>{{ t('web.notifications.columns.status') }}</th>
            <th class="text-end">{{ t('web.notifications.columns.time') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="n in items"
            :key="n.id"
            :class="{ 'fw-semibold': !n.is_read }"
            style="cursor: pointer;"
            @click="handleClick(n)"
          >
            <td>
              <i :class="n.icon || 'bi bi-bell'" class="me-2" aria-hidden="true"></i>
              <span>{{ n.message }}</span>
            </td>
            <td>
              <span v-if="n.is_read" class="badge text-bg-light border text-muted">{{ t('web.notifications.status.read') }}</span>
              <span v-else class="badge text-bg-primary">{{ t('web.notifications.status.unread') }}</span>
            </td>
            <td class="text-end">
              <span class="text-muted small">{{ timeLabel(n) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
