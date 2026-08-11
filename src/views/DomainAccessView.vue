<script setup lang="ts">
import { onMounted } from 'vue'
import Card from '@/components/Card.vue'
import { useDomainAccess } from '@/composables/useDomainAccess'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import { computed } from 'vue'
import type { DomainAccess } from '@/api/types'

const { items, loading, updatingKey, fetchList, toggleVisibility } = useDomainAccess()
const { success: showSuccess, error: showError } = useAlert()
const { hasPermission } = useAuth()

const canManage = computed(() => hasPermission('manage domain access'))

async function handleToggle(d: DomainAccess, checked: boolean): Promise<void> {
  const visibility = checked ? 'private' : 'public'
  const ok = await toggleVisibility(d.key, visibility)
  if (ok) {
    showSuccess(`${d.label} visibility updated to ${visibility}.`)
  } else {
    showError(`Failed to update ${d.label} visibility.`)
  }
}

onMounted(fetchList)
</script>

<template>
  <Card title="Domain Access">
    <p class="text-muted">Control product domain visibility. Private domains require a beta role or permission.</p>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <div v-else-if="items.length === 0" class="text-center text-muted py-5">
      <i class="bi bi-shield-lock" style="font-size: 2.5rem; opacity: 0.4;" aria-hidden="true"></i>
      <p class="fw-semibold mb-1 d-block mt-2">No product domains found</p>
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
                {{ d.visibility === 'private' ? 'Private' : 'Public' }}
              </span>
            </div>

            <p class="text-muted small mb-2"><code>{{ d.key }}</code></p>

            <p class="text-muted small mb-3">
              {{ d.visibility === 'private'
                ? 'Access restricted to beta testers and privileged roles.'
                : 'Accessible to all authenticated users.'
              }}
            </p>

            <p class="text-muted small mb-3">
              Beta role: <code>{{ d.beta_role }}</code>
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
                  Private
                </label>
              </div>
              <span v-else class="badge" :class="d.visibility === 'private' ? 'text-bg-warning' : 'text-bg-success'">
                {{ d.visibility === 'private' ? 'Private' : 'Public' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
