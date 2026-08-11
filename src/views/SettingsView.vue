<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from '@/components/Card.vue'
import { useSettings } from '@/composables/useSettings'

interface SettingsCard {
  label: string
  icon: string
  group?: string
  route: string
}

const { groups, fetchGroups, loading } = useSettings()

const iconMap: Record<string, string> = {
  platform: 'bi-sliders',
  'file-hosting': 'bi-cloud-upload',
  microstock: 'bi-images',
  vtual: 'bi-broadcast',
}

function humanize(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const cards = computed<SettingsCard[]>(() => {
  const dynamic: SettingsCard[] = groups.value.map((slug) => ({
    label: humanize(slug),
    icon: iconMap[slug] ?? 'bi-gear',
    group: slug,
    route: 'settings.group.view',
  }))

  const extras: SettingsCard[] = [
    { label: 'Notification Audiences', icon: 'bi-bell', route: 'notification-audiences.index.view' },
    { label: 'Currencies', icon: 'bi-currency-exchange', route: 'currencies.index.view' },
  ]

  return [...dynamic, ...extras]
})

onMounted(fetchGroups)
</script>

<template>
  <Card title="Settings">
    <p class="text-muted">Manage platform configuration and domain access.</p>
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>
    <div v-else class="row g-3">
      <div
        v-for="card in cards"
        :key="card.label"
        class="col-12 col-md-6 col-xl-4"
      >
        <router-link
          v-if="card.group"
          :to="{ name: card.route, params: { group: card.group } }"
          class="card h-100 shadow-sm text-decoration-none text-body"
        >
          <div class="card-body d-flex align-items-center gap-3">
            <i class="bi" :class="card.icon" style="font-size: 1.5rem;" aria-hidden="true"></i>
            <span class="fw-semibold">{{ card.label }}</span>
          </div>
        </router-link>
        <router-link
          v-else
          :to="{ name: card.route }"
          class="card h-100 shadow-sm text-decoration-none text-body"
        >
          <div class="card-body d-flex align-items-center gap-3">
            <i class="bi" :class="card.icon" style="font-size: 1.5rem;" aria-hidden="true"></i>
            <span class="fw-semibold">{{ card.label }}</span>
          </div>
        </router-link>
      </div>
    </div>
  </Card>
</template>
