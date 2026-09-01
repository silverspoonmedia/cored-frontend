<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError } from '@/api/types'
import type { VtualPublicProfile } from '@/api/types'
import { setDocumentTitleOverride } from '@/composables/usePageTitle'
import { useVtualPublic } from '@/valkivid3/composables/useVtualPublic'
import VkStr1VideoCard from '@/valkivid3/components/str1/VkStr1VideoCard.vue'
import VkStr1ProfileSidebar from '@/valkivid3/components/str1/VkStr1ProfileSidebar.vue'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'
import { safeImageUrl } from '@/utils/safeUrl'

const route = useRoute()
const { t } = useI18n()
const { fetchProfile } = useVtualPublic()

const profile = ref<VtualPublicProfile | null>(null)
const loading = ref(true)
const contentsLoading = ref(false)
const notFound = ref(false)
const error = ref<string | null>(null)
const contentsPage = ref(1)

const slug = computed(() => (typeof route.params.slug === 'string' ? route.params.slug : ''))

const bannerUrl = computed(
  () => safeImageUrl(profile.value?.channels.find((channel) => channel.banner_url)?.banner_url),
)

const avatarUrl = computed(() => safeImageUrl(profile.value?.avatar_url))

const contentsPagination = computed(() => profile.value?.contents.pagination ?? null)

const featured = computed(() => {
  if (contentsPage.value !== 1) {
    return null
  }
  return (
    profile.value?.contents.items.find((item) => item.type === 'live' && item.status === 'live') ??
    null
  )
})

const gridContents = computed(() => {
  if (!profile.value) {
    return []
  }
  const items = profile.value.contents.items
  if (!featured.value) {
    return items
  }
  return items.filter((item) => item !== featured.value)
})

async function load(page: number = 1): Promise<void> {
  const isInitial = profile.value === null
  if (isInitial) {
    loading.value = true
  } else {
    contentsLoading.value = true
  }
  notFound.value = false
  error.value = null

  try {
    profile.value = await fetchProfile(slug.value, page)
    contentsPage.value = page
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      notFound.value = true
      profile.value = null
    } else {
      error.value = e instanceof Error ? e.message : String(e)
    }
  } finally {
    loading.value = false
    contentsLoading.value = false
  }
}

function goTo(delta: number): void {
  const pagination = contentsPagination.value
  if (!pagination) {
    return
  }
  const next = contentsPage.value + delta
  if (next < 1 || next > pagination.last_page || contentsLoading.value) {
    return
  }
  void load(next)
}

watch(slug, () => {
  profile.value = null
  contentsPage.value = 1
  void load(1)
})

watch(profile, (next) => {
  setDocumentTitleOverride(next ? `${next.display_name} | vTual | Monolith` : null)
})

onMounted(() => {
  void load(1)
})

onUnmounted(() => {
  setDocumentTitleOverride(null)
})
</script>

<template>
  <div class="container pb-20 pt-8 md:pb-24 lg:pb-[120px] lg:pt-12">
    <div v-if="loading" aria-hidden="true">
      <div class="mb-8 aspect-[1360/320] w-full animate-pulse bg-gray-200 dark:bg-gray-800 lg:mb-12"></div>
      <div class="grid grid-cols-12 gap-x-5 gap-y-12 md:gap-x-6 lg:gap-x-7.5">
        <div class="col-span-full lg:col-span-4">
          <div class="animate-pulse bg-gray-150 p-6 dark:bg-gray-800 lg:p-8">
            <div class="mx-auto mb-6 aspect-square w-28 rounded-full bg-gray-300 dark:bg-gray-700 lg:w-36"></div>
            <div class="mx-auto h-6 w-2/3 bg-gray-300 dark:bg-gray-700"></div>
            <div class="mt-6 space-y-2">
              <div class="h-3 w-full bg-gray-300 dark:bg-gray-700"></div>
              <div class="h-3 w-5/6 bg-gray-300 dark:bg-gray-700"></div>
              <div class="h-3 w-1/2 bg-gray-300 dark:bg-gray-700"></div>
            </div>
          </div>
        </div>
        <div class="col-span-full lg:col-span-8">
          <div class="grid grid-cols-12 gap-5 md:gap-6 lg:gap-7.5">
            <div v-for="n in 6" :key="n" class="col-span-full animate-pulse sm:col-span-6 lg:col-span-4">
              <div class="mb-5 aspect-[370/215] w-full bg-gray-200 dark:bg-gray-800"></div>
              <div class="h-4 w-5/6 bg-gray-200 dark:bg-gray-800"></div>
              <div class="mt-2 h-3 w-1/3 bg-gray-200 dark:bg-gray-800"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="notFound" class="py-24 text-center">
      <h1 class="mb-4 text-3xl font-bold tracking-tighter text-gray-900 dark:text-white">
        {{ t('web.vtual.public.profile.not_found') }}
      </h1>
      <p class="mb-8 text-gray-500">{{ t('web.vtual.public.profile.not_found_body') }}</p>
      <router-link
        to="/vtual"
        class="inline-flex bg-accent px-8 py-4 text-sm font-bold uppercase text-white transition-colors hover:bg-accent-500 dark:text-gray-900"
      >
        {{ t('web.vtual.public.nav.home') }}
      </router-link>
    </div>

    <div v-else-if="error" class="py-24">
      <div
        class="mx-auto flex max-w-xl flex-col items-center gap-y-4 bg-gray-150 px-6 py-10 text-center ring-1 ring-gray-500/20 dark:bg-gray-800"
      >
        <p class="font-medium text-gray-600 dark:text-gray-300">
          {{ t('web.vtual.public.profile.error') }}
        </p>
        <button
          type="button"
          class="inline-flex bg-accent px-6 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-accent-500 dark:text-gray-900"
          @click="load(contentsPage)"
        >
          {{ t('web.vtual.public.profile.retry') }}
        </button>
      </div>
    </div>

    <template v-else-if="profile">
      <nav class="mb-8 text-sm font-bold" :aria-label="t('web.vtual.public.profile.breadcrumb')">
        <ol class="flex flex-wrap items-center gap-x-2 text-gray-500">
          <li>
            <router-link to="/vtual" class="transition-colors hover:text-accent">
              {{ t('web.vtual.public.nav.home') }}
            </router-link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <router-link to="/vtual#vtubers" class="transition-colors hover:text-accent">
              {{ t('web.vtual.public.nav.directory') }}
            </router-link>
          </li>
          <li aria-hidden="true">/</li>
          <li class="text-gray-900 dark:text-white">{{ profile.display_name }}</li>
        </ol>
      </nav>

      <!-- Channel banner: real banner art, or brand gradient fallback -->
      <div class="relative mb-8 overflow-hidden bg-gray-800 lg:mb-12">
        <img
          v-if="bannerUrl"
          class="aspect-[1360/320] w-full object-cover"
          :src="bannerUrl"
          alt=""
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
        <div
          v-else
          class="aspect-[1360/320] w-full bg-gradient-to-br from-primary via-gray-900 to-gray-800"
          aria-hidden="true"
        ></div>
        <div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent"></div>
        <div class="absolute bottom-0 start-0 flex w-full items-end gap-x-4 p-5 lg:p-8">
          <img
            v-if="avatarUrl"
            class="h-16 w-16 rounded-full object-cover ring-4 ring-white/20 lg:h-24 lg:w-24"
            :src="avatarUrl ?? undefined"
            :alt="profile.display_name"
            loading="eager"
            fetchpriority="high"
            decoding="async"
          />
          <div
            v-else
            class="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white dark:text-gray-900 ring-4 ring-white/20 lg:h-24 lg:w-24"
          >
            {{ profile.display_name.charAt(0) }}
          </div>
          <div class="min-w-0 pb-1">
            <div class="flex items-center gap-x-2">
              <h1 class="truncate text-xl font-bold tracking-tighter text-white lg:text-3xl">
                {{ profile.display_name }}
              </h1>
              <span
                v-if="profile.is_live"
                class="rounded-full bg-danger px-2 py-1 text-3xs font-bold uppercase leading-none text-white"
              >
                {{ t('web.vtual.public.profile.live') }}
              </span>
            </div>
            <div class="text-sm font-medium text-white/70">
              {{ t('web.vtual.public.profile.stat_followers') }}:
              {{ profile.total_subscribers_formatted ?? '0' }}
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-x-5 gap-y-12 md:gap-x-6 lg:gap-x-7.5">
        <aside class="col-span-full lg:col-span-4">
          <VkStr1ProfileSidebar :profile="profile" />
        </aside>

        <section class="col-span-full lg:col-span-8">
          <h2
            class="mb-8 text-2.5xl font-bold tracking-tighter text-gray-900 before:text-accent before:content-['.'] dark:text-white sm:text-3.5xl md:mb-10 md:text-4xl lg:text-[42px] lg:leading-none"
          >
            {{ t('web.vtual.public.profile.contents_heading') }}
          </h2>

          <div
            v-if="profile.contents.items.length === 0"
            class="flex flex-col items-center gap-y-4 bg-gray-150 px-6 py-16 text-center dark:bg-gray-800"
          >
            <svg role="img" class="h-10 w-10 fill-gray-300 dark:fill-gray-500">
              <use :href="`${spriteUrl}#play`"></use>
            </svg>
            <p class="font-bold text-gray-900 dark:text-white">
              {{ t('web.vtual.public.profile.contents_empty') }}
            </p>
            <router-link
              to="/vtual#contents"
              class="inline-flex bg-primary px-6 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-primary-500 dark:text-gray-900"
            >
              {{ t('web.vtual.public.profile.contents_browse') }}
            </router-link>
          </div>

          <template v-else>
            <div class="relative" :class="contentsLoading ? 'pointer-events-none opacity-50' : ''">
              <div v-if="featured" class="mb-7.5 grid grid-cols-12 gap-5 md:gap-6 lg:gap-7.5">
                <VkStr1VideoCard :item="featured" featured />
              </div>
              <div v-if="gridContents.length > 0" class="grid grid-cols-12 gap-5 md:gap-6 lg:gap-7.5">
                <VkStr1VideoCard
                  v-for="(item, index) in gridContents"
                  :key="`${item.type ?? 'content'}:${item.url ?? item.title ?? index}`"
                  :item="item"
                />
              </div>
            </div>

            <div
              v-if="contentsPagination && contentsPagination.last_page > 1"
              class="mt-10 flex items-center justify-center gap-x-4"
            >
              <button
                type="button"
                class="flex aspect-square w-10 items-center justify-center bg-gray-150 text-gray-900 transition-colors hover:bg-accent hover:text-white disabled:opacity-30 dark:bg-gray-800 dark:text-white dark:hover:text-gray-900"
                :disabled="contentsPage <= 1 || contentsLoading"
                :aria-label="t('web.vtual.public.contents.prev')"
                @click="goTo(-1)"
              >
                <svg class="h-2.5 w-1.5 rtl:rotate-180" fill="currentColor">
                  <use :href="`${spriteUrl}#arrow-left-pixel-alt`"></use>
                </svg>
              </button>
              <span class="text-sm font-bold text-gray-500">
                {{ contentsPage }} / {{ contentsPagination.last_page }}
              </span>
              <button
                type="button"
                class="flex aspect-square w-10 items-center justify-center bg-gray-150 text-gray-900 transition-colors hover:bg-accent hover:text-white disabled:opacity-30 dark:bg-gray-800 dark:text-white dark:hover:text-gray-900"
                :disabled="!contentsPagination.has_more || contentsLoading"
                :aria-label="t('web.vtual.public.contents.next')"
                @click="goTo(1)"
              >
                <svg class="h-2.5 w-1.5 rtl:rotate-180" fill="currentColor">
                  <use :href="`${spriteUrl}#arrow-right-pixel-alt`"></use>
                </svg>
              </button>
            </div>
          </template>
        </section>
      </div>
    </template>
  </div>
</template>
