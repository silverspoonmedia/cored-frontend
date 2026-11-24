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

  it('sends the canonical backend code for Indonesian', async () => {
    setLocale('id', { reload: false })
    // Await the lazy chunk (core + feature messages) so the dynamic import is
    // not left in flight when the test environment tears down.
    await ensureLocale('id')
    const headers = new Headers()

    applySpaRequestHeader(headers)

    expect(headers.get(SPA_LOCALE_HEADER)).toBe('id')
  })

  it('uses active locale for every request', async () => {
    setLocale('id', { reload: false })
    await ensureLocale('id')
    const headers = new Headers()

    applySpaRequestHeader(headers)

    expect(headers.get(SPA_LOCALE_HEADER)).toBe('id')
  })
})
