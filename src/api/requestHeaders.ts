export const SPA_REQUEST_HEADER = 'X-SPA-Origin'
export const SPA_REQUEST_HEADER_VALUE = '1'

export function applySpaRequestHeader(headers: Headers): void {
  headers.set(SPA_REQUEST_HEADER, SPA_REQUEST_HEADER_VALUE)
}
