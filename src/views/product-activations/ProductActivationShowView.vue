<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import FormSelect from '@/components/FormSelect.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import { useProductActivations } from '@/composables/product-activations/useProductActivations'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { inputDialog } from '@/lib/swal'
import type { ProductActivationShowPayload, ProductActivation } from '@/api/types'
import { PRODUCT_ACTIVATION_STATE_BADGE } from '@/utils/statusBadge'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchProductShow, approve, reject, suspend, reactivate } = useProductActivations()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

const canManage = computed(() => hasPermission('manage product activations'))
const productKey = computed(() => route.params.productKey as string)

const data = ref<ProductActivationShowPayload | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const stateFilter = ref('')
const actionLoading = ref<string | null>(null)

const stateOptions = [
  { value: '', label: t('product-activations.filter_all_states') },
  { value: 'active', label: t('product-activations.state_active') },
  { value: 'pending', label: t('product-activations.state_pending') },
  { value: 'suspended', label: t('product-activations.state_suspended') },
  { value: 'expired', label: t('product-activations.state_expired') },
]

async function load(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    data.value = await fetchProductShow(
      productKey.value,
      stateFilter.value || undefined,
      undefined,
    )
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.product-activations.failed_load')
  } finally {
    loading.value = false
  }
}

watch(stateFilter, () => load())
onMounted(load)

async function handleApprove(act: ProductActivation): Promise<void> {
  actionLoading.value = act.id
  try {
    await approve(act.id)
    showSuccess(t('product-activations.approved'))
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('product-activations.cannot_approve', { state: act.state }))
  } finally {
    actionLoading.value = null
  }
}

async function handleReject(act: ProductActivation): Promise<void> {
  const reason = await inputDialog({
    title: t('product-activations.reject_reason_prompt'),
    confirmText: t('ui.dialog.confirm'),
    required: true,
  })
  if (!reason) return
  actionLoading.value = act.id
  try {
    await reject(act.id, reason)
    showSuccess(t('product-activations.rejected'))
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('product-activations.cannot_reject', { state: act.state }))
  } finally {
    actionLoading.value = null
  }
}

async function handleSuspend(act: ProductActivation): Promise<void> {
  const reason = await inputDialog({
    title: t('product-activations.suspend_reason_prompt'),
    confirmText: t('ui.dialog.confirm'),
    danger: false,
  })
  if (reason === null) return
  actionLoading.value = act.id
  try {
    await suspend(act.id, reason ?? undefined)
    showSuccess(t('product-activations.suspended'))
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('product-activations.cannot_suspend', { state: act.state }))
  } finally {
    actionLoading.value = null
  }
}

async function handleReactivate(act: ProductActivation): Promise<void> {
  actionLoading.value = act.id
  try {
    await reactivate(act.id)
    showSuccess(t('product-activations.reactivated'))
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('product-activations.cannot_reactivate', { state: act.state }))
  } finally {
    actionLoading.value = null
  }
}
</script>

<template>
  <Card :title="t('product-activations.product_title', { product: productKey })">
    <template #actions>
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="router.push({ name: 'product-activations.index.view' })"
      >
        <i class="bi bi-arrow-left me-1"></i> {{ t('product-activations.back_to_products') }}
      </button>
    </template>

    <div v-if="loading">
      <SkeletonBlock variant="line" :lines="1" width="30%" />
      <SkeletonBlock variant="line" :lines="6" />
    </div>

    <ErrorState v-else-if="loadError" :message="loadError" @retry="load" />

    <div v-else-if="data">
      <dl class="row mb-3">
        <dt class="col-sm-3">{{ t('product-activations.col_product') }}</dt>
        <dd class="col-sm-9"><code>{{ productKey }}</code></dd>

        <dt class="col-sm-3">{{ t('product-activations.col_type') }}</dt>
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

        <dt v-if="data.summary.fulfillment_target" class="col-sm-3">{{ t('product-activations.fulfillment_target') }}</dt>
        <dd v-if="data.summary.fulfillment_target" class="col-sm-9">
          <code>{{ data.summary.fulfillment_target }}</code>
        </dd>
      </dl>

      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="border rounded p-3 text-center">
            <div class="fs-4 fw-bold text-success">{{ data.summary.counts.active }}</div>
            <div class="small text-muted">{{ t('product-activations.state_active') }}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="border rounded p-3 text-center">
            <div class="fs-4 fw-bold text-warning">{{ data.summary.counts.pending }}</div>
            <div class="small text-muted">{{ t('product-activations.state_pending') }}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="border rounded p-3 text-center">
            <div class="fs-4 fw-bold text-secondary">{{ data.summary.counts.suspended }}</div>
            <div class="small text-muted">{{ t('product-activations.state_suspended') }}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="border rounded p-3 text-center">
            <div class="fs-4 fw-bold text-danger">{{ data.summary.counts.expired }}</div>
            <div class="small text-muted">{{ t('product-activations.state_expired') }}</div>
          </div>
        </div>
      </div>

      <div class="mb-3" style="max-width: 300px;">
        <FormSelect
          name="state-filter"
          :label="t('product-activations.filter_by_state')"
          v-model="stateFilter"
          :options="stateOptions"
        />
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle">
          <thead>
            <tr>
              <th>{{ t('product-activations.col_user') }}</th>
              <th class="text-center">{{ t('product-activations.col_state') }}</th>
              <th>{{ t('product-activations.col_source') }}</th>
              <th>{{ t('product-activations.col_activated_at') }}</th>
              <th>{{ t('product-activations.col_updated_at') }}</th>
              <th v-if="canManage" class="text-end">{{ t('product-activations.col_actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <TableEmptyRow
              v-if="data.activations.length === 0"
              :colspan="canManage ? 6 : 5"
              icon="bi-people"
              :title="t('product-activations.no_activations')"
            />
            <tr v-for="act in data.activations" :key="act.id">
              <td>
                <div v-if="act.user">
                  <div>{{ act.user.name }}</div>
                  <div class="text-muted small">{{ act.user.email }}</div>
                </div>
                <code v-else>{{ act.user_id }}</code>
              </td>
              <td class="text-center">
                <StatusBadge :status="act.state" :mapping="PRODUCT_ACTIVATION_STATE_BADGE" fallback="light" />
              </td>
              <td class="small">{{ act.source ?? '—' }}</td>
              <td class="small">{{ act.activated_at_human ?? act.activated_at_formatted ?? act.activated_at ?? '—' }}</td>
              <td class="small">{{ act.updated_at_human ?? act.updated_at_formatted ?? act.updated_at ?? '—' }}</td>
              <td v-if="canManage" class="text-end">
                <div v-if="actionLoading === act.id" class="spinner-border spinner-border-sm" role="status">
                  <span class="visually-hidden">{{ t('ui.loading') }}</span>
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
