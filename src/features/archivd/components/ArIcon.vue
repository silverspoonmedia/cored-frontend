<script setup lang="ts">
const props = withDefaults(defineProps<{
  mime?: string | null
  isFolder?: boolean
}>(), {
  mime: null,
  isFolder: false,
})

function iconClass(mime: string | null | undefined, isFolder: boolean): string {
  if (isFolder) return 'bi-folder-fill ar-icon--folder'
  const m = String(mime || '')
  if (m.startsWith('image/')) return 'bi-file-earmark-image ar-icon--image'
  if (m.startsWith('video/')) return 'bi-file-earmark-play ar-icon--video'
  if (m.startsWith('audio/')) return 'bi-file-earmark-music ar-icon--audio'
  if (m.includes('pdf')) return 'bi-file-earmark-pdf ar-icon--pdf'
  if (m.includes('zip') || m.includes('compressed') || m.includes('tar') || m.includes('gz')) return 'bi-file-earmark-zip ar-icon--archive'
  if (m.includes('spreadsheet') || m.includes('excel') || m.includes('csv')) return 'bi-file-earmark-spreadsheet ar-icon--sheet'
  if (m.includes('word') || m.includes('document')) return 'bi-file-earmark-word ar-icon--doc'
  if (m.includes('javascript') || m.includes('typescript') || m.includes('json') || m.includes('xml') || m.includes('html') || m.includes('css') || m.includes('python') || m.includes('php') || m.includes('java') || m.includes('rust') || m.includes('go')) return 'bi-file-earmark-code ar-icon--code'
  if (m.includes('text') || m.includes('plain')) return 'bi-file-earmark-text ar-icon--file'
  return 'bi-file-earmark ar-icon--file'
}
</script>

<template>
  <i
    class="bi"
    :class="iconClass(props.mime, props.isFolder)"
    aria-hidden="true"
  />
</template>
