<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import { useAlert } from '@/composables/useAlert'
import { useInvoices } from '@/composables/payment-gateway/useInvoices'

const route = useRoute()
const router = useRouter()
const { success: showSuccess, error: showError } = useAlert()
const { syncStatus } = useInvoices()
const { t } = useI18n()

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
    message.value = t('web.payments.payment_cancelled')
    showError(t('web.payments.payment_cancelled'))
    redirect(type, invoiceId, referenceId)
    return
  }

  if (invoiceId) {
    status.value = 'processing'
    message.value = t('web.payments.confirming_payment')
    try {
      const result = await syncStatus(invoiceId, 'ipaymu')
      status.value = 'done'
      message.value = result.invoice.status === 'paid' ? t('web.payments.payment_confirmed_short') : t('web.payments.payment_received_status_updated')
      showSuccess(message.value)
    } catch {
      status.value = 'done'
      message.value = t('web.payments.payment_received_pending')
      showSuccess(message.value)
    }
    redirect(type, invoiceId, referenceId)
    return
  }

  // trx_id only — no invoice_id to sync, just acknowledge.
  status.value = 'done'
  message.value = t('web.payments.payment_received_pending')
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
  <Card :title="t('web.payments.payment_status_title')">
    <div class="text-center py-4">
      <div v-if="status === 'processing'" class="mb-3">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ t('ui.loading') }}</span>
        </div>
      </div>
      <div v-else-if="status === 'done'" class="mb-3">
        <i class="bi bi-check-circle-fill text-success fs-1"></i>
      </div>
      <div v-else class="mb-3">
        <i class="bi bi-x-circle-fill text-danger fs-1"></i>
      </div>
      <p class="lead mb-1">{{ message }}</p>
      <p class="text-muted small">{{ t('web.payments.redirecting') }}</p>
    </div>
  </Card>
</template>
