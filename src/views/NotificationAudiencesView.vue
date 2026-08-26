<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import { useNotificationAudiences } from '@/composables/useNotificationAudiences'
import { useAuth } from '@/stores/auth'

const { items, loading, error, load } = useNotificationAudiences()
const { hasPermission } = useAuth()
const { t } = useI18n()

const canManage = computed(() => hasPermission('manage settings'))

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

    <div v-if="loading && !items.length" class="py-2">
      <div v-for="i in 4" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
        <SkeletonBlock variant="line" :lines="1" width="30%" class="mb-0" />
        <SkeletonBlock variant="line" :lines="1" width="20%" class="mb-0" />
        <SkeletonBlock variant="line" :lines="1" width="10%" class="ms-auto mb-0" />
      </div>
    </div>

    <ErrorState
      v-else-if="error && !items.length"
      :message="error"
      @retry="load(true)"
    />

    <EmptyState
      v-else-if="!items.length"
      icon="bi-bell-slash"
      :title="t('web.notification-audiences.empty_title')"
    />

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>{{ t('web.notification-audiences.type_col') }}</th>
            <th>{{ t('web.notification-audiences.roles_col') }}</th>
            <th>{{ t('web.notification-audiences.include_subject_col') }}</th>
            <th v-if="canManage" class="text-end">{{ t('actions.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.type">
            <td>
              <i :class="item.icon || 'bi bi-bell'" class="me-2" aria-hidden="true"></i>
              {{ item.label || item.type }}
              <div class="text-muted small">
                <code>{{ item.type }}</code>
              </div>
            </td>
            <td>
              <template v-if="item.roles.length">
                {{ item.roles.join(', ') }}
              </template>
              <span v-else class="text-muted">—</span>
            </td>
            <td>{{ item.notify_subject_user ? t('web.currencies.yes') : t('web.currencies.no') }}</td>
            <td v-if="canManage" class="text-end">
              <router-link
                :to="{ name: 'notification-audiences.edit.view', params: { type: item.type } }"
                class="btn btn-sm btn-outline-primary"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i> {{ t('actions.edit') }}
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
