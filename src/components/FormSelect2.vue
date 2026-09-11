<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import $ from '@/utils/jquery-setup'
import FormField from './FormField.vue'
import { resolveApiUrl } from '@/api/baseUrl'
import {
  processLookupResults,
  flattenTreeForSelect2,
  type Select2Result,
  type Select2GroupedResult,
} from '@/utils/select2-lookup'

export interface SelectOption {
  value: string | number
  label: string
  /** Top-level ancestor header label — groups this option under an optgroup. */
  group?: string
  /** Depth of the option in the tree (0 = top level). Used for indentation. */
  level?: number
  /** Nested options rendered as `<optgroup label>` (one level; deeper levels are flattened with indentation). */
  children?: SelectOption[]
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
  /** Render flat options as optgroups using their `group`/`level` metadata. */
  grouped?: boolean
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
  grouped: false,
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

/** Indent label by tree depth — select2 only groups one level deep. */
function indentLabel(label: string, level?: number): string {
  if (!props.grouped || !level) return label
  return '\u00A0'.repeat(level * 4) + label
}

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
      const page = processLookupResults(data)
      return {
        // Grouped ajax sources (lookups/menus) return nested trees from the
        // backend. Select2 only renders one level of children (nested beyond
        // that breaks selection), so flatten to 1-level optgroups with the
        // root itself as the group's first selectable leaf.
        results: props.grouped
          ? flattenTreeForSelect2(page.results)
          : page.results,
        pagination: page.pagination,
      }
    },
  }
}

/** Dropdown renderer: indents options by their tree depth; group headers pass through. */
function resultTemplate(option: Select2GroupedResult | Select2Result): string | ReturnType<typeof $> {
  if ('children' in option && option.children) {
    return option.text
  }
  const level = typeof option.level === 'number' ? option.level : 0
  const text = option.text ?? ''
  const $node = $('<span>').text(text)
  if (level > 0) {
    $node.css('padding-left', `${level * 16}px`)
  }
  return $node as unknown as ReturnType<typeof $>
}

/** Selection box renderer: plain text, no padding (box is narrow). */
function selectionTemplate(option: Select2GroupedResult | Select2Result): string {
  return option.text ?? ''
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

  const grouped = props.grouped
  const groups = new Map<string, HTMLOptGroupElement>()

  const appendOption = (opt: SelectOption) => {
    const o = document.createElement('option')
    o.value = String(opt.value)
    o.textContent = indentLabel(opt.label, opt.level)
    if (grouped && typeof opt.level === 'number') {
      o.dataset.level = String(opt.level)
    }
    return o
  }

  for (const opt of normalizedOptions.value) {
    if (opt.children && opt.children.length) {
      const og = document.createElement('optgroup')
      og.label = opt.label
      // Flatten nested children with indentation (select2 groups only 1 level).
      for (const child of opt.children) {
        og.appendChild(appendOption(child))
      }
      el.appendChild(og)
      continue
    }

    if (grouped && opt.group) {
      let og = groups.get(opt.group)
      if (!og) {
        og = document.createElement('optgroup')
        og.label = opt.group
        groups.set(opt.group, og)
        el.appendChild(og)
      }
      og.appendChild(appendOption(opt))
      continue
    }

    el.appendChild(appendOption(opt))
  }

  if (props.ajaxUrl) {
    for (const opt of props.selectedOptions) {
      const o = document.createElement('option')
      o.value = String(opt.value)
      o.textContent = indentLabel(opt.label, opt.level)
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
    templateResult: props.grouped ? resultTemplate : undefined,
    templateSelection: props.grouped ? selectionTemplate : undefined,
  })

  // select2#3663: closing the dropdown re-focuses the selection element,
  // and native focus() scrolls the viewport to it (page jumps to top on
  // tall grouped dropdowns). Restore the scroll position after each
  // selection, and refocus the selection without scrolling.
  $el.on('select2:select', () => {
    const scrollY = window.scrollY
    const scrollX = window.scrollX
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, left: scrollX, behavior: 'instant' as ScrollBehavior })
      const selection = el.parentElement?.querySelector<HTMLElement>('.select2-selection')
      selection?.focus({ preventScroll: true })
    })
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
  // Shallow: consumers replace option arrays wholesale; deep traversal of
  // large option lists is wasted work (Vue re-runs getter on identity change).
  { deep: false },
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
