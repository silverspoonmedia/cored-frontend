type Translator = (key: string) => string

export const FALLBACK_KEYS = {
  validationFailed: 'ui.ajax.validation_failed',
  requestFailed: 'ui.ajax.request_failed',
  sessionExpired: 'ui.ajax.session_expired',
  confirmTitle: 'ui.dialog.confirm_title',
  confirmMessage: 'ui.dialog.confirm_message',
  confirmAction: 'ui.dialog.confirm',
  cancelAction: 'ui.actions.cancel',
  saveAction: 'ui.actions.save',
} as const

export function translateFallback(
  t: Translator,
  key: keyof typeof FALLBACK_KEYS,
): string {
  return t(FALLBACK_KEYS[key])
}
