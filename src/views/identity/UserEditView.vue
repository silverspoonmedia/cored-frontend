<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
// select2 pulls jQuery — load async so non-form views never download it.
const FormSelect2 = defineAsyncComponent(() => import('@/components/FormSelect2.vue'))
import SubmitButton from '@/components/SubmitButton.vue'
import { useUsers } from '@/composables/identity/useUsers'
import { useActivityLogs } from '@/composables/activity-log/useActivityLogs'
import { useUsersHydrate } from '@/composables/identity/useUsersHydrate'
import { useAlert } from '@/composables/useAlert'
import { useAdminRealtime } from '@/composables/useAdminRealtime'
import { useBreadcrumbTitle } from '@/composables/useBreadcrumbs'
import { useEchoResync } from '@/composables/useEcho'
import { ApiError, type ApiResponse, type UserManagement, type ActivityLog } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne, fetchAssignableRoles, assignableRoles, createUser, updateUser } = useUsers()
const { forUser } = useActivityLogs()
const { hydrateUserEdit } = useUsersHydrate()
const { success: showSuccess, error: showError } = useAlert()

const isEdit = computed(() => !!route.params.id)
const userId = computed(() => route.params.id as string | undefined)

const user = ref<UserManagement | null>(null)
const activityLogs = ref<ActivityLog[]>([])
const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

// Trailing breadcrumb crumb: the loaded record's name, so the crumb reads
// `Users / Edit / <name>` instead of exposing the uuid route param.
useBreadcrumbTitle(() => user.value?.name ?? null)

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
    if (isEdit.value && userId.value) {
      const batchResult = await hydrateUserEdit(userId.value).catch(() => null)
      if (batchResult) {
        if (batchResult.user) {
          user.value = batchResult.user
          form.name = batchResult.user.name
          form.email = batchResult.user.email
          form.role = batchResult.user.roles[0]?.name ?? ''
        }
        if (batchResult.assignableRoles) {
          assignableRoles.value = batchResult.assignableRoles
        }
        if (batchResult.activityLogs) {
          activityLogs.value = batchResult.activityLogs
        }
      }
      if (!user.value) {
        user.value = await fetchOne(userId.value)
        form.name = user.value.name
        form.email = user.value.email
        form.role = user.value.roles[0]?.name ?? ''
      }
      if (assignableRoles.value.length === 0) {
        await fetchAssignableRoles()
      }
      if (activityLogs.value.length === 0) {
        try {
          activityLogs.value = await forUser(userId.value)
        } catch {
          // non-critical
        }
      }
    } else {
      await fetchAssignableRoles()
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.users.load_failed'))
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
      showSuccess(t('api.users.updated'))
    } else {
      await createUser(payload)
      showSuccess(t('api.users.created'))
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
      showError(e instanceof Error ? e.message : t('web.users.save_failed'))
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)

// Live update: RBAC list changes (e.g. another admin edits this user) reload
// the record so the form reflects fresh data.
const { subscribe: subscribeAdmin, unsubscribe: unsubscribeAdmin } = useAdminRealtime()
const adminHandlers = {
  onUserListChanged: (e: { action: string; user_id: string | null }) => {
    if (isEdit.value && userId.value && e.user_id === userId.value) {
      void load()
    }
  },
}

// Socket-outage recovery: reload the record when in edit mode.
useEchoResync(() => { if (isEdit.value) { void load() } })

onMounted(() => {
  subscribeAdmin(adminHandlers)
})

onUnmounted(() => {
  unsubscribeAdmin(adminHandlers)
})
</script>

<template>
  <Card :title="isEdit ? t('web.users.edit_title') : t('web.users.create_title')">
    <template #actions>
      <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'users.index.view' }">
        <i class="bi bi-arrow-left me-1"></i> {{ t('web.users.back_to_list') }}
      </router-link>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else class="row">
      <div :class="isEdit ? 'col-lg-8' : 'col-12'">
        <form @submit.prevent="handleSubmit">
          <FormInput
            name="name"
            :label="t('web.users.form.name_label')"
            v-model="form.name"
            :error="fieldError('name')"
            required
            :disabled="saving"
          />

          <FormInput
            name="email"
            type="email"
            :label="t('web.users.form.email_label')"
            v-model="form.email"
            :error="fieldError('email')"
            required
            :disabled="saving"
          />

          <FormInput
            name="password"
            type="password"
            :label="t('web.users.form.password_label')"
            v-model="form.password"
            :error="fieldError('password')"
            autocomplete="new-password"
            :required="!isEdit"
            :disabled="saving"
            :hint="isEdit ? t('web.users.form.password_hint_edit') : t('web.users.form.password_hint_create')"
          />

          <FormInput
            name="password_confirmation"
            type="password"
            :label="t('web.users.form.password_confirm')"
            v-model="form.password_confirmation"
            :error="fieldError('password_confirmation')"
            autocomplete="new-password"
            :required="!isEdit"
            :disabled="saving"
          />

          <FormSelect2
            name="role"
            :label="t('ui.labels.role')"
            v-model="form.role"
            :options="roleOptions"
            :error="fieldError('role')"
            :placeholder="t('web.users.form.role_placeholder')"
            required
            :disabled="saving"
          />

          <div class="d-flex gap-2">
            <SubmitButton :label="isEdit ? t('web.users.save_changes') : t('web.users.create_submit')" :loading="saving" variant="primary" />
            <router-link
              class="btn btn-outline-secondary"
              :class="{ disabled: saving }"
              :to="{ name: 'users.index.view' }"
              :aria-disabled="saving ? 'true' : undefined"
              :tabindex="saving ? -1 : undefined"
            >
              {{ t('actions.cancel') }}
            </router-link>
          </div>
        </form>
      </div>

      <!-- Activity history sidebar (edit only) -->
      <div v-if="isEdit" class="col-lg-4">
        <Card :title="t('web.users.activity_history_title')">
          <div v-if="activityLogs.length === 0" class="text-muted small">
            {{ t('web.users.no_recent_activity') }}
          </div>
          <ul v-else class="list-unstyled mb-0">
            <li v-for="log in activityLogs.slice(0, 10)" :key="log.id" class="mb-2 pb-2 border-bottom">
              <div class="small fw-medium">{{ log.event_label ?? log.event ?? log.description }}</div>
              <div class="text-muted small">
                {{ log.causer?.name ?? t('web.users.system_actor') }} · {{ log.created_at_human ?? log.created_at_formatted ?? '' }}
              </div>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  </Card>
</template>
