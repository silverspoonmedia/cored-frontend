import { describe, expect, it } from 'vitest'
import { normalizeTranslatableMap, translatableValue } from '../src/i18n'

describe('normalizeTranslatableMap', () => {
  it('passes one-to-one locale keys through unchanged', () => {
    expect(normalizeTranslatableMap({
      en: 'Workspace',
      id: 'Ruang Kerja',
    })).toEqual({
      en: 'Workspace',
      id: 'Ruang Kerja',
    })
  })

  it('drops keys for locales this build no longer ships', () => {
    // A payload written before the prune still carries these codes; forwarding
    // one would ask the API to echo a language the UI cannot render.
    expect(normalizeTranslatableMap({
      en: 'Workspace',
      id: 'Ruang Kerja',
      ja: 'ワークスペース',
      ko: '작업 공간',
      'zh-CN': '工作区',
      ar: 'مساحة العمل',
      ru: 'Рабочая область',
    })).toEqual({
      en: 'Workspace',
      id: 'Ruang Kerja',
    })
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
  it('reads a backend-keyed prefill map through the SPA locale code', () => {
    expect(translatableValue({ id: 'Ruang Kerja' }, 'id')).toBe('Ruang Kerja')
  })

  it('prefers the canonical backend key when both are present', () => {
    expect(translatableValue({ id: 'Ruang Kerja', zz: 'lama' }, 'id')).toBe('Ruang Kerja')
  })

  it('passes one-to-one locales through unchanged', () => {
    const map = { en: 'Workspace', id: 'Ruang Kerja' }
    expect(translatableValue(map, 'en')).toBe('Workspace')
    expect(translatableValue(map, 'id')).toBe('Ruang Kerja')
  })

  it('returns an empty string for missing locales and empty input', () => {
    expect(translatableValue({ en: 'Workspace' }, 'id')).toBe('')
    expect(translatableValue({}, 'en')).toBe('')
    expect(translatableValue(null, 'en')).toBe('')
    expect(translatableValue(undefined, 'id')).toBe('')
  })
})
