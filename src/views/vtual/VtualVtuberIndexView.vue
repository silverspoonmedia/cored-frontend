<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'

const { t } = useI18n()
</script>

<template>
  <Card :title="t('web.vtual-vtuber.hub_title')">
    <p class="text-muted">
      {{ t('web.vtual-vtuber.hub_subtitle') }}
    </p>
    <div class="d-flex gap-2 flex-wrap">
      <router-link :to="{ name: 'vtual.profiles.index.view' }" class="btn btn-outline-primary btn-sm">
        <i class="bi bi-person-lines-fill me-1"></i> {{ t('web.vtual-vtuber.my_profiles') }}
      </router-link>
      <router-link :to="{ name: 'vtual.orphans.index.view' }" class="btn btn-outline-primary btn-sm">
        <i class="bi bi-search me-1"></i> {{ t('web.vtual-vtuber.orphan_creators') }}
      </router-link>
      <router-link :to="{ name: 'vtual.platform-credentials.index.view' }" class="btn btn-outline-primary btn-sm">
        <i class="bi bi-key me-1"></i> {{ t('web.vtual-vtuber.platform_credentials') }}
      </router-link>
    </div>
  </Card>
</template>
