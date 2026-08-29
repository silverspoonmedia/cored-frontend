<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { useHcaptcha } from '@/composables/useHcaptcha'
import HcaptchaWidget from '@/components/auth/HcaptchaWidget.vue'
import { ApiError } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { resetPassword } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const { widget, captchaToken, resetCaptcha } = useHcaptcha()

const token = ref((route.query.token as string) ?? '')
const email = ref((route.query.email as string) ?? '')
const password = ref('')
const passwordConfirmation = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errors = ref<Record<string, string[]>>({})
const done = ref(false)

async function handleSubmit(): Promise<void> {
  if (loading.value) return

  loading.value = true
  errors.value = {}

  try {
    const captcha = await captchaToken()
    await resetPassword(token.value, email.value, password.value, passwordConfirmation.value, captcha)
    done.value = true
    showSuccess(t('passwords.reset'))
  } catch (e) {
    resetCaptcha()
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (e.errors === null) {
        showError(e.message)
      }
    } else if (e instanceof ApiError) {
      showError(e.message || t('web.auth.reset_password_failed'))
    } else if (e instanceof Error && e.message.toLowerCase().includes('hcaptcha')) {
      showError(t('validation.hcaptcha'))
    } else {
      showError(e instanceof Error ? e.message : t('web.auth.reset_password_failed'))
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
  <div v-if="done" class="text-center">
    <i class="bi bi-check-circle fs-1 text-success" aria-hidden="true"></i>
    <p class="mt-3 mb-0">{{ t('passwords.reset') }}</p>
    <p class="mt-3 mb-0">
      <router-link :to="{ name: 'login.view' }">{{ t('web.auth.sign_in') }}</router-link>
    </p>
  </div>

  <form v-else @submit.prevent="handleSubmit">
    <!-- Email -->
    <div class="mb-3">
      <label for="email" class="form-label">
        {{ t('ui.labels.email') }}<span class="text-danger">*</span>
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
        {{ t('web.auth.new_password_placeholder') }}<span class="text-danger">*</span>
      </label>
      <div class="input-group">
        <input
          :type="showPassword ? 'text' : 'password'"
          name="password"
          id="password"
          class="form-control"
          :class="{ 'is-invalid': fieldError('password') }"
          :placeholder="t('web.auth.enter_new_password')"
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
        {{ t('web.auth.password_confirm_label') }}<span class="text-danger">*</span>
      </label>
      <div class="input-group">
        <input
          :type="showPassword ? 'text' : 'password'"
          name="password_confirmation"
          id="password_confirmation"
          class="form-control"
          :class="{ 'is-invalid': fieldError('password_confirmation') }"
          :placeholder="t('web.auth.re_enter_new_password')"
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

    <HcaptchaWidget ref="widget" />
    <div v-if="fieldError('h-captcha-response')" class="invalid-feedback d-block mb-3">
      {{ fieldError('h-captcha-response') }}
    </div>

    <div class="d-grid">
      <button type="submit" class="btn btn-primary" :disabled="loading">
        <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
        {{ loading ? t('web.auth.resetting') : t('web.auth.reset_password_submit') }}
      </button>
    </div>
  </form>

  <p v-if="!done" class="mt-3 mb-0">
    <router-link :to="{ name: 'login.view' }">{{ t('web.auth.back_to_login') }}</router-link>
  </p>
</template>
