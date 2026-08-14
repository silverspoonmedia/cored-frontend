<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { useHcaptcha } from '@/composables/useHcaptcha'
import HcaptchaWidget from '@/components/HcaptchaWidget.vue'
import { ApiError } from '@/api/types'

const { t } = useI18n()
const { forgotPassword } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const { widget, captchaToken, resetCaptcha } = useHcaptcha()

const email = ref('')
const loading = ref(false)
const errors = ref<Record<string, string[]>>({})
const sent = ref(false)

async function handleSubmit(): Promise<void> {
  if (loading.value) return

  loading.value = true
  errors.value = {}

  try {
    const captcha = await captchaToken()
    await forgotPassword(email.value, captcha)
    sent.value = true
    showSuccess(t('passwords.sent'))
  } catch (e) {
    resetCaptcha()
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (e.errors === null) {
        showError(e.message)
      }
    } else if (e instanceof ApiError) {
      showError(e.message || t('web.auth.forgot_password_failed'))
    } else if (e instanceof Error && e.message.toLowerCase().includes('hcaptcha')) {
      showError(t('validation.hcaptcha'))
    } else {
      showError(e instanceof Error ? e.message : t('web.auth.forgot_password_failed'))
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
    <p class="mt-3 mb-0">{{ t('web.auth.forgot_password_sent') }}</p>
    <p class="mt-3 mb-0">
      <router-link :to="{ name: 'login.view' }">{{ t('web.auth.back_to_login') }}</router-link>
    </p>
  </div>

  <form v-else @submit.prevent="handleSubmit">
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

    <HcaptchaWidget ref="widget" />
    <div v-if="fieldError('h-captcha-response')" class="invalid-feedback d-block mb-3">
      {{ fieldError('h-captcha-response') }}
    </div>

    <div class="d-grid">
      <button type="submit" class="btn btn-primary" :disabled="loading">
        <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
        {{ loading ? t('web.auth.sending') : t('web.auth.send_reset_link') }}
      </button>
    </div>
  </form>

  <p v-if="!sent" class="mt-3 mb-0">
    <router-link :to="{ name: 'login.view' }">{{ t('web.auth.back_to_login') }}</router-link>
  </p>
</template>
