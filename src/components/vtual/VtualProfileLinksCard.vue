<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import { safeHttpUrl } from '@/utils/safeUrl'
import type { VtualExternalLink } from '@/api/types'

/**
 * External links card for VtualProfileShowView: add/edit form + links table.
 */
const props = defineProps<{
  links: VtualExternalLink[]
  canMutate: boolean
  saving: boolean
  linkForm: { label: string; url: string; kind: string }
  editing: boolean
  linkKindOptions: Array<{ value: string; label: string }>
}>()

const emit = defineEmits<{
  save: []
  edit: [link: VtualExternalLink]
  reset: []
  delete: [id: string]
}>()

const { t } = useI18n()

function externalUrl(value: string | null | undefined): string | null {
  return safeHttpUrl(value)
}

void props
</script>

<template>
  <div>
    <form v-if="canMutate" @submit.prevent="emit('save')" class="row g-2 mb-3 align-items-start">
      <div class="col-md-3">
        <FormInput name="link_label" :label="t('web.vtual.profiles.fields.link_label')" v-model="linkForm.label" required />
      </div>
      <div class="col-md-4">
        <FormInput name="link_url" :label="t('web.vtual.profiles.fields.link_url')" v-model="linkForm.url" required />
      </div>
      <div class="col-md-3">
        <FormSelect name="link_kind" :label="t('web.vtual.profiles.fields.link_kind')" v-model="linkForm.kind" :options="linkKindOptions" />
      </div>
      <div class="col-md-2">
        <div class="mb-3">
          <label class="form-label" aria-hidden="true">
            &nbsp;<span class="text-danger invisible">*</span>
          </label>
          <div class="d-grid gap-2">
            <SubmitButton :loading="saving" :label="editing ? t('ui.actions.update') : t('ui.actions.add')" />
            <button v-if="editing" type="button" class="btn btn-outline-secondary" @click="emit('reset')">{{ t('ui.actions.cancel') }}</button>
          </div>
        </div>
      </div>
    </form>

    <div class="table-responsive">
      <table class="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>{{ t('web.vtual.profiles.fields.link_label') }}</th>
            <th>{{ t('web.vtual.profiles.fields.link_url') }}</th>
            <th>{{ t('web.vtual.profiles.fields.link_kind') }}</th>
            <th v-if="canMutate"></th>
          </tr>
        </thead>
        <tbody>
          <TableEmptyRow
            v-if="links.length === 0"
            :colspan="canMutate ? 4 : 3"
            icon="bi-link-45deg"
            :title="t('web.vtual.profiles.no_links')"
          />
          <tr v-for="link in links" :key="link.id">
            <td class="small">{{ link.label }}</td>
            <td class="small">
              <a v-if="externalUrl(link.url)" :href="externalUrl(link.url) ?? undefined" target="_blank" rel="noopener noreferrer">{{ link.url }}</a>
              <span v-else>{{ link.url }}</span>
            </td>
            <td><span class="badge text-bg-light">{{ link.kind }}</span></td>
            <td v-if="canMutate" class="text-end">
              <button class="btn btn-outline-secondary btn-sm" @click="emit('edit', link)"><i class="bi bi-pencil"></i></button>
              <button
                class="btn btn-outline-danger btn-sm ms-1"
                @click="emit('delete', link.id)"
              ><i class="bi bi-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
