<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'

const router = useRouter()
const route = useRoute()
const { verifyTwoFactor } = useAuth()
const { error: showError } = useAlert()

const code = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

const token = computed(() => {
  const t = route.query.token
  return typeof t === 'string' ? t : ''
})

async function handleSubmit(): Promise<void> {
  if (loading.value || !token.value) return

  loading.value = true
  error.value = null

  try {
    await verifyTwoFactor(token.value, code.value)
    router.push({ name: 'dashboard.view' })
  } catch (e) {
    if (e instanceof ApiError && e.isAuth) {
      error.value = e.message || 'Invalid authentication code'
    } else if (e instanceof ApiError) {
      error.value = e.message
    } else {
      error.value = e instanceof Error ? e.message : 'Verification failed'
    }
    showError(error.value)
  } finally {
    loading.value = false
  }
}

function backToLogin(): void {
  router.push({ name: 'login.view' })
}
</script>

<template>
  <div>
    <p class="text-muted small mb-3">
      Enter the 6-digit code from your authenticator app to complete login.
    </p>

    <div
      v-if="error"
      class="alert alert-danger"
      role="alert"
    >
      <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
      {{ error }}
    </div>

    <div v-if="!token" class="alert alert-warning" role="alert">
      No two-factor challenge token found. Please log in again.
    </div>

    <form v-else @submit.prevent="handleSubmit">
      <div class="mb-3">
        <label for="code" class="form-label">
          Authentication code<span class="text-danger">*</span>
        </label>
        <div class="input-group">
          <input
            type="text"
            name="code"
            id="code"
            class="form-control"
            :class="{ 'is-invalid': error }"
            placeholder="123456"
            required
            autofocus
            autocomplete="one-time-code"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="6"
            v-model="code"
            :disabled="loading"
          />
          <span class="input-group-text"><i class="bi bi-shield-lock" aria-hidden="true"></i></span>
        </div>
      </div>

      <div class="d-grid">
        <button type="submit" class="btn btn-primary" :disabled="loading || !code">
          <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          {{ loading ? 'Verifying…' : 'Verify' }}
        </button>
      </div>
    </form>

    <p class="mt-3 mb-0">
      <a href="#" @click.prevent="backToLogin">Back to login</a>
    </p>
  </div>
</template>
