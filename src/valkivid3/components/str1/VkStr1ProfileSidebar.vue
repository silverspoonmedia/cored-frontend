<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { VtualPublicProfile } from '@/api/types'
import { useAuth } from '@/stores/auth'
import VkStr1ChannelCard from '@/valkivid3/components/str1/VkStr1ChannelCard.vue'
import VkStr1DetailsList from '@/valkivid3/components/str1/VkStr1DetailsList.vue'

const props = defineProps<{
  profile: VtualPublicProfile
}>()

const { t } = useI18n()
const { isAuthenticated } = useAuth()

const claimPath = computed(() => `/apps/vtual/vtubers/${props.profile.slug}/claim`)
const guestClaimTo = computed(() => `/login?redirect=${encodeURIComponent(claimPath.value)}`)
</script>

<template>
  <div class="bg-gray-150 p-6 dark:bg-gray-800 lg:p-8">
    <figure class="relative mx-auto mb-6 w-28 lg:w-36">
      <img
        v-if="profile.avatar_url"
        class="aspect-square w-full rounded-full object-cover ring-4 ring-accent/40"
        :src="profile.avatar_url"
        :alt="profile.display_name"
        loading="lazy"
        decoding="async"
      />
      <div
        v-else
        class="flex aspect-square w-full items-center justify-center rounded-full bg-primary text-4xl font-bold text-white ring-4 ring-accent/40"
      >
        {{ profile.display_name.charAt(0) }}
      </div>
      <span
        v-if="profile.is_live"
        class="absolute -right-1 top-0 rounded-full bg-danger px-2 py-1 text-2xs font-bold uppercase text-white"
      >
        {{ t('web.vtual.public.profile.live') }}
      </span>
    </figure>

    <h1 class="text-center text-2xl font-bold tracking-tighter text-gray-900 dark:text-white lg:text-3xl">
      {{ profile.display_name }}
    </h1>

    <VkStr1DetailsList :profile="profile" />

    <p v-if="profile.bio" class="mt-6 text-sm leading-relaxed">
      {{ profile.bio }}
    </p>

    <template v-if="profile.channels.length > 0">
      <h2 class="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-gray-900 before:text-accent before:content-['.'] dark:text-white">
        {{ t('web.vtual.public.profile.channels_heading') }}
      </h2>
      <ul class="flex flex-col gap-2">
        <li v-for="channel in profile.channels" :key="`${channel.platform_key}-${channel.handle}`">
          <VkStr1ChannelCard :channel="channel" />
        </li>
      </ul>
    </template>

    <ul v-if="profile.links.length > 0" class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold">
      <li v-for="link in profile.links" :key="`${link.kind}-${link.url}`">
        <a
          v-if="link.url"
          :href="link.url"
          target="_blank"
          rel="noopener"
          class="text-accent transition-colors hover:text-gray-900 dark:hover:text-white"
        >
          {{ link.label || link.kind }}
        </a>
      </li>
    </ul>

    <div v-if="profile.is_claimable" class="mt-8">
      <p class="mb-4 text-sm">{{ t('web.vtual.public.profile.claim_body') }}</p>
      <router-link
        :to="isAuthenticated ? claimPath : guestClaimTo"
        class="inline-flex w-full justify-center bg-accent px-6 py-4 text-center text-sm font-bold uppercase text-gray-900 transition-colors hover:bg-accent/90"
      >
        {{ t('web.vtual.public.profile.claim_cta') }}
      </router-link>
    </div>
  </div>
</template>
