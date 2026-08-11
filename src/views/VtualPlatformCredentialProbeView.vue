<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import FormSelect from '@/components/FormSelect.vue'
import FormInput from '@/components/FormInput.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useVtual } from '@/composables/useVtual'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'
import { post } from '@/api/client'
import type { ApiResponse, VtualPlatform } from '@/api/types'

const router = useRouter()
const { fetchPlatforms } = useVtual()
const { error: showError } = useAlert()

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
    showError(e instanceof Error ? e.message : 'Failed to load platforms')
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
      result.value = res.message ?? 'No data returned.'
    }
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : 'Probe failed')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Card title="Platform API Probe">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="router.back()">
        <i class="bi bi-arrow-left me-1"></i> Back
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" style="max-width: 700px;">
      <FormSelect
        name="platform_id"
        label="Platform"
        v-model="form.platform_id"
        :options="platforms.map((p) => ({ value: p.id, label: p.name }))"
        :error="fieldError('platform_id')"
        :disabled="saving"
        required
      />
      <FormSelect
        name="method"
        label="HTTP Method"
        v-model="form.method"
        :options="methodOptions"
        :error="fieldError('method')"
        :disabled="saving"
      />
      <FormInput
        name="ids"
        label="IDs (comma-separated)"
        v-model="form.ids"
        :error="fieldError('ids')"
        :disabled="saving"
        placeholder="e.g. abc123,def456"
      />
      <FormInput
        name="handle"
        label="Handle"
        v-model="form.handle"
        :error="fieldError('handle')"
        :disabled="saving"
      />
      <FormInput
        name="parts"
        label="Parts"
        v-model="form.parts"
        :error="fieldError('parts')"
        :disabled="saving"
        hint="e.g. snippets,videos"
      />
      <FormCheckbox
        name="chunked"
        label="Chunked"
        v-model="form.chunked"
        :error="fieldError('chunked')"
        :disabled="saving"
      />

      <div class="d-flex gap-2 mb-3">
        <SubmitButton label="Run Probe" :loading="saving" variant="primary" icon="bi-bug" />
      </div>

      <div v-if="result" class="mt-3">
        <h6>Result</h6>
        <pre class="bg-light p-3 rounded small" style="max-height: 400px; overflow-y: auto;">{{ result }}</pre>
      </div>
    </form>
  </Card>
</template>
