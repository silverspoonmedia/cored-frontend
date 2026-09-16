<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
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
  platform: '',
  method: 'fetch_videos',
  ids: '',
  handle: '',
  parts: '',
  chunked: false,
})

const result = ref<string>('')

const selectedPlatform = computed(() =>
  platforms.value.find((p) => p.key === form.platform) ?? null,
)

const methodOptions = computed(() => {
  const options = [
    { value: 'fetch_videos', label: t('web.vtual.probe.method_fetch_videos') },
    { value: 'fetch_videos_chunked', label: t('web.vtual.probe.method_fetch_videos_chunked') },
    { value: 'fetch_channels', label: t('web.vtual.probe.method_fetch_channels') },
    { value: 'resolve_channel', label: t('web.vtual.probe.method_resolve_channel') },
  ]
  if (form.platform === 'twitch') {
    options.push({ value: 'fetch_streams', label: t('web.vtual.probe.method_fetch_streams') })
  }
  return options
})

// fetch_streams only exists on Twitch; keep the selection valid when switching.
watch(() => form.platform, (platform) => {
  if (platform !== 'twitch' && form.method === 'fetch_streams') {
    form.method = 'fetch_videos'
  }
})

const probePlatformOptions = computed(() =>
  platforms.value
    .filter((p) => p.key === 'youtube' || p.key === 'twitch')
    .map((p) => ({ value: p.key, label: p.name })),
)

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
      form.platform = platforms.value[0]!.key
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

  const isVideoMethod = form.method === 'fetch_videos' || form.method === 'fetch_videos_chunked'
  const payload: Record<string, unknown> = {
    platform: form.platform,
    method: form.method,
    ids: form.ids || null,
    handle: form.method === 'resolve_channel' ? (form.handle || null) : null,
    parts: isVideoMethod && form.platform === 'youtube' ? (form.parts || null) : null,
    chunked: isVideoMethod && form.platform === 'youtube' ? form.chunked : false,
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

    <p class="text-muted small mb-3">{{ t('web.vtual.probe.subtitle') }}</p>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit">
      <FormSelect
        name="platform"
        :label="t('web.vtual.platform_label')"
        v-model="form.platform"
        :options="probePlatformOptions"
        :error="fieldError('platform')"
        :disabled="saving"
        required
      />
      <FormSelect
        name="method"
        :label="t('web.vtual.probe.method')"
        v-model="form.method"
        :options="methodOptions"
        :error="fieldError('method')"
        :disabled="saving"
      />
      <FormInput
        name="ids"
        :label="t('web.vtual.probe.ids')"
        v-model="form.ids"
        :error="fieldError('ids')"
        :disabled="saving"
        :hint="t('web.vtual.probe.ids_help')"
      />
      <FormInput
        name="handle"
        :label="t('web.vtual.probe.handle')"
        v-model="form.handle"
        :error="fieldError('handle')"
        :disabled="saving || form.method !== 'resolve_channel'"
        :hint="t('web.vtual.probe.handle_help')"
      />
      <FormInput
        v-if="form.platform === 'youtube' && (form.method === 'fetch_videos' || form.method === 'fetch_videos_chunked')"
        name="parts"
        :label="t('web.vtual.probe.parts')"
        v-model="form.parts"
        :error="fieldError('parts')"
        :disabled="saving"
        :hint="t('web.vtual.probe.parts_help')"
      />
      <FormCheckbox
        v-if="form.platform === 'youtube' && (form.method === 'fetch_videos' || form.method === 'fetch_videos_chunked')"
        name="chunked"
        :label="t('web.vtual.probe.chunked')"
        v-model="form.chunked"
        :error="fieldError('chunked')"
        :disabled="saving"
      />

      <div class="d-flex gap-2 mb-3">
        <SubmitButton :label="t('web.vtual.probe.run')" :loading="saving" variant="primary" icon="bi-bug" />
      </div>

      <div v-if="result" class="mt-3">
        <h6>{{ t('web.vtual.probe.result') }}</h6>
        <pre class="bg-body-tertiary border rounded p-3 small mb-0" style="max-height: 400px; overflow-y: auto;"><code>{{ result }}</code></pre>
      </div>
    </form>
  </Card>
</template>
