<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import CheckoutPanel from '@/components/CheckoutPanel.vue'
import { useServicePurchases } from '@/composables/useServicePurchases'
import { useAlert } from '@/composables/useAlert'
import type { ServicePurchase } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { fetchOne, updateQuantity } = useServicePurchases()
const { success: showSuccess, error: showError } = useAlert()

const purchase = ref<ServicePurchase | null>(null)
const loading = ref(true)
const updatingQty = ref(false)
const quantity = ref(1)

const isPending = computed(() => {
  if (!purchase.value) return false
  return purchase.value.status.toLowerCase() === 'pending'
})

const canEditQty = computed(() => {
  if (!purchase.value?.service) return false
  return isPending.value && purchase.value.service.plan_kind === 'addon'
})

onMounted(async () => {
  loading.value = true
  try {
    purchase.value = await fetchOne(route.params.id as string)
    quantity.value = purchase.value.quantity
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load service purchase')
  } finally {
    loading.value = false
  }
})

async function handleUpdateQty(): Promise<void> {
  if (!purchase.value || updatingQty.value) return
  updatingQty.value = true
  try {
    purchase.value = await updateQuantity(purchase.value.id, quantity.value)
    showSuccess('Quantity updated.')
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to update quantity')
  } finally {
    updatingQty.value = false
  }
}

function statusClass(status: string): string {
  const map: Record<string, string> = {
    pending: 'text-bg-warning',
    completed: 'text-bg-success',
    cancelled: 'text-bg-danger',
    failed: 'text-bg-danger',
    active: 'text-bg-success',
  }
  return map[status.toLowerCase()] ?? 'text-bg-light'
}
</script>

<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading…</span>
    </div>
  </div>

  <div v-else-if="purchase" class="row g-3">
    <div class="col-lg-8">
      <Card title="Service Purchase">
        <template #actions>
          <button class="btn btn-outline-secondary btn-sm" @click="router.back()">
            <i class="bi bi-arrow-left me-1"></i> Back
          </button>
        </template>

        <div class="mb-3">
          <span class="badge fs-6" :class="statusClass(purchase.status)">{{ purchase.status }}</span>
        </div>

        <dl class="row mb-0">
          <dt class="col-sm-3">Service</dt>
          <dd class="col-sm-9">{{ purchase.service?.name ?? '—' }}</dd>

          <dt class="col-sm-3">Quantity</dt>
          <dd class="col-sm-9">
            <span v-if="!canEditQty">{{ purchase.quantity }}</span>
            <div v-else class="d-flex align-items-center gap-2">
              <input
                type="number"
                class="form-control form-control-sm"
                style="width: 80px;"
                v-model.number="quantity"
                min="1"
                max="99"
              />
              <button
                class="btn btn-outline-primary btn-sm"
                :disabled="updatingQty || quantity === purchase.quantity"
                @click="handleUpdateQty"
              >
                <span v-if="updatingQty" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Update
              </button>
            </div>
          </dd>

          <dt class="col-sm-3">Display Amount</dt>
          <dd class="col-sm-9">{{ purchase.display_amount_formatted ?? purchase.display_amount }}</dd>

          <dt class="col-sm-3">Charge Amount</dt>
          <dd class="col-sm-9">{{ purchase.charge_amount_formatted ?? purchase.charge_amount }}</dd>

          <dt class="col-sm-3">Currency</dt>
          <dd class="col-sm-9">{{ purchase.display_currency }}</dd>

          <dt v-if="purchase.storage_gain_human" class="col-sm-3">Storage Gain</dt>
          <dd v-if="purchase.storage_gain_human" class="col-sm-9">{{ purchase.storage_gain_human }}</dd>

          <dt class="col-sm-3">Change Type</dt>
          <dd class="col-sm-9">{{ purchase.change_type ?? '—' }}</dd>

          <dt class="col-sm-3">Period Start</dt>
          <dd class="col-sm-9">{{ purchase.period_start_formatted ?? purchase.period_start ?? '—' }}</dd>

          <dt class="col-sm-3">Period End</dt>
          <dd class="col-sm-9">{{ purchase.period_end_formatted ?? purchase.period_end ?? '—' }}</dd>

          <dt class="col-sm-3">Created At</dt>
          <dd class="col-sm-9">{{ purchase.created_at_formatted ?? purchase.created_at ?? '—' }}</dd>
        </dl>
      </Card>
    </div>

    <div class="col-lg-4">
      <CheckoutPanel
        v-if="purchase.invoice"
        :invoice="purchase.invoice"
      />
    </div>
  </div>
</template>
