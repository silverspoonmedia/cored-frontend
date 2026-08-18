<script setup lang="ts">
import '@/valkivid3/assets/css/valkivid3.css'

import { onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import VkStr1Header from '@/valkivid3/components/str1/VkStr1Header.vue'
import VkStr1MobileMenu from '@/valkivid3/components/str1/VkStr1MobileMenu.vue'
import VkStr1Footer from '@/valkivid3/components/str1/VkStr1Footer.vue'
import { useVkStr1Theme } from '@/valkivid3/composables/useVkStr1Theme'
import bodyBg from '@/valkivid3/assets/img/samples/body-bg-1.jpg'

const route = useRoute()
const { applyTheme, readStoredTheme } = useVkStr1Theme()

applyTheme(readStoredTheme())

onMounted(() => {
  applyTheme(readStoredTheme())
})

// Re-assert html.dark on client-side nav back into /vtual. AdminLTE uses
// data-bs-theme, not html.dark — this only restores Valkivid's own class.
watch(() => route.path, () => {
  applyTheme(readStoredTheme())
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('dark')
})
</script>

<template>
  <div class="vk3-root relative z-10 overflow-x-hidden font-base text-sm font-medium antialiased lg:text-base">
    <div id="site-wrapper" class="flex h-full flex-col">
      <VkStr1Header />
      <VkStr1MobileMenu />

      <main id="main-content" class="grow lg:pt-0">
        <router-view />
      </main>

      <VkStr1Footer />
    </div>

    <!-- Background image layer (vv-body-bg) -->
    <div
      class="vv-body-bg pointer-events-none absolute inset-0 -z-10 max-h-[1144px] bg-cover bg-top bg-no-repeat opacity-10 dark:opacity-100"
      :style="{ backgroundImage: `url(${bodyBg})` }"
    >
      <div class="absolute inset-0 z-[1] bg-black mix-blend-color"></div>
      <div class="absolute inset-0 z-[2] mix-blend-multiply dark:bg-gray-900"></div>
      <div class="absolute inset-0 z-[3] opacity-40 mix-blend-screen dark:bg-gray-600"></div>
    </div>
  </div>
</template>
