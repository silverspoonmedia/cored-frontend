<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useVkStr1MobileMenu } from '@/valkivid3/composables/useVkStr1MobileMenu'
import { useVkStr1Theme } from '@/valkivid3/composables/useVkStr1Theme'
import { useVkNavigation, isVkNavActive } from '@/valkivid3/composables/useVkNavigation'
import type { NavigationTreeNode } from '@/api/types'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'

const { t } = useI18n()
const route = useRoute()
const { open, close } = useVkStr1MobileMenu()
const { theme, toggleTheme } = useVkStr1Theme()
const { tree, load: loadNav, resolveRoute } = useVkNavigation()

const expanded = ref<Set<string>>(new Set())

const topLevel = computed(() =>
  tree.value.filter((n) => n.type !== 'h'),
)

function toggleExpand(id: string): void {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
  // trigger reactivity
  expanded.value = new Set(expanded.value)
}
</script>

<template>
  <div
    v-if="open"
    class="fixed left-0 top-[64px] z-50 block h-[calc(100dvh-64px)] w-full overflow-auto bg-white py-5 text-primary transition-transform duration-300 dark:bg-gray-700 dark:text-white lg:hidden"
  >
    <div class="container">
      <ul class="flex flex-col gap-y-2 text-lg font-bold">
        <li v-for="node in topLevel" :key="node.id">
          <!-- Parent with children: expand/collapse -->
          <div v-if="node.children.length > 0">
            <button
              type="button"
              class="flex w-full items-center justify-between py-2"
              :class="isVkNavActive(node, route) ? 'text-accent' : ''"
              @click="toggleExpand(node.id)"
            >
              <span>{{ node.name }}</span>
              <span class="text-sm">{{ expanded.has(node.id) ? '−' : '+' }}</span>
            </button>
            <ul v-if="expanded.has(node.id)" class="ml-4 border-l border-gray-150 pl-3 dark:border-gray-600">
              <li v-for="child in node.children" :key="child.id">
                <router-link
                  :to="resolveRoute(child) ?? '#'"
                  class="block py-2 text-base font-medium"
                  :class="isVkNavActive(child, route) ? 'text-accent' : ''"
                  :aria-current="isVkNavActive(child, route) ? 'page' : undefined"
                  @click="close()"
                >
                  {{ child.name }}
                </router-link>
              </li>
            </ul>
          </div>
          <!-- Leaf: router-link -->
          <router-link
            v-else
            :to="resolveRoute(node) ?? '#'"
            class="block py-2"
            :class="isVkNavActive(node, route) ? 'text-accent' : ''"
            :aria-current="isVkNavActive(node, route) ? 'page' : undefined"
            @click="close()"
          >
            {{ node.name }}
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
