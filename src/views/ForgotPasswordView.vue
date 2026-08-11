<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'

const router = useRouter()
const { forgotPassword } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

const email = ref('')
const loading = ref(false)
const errors = ref<Record<string, string[]>>({})
const sent = ref(false)

async function handleSubmit(): Promise<void> {
  if (loading.value) return

  loading.value = true
  errors.value = {}

  try {
    await forgotPassword(email.value)
    sent.value = true
    showSuccess('If the email exists, a reset link has been sent.')
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (e.errors === null) {
        showError(e.message)
      }
    } else if (e instanceof ApiError) {
      showError(e.message || 'Failed to send reset link')
    } else {
      showError(e instanceof Error ? e.message : 'Failed to send reset link')
    }
  } finally {
    loading.value = false
  }
}

function fieldError(field: string): string | null {
  const list = errors.value[field]
  if (list && list.length > 0) {
    const first: string | undefined = list[0]
    return first ?? null
  }
  return null
}
</script>

<template>
  <div v-if="sent" class="text-center">
    <i class="bi bi-envelope-check fs-1 text-success" aria-hidden="true"></i>
    <p class="mt-3 mb-0">If the email exists, a reset link has been sent.</p>
    <p class="mt-3 mb-0">
      <router-link :to="{ name: 'login.view' }">Back to login</router-link>
    </p>
  </div>

  <form v-else @submit.prevent="handleSubmit">
    <!-- Email -->
    <div class="mb-3">
      <label for="email" class="form-label">
        Email<span class="text-danger">*</span>
      </label>
      <div class="input-group">
        <input
          type="email"
          name="email"
          id="email"
          class="form-control"
          :class="{ 'is-invalid': fieldError('email') }"
          placeholder="Enter your email"
          required
          autofocus
          autocomplete="email"
          v-model="email"
          :disabled="loading"
        />
        <span class="input-group-text"><i class="bi bi-envelope" aria-hidden="true"></i></span>
        <div v-if="fieldError('email')" class="invalid-feedback">
          {{ fieldError('email') }}
        </div>
      </div>
    </div>

    <div class="d-grid">
      <button type="submit" class="btn btn-primary" :disabled="loading">
        <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
        {{ loading ? 'Sending…' : 'Send Reset Link' }}
      </button>
    </div>
  </form>

  <p v-if="!sent" class="mt-3 mb-0">
    <router-link :to="{ name: 'login.view' }">Back to login</router-link>
  </p>
</template>
