<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { VtualPublicContent } from '@/api/types'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'

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
</script>

<template>
  <article :class="featured ? 'col-span-full' : 'col-span-full sm:col-span-6 lg:col-span-4'">
    <figure class="mb-5">
      <a
        :href="item.url ?? undefined"
        :target="item.url ? '_blank' : undefined"
        :rel="item.url ? 'noopener' : undefined"
        class="group relative block h-full overflow-hidden bg-gray-100 dark:bg-gray-900"
      >
        <img
          v-if="item.thumbnail_url"
          class="w-full object-cover transition-all duration-300 group-hover:scale-110 group-hover:opacity-75"
          :class="featured ? 'aspect-[77/46]' : 'aspect-[370/215]'"
          :src="item.thumbnail_url"
          :alt="item.title ?? ''"
        />
        <div
          v-else
          class="w-full bg-gray-200 dark:bg-gray-800"
          :class="featured ? 'aspect-[77/46]' : 'aspect-[370/215]'"
        ></div>
        <div class="absolute inset-0 bg-black/60"></div>
        <span
          class="absolute left-3.5 top-3 px-1.5 py-1 text-xs font-bold uppercase leading-none"
          :class="isLive ? 'bg-danger text-white' : 'bg-primary text-white'"
        >
          {{ badge }}
        </span>
        <span
          class="absolute left-1/2 top-1/2 flex aspect-square -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          :class="featured ? 'w-20' : 'w-10'"
        >
          <svg
            role="img"
            class="ml-[2px] fill-white"
            :class="featured ? 'aspect-[18/22] w-9' : 'aspect-[18/22] w-7'"
          >
            <use :href="`${spriteUrl}#play`"></use>
          </svg>
          <span class="sr-only">{{ t('web.vtual.public.video.play') }}</span>
        </span>
      </a>
    </figure>

    <div class="flex min-w-0 gap-x-3">
      <router-link
        v-if="showCreator && creatorTo && item.creator?.avatar_url"
        :to="creatorTo"
        class="shrink-0"
      >
        <img
          class="aspect-square w-10 object-cover"
          :src="item.creator.avatar_url"
          :alt="item.creator.display_name"
        />
      </router-link>
      <div
        v-else-if="showCreator && item.creator"
        class="flex aspect-square w-10 shrink-0 items-center justify-center bg-primary text-sm font-bold text-white"
      >
        {{ item.creator.display_name.charAt(0) }}
      </div>

      <div class="min-w-0">
        <h3
          class="mb-1 w-full truncate font-bold leading-tight text-gray-900 dark:text-white"
          :class="featured || showCreator ? 'text-base lg:text-lg lg:leading-6' : 'text-base'"
        >
          <a
            v-if="item.url"
            :href="item.url"
            target="_blank"
            rel="noopener"
            class="transition-colors hover:text-accent"
          >
            {{ item.title }}
          </a>
          <span v-else>{{ item.title }}</span>
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
