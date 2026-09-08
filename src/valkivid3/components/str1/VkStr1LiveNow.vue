<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { VtualPublicContent, VtualPublicContentCreator } from '@/api/types'
import socialIconsUrl from '@/valkivid3/assets/img/social-icons.svg'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'
import { safeHttpUrl, safeImageUrl } from '@/utils/safeUrl'

const props = defineProps<{
  items?: VtualPublicContent[] | null
}>()

const { t } = useI18n()

interface LiveGroup {
  creator: VtualPublicContentCreator | null
  items: VtualPublicContent[]
  platforms: string[]
  key?: string
}

const groups = computed<LiveGroup[]>(() => {
  const items = (props.items ?? []).filter((item) => item.title || item.url)
  const map = new Map<string, LiveGroup>()
  for (const item of items) {
    const key = item.creator?.slug ?? '_unknown'
    if (!map.has(key)) {
      map.set(key, {
        creator: item.creator ?? null,
        items: [],
        platforms: [],
      })
    }
    const g = map.get(key)!
    g.items.push(item)
    if (item.platform_key && !g.platforms.includes(item.platform_key)) {
      g.platforms.push(item.platform_key)
    }
  }
  return Array.from(map.values()).map((group, gi) => ({
    ...group,
    key: group.creator?.slug ?? `ungrouped-${gi}`,
  }))
})

function platformIcon(key: string | null | undefined): string {
  if (key === 'youtube') return `${socialIconsUrl}#youtube`
  if (key === 'twitch') return `${socialIconsUrl}#twitch`
  if (key === 'discord') return `${socialIconsUrl}#discord`
  return `${spriteUrl}#play`
}

function imageUrl(value: string | null | undefined): string | null {
  return safeImageUrl(value)
}

function externalUrl(value: string | null | undefined): string | null {
  return safeHttpUrl(value)
}
</script>

<template>
  <section v-if="groups.length > 0" class="pb-8 lg:pb-10">
    <div class="container">
      <div class="mb-10 flex items-center gap-x-4 md:mb-12">
        <span class="relative flex h-3 w-3 shrink-0">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75"></span>
          <span class="relative inline-flex h-3 w-3 rounded-full bg-danger"></span>
        </span>
        <h2
          class="text-xl font-bold tracking-tighter text-gray-900 before:text-accent before:content-['.'] dark:text-white md:text-2xl lg:text-3xl lg:leading-none"
        >
          {{ t('web.vtual.public.live_now.heading') }}
        </h2>
      </div>

      <ul class="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-7.5">
        <li v-for="group in groups" :key="group.key">
          <div
            class="flex flex-col bg-gray-150 ring-1 ring-gray-500/20 transition-all hover:ring-accent dark:bg-gray-800 dark:ring-gray-500/20"
          >
            <!-- Card header: creator + platforms -->
            <div class="flex items-center gap-x-3 border-b border-gray-500/10 p-4 dark:border-gray-500/10">
              <span class="relative shrink-0">
                <img
                  v-if="imageUrl(group.creator?.avatar_url)"
                  :src="imageUrl(group.creator?.avatar_url) ?? undefined"
                  :alt="group.creator?.display_name ?? ''"
                  class="h-9 w-9 rounded-full object-cover ring-2 ring-danger/60"
                  width="36"
                  height="36"
                  loading="lazy"
                  decoding="async"
                />
                <span
                  v-else
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white dark:text-gray-900 ring-2 ring-danger/60"
                >
                  {{ (group.creator?.display_name ?? '?').charAt(0) }}
                </span>
                <span
                  class="absolute -bottom-1 -end-1 rounded-full bg-danger px-1.5 py-0.5 text-3xs font-bold uppercase leading-none text-white"
                >
                  {{ t('web.vtual.public.live_now.badge') }}
                </span>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-bold text-gray-900 dark:text-white">
                  {{ group.creator?.display_name ?? t('web.vtual.public.live_now.heading') }}
                </span>
                <span class="flex items-center gap-x-1.5">
                  <svg
                    v-for="(pk, pi) in group.platforms"
                    :key="pk"
                    class="h-3.5 w-3.5 fill-gray-500 dark:fill-gray-300"
                    fill="currentColor"
                  >
                    <use :href="platformIcon(pk)"></use>
                  </svg>
                </span>
              </span>
            </div>

            <!-- Card body: live items list (max 3) -->
            <ul class="flex flex-col divide-y divide-gray-500/10 dark:divide-gray-500/10">
              <li
                v-for="(live, li) in group.items.slice(0, 3)"
                :key="live.url ?? `${live.title}-${li}`"
              >
                <a
                  v-if="externalUrl(live.url)"
                  :href="externalUrl(live.url) ?? undefined"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="group flex items-center gap-x-2 px-4 py-2.5 transition-colors hover:bg-gray-500/5 dark:hover:bg-gray-500/5"
                >
                  <svg class="h-4 w-4 shrink-0 fill-gray-500 transition-colors group-hover:fill-accent dark:fill-gray-300" fill="currentColor">
                    <use :href="platformIcon(live.platform_key)"></use>
                  </svg>
                  <span class="block truncate text-xs font-medium text-gray-900 transition-colors group-hover:text-accent dark:text-white">
                    {{ live.title }}
                  </span>
                </a>
                <div v-else class="flex items-center gap-x-2 px-4 py-2.5">
                  <svg class="h-4 w-4 shrink-0 fill-gray-500 dark:fill-gray-300" fill="currentColor">
                    <use :href="platformIcon(live.platform_key)"></use>
                  </svg>
                  <span class="block truncate text-xs font-medium text-gray-900 dark:text-white">
                    {{ live.title }}
                  </span>
                </div>
              </li>
            </ul>

            <!-- Card footer: +N more -->
            <div
              v-if="group.items.length > 3"
              class="border-t border-gray-500/10 px-4 py-2 text-xs font-medium text-gray-500 dark:border-gray-500/10 dark:text-gray"
            >
              {{ t('web.vtual.public.live_now.more_streams', { count: group.items.length - 3 }) }}
            </div>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
