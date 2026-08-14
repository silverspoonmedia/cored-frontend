<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { useHcaptcha } from '@/composables/useHcaptcha'
import HcaptchaWidget from '@/components/HcaptchaWidget.vue'
import { ApiError } from '@/api/types'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { login } = useAuth()
const { error: showError } = useAlert()
const { widget, captchaToken, resetCaptcha } = useHcaptcha()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const errors = ref<Record<string, string[]>>({})

function getRedirectTarget(): string {
  const redirect = route.query.redirect
  return typeof redirect === 'string' ? redirect : '/dashboard'
}

async function handleSubmit(): Promise<void> {
  if (loading.value) return

  loading.value = true
  errors.value = {}

  try {
    const captcha = await captchaToken()
    const result = await login(email.value, password.value, rememberMe.value, captcha)
    if (result.type === 'two_factor_challenge') {
      router.push({
        name: 'two-factor.challenge.view',
        query: { token: result.token },
      })
    } else {
      router.push(getRedirectTarget())
    }
  } catch (e) {
    resetCaptcha()
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (e.errors === null) {
        showError(e.message)
      }
    } else if (e instanceof ApiError && e.isAuth) {
      showError(e.message || t('api.auth.invalid_credentials'))
    } else if (e instanceof Error && e.message.toLowerCase().includes('hcaptcha')) {
      showError(t('validation.hcaptcha'))
    } else {
      showError(e instanceof Error ? e.message : t('web.auth.login_failed'))
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

    <div class="mb-3">
      <label for="password" class="form-label">
        {{ t('ui.labels.password') }}<span class="text-danger">*</span>
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
          autocomplete="current-password"
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

    <HcaptchaWidget ref="widget" />
    <div v-if="fieldError('h-captcha-response')" class="invalid-feedback d-block mb-3">
      {{ fieldError('h-captcha-response') }}
    </div>

    <div class="row align-items-center g-2">
      <div class="col-sm-7">
        <div class="form-check">
          <input
            type="checkbox"
            name="remember_me"
            id="remember_me"
            class="form-check-input"
            v-model="rememberMe"
            :disabled="loading"
          />
          <label for="remember_me" class="form-check-label">{{ t('web.auth.remember_me') }}</label>
        </div>
      </div>
      <div class="col-sm-5">
        <div class="d-grid">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            {{ loading ? t('web.auth.signing_in') : t('web.auth.sign_in') }}
          </button>
        </div>
      </div>
    </div>
  </form>

  <p class="mt-3 mb-1">
    <router-link :to="{ name: 'auth.forgot-password.view' }">{{ t('web.auth.forgot_password_link') }}</router-link>
  </p>
  <p class="mb-0">
    {{ t('web.auth.no_account') }} <router-link :to="{ name: 'auth.register.view' }">{{ t('web.auth.register_now') }}</router-link>
  </p>
</template>
