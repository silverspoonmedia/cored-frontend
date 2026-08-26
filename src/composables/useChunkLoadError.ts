import { ref } from 'vue'

const chunkLoadFailed = ref(false)

export function useChunkLoadError() {
  return { chunkLoadFailed }
}

export function markChunkLoadFailed(): void {
  chunkLoadFailed.value = true
}
