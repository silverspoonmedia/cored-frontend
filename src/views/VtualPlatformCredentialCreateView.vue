<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useVtual } from '@/composables/useVtual'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'

const route = useRoute()
const router = useRouter()
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

const typeOptions = [
  { value: 'api_key', label: 'API Key' },
  { value: 'oauth_app', label: 'OAuth App' },
  { value: 'bearer', label: 'Bearer Token' },
]

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
    showError(e instanceof Error ? e.message : 'Failed to load credential')
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
      showSuccess('Credential updated.')
    } else {
      await createCredential(platformId.value!, payload)
      showSuccess('Credential created.')
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
      showError(e instanceof Error ? e.message : 'Failed to save')
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card :title="isEdit ? 'Edit Credential' : 'Create Credential'">
    <template #actions>
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="router.back()"
      >
        <i class="bi bi-arrow-left me-1"></i> Back
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" style="max-width: 600px;">
      <FormInput
        name="label"
        label="Label"
        v-model="form.label"
        :error="fieldError('label')"
        required
        :disabled="saving"
      />
      <FormSelect
        name="type"
        label="Type"
        v-model="form.type"
        :error="fieldError('type')"
        :options="typeOptions"
        :disabled="isEdit || saving"
        hint="Cannot be changed after creation"
      />
      <FormInput
        name="priority"
        label="Priority"
        type="number"
        v-model="form.priority"
        :error="fieldError('priority')"
        :disabled="saving"
      />

      <h6 class="mt-3 mb-2">Secret</h6>

      <template v-if="form.type === 'api_key'">
        <FormInput
          name="api_key"
          label="API Key"
          type="password"
          v-model="form.api_key"
          :error="fieldError('secret.api_key')"
          :disabled="saving"
          :placeholder="isEdit ? 'Leave blank to keep unchanged' : ''"
          :toggleable="true"
        />
      </template>

      <template v-if="form.type === 'oauth_app'">
        <FormInput
          name="client_id"
          label="Client ID"
          v-model="form.client_id"
          :error="fieldError('secret.client_id')"
          :disabled="saving"
          :placeholder="isEdit ? 'Leave blank to keep unchanged' : ''"
        />
        <FormInput
          name="client_secret"
          label="Client Secret"
          type="password"
          v-model="form.client_secret"
          :error="fieldError('secret.client_secret')"
          :disabled="saving"
          :placeholder="isEdit ? 'Leave blank to keep unchanged' : ''"
          :toggleable="true"
        />
      </template>

      <template v-if="form.type === 'bearer'">
        <FormInput
          name="access_token"
          label="Access Token"
          type="password"
          v-model="form.access_token"
          :error="fieldError('secret.access_token')"
          :disabled="saving"
          :placeholder="isEdit ? 'Leave blank to keep unchanged' : ''"
          :toggleable="true"
        />
        <FormInput
          name="refresh_token"
          label="Refresh Token"
          type="password"
          v-model="form.refresh_token"
          :error="fieldError('secret.refresh_token')"
          :disabled="saving"
          :placeholder="isEdit ? 'Leave blank to keep unchanged' : ''"
          :toggleable="true"
        />
        <FormInput
          name="expires_at"
          label="Expires At"
          v-model="form.expires_at"
          :error="fieldError('secret.expires_at')"
          :disabled="saving"
          placeholder="e.g. 2025-12-31T23:59:59Z"
        />
      </template>

      <div class="d-flex gap-2 mt-3">
        <SubmitButton :label="isEdit ? 'Save Changes' : 'Create'" :loading="saving" variant="primary" />
        <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="router.back()">
          Cancel
        </button>
      </div>
    </form>
  </Card>
</template>
