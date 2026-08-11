<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useSubscriptions } from '@/composables/useSubscriptions'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne, create, update } = useSubscriptions()
const { success: showSuccess, error: showError } = useAlert()

const isEdit = computed(() => !!route.params.id)
const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const form = reactive({
  subscriber_name: '',
  subscriber_email: '',
  subscriber_phone: '',
  plan_name: '',
  plan_description: '',
  billing_cycle: 'monthly',
  amount: 0,
  currency: 'USD',
  status: 'active',
  trial_ends_at: '',
  started_at: '',
  expires_at: '',
  auto_renew: false,
})

const billingCycles = computed<Record<string, string>>(() => ({
  monthly: t('web.payments.subscriptions.billing_cycles.monthly'),
  quarterly: t('web.payments.subscriptions.billing_cycles.quarterly'),
  semiannual: t('web.payments.subscriptions.billing_cycles.semiannual'),
  annual: t('web.payments.subscriptions.billing_cycles.annual'),
}))

const statuses = computed<Record<string, string>>(() => ({
  active: t('web.payments.subscriptions.statuses.active'),
  trialing: t('web.payments.subscriptions.statuses.trialing'),
  cancelled: t('web.payments.subscriptions.statuses.cancelled'),
  expired: t('web.payments.subscriptions.statuses.expired'),
  paused: t('web.payments.subscriptions.statuses.paused'),
}))

function fieldError(field: string): string | null {
  const list = errors.value[field]
  if (list && list.length > 0) return list[0] ?? null
  return null
}

async function load(): Promise<void> {
  if (!isEdit.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const s = await fetchOne(route.params.id as string)
    form.subscriber_name = s.subscriber_name
    form.subscriber_email = s.subscriber_email
    form.subscriber_phone = s.subscriber_phone ?? ''
    form.plan_name = s.plan_name
    form.plan_description = s.plan_description ?? ''
    form.billing_cycle = s.billing_cycle
    form.amount = s.amount
    form.currency = s.currency
    form.status = s.status
    form.trial_ends_at = s.trial_ends_at ?? ''
    form.started_at = s.started_at ?? ''
    form.expires_at = s.expires_at ?? ''
    form.auto_renew = s.auto_renew
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.payments.subscriptions.load_failed'))
  } finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (saving.value) return
  saving.value = true
  errors.value = {}

  const payload: Record<string, unknown> = {
    subscriber_name: form.subscriber_name,
    subscriber_email: form.subscriber_email,
    subscriber_phone: form.subscriber_phone || null,
    plan_name: form.plan_name,
    plan_description: form.plan_description || null,
    billing_cycle: form.billing_cycle,
    amount: form.amount,
    currency: form.currency,
    status: form.status,
    trial_ends_at: form.trial_ends_at || null,
    started_at: form.started_at || null,
    expires_at: form.expires_at || null,
    auto_renew: form.auto_renew,
  }

  try {
    if (isEdit.value) {
      await update(route.params.id as string, payload)
      showSuccess(t('web.payments.subscriptions.updated'))
    } else {
      await create(payload)
      showSuccess(t('web.payments.subscriptions.created'))
    }
    router.push({ name: 'subscriptions.index.view' })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.payments.subscriptions.save_failed'))
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card :title="isEdit ? t('web.payments.subscriptions.edit_card_title_simple') : t('web.payments.subscriptions.create_card_title')">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'subscriptions.index.view' })">
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="row g-3">
      <div class="col-md-6">
        <FormInput name="subscriber_name" :label="t('web.payments.subscriptions.fields.subscriber_name')" v-model="form.subscriber_name" :error="fieldError('subscriber_name')" required :disabled="saving" />
      </div>
      <div class="col-md-6">
        <FormInput name="subscriber_email" type="email" :label="t('web.payments.subscriptions.fields.subscriber_email')" v-model="form.subscriber_email" :error="fieldError('subscriber_email')" required :disabled="saving" />
      </div>
      <div class="col-md-6">
        <FormInput name="subscriber_phone" :label="t('web.payments.subscriptions.fields.subscriber_phone')" v-model="form.subscriber_phone" :error="fieldError('subscriber_phone')" :disabled="saving" />
      </div>
      <div class="col-md-6">
        <FormInput name="plan_name" :label="t('web.payments.subscriptions.fields.plan_name')" v-model="form.plan_name" :error="fieldError('plan_name')" required :disabled="saving" />
      </div>
      <div class="col-12">
        <FormInput name="plan_description" :label="t('web.payments.subscriptions.fields.plan_description')" v-model="form.plan_description" :error="fieldError('plan_description')" :disabled="saving" />
      </div>
      <div class="col-md-4">
        <FormSelect name="billing_cycle" :label="t('web.payments.subscriptions.fields.billing_cycle')" v-model="form.billing_cycle" :options="billingCycles" :error="fieldError('billing_cycle')" required :disabled="saving" />
      </div>
      <div class="col-md-4">
        <FormInput name="amount" type="number" :label="t('web.payments.subscriptions.fields.amount')" v-model="form.amount" :error="fieldError('amount')" required :disabled="saving" />
      </div>
      <div class="col-md-4">
        <FormInput name="currency" :label="t('web.payments.subscriptions.fields.currency')" v-model="form.currency" :error="fieldError('currency')" :disabled="saving" :hint="t('web.payments.subscriptions.fields.currency_hint')" />
      </div>
      <div class="col-md-4">
        <FormSelect name="status" :label="t('web.payments.subscriptions.fields.status')" v-model="form.status" :options="statuses" :error="fieldError('status')" :disabled="saving" />
      </div>
      <div class="col-md-4">
        <FormInput name="trial_ends_at" :label="t('web.payments.subscriptions.fields.trial_ends_at')" v-model="form.trial_ends_at" :error="fieldError('trial_ends_at')" :disabled="saving" :hint="t('web.payments.subscriptions.fields.date_hint')" />
      </div>
      <div class="col-md-4">
        <FormInput name="started_at" :label="t('web.payments.subscriptions.fields.started_at')" v-model="form.started_at" :error="fieldError('started_at')" :disabled="saving" :hint="t('web.payments.subscriptions.fields.date_hint')" />
      </div>
      <div class="col-md-4">
        <FormInput name="expires_at" :label="t('web.payments.subscriptions.fields.expires_at')" v-model="form.expires_at" :error="fieldError('expires_at')" :disabled="saving" :hint="t('web.payments.subscriptions.fields.date_hint')" />
      </div>
      <div class="col-md-4">
        <FormCheckbox name="auto_renew" :label="t('web.payments.subscriptions.fields.auto_renew')" v-model="form.auto_renew" :error="fieldError('auto_renew')" :disabled="saving" />
      </div>
      <div class="col-12">
        <div class="d-flex gap-2">
          <SubmitButton :label="isEdit ? t('web.payments.subscriptions.form.save_changes') : t('ui.actions.create')" :loading="saving" variant="primary" />
          <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="router.push({ name: 'subscriptions.index.view' })">{{ t('ui.actions.cancel') }}</button>
        </div>
      </div>
    </form>
  </Card>
</template>
