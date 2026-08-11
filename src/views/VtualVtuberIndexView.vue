<script setup lang="ts">
import Card from '@/components/Card.vue'
</script>

<template>
  <Card title="Vtuber Hub">
    <p class="text-muted">
      Browse and manage vtual creator profiles, channels, and claims.
    </p>
    <div class="d-flex gap-2 flex-wrap">
      <router-link :to="{ name: 'vtual.profiles.index.view' }" class="btn btn-outline-primary btn-sm">
        <i class="bi bi-person-lines-fill me-1"></i> My Profiles
      </router-link>
      <router-link :to="{ name: 'vtual.orphans.index.view' }" class="btn btn-outline-primary btn-sm">
        <i class="bi bi-search me-1"></i> Orphan Creators
      </router-link>
      <router-link :to="{ name: 'vtual.platform-credentials.index.view' }" class="btn btn-outline-primary btn-sm">
        <i class="bi bi-key me-1"></i> Platform Credentials
      </router-link>
    </div>
  </Card>
</template>
