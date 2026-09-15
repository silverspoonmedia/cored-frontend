<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useServices } from '@/composables/service/useServices'
import { useServicesHydrate } from '@/composables/service/useServicesHydrate'
import { useServicesRealtime } from '@/composables/service/useServicesRealtime'
import { useEchoResync } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import { useBreadcrumbTitle } from '@/composables/useBreadcrumbs'
import { isTerminalBatchError } from '@/api/batch'
import { ApiError, type ServicePrice } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne, create, update, fetchOptions } = useServices()
const { hydrateServiceEdit } = useServicesHydrate()
const { success: showSuccess, error: showError } = useAlert()

const isEdit = computed(() => !!route.params.id)
const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const form = reactive({
  code: '',
  name: '',
  description: '',
  billing_interval: 'monthly',
  fulfillment_target: '',
  entitlement: '',
  plan_kind: '',
  storage_bytes: 0,
  status: 'active',
  prices: [] as ServicePrice[],
})

// Trailing breadcrumb crumb: the edited service's name, so the crumb reads
// `Services / Edit / <name>` instead of exposing the uuid route param. Gated on
// `isEdit` — the create screen holds no record and keeps the static trail.
useBreadcrumbTitle(() => (isEdit.value ? form.name : null))

const billingIntervals = ref<Record<string, string>>({})
const planKinds = ref<Record<string, string>>({ '': t('web.services.form.none_option') })
const statuses = ref<Record<string, string>>({})

function humanize(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function fieldError(field: string): string | null {
  const list = errors.value[field]
  if (list && list.length > 0) return list[0] ?? null
  return null
}

function addPrice(): void {
  form.prices.push({ currency: 'USD', amount: 0 })
}

function removePrice(index: number): void {
  form.prices.splice(index, 1)
}

async function load(): Promise<void> {
  loading.value = true
  try {
    let opts: Awaited<ReturnType<typeof fetchOptions>> | null = null
    let s: Awaited<ReturnType<typeof fetchOne>> | null = null

    if (isEdit.value) {
      // Batch the two independent reads; fall back to standalone loaders on
      // transient entry failure (standalone endpoints stay the source of truth).
      // A terminal 401/403/429 entry re-throws so we never re-fire a request
      // that would be rejected again (and a 401 would force a global logout).
      const hydrated = await hydrateServiceEdit(route.params.id as string).catch((e) => {
        if (isTerminalBatchError(e)) throw e
        return null
      })
      opts = hydrated?.options ?? null
      s = hydrated?.service ?? null
      if (opts === null || s === null) {
        const [fallbackOpts, fallbackService] = await Promise.all([
          opts === null ? fetchOptions() : Promise.resolve(opts),
          s === null ? fetchOne(route.params.id as string) : Promise.resolve(s),
        ])
        opts = fallbackOpts
        s = fallbackService
      }
    } else {
      opts = await fetchOptions()
    }

    if (opts === null) {
      throw new Error(t('web.services.load_failed'))
    }
    billingIntervals.value = Object.fromEntries(opts.billing_intervals.map((v) => [v, humanize(v)]))
    planKinds.value = { '': t('web.services.form.none_option'), ...Object.fromEntries(opts.plan_kinds.map((v) => [v, humanize(v)])) }
    statuses.value = Object.fromEntries(opts.statuses.map((v) => [v, humanize(v)]))

    if (isEdit.value && s) {
      form.code = s.code
      form.name = s.name
      form.description = s.description ?? ''
      form.billing_interval = s.billing_interval
      form.fulfillment_target = s.fulfillment_target ?? ''
      form.entitlement = s.entitlement ?? ''
      form.plan_kind = s.plan_kind ?? ''
      form.storage_bytes = s.storage_bytes ?? 0
      form.status = s.status
      form.prices = s.prices ? [...s.prices] : []
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.services.load_failed'))
  } finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (saving.value) return
  saving.value = true
  errors.value = {}

  const payload: Record<string, unknown> = {
    code: form.code,
    name: form.name,
    description: form.description || null,
    billing_interval: form.billing_interval,
    fulfillment_target: form.fulfillment_target || null,
    entitlement: form.entitlement || null,
    plan_kind: form.plan_kind || null,
    storage_bytes: form.storage_bytes || null,
    status: form.status,
    prices: form.prices.length > 0 ? form.prices : undefined,
  }

  try {
    if (isEdit.value) {
      await update(route.params.id as string, payload)
      showSuccess(t('web.services.updated'))
    } else {
      await create(payload)
      showSuccess(t('web.services.created'))
    }
    router.push({ name: 'services.index.view' })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.services.save_failed'))
    }
  } finally {
    saving.value = false
  }
}

// Live update: another admin edits this service — reload the form data.
const { subscribeCatalog, unsubscribeCatalog } = useServicesRealtime()
const catalogHandlers = { onCatalogChanged: () => { void load() } }

onMounted(() => {
  load()
  subscribeCatalog(catalogHandlers)
})

onUnmounted(() => {
  unsubscribeCatalog(catalogHandlers)
})

useEchoResync(() => { void load() })
</script>

<template>
  <Card :title="isEdit ? t('web.services.edit_title') : t('web.services.create_title')">
    <template #actions>
      <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'services.index.view' }">
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </router-link>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="row g-3">
      <div class="col-md-6">
        <FormInput name="code" :label="t('web.services.form.code')" v-model="form.code" :error="fieldError('code')" required :disabled="saving" :hint="t('web.services.form.code_hint')" />
      </div>
      <div class="col-md-6">
        <FormInput name="name" :label="t('web.services.form.name')" v-model="form.name" :error="fieldError('name')" required :disabled="saving" />
      </div>
      <div class="col-12">
        <FormInput name="description" :label="t('web.services.form.description')" v-model="form.description" :error="fieldError('description')" :disabled="saving" />
      </div>
      <div class="col-md-4">
        <FormSelect name="billing_interval" :label="t('web.services.form.billing_interval')" v-model="form.billing_interval" :options="billingIntervals" :error="fieldError('billing_interval')" required :disabled="saving" />
      </div>
      <div class="col-md-4">
        <FormInput name="fulfillment_target" :label="t('web.services.form.fulfillment_target')" v-model="form.fulfillment_target" :error="fieldError('fulfillment_target')" :disabled="saving" />
      </div>
      <div class="col-md-4">
        <FormInput name="entitlement" :label="t('web.services.form.entitlement')" v-model="form.entitlement" :error="fieldError('entitlement')" :disabled="saving" />
      </div>
      <div class="col-md-4">
        <FormSelect name="plan_kind" :label="t('web.services.form.plan_kind')" v-model="form.plan_kind" :options="planKinds" :error="fieldError('plan_kind')" :disabled="saving" />
      </div>
      <div class="col-md-4">
        <FormInput name="storage_bytes" type="number" :label="t('web.services.form.storage_bytes')" v-model="form.storage_bytes" :error="fieldError('storage_bytes')" :disabled="saving" />
      </div>
      <div class="col-md-4">
        <FormSelect name="status" :label="t('web.services.form.status')" v-model="form.status" :options="statuses" :error="fieldError('status')" required :disabled="saving" />
      </div>

      <!-- Prices -->
      <div class="col-12">
        <hr>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="mb-0">{{ t('web.services.form.prices') }}</h6>
          <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="saving" @click="addPrice">
            <i class="bi bi-plus-lg me-1"></i> {{ t('web.services.form.add_price') }}
          </button>
        </div>
        <div v-for="(price, index) in form.prices" :key="index" class="row g-2 mb-2 align-items-end">
          <div class="col-4">
            <label class="form-label small">{{ t('web.services.form.price_currency') }}</label>
            <input v-model="price.currency" type="text" class="form-control form-control-sm" maxlength="3" :disabled="saving">
          </div>
          <div class="col-4">
            <label class="form-label small">{{ t('web.services.form.price_amount') }}</label>
            <input v-model.number="price.amount" type="number" step="0.01" class="form-control form-control-sm" :disabled="saving">
          </div>
          <div class="col-auto">
            <button type="button" class="btn btn-outline-danger btn-sm" :disabled="saving" @click="removePrice(index)">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>
        <p v-if="form.prices.length === 0" class="text-muted small mb-0">{{ t('web.services.form.no_prices') }}</p>
      </div>

      <div class="col-12">
        <div class="d-flex gap-2">
          <SubmitButton :label="isEdit ? t('web.services.form.save_changes') : t('ui.actions.create')" :loading="saving" variant="primary" />
          <router-link
            class="btn btn-outline-secondary"
            :class="{ disabled: saving }"
            :to="{ name: 'services.index.view' }"
            :aria-disabled="saving ? 'true' : undefined"
            :tabindex="saving ? -1 : undefined"
          >{{ t('ui.actions.cancel') }}</router-link>
        </div>
      </div>
    </form>
  </Card>
</template>
