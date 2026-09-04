<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useVtualInvites } from '@/composables/vtual/useVtualInvites'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'
import type { VtualManagementInvite } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const invites = useVtualInvites()
const { success: showSuccess, error: showError } = useAlert()

const token = typeof route.query.token === 'string' ? route.query.token : ''
const loading = ref(true)
const responding = ref<'accept' | 'decline' | null>(null)
const invite = ref<VtualManagementInvite | null>(null)
const loadError = ref<string | null>(null)
const done = ref<'accepted' | 'declined' | null>(null)

onMounted(async () => {
  if (!token) {
    loadError.value = t('web.vtual-invites.errors.missing_token')
    loading.value = false
    return
  }
  try {
    invite.value = await invites.fetchInvite(token)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.vtual-invites.errors.load_failed')
  } finally {
    loading.value = false
  }
})

async function respond(kind: 'accept' | 'decline'): Promise<void> {
  if (responding.value) return
  responding.value = kind
  try {
    const updated = kind === 'accept'
      ? await invites.acceptInvite(token)
      : await invites.declineInvite(token)
    done.value = kind === 'accept' ? 'accepted' : 'declined'
    showSuccess(kind === 'accept'
      ? t('api.vtual.management.invite_accepted')
      : t('api.vtual.management.invite_declined'))
    const managementId = updated.management?.id
    if (kind === 'accept' && managementId) {
      await router.push({ name: 'vtual.managements.edit.view', params: { id: managementId } })
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      loadError.value = e.message
      invite.value = null
    } else if (e instanceof ApiError && e.status === 422) {
      loadError.value = e.message
      invite.value = null
    } else {
      showError(e instanceof Error ? e.message : t('web.vtual-invites.errors.respond_failed'))
    }
  } finally {
    responding.value = null
  }
}

function goManagements(): void {
  void router.push({ name: 'vtual.managements.index.view' })
}
</script>

<template>
  <Card :title="t('web.vtual-invites.title')">
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else-if="loadError" class="text-center py-4">
      <i class="bi bi-exclamation-circle display-6 text-danger"></i>
      <p class="mt-3 mb-0">{{ loadError }}</p>
      <button class="btn btn-outline-secondary btn-sm mt-3" @click="goManagements">
        <i class="bi bi-arrow-left me-1"></i> {{ t('web.vtual-invites.back_to_managements') }}
      </button>
    </div>

    <div v-else-if="invite" class="py-3">
      <p class="mb-1">
        {{ t('web.vtual-invites.invited_to', { management: invite.management?.name ?? '' }) }}
      </p>
      <p class="text-muted small mb-3">
        {{ t('web.vtual-invites.role_label') }}:
        <span class="badge text-bg-secondary">{{ t('web.vtual-managements.members.roles.' + invite.role) }}</span>
      </p>
      <p class="text-muted small mb-4">
        {{ t('web.vtual-invites.expires_label') }}: {{ invite.expires_at_formatted ?? invite.expires_at ?? '-' }}
      </p>

      <div class="d-flex gap-2">
        <SubmitButton
          :label="t('web.vtual-invites.accept_button')"
          :loading="responding === 'accept'"
          :disabled="responding !== null"
          variant="primary"
          type="button"
          @click="respond('accept')"
        />
        <button
          type="button"
          class="btn btn-outline-danger"
          :disabled="responding !== null"
          @click="respond('decline')"
        >
          {{ responding === 'decline' ? t('ui.loading') : t('web.vtual-invites.decline_button') }}
        </button>
      </div>
    </div>
  </Card>
</template>
