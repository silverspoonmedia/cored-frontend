<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError } from '@/api/types'
import type { VtualPublicManagementProfile } from '@/api/types'
import { setDocumentTitleOverride } from '@/composables/usePageTitle'
import { clearHeadMeta, setHeadMeta } from '@/composables/useHeadMeta'
import { useVtualPublic } from '@/valkivid3/composables/useVtualPublic'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'
import socialIconsUrl from '@/valkivid3/assets/img/social-icons.svg'
import { safeHttpUrl, safeImageUrl } from '@/utils/safeUrl'

const route = useRoute()
const { t } = useI18n()
const { fetchManagementProfile, prefetchProfile } = useVtualPublic()

const profile = ref<VtualPublicManagementProfile | null>(null)
const loading = ref(true)
const notFound = ref(false)
const error = ref<string | null>(null)

const slug = computed(() => (typeof route.params.slug === 'string' ? route.params.slug : ''))

const logoUrl = computed(() => safeImageUrl(profile.value?.logo_url))

async function load(): Promise<void> {
  loading.value = true
  notFound.value = false
  error.value = null

  try {
    profile.value = await fetchManagementProfile(slug.value)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      notFound.value = true
      profile.value = null
    } else {
      error.value = e instanceof Error ? e.message : String(e)
    }
  } finally {
    loading.value = false
  }
}

function platformIcon(key: string | null): string {
  if (key === 'youtube') return `${socialIconsUrl}#youtube`
  if (key === 'twitch') return `${socialIconsUrl}#twitch`
  return `${spriteUrl}#plus`
}

watch(slug, () => {
  profile.value = null
  void load()
})

watch(profile, (next) => {
  setDocumentTitleOverride(next ? `${next.name} | vTual | Monolith` : null)
  if (!next) {
    clearHeadMeta()
    return
  }
  const description = (next.description ?? '').trim()
  setHeadMeta({
    title: next.name,
    description:
      description.length > 160
        ? `${description.slice(0, 157)}...`
        : description || t('web.vtual.public.meta.management_description_fallback', { name: next.name }),
    image: logoUrl.value,
    url: window.location.origin + route.path,
    type: 'profile',
  })
})

onMounted(() => {
  void load()
})

onUnmounted(() => {
  setDocumentTitleOverride(null)
  clearHeadMeta()
})
</script>

<template>
  <div class="container pb-20 pt-8 md:pb-24 lg:pb-[120px] lg:pt-12">
    <div v-if="loading" aria-hidden="true">
      <div class="mb-8 flex items-center gap-x-5">
        <div class="aspect-square w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800 lg:w-24"></div>
        <div class="flex-1 space-y-3">
          <div class="h-7 w-1/3 animate-pulse bg-gray-200 dark:bg-gray-800"></div>
          <div class="h-4 w-2/3 animate-pulse bg-gray-200 dark:bg-gray-800"></div>
        </div>
      </div>
      <div class="grid grid-cols-12 gap-5 md:gap-6 lg:gap-7.5">
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
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="notFound" class="py-24 text-center">
      <h1 class="mb-4 text-3xl font-bold tracking-tighter text-gray-900 dark:text-white">
        {{ t('web.vtual.public.management.not_found') }}
      </h1>
      <p class="mb-8 text-gray-500">{{ t('web.vtual.public.management.not_found_body') }}</p>
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
          {{ t('web.vtual.public.management.error') }}
        </p>
        <button
          type="button"
          class="inline-flex bg-accent px-6 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-accent-500 dark:text-gray-900"
          @click="load"
        >
          {{ t('web.vtual.public.management.retry') }}
        </button>
      </div>
    </div>

    <template v-else-if="profile">
      <nav class="mb-8 text-sm font-bold" :aria-label="t('web.vtual.public.management.breadcrumb')">
        <ol class="flex flex-wrap items-center gap-x-2 text-gray-500">
          <li>
            <router-link to="/vtual" class="transition-colors hover:text-accent">
              {{ t('web.vtual.public.nav.home') }}
            </router-link>
          </li>
          <li aria-hidden="true">/</li>
          <li class="text-gray-900 dark:text-white">{{ profile.name }}</li>
        </ol>
      </nav>

      <header class="mb-10 flex flex-col gap-y-6 bg-gray-150 p-6 ring-1 ring-gray-500/20 dark:bg-gray-800 sm:flex-row sm:items-center lg:mb-14 lg:p-8">
        <img
          v-if="logoUrl"
          class="aspect-square w-20 shrink-0 rounded-full object-cover ring-4 ring-white/20 lg:w-24"
          :src="logoUrl ?? undefined"
          :alt="profile.name"
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
        <div
          v-else
          class="flex aspect-square w-20 shrink-0 items-center justify-center rounded-full bg-primary text-3xl font-bold text-white ring-4 ring-white/20 dark:text-gray-900 lg:w-24"
        >
          {{ profile.name.charAt(0) }}
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="text-2xl font-bold tracking-tighter text-gray-900 dark:text-white lg:text-4xl">
            {{ profile.name }}
          </h1>
          <p v-if="profile.description" class="mt-2 text-sm text-gray-600 dark:text-gray-300 lg:text-base">
            {{ profile.description }}
          </p>
          <div v-if="profile.links.length > 0" class="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <a
              v-for="(link, index) in profile.links"
              :key="`${link.kind ?? 'link'}-${index}`"
              :href="safeHttpUrl(link.url) ?? undefined"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm font-bold text-accent transition-colors hover:text-accent-500"
            >
              {{ link.label ?? link.url }}
            </a>
          </div>
        </div>
      </header>

      <section>
        <h2
          class="mb-8 text-2.5xl font-bold tracking-tighter text-gray-900 before:text-accent before:content-['.'] dark:text-white sm:text-3.5xl md:mb-10 md:text-4xl lg:text-[42px] lg:leading-none"
        >
          {{ t('web.vtual.public.management.creators_heading') }}
        </h2>

        <div
          v-if="profile.creators.length === 0"
          class="flex flex-col items-center gap-y-4 bg-gray-150 px-6 py-16 text-center dark:bg-gray-800"
        >
          <p class="font-bold text-gray-900 dark:text-white">
            {{ t('web.vtual.public.management.creators_empty') }}
          </p>
        </div>

        <div v-else class="grid grid-cols-12 gap-5 md:gap-6 lg:gap-7.5">
          <article
            v-for="creator in profile.creators"
            :key="creator.slug"
            class="col-span-full sm:col-span-6 lg:col-span-4"
          >
            <router-link
              :to="`/vtual/vtubers/${creator.slug}`"
              class="group relative block overflow-hidden bg-gray-150 ring-1 ring-gray-500/20 transition-all hover:-translate-y-0.5 hover:ring-accent dark:bg-gray-800"
              @mouseenter="prefetchProfile(creator.slug)"
            >
              <div class="flex items-center gap-x-4 p-5 lg:p-6">
                <figure class="relative shrink-0">
                  <img
                    v-if="safeImageUrl(creator.avatar_url)"
                    class="aspect-square w-16 rounded-full object-cover ring-2 ring-white/40 dark:ring-white/10 lg:w-20"
                    :src="safeImageUrl(creator.avatar_url) ?? undefined"
                    :alt="creator.display_name"
                    loading="lazy"
                    decoding="async"
                  />
                  <div
                    v-else
                    class="flex aspect-square w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white ring-2 ring-white/40 dark:text-gray-900 dark:ring-white/10 lg:w-20"
                  >
                    {{ creator.display_name.charAt(0) }}
                  </div>
                  <span
                    v-if="creator.is_live"
                    class="absolute -end-1 -top-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white"
                  >
                    {{ t('web.vtual.public.directory.live') }}
                  </span>
                </figure>

                <div class="min-w-0 flex-1 leading-tight">
                  <h3 class="truncate font-bold text-gray-900 group-hover:text-accent dark:text-white lg:text-lg">
                    {{ creator.display_name }}
                  </h3>
                  <p v-if="creator.bio_snippet" class="mt-1 line-clamp-2 text-sm text-gray">
                    {{ creator.bio_snippet }}
                  </p>
                  <div v-if="creator.total_subscribers_formatted" class="mt-1 text-sm text-gray">
                    {{ t('web.vtual.public.directory.subscribers', { count: creator.total_subscribers_formatted }) }}
                  </div>
                  <div class="mt-2 flex gap-x-2">
                    <span
                      v-for="channel in creator.channels"
                      :key="`${creator.slug}-${channel.platform_key}-${channel.handle}`"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
                      :title="channel.handle ?? channel.platform_key ?? ''"
                    >
                      <svg class="aspect-square w-3" fill="currentColor">
                        <use :href="platformIcon(channel.platform_key)"></use>
                      </svg>
                    </span>
                  </div>
                </div>
              </div>

              <div
                class="border-t border-gray-500/20 px-5 py-2.5 text-2xs font-bold uppercase tracking-wider text-gray-500 transition-colors group-hover:text-accent lg:px-6"
              >
                {{ t('web.vtual.public.directory.view_profile') }}
              </div>
            </router-link>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>
