import { describe, expect, it } from 'vitest'
import { applySpaRequestHeader, SPA_REQUEST_HEADER, SPA_REQUEST_HEADER_VALUE } from '../src/api/requestHeaders'

describe('SPA request marker', () => {
  it('writes the public marker expected by the API gate', () => {
    const headers = new Headers()

    applySpaRequestHeader(headers)

    expect(headers.get(SPA_REQUEST_HEADER)).toBe(SPA_REQUEST_HEADER_VALUE)
  })
})
