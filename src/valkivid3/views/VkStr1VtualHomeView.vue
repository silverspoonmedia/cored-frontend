<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import type { VtualPublicLanding } from '@/api/types'
import { useVtualPublic } from '@/valkivid3/composables/useVtualPublic'
import { clearHeadMeta, setHeadMeta } from '@/composables/useHeadMeta'
import VkStr1HeroSlider from '@/valkivid3/components/str1/VkStr1HeroSlider.vue'
import VkStr1LiveNow from '@/valkivid3/components/str1/VkStr1LiveNow.vue'
import VkStr1PlatformStats from '@/valkivid3/components/str1/VkStr1PlatformStats.vue'
import VkStr1VtuberDirectory from '@/valkivid3/components/str1/VkStr1VtuberDirectory.vue'
import VkStr1VtuberLiveDirectory from '@/valkivid3/components/str1/VkStr1VtuberLiveDirectory.vue'
import VkStr1ContentFeed from '@/valkivid3/components/str1/VkStr1ContentFeed.vue'
import VkStr1SectionEvents from '@/valkivid3/components/str1/VkStr1SectionEvents.vue'
import VkStr1SectionCountdown from '@/valkivid3/components/str1/VkStr1SectionCountdown.vue'
import VkStr1ChannelBanner from '@/valkivid3/components/str1/VkStr1ChannelBanner.vue'

const { t } = useI18n()
const route = useRoute()
const { fetchLanding } = useVtualPublic()

const landing = ref<VtualPublicLanding | null>(null)
const landingFailed = ref(false)

async function loadLanding(): Promise<void> {
  landingFailed.value = false
  try {
    landing.value = await fetchLanding()
  } catch {
    landing.value = null
    landingFailed.value = true
  }
}

onMounted(() => {
  setHeadMeta({
    title: t('web.vtual.public.title'),
    description: t('web.vtual.public.meta.landing_description'),
    url: window.location.origin + route.path,
    type: 'website',
  })
  void loadLanding()
})

onUnmounted(() => {
  clearHeadMeta()
})
</script>

<template>
  <VkStr1HeroSlider />
  <div v-if="landingFailed" class="container pt-12 md:pt-16">
    <div
      class="flex flex-col items-center gap-y-4 bg-gray-150 px-6 py-10 text-center ring-1 ring-gray-500/20 dark:bg-gray-800"
    >
      <p class="font-medium text-gray-600 dark:text-gray-300">
        {{ t('web.vtual.public.landing.error') }}
      </p>
      <button
        type="button"
        class="inline-flex bg-accent px-6 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-accent-500 dark:text-gray-900"
        @click="loadLanding"
      >
        {{ t('web.vtual.public.landing.retry') }}
      </button>
    </div>
  </div>
  <div class="pt-12 md:pt-16 lg:pt-16">
    <VkStr1PlatformStats :stats="landing?.stats ?? null" />
  </div>
  <VkStr1VtuberLiveDirectory :live-items="landing?.live_now ?? null" />
  <VkStr1ContentFeed />
  <VkStr1SectionEvents :events="landing?.events ?? null" :schedule="landing?.schedule ?? null" />
  <VkStr1ChannelBanner />
</template>
