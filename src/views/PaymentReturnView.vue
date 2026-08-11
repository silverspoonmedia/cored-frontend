<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import { useAlert } from '@/composables/useAlert'
import { useInvoices } from '@/composables/useInvoices'

const route = useRoute()
const router = useRouter()
const { success: showSuccess, error: showError } = useAlert()
const { syncStatus } = useInvoices()

const status = ref<'processing' | 'done' | 'error'>('processing')
const message = ref('')

onMounted(async () => {
  const isCancel = route.name === 'payment.cancel'
  const type = (route.query.type as string) ?? ''
  const invoiceId = (route.query.invoice_id as string) ?? null
  const referenceId = (route.query.reference_id as string) ?? null
  const trxId = (route.query.trx_id as string) ?? null

  if (isCancel) {
    status.value = 'error'
    message.value = 'Payment was cancelled.'
    showError('Payment cancelled.')
    redirect(type, invoiceId, referenceId)
    return
  }

  if (invoiceId) {
    status.value = 'processing'
    message.value = 'Confirming your payment…'
    try {
      const result = await syncStatus(invoiceId, 'ipaymu')
      status.value = 'done'
      message.value = result.invoice.status === 'paid' ? 'Payment confirmed.' : 'Payment received. Status updated.'
      showSuccess(message.value)
    } catch {
      status.value = 'done'
      message.value = 'Payment received. Status will update shortly.'
      showSuccess(message.value)
    }
    redirect(type, invoiceId, referenceId)
    return
  }

  // trx_id only — no invoice_id to sync, just acknowledge.
  status.value = 'done'
  message.value = 'Payment received. Status will update shortly.'
  showSuccess(message.value)
  redirect(type, invoiceId, referenceId ?? trxId)
})

function redirect(type: string, invoiceId: string | null, referenceId: string | null): void {
  if (type === 'service' || type === 'service_purchase') {
    if (referenceId) {
      router.replace({ name: 'service-purchases.show.view', params: { id: referenceId } })
      return
    }
  }
  if (type === 'subscription') {
    if (referenceId) {
      router.replace({ name: 'subscriptions.show.view', params: { id: referenceId } })
      return
    }
  }
  // default: invoice
  if (invoiceId) {
    router.replace({ name: 'invoices.show.view', params: { id: invoiceId } })
    return
  }
  if (referenceId) {
    router.replace({ name: 'invoices.show.view', params: { id: referenceId } })
    return
  }
  router.replace({ name: 'invoices.index.view' })
}
</script>

<template>
  <Card title="Payment Status">
    <div class="text-center py-4">
      <div v-if="status === 'processing'" class="mb-3">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading…</span>
        </div>
      </div>
      <div v-else-if="status === 'done'" class="mb-3">
        <i class="bi bi-check-circle-fill text-success fs-1"></i>
      </div>
      <div v-else class="mb-3">
        <i class="bi bi-x-circle-fill text-danger fs-1"></i>
      </div>
      <p class="lead mb-1">{{ message }}</p>
      <p class="text-muted small">Redirecting…</p>
    </div>
  </Card>
</template>
