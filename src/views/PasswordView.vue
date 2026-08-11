<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { put } from '@/api/client'
import { useAlert } from '@/composables/useAlert'
import { ApiError, type ApiResponse } from '@/api/types'

const router = useRouter()
const { success: showSuccess, error: showError } = useAlert()

const form = reactive({
  current_password: '',
  password: '',
  password_confirmation: '',
})

const loading = ref(false)
const errors = ref<Record<string, string[]>>({})

function fieldError(field: string): string | null {
  const list = errors.value[field]
  if (list && list.length > 0) {
    const first: string | undefined = list[0]
    return first ?? null
  }
  return null
}

async function handleSubmit(): Promise<void> {
  if (loading.value) return

  loading.value = true
  errors.value = {}

  try {
    await put<ApiResponse<null>>('auth/password', {
      current_password: form.current_password,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })

    showSuccess('Password updated successfully.')
    form.current_password = ''
    form.password = ''
    form.password_confirmation = ''
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (e.errors === null || Object.keys(e.errors ?? {}).length === 0) {
        showError(e.message)
      }
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : 'Failed to update password')
    }
  } finally {
    loading.value = false
  }
}

function handleCancel(): void {
  router.push({ name: 'dashboard.view' })
}
</script>

<template>
  <div class="row">
    <div class="col-lg-6">
      <Card title="Password">
        <form novalidate @submit.prevent="handleSubmit">
          <FormInput
            name="current_password"
            type="password"
            label="Current password"
            v-model="form.current_password"
            :error="fieldError('current_password')"
            autocomplete="current-password"
            required
            :disabled="loading"
          />

          <FormInput
            name="password"
            type="password"
            label="New password"
            v-model="form.password"
            :error="fieldError('password')"
            autocomplete="new-password"
            required
            :disabled="loading"
            hint="Minimum 8 characters with letters and numbers."
          />

          <FormInput
            name="password_confirmation"
            type="password"
            label="Confirm new password"
            v-model="form.password_confirmation"
            :error="fieldError('password_confirmation')"
            autocomplete="new-password"
            required
            :disabled="loading"
          />

          <div class="d-flex gap-2">
            <SubmitButton label="Save" :loading="loading" variant="primary" />
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="loading"
              @click="handleCancel"
            >
              Cancel
            </button>
          </div>
        </form>
      </Card>
    </div>
  </div>
</template>
