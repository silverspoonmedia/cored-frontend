import { backendLocale } from '@/i18n'

export const SPA_REQUEST_HEADER = 'X-SPA-Origin'
export const SPA_REQUEST_HEADER_VALUE = '1'
export const SPA_LOCALE_HEADER = 'X-SPA-Locale'

export function applySpaRequestHeader(headers: Headers): void {
  headers.set(SPA_REQUEST_HEADER, SPA_REQUEST_HEADER_VALUE)
  headers.set(SPA_LOCALE_HEADER, backendLocale())
}
