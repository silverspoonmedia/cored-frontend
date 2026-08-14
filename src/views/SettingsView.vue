<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import { useSettings } from '@/composables/useSettings'
import { isSettingsMenuGroup } from '@/utils/settingsGroup'

interface SettingsCard {
  label: string
  icon: string
  group?: string
  to: { name: string; params?: { group: string } }
}

const { t } = useI18n()
const { groups, fetchGroups, loading } = useSettings()

const iconMap: Record<string, string> = {
  platform: 'bi-sliders',
  'file-hosting': 'bi-cloud-upload',
  microstock: 'bi-images',
  vtual: 'bi-broadcast',
  identity: 'bi-person-badge',
}

function groupLabel(slug: string): string {
  const slugKey = slug.replace(/-/g, '_')
  return t(`web.settings.groups.${slugKey}`)
}

const cards = computed<SettingsCard[]>(() => {
  const dynamic: SettingsCard[] = groups.value.map((slug) => ({
    label: groupLabel(slug),
    icon: iconMap[slug] ?? 'bi-gear',
    group: slug,
    to: isSettingsMenuGroup(slug)
      ? { name: `settings.${slug}.view` }
      : { name: 'settings.group.view', params: { group: slug } },
  }))

  const extras: SettingsCard[] = [
    { label: t('web.settings.groups.notification_audiences'), icon: 'bi-bell', to: { name: 'notification-audiences.index.view' } },
    { label: t('web.settings.groups.currencies'), icon: 'bi-currency-exchange', to: { name: 'currencies.index.view' } },
  ]

  return [...dynamic, ...extras]
})

onMounted(fetchGroups)
</script>

<template>
  <Card :title="t('web.settings.title')">
    <p class="text-muted">{{ t('web.settings.subtitle') }}</p>
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>
    <div v-else class="row g-3">
      <div
        v-for="card in cards"
        :key="card.label"
        class="col-12 col-md-6 col-xl-4"
      >
        <router-link
          :to="card.to"
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
