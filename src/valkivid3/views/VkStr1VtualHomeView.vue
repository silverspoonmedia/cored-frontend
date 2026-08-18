<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { VtualPublicLanding } from '@/api/types'
import { useVtualPublic } from '@/valkivid3/composables/useVtualPublic'
import VkStr1HeroSlider, {
  type VkStr1HeroSpotlight,
} from '@/valkivid3/components/str1/VkStr1HeroSlider.vue'
import VkStr1LiveNow from '@/valkivid3/components/str1/VkStr1LiveNow.vue'
import VkStr1SectionCountdown from '@/valkivid3/components/str1/VkStr1SectionCountdown.vue'
import VkStr1PlatformStats from '@/valkivid3/components/str1/VkStr1PlatformStats.vue'
import VkStr1VtuberDirectory from '@/valkivid3/components/str1/VkStr1VtuberDirectory.vue'
import VkStr1ContentFeed from '@/valkivid3/components/str1/VkStr1ContentFeed.vue'
import VkStr1SectionEvents from '@/valkivid3/components/str1/VkStr1SectionEvents.vue'
import VkStr1ChannelBanner from '@/valkivid3/components/str1/VkStr1ChannelBanner.vue'

const { t } = useI18n()
const { fetchLanding } = useVtualPublic()

const landing = ref<VtualPublicLanding | null>(null)

// Hero slide 2 spotlight: latest live content when available.
const spotlight = computed<VkStr1HeroSpotlight | null>(() => {
  const live = landing.value?.live_now?.[0]
  if (!live || !live.title) {
    return null
  }
  return {
    kicker: live.creator?.display_name
      ? t('web.vtual.public.hero.spotlight_kicker_live', { name: live.creator.display_name })
      : t('web.vtual.public.hero.two.kicker'),
    title: live.title,
    url: live.url,
    cta: t('web.vtual.public.hero.spotlight_cta'),
    image_url: live.thumbnail_url,
  }
})

onMounted(() => {
  fetchLanding()
    .then((data) => {
      landing.value = data
    })
    .catch(() => {
      // Every section has a static/i18n fallback — landing failure never blanks the page.
      landing.value = null
    })
})
</script>

<template>
  <VkStr1HeroSlider :spotlight="spotlight" />
  <VkStr1LiveNow :items="landing?.live_now ?? null" />
  <VkStr1SectionCountdown
    :target-date="landing?.event?.starts_at ?? null"
    :event-title="landing?.event?.title ?? null"
    :event-body="landing?.event?.body ?? null"
  />
  <VkStr1PlatformStats :stats="landing?.stats ?? null" />
  <VkStr1VtuberDirectory />
  <VkStr1ContentFeed />
  <VkStr1SectionEvents :schedule="landing?.schedule ?? null" />
  <VkStr1ChannelBanner />
</template>
