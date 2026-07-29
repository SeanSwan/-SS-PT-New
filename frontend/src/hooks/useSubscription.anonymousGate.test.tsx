/**
 * useSubscription.anonymousGate.test.tsx
 * ========================================
 * Launch-audit regression (2026-07-28): anonymous visitors on public pages
 * (/store, /ascension) fired GET /api/subscriptions/status, an auth-only
 * endpoint, producing a guaranteed 401 + console error on the highest-value
 * public surfaces. The hook must skip the status call when signed out, keep
 * the PUBLIC tiers call (store tier cards need it), and fetch status once a
 * user signs in.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  auth: { isAuthenticated: false as boolean },
}));

vi.mock('../services/api.service', () => ({
  default: { get: mocks.get, post: mocks.post },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mocks.auth.isAuthenticated, user: null }),
}));

import { useSubscription } from './useSubscription';

describe('useSubscription anonymous gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ data: { success: true, tiers: [] } });
  });

  it('anonymous: never calls the auth-only status endpoint, still loads public tiers, settles loading', async () => {
    mocks.auth.isAuthenticated = false;
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const calledPaths = mocks.get.mock.calls.map((c) => c[0]);
    expect(calledPaths).not.toContain('/api/subscriptions/status');
    expect(calledPaths).toContain('/api/subscriptions/tiers');
    expect(result.current.subscription).toBeNull();
  });

  it('authenticated: fetches subscription status', async () => {
    mocks.auth.isAuthenticated = true;
    mocks.get.mockResolvedValue({
      data: { success: true, subscription: { tier: 'free' }, usage: null, tiers: [] },
    });
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const calledPaths = mocks.get.mock.calls.map((c) => c[0]);
    expect(calledPaths).toContain('/api/subscriptions/status');
  });
});
