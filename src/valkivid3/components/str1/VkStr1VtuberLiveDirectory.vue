<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVtualPublic } from '@/valkivid3/composables/useVtualPublic'
import type {
  VtualPublicContent,
  VtualPublicDirectoryPagination,
  VtualPublicVtuber,
} from '@/api/types'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'
import socialIconsUrl from '@/valkivid3/assets/img/social-icons.svg'

const props = withDefaults(
  defineProps<{
    liveItems?: VtualPublicContent[] | null
  }>(),
  {
    liveItems: null,
  },
)

const { t } = useI18n()
const { fetchDirectory, prefetchProfile } = useVtualPublic()

const items = ref<VtualPublicVtuber[]>([])
const pagination = ref<VtualPublicDirectoryPagination | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')
const page = ref(1)

let searchDebounce: ReturnType<typeof setTimeout> | null = null

// Group live streams per creator slug (LiveNow-style). Items without a
// creator slug cannot be matched to a directory card, so they are dropped.
const liveByCreator = computed<Map<string, VtualPublicContent[]>>(() => {
  const map = new Map<string, VtualPublicContent[]>()
  for (const item of props.liveItems ?? []) {
    if (!item.title && !item.url) {
      continue
    }
    const slug = item.creator?.slug
    if (!slug) {
      continue
    }
    if (!map.has(slug)) {
      map.set(slug, [])
    }
    map.get(slug)!.push(item)
  }
  return map
})

function liveItemsFor(slug: string): VtualPublicContent[] {
  return liveByCreator.value.get(slug) ?? []
}

function isLiveCard(vtuber: VtualPublicVtuber): boolean {
  return vtuber.is_live || liveItemsFor(vtuber.slug).length > 0
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const res = await fetchDirectory(page.value, search.value)
    items.value = res.items
    pagination.value = res.pagination
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    items.value = []
    pagination.value = null
  } finally {
    loading.value = false
  }
}

watch(search, () => {
  if (searchDebounce !== null) {
    clearTimeout(searchDebounce)
  }
  searchDebounce = setTimeout(() => {
    page.value = 1
    void load()
  }, 350)
})

watch(page, () => {
  void load()
})

onMounted(() => {
  void load()
})

function platformIcon(key: string | null | undefined): string {
  if (key === 'youtube') return `${socialIconsUrl}#youtube`
  if (key === 'twitch') return `${socialIconsUrl}#twitch`
  if (key === 'discord') return `${socialIconsUrl}#discord`
  return `${spriteUrl}#play`
}

function channelIcon(key: string | null): string {
  if (key === 'youtube') return `${socialIconsUrl}#youtube`
  if (key === 'twitch') return `${socialIconsUrl}#twitch`
  return `${spriteUrl}#plus`
}

function goTo(delta: number): void {
  if (!pagination.value) {
    return
  }
  const next = page.value + delta
  if (next < 1 || next > pagination.value.last_page) {
    return
  }
  page.value = next
}
</script>

<template>
  <section id="vtubers" class="pb-20 md:pb-24 lg:pb-[130px]">
    <div class="container">
      <div class="mb-10 flex flex-col gap-y-6 sm:flex-row sm:items-center sm:justify-between md:mb-12 lg:mb-16">
        <h2
          class="text-2.5xl font-bold tracking-tighter text-gray-900 before:text-accent before:content-['.'] dark:text-white sm:text-3.5xl md:text-4xl lg:text-[62px] lg:leading-none"
        >
          {{ t('web.vtual.public.directory.heading') }}
        </h2>

        <div class="relative sm:w-64">
          <input
            v-model="search"
            type="search"
            :placeholder="t('web.vtual.public.directory.search_placeholder')"
            class="w-full border-b border-gray-500/40 bg-transparent py-2 pr-8 text-sm font-medium text-gray-900 outline-none transition-colors placeholder:text-gray-500/60 focus:border-accent dark:border-white/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-accent"
          />
          <svg class="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 fill-gray-500" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" />
          </svg>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="mb-7.5 grid grid-cols-12 gap-5 md:gap-6 lg:gap-7.5" aria-hidden="true">
        <div
          v-for="n in 6"
          :key="n"
          class="col-span-full animate-pulse bg-gray-150 ring-1 ring-gray-500/20 dark:bg-gray-800 sm:col-span-6 lg:col-span-4"
        >
          <div class="flex items-center gap-x-4 p-5 lg:p-6">
            <div class="aspect-square w-16 rounded-full bg-gray-300 dark:bg-gray-700 lg:w-20"></div>
            <div class="min-w-0 flex-1 space-y-2">
              <div class="h-4 w-2/3 bg-gray-300 dark:bg-gray-700"></div>
              <div class="h-3 w-full bg-gray-300 dark:bg-gray-700"></div>
              <div class="h-3 w-1/2 bg-gray-300 dark:bg-gray-700"></div>
            </div>
          </div>
          <div class="h-8 border-t border-gray-500/20 bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="py-16 text-center text-danger">
        {{ t('web.vtual.public.directory.error') }}
      </div>

      <!-- Empty -->
      <div v-else-if="items.length === 0" class="py-16 text-center">
        <p class="mb-6 text-gray-500">{{ t('web.vtual.public.directory.empty') }}</p>
        <router-link
          to="/register?redirect=/apps/vtual/profiles"
          class="inline-flex justify-center bg-accent px-8 py-4 text-center text-sm font-bold uppercase leading-none text-gray-900 transition-colors hover:bg-accent/90"
        >
          {{ t('web.vtual.public.directory.empty_cta') }}
        </router-link>
      </div>

      <!-- Grid -->
      <template v-else>
        <div class="mb-7.5 grid grid-cols-12 gap-5 md:gap-6 lg:gap-7.5">
          <article
            v-for="vtuber in items"
            :key="vtuber.slug"
            class="col-span-full sm:col-span-6 lg:col-span-4"
          >
            <div
              class="group relative flex h-full flex-col overflow-hidden bg-gray-150 ring-1 ring-gray-500/20 transition-all hover:-translate-y-0.5 hover:ring-accent dark:bg-gray-800"
            >
              <!-- Identity: whole block links to the profile -->
              <router-link
                :to="`/vtual/vtubers/${vtuber.slug}`"
                class="block"
                @mouseenter="prefetchProfile(vtuber.slug)"
              >
                <div class="flex items-center gap-x-4 p-5 lg:p-6">
                  <figure class="relative shrink-0">
                    <img
                      v-if="vtuber.avatar_url"
                      class="aspect-square w-16 rounded-full object-cover lg:w-20"
                      :class="isLiveCard(vtuber) ? 'ring-2 ring-danger/60' : 'ring-2 ring-white/40 dark:ring-white/10'"
                      :src="vtuber.avatar_url"
                      :alt="vtuber.display_name"
                      loading="lazy"
                      decoding="async"
                    />
                    <div
                      v-else
                      class="flex aspect-square w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white lg:w-20"
                      :class="isLiveCard(vtuber) ? 'ring-2 ring-danger/60' : 'ring-2 ring-white/40 dark:ring-white/10'"
                    >
                      {{ vtuber.display_name.charAt(0) }}
                    </div>
                    <span
                      v-if="isLiveCard(vtuber)"
                      class="absolute -right-1 -top-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white"
                    >
                      {{ t('web.vtual.public.directory.live') }}
                    </span>
                  </figure>

                  <div class="min-w-0 flex-1 leading-tight">
                    <h3 class="truncate font-bold text-gray-900 group-hover:text-accent dark:text-white lg:text-lg">
                      {{ vtuber.display_name }}
                    </h3>
                    <p v-if="vtuber.bio_snippet" class="mt-1 line-clamp-2 text-sm text-gray">
                      {{ vtuber.bio_snippet }}
                    </p>
                    <div v-if="vtuber.total_subscribers_formatted" class="mt-1 text-sm text-gray">
                      {{ t('web.vtual.public.directory.subscribers', { count: vtuber.total_subscribers_formatted }) }}
                    </div>
                    <div class="mt-2 flex gap-x-2">
                      <span
                        v-for="channel in vtuber.channels"
                        :key="`${vtuber.slug}-${channel.platform_key}-${channel.handle}`"
                        class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
                        :title="channel.handle ?? channel.platform_key ?? ''"
                      >
                        <svg class="aspect-square w-3" fill="currentColor">
                          <use :href="channelIcon(channel.platform_key)"></use>
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </router-link>

              <!-- Live streams (outside the router-link: these are external anchors).
                   Layout is unlayered `.vk-live-row*` in valkivid3.css — Tailwind
                   utilities on `<a>` lose to Bootstrap reboot and shrink-wrap. -->
              <div
                v-if="isLiveCard(vtuber)"
                class="border-t border-gray-500/10 dark:border-gray-500/10"
              >
                <ul
                  v-if="liveItemsFor(vtuber.slug).length > 0"
                  class="vk-live-list divide-y divide-gray-500/10 dark:divide-gray-500/10"
                >
                  <li
                    v-for="(live, li) in liveItemsFor(vtuber.slug).slice(0, 3)"
                    :key="live.url ?? `${live.title}-${li}`"
                    class="vk-live-row"
                  >
                    <a
                      v-if="live.url"
                      :href="live.url"
                      :title="live.title ?? undefined"
                      target="_blank"
                      rel="noopener"
                      class="vk-live-row__link"
                    >
                      <svg class="h-4 w-4 shrink-0 fill-danger" fill="currentColor">
                        <use :href="platformIcon(live.platform_key)"></use>
                      </svg>
                      <span class="vk-live-row__title text-xs font-medium text-gray-900 dark:text-white">
                        {{ live.title }}
                      </span>
                    </a>
                    <div v-else class="vk-live-row__link">
                      <svg class="h-4 w-4 shrink-0 fill-danger" fill="currentColor">
                        <use :href="platformIcon(live.platform_key)"></use>
                      </svg>
                      <span class="vk-live-row__title text-xs font-medium text-gray-900 dark:text-white">
                        {{ live.title }}
                      </span>
                    </div>
                  </li>
                </ul>
                <div v-else class="vk-live-row__link">
                  <span class="relative flex h-2 w-2 shrink-0">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75"></span>
                    <span class="relative inline-flex h-2 w-2 rounded-full bg-danger"></span>
                  </span>
                  <span class="vk-live-row__title text-xs font-bold uppercase text-danger">
                    {{ t('web.vtual.public.live_now.active') }}
                  </span>
                </div>
                <div
                  v-if="liveItemsFor(vtuber.slug).length > 3"
                  class="vk-live-row__link text-xs font-medium text-gray-500"
                >
                  {{ t('web.vtual.public.live_now.more_streams', { count: liveItemsFor(vtuber.slug).length - 3 }) }}
                </div>
              </div>

              <!-- Card footer -->
              <router-link
                :to="`/vtual/vtubers/${vtuber.slug}`"
                class="mt-auto block border-t border-gray-500/20 px-5 py-2.5 text-2xs font-bold uppercase tracking-wider text-gray-500 transition-colors hover:text-accent lg:px-6"
                @mouseenter="prefetchProfile(vtuber.slug)"
              >
                {{ t('web.vtual.public.directory.view_profile') }}
              </router-link>
            </div>
          </article>
        </div>

        <!-- Pagination -->
        <div v-if="pagination && pagination.last_page > 1" class="flex items-center justify-center gap-x-4">
          <button
            type="button"
            class="flex aspect-square w-10 items-center justify-center bg-gray-150 text-gray-900 transition-colors hover:bg-accent hover:text-gray-900 disabled:opacity-30 dark:bg-gray-800 dark:text-white"
            :disabled="pagination.current_page <= 1"
            :aria-label="t('web.vtual.public.directory.prev')"
            @click="goTo(-1)"
          >
            <svg class="h-2.5 w-1.5" fill="currentColor">
              <use :href="`${spriteUrl}#arrow-left-pixel-alt`"></use>
            </svg>
          </button>
          <span class="text-sm font-bold text-gray-500">
            {{ pagination.current_page }} / {{ pagination.last_page }}
          </span>
          <button
            type="button"
            class="flex aspect-square w-10 items-center justify-center bg-gray-150 text-gray-900 transition-colors hover:bg-accent hover:text-gray-900 disabled:opacity-30 dark:bg-gray-800 dark:text-white"
            :disabled="!pagination.has_more"
            :aria-label="t('web.vtual.public.directory.next')"
            @click="goTo(1)"
          >
            <svg class="h-2.5 w-1.5" fill="currentColor">
              <use :href="`${spriteUrl}#arrow-right-pixel-alt`"></use>
            </svg>
          </button>
        </div>
      </template>
    </div>
  </section>
</template>
