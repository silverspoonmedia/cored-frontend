<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import FormSelect from '@/components/FormSelect.vue'
import { useProductActivations } from '@/composables/useProductActivations'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type { ProductActivationShowPayload, ProductActivation } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { fetchProductShow, approve, reject, suspend, reactivate } = useProductActivations()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

const canManage = computed(() => hasPermission('manage product activations'))
const productKey = computed(() => route.params.productKey as string)

const data = ref<ProductActivationShowPayload | null>(null)
const loading = ref(true)
const stateFilter = ref('')
const actionLoading = ref<string | null>(null)

const stateOptions = [
  { value: '', label: 'All States' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired', label: 'Expired' },
]

async function load(): Promise<void> {
  loading.value = true
  try {
    data.value = await fetchProductShow(
      productKey.value,
      stateFilter.value || undefined,
      undefined,
    )
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load product activations')
  } finally {
    loading.value = false
  }
}

watch(stateFilter, () => load())
onMounted(load)

function stateClass(state: string): string {
  const map: Record<string, string> = {
    active: 'text-bg-success',
    pending: 'text-bg-warning',
    suspended: 'text-bg-secondary',
    expired: 'text-bg-danger',
  }
  return map[state.toLowerCase()] ?? 'text-bg-light'
}

async function handleApprove(act: ProductActivation): Promise<void> {
  actionLoading.value = act.id
  try {
    await approve(act.id)
    showSuccess('Activation approved.')
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to approve')
  } finally {
    actionLoading.value = null
  }
}

async function handleReject(act: ProductActivation): Promise<void> {
  const reason = prompt('Rejection reason:')
  if (!reason) return
  actionLoading.value = act.id
  try {
    await reject(act.id, reason)
    showSuccess('Activation rejected.')
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to reject')
  } finally {
    actionLoading.value = null
  }
}

async function handleSuspend(act: ProductActivation): Promise<void> {
  const reason = prompt('Suspension reason (optional):')
  actionLoading.value = act.id
  try {
    await suspend(act.id, reason ?? undefined)
    showSuccess('Activation suspended.')
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to suspend')
  } finally {
    actionLoading.value = null
  }
}

async function handleReactivate(act: ProductActivation): Promise<void> {
  actionLoading.value = act.id
  try {
    await reactivate(act.id)
    showSuccess('Activation reactivated.')
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to reactivate')
  } finally {
    actionLoading.value = null
  }
}
</script>

<template>
  <Card :title="`Product: ${productKey}`">
    <template #actions>
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="router.push({ name: 'product-activations.index.view' })"
      >
        <i class="bi bi-arrow-left me-1"></i> Back
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <div v-else-if="data">
      <dl class="row mb-3">
        <dt class="col-sm-3">Product</dt>
        <dd class="col-sm-9"><code>{{ productKey }}</code></dd>

        <dt class="col-sm-3">Type</dt>
        <dd class="col-sm-9">
          <span
            v-if="data.summary.activation_type"
            class="badge"
            :class="data.summary.activation_type === 'explicit' ? 'text-bg-info' : 'text-bg-light border'"
          >
            {{ data.summary.activation_type }}
          </span>
          <span v-else class="text-muted">—</span>
        </dd>

        <dt v-if="data.summary.fulfillment_target" class="col-sm-3">Fulfillment</dt>
        <dd v-if="data.summary.fulfillment_target" class="col-sm-9">
          <code>{{ data.summary.fulfillment_target }}</code>
        </dd>
      </dl>

      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="border rounded p-3 text-center">
            <div class="fs-4 fw-bold text-success">{{ data.summary.counts.active }}</div>
            <div class="small text-muted">Active</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="border rounded p-3 text-center">
            <div class="fs-4 fw-bold text-warning">{{ data.summary.counts.pending }}</div>
            <div class="small text-muted">Pending</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="border rounded p-3 text-center">
            <div class="fs-4 fw-bold text-secondary">{{ data.summary.counts.suspended }}</div>
            <div class="small text-muted">Suspended</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="border rounded p-3 text-center">
            <div class="fs-4 fw-bold text-danger">{{ data.summary.counts.expired }}</div>
            <div class="small text-muted">Expired</div>
          </div>
        </div>
      </div>

      <div class="mb-3" style="max-width: 300px;">
        <FormSelect
          name="state-filter"
          label="Filter by State"
          v-model="stateFilter"
          :options="stateOptions"
        />
      </div>

      <div v-if="data.activations.length === 0" class="text-muted text-center py-4">
        <i class="bi bi-people fs-1 d-block mb-2"></i>
        No activations found.
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle">
          <thead>
            <tr>
              <th>User</th>
              <th class="text-center">State</th>
              <th>Source</th>
              <th>Activated</th>
              <th>Updated</th>
              <th v-if="canManage" class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="act in data.activations" :key="act.id">
              <td>
                <div v-if="act.user">
                  <div>{{ act.user.name }}</div>
                  <div class="text-muted small">{{ act.user.email }}</div>
                </div>
                <code v-else>{{ act.user_id }}</code>
              </td>
              <td class="text-center">
                <span class="badge" :class="stateClass(act.state)">{{ act.state }}</span>
              </td>
              <td class="small">{{ act.source ?? '—' }}</td>
              <td class="small">{{ act.activated_at_human ?? act.activated_at_formatted ?? act.activated_at ?? '—' }}</td>
              <td class="small">{{ act.updated_at_human ?? act.updated_at_formatted ?? act.updated_at ?? '—' }}</td>
              <td v-if="canManage" class="text-end">
                <div v-if="actionLoading === act.id" class="spinner-border spinner-border-sm" role="status">
                  <span class="visually-hidden">Loading…</span>
                </div>
                <template v-else>
                  <button
                    v-if="act.state === 'active'"
                    class="btn btn-outline-warning btn-sm"
                    @click="handleSuspend(act)"
                  >
                    <i class="bi bi-pause-fill" aria-hidden="true"></i>
                  </button>
                  <button
                    v-if="act.state === 'suspended'"
                    class="btn btn-outline-success btn-sm"
                    @click="handleReactivate(act)"
                  >
                    <i class="bi bi-play-fill" aria-hidden="true"></i>
                  </button>
                  <template v-if="act.state === 'pending'">
                    <button
                      class="btn btn-outline-success btn-sm"
                      @click="handleApprove(act)"
                    >
                      <i class="bi bi-check-lg" aria-hidden="true"></i>
                    </button>
                    <button
                      class="btn btn-outline-danger btn-sm ms-1"
                      @click="handleReject(act)"
                    >
                      <i class="bi bi-x-lg" aria-hidden="true"></i>
                    </button>
                  </template>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </Card>
</template>
