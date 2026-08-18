<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { VtualPublicStats } from '@/api/types'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'

const props = defineProps<{
  stats?: VtualPublicStats | null
}>()

const { t } = useI18n()

const rootEl = ref<HTMLElement | null>(null)
const visible = ref(false)
// Animated display values — count up once the strip scrolls into view.
const display = ref({ creators: 0, channels: 0, contents: 0, subscribers: 0 })

let observer: IntersectionObserver | null = null
let raf = 0

function animate(): void {
  const target = props.stats
  if (!target) return

  const duration = 1200
  const start = performance.now()
  const from = { ...display.value }
  const to = {
    creators: target.creators,
    channels: target.channels,
    contents: target.contents,
    subscribers: target.subscribers_total,
  }

  const tick = (now: number): void => {
    const p = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - p, 3)
    display.value = {
      creators: Math.round(from.creators + (to.creators - from.creators) * eased),
      channels: Math.round(from.channels + (to.channels - from.channels) * eased),
      contents: Math.round(from.contents + (to.contents - from.contents) * eased),
      subscribers: Math.round(from.subscribers + (to.subscribers - from.subscribers) * eased),
    }
    if (p < 1) {
      raf = requestAnimationFrame(tick)
    }
  }
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(tick)
}

watch(
  () => props.stats,
  () => {
    if (visible.value) animate()
  },
)

watch(visible, (on) => {
  if (on) animate()
})

onMounted(() => {
  if (!rootEl.value || typeof IntersectionObserver === 'undefined') {
    visible.value = true
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        visible.value = true
        observer?.disconnect()
      }
    },
    { threshold: 0.3 },
  )
  observer.observe(rootEl.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(raf)
})
</script>

<template>
  <section v-if="stats" ref="rootEl" class="pb-20 md:pb-24 lg:pb-[120px]">
    <div class="container">
      <dl class="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700 lg:grid-cols-4">
        <div class="flex flex-col items-center gap-y-2 bg-gray-100 px-4 py-8 dark:bg-gray-800 lg:py-12">
          <svg role="img" class="h-7 w-7 fill-accent">
            <use :href="`${spriteUrl}#user`"></use>
          </svg>
          <dd class="text-3xl font-bold tracking-tighter text-gray-900 dark:text-white lg:text-5xl">
            {{ display.creators.toLocaleString() }}
          </dd>
          <dt class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-300 lg:text-sm">
            {{ t('web.vtual.public.stats.creators') }}
          </dt>
        </div>
        <div class="flex flex-col items-center gap-y-2 bg-gray-100 px-4 py-8 dark:bg-gray-800 lg:py-12">
          <svg role="img" class="h-7 w-7 fill-accent">
            <use :href="`${spriteUrl}#screen`"></use>
          </svg>
          <dd class="text-3xl font-bold tracking-tighter text-gray-900 dark:text-white lg:text-5xl">
            {{ display.channels.toLocaleString() }}
          </dd>
          <dt class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-300 lg:text-sm">
            {{ t('web.vtual.public.stats.channels') }}
          </dt>
        </div>
        <div class="flex flex-col items-center gap-y-2 bg-gray-100 px-4 py-8 dark:bg-gray-800 lg:py-12">
          <svg role="img" class="h-7 w-7 fill-accent">
            <use :href="`${spriteUrl}#play`"></use>
          </svg>
          <dd class="text-3xl font-bold tracking-tighter text-gray-900 dark:text-white lg:text-5xl">
            {{ display.contents.toLocaleString() }}
          </dd>
          <dt class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-300 lg:text-sm">
            {{ t('web.vtual.public.stats.contents') }}
          </dt>
        </div>
        <div class="flex flex-col items-center gap-y-2 bg-gray-100 px-4 py-8 dark:bg-gray-800 lg:py-12">
          <svg role="img" class="h-7 w-7 fill-accent">
            <use :href="`${spriteUrl}#star`"></use>
          </svg>
          <dd class="text-3xl font-bold tracking-tighter text-gray-900 dark:text-white lg:text-5xl">
            {{ display.subscribers.toLocaleString() }}
          </dd>
          <dt class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-300 lg:text-sm">
            {{ t('web.vtual.public.stats.subscribers') }}
          </dt>
        </div>
      </dl>
    </div>
  </section>
</template>
