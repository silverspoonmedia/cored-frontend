<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import { useServices } from '@/composables/service/useServices'
import { useServicesHydrate } from '@/composables/service/useServicesHydrate'
import { useServicesRealtime } from '@/composables/service/useServicesRealtime'
import { useEchoResync } from '@/composables/useEcho'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type { Service } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne, checkout, fetchOptions } = useServices()
const { hydrateServiceShow } = useServicesHydrate()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

const service = ref<Service | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const submitting = ref(false)

const checkoutCurrency = ref('')
const checkoutQuantity = ref(1)

const canInitiatePayment = computed(() => hasPermission('purchase service') || hasPermission('initiate payment'))
const isAddonPlan = computed(() => service.value?.plan_kind === 'addon')
const canCheckout = computed(() => canInitiatePayment.value && service.value?.status === 'active' && (service.value?.prices?.length ?? 0) > 0)
const maxPurchaseQuantity = ref(99)

async function loadService(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const batchResult = await hydrateServiceShow(route.params.id as string).catch(() => null)
    if (batchResult?.service) {
      service.value = batchResult.service
      if (batchResult.options && batchResult.options.purchase_max_quantity >= 1) {
        maxPurchaseQuantity.value = batchResult.options.purchase_max_quantity
      }
    } else {
      service.value = await fetchOne(route.params.id as string)
      try {
        const opts = await fetchOptions()
        if (opts.purchase_max_quantity >= 1) {
          maxPurchaseQuantity.value = opts.purchase_max_quantity
        }
      } catch {
        // last-resort 99
      }
    }
    const firstPrice = service.value?.prices?.[0]
    if (firstPrice) {
      checkoutCurrency.value = firstPrice.currency
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.services.load_failed')
  } finally {
    loading.value = false
  }
}

// Live update: this service edited elsewhere reloads the detail view.
const { subscribeCatalog, unsubscribeCatalog } = useServicesRealtime()
const catalogHandlers = { onCatalogChanged: () => { void loadService() } }

onMounted(() => {
  loadService()
  subscribeCatalog(catalogHandlers)
})

onUnmounted(() => {
  unsubscribeCatalog(catalogHandlers)
})

useEchoResync(() => { void loadService() })

async function handleCheckout(): Promise<void> {
  if (!service.value || submitting.value) return
  submitting.value = true
  try {
    const purchase = await checkout(service.value.id, checkoutCurrency.value, checkoutQuantity.value)
    showSuccess(t('api.services.checkout_success'))
    router.push({ name: 'service-purchases.show.view', params: { id: purchase.id } })
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.services.checkout_failed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="loading" class="card">
    <div class="card-body">
      <SkeletonBlock variant="line" :lines="1" width="35%" />
      <SkeletonBlock variant="line" :lines="6" />
    </div>
  </div>

  <ErrorState v-else-if="loadError" :message="loadError" @retry="loadService" />

  <Card v-else-if="service" :title="service.name">
    <template #actions>
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="router.push({ name: 'services.index.view' })"
      >
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </button>
    </template>

    <dl class="row mb-3">
      <dt class="col-sm-3">{{ t('web.services.columns.code') }}</dt>
      <dd class="col-sm-9"><code>{{ service.code }}</code></dd>

      <dt class="col-sm-3">{{ t('web.services.columns.status') }}</dt>
      <dd class="col-sm-9">{{ service.status }}</dd>

      <dt class="col-sm-3">{{ t('web.services.form.billing_interval') }}</dt>
      <dd class="col-sm-9">{{ service.billing_interval }}</dd>

      <dt class="col-sm-3">{{ t('web.services.form.plan_kind') }}</dt>
      <dd class="col-sm-9">{{ service.plan_kind ?? '—' }}</dd>

      <dt class="col-sm-3">{{ t('web.services.form.storage_bytes') }}</dt>
      <dd class="col-sm-9">{{ service.storage_bytes_human ?? service.storage_bytes ?? 0 }}</dd>

      <dt class="col-sm-3">{{ t('web.services.columns.prices') }}</dt>
      <dd class="col-sm-9">
        <div v-if="service.prices && service.prices.length > 0">
          <div v-for="price in service.prices" :key="price.id">
            {{ price.amount_formatted ?? `${price.currency} ${price.amount}` }}
          </div>
        </div>
        <span v-else>—</span>
      </dd>

      <dt class="col-sm-3">{{ t('web.services.form.description') }}</dt>
      <dd class="col-sm-9">{{ service.description ?? '—' }}</dd>
    </dl>

    <form v-if="canCheckout" class="d-flex flex-wrap gap-2 align-items-end" @submit.prevent="handleCheckout">
      <div>
        <label class="form-label" for="checkout-currency">{{ t('web.services.show.checkout_currency') }}</label>
        <select id="checkout-currency" v-model="checkoutCurrency" class="form-select" required>
          <option v-for="price in service.prices" :key="price.id" :value="price.currency">
            {{ price.amount_formatted ?? `${price.currency} — ${price.amount}` }}
          </option>
        </select>
      </div>
      <div v-if="isAddonPlan">
        <label class="form-label" for="checkout-quantity">{{ t('web.services.show.purchase_quantity') }}</label>
        <input
          id="checkout-quantity"
          v-model.number="checkoutQuantity"
          type="number"
          class="form-control"
          min="1"
          :max="maxPurchaseQuantity"
          required
        />
      </div>
      <button type="submit" class="btn btn-primary" :disabled="submitting">
        <span v-if="submitting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
        <i v-else class="bi bi-credit-card me-1" aria-hidden="true"></i>
        {{ t('web.services.show.start_checkout') }}
      </button>
    </form>
  </Card>
</template>
