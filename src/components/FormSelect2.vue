<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import $ from '@/utils/jquery-setup'
import FormField from './FormField.vue'
import { resolveApiUrl } from '@/api/baseUrl'
import { processLookupResults, type Select2Result } from '@/utils/select2-lookup'

export interface SelectOption {
  value: string | number
  label: string
}

const props = withDefaults(defineProps<{
  name: string
  label?: string | null
  options?: SelectOption[] | Record<string, string>
  modelValue?: string | string[] | null
  hint?: string | null
  required?: boolean
  placeholder?: string | null
  error?: string | string[] | null
  disabled?: boolean
  multiple?: boolean
  ajaxUrl?: string | null
  ajaxParams?: Record<string, unknown>
  minimumInputLength?: number
  selectedOptions?: SelectOption[]
}>(), {
  label: null,
  options: () => [] as SelectOption[],
  modelValue: null,
  hint: null,
  required: false,
  placeholder: null,
  error: null,
  disabled: false,
  multiple: false,
  ajaxUrl: null,
  ajaxParams: () => ({}),
  minimumInputLength: 0,
  selectedOptions: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]]
  change: [value: string | string[]]
}>()

const selectRef = ref<HTMLSelectElement | null>(null)

const normalizedOptions = computed<SelectOption[]>(() => {
  if (Array.isArray(props.options)) return props.options
  return Object.entries(props.options).map(([value, label]) => ({ value, label }))
})

const hasError = computed(() => {
  if (!props.error) return false
  if (Array.isArray(props.error)) return props.error.length > 0
  return !!props.error
})

const selectClasses = computed(() => ({
  'form-select': true,
  'is-invalid': hasError.value,
}))

function buildAjaxConfig() {
  if (!props.ajaxUrl) return undefined
  const fullUrl = props.ajaxUrl.startsWith('http')
    ? props.ajaxUrl
    : resolveApiUrl(props.ajaxUrl)

  return {
    url: fullUrl,
    dataType: 'json' as const,
    delay: 300,
    cache: false,
    xhrFields: {
      withCredentials: true,
    },
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-SPA-Origin': '1',
    },
    data(params: { term?: string; page?: number }) {
      const query: Record<string, unknown> = {
        ...props.ajaxParams,
        q: params.term || '',
        page: params.page || 1,
        per_page: 10,
      }
      return Object.fromEntries(
        Object.entries(query).filter(
          ([, v]) => v !== null && v !== undefined && v !== '',
        ),
      )
    },
    processResults(data: unknown) {
      return processLookupResults(data)
    },
  }
}

function syncOptionsToDom() {
  const el = selectRef.value
  if (!el) return
  el.innerHTML = ''

  if (props.placeholder && !props.multiple && !props.ajaxUrl) {
    const ph = document.createElement('option')
    ph.value = ''
    ph.textContent = props.placeholder
    el.appendChild(ph)
  }

  for (const opt of normalizedOptions.value) {
    const o = document.createElement('option')
    o.value = String(opt.value)
    o.textContent = opt.label
    el.appendChild(o)
  }

  if (props.ajaxUrl) {
    for (const opt of props.selectedOptions) {
      const o = document.createElement('option')
      o.value = String(opt.value)
      o.textContent = opt.label
      el.appendChild(o)
    }
  }
}

function applyValue() {
  const el = selectRef.value
  if (!el) return
  const $el = $(el)
  if (props.multiple) {
    const vals = Array.isArray(props.modelValue) ? props.modelValue.map(String) : []
    $el.val(vals).trigger('change.select2')
  } else {
    $el.val(props.modelValue ? String(props.modelValue) : '').trigger('change.select2')
  }
}

function initSelect2() {
  const el = selectRef.value
  if (!el) return
  const $el = $(el)

  $el.select2({
    theme: 'bootstrap-5',
    width: '100%',
    allowClear: !props.multiple && !!props.placeholder,
    placeholder: props.placeholder || undefined,
    minimumInputLength: props.minimumInputLength,
    ajax: buildAjaxConfig(),
  })

  $el.on('change', () => {
    const val = $el.val()
    if (props.multiple) {
      const arr = Array.isArray(val) ? val.map(String) : val ? [String(val)] : []
      emit('update:modelValue', arr)
      emit('change', arr)
    } else {
      const v = val === null || val === undefined ? '' : String(val)
      emit('update:modelValue', v)
      emit('change', v)
    }
  })
}

function destroySelect2() {
  const el = selectRef.value
  if (!el) return
  const $el = $(el)
  if ($el.hasClass('select2-hidden-accessible')) {
    $el.off('.select2')
    $el.off('.select2ScrollLock')
    $el.select2('destroy')
  }
}

onMounted(async () => {
  syncOptionsToDom()
  await nextTick()
  initSelect2()
  await nextTick()
  applyValue()
})

onBeforeUnmount(() => {
  destroySelect2()
})

watch(
  () => [props.options, props.selectedOptions],
  () => {
    if (!props.ajaxUrl) {
      destroySelect2()
      syncOptionsToDom()
      initSelect2()
      applyValue()
    }
  },
  { deep: true },
)

watch(
  () => props.modelValue,
  () => {
    applyValue()
  },
)
</script>

<template>
  <FormField
    :name="name"
    :label="label"
    :hint="hint"
    :required="required"
    :error="error"
  >
    <select
      ref="selectRef"
      :name="name"
      :id="name"
      :multiple="multiple"
      :required="required"
      :disabled="disabled"
      :class="selectClasses"
    />
  </FormField>
</template>
