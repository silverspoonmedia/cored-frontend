const PAYMENT_PROTOCOLS = new Set(['dana:', 'gopay:', 'linkaja:', 'ovo:', 'shopeepay:'])
const DATA_IMAGE_PATTERN = /^data:image\/(?:gif|jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i

function parseSafeUrl(value: string | null | undefined): URL | null {
  if (typeof value !== 'string' || value.trim() === '') return null

  try {
    const url = new URL(value.trim())
    if (url.username || url.password) return null
    return url
  } catch {
    return null
  }
}

function hasSafeBase64Payload(value: string): boolean {
  const comma = value.indexOf(',')
  if (comma < 0) return false

  const encoded = value.slice(comma + 1)
  return encoded.length > 0 && encoded.length % 4 === 0 && /^[a-z0-9+/]+={0,2}$/i.test(encoded)
}

function isSafeHttpProtocol(protocol: string): boolean {
  return protocol === 'https:' || (import.meta.env.DEV && protocol === 'http:')
}

function hasSafePaymentDestination(url: URL): boolean {
  return url.hostname !== '' && url.pathname !== '' && !url.pathname.startsWith('//')
}

function decodedSvgPayload(value: string): string | null {
  const encoded = value.slice(value.indexOf(',') + 1)

  try {
    const payload = atob(encoded)
    if (btoa(payload) !== encoded || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(payload)) {
      return null
    }
    return payload.trim()
  } catch {
    return null
  }
}

function containsUnsafeSvgMarkup(payload: string): boolean {
  return (
    !/^(?:<\?xml[\s\S]*?\?>\s*)?<svg\b[\s\S]*?(?:\/>|<\/svg>)$/i.test(payload) ||
    /<!doctype\b|<\/?(?:script|iframe|object|embed|foreignObject|use)\b/i.test(payload) ||
    /\b(?:on[a-z]+|href|xlink:href)\s*=|url\s*\(/i.test(payload)
  )
}

export function safeHttpUrl(value: string | null | undefined): string | null {
  const url = parseSafeUrl(value)
  if (!url || !isSafeHttpProtocol(url.protocol)) return null
  return url.toString()
}

export function safeSvgUrl(value: string | null | undefined): string | null {
  if (
    typeof value !== 'string'
    || !/^data:image\/svg\+xml;base64,/i.test(value)
    || !hasSafeBase64Payload(value)
  ) {
    return null
  }

  const payload = decodedSvgPayload(value)
  if (!payload || containsUnsafeSvgMarkup(payload)) {
    return null
  }

  return value
}

export function safeImageUrl(value: string | null | undefined): string | null {
  if (typeof value === 'string' && DATA_IMAGE_PATTERN.test(value) && hasSafeBase64Payload(value)) {
    return value
  }
  return safeHttpUrl(value)
}

export function safePaymentUrl(value: string | null | undefined): string | null {
  const url = parseSafeUrl(value)
  if (!url) return null
  if (isSafeHttpProtocol(url.protocol)) {
    return url.toString()
  }
  if (PAYMENT_PROTOCOLS.has(url.protocol) && hasSafePaymentDestination(url)) {
    return url.toString()
  }
  return null
}

export function safeOtpAuthUrl(value: string | null | undefined): string | null {
  const url = parseSafeUrl(value)
  if (
    !url
    || url.protocol !== 'otpauth:'
    || !['hotp', 'totp'].includes(url.host.toLowerCase())
    || url.pathname === ''
    || !url.searchParams.has('secret')
  ) {
    return null
  }
  return url.toString()
}

export function safeDiscordAuthorizeUrl(value: string | null | undefined): string | null {
  const safeUrl = safeHttpUrl(value)
  if (!safeUrl) return null

  const url = new URL(safeUrl)
  const host = url.hostname.toLowerCase()
  if (
    url.protocol !== 'https:' ||
    (host !== 'discord.com' && host !== 'www.discord.com') ||
    url.pathname !== '/api/oauth2/authorize'
  ) {
    return null
  }
  return safeUrl
}
