<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { VtualPublicContent } from '@/api/types'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'
import socialIconsUrl from '@/valkivid3/assets/img/social-icons.svg'

const props = defineProps<{
  schedule?: VtualPublicContent[] | null
}>()

const { t, locale } = useI18n()

interface ScheduleRow {
  key: string
  day: string
  month: string
  title: string
  time: string
  platformKey: string | null
  creatorName: string | null
  creatorSlug: string | null
  url: string | null
}

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
)

const scheduleRows = computed<ScheduleRow[]>(() => {
  if (!props.schedule || props.schedule.length === 0) {
    return []
  }
  return props.schedule
    .filter((item) => item.scheduled_at)
    .map((item, index) => {
      const date = new Date(item.scheduled_at as string)
      const valid = !Number.isNaN(date.getTime())
      return {
        key: `${item.url ?? item.title ?? 'sched'}-${index}`,
        day: valid ? String(date.getDate()).padStart(2, '0') : '',
        month: valid
          ? date.toLocaleDateString(locale.value, { month: 'short' })
          : '',
        title: item.title ?? '',
        time: valid ? dateFormatter.value.format(date) : '',
        platformKey: item.platform_key,
        creatorName: item.creator?.display_name ?? null,
        creatorSlug: item.creator?.slug ?? null,
        url: item.url,
      }
    })
})

function platformIcon(key: string | null): string {
  if (key === 'youtube') return `${socialIconsUrl}#youtube`
  if (key === 'twitch') return `${socialIconsUrl}#twitch`
  if (key === 'discord') return `${socialIconsUrl}#discord`
  return `${spriteUrl}#clock`
}
</script>

<template>
  <section v-if="scheduleRows.length > 0" id="events" class="pb-20 md:pb-24 lg:pb-[120px]">
    <div class="container">
      <div class="mb-10 md:mb-12 lg:mb-16 xl:mb-20">
        <h2
          class="text-2.5xl font-bold tracking-tighter text-gray-900 before:text-accent before:content-['.'] dark:text-white sm:text-3.5xl md:text-4xl lg:text-[62px] lg:leading-none"
        >
          {{ t('web.vtual.public.events.heading') }}
        </h2>
      </div>

      <div class="divide-y divide-gray-500/20">
        <div
          v-for="row in scheduleRows"
          :key="row.key"
          class="grid grid-cols-12 gap-x-4 py-11 first:pt-0 last:pb-0 md:gap-x-6 lg:gap-x-7.5"
        >
          <div class="col-span-2 md:col-span-1 lg:col-span-1">
            <time class="flex flex-col bg-primary text-center text-xs font-bold text-white md:text-base">
              <span class="flex h-11 items-center justify-center text-2xl md:leading-none lg:h-[62px] lg:text-[32px]">
                {{ row.day }}
              </span>
              <span class="bg-primary-500 leading-[28px] text-white">{{ row.month }}</span>
            </time>
          </div>

          <div class="col-span-10 md:col-span-6 lg:col-span-6">
            <h4 class="mb-2 text-xl font-bold text-gray-900 dark:text-white lg:mb-2.5 lg:text-2xl">
              <a
                v-if="row.url"
                :href="row.url"
                target="_blank"
                rel="noopener"
                class="transition-colors hover:text-accent"
              >{{ row.title }}</a>
              <template v-else>{{ row.title }}</template>
            </h4>
            <div v-if="row.creatorName" class="lg:leading-[26px]">
              <router-link
                v-if="row.creatorSlug"
                :to="`/vtual/vtubers/${row.creatorSlug}`"
                class="font-bold text-accent transition-colors hover:text-gray-900 dark:hover:text-white"
              >{{ row.creatorName }}</router-link>
              <span v-else class="text-gray-600 dark:text-gray">{{ row.creatorName }}</span>
            </div>
          </div>

          <div class="col-span-full md:col-span-5 md:col-start-8 lg:col-span-5 lg:col-start-8">
            <ul class="flex flex-wrap gap-y-5 pt-7 md:pt-3 lg:pt-3">
              <li class="flex flex-1 flex-col items-center gap-y-3.5 text-center">
                <div>
                  <h5 class="font-bold tracking-tight text-gray-900 dark:text-white lg:text-lg lg:leading-tight">
                    {{ row.time }}
                  </h5>
                  <span class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray lg:text-sm">{{ t('web.vtual.public.schedule.start_time') }}</span>
                </div>
                <div class="lg:pt-1">
                  <svg role="img" class="h-5 w-5 fill-accent">
                    <use :href="`${spriteUrl}#clock`"></use>
                  </svg>
                </div>
              </li>
              <li class="flex flex-1 flex-col items-center gap-y-3.5 text-center">
                <div>
                  <h5 class="font-bold uppercase tracking-tight text-gray-900 dark:text-white lg:text-lg lg:leading-tight">
                    {{ row.platformKey ?? '—' }}
                  </h5>
                  <span class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray lg:text-sm">{{ t('web.vtual.public.schedule.platform') }}</span>
                </div>
                <div class="lg:pt-1">
                  <svg role="img" class="h-5 w-5 fill-accent">
                    <use :href="platformIcon(row.platformKey)"></use>
                  </svg>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
