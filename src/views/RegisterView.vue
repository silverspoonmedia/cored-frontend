<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { register } = useAuth()
const { error: showError } = useAlert()

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errors = ref<Record<string, string[]>>({})

async function handleSubmit(): Promise<void> {
  if (loading.value) return

  loading.value = true
  errors.value = {}

  try {
    await register(name.value, email.value, password.value, passwordConfirmation.value)
    router.push({ name: 'dashboard.view' })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (e.errors === null) {
        showError(e.message)
      }
    } else if (e instanceof ApiError) {
      showError(e.message || 'Registration failed')
    } else {
      showError(e instanceof Error ? e.message : 'Registration failed')
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
  <form @submit.prevent="handleSubmit">
    <!-- Name -->
    <div class="mb-3">
      <label for="name" class="form-label">
        Name<span class="text-danger">*</span>
      </label>
      <div class="input-group">
        <input
          type="text"
          name="name"
          id="name"
          class="form-control"
          :class="{ 'is-invalid': fieldError('name') }"
          :placeholder="t('web.auth.enter_name')"
          required
          autofocus
          autocomplete="name"
          v-model="name"
          :disabled="loading"
        />
        <span class="input-group-text"><i class="bi bi-person" aria-hidden="true"></i></span>
        <div v-if="fieldError('name')" class="invalid-feedback">
          {{ fieldError('name') }}
        </div>
      </div>
    </div>

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
          :placeholder="t('web.auth.enter_email')"
          required
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

    <!-- Password -->
    <div class="mb-3">
      <label for="password" class="form-label">
        Password<span class="text-danger">*</span>
      </label>
      <div class="input-group">
        <input
          :type="showPassword ? 'text' : 'password'"
          name="password"
          id="password"
          class="form-control"
          :class="{ 'is-invalid': fieldError('password') }"
          :placeholder="t('web.auth.enter_password')"
          required
          autocomplete="new-password"
          v-model="password"
          :disabled="loading"
        />
        <button
          type="button"
          class="input-group-text"
          @click="showPassword = !showPassword"
          :aria-label="showPassword ? t('ui.password.hide') : t('ui.password.show')"
          :aria-pressed="showPassword ? 'true' : 'false'"
        >
          <i :class="showPassword ? 'bi bi-eye' : 'bi bi-eye-slash'" aria-hidden="true"></i>
        </button>
        <span class="input-group-text"><i class="bi bi-lock-fill" aria-hidden="true"></i></span>
        <div v-if="fieldError('password')" class="invalid-feedback">
          {{ fieldError('password') }}
        </div>
      </div>
    </div>

    <!-- Password Confirmation -->
    <div class="mb-3">
      <label for="password_confirmation" class="form-label">
        Confirm Password<span class="text-danger">*</span>
      </label>
      <div class="input-group">
        <input
          :type="showPassword ? 'text' : 'password'"
          name="password_confirmation"
          id="password_confirmation"
          class="form-control"
          :class="{ 'is-invalid': fieldError('password_confirmation') }"
          :placeholder="t('web.auth.re_enter_password')"
          required
          autocomplete="new-password"
          v-model="passwordConfirmation"
          :disabled="loading"
        />
        <span class="input-group-text"><i class="bi bi-lock-fill" aria-hidden="true"></i></span>
        <div v-if="fieldError('password_confirmation')" class="invalid-feedback">
          {{ fieldError('password_confirmation') }}
        </div>
      </div>
    </div>

    <div class="d-grid">
      <button type="submit" class="btn btn-primary" :disabled="loading">
        <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
        {{ loading ? t('web.auth.signing_up') : t('web.auth.sign_up') }}
      </button>
    </div>
  </form>

  <p class="mt-3 mb-0">
    {{ t('web.auth.has_account') }}
    <router-link :to="{ name: 'login.view' }">{{ t('web.auth.sign_in') }}</router-link>
  </p>
</template>
