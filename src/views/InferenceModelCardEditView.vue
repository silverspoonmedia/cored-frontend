<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useInferenceModelCards } from '@/composables/useInferenceModelCards'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { fetchOne, create, update } = useInferenceModelCards()
const { success: showSuccess, error: showError } = useAlert()

const isEdit = computed(() => !!route.params.id)
const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const form = reactive({
  slug: '',
  display_name: '',
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
    const card = await fetchOne(route.params.id as string)
    form.slug = card.slug
    form.display_name = card.display_name ?? ''
    form.is_active = card.is_active
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load model card')
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
    display_name: form.display_name || null,
    is_active: form.is_active,
  }

  try {
    if (isEdit.value) {
      await update(route.params.id as string, payload)
      showSuccess('Model card updated.')
    } else {
      await create(payload)
      showSuccess('Model card created.')
    }
    router.push({ name: 'inference.model-cards.index.view' })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : 'Failed to save')
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card :title="isEdit ? 'Edit Model Card' : 'Create Model Card'">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'inference.model-cards.index.view' })">
        <i class="bi bi-arrow-left me-1"></i> Back
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" style="max-width: 500px;">
      <FormInput name="slug" label="Slug" v-model="form.slug" :error="fieldError('slug')" required :disabled="saving" hint="Unique identifier, e.g. gpt-4o" />
      <FormInput name="display_name" label="Display Name" v-model="form.display_name" :error="fieldError('display_name')" :disabled="saving" />
      <FormCheckbox name="is_active" label="Active" v-model="form.is_active" :error="fieldError('is_active')" :disabled="saving" />
      <div class="d-flex gap-2">
        <SubmitButton :label="isEdit ? 'Save Changes' : 'Create'" :loading="saving" variant="primary" />
        <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="router.push({ name: 'inference.model-cards.index.view' })">Cancel</button>
      </div>
    </form>
  </Card>
</template>
