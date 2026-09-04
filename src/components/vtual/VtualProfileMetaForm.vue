<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import SubmitButton from '@/components/SubmitButton.vue'

/**
 * Profile meta card (display name / slug / bio / avatar) for VtualProfileShowView.
 * Mutates the reactive `form` object passed from the parent composable.
 */
defineProps<{
  form: { display_name: string; slug: string; bio: string; avatar_url: string }
  saving: boolean
  canMutate: boolean
}>()

const emit = defineEmits<{
  save: []
}>()

const { t } = useI18n()
</script>

<template>
  <div>
    <FormInput
      name="display_name"
      :label="t('web.vtual.profiles.fields.display_name')"
      v-model="form.display_name"
      required
      :disabled="saving"
    />
    <FormInput
      name="slug"
      :label="t('web.vtual.profiles.fields.slug')"
      v-model="form.slug"
      required
      :disabled="saving"
    />
    <FormTextarea
      name="bio"
      :label="t('web.vtual.profiles.fields.bio')"
      v-model="form.bio"
      :disabled="saving"
      :rows="4"
    />
    <FormInput
      name="avatar_url"
      :label="t('web.vtual.profiles.fields.avatar_url')"
      type="url"
      v-model="form.avatar_url"
      :disabled="saving"
    />
    <SubmitButton v-if="canMutate" :loading="saving" :label="t('ui.actions.save')" @click="emit('save')" />
  </div>
</template>
