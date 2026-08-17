import { showErrorDialog, showInfoToast, showSuccessToast } from '@/lib/swal'

export type AlertType = 'success' | 'error' | 'info'

function push(type: AlertType, message: string): Promise<void> {
  if (type === 'success') {
    showSuccessToast(message)
    return Promise.resolve()
  }
  if (type === 'info') {
    showInfoToast(message)
    return Promise.resolve()
  }
  return showErrorDialog(message)
}

export function useAlert() {
  return {
    push,
    dismiss: (_id?: number): void => {},
    clear: (): void => {},
    success: (msg: string): Promise<void> => push('success', msg),
    error: (msg: string): Promise<void> => push('error', msg),
    info: (msg: string): Promise<void> => push('info', msg),
  }
}
