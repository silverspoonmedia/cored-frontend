<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormSelect from '@/components/FormSelect.vue'
import FormInput from '@/components/FormInput.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useVtual } from '@/composables/vtual/useVtual'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'
import { post } from '@/api/client'
import type { ApiResponse, VtualPlatform } from '@/api/types'

const router = useRouter()
const { fetchPlatforms } = useVtual()
const { error: showError } = useAlert()
const { t } = useI18n()

const platforms = ref<VtualPlatform[]>([])
const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const form = reactive({
  platform_id: '',
  method: 'GET',
  ids: '',
  handle: '',
  parts: '',
  chunked: false,
})

const result = ref<string>('')

const methodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
]

function fieldError(field: string): string | null {
  const list = errors.value[field]
  if (list && list.length > 0) return list[0] ?? null
  return null
}

onMounted(async () => {
  loading.value = true
  try {
    platforms.value = await fetchPlatforms()
    if (platforms.value.length > 0) {
      form.platform_id = platforms.value[0]!.id
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.failed_load_platforms'))
  } finally {
    loading.value = false
  }
})

async function handleSubmit(): Promise<void> {
  if (saving.value) return
  saving.value = true
  errors.value = {}
  result.value = ''

  const payload: Record<string, unknown> = {
    platform_id: form.platform_id,
    method: form.method,
    ids: form.ids || null,
    handle: form.handle || null,
    parts: form.parts || null,
    chunked: form.chunked,
  }

  try {
    const res = await post<ApiResponse<unknown>>('vtual/admin/platform-api/probe', payload)
    if (res.status === 'success' && res.data) {
      result.value = JSON.stringify(res.data, null, 2)
    } else {
      result.value = res.message ?? t('web.vtual.no_data_returned')
    }
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.vtual.probe_failed'))
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Card :title="t('web.vtual.platform_api_probe_title')">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="router.back()">
        <i class="bi bi-arrow-left me-1"></i> {{ t('web.vtual.back_button') }}
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" style="max-width: 700px;">
      <FormSelect
        name="platform_id"
        :label="t('web.vtual.platform_label')"
        v-model="form.platform_id"
        :options="platforms.map((p) => ({ value: p.id, label: p.name }))"
        :error="fieldError('platform_id')"
        :disabled="saving"
        required
      />
      <FormSelect
        name="method"
        :label="t('web.vtual.http_method_label')"
        v-model="form.method"
        :options="methodOptions"
        :error="fieldError('method')"
        :disabled="saving"
      />
      <FormInput
        name="ids"
        :label="t('web.vtual.ids_label')"
        v-model="form.ids"
        :error="fieldError('ids')"
        :disabled="saving"
        :placeholder="t('web.vtual.ids_placeholder')"
      />
      <FormInput
        name="handle"
        :label="t('web.vtual.handle_label')"
        v-model="form.handle"
        :error="fieldError('handle')"
        :disabled="saving"
      />
      <FormInput
        name="parts"
        :label="t('web.vtual.parts_label')"
        v-model="form.parts"
        :error="fieldError('parts')"
        :disabled="saving"
        :hint="t('web.vtual.parts_hint')"
      />
      <FormCheckbox
        name="chunked"
        :label="t('web.vtual.chunked_label')"
        v-model="form.chunked"
        :error="fieldError('chunked')"
        :disabled="saving"
      />

      <div class="d-flex gap-2 mb-3">
        <SubmitButton :label="t('web.vtual.run_probe')" :loading="saving" variant="primary" icon="bi-bug" />
      </div>

      <div v-if="result" class="mt-3">
        <h6>{{ t('web.vtual.result_label') }}</h6>
        <pre class="bg-light p-3 rounded small" style="max-height: 400px; overflow-y: auto;">{{ result }}</pre>
      </div>
    </form>
  </Card>
</template>
