import { ref } from 'vue'

export type AlertType = 'success' | 'error' | 'info'

export interface AlertItem {
  id: number
  type: AlertType
  message: string
}

const alerts = ref<AlertItem[]>([])
let nextId = 1

function push(type: AlertType, message: string, timeout = 0): void {
  const id = nextId++
  alerts.value.push({ id, type, message })

  if (timeout > 0) {
    setTimeout(() => dismiss(id), timeout)
  }
}

function dismiss(id: number): void {
  const idx = alerts.value.findIndex((a) => a.id === id)
  if (idx !== -1) alerts.value.splice(idx, 1)
}

function clear(): void {
  alerts.value = []
}

export function useAlert() {
  return {
    alerts,
    push,
    dismiss,
    clear,
    success: (msg: string, timeout = 5000) => push('success', msg, timeout),
    error: (msg: string, timeout = 0) => push('error', msg, timeout),
    info: (msg: string, timeout = 5000) => push('info', msg, timeout),
  }
}
