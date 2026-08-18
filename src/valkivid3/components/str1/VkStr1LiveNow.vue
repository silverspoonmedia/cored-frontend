<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { VtualPublicContent } from '@/api/types'
import socialIconsUrl from '@/valkivid3/assets/img/social-icons.svg'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'

const props = defineProps<{
  items?: VtualPublicContent[] | null
}>()

const { t } = useI18n()

const lives = computed(() => (props.items ?? []).filter((item) => item.title || item.url))

function platformIcon(key: string | null | undefined): string {
  if (key === 'youtube') return `${socialIconsUrl}#youtube`
  if (key === 'twitch') return `${socialIconsUrl}#twitch`
  if (key === 'discord') return `${socialIconsUrl}#discord`
  return `${spriteUrl}#play`
}
</script>

<template>
  <section v-if="lives.length > 0" class="pb-12 md:pb-16 lg:pb-20">
    <div class="container">
      <div class="mb-10 flex items-center gap-x-4 md:mb-12">
        <span class="relative flex h-3 w-3 shrink-0">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75"></span>
          <span class="relative inline-flex h-3 w-3 rounded-full bg-danger"></span>
        </span>
        <h2
          class="text-2.5xl font-bold tracking-tighter text-gray-900 before:text-accent before:content-['.'] dark:text-white sm:text-3.5xl md:text-4xl lg:text-[42px] lg:leading-none"
        >
          {{ t('web.vtual.public.live_now.heading') }}
        </h2>
      </div>

      <ul class="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-4 lg:gap-7.5">
        <li v-for="(live, index) in lives" :key="live.url ?? `${live.title}-${index}`">
          <a
            v-if="live.url"
            :href="live.url"
            target="_blank"
            rel="noopener"
            class="group flex items-center gap-x-3 bg-gray-150 p-4 ring-1 ring-gray-500/20 transition-all hover:ring-accent dark:bg-gray-800 dark:ring-gray-500/20"
          >
            <span class="relative shrink-0">
              <img
                v-if="live.creator?.avatar_url"
                :src="live.creator.avatar_url"
                :alt="live.creator?.display_name ?? ''"
                class="h-12 w-12 rounded-full object-cover ring-2 ring-danger/60"
              />
              <span
                v-else
                class="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white ring-2 ring-danger/60"
              >
                {{ (live.creator?.display_name ?? '?').charAt(0) }}
              </span>
              <span
                class="absolute -bottom-1 -right-1 rounded-full bg-danger px-1.5 py-0.5 text-3xs font-bold uppercase leading-none text-white"
              >
                {{ t('web.vtual.public.live_now.badge') }}
              </span>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-bold text-gray-900 transition-colors group-hover:text-accent dark:text-white">
                {{ live.creator?.display_name ?? live.title }}
              </span>
              <span class="block truncate text-xs text-gray-500 dark:text-gray">
                {{ live.title }}
              </span>
            </span>
            <svg class="h-4 w-4 shrink-0 fill-gray-500 transition-colors group-hover:fill-accent dark:fill-gray-300" fill="currentColor">
              <use :href="platformIcon(live.platform_key)"></use>
            </svg>
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>
