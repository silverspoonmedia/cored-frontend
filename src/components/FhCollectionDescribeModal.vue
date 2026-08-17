<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/Modal.vue'
import { confirmDialog } from '@/lib/swal'
import type { FhFolder, MicrostockBillingSummary } from '@/api/types'
import {
  HINT_MAX_LENGTH,
  PRIMARY_CONCEPT_MIN,
  analysisEstimateUsd,
  composeCollectionHint,
  emptyDescribeSections,
  i18nOptionMap,
  isBlindDescribe,
  validateCollectionDescribe,
  type DescribeSections,
} from '@/utils/fhCollectionDescribe'

const open = defineModel<boolean>({ default: false })

const props = defineProps<{
  folder: FhFolder | null
  fileCount: number
  billing: MicrostockBillingSummary | null
  locking?: boolean
}>()

const emit = defineEmits<{
  lock: [payload: { hint: string | null; billingMode: string | null }]
}>()

const { t, tm } = useI18n()

const sections = reactive<DescribeSections>(emptyDescribeSections())
const errors = ref<string[]>([])

const visibleOptions = computed(() => i18nOptionMap(tm('web.file-hosting.microstock.describe_visible_options')))
const intentOptions = computed(() => i18nOptionMap(tm('web.file-hosting.microstock.describe_intent_options')))
const styleOptions = computed(() => i18nOptionMap(tm('web.file-hosting.microstock.describe_style_options')))

const dailyFreeEnabled = computed(() => !!props.billing?.daily_free?.enabled)

const composedHint = computed(() => composeCollectionHint(sections, {
  visible: visibleOptions.value,
  intent: intentOptions.value,
  style: styleOptions.value,
}))

const charCount = computed(() => composedHint.value.length)

const billingLine = computed(() => {
  const b = props.billing
  if (!b) return ''
  return t('web.file-hosting.microstock.billing_line', {
    balance: b.balance_usd,
    estimate: b.estimated_per_analysis_usd,
    total: analysisEstimateUsd(props.fileCount, b.estimated_per_analysis_micro_usd),
  })
})

const dailyFreeLine = computed(() => {
  const d = props.billing?.daily_free
  if (!d?.enabled) return ''
  return t('web.file-hosting.microstock.daily_free_line', {
    remaining: d.remaining,
    limit: d.limit,
  })
})

watch(open, (visible) => {
  if (!visible) return
  Object.assign(sections, emptyDescribeSections())
  errors.value = []
})

function toggle(list: string[], key: string): void {
  const idx = list.indexOf(key)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(key)
}

function hasError(key: string): boolean {
  return errors.value.includes(key)
}

async function submit(): Promise<void> {
  const result = validateCollectionDescribe(sections, { dailyFreeEnabled: dailyFreeEnabled.value })
  if (charCount.value > HINT_MAX_LENGTH) {
    result.errors.push('tooLong')
    result.valid = false
  }
  errors.value = result.errors
  if (!result.valid) return

  if (isBlindDescribe(sections) && !(await confirmDialog({ text: t('web.file-hosting.microstock.describe_warning_blind') }))) {
    return
  }

  emit('lock', {
    hint: composedHint.value || null,
    billingMode: sections.billingMode || null,
  })
}
</script>

<template>
  <Modal
    v-model="open"
    :title="t('web.file-hosting.microstock.describe_title')"
    size="lg"
    scrollable
  >
    <p v-if="folder" class="text-muted small mb-1">
      {{ t('web.file-hosting.lock_collection_folder', { name: folder.name }) }}
    </p>
    <p class="small text-muted mb-1">{{ t('web.file-hosting.microstock.describe_hint') }}</p>
    <p class="small text-muted mb-3">{{ t('web.file-hosting.microstock.describe_sections_intro') }}</p>

    <div class="mb-3">
      <label class="form-label" for="fh-describe-primary">{{ t('web.file-hosting.microstock.describe_primary_concept') }}</label>
      <textarea
        id="fh-describe-primary"
        v-model="sections.primaryConcept"
        class="form-control"
        :class="{ 'is-invalid': hasError('primaryConcept') }"
        rows="3"
        :placeholder="t('web.file-hosting.microstock.describe_primary_placeholder')"
      ></textarea>
      <div class="invalid-feedback">
        {{ t('web.file-hosting.microstock.describe_validation_primary', { min: PRIMARY_CONCEPT_MIN }) }}
      </div>
    </div>

    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label d-block small">{{ t('web.file-hosting.microstock.describe_visible_facts') }}</label>
        <div class="d-flex flex-wrap gap-1 mb-2">
          <template v-for="(label, key) in visibleOptions" :key="'v-' + key">
            <input
              :id="'fh-describe-visible-' + key"
              class="btn-check"
              type="checkbox"
              :checked="sections.visibleSelected.includes(key)"
              autocomplete="off"
              @change="toggle(sections.visibleSelected, key)"
            />
            <label class="btn btn-outline-secondary btn-sm" :for="'fh-describe-visible-' + key">{{ label }}</label>
          </template>
        </div>
        <input
          v-model="sections.visibleOther"
          type="text"
          class="form-control form-control-sm"
          :class="{ 'is-invalid': hasError('visible') }"
          :placeholder="t('web.file-hosting.microstock.describe_other_placeholder')"
        />
        <div class="invalid-feedback">{{ t('web.file-hosting.microstock.describe_validation_visible') }}</div>
      </div>
      <div class="col-md-6">
        <label class="form-label d-block small">{{ t('web.file-hosting.microstock.describe_buyer_intent') }}</label>
        <div class="d-flex flex-wrap gap-1 mb-2">
          <template v-for="(label, key) in intentOptions" :key="'i-' + key">
            <input
              :id="'fh-describe-intent-' + key"
              class="btn-check"
              type="checkbox"
              :checked="sections.intentSelected.includes(key)"
              autocomplete="off"
              @change="toggle(sections.intentSelected, key)"
            />
            <label class="btn btn-outline-secondary btn-sm" :for="'fh-describe-intent-' + key">{{ label }}</label>
          </template>
        </div>
        <input
          v-model="sections.intentOther"
          type="text"
          class="form-control form-control-sm"
          :class="{ 'is-invalid': hasError('intent') }"
          :placeholder="t('web.file-hosting.microstock.describe_other_placeholder')"
        />
        <div class="invalid-feedback">{{ t('web.file-hosting.microstock.describe_validation_intent') }}</div>
      </div>
    </div>

    <div class="mt-3">
      <label class="form-label d-block small">{{ t('web.file-hosting.microstock.describe_style_mood') }}</label>
      <div class="d-flex flex-wrap gap-1 mb-2">
        <template v-for="(label, key) in styleOptions" :key="'s-' + key">
          <input
            :id="'fh-describe-style-' + key"
            class="btn-check"
            type="checkbox"
            :checked="sections.styleSelected.includes(key)"
            autocomplete="off"
            @change="toggle(sections.styleSelected, key)"
          />
          <label class="btn btn-outline-secondary btn-sm" :for="'fh-describe-style-' + key">{{ label }}</label>
        </template>
      </div>
      <input
        v-model="sections.styleOther"
        type="text"
        class="form-control form-control-sm"
        :class="{ 'is-invalid': hasError('style') }"
        :placeholder="t('web.file-hosting.microstock.describe_other_placeholder')"
      />
      <div class="invalid-feedback">{{ t('web.file-hosting.microstock.describe_validation_style') }}</div>
    </div>

    <div class="mt-3 mb-3">
      <label class="form-label" for="fh-describe-notes">{{ t('web.file-hosting.microstock.describe_additional_notes') }}</label>
      <textarea
        id="fh-describe-notes"
        v-model="sections.additionalNotes"
        class="form-control"
        rows="2"
        :placeholder="t('web.file-hosting.microstock.describe_additional_placeholder')"
      ></textarea>
    </div>

    <div v-if="dailyFreeEnabled" class="mb-3" :class="{ 'is-invalid': hasError('billingMode') }">
      <label class="form-label">{{ t('web.file-hosting.microstock.describe_billing_mode_label') }}</label>
      <p class="small text-muted mb-2">{{ t('web.file-hosting.microstock.describe_billing_mode_hint') }}</p>
      <div class="d-flex gap-3">
        <div class="form-check">
          <input id="fh-describe-billing-free" v-model="sections.billingMode" class="form-check-input" type="radio" value="free" />
          <label class="form-check-label" for="fh-describe-billing-free">{{ t('web.file-hosting.microstock.describe_billing_mode_free') }}</label>
        </div>
        <div class="form-check">
          <input id="fh-describe-billing-paid" v-model="sections.billingMode" class="form-check-input" type="radio" value="paid" />
          <label class="form-check-label" for="fh-describe-billing-paid">{{ t('web.file-hosting.microstock.describe_billing_mode_paid') }}</label>
        </div>
      </div>
      <div v-if="hasError('billingMode')" class="invalid-feedback d-block">
        {{ t('web.file-hosting.microstock.describe_validation_billing_mode') }}
      </div>
    </div>

    <details class="mb-2">
      <summary class="small text-muted">{{ t('web.file-hosting.microstock.describe_preview') }}</summary>
      <pre class="small mb-0 mt-2 text-wrap" style="white-space: pre-wrap;">{{ composedHint || '—' }}</pre>
    </details>
    <div v-if="hasError('tooLong')" class="text-danger small">
      {{ t('web.file-hosting.microstock.describe_validation_too_long') }}
    </div>
    <div class="small text-muted">{{ t('web.file-hosting.microstock.describe_char_count', { count: charCount, max: HINT_MAX_LENGTH }) }}</div>
    <div v-if="billingLine" class="small text-muted mt-2">{{ billingLine }}</div>
    <div v-if="dailyFreeLine" class="small text-muted">{{ dailyFreeLine }}</div>

    <template #footer>
      <button type="button" class="btn btn-outline-secondary" @click="open = false">{{ t('web.file-hosting.cancel') }}</button>
      <button type="button" class="btn btn-success" :disabled="locking" @click="submit">
        <span v-if="locking" class="spinner-border spinner-border-sm me-1"></span>
        <i v-else class="bi bi-lock-fill me-1"></i>
        {{ t('web.file-hosting.microstock.describe_submit') }}
      </button>
    </template>
  </Modal>
</template>
