import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  backendLocale,
  intlLocale,
  preloadLocale,
  setLocale,
  spaLocale,
  translationsSettled,
  type AppLocale,
} from '../src/i18n'

const originalWindow = globalThis.window
const originalDocument = globalThis.document

function installDom(): { attributes: Record<string, string> } {
  const attributes: Record<string, string> = {}
  const storage = new Map<string, string>()
  const documentElement = {
    setAttribute: (name: string, value: string) => {
      attributes[name] = value
    },
  }

  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    location: { reload: vi.fn() },
  })
  vi.stubGlobal('document', { documentElement })

  return { attributes }
}

afterEach(async () => {
  // `setLocale` starts a detached dynamic import. Awaiting every load before the
  // environment goes away is what keeps a slow CI runner from resolving one
  // after teardown, which Vitest reports as an unhandled error on a green run.
  await translationsSettled()
  if (originalWindow === undefined) delete (globalThis as Record<string, unknown>).window
  else vi.stubGlobal('window', originalWindow)
  if (originalDocument === undefined) delete (globalThis as Record<string, unknown>).document
  else vi.stubGlobal('document', originalDocument)
})

describe('locale mapping', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it.each([
    ['en', 'en'],
    ['id', 'id'],
  ] as Array<[AppLocale, string]>)('maps %s to backend %s', (locale, expected) => {
    expect(backendLocale(locale)).toBe(expected)
  })

  it('rejects the locales this build no longer ships', () => {
    // The backend packs for these were retired; resolving one here would send a
    // `SPA_LOCALE` header the API cannot answer.
    for (const retired of ['ja', 'ko', 'zh-CN', 'zh_CN', 'ar', 'ru']) {
      expect(spaLocale(retired)).toBeNull()
    }
  })

  it('rejects unsupported locale values', () => {
    expect(spaLocale('fr')).toBeNull()
    expect(intlLocale('fr')).toBe('en')
  })
})

describe('locale presentation', () => {
  it('sets browser lang and a left-to-right direction', () => {
    const dom = installDom()

    // `setLocale` persists the choice, stamps `lang`/`dir` and only then asks for
    // the copy, so the direction attributes are asserted on the synchronous path.
    // The load it starts is awaited by the `afterEach` settle, never raced.
    setLocale('id')
    expect(dom.attributes).toEqual({ lang: 'id', dir: 'ltr' })

    setLocale('en')
    expect(dom.attributes).toEqual({ lang: 'en', dir: 'ltr' })
  })

  it('keeps the document untouched when the locale is preloaded first', async () => {
    const dom = installDom()

    await preloadLocale('id')
    setLocale('id')

    expect(dom.attributes).toEqual({ lang: 'id', dir: 'ltr' })
  })
})
