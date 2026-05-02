import { describe, it, expect, vi } from 'vitest';
import { sanitizeApiError, logApiError } from './logApiError';

// ─────────────────────────────────────────────────────────────
// W1A-4 (2026-05-01) regression test for sanitizeApiError + logApiError.
//
// Production concern: console.error('AI generation failed:', err) was
// logging the full Axios error object including error.config.headers
// which contains the user's Authorization JWT. Anyone with browser
// DevTools or any console-shipping observability tool gets the JWT.
//
// This test locks the contract: headers MUST be stripped, JWT MUST NOT
// appear anywhere in the sanitized output.
// ─────────────────────────────────────────────────────────────

describe('sanitizeApiError', () => {
  it('strips error.config.headers (JWT lives there)', () => {
    const fakeAxiosError = {
      message: 'Request failed with status code 500',
      code: 'ERR_BAD_RESPONSE',
      response: { status: 500, statusText: 'Internal Server Error', data: { error: 'Failed' } },
      config: {
        url: '/api/workout-builder/generate',
        method: 'post',
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SECRET-PAYLOAD-HERE.SIGNATURE',
          'Content-Type': 'application/json',
        },
        data: '{"clientId":99}',
      },
      request: { someXHRObject: true },
    };
    const out = sanitizeApiError(fakeAxiosError);
    const stringified = JSON.stringify(out);

    // CRITICAL: no JWT, no Authorization header, no Bearer
    expect(stringified).not.toContain('Bearer');
    expect(stringified).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(stringified).not.toContain('SECRET-PAYLOAD-HERE');
    expect(stringified).not.toContain('Authorization');
    // CRITICAL: no request body data leak
    expect(stringified).not.toContain('clientId');
    // CRITICAL: no XHR request object
    expect(out.request).toBeUndefined();
    // KEEP: triage-useful fields
    expect(out.message).toBe('Request failed with status code 500');
    expect(out.code).toBe('ERR_BAD_RESPONSE');
    expect(out.response?.status).toBe(500);
    expect(out.response?.data).toEqual({ error: 'Failed' });
    expect(out.config?.url).toBe('/api/workout-builder/generate');
    expect(out.config?.method).toBe('post');
  });

  it('strips error.config.data (PII per rule 8)', () => {
    const fakeError = {
      message: 'failed',
      config: {
        url: '/api/x',
        method: 'post',
        data: '{"email":"client@example.com","ssn":"123-45-6789"}',
        headers: { Authorization: 'Bearer leaked' },
      },
    };
    const out = sanitizeApiError(fakeError);
    const stringified = JSON.stringify(out);
    expect(stringified).not.toContain('client@example.com');
    expect(stringified).not.toContain('123-45-6789');
    expect(stringified).not.toContain('leaked');
  });

  it('handles non-object errors safely', () => {
    expect(sanitizeApiError(null)).toEqual({ message: 'null' });
    expect(sanitizeApiError(undefined)).toEqual({ message: 'undefined' });
    expect(sanitizeApiError('string error')).toEqual({ message: 'string error' });
    expect(sanitizeApiError(42)).toEqual({ message: '42' });
  });

  it('handles partial Axios errors (missing fields)', () => {
    const out = sanitizeApiError({ message: 'just a message' });
    expect(out.message).toBe('just a message');
    expect(out.response).toBeUndefined();
    expect(out.config).toBeUndefined();
  });

  it('does not include unknown enumerable fields the caller might have stuffed in', () => {
    const fake = {
      message: 'test',
      thirdPartyMetadata: { internalServerName: 'prod-db-01.swanstudios.local', dbHost: 'super-secret' },
      config: { url: '/x', method: 'get' },
    };
    const out = sanitizeApiError(fake);
    const stringified = JSON.stringify(out);
    expect(stringified).not.toContain('thirdPartyMetadata');
    expect(stringified).not.toContain('prod-db-01');
    expect(stringified).not.toContain('super-secret');
  });
});

describe('logApiError', () => {
  it('passes the sanitized output to console.error with the label', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logApiError('AI generation failed', {
      message: 'boom',
      config: { url: '/x', method: 'post', headers: { Authorization: 'Bearer SECRET' } },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const [label, payload] = spy.mock.calls[0];
    expect(label).toBe('AI generation failed');
    const stringified = JSON.stringify(payload);
    expect(stringified).not.toContain('Bearer');
    expect(stringified).not.toContain('SECRET');
    spy.mockRestore();
  });
});
