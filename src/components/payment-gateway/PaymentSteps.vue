<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  currentStep?: number
  completed?: boolean
}>(), {
  currentStep: 1,
  completed: false,
})

const { t } = useI18n()

const steps = computed(() => [
  {
    number: 1,
    title: t('web.payments.show.payment_steps.choose_channel'),
    body: t('web.payments.show.payment_steps.choose_channel_hint'),
  },
  {
    number: 2,
    title: t('web.payments.show.payment_steps.pay'),
    body: t('web.payments.show.payment_steps.pay_hint'),
  },
  {
    number: 3,
    title: t('web.payments.show.payment_steps.confirm'),
    body: t('web.payments.show.payment_steps.confirm_hint'),
  },
])

function stateClass(n: number): string {
  if (n < props.currentStep) return 'is-done'
  if (n === props.currentStep) return props.completed ? 'is-done' : 'is-active'
  return ''
}
</script>

<template>
  <div
    class="ois-steps"
    :aria-label="t('web.payments.show.payment_steps.aria')"
    data-payment-steps
    :data-current-step="currentStep"
    :data-completed="completed ? '1' : '0'"
  >
    <div
      v-for="step in steps"
      :key="step.number"
      class="ois-step"
      :class="stateClass(step.number)"
      :data-payment-step="step.number"
    >
      <span class="ois-step__num">{{ step.number }}</span>
      <div>
        <p class="ois-step__title">{{ step.title }}</p>
        <p class="ois-step__body">{{ step.body }}</p>
      </div>
    </div>
  </div>
</template>
