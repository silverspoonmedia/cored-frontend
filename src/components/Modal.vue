<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

type BootstrapModal = {
  show(): void
  hide(): void
  dispose(): void
  handleUpdate(): void
}

type BootstrapModalConstructor = new (el: Element, opts?: Record<string, unknown>) => BootstrapModal

declare global {
  interface Window {
    bootstrap?: {
      Modal?: BootstrapModalConstructor
    }
  }
}

const props = withDefaults(defineProps<{
  modelValue?: boolean
  title?: string | null
  size?: 'sm' | 'lg' | 'xl' | 'fullscreen' | null
  backdrop?: boolean | 'static'
  scrollable?: boolean
}>(), {
  modelValue: false,
  title: null,
  size: null,
  backdrop: true,
  scrollable: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  shown: []
  hidden: []
}>()

const { t } = useI18n()

const modalEl = ref<HTMLElement | null>(null)
let modalInstance: BootstrapModal | null = null

const modalClasses = computed(() => {
  const classes: Record<string, boolean> = {
    modal: true,
    fade: true,
  }
  if (props.size === 'fullscreen') {
    classes['modal-fullscreen'] = true
  }
  return classes
})

const dialogClasses = computed(() => {
  const classes: Record<string, boolean> = {
    'modal-dialog': true,
  }
  if (props.size === 'sm') classes['modal-sm'] = true
  if (props.size === 'lg') classes['modal-lg'] = true
  if (props.size === 'xl') classes['modal-xl'] = true
  if (props.scrollable) classes['modal-dialog-scrollable'] = true
  return classes
})

function getModal(): BootstrapModal | null {
  if (!modalEl.value) return null
  if (!modalInstance) {
    const Ctor = window.bootstrap?.Modal
    if (!Ctor) return null
    modalInstance = new Ctor(modalEl.value, {
      backdrop: props.backdrop,
      keyboard: props.backdrop !== 'static',
    })
    modalEl.value.addEventListener('shown.bs.modal', () => emit('shown'))
    modalEl.value.addEventListener('hidden.bs.modal', () => {
      emit('hidden')
      emit('update:modelValue', false)
    })
  }
  return modalInstance
}

watch(
  () => props.modelValue,
  async (visible) => {
    await nextTick()
    const modal = getModal()
    if (!modal) return
    if (visible) modal.show()
    else modal.hide()
  },
)

onBeforeUnmount(() => {
  if (modalInstance) {
    modalInstance.dispose()
    modalInstance = null
  }
})
</script>

<template>
  <div
    ref="modalEl"
    :class="modalClasses"
    tabindex="-1"
    aria-hidden="true"
  >
    <div :class="dialogClasses">
      <div class="modal-content">
        <div v-if="title || $slots.header" class="modal-header">
          <h5 class="modal-title">{{ title }}</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            :aria-label="t('actions.close')"
          ></button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </div>
</template>
