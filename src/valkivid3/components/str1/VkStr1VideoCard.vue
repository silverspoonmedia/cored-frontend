<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { VtualPublicContent } from '@/api/types'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'
import { safeHttpUrl, safeImageUrl } from '@/utils/safeUrl'

const props = withDefaults(
  defineProps<{
    item: VtualPublicContent
    showCreator?: boolean
    featured?: boolean
  }>(),
  {
    showCreator: false,
    featured: false,
  },
)

const { t, locale } = useI18n()

const isLive = computed(
  () => props.item.type === 'live' && props.item.status === 'live',
)

const badge = computed(() => {
  if (isLive.value) {
    return t('web.vtual.public.profile.live')
  }
  if (props.item.type === 'live') {
    return t('web.vtual.public.profile.ended')
  }
  return t('web.vtual.public.profile.vod')
})

const published = computed(() => {
  if (!props.item.published_at) {
    return ''
  }
  const date = new Date(props.item.published_at)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(date)
})

const creatorTo = computed(() => {
  const slug = props.item.creator?.slug
  return slug ? `/vtual/vtubers/${slug}` : null
})

const channelAvatar = computed(() => {
  const channel = props.item.channel
  if (!channel) {
    return null
  }
  const label = channel.display_name ?? props.item.creator?.display_name ?? ''
  const initial = label.trim().charAt(0).toUpperCase()
  return {
    url: safeImageUrl(channel.avatar_url),
    label,
    initial: initial || '?',
  }
})

const contentUrl = computed(() => safeHttpUrl(props.item.url))
const thumbnailUrl = computed(() => safeImageUrl(props.item.thumbnail_url))

const thumbFailed = ref(false)
const showThumb = computed(() => Boolean(thumbnailUrl.value) && !thumbFailed.value)

function onThumbError(): void {
  thumbFailed.value = true
}

watch(
  () => thumbnailUrl.value,
  () => {
    thumbFailed.value = false
  },
)
</script>

<template>
  <article :class="featured ? 'col-span-full' : 'col-span-full sm:col-span-6 lg:col-span-4'">
    <figure class="mb-5">
      <a
        :href="contentUrl ?? undefined"
        :target="contentUrl ? '_blank' : undefined"
        :rel="contentUrl ? 'noopener noreferrer' : undefined"
        class="group relative block overflow-hidden bg-gray-100 dark:bg-gray-900"
        :class="featured ? 'aspect-[77/46]' : 'aspect-[370/215]'"
      >
        <div
          class="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
          aria-hidden="true"
        >
          <svg role="img" class="fill-current" :class="featured ? 'aspect-[18/22] w-12' : 'aspect-[18/22] w-9'">
            <use :href="`${spriteUrl}#play`"></use>
          </svg>
        </div>
        <img
          v-if="showThumb"
          class="absolute inset-0 h-full w-full object-cover transition-all duration-300 group-hover:scale-110 group-hover:opacity-75"
          :src="thumbnailUrl ?? undefined"
          :alt="item.title ?? ''"
          loading="lazy"
          decoding="async"
          @error="onThumbError"
        />
        <div class="absolute inset-0 bg-black/60"></div>
        <span
          class="absolute start-3.5 top-3 px-1.5 py-1 text-xs font-bold uppercase leading-none"
          :class="isLive ? 'bg-danger text-white' : 'bg-primary text-white dark:text-gray-900'"
        >
          {{ badge }}
        </span>
        <span
          class="absolute left-1/2 top-1/2 flex aspect-square -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          :class="featured ? 'w-20' : 'w-10'"
        >
          <svg
            role="img"
            class="ms-[2px] fill-white"
            :class="featured ? 'aspect-[18/22] w-9' : 'aspect-[18/22] w-7'"
          >
            <use :href="`${spriteUrl}#play`"></use>
          </svg>
          <span class="sr-only">{{ t('web.vtual.public.video.play') }}</span>
        </span>
      </a>
    </figure>

    <div class="flex min-w-0 gap-x-3">
      <img
        v-if="channelAvatar?.url"
        class="h-12 w-12 shrink-0 self-start rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
        :src="channelAvatar.url ?? undefined"
        :alt="channelAvatar.label"
        width="48"
        height="48"
        loading="lazy"
        decoding="async"
      />
      <div
        v-else-if="channelAvatar"
        class="flex h-12 w-12 shrink-0 self-start items-center justify-center rounded-full bg-primary text-base font-bold text-white dark:text-gray-900"
        aria-hidden="true"
      >
        {{ channelAvatar.initial }}
      </div>

      <div class="min-w-0">
        <h3
          class="mb-1 w-full truncate font-bold leading-tight text-gray-900 dark:text-white"
          :class="featured || showCreator ? 'text-base lg:text-lg lg:leading-6' : 'text-base'"
        >
          <a
            v-if="contentUrl"
            :href="contentUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-colors hover:text-accent"
            :title="item.title ?? undefined"
          >
            {{ item.title }}
          </a>
          <span v-else :title="item.title ?? undefined">{{ item.title }}</span>
        </h3>
        <ul class="flex flex-col gap-y-1.5 text-sm font-medium leading-none text-gray-500">
          <li v-if="published">
            <time :datetime="item.published_at ?? undefined">{{ published }}</time>
          </li>
          <li v-if="showCreator && item.creator && creatorTo" class="text-accent">
            <router-link :to="creatorTo" class="transition-colors hover:text-gray-900 dark:hover:text-white">
              {{ item.creator.display_name }}
            </router-link>
          </li>
        </ul>
      </div>
    </div>
  </article>
</template>
