<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVkNavigation } from '@/valkivid3/composables/useVkNavigation'
import VkStr1Logo from '@/valkivid3/components/str1/VkStr1Logo.vue'

const { t } = useI18n()
const { tree, load: loadNav, resolveRoute } = useVkNavigation()

const leafNodes = computed(() =>
  tree.value.filter((n) => n.type !== 'h' && n.children.length === 0),
)

onMounted(() => {
  void loadNav()
})
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
              <li v-for="node in leafNodes" :key="node.id">
                <router-link
                  :to="resolveRoute(node) ?? '#'"
                  class="text-gray-900 transition-colors hover:text-accent dark:text-white"
                >
                  {{ node.name }}
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
