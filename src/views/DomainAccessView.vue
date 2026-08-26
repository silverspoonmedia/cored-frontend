<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import { useDomainAccess } from '@/composables/useDomainAccess'
import { useAdminRealtime } from '@/composables/useAdminRealtime'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import type { DomainAccess } from '@/api/types'

const { items, loading, updatingKey, error, fetchList, toggleVisibility } = useDomainAccess()
const { success: showSuccess, error: showError } = useAlert()
const { hasPermission } = useAuth()
const { t } = useI18n()

const canManage = computed(() => hasPermission('manage domain access'))

async function handleToggle(d: DomainAccess, checked: boolean): Promise<void> {
  const visibility = checked ? 'private' : 'public'
  const ok = await toggleVisibility(d.key, visibility)
  if (ok) {
    showSuccess(t('web.domain-access.visibility_updated_to', { label: d.label, visibility }))
  } else {
    showError(t('web.domain-access.failed_update_visibility', { label: d.label }))
  }
}

const { subscribe, unsubscribe } = useAdminRealtime()
const realtimeHandlers = {
  onDomainVisibilityChanged: () => {
    void fetchList()
  },
}

onMounted(() => {
  fetchList()
  subscribe(realtimeHandlers)
})

onUnmounted(() => {
  unsubscribe(realtimeHandlers)
})
</script>

<template>
  <Card :title="t('web.domain-access.card_title')">
    <p class="text-muted">{{ t('web.domain-access.card_subtitle') }}</p>

    <div v-if="loading" class="row g-3">
      <div v-for="i in 6" :key="i" class="col-12 col-md-6 col-xl-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <SkeletonBlock variant="line" :lines="1" width="45%" />
            <SkeletonBlock variant="line" :lines="3" />
          </div>
        </div>
      </div>
    </div>

    <ErrorState v-else-if="error && !items.length" :message="error" @retry="fetchList()" />

    <div v-else-if="items.length === 0" class="text-center text-muted py-5">
      <i class="bi bi-shield-lock" style="font-size: 2.5rem; opacity: 0.4;" aria-hidden="true"></i>
      <p class="fw-semibold mb-1 d-block mt-2">{{ t('web.domain-access.no_domains') }}</p>
    </div>

    <div v-else class="row g-3">
      <div v-for="d in items" :key="d.key" class="col-12 col-md-6 col-xl-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body d-flex flex-column">
            <div class="d-flex align-items-start justify-content-between mb-2">
              <h5 class="card-title mb-0">{{ d.label }}</h5>
              <span
                class="badge"
                :class="d.visibility === 'private' ? 'text-bg-warning' : 'text-bg-success'"
              >
                {{ d.visibility === 'private' ? t('web.domain-access.private_label') : t('web.domain-access.public_label') }}
              </span>
            </div>

            <p class="text-muted small mb-2"><code>{{ d.key }}</code></p>

            <p class="text-muted small mb-3">
              {{ d.visibility === 'private'
                ? t('web.domain-access.private_restricted')
                : t('web.domain-access.public_accessible')
              }}
            </p>

            <p class="text-muted small mb-3">
              {{ t('web.domain-access.beta_role_label') }} <code>{{ d.beta_role }}</code>
            </p>

            <div class="mt-auto">
              <div v-if="canManage" class="form-check form-switch m-0">
                <input
                  class="form-check-input"
                  type="checkbox"
                  role="switch"
                  :id="`domain-toggle-${d.key}`"
                  :checked="d.visibility === 'private'"
                  :disabled="updatingKey === d.key"
                  @change="handleToggle(d, ($event.target as HTMLInputElement).checked)"
                >
                <label class="form-check-label small" :for="`domain-toggle-${d.key}`">
                  {{ t('web.domain-access.private_label') }}
                </label>
              </div>
              <span v-else class="badge" :class="d.visibility === 'private' ? 'text-bg-warning' : 'text-bg-success'">
                {{ d.visibility === 'private' ? t('web.domain-access.private_label') : t('web.domain-access.public_label') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
