<script setup lang="ts">
defineProps<{
  title?: string
}>()
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
