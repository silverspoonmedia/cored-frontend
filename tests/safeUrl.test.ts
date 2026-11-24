import { describe, expect, it } from 'vitest'
import {
  safeDiscordAuthorizeUrl,
  safeHttpUrl,
  safeImageUrl,
  safeOtpAuthUrl,
  safeSvgUrl,
  safePaymentUrl,
} from '../src/utils/safeUrl'

describe('safe URL helpers', () => {
  it('allows only credential-free HTTP(S) URLs', () => {
    expect(safeHttpUrl(' https://cdn.example.test/file.png ')).toBe('https://cdn.example.test/file.png')
    expect(safeHttpUrl('http://cdn.example.test/file.png')).toBe('http://cdn.example.test/file.png')
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('https://user:pass@example.test/file')).toBeNull()
    expect(safeHttpUrl('data:text/html;base64,PGgxPk5vPC9oMT4=')).toBeNull()
  })

  it('allows image data only for base64 image payloads', () => {
    expect(safeImageUrl('data:image/png;base64,AA==')).toBe('data:image/png;base64,AA==')
    expect(safeImageUrl('data:image/svg+xml;base64,PHN2Zy8+')).toBeNull()
    expect(safeImageUrl('data:text/html;base64,PGgxPk5vPC9oMT4=')).toBeNull()
  })

  it('allows only supported payment schemes with a destination', () => {
    expect(safePaymentUrl('dana://pay/example')).toBe('dana://pay/example')
    expect(safePaymentUrl('dana:')).toBeNull()
    expect(safePaymentUrl('dana://pay//example')).toBeNull()
    expect(safePaymentUrl('javascript:alert(1)')).toBeNull()
  })

  it('allows only trusted base64 SVG data URLs for QR images', () => {
    expect(safeSvgUrl('data:image/svg+xml;base64,PHN2Zy8+')).toBe('data:image/svg+xml;base64,PHN2Zy8+')
    expect(safeSvgUrl('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIi8+')).toBe(
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIi8+',
    )
    expect(safeSvgUrl('data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+')).toBeNull()
    expect(safeSvgUrl('data:image/svg+xml;base64,PHN2ZyB4bGluazpocmVmPSJqYXZhc2NyaXB0OmFsZXJ0KDEpIi8+')).toBeNull()
    expect(safeSvgUrl('data:image/svg+xml;base64,PHN2Zy8+garbage')).toBeNull()
    expect(safeSvgUrl('data:image/svg+xml,<svg onload="alert(1)"/>')).toBeNull()
    expect(safeSvgUrl('https://example.test/qr.svg')).toBeNull()
  })

  it('allows only HOTP/TOTP otpauth URLs with a secret', () => {
    expect(safeOtpAuthUrl('otpauth://totp/Cored:user@example.test?secret=ABC')).toBe(
      'otpauth://totp/Cored:user@example.test?secret=ABC',
    )
    expect(safeOtpAuthUrl('otpauth://totp/Cored:user@example.test')).toBeNull()
    expect(safeOtpAuthUrl('otpauth://steam/Cored:user@example.test?secret=ABC')).toBeNull()
  })

  it('pins Discord authorization navigation to Discord endpoint', () => {
    expect(safeDiscordAuthorizeUrl('https://discord.com/api/oauth2/authorize?client_id=123')).toBe(
      'https://discord.com/api/oauth2/authorize?client_id=123',
    )
    expect(safeDiscordAuthorizeUrl('https://discord.com/api/oauth2/authorize/evil?client_id=123')).toBeNull()
    expect(safeDiscordAuthorizeUrl('https://evil.example.test/api/oauth2/authorize?client_id=123')).toBeNull()
  })
})
