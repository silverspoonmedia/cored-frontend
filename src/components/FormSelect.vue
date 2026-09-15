<script setup lang="ts">
import { computed } from 'vue'
import FormField from './FormField.vue'

export interface SelectOption {
  value: string | number
  label: string
  /** Nested options rendered as `<optgroup label>` (one level; deeper levels are flattened with indentation). */
  children?: SelectOption[]
  /** Top-level ancestor header label — groups this option under an optgroup. */
  group?: string
  /** Depth of the option in the tree (0 = top level). Used for indentation. */
  level?: number
}

const props = withDefaults(defineProps<{
  name: string
  label?: string | null
  options?: SelectOption[] | Record<string, string>
  modelValue?: string | number | null
  hint?: string | null
  required?: boolean
  placeholder?: string | null
  error?: string | string[] | null
  disabled?: boolean
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
  grouped: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const normalizedOptions = computed<SelectOption[]>(() => {
  if (Array.isArray(props.options)) return props.options
  return Object.entries(props.options).map(([value, label]) => ({
    value,
    label,
  }))
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

/** Grouped view: explicit `children` nodes first, then flat options bucketed by `group`. */
const groupedView = computed<Array<{ label: string; options: SelectOption[] } | { option: SelectOption }>>(() => {
  if (!props.grouped) return []
  const rows: Array<{ label: string; options: SelectOption[] } | { option: SelectOption }> = []
  const groups = new Map<string, { label: string; options: SelectOption[] }>()

  for (const opt of normalizedOptions.value) {
    if (opt.children && opt.children.length) {
      rows.push({ label: opt.label, options: opt.children })
      continue
    }
    if (opt.group) {
      let group = groups.get(opt.group)
      if (!group) {
        group = { label: opt.group, options: [] }
        groups.set(opt.group, group)
        rows.push(group)
      }
      group.options.push(opt)
      continue
    }
    rows.push({ option: opt })
  }

  return rows
})

function onChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  const value = target.value
  emit('update:modelValue', value)
  emit('change', value)
}
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
      :name="name"
      :id="name"
      :value="modelValue ?? ''"
      :required="required"
      :disabled="disabled"
      :class="selectClasses"
      @change="onChange"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>

      <template v-if="grouped">
        <template v-for="(row, index) in groupedView" :key="index">
          <optgroup v-if="'label' in row" :label="row.label">
            <option
              v-for="opt in row.options"
              :key="opt.value"
              :value="opt.value"
              :style="opt.level ? { paddingLeft: `${opt.level * 16}px` } : undefined"
            >{{ '\u00A0'.repeat(opt.level ?? 0) }}{{ opt.label }}</option>
          </optgroup>
          <option
            v-else
            :key="row.option.value"
            :value="row.option.value"
          >{{ row.option.label }}</option>
        </template>
      </template>

      <template v-else>
        <option
          v-for="opt in normalizedOptions"
          :key="opt.value"
          :value="opt.value"
        >{{ opt.label }}</option>
      </template>
    </select>
  </FormField>
</template>
