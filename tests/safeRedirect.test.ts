import { describe, expect, it } from 'vitest'
import { safeInternalRedirect } from '../src/lib/safeRedirect'

describe('safeInternalRedirect', () => {
  it('accepts same-app paths', () => {
    expect(safeInternalRedirect('/apps/product-activations/microstock')).toBe(
      '/apps/product-activations/microstock',
    )
    expect(safeInternalRedirect('/apps/settings/platform')).toBe('/apps/settings/platform')
  })

  it('rejects open redirects', () => {
    expect(safeInternalRedirect('https://evil.example/phish')).toBe('/apps/dashboard')
    expect(safeInternalRedirect('//evil.example')).toBe('/apps/dashboard')
    expect(safeInternalRedirect('/\\evil.example')).toBe('/apps/dashboard')
    expect(safeInternalRedirect('/http://evil.example')).toBe('/apps/dashboard')
    expect(safeInternalRedirect('apps/dashboard')).toBe('/apps/dashboard')
    expect(safeInternalRedirect('')).toBe('/apps/dashboard')
    expect(safeInternalRedirect(undefined)).toBe('/apps/dashboard')
  })
})
