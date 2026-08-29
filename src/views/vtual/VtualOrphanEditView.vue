<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useVtual } from '@/composables/vtual/useVtual'
import { useVtualHydrate } from '@/composables/vtual/useVtualHydrate'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'
import type { VtualChannel, VtualPlatform } from '@/api/types'
import { VTUAL_STATUS_BADGE, type BadgeColor } from '@/utils/statusBadge'
import { safeImageUrl } from '@/utils/safeUrl'

const ORPHAN_CHANNEL_BADGE: Record<string, BadgeColor> = {
  ...VTUAL_STATUS_BADGE,
  disconnected: 'secondary',
}

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const vtual = useVtual()
const { success: showSuccess, error: showError } = useAlert()
const { hydrateOrphanEdit } = useVtualHydrate()

const isEdit = computed(() => typeof route.params.id === 'string' && route.params.id.length > 0)
const orphanId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const loading = ref(isEdit.value)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})
const channelErrors = ref<Record<string, string[]>>({})

const form = reactive({
  display_name: '',
  slug: '',
  bio: '',
  avatar_url: '',
})

const channels = ref<VtualChannel[]>([])
const platforms = ref<VtualPlatform[]>([])
const channelForm = reactive({ platform_key: '', profile: '' })
const addingChannel = ref(false)

const enabledPlatforms = computed(() => platforms.value.filter((platform) => platform.enabled))

const profilePlaceholder = computed(() => {
  if (channelForm.platform_key === 'twitch') {
    return t('web.vtual-orphans.channels.profile_placeholder_twitch')
  }
  return t('web.vtual-orphans.channels.profile_placeholder_youtube')
})

const profileHelp = computed(() => {
  if (channelForm.platform_key === 'twitch') {
    return t('web.vtual-orphans.channels.profile_help_twitch')
  }
  return t('web.vtual-orphans.channels.profile_help_youtube')
})

function imageUrl(value: string | null | undefined): string | null {
  return safeImageUrl(value)
}

function fieldError(bag: Record<string, string[]>, field: string): string | null {
  const list = bag[field]
  if (list && list.length > 0) {
    return list[0] ?? null
  }
  return null
}

function resetForm(): void {
  form.display_name = ''
  form.slug = ''
  form.bio = ''
  form.avatar_url = ''
  channels.value = []
  platforms.value = []
  channelForm.platform_key = ''
  channelForm.profile = ''
  errors.value = {}
  channelErrors.value = {}
}

function applyCreator(creator: { display_name: string; slug: string; bio?: string | null; avatar_url?: string | null }): void {
  form.display_name = creator.display_name
  form.slug = creator.slug
  form.bio = creator.bio ?? ''
  form.avatar_url = creator.avatar_url ?? ''
}

function defaultPlatformKey(): string {
  return enabledPlatforms.value[0]?.key ?? ''
}

function channelStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: t('web.vtual-orphans.channels.status_pending'),
    active: t('web.vtual-orphans.channels.status_active'),
    disconnected: t('web.vtual-orphans.channels.status_disconnected'),
    archived: t('web.vtual-orphans.channels.status_archived'),
  }
  return map[status] ?? status
}

async function load(): Promise<void> {
  if (!isEdit.value) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    const id = orphanId.value
    const batchResult = await hydrateOrphanEdit(id).catch(() => null)

    if (batchResult?.orphan) {
      applyCreator(batchResult.orphan)
      channels.value = batchResult.channels ?? await vtual.fetchChannels(id)
      platforms.value = batchResult.platforms ?? await vtual.fetchPlatforms()
    } else {
      const [creator, chs, plats] = await Promise.all([
        vtual.fetchOrphan(id),
        vtual.fetchChannels(id),
        vtual.fetchPlatforms(),
      ])
      applyCreator(creator)
      channels.value = chs
      platforms.value = plats
    }

    if (!channelForm.platform_key) {
      channelForm.platform_key = defaultPlatformKey()
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-orphans.errors.load_failed'))
  } finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (saving.value) {
    return
  }
  saving.value = true
  errors.value = {}

  const payload: Record<string, unknown> = {
    display_name: form.display_name,
    bio: form.bio || null,
    avatar_url: form.avatar_url || null,
  }
  if (isEdit.value) {
    payload.slug = form.slug
  }

  try {
    if (isEdit.value) {
      await vtual.updateCreator(orphanId.value, payload)
      showSuccess(t('web.vtual-orphans.ajax.updated'))
      return
    }

    const created = await vtual.createOrphan(payload)
    showSuccess(t('web.vtual-orphans.ajax.created'))
    await router.push({ name: 'vtual.orphans.edit.view', params: { id: created.id } })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) {
        showError(e.message)
      }
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.vtual-orphans.errors.save_failed'))
    }
  } finally {
    saving.value = false
  }
}

async function handleAddChannel(): Promise<void> {
  if (!isEdit.value || addingChannel.value) {
    return
  }
  addingChannel.value = true
  channelErrors.value = {}

  try {
    const result = await vtual.addChannel(orphanId.value, channelForm.platform_key, channelForm.profile)
    const row = result as VtualChannel
    if (!row.id) {
      showError(t('web.vtual-orphans.errors.channel_add_failed'))
      return
    }
    if (!channels.value.some((channel) => channel.id === row.id)) {
      channels.value.push(row)
    }
    showSuccess(t('web.vtual-orphans.ajax.channel_added'))
    channelForm.profile = ''
    channelForm.platform_key = defaultPlatformKey()
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      channelErrors.value = e.errors ?? {}
      if (Object.keys(channelErrors.value).length === 0) {
        showError(e.message)
      }
    } else {
      showError(e instanceof Error ? e.message : t('web.vtual-orphans.errors.channel_add_failed'))
    }
  } finally {
    addingChannel.value = false
  }
}

function goIndex(): void {
  void router.push({ name: 'vtual.orphans.index.view' })
}

watch([isEdit, orphanId], () => {
  resetForm()
  void load()
}, { immediate: true })
</script>

<template>
  <Card :title="isEdit ? t('web.vtual-orphans.edit_title') : t('web.vtual-orphans.create_title')">
    <template #actions>
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="goIndex"
      >
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else>
      <form @submit.prevent="handleSubmit">
        <FormInput
          name="display_name"
          :label="t('web.vtual-orphans.form.display_name')"
          v-model="form.display_name"
          :error="fieldError(errors, 'display_name')"
          required
          :disabled="saving"
        />
        <FormInput
          v-if="isEdit"
          name="slug"
          :label="t('web.vtual-orphans.form.slug')"
          v-model="form.slug"
          :error="fieldError(errors, 'slug')"
          :disabled="saving"
          :hint="t('web.vtual-orphans.form.slug_hint')"
        />
        <FormTextarea
          name="bio"
          :label="t('web.vtual-orphans.form.bio')"
          v-model="form.bio"
          :error="fieldError(errors, 'bio')"
          :disabled="saving"
          :rows="4"
        />
        <FormInput
          name="avatar_url"
          :label="t('web.vtual-orphans.form.avatar_url')"
          type="url"
          v-model="form.avatar_url"
          :error="fieldError(errors, 'avatar_url')"
          :disabled="saving"
        />
        <div class="d-flex gap-2">
          <SubmitButton
            :label="isEdit ? t('web.vtual-orphans.form.submit_update') : t('web.vtual-orphans.form.submit_create')"
            :loading="saving"
            variant="primary"
          />
          <button
            type="button"
            class="btn btn-outline-secondary"
            :disabled="saving"
            @click="goIndex"
          >
            {{ t('ui.actions.cancel') }}
          </button>
        </div>
      </form>

      <div v-if="isEdit">
        <hr class="my-4">
        <h5 class="mb-2">{{ t('web.vtual-orphans.channels.section_title') }}</h5>
        <p class="text-muted small mb-3">{{ t('web.vtual-orphans.channels.section_help') }}</p>

        <form
          class="border rounded p-3 mb-3"
          @submit.prevent="handleAddChannel"
        >
          <div class="row g-2 align-items-end">
            <div class="col-md-3">
              <FormSelect
                name="platform_key"
                :label="t('web.vtual-orphans.channels.platform')"
                v-model="channelForm.platform_key"
                :options="enabledPlatforms.map((p) => ({ value: p.key, label: p.name }))"
                :error="fieldError(channelErrors, 'platform_key')"
                required
                :disabled="addingChannel"
              />
            </div>
            <div class="col-md-6">
              <FormInput
                name="profile"
                :label="t('web.vtual-orphans.channels.profile')"
                v-model="channelForm.profile"
                :error="fieldError(channelErrors, 'profile')"
                :placeholder="profilePlaceholder"
                :disabled="addingChannel"
                required
                :maxlength="512"
              />
            </div>
            <div class="col-md-3">
              <label class="form-label invisible" aria-hidden="true">&nbsp;</label>
              <div class="d-grid">
                <SubmitButton
                  :loading="addingChannel"
                  :label="t('web.vtual-orphans.channels.add_button')"
                  size="sm"
                />
              </div>
            </div>
          </div>
          <p class="form-text mb-0 mt-2">{{ profileHelp }}</p>
        </form>

        <div class="table-responsive">
          <table
            class="table table-sm table-hover align-middle mb-0"
            :aria-label="t('web.vtual-orphans.channels.table_caption')"
          >
            <caption class="visually-hidden">{{ t('web.vtual-orphans.channels.table_caption') }}</caption>
            <thead>
              <tr>
                <th>{{ t('web.vtual-orphans.channels.avatar') }}</th>
                <th>{{ t('web.vtual-orphans.channels.platform') }}</th>
                <th>{{ t('web.vtual-orphans.channels.profile_or_id') }}</th>
                <th>{{ t('web.vtual-orphans.channels.handle') }}</th>
                <th>{{ t('web.vtual-orphans.channels.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="channels.length === 0">
                <td colspan="5" class="text-muted">{{ t('web.vtual-orphans.channels.empty') }}</td>
              </tr>
              <tr v-for="ch in channels" :key="ch.id" :data-channel-id="ch.id">
                <td class="text-nowrap">
                  <img
                    v-if="imageUrl(ch.avatar_url)"
                    :src="imageUrl(ch.avatar_url) ?? undefined"
                    :alt="ch.display_name || ch.handle || ''"
                    class="rounded-circle object-fit-cover"
                    width="36"
                    height="36"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  />
                  <span v-else class="text-muted small">—</span>
                </td>
                <td>{{ ch.platform?.name ?? ch.platform?.key ?? '—' }}</td>
                <td>
                  <code class="user-select-all">{{ ch.profile_input || ch.external_id || '' }}</code>
                </td>
                <td>{{ ch.handle || '—' }}</td>
                <td>
                  <StatusBadge
                    :status="ch.status"
                    :label="channelStatusLabel(ch.status)"
                    :mapping="ORPHAN_CHANNEL_BADGE"
                    fallback="secondary"
                  />
                  <div v-if="ch.resolve_error" class="form-text text-danger">{{ ch.resolve_error }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Card>
</template>
