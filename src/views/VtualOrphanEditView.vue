<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useVtual } from '@/composables/useVtual'
import { useVtualHydrate } from '@/composables/useVtualHydrate'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'
import type { VtualChannel, VtualPlatform } from '@/api/types'
import { VTUAL_STATUS_BADGE } from '@/utils/statusBadge'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const vtual = useVtual()
const { success: showSuccess, error: showError } = useAlert()

const isEdit = computed(() => !!route.params.id)
const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const form = reactive({
  display_name: '',
  slug: '',
  bio: '',
  avatar_url: '',
})

// Channels
const channels = ref<VtualChannel[]>([])
const platforms = ref<VtualPlatform[]>([])
const channelForm = reactive({ platform_key: '', profile: '' })
const addingChannel = ref(false)

function fieldError(field: string): string | null {
  const list = errors.value[field]
  if (list && list.length > 0) return list[0] ?? null
  return null
}

const { hydrateOrphanEdit } = useVtualHydrate()

async function load(): Promise<void> {
  if (!isEdit.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const id = route.params.id as string
    const batchResult = await hydrateOrphanEdit(id).catch(() => null)

    if (batchResult?.orphan) {
      form.display_name = batchResult.orphan.display_name
      form.slug = batchResult.orphan.slug
      form.bio = batchResult.orphan.bio ?? ''
      form.avatar_url = batchResult.orphan.avatar_url ?? ''
      channels.value = batchResult.channels ?? await vtual.fetchChannels(id)
      platforms.value = batchResult.platforms ?? await vtual.fetchPlatforms()
    } else {
      const [creator, chs, plats] = await Promise.all([
        vtual.fetchOrphan(id),
        vtual.fetchChannels(id),
        vtual.fetchPlatforms(),
      ])
      form.display_name = creator.display_name
      form.slug = creator.slug
      form.bio = creator.bio ?? ''
      form.avatar_url = creator.avatar_url ?? ''
      channels.value = chs
      platforms.value = plats
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-orphans.errors.load_failed'))
  } finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (saving.value) return
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
      await vtual.updateCreator(route.params.id as string, payload)
      showSuccess(t('web.vtual-orphans.ajax.updated'))
    } else {
      await vtual.createOrphan(payload)
      showSuccess(t('web.vtual-orphans.ajax.created'))
    }
    router.push({ name: 'vtual.orphans.index.view' })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
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
  if (!isEdit.value || addingChannel.value) return
  addingChannel.value = true
  try {
    const result = await vtual.addChannel(route.params.id as string, channelForm.platform_key, channelForm.profile)
    if ('token' in result) {
      showError(t('web.vtual-orphans.ajax.channel_claim_started'))
    } else {
      channels.value.push(result)
      showSuccess(t('web.vtual-orphans.ajax.channel_added'))
    }
    channelForm.platform_key = ''
    channelForm.profile = ''
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-orphans.errors.channel_add_failed'))
  } finally {
    addingChannel.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card :title="isEdit ? t('web.vtual-orphans.edit_title') : t('web.vtual-orphans.create_title')">
    <template #actions>
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="router.push({ name: 'vtual.orphans.index.view' })"
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
      <form @submit.prevent="handleSubmit" style="max-width: 600px;">
        <FormInput
          name="display_name"
          :label="t('web.vtual-orphans.form.display_name')"
          v-model="form.display_name"
          :error="fieldError('display_name')"
          required
          :disabled="saving"
          :hint="t('web.vtual-orphans.form.display_name_hint')"
        />
        <FormInput
          v-if="isEdit"
          name="slug"
          :label="t('web.vtual-orphans.form.slug')"
          v-model="form.slug"
          :error="fieldError('slug')"
          :disabled="saving"
          :hint="t('web.vtual-orphans.form.slug_hint')"
        />
        <FormTextarea
          name="bio"
          :label="t('web.vtual-orphans.form.bio')"
          v-model="form.bio"
          :error="fieldError('bio')"
          :disabled="saving"
          :rows="4"
        />
        <FormInput
          name="avatar_url"
          :label="t('web.vtual-orphans.form.avatar_url')"
          type="url"
          v-model="form.avatar_url"
          :error="fieldError('avatar_url')"
          :disabled="saving"
          :placeholder="t('web.vtual-orphans.form.avatar_url_placeholder')"
        />
        <div class="d-flex gap-2">
          <SubmitButton :label="isEdit ? t('web.vtual-orphans.form.submit_update') : t('ui.actions.create')" :loading="saving" variant="primary" />
          <button
            type="button"
            class="btn btn-outline-secondary"
            :disabled="saving"
            @click="router.push({ name: 'vtual.orphans.index.view' })"
          >
            {{ t('ui.actions.cancel') }}
          </button>
        </div>
      </form>

      <!-- Channel management (edit only) -->
      <div v-if="isEdit" class="mt-4">
        <h5>{{ t('web.vtual-orphans.channels.section_title') }}</h5>

        <!-- Add channel form -->
        <form @submit.prevent="handleAddChannel" class="row g-2 mb-3 align-items-end" style="max-width: 600px;">
          <div class="col-md-4">
            <FormSelect
              name="ch_platform"
              :label="t('web.vtual-orphans.channels.platform')"
              v-model="channelForm.platform_key"
              :options="platforms.filter(p => p.enabled).map(p => ({ value: p.key, label: p.name }))"
              required
            />
          </div>
          <div class="col-md-5">
            <FormInput
              name="ch_profile"
              :label="t('web.vtual-orphans.channels.profile_or_id')"
              v-model="channelForm.profile"
              required
            />
          </div>
          <div class="col-md-3">
            <SubmitButton :loading="addingChannel" :label="t('ui.actions.add')" />
          </div>
        </form>

        <!-- Channels table -->
        <div v-if="channels.length === 0" class="text-muted small">{{ t('web.vtual-orphans.channels.empty') }}</div>
        <div v-else class="table-responsive">
          <table class="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th></th>
                <th>{{ t('web.vtual-orphans.channels.platform') }}</th>
                <th>{{ t('web.vtual-orphans.channels.handle_or_id') }}</th>
                <th>{{ t('web.vtual-orphans.channels.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ch in channels" :key="ch.id">
                <td>
                  <img v-if="ch.avatar_url" :src="ch.avatar_url" class="rounded" style="width: 28px; height: 28px;" />
                  <i v-else class="bi bi-person-circle"></i>
                </td>
                <td class="small">{{ ch.platform?.name ?? '—' }}</td>
                <td>
                  <code class="small">{{ ch.handle ?? ch.external_id }}</code>
                  <div v-if="ch.resolve_error" class="text-danger small">{{ ch.resolve_error }}</div>
                </td>
                <td>
                  <StatusBadge :status="ch.status" :mapping="VTUAL_STATUS_BADGE" fallback="light" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Card>
</template>
