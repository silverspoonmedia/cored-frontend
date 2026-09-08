import { describe, expect, it } from 'vitest'
import { lookupDotted } from '../src/utils/settingsI18n'

describe('lookupDotted', () => {
  it('prefers a literal dotted JSON key', () => {
    const tree = {
      'platform.jwt.ttl': 'JWT access TTL (minutes)',
      platform: { jwt: { ttl: 'nested should not win' } },
    }

    expect(lookupDotted(tree, 'platform.jwt.ttl')).toBe('JWT access TTL (minutes)')
  })

  it('walks nested objects when the dotted key is not a string leaf', () => {
    const tree = {
      platform: {
        notifications: {
          delivery: {
            polling: 'HTTP polling',
            realtime: 'WebSocket (realtime)',
          },
        },
      },
    }

    expect(lookupDotted(tree, 'platform.notifications.delivery.polling')).toBe('HTTP polling')
  })

  it('does not stringify nested objects as [object Object]', () => {
    const tree = {
      platform: {
        jwt: {
          ttl: 'JWT access TTL (minutes)',
        },
      },
    }

    expect(lookupDotted(tree, 'platform.jwt')).toBeNull()
    expect(lookupDotted(tree, 'platform.jwt.ttl')).toBe('JWT access TTL (minutes)')
  })

  it('resolves compiled message leaves via rt', () => {
    const compiled = { type: 0, start: 0, end: 10 }
    const tree = {
      'platform.jwt.ttl': compiled,
    }
    const rt = (message: string) => ((message as unknown) === compiled ? 'JWT access TTL (minutes)' : '')

    expect(lookupDotted(tree, 'platform.jwt.ttl', rt)).toBe('JWT access TTL (minutes)')
  })

  it('returns null for a non-string leaf when rt is omitted', () => {
    const tree = {
      'platform.jwt.ttl': { type: 0 },
    }

    expect(lookupDotted(tree, 'platform.jwt.ttl')).toBeNull()
  })
})
