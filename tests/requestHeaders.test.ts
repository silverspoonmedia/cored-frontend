import { afterEach, describe, expect, it } from 'vitest'
import { ensureLocale, setLocale } from '../src/i18n'
import {
  applySpaRequestHeader,
  SPA_LOCALE_HEADER,
  SPA_REQUEST_HEADER,
  SPA_REQUEST_HEADER_VALUE,
} from '../src/api/requestHeaders'

describe('SPA request marker', () => {
  afterEach(() => {
    setLocale('en', { reload: false })
  })

  it('writes the public marker expected by the API gate', () => {
    setLocale('en', { reload: false })
    const headers = new Headers()

    applySpaRequestHeader(headers)

    expect(headers.get(SPA_REQUEST_HEADER)).toBe(SPA_REQUEST_HEADER_VALUE)
  })

  it('maps SPA zh-CN to canonical backend zh_CN', async () => {
    setLocale('zh-CN', { reload: false })
    // Await the lazy chunk (core + feature messages) so the dynamic import is
    // not left in flight when the test environment tears down.
    await ensureLocale('zh-CN')
    const headers = new Headers()

    applySpaRequestHeader(headers)

    expect(headers.get(SPA_LOCALE_HEADER)).toBe('zh_CN')
  })

  it('uses active locale for every request', async () => {
    setLocale('ar', { reload: false })
    await ensureLocale('ar')
    const headers = new Headers()

    applySpaRequestHeader(headers)

    expect(headers.get(SPA_LOCALE_HEADER)).toBe('ar')
  })
})
