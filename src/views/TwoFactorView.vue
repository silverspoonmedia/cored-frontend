<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { post } from '@/api/client'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import { ApiError, type ApiResponse, type TwoFactorSetupPayload } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { user, fetchMe } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

type Status = 'idle' | 'setup' | 'enabled'

const status = ref<Status>('idle')
const setup = ref<TwoFactorSetupPayload | null>(null)
const code = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

const qrInfo = computed(() => {
  if (!setup.value) return null
  const svg = setup.value.qr_code_svg
  return {
    isSvg: svg.startsWith('<svg'),
    content: svg,
  }
})

onMounted(() => {
  if (user.value?.two_factor_enabled) {
    status.value = 'enabled'
  } else {
    status.value = 'idle'
  }
})

async function startSetup(): Promise<void> {
  if (loading.value) return
  loading.value = true
  error.value = null

  try {
    const res = await post<ApiResponse<TwoFactorSetupPayload>>('auth/two-factor/setup')
    if (res.status === 'success' && res.data) {
      setup.value = res.data
      status.value = 'setup'
      code.value = ''
    } else {
      error.value = res.message ?? 'Failed to start setup'
      showError(error.value)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to start setup'
    showError(error.value)
  } finally {
    loading.value = false
  }
}

async function confirmSetup(): Promise<void> {
  if (loading.value || !code.value) return
  loading.value = true
  error.value = null

  try {
    const res = await post<ApiResponse<{ confirmed_at: string }>>('auth/two-factor/confirm', {
      code: code.value,
    })
    if (res.status === 'success') {
      await fetchMe()
      status.value = 'enabled'
      setup.value = null
      code.value = ''
      showSuccess(t('web.auth.two_factor_enabled'))
    } else {
      error.value = res.message ?? 'Failed to confirm setup'
    }
  } catch (e) {
    if (e instanceof ApiError && e.isAuth) {
      error.value = e.message || 'Invalid authentication code'
    } else if (e instanceof ApiError) {
      error.value = e.message
    } else {
      error.value = e instanceof Error ? e.message : 'Failed to confirm setup'
    }
  } finally {
    loading.value = false
  }
}

async function disableTwoFactor(): Promise<void> {
  if (loading.value || !code.value) return
  loading.value = true
  error.value = null

  try {
    const res = await post<ApiResponse<null>>('auth/two-factor/disable', {
      code: code.value,
    })
    if (res.status === 'success') {
      await fetchMe()
      status.value = 'idle'
      code.value = ''
      showSuccess(t('web.auth.two_factor_disabled'))
    } else {
      error.value = res.message ?? 'Failed to disable'
    }
  } catch (e) {
    if (e instanceof ApiError && e.isAuth) {
      error.value = e.message || 'Invalid authentication code'
    } else if (e instanceof ApiError) {
      error.value = e.message
    } else {
      error.value = e instanceof Error ? e.message : 'Failed to disable'
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
      <Card :title="t('web.auth.two_factor_title')">
        <!-- State: idle (not enabled) -->
        <div v-if="status === 'idle'">
          <p class="text-muted">{{ t('web.auth.two_factor_not_enabled') }}</p>
          <p class="text-muted small">
            Add an extra layer of security to your account by requiring a verification code
            from your authenticator app.
          </p>
          <button
            type="button"
            class="btn btn-outline-primary"
            :disabled="loading"
            @click="startSetup"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            {{ t('web.auth.two_factor_setup_button') }}
          </button>
        </div>

        <!-- State: setup in progress -->
        <div v-else-if="status === 'setup' && setup">
          <p class="text-muted">
            Add this account in your authenticator app using the QR code or secret below.
          </p>

          <div class="text-center my-3">
            <div v-if="qrInfo?.isSvg" v-html="qrInfo.content" class="d-inline-block p-2 bg-white rounded"></div>
            <img v-else-if="qrInfo" :src="qrInfo.content" alt="QR code" class="img-fluid p-2 bg-white rounded" style="max-width: 200px;" />
          </div>

          <div class="mb-3">
            <label class="form-label">{{ t('web.auth.two_factor_secret_label') }}</label>
            <p class="fw-bold font-monospace user-select-all">{{ setup.secret }}</p>
          </div>

          <p class="mb-3">
            <a :href="setup.qr_code_url" class="text-decoration-none">
              {{ t('web.auth.two_factor_qr_url_label') }}
            </a>
          </p>

          <div
            v-if="error"
            class="alert alert-danger"
            role="alert"
          >
            {{ error }}
          </div>

          <form @submit.prevent="confirmSetup">
            <FormInput
              name="code"
              type="text"
              :label="t('web.auth.two_factor_code_label')"
              v-model="code"
              placeholder="123456"
              required
              autofocus
              autocomplete="one-time-code"
              :disabled="loading"
            />

            <div class="d-flex gap-2">
              <SubmitButton :label="t('web.auth.two_factor_confirm_button')" :loading="loading" variant="primary" />
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="loading"
                @click="handleCancel"
              >
                {{ t('ui.actions.cancel') }}
              </button>
            </div>
          </form>

          <hr class="my-3">

          <form @submit.prevent="startSetup">
            <SubmitButton :label="t('web.auth.two_factor_restart_setup')" :loading="loading" variant="outline-secondary" />
          </form>
        </div>

        <!-- State: enabled -->
        <div v-else-if="status === 'enabled'">
          <div class="alert alert-success" role="alert">
            <i class="bi bi-check-circle me-1" aria-hidden="true"></i>
            {{ t('web.auth.two_factor_is_enabled') }}
          </div>

          <div
            v-if="error"
            class="alert alert-danger"
            role="alert"
          >
            {{ error }}
          </div>

          <p class="text-muted small mb-3">
            Enter your current authentication code to disable two-factor authentication.
          </p>

          <form @submit.prevent="disableTwoFactor">
            <FormInput
              name="code"
              type="text"
              :label="t('web.auth.two_factor_code_label')"
              v-model="code"
              placeholder="123456"
              required
              autocomplete="one-time-code"
              :disabled="loading"
            />

            <div class="d-flex gap-2">
              <SubmitButton :label="t('web.auth.two_factor_disable_button')" :loading="loading" variant="danger" />
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="loading"
                @click="handleCancel"
              >
                {{ t('ui.actions.cancel') }}
              </button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  </div>
</template>
