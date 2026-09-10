<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import CheckoutPanel from '@/components/payment-gateway/CheckoutPanel.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import PaymentStatusHero from '@/components/payment-gateway/PaymentStatusHero.vue'
import PaymentSteps from '@/components/payment-gateway/PaymentSteps.vue'
import { useServicePurchases } from '@/composables/service/useServicePurchases'
import { useServices } from '@/composables/service/useServices'
import { useServicesHydrate } from '@/composables/service/useServicesHydrate'
import { useServicesRealtime } from '@/composables/service/useServicesRealtime'
import { useEchoResync } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import type { ServicePurchase, InvoiceStatusPayload } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne, updateQuantity } = useServicePurchases()
const { fetchOptions } = useServices()
const { hydratePurchaseShow } = useServicesHydrate()
const { success: showSuccess, error: showError } = useAlert()

const purchase = ref<ServicePurchase | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const updatingQty = ref(false)
const quantity = ref(1)
const maxPurchaseQuantity = ref(99)

const invoice = computed(() => purchase.value?.invoice ?? null)
const invoiceStatus = computed(() => invoice.value?.status ?? '')
const hasChannel = computed(() => Boolean(invoice.value?.payment_channel_code))

const hasCheckoutSession = computed(() => {
  if (!invoice.value) return false
  return hasChannel.value
    || Boolean(invoice.value.external_transaction_id)
    || Boolean(invoice.value.checkout_session)
})

const paymentUi = computed(() => {
  const status = invoiceStatus.value
  if (status === 'paid') return { label: t('web.payments.show.status.paid'), variant: 'success' as const, step: 3 }
  if (['expired', 'cancelled', 'failed'].includes(status)) {
    return { label: t(`web.payments.show.status.${status}`), variant: 'danger' as const, step: 1 }
  }
  if (['pending', 'challenge'].includes(status)) {
    return hasCheckoutSession.value
      ? { label: t('web.payments.show.payment_pending'), variant: 'warning' as const, step: 2 }
      : { label: t('web.payments.show.payment_not_started'), variant: 'secondary' as const, step: 1 }
  }
  return { label: status || '—', variant: 'secondary' as const, step: 1 }
})

const heroBadges = computed(() => {
  const badges: { key?: string; label: string; variant: 'success' | 'danger' | 'secondary' | 'warning' }[] = []
  if (!purchase.value) return badges
  const purchaseStatus = purchase.value.status
  const variant: 'success' | 'danger' | 'secondary' = purchaseStatus === 'paid'
    ? 'success'
    : ['cancelled', 'failed'].includes(purchaseStatus) ? 'danger' : 'secondary'
  badges.push({ key: 'purchase', label: purchaseStatus || 'pending', variant })
  if (invoice.value) {
    badges.push({ key: 'payment', label: paymentUi.value.label, variant: paymentUi.value.variant })
  }
  return badges
})

const isPending = computed(() => purchase.value?.status.toLowerCase() === 'pending')
const canEditQty = computed(() => {
  if (!purchase.value?.service) return false
  return isPending.value
    && ['pending', 'challenge'].includes(invoiceStatus.value)
    && purchase.value.service.plan_kind === 'addon'
})

const currentStackQuantity = computed(() => {
  const q = purchase.value?.entitlement?.quantity
  return typeof q === 'number' ? Math.max(0, q) : 0
})

const projectedStackQuantity = computed(() => {
  if (!purchase.value || currentStackQuantity.value <= 0) return null
  return currentStackQuantity.value + Math.max(1, purchase.value.quantity)
})

const entitlementStatus = computed(() => purchase.value?.entitlement?.status ?? null)
const showGraceBanner = computed(() => entitlementStatus.value === 'grace')

const { subscribePurchase, unsubscribePurchase } = useServicesRealtime()
const purchaseId = route.params.id as string
const purchaseHandlers = {
  onPurchaseChanged: (payload: { purchase_id: string; action: string }) => {
    if (payload.action === 'paid' && purchase.value) {
      void fetchOne(purchaseId).then((p) => { purchase.value = p })
    }
  },
}

async function loadPurchase(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const batchResult = await hydratePurchaseShow(purchaseId).catch(() => null)
    if (batchResult?.purchase) {
      purchase.value = batchResult.purchase
      if (batchResult.options && batchResult.options.purchase_max_quantity >= 1) {
        maxPurchaseQuantity.value = batchResult.options.purchase_max_quantity
      }
    } else {
      purchase.value = await fetchOne(purchaseId)
      try {
        const opts = await fetchOptions()
        if (opts.purchase_max_quantity >= 1) {
          maxPurchaseQuantity.value = opts.purchase_max_quantity
        }
      } catch {
        // last-resort 99
      }
    }
    quantity.value = purchase.value.quantity
    subscribePurchase(purchaseId, purchaseHandlers)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.services.purchases.load_failed')
  } finally {
    loading.value = false
  }
}

onMounted(loadPurchase)

onUnmounted(() => {
  unsubscribePurchase(purchaseHandlers)
})

useEchoResync(() => { void loadPurchase() })

async function handleUpdateQty(): Promise<void> {
  if (!purchase.value || updatingQty.value) return
  updatingQty.value = true
  try {
    purchase.value = await updateQuantity(purchase.value.id, quantity.value)
    showSuccess(t('web.services.purchases.quantity_updated'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.services.purchases.update_failed'))
  } finally {
    updatingQty.value = false
  }
}

function changeTypeLabel(changeType: string | null): string {
  if (!changeType) return '—'
  return t(`web.services.change_type.${changeType}`)
}

function entitlementLabel(): string {
  const ent = purchase.value?.entitlement
  if (!ent) return '—'
  if (ent.is_permanent) return t('web.services.entitlement.permanent')
  return ent.status ? t(`web.services.entitlement.${ent.status}`) : '—'
}
</script>

<template>
  <div v-if="loading" class="row g-3">
    <div class="col-lg-8">
      <div class="card">
        <div class="card-body">
          <SkeletonBlock variant="line" :lines="1" width="40%" />
          <SkeletonBlock variant="line" :lines="6" />
        </div>
      </div>
    </div>
    <div class="col-lg-4">
      <div class="card">
        <div class="card-body">
          <SkeletonBlock variant="block" height="8rem" />
        </div>
      </div>
    </div>
  </div>

  <ErrorState v-else-if="loadError" :message="loadError" @retry="loadPurchase" />

  <div v-else-if="purchase" class="ois">
    <PaymentStatusHero
      :eyebrow="t('web.services.breadcrumb')"
      :title="purchase.service?.name ?? t('web.services.purchase_title')"
      :amount="purchase.settlement_amount_formatted"
      :badges="heroBadges"
    />

    <div v-if="showGraceBanner" class="alert alert-warning mb-3" role="alert">
      {{ t('web.services.entitlement.grace_banner') }}
      <template v-if="purchase.entitlement?.grace_ends_at">
        <strong class="ms-1">{{ t('web.services.show.entitlement_grace') }}:</strong>
        {{ purchase.entitlement.grace_ends_at_formatted ?? purchase.entitlement.grace_ends_at }}
      </template>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-lg-8 order-2 order-lg-1">
        <PaymentSteps
          v-if="invoice"
          :current-step="paymentUi.step"
          :completed="invoiceStatus === 'paid'"
        />

        <CheckoutPanel
          v-if="invoice"
          :invoice="invoice"
          @status-updated="(s: string) => { if (invoice) invoice.status = s }"
          @invoice-updated="(payload: InvoiceStatusPayload) => {
            if (invoice) {
              invoice.status = payload.status
              invoice.paid_at = payload.paid_at
              invoice.expired_at = payload.expired_at
              if (payload.invoiceable_status && purchase) purchase.status = payload.invoiceable_status
            }
          }"
        />

        <Card v-else :title="t('web.payments.checkout.title')">
          <p class="text-muted mb-0">{{ t('web.payments.checkout.not_payable') }}</p>
        </Card>
      </div>

      <div class="col-lg-4 order-1 order-lg-2">
        <div class="ois-sidebar-card">
          <div class="ois-sidebar-card__title">{{ t('web.services.purchase_title') }}</div>
          <dl class="row mb-0 small">
            <template v-if="canEditQty">
              <dt class="col-5">{{ t('web.services.show.purchase_quantity') }}</dt>
              <dd class="col-7">
                <div class="d-flex flex-wrap align-items-center gap-2">
                  <div class="input-group input-group-sm" style="max-width: 9rem;">
                    <button type="button" class="btn btn-outline-secondary" @click="quantity = Math.max(1, quantity - 1)" aria-label="-">−</button>
                    <input
                      type="number"
                      class="form-control text-center"
                      v-model.number="quantity"
                      min="1"
                      :max="maxPurchaseQuantity"
                    >
                    <button type="button" class="btn btn-outline-secondary" @click="quantity = Math.min(maxPurchaseQuantity, quantity + 1)" aria-label="+">+</button>
                  </div>
                  <button
                    class="btn btn-outline-primary btn-sm"
                    :disabled="updatingQty || quantity === purchase.quantity"
                    @click="handleUpdateQty"
                  >
                    <span v-if="updatingQty" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    {{ t('ui.actions.save') }}
                  </button>
                </div>
                <p class="text-muted small mb-0 mt-1">{{ t('web.services.show.quantity_estimate_hint') }}</p>
              </dd>
            </template>
            <template v-else-if="purchase.quantity > 1">
              <dt class="col-5">{{ t('web.services.show.purchase_quantity') }}</dt>
              <dd class="col-7">{{ purchase.quantity }}</dd>
            </template>

            <template v-if="purchase.change_type">
              <dt class="col-5">{{ t('web.services.show.change_type') }}</dt>
              <dd class="col-7">{{ changeTypeLabel(purchase.change_type) }}</dd>
            </template>

            <template v-if="purchase.list_amount !== null">
              <dt class="col-5">{{ t('web.services.show.list_amount') }}</dt>
              <dd class="col-7">{{ purchase.list_amount_formatted ?? '—' }}</dd>
            </template>

            <template v-if="purchase.credit_amount > 0">
              <dt class="col-5">{{ t('web.services.show.credit_amount') }}</dt>
              <dd class="col-7">{{ purchase.credit_amount_formatted ?? '—' }}</dd>
            </template>

            <dt class="col-5">{{ t('web.services.show.display_amount') }}</dt>
            <dd class="col-7">{{ purchase.charge_amount_formatted ?? purchase.display_amount_formatted ?? '—' }}</dd>

            <template v-if="purchase.surplus_days > 0">
              <dt class="col-5">{{ t('web.services.show.surplus_days') }}</dt>
              <dd class="col-7">{{ purchase.surplus_days }}</dd>
            </template>

            <template v-if="purchase.settlement_amount_formatted != null || purchase.settlement_amount != null">
              <dt class="col-5">{{ t('web.services.show.settlement_amount') }}</dt>
              <dd class="col-7">{{ purchase.settlement_amount_formatted ?? '—' }}</dd>
            </template>

            <template v-if="purchase.fx_rate_label || purchase.fx_rate_formatted || purchase.fx_rate">
              <dt class="col-5">{{ t('web.services.show.fx_rate') }}</dt>
              <dd class="col-7">{{ purchase.fx_rate_label ?? purchase.fx_rate_formatted ?? purchase.fx_rate ?? '—' }}</dd>
            </template>

            <dt class="col-5">{{ t('web.services.show.status') }}</dt>
            <dd class="col-7">{{ purchase.status }}</dd>

            <template v-if="purchase.period_start || purchase.period_end">
              <dt class="col-5">{{ t('web.services.show.period') }}</dt>
              <dd class="col-7">
                {{ purchase.period_start_formatted ?? purchase.period_start ?? '—' }}
                →
                {{ purchase.period_end_formatted ?? purchase.period_end ?? '—' }}
              </dd>
            </template>

            <template v-if="purchase.entitlement">
              <dt class="col-5">{{ t('web.services.show.entitlement_status') }}</dt>
              <dd class="col-7">{{ entitlementLabel() }}</dd>

              <template v-if="purchase.service?.plan_kind === 'addon' && currentStackQuantity > 0 && projectedStackQuantity !== null">
                <dt class="col-5">{{ t('web.services.show.stack_quantity') }}</dt>
                <dd class="col-7">
                  {{ t('web.services.show.stack_quantity_equation', {
                    current: currentStackQuantity,
                    purchase: purchase.quantity,
                    total: projectedStackQuantity
                  }) }}
                </dd>
              </template>

              <template v-if="purchase.entitlement.ends_at">
                <dt class="col-5">{{ t('web.services.show.entitlement_ends') }}</dt>
                <dd class="col-7">{{ purchase.entitlement.ends_at_formatted ?? purchase.entitlement.ends_at }}</dd>
              </template>
            </template>
          </dl>
        </div>

        <div v-if="invoice" class="ois-sidebar-card">
          <div class="ois-sidebar-card__title">{{ t('web.payments.invoices.show_title') }}</div>
          <dl class="row mb-0 small">
            <dt class="col-5">{{ t('web.payments.invoices.fields.invoice_number') }}</dt>
            <dd class="col-7">{{ invoice.invoice_number }}</dd>
            <dt class="col-5">{{ t('web.payments.invoices.fields.status') }}</dt>
            <dd class="col-7">{{ paymentUi.label }}</dd>
          </dl>
        </div>

        <button class="btn btn-outline-secondary btn-sm w-100" @click="router.back()">
          <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
        </button>
      </div>
    </div>
  </div>
</template>
