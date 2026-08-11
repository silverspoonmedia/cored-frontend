<script setup lang="ts">
import { onMounted, computed } from 'vue'
import Card from '@/components/Card.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useNotificationAudiences } from '@/composables/useNotificationAudiences'
import { useAuth } from '@/stores/auth'

const { items, loading, load } = useNotificationAudiences()
const { hasPermission } = useAuth()

const canManage = computed(() => hasPermission('manage settings'))

onMounted(() => {
  load()
})
</script>

<template>
  <Card title="Notification audiences">
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
      Who receives each activity notification type.
    </p>

    <div v-if="loading && !items.length" class="text-center py-4">
      <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
      Loading…
    </div>

    <EmptyState
      v-else-if="!items.length"
      icon="bi-bell-slash"
      title="No notification types configured"
    />

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Type</th>
            <th>Roles</th>
            <th>Include subject user</th>
            <th v-if="canManage" class="text-end">Actions</th>
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
            <td>{{ item.notify_subject_user ? 'Yes' : 'No' }}</td>
            <td v-if="canManage" class="text-end">
              <router-link
                :to="{ name: 'notification-audiences.edit.view', params: { type: item.type } }"
                class="btn btn-sm btn-outline-primary"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i> Edit
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
