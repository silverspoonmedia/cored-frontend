<script setup lang="ts">
interface Badge {
  label: string
  variant?: 'warning' | 'success' | 'danger' | 'secondary'
  key?: string
}

defineProps<{
  eyebrow?: string
  title?: string
  amount?: string | number | null
  currency?: string
  badges?: Badge[]
}>()

function badgeClass(variant: string | undefined): string {
  switch (variant) {
    case 'warning': return 'ois-status-warning'
    case 'success': return 'ois-status-success'
    case 'danger': return 'ois-status-danger'
    default: return 'ois-status-secondary'
  }
}

function formatAmount(amount: string | number | null | undefined, currency: string): string {
  if (amount === null || amount === undefined || amount === '') return ''
  if (typeof amount === 'number') {
    return `${currency} ${amount}`
  }
  return amount
}
</script>

<template>
  <div class="ois-hero" role="status" aria-live="polite" aria-atomic="true" data-payment-hero>
    <div v-if="eyebrow" class="ois-hero__eyebrow">{{ eyebrow }}</div>
    <h1 v-if="title" class="ois-hero__title">{{ title }}</h1>
    <p v-if="amount !== null && amount !== undefined && amount !== ''" class="ois-hero__amount" data-payment-hero-amount>
      {{ formatAmount(amount, currency ?? 'IDR') }}
    </p>
    <div v-if="badges && badges.length > 0" class="ois-hero__badges">
      <span
        v-for="badge in badges"
        :key="badge.key ?? badge.label"
        class="badge"
        :class="badgeClass(badge.variant)"
        :data-payment-badge="badge.key ?? undefined"
      >{{ badge.label }}</span>
    </div>
  </div>
</template>
