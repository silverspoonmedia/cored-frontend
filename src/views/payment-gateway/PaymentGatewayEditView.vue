<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { usePaymentGateways } from '@/composables/payment-gateway/usePaymentGateways'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne, create, update } = usePaymentGateways()
const { success: showSuccess, error: showError } = useAlert()

const isEdit = computed(() => !!route.params.id)
const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const form = reactive({
  name: '',
  display_name: '',
  priority: 0,
  is_active: true,
})

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
    const g = await fetchOne(route.params.id as string)
    form.name = g.name
    form.display_name = g.display_name
    form.priority = g.priority
    form.is_active = g.is_active
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.payments.gateways.load_failed'))
  } finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (saving.value) return
  saving.value = true
  errors.value = {}

  const payload: Record<string, unknown> = {
    name: form.name,
    display_name: form.display_name,
    priority: form.priority,
    is_active: form.is_active,
  }

  try {
    if (isEdit.value) {
      await update(route.params.id as string, payload)
      showSuccess(t('web.payments.gateways.updated'))
    } else {
      await create(payload)
      showSuccess(t('web.payments.gateways.created'))
    }
    router.push({ name: 'payment-gateways.index.view' })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.payments.gateways.save_failed'))
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card :title="isEdit ? t('web.payments.gateways.edit_title') : t('web.payments.gateways.create_title')">
    <template #actions>
      <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'payment-gateways.index.view' }">
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </router-link>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" style="max-width: 500px;">
      <FormInput name="name" :label="t('web.payments.gateways.form.name')" v-model="form.name" :error="fieldError('name')" required :disabled="saving" />
      <FormInput name="display_name" :label="t('web.payments.gateways.form.display_name')" v-model="form.display_name" :error="fieldError('display_name')" required :disabled="saving" />
      <FormInput name="priority" :label="t('web.payments.gateways.form.priority')" type="number" v-model="form.priority" :error="fieldError('priority')" :disabled="saving" />
      <FormCheckbox name="is_active" :label="t('web.payments.gateways.form.is_active')" v-model="form.is_active" :error="fieldError('is_active')" :disabled="saving" />
      <div class="d-flex gap-2">
        <SubmitButton :label="t('ui.actions.save')" :loading="saving" variant="primary" />
        <router-link
          class="btn btn-outline-secondary"
          :class="{ disabled: saving }"
          :to="{ name: 'payment-gateways.index.view' }"
          :aria-disabled="saving ? 'true' : undefined"
          :tabindex="saving ? -1 : undefined"
        >{{ t('ui.actions.cancel') }}</router-link>
      </div>
    </form>
  </Card>
</template>
