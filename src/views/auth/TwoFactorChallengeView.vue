<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { useHcaptcha } from '@/composables/useHcaptcha'
import HcaptchaWidget from '@/components/auth/HcaptchaWidget.vue'
import { ApiError } from '@/api/types'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { verifyTwoFactor, confirmSession } = useAuth()
const { error: showError } = useAlert()
const { widget, captchaToken, resetCaptcha } = useHcaptcha()

const code = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const errors = ref<Record<string, string[]>>({})

const token = computed(() => {
  const tokenQuery = route.query.token
  return typeof tokenQuery === 'string' ? tokenQuery : ''
})

async function handleSubmit(): Promise<void> {
  if (loading.value || !token.value) return

  loading.value = true
  error.value = null
  errors.value = {}

  try {
    const captcha = await captchaToken()
    await verifyTwoFactor(token.value, code.value, captcha)
    const ok = await confirmSession()
    if (!ok) {
      error.value = t('web.auth.fetch_user_failed')
      return
    }
    router.push({ name: 'dashboard.view' })
  } catch (e) {
    resetCaptcha()
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      error.value = e.message
    } else if (e instanceof ApiError && e.isAuth) {
      error.value = e.message || t('web.auth.two_factor_invalid_code')
    } else if (e instanceof ApiError) {
      error.value = e.message
    } else if (e instanceof Error && e.message.toLowerCase().includes('hcaptcha')) {
      error.value = t('validation.hcaptcha')
    } else {
      error.value = e instanceof Error ? e.message : t('web.auth.two_factor_verification_failed')
    }
    showError(error.value)
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

function backToLogin(): void {
  router.push({ name: 'login.view' })
}
</script>

<template>
  <div>
    <p class="text-muted small mb-3">
      {{ t('web.auth.two_factor_challenge_help') }}
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
      {{ t('web.auth.two_factor_no_token') }}
    </div>

    <form v-else @submit.prevent="handleSubmit">
      <div class="mb-3">
        <label for="code" class="form-label">
          {{ t('web.auth.two_factor_code_label') }}<span class="text-danger">*</span>
        </label>
        <div class="input-group">
          <input
            type="text"
            name="code"
            id="code"
            class="form-control"
            :class="{ 'is-invalid': !!error }"
            :placeholder="t('web.auth.two_factor_code_placeholder')"
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

      <HcaptchaWidget ref="widget" />
      <div v-if="fieldError('h-captcha-response')" class="invalid-feedback d-block mb-3">
        {{ fieldError('h-captcha-response') }}
      </div>

      <div class="d-grid">
        <button type="submit" class="btn btn-primary" :disabled="loading || !code">
          <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          {{ loading ? t('web.auth.verifying') : t('web.auth.verify_two_factor') }}
        </button>
      </div>
    </form>

    <p class="mt-3 mb-0">
      <a href="#" @click.prevent="backToLogin">{{ t('web.auth.back_to_login') }}</a>
    </p>
  </div>
</template>
