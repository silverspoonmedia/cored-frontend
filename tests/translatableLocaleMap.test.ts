import { describe, expect, it } from 'vitest'
import { normalizeTranslatableMap, translatableValue } from '../src/i18n'

describe('normalizeTranslatableMap', () => {
  it('passes one-to-one locale keys through unchanged', () => {
    expect(normalizeTranslatableMap({
      en: 'Workspace',
      id: 'Ruang Kerja',
      ja: 'ワークスペース',
      ar: 'مساحة العمل',
      ru: 'Рабочая область',
    })).toEqual({
      en: 'Workspace',
      id: 'Ruang Kerja',
      ja: 'ワークスペース',
      ar: 'مساحة العمل',
      ru: 'Рабочая область',
    })
  })

  it('converts SPA zh-CN keys to backend zh_CN', () => {
    expect(normalizeTranslatableMap({ 'zh-CN': '工作区' })).toEqual({ zh_CN: '工作区' })
  })

  it('keeps backend zh_CN keys as-is', () => {
    expect(normalizeTranslatableMap({ zh_CN: '工作区' })).toEqual({ zh_CN: '工作区' })
  })

  it('merges mixed maps onto backend keys with the backend key winning last', () => {
    // Backend prefill zh_CN + SPA-edit zh-CN both present: the SPA edit is the
    // most recent write, so it must win the merge.
    expect(normalizeTranslatableMap({ zh_CN: '旧', 'zh-CN': '工作区' })).toEqual({ zh_CN: '工作区' })
    expect(normalizeTranslatableMap({ 'zh-CN': '工作区', zh_CN: '旧' })).toEqual({ zh_CN: '旧' })
  })

  it('drops unknown locale keys instead of leaking them to the API', () => {
    expect(normalizeTranslatableMap({ zz: 'nope' as never })).toEqual({})
  })

  it('drops non-string values and tolerates null/undefined input', () => {
    expect(normalizeTranslatableMap({ en: 123 as never })).toEqual({})
    expect(normalizeTranslatableMap(null)).toEqual({})
    expect(normalizeTranslatableMap(undefined)).toEqual({})
    expect(normalizeTranslatableMap({})).toEqual({})
  })
})

describe('translatableValue', () => {
  it('reads a backend-keyed prefill map through the SPA zh-CN code', () => {
    // API prefill is keyed `zh_CN`; the edit row renders `zh-CN`. Regression:
    // the row used to read `map['zh-CN']` and stayed blank.
    expect(translatableValue({ zh_CN: '工作区' }, 'zh-CN')).toBe('工作区')
  })

  it('still reads a legacy SPA-keyed alias', () => {
    expect(translatableValue({ 'zh-CN': '工作区' }, 'zh-CN')).toBe('工作区')
  })

  it('prefers the canonical backend key when both are present', () => {
    expect(translatableValue({ zh_CN: '工作区', 'zh-CN': '旧' }, 'zh-CN')).toBe('工作区')
  })

  it('passes one-to-one locales through unchanged', () => {
    const map = { en: 'Workspace', ar: 'مساحة العمل', ru: 'Рабочая область' }
    expect(translatableValue(map, 'en')).toBe('Workspace')
    expect(translatableValue(map, 'ar')).toBe('مساحة العمل')
    expect(translatableValue(map, 'ru')).toBe('Рабочая область')
  })

  it('returns an empty string for missing locales and empty input', () => {
    expect(translatableValue({ en: 'Workspace' }, 'zh-CN')).toBe('')
    expect(translatableValue({}, 'en')).toBe('')
    expect(translatableValue(null, 'en')).toBe('')
    expect(translatableValue(undefined, 'zh-CN')).toBe('')
  })
})
