<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormSelect2 from '@/components/FormSelect2.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useUsers } from '@/composables/useUsers'
import { useActivityLogs } from '@/composables/useActivityLogs'
import { useAlert } from '@/composables/useAlert'
import { ApiError, type ApiResponse, type UserManagement, type ActivityLog } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { fetchOne, fetchAssignableRoles, assignableRoles, createUser, updateUser } = useUsers()
const { forUser } = useActivityLogs()
const { success: showSuccess, error: showError } = useAlert()

const isEdit = computed(() => !!route.params.id)
const userId = computed(() => route.params.id as string | undefined)

const user = ref<UserManagement | null>(null)
const activityLogs = ref<ActivityLog[]>([])
const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const form = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role: '',
})

const roleOptions = computed(() => {
  const opts: Record<string, string> = {}
  for (const r of assignableRoles.value) {
    opts[r.name] = r.name
  }
  return opts
})

function fieldError(field: string): string | null {
  const list = errors.value[field]
  if (list && list.length > 0) {
    const first: string | undefined = list[0]
    return first ?? null
  }
  return null
}

async function load(): Promise<void> {
  loading.value = true
  try {
    await fetchAssignableRoles()
    if (isEdit.value && userId.value) {
      user.value = await fetchOne(userId.value)
      form.name = user.value.name
      form.email = user.value.email
      form.role = user.value.roles[0]?.name ?? ''
      try {
        activityLogs.value = await forUser(userId.value)
      } catch {
        // non-critical
      }
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load user')
  } finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (saving.value) return
  saving.value = true
  errors.value = {}

  const payload: Record<string, unknown> = {
    name: form.name,
    email: form.email,
    role: form.role,
  }

  if (form.password) {
    payload.password = form.password
    payload.password_confirmation = form.password_confirmation
  }

  try {
    if (isEdit.value && userId.value) {
      await updateUser(userId.value, payload)
      showSuccess('User updated successfully.')
    } else {
      await createUser(payload)
      showSuccess('User created successfully.')
    }
    router.push({ name: 'users.index.view' })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (!errors.value || Object.keys(errors.value).length === 0) {
        showError(e.message)
      }
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : 'Failed to save user')
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card :title="isEdit ? 'Edit User' : 'Create User'">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'users.index.view' })">
        <i class="bi bi-arrow-left me-1"></i> Back to List
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <div v-else class="row">
      <div class="col-lg-8">
        <form @submit.prevent="handleSubmit">
          <FormInput
            name="name"
            label="Name"
            v-model="form.name"
            :error="fieldError('name')"
            required
            :disabled="saving"
          />

          <FormInput
            name="email"
            type="email"
            label="Email"
            v-model="form.email"
            :error="fieldError('email')"
            required
            :disabled="saving"
          />

          <FormInput
            name="password"
            type="password"
            label="Password"
            v-model="form.password"
            :error="fieldError('password')"
            autocomplete="new-password"
            :required="!isEdit"
            :disabled="saving"
            :hint="isEdit ? 'Leave blank to keep current password.' : 'Minimum 8 characters.'"
          />

          <FormInput
            name="password_confirmation"
            type="password"
            label="Confirm Password"
            v-model="form.password_confirmation"
            :error="fieldError('password_confirmation')"
            autocomplete="new-password"
            :required="!isEdit"
            :disabled="saving"
          />

          <FormSelect2
            name="role"
            label="Role"
            v-model="form.role"
            :options="roleOptions"
            :error="fieldError('role')"
            placeholder="Select a role"
            required
            :disabled="saving"
          />

          <div class="d-flex gap-2">
            <SubmitButton :label="isEdit ? 'Save Changes' : 'Create User'" :loading="saving" variant="primary" />
            <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="router.push({ name: 'users.index.view' })">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Activity history sidebar (edit only) -->
      <div v-if="isEdit" class="col-lg-4">
        <Card title="Activity History">
          <div v-if="activityLogs.length === 0" class="text-muted small">
            No recent activity.
          </div>
          <ul v-else class="list-unstyled mb-0">
            <li v-for="log in activityLogs.slice(0, 10)" :key="log.id" class="mb-2 pb-2 border-bottom">
              <div class="small fw-medium">{{ log.event_label ?? log.event ?? log.description }}</div>
              <div class="text-muted small">
                {{ log.causer?.name ?? 'System' }} · {{ log.created_at_human ?? log.created_at_formatted ?? '' }}
              </div>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  </Card>
</template>
