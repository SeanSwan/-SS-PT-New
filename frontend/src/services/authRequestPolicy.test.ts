import { describe, expect, it } from 'vitest';
import {
  AUTH_SESSION_EXPIRED_CODE,
  createAuthSessionExpiredError,
  isPublicAuthRequest,
  shouldFailClosedForExpiredSession,
} from './authRequestPolicy';

describe('authRequestPolicy', () => {
  it('does not block public auth and health endpoints', () => {
    expect(shouldFailClosedForExpiredSession('/api/auth/login', true, false)).toBe(false);
    expect(shouldFailClosedForExpiredSession('/api/auth/refresh-token', true, false)).toBe(false);
    expect(shouldFailClosedForExpiredSession('/api/health', true, false)).toBe(false);
  });

  it('blocks protected Coach and PLAUD requests when an expired token has no refresh path', () => {
    expect(shouldFailClosedForExpiredSession('/api/plaud/intake?scope=actionable', true, false)).toBe(true);
    expect(shouldFailClosedForExpiredSession('/api/ai-chat/conversations?status=active', true, false)).toBe(true);
    expect(shouldFailClosedForExpiredSession('/api/admin/clients?page=1', true, false)).toBe(true);
  });

  it('allows protected requests to attempt refresh when a refresh token exists', () => {
    expect(shouldFailClosedForExpiredSession('/api/plaud/clips?limit=50', true, true)).toBe(false);
  });

  it('handles absolute production URLs the same as relative API paths', () => {
    expect(isPublicAuthRequest('https://sswanstudios.com/api/auth/register')).toBe(true);
    expect(shouldFailClosedForExpiredSession('https://sswanstudios.com/api/plaud/merge-requests', true, false)).toBe(true);
  });

  it('creates a structured auth-expired error for UI and hook recovery paths', () => {
    const error = createAuthSessionExpiredError({ url: '/api/plaud/intake' });

    expect(error.message).toContain('session expired');
    expect(error.code).toBe(AUTH_SESSION_EXPIRED_CODE);
    expect(error.isAuthSessionExpired).toBe(true);
    expect(error.config?.url).toBe('/api/plaud/intake');
  });
});
