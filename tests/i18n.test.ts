import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  backendLocale,
  intlLocale,
  setLocale,
  spaLocale,
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

afterEach(() => {
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
    ['ja', 'ja'],
    ['ko', 'ko'],
    ['zh-CN', 'zh_CN'],
    ['ar', 'ar'],
    ['ru', 'ru'],
  ] as Array<[AppLocale, string]>)('maps %s to backend %s', (locale, expected) => {
    expect(backendLocale(locale)).toBe(expected)
  })

  it('maps the canonical backend Chinese code back to SPA form', () => {
    expect(spaLocale('zh_CN')).toBe('zh-CN')
    expect(intlLocale('zh_CN')).toBe('zh-CN')
  })

  it('rejects unsupported locale values', () => {
    expect(spaLocale('fr')).toBeNull()
    expect(intlLocale('fr')).toBe('en')
  })
})

describe('locale presentation', () => {
  it('sets browser lang and RTL only for Arabic', () => {
    const dom = installDom()

    setLocale('ar')
    expect(dom.attributes).toEqual({ lang: 'ar', dir: 'rtl' })

    setLocale('zh-CN')
    expect(dom.attributes).toEqual({ lang: 'zh-CN', dir: 'ltr' })
  })
})
