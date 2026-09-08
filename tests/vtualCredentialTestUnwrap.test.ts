import { describe, expect, it } from 'vitest'
import { credentialFromTestResponse } from '../src/composables/vtual/useVtual'
import type { VtualPlatformCredential, VtualPlatformCredentialTestPayload } from '../src/api/types'

function stubCredential(overrides: Partial<VtualPlatformCredential> = {}): VtualPlatformCredential {
  return {
    id: 'cred-1',
    platform_id: 'plat-1',
    label: 'yt-primary',
    type: 'api_key',
    status: 'active',
    priority: 10,
    has_secret: true,
    has_runtime: false,
    secret_hint: '…w9Qx',
    runtime_expires_at: null,
    runtime_expires_at_formatted: null,
    runtime_expires_at_human: null,
    verified_at: '2026-08-29T00:00:00Z',
    verified_at_formatted: null,
    verified_at_human: null,
    last_used_at: null,
    last_used_at_formatted: null,
    last_used_at_human: null,
    last_error_at: null,
    last_error_at_formatted: null,
    last_error_at_human: null,
    last_error_message: null,
    consecutive_auth_failures: 0,
    failover_skip_until: null,
    failover_skip_until_formatted: null,
    failover_skip_until_human: null,
    created_by: null,
    created_at: null,
    created_at_formatted: null,
    created_at_human: null,
    updated_at: null,
    updated_at_formatted: null,
    updated_at_human: null,
    ...overrides,
  }
}

describe('credentialFromTestResponse', () => {
  it('unwraps data.credential from the test envelope', () => {
    const credential = stubCredential({ status: 'active' })
    const payload: VtualPlatformCredentialTestPayload = {
      credential,
      test: { ok: true, message: 'ok', platform: 'youtube' },
    }

    const out = credentialFromTestResponse(
      { status: 'success', message: 'tested', data: payload },
      'fallback',
    )

    expect(out.id).toBe('cred-1')
    expect(out.status).toBe('active')
  })

  it('throws when the envelope has no nested credential', () => {
    expect(() =>
      credentialFromTestResponse(
        { status: 'success', message: 'tested', data: { test: { ok: true, message: 'ok', platform: 'youtube' } } as VtualPlatformCredentialTestPayload },
        'fallback',
      ),
    ).toThrow('tested')
  })
})
