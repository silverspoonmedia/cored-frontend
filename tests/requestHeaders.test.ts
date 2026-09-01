import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/i18n'
import {
  applySpaRequestHeader,
  SPA_LOCALE_HEADER,
  SPA_REQUEST_HEADER,
  SPA_REQUEST_HEADER_VALUE,
} from '../src/api/requestHeaders'

describe('SPA request marker', () => {
  it('writes the public marker expected by the API gate', () => {
    setLocale('en')
    const headers = new Headers()

    applySpaRequestHeader(headers)

    expect(headers.get(SPA_REQUEST_HEADER)).toBe(SPA_REQUEST_HEADER_VALUE)
  })

  it('maps SPA zh-CN to canonical backend zh_CN', () => {
    setLocale('zh-CN')
    const headers = new Headers()

    applySpaRequestHeader(headers)

    expect(headers.get(SPA_LOCALE_HEADER)).toBe('zh_CN')
  })

  it('uses active locale for every request', () => {
    setLocale('ar')
    const headers = new Headers()

    applySpaRequestHeader(headers)

    expect(headers.get(SPA_LOCALE_HEADER)).toBe('ar')
  })
})
