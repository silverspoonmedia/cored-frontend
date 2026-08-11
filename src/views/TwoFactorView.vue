<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { post } from '@/api/client'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import { ApiError, type ApiResponse, type TwoFactorSetupPayload } from '@/api/types'

const router = useRouter()
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
      showSuccess('Two-factor authentication enabled.')
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
      showSuccess('Two-factor authentication disabled.')
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
      <Card title="Two-Factor Authentication">
        <!-- State: idle (not enabled) -->
        <div v-if="status === 'idle'">
          <p class="text-muted">Two-factor authentication is not enabled yet.</p>
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
            Set up two-factor authentication
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
            <label class="form-label">Secret key</label>
            <p class="fw-bold font-monospace user-select-all">{{ setup.secret }}</p>
          </div>

          <p class="mb-3">
            <a :href="setup.qr_code_url" class="text-decoration-none">
              Authenticator URL
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
              label="Authentication code"
              v-model="code"
              placeholder="123456"
              required
              autofocus
              autocomplete="one-time-code"
              :disabled="loading"
            />

            <div class="d-flex gap-2">
              <SubmitButton label="Enable two-factor authentication" :loading="loading" variant="primary" />
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

          <hr class="my-3">

          <form @submit.prevent="startSetup">
            <SubmitButton label="Restart setup" :loading="loading" variant="outline-secondary" />
          </form>
        </div>

        <!-- State: enabled -->
        <div v-else-if="status === 'enabled'">
          <div class="alert alert-success" role="alert">
            <i class="bi bi-check-circle me-1" aria-hidden="true"></i>
            Two-factor authentication is enabled for your account.
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
              label="Authentication code"
              v-model="code"
              placeholder="123456"
              required
              autocomplete="one-time-code"
              :disabled="loading"
            />

            <div class="d-flex gap-2">
              <SubmitButton label="Disable two-factor authentication" :loading="loading" variant="danger" />
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
        </div>
      </Card>
    </div>
  </div>
</template>
