<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  targetDate?: string | null
  eventTitle?: string | null
  eventBody?: string | null
}>()

const { t } = useI18n()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

const target = computed<number | null>(() => {
  if (!props.targetDate) {
    return null
  }
  const parsed = Date.parse(props.targetDate)
  return Number.isNaN(parsed) ? null : parsed
})

const remaining = computed(() => {
  if (target.value === null) {
    return null
  }
  const diff = Math.max(0, target.value - now.value)
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    total: diff,
  }
})

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer !== null) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div v-if="remaining !== null" class="mx-auto max-w-[1360px] px-5 pb-20 md:pb-24 lg:pb-[150px]">
    <div class="relative min-h-[220px] bg-gradient-to-br from-gray-100 via-primary/10 to-gray-100 dark:from-gray-900 dark:via-primary dark:to-gray-900">
      <div class="container relative z-10 text-white">
        <div class="grid grid-cols-12 gap-x-5 gap-y-8 px-2 py-7 md:gap-x-6 lg:gap-x-7.5 lg:gap-y-12 lg:px-0 lg:py-11">
          <div class="col-span-full md:col-span-5 md:col-start-3 xl:-ml-7.5">
            <div class="text-lg font-bold uppercase tracking-wide text-accent">{{ t('web.vtual.public.countdown.eyebrow') }}</div>
            <h3 class="mb-3 text-2xl font-bold leading-none text-gray-900 dark:text-white md:text-2.5xl lg:mb-4 lg:text-4xl xl:text-[42px]">
              {{ props.eventTitle || t('web.vtual.public.countdown.title') }}
            </h3>
            <div class="text-base font-medium leading-normal text-gray-600 dark:text-white/80">
              {{ props.eventBody || t('web.vtual.public.countdown.body') }}
            </div>
          </div>

          <div class="col-span-full flex flex-wrap items-center justify-center gap-y-4 self-center md:col-span-4 md:col-start-9 lg:gap-y-0">
            <div
              class="mb-4 grid w-full basis-full grid-cols-4 font-bold lg:mb-5 xl:pt-2.5 [&>div]:before:absolute [&>div]:before:-left-0.5 [&>div]:before:top-0 [&>div]:before:text-xl [&>div]:before:content-[':'] [&>div:first-child]:before:hidden [&>div]:md:before:text-3xl [&>div]:lg:before:-left-1 [&>div]:xl:before:text-[42px] [&>div]:xl:before:leading-none"
            >
              <div class="relative flex flex-col items-center">
                <div class="text-xl font-bold tabular-nums text-gray-900 dark:text-white md:text-3xl xl:mb-1 xl:text-[42px] xl:leading-none">{{ pad(remaining.days) }}</div>
                <div class="text-2xs font-bold uppercase tracking-wider leading-none text-gray-500 dark:text-white/70 md:text-xs">{{ t('web.vtual.public.countdown.days') }}</div>
              </div>
              <div class="relative flex flex-col items-center">
                <div class="text-xl font-bold tabular-nums text-gray-900 dark:text-white md:text-3xl xl:mb-1 xl:text-[42px] xl:leading-none">{{ pad(remaining.hours) }}</div>
                <div class="text-2xs font-bold uppercase tracking-wider leading-none text-gray-500 dark:text-white/70 md:text-xs">{{ t('web.vtual.public.countdown.hours') }}</div>
              </div>
              <div class="relative flex flex-col items-center">
                <div class="text-xl font-bold tabular-nums text-gray-900 dark:text-white md:text-3xl xl:mb-1 xl:text-[42px] xl:leading-none">{{ pad(remaining.minutes) }}</div>
                <div class="text-2xs font-bold uppercase tracking-wider leading-none text-gray-500 dark:text-white/70 md:text-xs">{{ t('web.vtual.public.countdown.mins') }}</div>
              </div>
              <div class="relative flex flex-col items-center">
                <div class="text-xl font-bold tabular-nums text-gray-900 dark:text-white md:text-3xl xl:mb-1 xl:text-[42px] xl:leading-none">{{ pad(remaining.seconds) }}</div>
                <div class="text-2xs font-bold uppercase tracking-wider leading-none text-gray-500 dark:text-white/70 md:text-xs">{{ t('web.vtual.public.countdown.secs') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
