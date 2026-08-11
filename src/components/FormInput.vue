<script setup lang="ts">
import { ref, computed } from 'vue'
import FormField from './FormField.vue'

const props = withDefaults(defineProps<{
  name: string
  label?: string | null
  type?: string
  modelValue?: string | number
  icon?: string | null
  hint?: string | null
  required?: boolean
  placeholder?: string
  autocomplete?: string
  error?: string | string[] | null
  toggleable?: boolean | null
  disabled?: boolean
  readonly?: boolean
}>(), {
  type: 'text',
  modelValue: '',
  icon: null,
  hint: null,
  required: false,
  placeholder: undefined,
  autocomplete: undefined,
  error: null,
  toggleable: null,
  disabled: false,
  readonly: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()

const showPassword = ref(false)

const canToggle = computed(() => {
  const toggle = props.toggleable
  if (toggle !== null) return toggle && props.type === 'password'
  return props.type === 'password'
})

const useInputGroup = computed(() => !!props.icon || canToggle.value)

const hasError = computed(() => {
  if (!props.error) return false
  if (Array.isArray(props.error)) return props.error.length > 0
  return !!props.error
})

const inputClasses = computed(() => ({
  'form-control': true,
  'is-invalid': hasError.value,
}))

const effectiveType = computed(() => {
  if (canToggle.value && showPassword.value) return 'text'
  return props.type
})

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function togglePassword(): void {
  showPassword.value = !showPassword.value
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
    <div v-if="useInputGroup" class="input-group" :class="{ 'has-validation': hasError }">
      <input
        :type="effectiveType"
        :name="name"
        :id="name"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :class="inputClasses"
        @input="onInput"
        @blur="emit('blur', $event)"
      />
      <button
        v-if="canToggle"
        type="button"
        class="input-group-text"
        @click="togglePassword"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
        :aria-pressed="showPassword ? 'true' : 'false'"
      >
        <i :class="showPassword ? 'bi bi-eye' : 'bi bi-eye-slash'" aria-hidden="true"></i>
      </button>
      <span v-if="icon" class="input-group-text">
        <i class="bi" :class="icon" aria-hidden="true"></i>
      </span>
    </div>

    <input
      v-else
      :type="effectiveType"
      :name="name"
      :id="name"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      :class="inputClasses"
      @input="onInput"
      @blur="emit('blur', $event)"
    />
  </FormField>
</template>
