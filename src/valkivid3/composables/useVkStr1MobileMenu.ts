import { ref } from 'vue'

const open = ref(false)

export function useVkStr1MobileMenu() {
  function toggle(): void {
    open.value = !open.value
  }

  function close(): void {
    open.value = false
  }

  return { open, toggle, close }
}
