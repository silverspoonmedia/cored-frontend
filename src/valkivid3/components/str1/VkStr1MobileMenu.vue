<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useVkStr1MobileMenu } from '@/valkivid3/composables/useVkStr1MobileMenu'
import { useVkStr1Theme } from '@/valkivid3/composables/useVkStr1Theme'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'

const { t } = useI18n()
const { open, close } = useVkStr1MobileMenu()
const { theme, toggleTheme } = useVkStr1Theme()
</script>

<template>
  <div
    v-if="open"
    class="fixed left-0 top-[64px] z-50 block h-[calc(100dvh-64px)] w-full overflow-auto bg-white py-5 text-primary transition-transform duration-300 dark:bg-gray-700 dark:text-white lg:hidden"
  >
    <div class="container">
      <ul class="flex flex-col gap-y-2 text-lg font-bold">
        <li>
          <router-link to="/vtual" class="block py-2" @click="close()">
            {{ t('web.vtual.public.nav.home') }}
          </router-link>
        </li>
        <li>
          <router-link to="/vtual#vtubers" class="block py-2" @click="close()">
            {{ t('web.vtual.public.nav.directory') }}
          </router-link>
        </li>
        <li>
          <router-link to="/vtual#contents" class="block py-2" @click="close()">
            {{ t('web.vtual.public.nav.contents') }}
          </router-link>
        </li>
        <li>
          <router-link to="/vtual#about" class="block py-2" @click="close()">
            {{ t('web.vtual.public.nav.about') }}
          </router-link>
        </li>
        <li class="mt-4 border-t border-gray-150 pt-4 dark:border-gray-600">
          <button
            type="button"
            role="switch"
            :aria-checked="theme === 'dark'"
            :aria-label="t('web.vtual.public.nav.toggle_theme')"
            class="flex w-full items-center justify-between py-2 text-lg font-bold"
            @click="toggleTheme()"
          >
            <span>{{ t('web.vtual.public.nav.toggle_theme') }}</span>
            <span class="relative inline-flex items-center">
              <span
                class="relative z-10 block h-6 w-11 rounded-full border-2 border-gray-500/60 bg-gray-150 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-gray-900 after:transition-transform dark:border-white/50 dark:bg-white/10 dark:after:bg-white"
                :class="theme === 'dark' ? 'after:translate-x-[20px]' : ''"
              ></span>
              <svg role="img" class="pointer-events-none absolute left-[5px] h-4 w-4 fill-accent stroke-accent">
                <use :href="`${spriteUrl}#sun`"></use>
              </svg>
              <svg role="img" class="pointer-events-none absolute right-[5px] h-4 w-4 fill-accent stroke-accent">
                <use :href="`${spriteUrl}#moon`"></use>
              </svg>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
