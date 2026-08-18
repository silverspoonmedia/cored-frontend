<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import VkStr1Logo from '@/valkivid3/components/str1/VkStr1Logo.vue'

const { t } = useI18n()
</script>

<template>
  <footer id="site-footer">
    <div class="container">
      <div
        class="grid grid-cols-12 gap-x-5 gap-y-9 border-t border-gray-500/20 py-16 md:gap-x-6 lg:gap-x-7.5 lg:pb-[66px] lg:pt-[75px]"
      >
        <div class="col-span-full lg:col-span-2">
          <VkStr1Logo />
        </div>

        <div class="col-span-full lg:col-span-6">
          <nav :aria-label="t('web.vtual.public.footer.nav_label')">
            <ul class="flex flex-wrap gap-x-8 gap-y-3 text-sm font-bold">
              <li>
                <router-link to="/vtual" class="text-gray-900 transition-colors hover:text-accent dark:text-white">
                  {{ t('web.vtual.public.nav.home') }}
                </router-link>
              </li>
              <li>
                <router-link to="/vtual#vtubers" class="text-gray-900 transition-colors hover:text-accent dark:text-white">
                  {{ t('web.vtual.public.nav.directory') }}
                </router-link>
              </li>
              <li>
                <router-link to="/vtual#contents" class="text-gray-900 transition-colors hover:text-accent dark:text-white">
                  {{ t('web.vtual.public.nav.contents') }}
                </router-link>
              </li>
              <li>
                <router-link to="/vtual#about" class="text-gray-900 transition-colors hover:text-accent dark:text-white">
                  {{ t('web.vtual.public.nav.about') }}
                </router-link>
              </li>
            </ul>
          </nav>
        </div>

        <div class="col-span-full lg:col-span-4 lg:text-right">
          <p class="text-sm leading-relaxed">
            {{ t('web.vtual.public.footer.tagline') }}
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>
