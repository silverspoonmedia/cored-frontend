<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppAlert from '@/components/AppAlert.vue'

defineProps<{
  title?: string
  heading?: string
}>()

const router = useRouter()
</script>

<template>
  <div class="login-box">
    <div class="login-logo">
      <a href="#" @click.prevent="router.push({ name: 'login' })"><strong>Mono</strong>lith</a>
    </div>
    <div class="card">
      <div class="card-body login-card-body" id="main-content">
        <p v-if="heading" class="login-box-msg">{{ heading }}</p>

        <AppAlert />
        <router-view />
      </div>
    </div>
  </div>
</template>
