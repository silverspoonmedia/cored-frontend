import Swal, { type SweetAlertIcon } from 'sweetalert2'
import i18n from '@/i18n'

function t(key: string): string {
  return i18n.global.t(key)
}

export const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  timer: 4000,
  timerProgressBar: true,
  showConfirmButton: false,
})

export function showSuccessToast(message: string): void {
  void toast.fire({ icon: 'success', title: message })
}

export function showInfoToast(message: string): void {
  void toast.fire({ icon: 'info', title: message })
}

// Closing a swal modal strips the `swal2-toast-shown` body class unconditionally,
// which makes any still-open toast container fall back to full-viewport width.
// Serialize: close an open toast before firing a modal so they never overlap.
export function closeActiveToast(): void {
  const popup = document.querySelector('.swal2-popup.swal2-toast')
  if (popup) Swal.close()
}

export function showErrorDialog(message: string, title?: string): Promise<void> {
  closeActiveToast()
  return Swal.fire({
    icon: 'error',
    title: title || t('ui.dialog.error_title'),
    text: message,
    confirmButtonText: t('ui.swal.ok'),
  }).then(() => undefined)
}

export interface ConfirmDialogOptions {
  title?: string
  text?: string
  html?: string
  confirmText?: string
  cancelText?: string
  icon?: SweetAlertIcon
  danger?: boolean
}

export async function confirmDialog(options: ConfirmDialogOptions = {}): Promise<boolean> {
  closeActiveToast()
  const result = await Swal.fire({
    icon: options.icon ?? 'warning',
    title: options.title ?? t('ui.dialog.confirm_title'),
    text: options.html ? undefined : (options.text ?? t('ui.dialog.confirm_message')),
    html: options.html,
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? t('ui.dialog.confirm'),
    cancelButtonText: options.cancelText ?? t('ui.swal.cancel'),
    customClass: {
      confirmButton: `btn ${options.danger === false ? 'btn-primary' : 'btn-danger'}`,
      cancelButton: 'btn btn-outline-secondary',
    },
    buttonsStyling: false,
    reverseButtons: true,
  })
  return result.isConfirmed
}
