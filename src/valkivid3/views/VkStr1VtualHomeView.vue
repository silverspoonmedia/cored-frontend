<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { VtualPublicLanding } from '@/api/types'
import { useVtualPublic } from '@/valkivid3/composables/useVtualPublic'
import VkStr1HeroSlider from '@/valkivid3/components/str1/VkStr1HeroSlider.vue'
import VkStr1LiveNow from '@/valkivid3/components/str1/VkStr1LiveNow.vue'
import VkStr1PlatformStats from '@/valkivid3/components/str1/VkStr1PlatformStats.vue'
import VkStr1VtuberDirectory from '@/valkivid3/components/str1/VkStr1VtuberDirectory.vue'
import VkStr1ContentFeed from '@/valkivid3/components/str1/VkStr1ContentFeed.vue'
import VkStr1SectionEvents from '@/valkivid3/components/str1/VkStr1SectionEvents.vue'
import VkStr1ChannelBanner from '@/valkivid3/components/str1/VkStr1ChannelBanner.vue'

const { fetchLanding } = useVtualPublic()

const landing = ref<VtualPublicLanding | null>(null)

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
  <VkStr1HeroSlider />
  <div class="pt-12 md:pt-16 lg:pt-16">
    <VkStr1LiveNow :items="landing?.live_now ?? null" />
    <VkStr1PlatformStats :stats="landing?.stats ?? null" />
  </div>
  <VkStr1VtuberDirectory />
  <VkStr1ContentFeed />
  <VkStr1SectionEvents :schedule="landing?.schedule ?? null" />
  <VkStr1ChannelBanner />
</template>
