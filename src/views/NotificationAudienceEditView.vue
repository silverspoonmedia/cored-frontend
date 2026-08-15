<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useNotificationAudiences } from '@/composables/useNotificationAudiences'
import { useNotificationsHydrate } from '@/composables/useNotificationsHydrate'
import { useAlert } from '@/composables/useAlert'
import { put } from '@/api/client'
import type { ApiResponse, NotificationAudience } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { assignableRoles, loading, load, fetchOne } = useNotificationAudiences()
const { hydrateAudienceEdit } = useNotificationsHydrate()
const { success: showSuccess, error: showError } = useAlert()
const { t } = useI18n()

const audienceType = computed(() => route.params.type as string)

const audience = ref<NotificationAudience | null>(null)
const fetching = ref(true)
const submitting = ref(false)
const errors = ref<Record<string, string[]>>({})

const selectedRoles = ref<string[]>([])
const notifySubjectUser = ref(false)

async function loadAudience(): Promise<void> {
  fetching.value = true
  const data = await fetchOne(audienceType.value)
  if (data) {
    audience.value = data
    selectedRoles.value = [...data.roles]
    notifySubjectUser.value = data.notify_subject_user
  } else {
    showError(t('web.notification-audiences.failed_load'))
  }
  fetching.value = false
}

onMounted(async () => {
  const batchResult = await hydrateAudienceEdit(audienceType.value).catch(() => null)
  if (batchResult) {
    if (batchResult.audience) {
      audience.value = batchResult.audience
      selectedRoles.value = [...batchResult.audience.roles]
      notifySubjectUser.value = batchResult.audience.notify_subject_user
    }
    if (batchResult.assignableRoles) {
      assignableRoles.value = batchResult.assignableRoles
    }
  }
  if (!audience.value) await loadAudience()
  if (assignableRoles.value.length === 0) await load()
  fetching.value = false
})

watch(audienceType, async () => {
  if (!audienceType.value) return
  const batchResult = await hydrateAudienceEdit(audienceType.value).catch(() => null)
  if (batchResult?.audience) {
    audience.value = batchResult.audience
    selectedRoles.value = [...batchResult.audience.roles]
    notifySubjectUser.value = batchResult.audience.notify_subject_user
  } else {
    await loadAudience()
  }
})

function toggleRole(roleName: string, checked: boolean): void {
  if (checked) {
    if (!selectedRoles.value.includes(roleName)) {
      selectedRoles.value = [...selectedRoles.value, roleName]
    }
  } else {
    selectedRoles.value = selectedRoles.value.filter((r) => r !== roleName)
  }
}

function isRoleSelected(roleName: string): boolean {
  return selectedRoles.value.includes(roleName)
}

async function handleSubmit(): Promise<void> {
  if (submitting.value) return
  submitting.value = true
  errors.value = {}

  try {
    const res = await put<ApiResponse<NotificationAudience>>(
      `admin/notification-audiences/${audienceType.value}`,
      {
        notify_subject_user: notifySubjectUser.value,
        roles: selectedRoles.value,
        users: [],
      },
    )

    if (res.status === 'success' && res.data) {
      audience.value = res.data
      selectedRoles.value = [...res.data.roles]
      notifySubjectUser.value = res.data.notify_subject_user
      showSuccess(t('web.notification-audiences.updated'))
      router.push({ name: 'notification-audiences.index.view' })
    } else {
      showError(res.message ?? t('web.notification-audiences.failed_update'))
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('web.notification-audiences.failed_update')
    showError(msg)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Card :title="t('web.notification-audiences.edit_title')">
    <div v-if="fetching" class="text-center py-4">
      <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
      {{ t('web.notification-audiences.loading') }}
    </div>

    <template v-else-if="audience">
      <p class="text-muted">
        {{ audience.label || audience.type }}
        <code>{{ audience.type }}</code>
      </p>

      <form novalidate @submit.prevent="handleSubmit">
        <div class="mb-3">
          <label class="form-label">{{ t('web.notification-audiences.target_roles_label') }}</label>
          <div class="d-flex flex-column gap-2">
            <div
              v-for="role in assignableRoles"
              :key="role.id"
              class="form-check"
            >
              <input
                type="checkbox"
                class="form-check-input"
                :id="`role-${role.id}`"
                :value="role.name"
                :checked="isRoleSelected(role.name)"
                @change="toggleRole(role.name, ($event.target as HTMLInputElement).checked)"
              />
              <label class="form-check-label" :for="`role-${role.id}`">
                {{ role.name }}
              </label>
            </div>
          </div>
          <small class="form-text text-muted">
            {{ t('web.notification-audiences.select_roles_hint') }}
          </small>
        </div>

        <FormCheckbox
          name="notify_subject_user"
          :label="t('web.notification-audiences.notify_subject_user_label')"
          switch
          v-model="notifySubjectUser"
        />

        <SubmitButton
          :label="t('ui.actions.save')"
          :loading="submitting"
          variant="primary"
        />
      </form>
    </template>

    <div v-else class="text-center py-4 text-muted">
      {{ t('web.notification-audiences.not_found') }}
    </div>
  </Card>
</template>
