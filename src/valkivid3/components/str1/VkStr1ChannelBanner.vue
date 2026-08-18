<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/stores/auth'

const { t } = useI18n()
const { isAuthenticated } = useAuth()
</script>

<template>
  <section class="pb-20 md:pb-24 lg:pb-[120px]">
    <div class="container">
      <div
        class="relative isolate overflow-hidden bg-primary px-6 py-10 text-center md:px-12 md:py-14 lg:py-16"
      >
        <div class="relative z-10">
          <div class="mb-2 text-sm font-bold uppercase tracking-wide text-accent md:text-base">
            {{ t('web.vtual.public.channel_banner.eyebrow') }}
          </div>
          <h2
            class="mb-4 text-2xl font-bold tracking-tighter text-white sm:text-3xl md:mb-6 lg:text-5xl lg:leading-none"
          >
            {{ t('web.vtual.public.channel_banner.title') }}
          </h2>
          <p class="mx-auto mb-8 max-w-xl text-sm font-medium leading-relaxed text-white/80 md:text-base">
            {{ t('web.vtual.public.channel_banner.body') }}
          </p>
          <div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <router-link
              :to="isAuthenticated ? '/apps/vtual/profiles' : '/register?redirect=/apps/vtual/profiles'"
              class="inline-flex w-full justify-center bg-accent px-8 py-4 text-center text-sm font-bold uppercase leading-none text-gray-900 transition-colors hover:bg-accent/90 sm:w-auto"
            >
              {{ t('web.vtual.public.channel_banner.cta_claim') }}
            </router-link>
            <a
              href="#vtubers"
              class="inline-flex w-full justify-center px-8 py-4 text-center text-sm font-bold uppercase leading-none text-white ring-1 ring-inset ring-white transition-colors hover:bg-white hover:text-gray-900 sm:w-auto"
            >
              {{ t('web.vtual.public.channel_banner.cta_browse') }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
