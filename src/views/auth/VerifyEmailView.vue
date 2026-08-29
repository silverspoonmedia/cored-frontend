<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { get } from '@/api/client'
import { ApiError, type ApiResponse } from '@/api/types'
import { useAuth } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { isAuthenticated, fetchMe } = useAuth()

type Phase = 'verifying' | 'success' | 'failed'

const phase = ref<Phase>('verifying')
const message = ref('')

function queryString(name: string): string {
  const value = route.query[name]
  return typeof value === 'string' ? value : ''
}

async function continueAfterVerify(): Promise<void> {
  if (isAuthenticated.value) {
    try {
      await fetchMe()
    } catch {
      // shell user is still usable
    }
    await router.replace({ name: 'dashboard.view' })
    return
  }
  await router.replace({ name: 'login.view' })
}

onMounted(async () => {
  const id = typeof route.params.id === 'string' ? route.params.id : ''
  const hash = typeof route.params.hash === 'string' ? route.params.hash : ''
  const expires = queryString('expires')
  const signature = queryString('signature')

  if (id === '' || hash === '' || expires === '' || signature === '') {
    phase.value = 'failed'
    message.value = t('web.auth.verify_email_failed')
    return
  }

  try {
    const res = await get<ApiResponse<unknown>>(`auth/email/verify/${id}/${hash}`, {
      expires,
      signature,
    })
    phase.value = 'success'
    message.value = res.message || t('api.auth.email_verified')
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) {
      phase.value = 'success'
      message.value = e.message || t('api.auth.email_already_verified')
      return
    }
    phase.value = 'failed'
    message.value = e instanceof ApiError && e.message
      ? e.message
      : t('web.auth.verify_email_failed')
  }
})
</script>

<template>
  <div class="text-center">
    <div v-if="phase === 'verifying'" class="py-3">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('web.auth.verifying') }}</span>
      </div>
      <p class="mt-3 mb-0 text-muted">{{ t('web.auth.verifying') }}</p>
    </div>

    <div v-else-if="phase === 'success'">
      <i class="bi bi-check-circle fs-1 text-success" aria-hidden="true"></i>
      <p class="mt-3 mb-0">{{ message }}</p>
      <p class="mt-3 mb-0">
        <button type="button" class="btn btn-primary" @click="continueAfterVerify">
          {{ t('web.auth.verify_email_continue') }}
        </button>
      </p>
    </div>

    <div v-else>
      <i class="bi bi-x-circle fs-1 text-danger" aria-hidden="true"></i>
      <p class="mt-3 mb-0">{{ message }}</p>
      <p class="mt-3 mb-0">
        <router-link :to="{ name: 'login.view' }">{{ t('web.auth.back_to_login') }}</router-link>
      </p>
    </div>
  </div>
</template>
