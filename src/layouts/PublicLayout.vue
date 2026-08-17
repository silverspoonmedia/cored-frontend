<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

defineProps<{
  title?: string
}>()

onMounted(() => {
  let el = document.querySelector('meta[name="robots"]')
  if (!(el instanceof HTMLMetaElement)) {
    el = document.createElement('meta')
    el.setAttribute('name', 'robots')
    document.head.appendChild(el)
  }
  el.setAttribute('content', 'noindex, nofollow')
})

onUnmounted(() => {
  document.querySelector('meta[name="robots"]')?.remove()
})
</script>

<template>
  <div id="main-content" class="fh-public-wrapper" data-bs-theme="dark">
    <router-view />
  </div>
</template>

<style scoped>
.fh-public-wrapper {
  min-height: 100vh;
  background: var(--bs-body-bg, #1a1d20);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
</style>
