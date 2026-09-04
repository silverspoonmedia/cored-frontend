<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { onMounted, onUnmounted } from 'vue'

/**
 * File Hosting workspace switcher dropdown (toolbar, Bootstrap Dropdown).
 * Extracted from FileHostingView: personal/team + microstock slot entries,
 * quota/slots counters, create/buy links.
 */
const props = defineProps<{
  activeWorkspaceId: string | null
  rootLabel: string
  workspaces: Array<{ id: string; name: string; kind: string }>
  quota: { owned_workspace_used: number; owned_workspace_limit: number; can_create_workspace: boolean } | null
  slots: { used: number; limit: number; can_create: boolean; activated: boolean } | null
}>()

const emit = defineEmits<{
  switch: [id: string | null]
  createMicrostock: []
}>()

const { t } = useI18n()

function onSwitch(id: string | null): void {
  emit('switch', id)
}

</script>

<template>
  <div class="dropdown fh-workspace-switcher">
    <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
      <i class="bi me-1" :class="activeWorkspaceId ? 'bi-people' : 'bi-person'"></i>
      <span>{{ rootLabel }}</span>
    </button>
    <div class="dropdown-menu dropdown-menu-end shadow">
      <button class="dropdown-item" :class="{ active: !activeWorkspaceId }" type="button" @click="onSwitch(null)">
        <i class="bi bi-person me-2"></i>{{ t('web.file-hosting.personal') }}
      </button>
      <button
        v-for="ws in workspaces"
        :key="ws.id"
        class="dropdown-item"
        :class="{ active: activeWorkspaceId === ws.id }"
        type="button"
        @click="onSwitch(ws.id)"
      >
        <i class="bi me-2" :class="ws.kind === 'microstock' ? 'bi-stars' : 'bi-people'"></i>{{ ws.name }}
      </button>
      <div class="dropdown-divider"></div>
      <div v-if="quota" class="px-3 py-1 small text-muted">
        {{ t('web.file-hosting.collab.slots_counter', { used: quota.owned_workspace_used, limit: quota.owned_workspace_limit }) }}
      </div>
      <router-link
        v-if="quota?.can_create_workspace"
        class="dropdown-item"
        :to="{ name: 'file-hosting.workspaces.view' }"
      >
        <i class="bi bi-plus-lg me-2"></i>{{ t('web.file-hosting.collab.create_workspace') }}
      </router-link>
      <template v-else-if="quota && !quota.can_create_workspace">
        <span class="dropdown-item disabled text-muted small">
          <i class="bi bi-lock me-2"></i>{{ t('web.file-hosting.collab.slots_full') }}
        </span>
        <router-link class="dropdown-item small" :to="{ name: 'services.index.view' }">
          <i class="bi bi-stars me-2"></i>{{ t('web.file-hosting.collab.buy_slot_cta') }}
        </router-link>
      </template>
      <template v-if="slots">
        <div class="px-3 py-1 small text-muted">
          {{ t('web.file-hosting.microstock.slots_counter', { used: slots.used, limit: slots.limit }) }}
        </div>
        <button
          v-if="slots.can_create"
          class="dropdown-item"
          type="button"
          @click="emit('createMicrostock')"
        >
          <i class="bi bi-images me-2"></i>{{ t('web.file-hosting.microstock.create_workspace') }}
        </button>
        <template v-else-if="slots.activated">
          <span class="dropdown-item disabled text-muted small">
            <i class="bi bi-lock me-2"></i>{{ t('web.file-hosting.microstock.slots_full') }}
          </span>
          <router-link class="dropdown-item small" :to="{ name: 'services.index.view' }">
            <i class="bi bi-stars me-2"></i>{{ t('web.file-hosting.microstock.buy_slot_cta') }}
          </router-link>
        </template>
        <router-link
          v-else
          class="dropdown-item small"
          :to="{ name: 'services.index.view' }"
        >
          <i class="bi bi-stars me-2"></i>{{ t('web.file-hosting.microstock.activate_cta') }}
        </router-link>
      </template>
      <div class="dropdown-divider"></div>
      <router-link class="dropdown-item" :to="{ name: 'file-hosting.workspaces.view' }">
        <i class="bi bi-gear me-2"></i>{{ t('web.file-hosting.manage_workspaces') }}
      </router-link>
    </div>
  </div>
</template>

