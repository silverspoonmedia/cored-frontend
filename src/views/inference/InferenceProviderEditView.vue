<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useInferenceProviders } from '@/composables/inference/useInferenceProviders'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne, create, update } = useInferenceProviders()
const { success: showSuccess, error: showError } = useAlert()

const isEdit = computed(() => !!route.params.id)
const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const form = reactive({
  slug: '',
  name: '',
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
    const p = await fetchOne(route.params.id as string)
    form.slug = p.slug
    form.name = p.name
    form.is_active = p.is_active
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.inference.providers.load_failed'))
  } finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (saving.value) return
  saving.value = true
  errors.value = {}

  const payload: Record<string, unknown> = {
    slug: form.slug,
    name: form.name,
    is_active: form.is_active,
  }

  try {
    if (isEdit.value) {
      await update(route.params.id as string, payload)
      showSuccess(t('api.inference.providers.updated'))
    } else {
      await create(payload)
      showSuccess(t('api.inference.providers.created'))
    }
    router.push({ name: 'inference.providers.index.view' })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.inference.providers.save_failed'))
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card :title="isEdit ? t('web.inference.providers.edit_title') : t('web.inference.providers.create_title')">
    <template #actions>
      <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'inference.providers.index.view' }">
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </router-link>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" style="max-width: 500px;">
      <FormInput name="slug" :label="t('web.inference.providers.fields.slug')" v-model="form.slug" :error="fieldError('slug')" required :disabled="saving" />
      <FormInput name="name" :label="t('web.inference.providers.fields.name')" v-model="form.name" :error="fieldError('name')" required :disabled="saving" />
      <FormCheckbox name="is_active" :label="t('web.inference.providers.fields.is_active')" v-model="form.is_active" :error="fieldError('is_active')" :disabled="saving" />
      <div class="d-flex gap-2">
        <SubmitButton :label="isEdit ? t('web.inference.providers.save_changes') : t('web.inference.providers.create_submit')" :loading="saving" variant="primary" />
        <router-link
          class="btn btn-outline-secondary"
          :class="{ disabled: saving }"
          :to="{ name: 'inference.providers.index.view' }"
          :aria-disabled="saving ? 'true' : undefined"
          :tabindex="saving ? -1 : undefined"
        >{{ t('actions.cancel') }}</router-link>
      </div>
    </form>
  </Card>
</template>
