<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isRtl } from '@/i18n'
import type { FhFolder, HostedFile } from '@/api/types'

/**
 * File Hosting context menu. Extracted from FileHostingView.
 * Mirrors under RTL and keeps itself on-screen near the viewport edge.
 */
export interface ContextMenuState {
  x: number
  y: number
  entity: 'folder' | 'file'
  item: FhFolder | HostedFile
}

const props = defineProps<{
  state: ContextMenuState
  canEdit: boolean
  canDelete: boolean
  isMicrostock: boolean
}>()

const emit = defineEmits<{
  action: [action: 'open' | 'rename' | 'move' | 'share' | 'delete' | 'review']
  close: []
}>()

const { t } = useI18n()

// Mirror the popup under RTL and keep it on-screen near the viewport edge.
const CONTEXT_MENU_WIDTH = 220

const style = computed(() => {
  const x = Math.min(props.state.x, window.innerWidth - CONTEXT_MENU_WIDTH)
  if (isRtl()) {
    return { insetInlineStart: `${Math.max(0, window.innerWidth - props.state.x - CONTEXT_MENU_WIDTH)}px`, top: `${props.state.y}px` }
  }
  return { insetInlineStart: `${Math.max(0, x)}px`, top: `${props.state.y}px` }
})

function run(action: 'open' | 'rename' | 'move' | 'share' | 'delete' | 'review'): void {
  emit('action', action)
}
</script>

<template>
  <div
    class="fh-context-menu"
    role="menu"
    :style="style"
    @click.stop
  >
    <button type="button" class="fh-context-menu__item" @click="run('open')"><i class="bi bi-folder2-open"></i>{{ t('web.file-hosting.open') }}</button>
    <button v-if="canEdit" type="button" class="fh-context-menu__item" @click="run('rename')"><i class="bi bi-pencil"></i>{{ t('web.file-hosting.rename') }}</button>
    <button v-if="canEdit" type="button" class="fh-context-menu__item" @click="run('move')"><i class="bi bi-folder-symlink"></i>{{ t('web.file-hosting.move') }}</button>
    <button v-if="canEdit" type="button" class="fh-context-menu__item" @click="run('share')"><i class="bi bi-share"></i>{{ t('web.file-hosting.share') }}</button>
    <button
      v-if="isMicrostock && state.entity === 'file'"
      type="button"
      class="fh-context-menu__item"
      @click="run('review')"
    >
      <i class="bi bi-stars"></i>{{ t('web.file-hosting.microstock.review') }}
    </button>
    <button v-if="canDelete" type="button" class="fh-context-menu__item is-danger" @click="run('delete')"><i class="bi bi-trash"></i>{{ t('web.file-hosting.delete') }}</button>
  </div>
</template>
