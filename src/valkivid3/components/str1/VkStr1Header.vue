<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/stores/auth'
import { useVkStr1MobileMenu } from '@/valkivid3/composables/useVkStr1MobileMenu'
import { useVkStr1Theme } from '@/valkivid3/composables/useVkStr1Theme'
import VkStr1Logo from '@/valkivid3/components/str1/VkStr1Logo.vue'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'

const { t } = useI18n()
const { isAuthenticated } = useAuth()
const { toggle } = useVkStr1MobileMenu()
const { theme, toggleTheme } = useVkStr1Theme()
</script>

<template>
  <div class="header-wrapper text-white">
    <header id="site-header" class="text-white">
      <div class="mx-auto max-w-[1360px] px-5">
        <nav class="flex min-h-[64px] items-center gap-x-6 py-1 lg:min-h-[90px] lg:gap-x-11 lg:py-4">
          <VkStr1Logo />

          <!-- Desktop nav -->
          <ul class="hidden text-sm font-bold lg:flex lg:gap-x-0 xl:gap-x-6">
            <li>
              <router-link
                to="/vtual"
                class="group relative inline-flex items-center gap-x-3 px-3.5 leading-10 text-gray-900 after:absolute after:left-0 after:top-[15px] after:h-[9px] after:w-1.5 after:origin-left after:scale-x-100 after:bg-current-marker-dark after:transition-transform dark:text-white dark:after:bg-current-marker xl:px-4.5"
              >
                {{ t('web.vtual.public.nav.home') }}
              </router-link>
            </li>
            <li>
              <router-link
                to="/vtual#vtubers"
                class="group relative inline-flex items-center gap-x-3 px-3.5 leading-10 text-gray-900 after:absolute after:left-0 after:top-[15px] after:h-[9px] after:w-1.5 after:origin-right after:scale-x-0 after:bg-current-marker-dark after:transition-transform hover:after:origin-left hover:after:scale-x-100 dark:text-white dark:after:bg-current-marker xl:px-4.5"
              >
                {{ t('web.vtual.public.nav.directory') }}
              </router-link>
            </li>
            <li>
              <router-link
                to="/vtual#contents"
                class="group relative inline-flex items-center gap-x-3 px-3.5 leading-10 text-gray-900 after:absolute after:left-0 after:top-[15px] after:h-[9px] after:w-1.5 after:origin-right after:scale-x-0 after:bg-current-marker-dark after:transition-transform hover:after:origin-left hover:after:scale-x-100 dark:text-white dark:after:bg-current-marker xl:px-4.5"
              >
                {{ t('web.vtual.public.nav.contents') }}
              </router-link>
            </li>
          </ul>

          <!-- Controls -->
          <div class="-mr-3 ml-auto flex">
            <!-- Dark/light switcher -->
            <div class="flex items-center px-1 py-4 sm:px-2">
              <button
                type="button"
                role="switch"
                :aria-checked="theme === 'dark'"
                :aria-label="t('web.vtual.public.nav.toggle_theme')"
                class="relative inline-flex cursor-pointer items-center"
                @click="toggleTheme()"
              >
                <span
                  class="relative z-10 block h-6 w-11 rounded-full border-2 border-gray-500/60 bg-gray-150 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-gray-900 after:transition-transform dark:border-white/50 dark:bg-white/10 dark:after:bg-white"
                  :class="theme === 'dark' ? 'after:translate-x-[20px]' : ''"
                ></span>
                <svg role="img" class="pointer-events-none absolute left-[5px] top-1 h-4 w-4 fill-accent stroke-accent">
                  <use :href="`${spriteUrl}#sun`"></use>
                </svg>
                <svg role="img" class="pointer-events-none absolute right-[5px] top-1 h-4 w-4 fill-accent stroke-accent">
                  <use :href="`${spriteUrl}#moon`"></use>
                </svg>
              </button>
            </div>

            <!-- Account -->
            <router-link
              :to="isAuthenticated ? '/apps/vtual/profiles' : '/login'"
              class="block px-2 py-4 xl:px-3"
              :aria-label="isAuthenticated ? t('web.vtual.public.nav.my_profiles') : t('web.vtual.public.nav.login')"
            >
              <svg role="img" class="h-6 w-6 fill-gray-900 dark:fill-white">
                <use :href="`${spriteUrl}#user`"></use>
              </svg>
            </router-link>

            <!-- Mobile menu toggle -->
            <button
              type="button"
              class="-mr-2 inline-flex px-2 py-4 sm:px-3 lg:hidden xl:px-4"
              :aria-label="t('web.vtual.public.nav.toggle_menu')"
              @click="toggle()"
            >
              <svg role="img" class="h-6 w-6 fill-gray-900 dark:fill-white" viewBox="0 0 24 24">
                <path d="M3 6h18v2H3V6zm4 5h14v2H7v-2zm-4 5h18v2H3v-2z" />
              </svg>
            </button>
          </div>
        </nav>
      </div>
    </header>
  </div>
</template>
