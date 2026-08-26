<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import type { NavNode } from '@/types'
import { useTreeview } from '@/composables/useTreeview'
import { isNavNodeActive } from '@/utils/navActive'

const props = withDefaults(defineProps<{
  items: NavNode[]
}>(), {
  items: () => [],
})

const route = useRoute()
const router = useRouter()
const { isOpen, toggle } = useTreeview()

function isActive(node: NavNode): boolean {
  return isNavNodeActive(node, route)
}

function resolveHref(node: NavNode): string {
  if (!node.route || node.route === '#') return '#'
  const target = node.route.endsWith('.view') ? node.route : `${node.route}.view`
  let href = '#'
  if (router.hasRoute(target)) href = router.resolve({ name: target }).href
  else if (router.hasRoute(node.route)) href = router.resolve({ name: node.route }).href
  if (href !== '#' && node.hash) href += node.hash
  return href
}

function handleClick(node: NavNode): void {
  if (!node.route || node.route === '#') return
  if (node.children.length > 0) return
  const target = node.route.endsWith('.view') ? node.route : `${node.route}.view`
  const hash = node.hash ?? undefined
  if (router.hasRoute(target)) {
    router.push({ name: target, hash })
  } else if (router.hasRoute(node.route)) {
    router.push({ name: node.route, hash })
  }
}
</script>

<template>
  <template v-for="item in props.items" :key="item.id">
    <template v-if="item.type === 'h'">
      <li class="nav-header">{{ item.name.toUpperCase() }}</li>
      <NavTree :items="item.children" />
    </template>

    <template v-else-if="item.children.length > 0">
      <li class="nav-item" :class="{ 'menu-open': isOpen(item.id) || isActive(item) }">
        <a
          href="#"
          class="nav-link"
          :class="{ active: isActive(item) }"
          :aria-current="isActive(item) ? 'page' : undefined"
          @click.prevent="toggle(item.id)"
        >
          <i class="nav-icon" :class="item.icon || 'bi bi-circle'" aria-hidden="true"></i>
          <p>
            {{ item.name }}
            <i class="nav-arrow bi bi-chevron-right" aria-hidden="true"></i>
          </p>
        </a>
        <ul class="nav nav-treeview">
          <NavTree :items="item.children" />
        </ul>
      </li>
    </template>

    <template v-else>
      <li class="nav-item">
        <a
          :href="resolveHref(item)"
          class="nav-link"
          :class="{ active: isActive(item) }"
          :aria-current="isActive(item) ? 'page' : undefined"
          @click.prevent="handleClick(item)"
        >
          <i class="nav-icon" :class="item.icon || 'bi bi-circle'" aria-hidden="true"></i>
          <p>{{ item.name }}</p>
        </a>
      </li>
    </template>
  </template>
</template>
