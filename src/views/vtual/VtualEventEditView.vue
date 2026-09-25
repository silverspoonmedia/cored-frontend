<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import FormSelect from '@/components/FormSelect.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useVtualEventEdit } from '@/composables/vtual/useVtualEventEdit'
import { useBreadcrumbTitle } from '@/composables/useBreadcrumbs'

const { t } = useI18n()

const {
  isEdit,
  loading,
  saving,
  errors,
  form,
  managementOptions,
  fieldError,
  handleSubmit,
  goIndex,
} = useVtualEventEdit()

// Trailing breadcrumb crumb: the edited event's title, so the crumb reads
// `Events / Edit / <title>` instead of exposing the uuid route param. Gated on
// `isEdit` — create holds no record and keeps the static trail.
useBreadcrumbTitle(() => (isEdit.value ? form.title : null))
</script>

<template>
  <Card :title="isEdit ? t('web.vtual-events.edit_title') : t('web.vtual-events.create_title')">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="goIndex">
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
        <FormSelect
          name="management_id"
          :label="t('web.vtual-events.form.management')"
          v-model="form.management_id"
          :options="managementOptions"
          :error="fieldError(errors, 'management_id')"
          :disabled="saving || isEdit"
          required
        />
        <FormInput
          name="title"
          :label="t('web.vtual-events.form.title')"
          v-model="form.title"
          :error="fieldError(errors, 'title')"
          required
          :disabled="saving"
        />
        <FormTextarea
          name="description"
          :label="t('web.vtual-events.form.description')"
          v-model="form.description"
          :error="fieldError(errors, 'description')"
          :disabled="saving"
          :rows="4"
        />
        <FormInput
          name="starts_at"
          :label="t('web.vtual-events.form.starts_at')"
          type="datetime-local"
          v-model="form.starts_at"
          :error="fieldError(errors, 'starts_at')"
          required
          :disabled="saving"
        />
        <FormInput
          name="ends_at"
          :label="t('web.vtual-events.form.ends_at')"
          type="datetime-local"
          v-model="form.ends_at"
          :error="fieldError(errors, 'ends_at')"
          :disabled="saving"
        />
        <FormInput
          name="timezone"
          :label="t('web.vtual-events.form.timezone')"
          v-model="form.timezone"
          :error="fieldError(errors, 'timezone')"
          :disabled="saving"
          :hint="t('web.vtual-events.form.timezone_hint')"
        />
        <FormInput
          name="thumbnail_url"
          :label="t('web.vtual-events.form.thumbnail_url')"
          type="url"
          v-model="form.thumbnail_url"
          :error="fieldError(errors, 'thumbnail_url')"
          :disabled="saving"
        />
        <FormInput
          name="url"
          :label="t('web.vtual-events.form.url')"
          type="url"
          v-model="form.url"
          :error="fieldError(errors, 'url')"
          :disabled="saving"
        />
        <FormCheckbox
          name="is_featured"
          :label="t('web.vtual-events.form.is_featured')"
          v-model="form.is_featured"
          :disabled="saving"
        />
        <div class="d-flex gap-2">
          <SubmitButton
            :label="isEdit ? t('web.vtual-events.form.submit_update') : t('web.vtual-events.form.submit_create')"
            :loading="saving"
            variant="primary"
          />
          <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="goIndex">
            {{ t('ui.actions.cancel') }}
          </button>
        </div>
      </form>
    </div>
  </Card>
</template>
