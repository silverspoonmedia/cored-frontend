<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useNotificationAudiences } from '@/composables/useNotificationAudiences'
import { useAlert } from '@/composables/useAlert'
import { put } from '@/api/client'
import type { ApiResponse, NotificationAudience } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { assignableRoles, loading, load, fetchOne } = useNotificationAudiences()
const { success: showSuccess, error: showError } = useAlert()

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
    showError('Failed to load notification audience')
  }
  fetching.value = false
}

onMounted(async () => {
  await Promise.all([load(), loadAudience()])
})

watch(audienceType, () => {
  if (audienceType.value) loadAudience()
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
      showSuccess('Notification audience updated.')
      router.push({ name: 'notification-audiences.index.view' })
    } else {
      showError(res.message ?? 'Failed to update notification audience')
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update notification audience'
    showError(msg)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Card title="Edit notification audience">
    <div v-if="fetching" class="text-center py-4">
      <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
      Loading…
    </div>

    <template v-else-if="audience">
      <p class="text-muted">
        {{ audience.label || audience.type }}
        <code>{{ audience.type }}</code>
      </p>

      <form novalidate @submit.prevent="handleSubmit">
        <div class="mb-3">
          <label class="form-label">Target roles</label>
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
            Select which roles receive this notification type.
          </small>
        </div>

        <FormCheckbox
          name="notify_subject_user"
          label="Also notify the subject user"
          switch
          v-model="notifySubjectUser"
        />

        <SubmitButton
          label="Save"
          :loading="submitting"
          variant="primary"
        />
      </form>
    </template>

    <div v-else class="text-center py-4 text-muted">
      Notification audience not found.
    </div>
  </Card>
</template>
