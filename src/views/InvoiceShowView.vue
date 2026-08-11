<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import CheckoutPanel from '@/components/CheckoutPanel.vue'
import { useInvoices } from '@/composables/useInvoices'
import { useAlert } from '@/composables/useAlert'
import type { Invoice } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { fetchOne } = useInvoices()
const { error: showError } = useAlert()

const invoice = ref<Invoice | null>(null)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    invoice.value = await fetchOne(route.params.id as string)
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load invoice')
  } finally {
    loading.value = false
  }
})

function statusClass(status: string): string {
  const map: Record<string, string> = {
    paid: 'text-bg-success',
    pending: 'text-bg-warning',
    challenge: 'text-bg-info',
    expired: 'text-bg-secondary',
    failed: 'text-bg-danger',
    cancelled: 'text-bg-dark',
    refunded: 'text-bg-info',
  }
  return map[status.toLowerCase()] ?? 'text-bg-light'
}

function onStatusUpdated(status: string): void {
  if (invoice.value) {
    invoice.value = { ...invoice.value, status }
  }
}
</script>

<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading…</span>
    </div>
  </div>

  <div v-else-if="invoice" class="row g-3">
    <div class="col-lg-8">
      <Card :title="`Invoice ${invoice.invoice_number}`">
        <template #actions>
          <button
            class="btn btn-outline-secondary btn-sm"
            @click="router.push({ name: 'invoices.index.view' })"
          >
            <i class="bi bi-arrow-left me-1"></i> Back
          </button>
        </template>

        <div class="mb-3">
          <span class="badge fs-6" :class="statusClass(invoice.status)">{{ invoice.status }}</span>
        </div>

        <dl class="row mb-0">
          <dt class="col-sm-3">Invoice Number</dt>
          <dd class="col-sm-9"><code>{{ invoice.invoice_number }}</code></dd>

          <dt class="col-sm-3">Subtotal</dt>
          <dd class="col-sm-9">{{ invoice.subtotal_formatted ?? invoice.subtotal ?? '—' }}</dd>

          <dt class="col-sm-3">Payment Channel Fee</dt>
          <dd class="col-sm-9">{{ invoice.payment_channel_fee_formatted ?? invoice.payment_channel_fee ?? '—' }}</dd>

          <dt class="col-sm-3">Total</dt>
          <dd class="col-sm-9">{{ invoice.customer_gross_total_formatted ?? invoice.customer_gross_total ?? '—' }}</dd>

          <dt class="col-sm-3">Currency</dt>
          <dd class="col-sm-9">{{ invoice.currency }}</dd>

          <dt class="col-sm-3">Payment Method</dt>
          <dd class="col-sm-9">{{ invoice.payment_method ?? '—' }}</dd>

          <dt v-if="invoice.payment_gateway" class="col-sm-3">Payment Gateway</dt>
          <dd v-if="invoice.payment_gateway" class="col-sm-9">{{ invoice.payment_gateway.display_name }}</dd>

          <dt class="col-sm-3">External Transaction ID</dt>
          <dd class="col-sm-9">{{ invoice.external_transaction_id ?? '—' }}</dd>

          <dt class="col-sm-3">Paid At</dt>
          <dd class="col-sm-9">{{ invoice.paid_at_formatted ?? invoice.paid_at ?? '—' }}</dd>

          <dt class="col-sm-3">Expired At</dt>
          <dd class="col-sm-9">{{ invoice.expired_at_formatted ?? invoice.expired_at ?? '—' }}</dd>

          <dt class="col-sm-3">Created At</dt>
          <dd class="col-sm-9">{{ invoice.created_at_formatted ?? invoice.created_at ?? '—' }}</dd>
        </dl>
      </Card>
    </div>

    <div class="col-lg-4">
      <CheckoutPanel :invoice="invoice" @status-updated="onStatusUpdated" />
    </div>
  </div>
</template>
