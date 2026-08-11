<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useVtual } from '@/composables/useVtual'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchCredential, createCredential, updateCredential } = useVtual()
const { success: showSuccess, error: showError } = useAlert()

const credentialId = computed(() => (route.params.id as string) ?? null)
const platformId = computed(() => (route.params.platformId as string) ?? null)
const isEdit = computed(() => !!credentialId.value)
const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const form = reactive({
  label: '',
  type: 'api_key' as 'api_key' | 'oauth_app' | 'bearer',
  priority: '100',
  api_key: '',
  client_id: '',
  client_secret: '',
  access_token: '',
  refresh_token: '',
  expires_at: '',
})

const typeOptions = computed(() => [
  { value: 'api_key', label: t('web.vtual-platform-credentials.type_api_key') },
  { value: 'oauth_app', label: t('web.vtual-platform-credentials.type_oauth_app') },
  { value: 'bearer', label: t('web.vtual-platform-credentials.type_bearer') },
])

function fieldError(field: string): string | null {
  const list = errors.value[field]
  if (list && list.length > 0) return list[0] ?? null
  return null
}

function buildSecretPayload(): Record<string, string> {
  const secret: Record<string, string> = {}
  if (form.type === 'api_key' && form.api_key) secret.api_key = form.api_key
  if (form.type === 'oauth_app') {
    if (form.client_id) secret.client_id = form.client_id
    if (form.client_secret) secret.client_secret = form.client_secret
  }
  if (form.type === 'bearer') {
    if (form.access_token) secret.access_token = form.access_token
    if (form.refresh_token) secret.refresh_token = form.refresh_token
    if (form.expires_at) secret.expires_at = form.expires_at
  }
  return secret
}

async function load(): Promise<void> {
  if (!isEdit.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const cred = await fetchCredential(credentialId.value!)
    form.label = cred.label
    form.type = cred.type
    form.priority = String(cred.priority ?? 100)
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-platform-credentials.load_failed'))
  } finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (saving.value) return
  saving.value = true
  errors.value = {}

  const secret = buildSecretPayload()
  const payload: Record<string, unknown> = {
    label: form.label,
    type: form.type,
    priority: form.priority ? parseInt(form.priority, 10) : null,
  }
  if (Object.keys(secret).length > 0) {
    payload.secret = secret
  }

  try {
    if (isEdit.value) {
      const { type, ...updatePayload } = payload as Record<string, unknown> & { type: unknown }
      void type
      if (Object.keys(secret).length === 0) {
        delete (updatePayload as Record<string, unknown>).secret
      }
      await updateCredential(credentialId.value!, updatePayload)
      showSuccess(t('web.vtual.ajax.credential_saved'))
    } else {
      await createCredential(platformId.value!, payload)
      showSuccess(t('web.vtual.ajax.credential_saved'))
    }
    router.push({
      name: 'vtual.platform-credentials.platform.view',
      params: { platformId: platformId.value! },
    })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.vtual-platform-credentials.save_failed'))
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card :title="isEdit ? t('web.vtual-platform-credentials.edit_title') : t('web.vtual-platform-credentials.create_title')">
    <template #actions>
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="router.back()"
      >
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" style="max-width: 600px;">
      <FormInput
        name="label"
        :label="t('web.vtual-platform-credentials.label_field')"
        v-model="form.label"
        :error="fieldError('label')"
        required
        :disabled="saving"
      />
      <FormSelect
        name="type"
        :label="t('web.vtual-platform-credentials.type_field')"
        v-model="form.type"
        :error="fieldError('type')"
        :options="typeOptions"
        :disabled="isEdit || saving"
        :hint="t('web.vtual-platform-credentials.type_hint')"
      />
      <FormInput
        name="priority"
        :label="t('web.vtual-platform-credentials.priority_field')"
        type="number"
        v-model="form.priority"
        :error="fieldError('priority')"
        :disabled="saving"
      />

      <h6 class="mt-3 mb-2">{{ t('web.vtual-platform-credentials.secret_heading') }}</h6>

      <template v-if="form.type === 'api_key'">
        <FormInput
          name="api_key"
          :label="t('web.vtual-platform-credentials.api_key_label')"
          type="password"
          v-model="form.api_key"
          :error="fieldError('secret.api_key')"
          :disabled="saving"
          :placeholder="isEdit ? t('web.vtual-platform-credentials.keep_unchanged_placeholder') : ''"
          :toggleable="true"
        />
      </template>

      <template v-if="form.type === 'oauth_app'">
        <FormInput
          name="client_id"
          :label="t('web.vtual-platform-credentials.client_id_label')"
          v-model="form.client_id"
          :error="fieldError('secret.client_id')"
          :disabled="saving"
          :placeholder="isEdit ? t('web.vtual-platform-credentials.keep_unchanged_placeholder') : ''"
        />
        <FormInput
          name="client_secret"
          :label="t('web.vtual-platform-credentials.client_secret_label')"
          type="password"
          v-model="form.client_secret"
          :error="fieldError('secret.client_secret')"
          :disabled="saving"
          :placeholder="isEdit ? t('web.vtual-platform-credentials.keep_unchanged_placeholder') : ''"
          :toggleable="true"
        />
      </template>

      <template v-if="form.type === 'bearer'">
        <FormInput
          name="access_token"
          :label="t('web.vtual-platform-credentials.access_token_label')"
          type="password"
          v-model="form.access_token"
          :error="fieldError('secret.access_token')"
          :disabled="saving"
          :placeholder="isEdit ? t('web.vtual-platform-credentials.keep_unchanged_placeholder') : ''"
          :toggleable="true"
        />
        <FormInput
          name="refresh_token"
          :label="t('web.vtual-platform-credentials.refresh_token_label')"
          type="password"
          v-model="form.refresh_token"
          :error="fieldError('secret.refresh_token')"
          :disabled="saving"
          :placeholder="isEdit ? t('web.vtual-platform-credentials.keep_unchanged_placeholder') : ''"
          :toggleable="true"
        />
        <FormInput
          name="expires_at"
          :label="t('web.vtual-platform-credentials.expires_at_label')"
          v-model="form.expires_at"
          :error="fieldError('secret.expires_at')"
          :disabled="saving"
          :placeholder="t('web.vtual-platform-credentials.expires_at_placeholder')"
        />
      </template>

      <div class="d-flex gap-2 mt-3">
        <SubmitButton :label="isEdit ? t('web.vtual-platform-credentials.save_changes') : t('web.vtual-platform-credentials.create_submit')" :loading="saving" variant="primary" />
        <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="router.back()">
          {{ t('actions.cancel') }}
        </button>
      </div>
    </form>
  </Card>
</template>
