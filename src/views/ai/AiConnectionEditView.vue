<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useAiConnections } from '@/composables/ai/useAiConnections'
import { useAiConnectionsRealtime } from '@/composables/ai/useAiConnectionsRealtime'
import { useEchoResync } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import { useBreadcrumbTitle } from '@/composables/useBreadcrumbs'
import { ApiError } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne, create, patchOne } = useAiConnections()
const { success: showSuccess, error: showError } = useAlert()
const { subscribe, unsubscribe } = useAiConnectionsRealtime()

const connectionId = computed(() => (route.params.id as string) ?? null)
const isEdit = computed(() => !!connectionId.value)
const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

/** Status as stored — `pending` means Test has not passed yet. */
const storedStatus = ref<string>('pending')

const form = reactive({
  slug: '',
  label: '',
  endpoint: '',
  test_model: '',
  timeout_seconds: '',
  connect_timeout_seconds: '',
  max_retries: '',
  api_key: '',
  enabled: false,
})

// Trailing breadcrumb crumb: the edited connection's label, so the crumb reads
// `AI connections / Edit / <label>` instead of exposing the uuid route param.
// Gated on `isEdit` — the create screen holds no record and keeps the static trail.
useBreadcrumbTitle(() => (isEdit.value ? form.label : null))

// A pending row has never passed Test, so an on/off switch would either fake
// verification or activate an unprobed endpoint. Only a verified (active) or a
// deliberately disabled row gets one.
const showEnabledToggle = computed(() => isEdit.value && storedStatus.value !== 'pending')

function fieldError(field: string): string | null {
  const list = errors.value[field]
  if (list && list.length > 0) return list[0] ?? null
  return null
}

function nullableInt(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isNaN(parsed) ? null : parsed
}

async function load(): Promise<void> {
  if (!isEdit.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const c = await fetchOne(connectionId.value!)
    form.slug = c.slug
    form.label = c.label
    form.endpoint = c.endpoint
    form.test_model = c.test_model
    form.timeout_seconds = c.timeout_seconds === null ? '' : String(c.timeout_seconds)
    form.connect_timeout_seconds = c.connect_timeout_seconds === null ? '' : String(c.connect_timeout_seconds)
    form.max_retries = c.max_retries === null ? '' : String(c.max_retries)
    storedStatus.value = c.status
    form.enabled = c.status === 'active'
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.ai-connections.load_failed'))
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
    label: form.label,
    endpoint: form.endpoint,
    test_model: form.test_model,
    // Blank numeric override = clear it (PATCH keeps the stored value only for
    // the text fields; see UpdateAiConnectionRequest::connectionPayload).
    timeout_seconds: nullableInt(form.timeout_seconds),
    connect_timeout_seconds: nullableInt(form.connect_timeout_seconds),
    max_retries: nullableInt(form.max_retries),
  }

  if (form.api_key.trim() !== '') {
    payload.secret = { api_key: form.api_key.trim() }
  }

  if (showEnabledToggle.value) {
    payload.status = form.enabled ? 'active' : 'disabled'
  }

  try {
    if (isEdit.value) {
      await patchOne(connectionId.value!, payload)
      showSuccess(t('api.ai.updated'))
    } else {
      await create(payload)
      showSuccess(t('api.ai.created'))
    }
    await router.push({ name: 'ai.connections.index.view' })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.ai-connections.save_failed'))
    }
  } finally {
    saving.value = false
  }
}

// Live update: this connection edited in another tab reloads the form.
const realtimeHandlers = {
  onConnectionChanged: (payload: { connection_id: string | null }) => {
    if (isEdit.value && (!payload.connection_id || payload.connection_id === connectionId.value)) {
      void load()
    }
  },
}

// Socket-outage recovery: mirror the realtime handler.
useEchoResync(() => { void load() })

onMounted(() => {
  void load()
  subscribe(realtimeHandlers)
})

onUnmounted(() => {
  unsubscribe(realtimeHandlers)
})
</script>

<template>
  <Card :title="isEdit ? t('web.ai-connections.edit_title') : t('web.ai-connections.create_title')">
    <template #actions>
      <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'ai.connections.index.view' }">
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </router-link>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" style="max-width: 640px;">
      <p class="text-muted small">{{ t('web.ai-connections.form_help') }}</p>

      <FormInput
        name="slug"
        :label="t('web.ai-connections.fields.slug')"
        v-model="form.slug"
        :error="fieldError('slug')"
        :hint="t('web.ai-connections.fields.slug_hint')"
        required
        :disabled="saving"
      />
      <FormInput
        name="label"
        :label="t('web.ai-connections.fields.label')"
        v-model="form.label"
        :error="fieldError('label')"
        required
        :disabled="saving"
      />
      <FormInput
        name="endpoint"
        :label="t('web.ai-connections.fields.endpoint')"
        v-model="form.endpoint"
        :error="fieldError('endpoint')"
        :hint="t('web.ai-connections.fields.endpoint_hint')"
        required
        :disabled="saving"
      />
      <FormInput
        name="test_model"
        :label="t('web.ai-connections.fields.test_model')"
        v-model="form.test_model"
        :error="fieldError('test_model')"
        :hint="t('web.ai-connections.fields.test_model_hint')"
        required
        :disabled="saving"
      />
      <FormInput
        name="api_key"
        :label="t('web.ai-connections.fields.api_key')"
        type="password"
        v-model="form.api_key"
        :error="fieldError('secret.api_key')"
        :hint="isEdit ? t('web.ai-connections.fields.api_key_hint_edit') : t('web.ai-connections.fields.api_key_hint')"
        :placeholder="isEdit ? t('web.vtual-platform-credentials.keep_unchanged_placeholder') : ''"
        :toggleable="true"
        :required="!isEdit"
        :disabled="saving"
      />

      <div class="row">
        <div class="col-md-4">
          <FormInput
            name="timeout_seconds"
            :label="t('web.ai-connections.fields.timeout_seconds')"
            type="number"
            v-model="form.timeout_seconds"
            :error="fieldError('timeout_seconds')"
            :disabled="saving"
          />
        </div>
        <div class="col-md-4">
          <FormInput
            name="connect_timeout_seconds"
            :label="t('web.ai-connections.fields.connect_timeout_seconds')"
            type="number"
            v-model="form.connect_timeout_seconds"
            :error="fieldError('connect_timeout_seconds')"
            :disabled="saving"
          />
        </div>
        <div class="col-md-4">
          <FormInput
            name="max_retries"
            :label="t('web.ai-connections.fields.max_retries')"
            type="number"
            v-model="form.max_retries"
            :error="fieldError('max_retries')"
            :disabled="saving"
          />
        </div>
      </div>

      <FormCheckbox
        v-if="showEnabledToggle"
        name="enabled"
        switch
        :label="t('web.ai-connections.fields.enabled')"
        v-model="form.enabled"
        :hint="t('web.ai-connections.fields.enabled_hint')"
        :error="fieldError('status')"
        :disabled="saving"
      />

      <p v-if="isEdit && storedStatus === 'pending'" class="alert alert-warning py-2 small">
        {{ t('web.ai-connections.pending_notice') }}
      </p>

      <div class="d-flex gap-2">
        <SubmitButton
          :label="isEdit ? t('web.ai-connections.save_changes') : t('web.ai-connections.create_submit')"
          :loading="saving"
          variant="primary"
        />
        <router-link
          class="btn btn-outline-secondary"
          :class="{ disabled: saving }"
          :to="{ name: 'ai.connections.index.view' }"
          :aria-disabled="saving ? 'true' : undefined"
          :tabindex="saving ? -1 : undefined"
        >{{ t('actions.cancel') }}</router-link>
      </div>
    </form>
  </Card>
</template>
