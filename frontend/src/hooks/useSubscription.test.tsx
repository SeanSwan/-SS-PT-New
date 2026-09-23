import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  auth: {
    isAuthenticated: false,
    user: null as { id: string } | null,
  },
}));

vi.mock('../services/api.service', () => ({
  default: { get: mocks.get, post: mocks.post },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

import { useSubscription } from './useSubscription';

const tierResponse = (name: string) => ({
  success: true,
  tiers: [{
    id: 'elite', name, tagline: name, price: 12, priceDisplay: '$12/mo',
    features: [`${name} feature`], limits: { aiMessagesPerMonth: 1, aiGenerationsPerMonth: 1 },
  }],
});

describe('useSubscription identity and public tier pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.isAuthenticated = false;
    mocks.auth.user = null;
    mocks.get.mockImplementation((path: string) => {
      if (path === '/api/subscriptions/tiers') return Promise.resolve({ data: tierResponse('Public tier') });
      return Promise.resolve({ data: { success: true, subscription: { tier: 'free' }, usage: null } });
    });
    mocks.post.mockResolvedValue({ data: { success: true } });
  });

  it('fetches public tiers once and keeps them available to guests', async () => {
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tiers[0].name).toBe('Public tier');
    expect(mocks.get.mock.calls.filter(([path]) => path === '/api/subscriptions/tiers')).toHaveLength(1);
    expect(mocks.get.mock.calls.some(([path]) => path === '/api/subscriptions/status')).toBe(false);
  });

  it('ignores a late response from the previous account after identity changes', async () => {
    const statusResolvers: Array<(value: unknown) => void> = [];
    mocks.auth.isAuthenticated = true;
    mocks.auth.user = { id: 'account-a' };
    mocks.get.mockImplementation((path: string) => {
      if (path === '/api/subscriptions/tiers') return Promise.resolve({ data: tierResponse('Public tier') });
      return new Promise(resolve => { statusResolvers.push(resolve); });
    });

    const { result, rerender } = renderHook(() => useSubscription());
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/subscriptions/status'));

    mocks.auth.user = { id: 'account-b' };
    rerender();
    await waitFor(() => expect(mocks.get.mock.calls.filter(([path]) => path === '/api/subscriptions/status')).toHaveLength(2));
    statusResolvers[1]?.({ data: { success: true, subscription: { tier: 'elite' }, usage: null } });
    await waitFor(() => expect(result.current.subscription?.tier).toBe('elite'));

    // The first request resolves after account B and must not overwrite it.
    statusResolvers[0]?.({ data: {
      success: true,
      subscription: { tier: 'pro' },
      usage: { aiMessagesUsed: 0, aiMessagesLimit: 10, aiGenerationsUsed: 0, aiGenerationsLimit: 2, resetDate: null },
    } });
    await act(async () => Promise.resolve());
    expect(result.current.subscription?.tier).toBe('elite');
  });

  it('clears the previous account state in the identity-change render', async () => {
    const statusResolvers: Array<(value: unknown) => void> = [];
    const renderedTiers: Array<string | null> = [];
    mocks.auth.isAuthenticated = true;
    mocks.auth.user = { id: 'account-a' };
    mocks.get.mockImplementation((path: string) => {
      if (path === '/api/subscriptions/tiers') return Promise.resolve({ data: tierResponse('Public tier') });
      return new Promise(resolve => { statusResolvers.push(resolve); });
    });

    const { result, rerender } = renderHook(() => {
      const value = useSubscription();
      renderedTiers.push(value.subscription?.tier ?? null);
      return value;
    });
    await waitFor(() => expect(statusResolvers).toHaveLength(1));
    statusResolvers[0]?.({ data: { success: true, subscription: { tier: 'pro' }, usage: null } });
    await waitFor(() => expect(result.current.subscription?.tier).toBe('pro'));

    mocks.auth.user = { id: 'account-b' };
    rerender();

    expect(result.current.subscription).toBeNull();
    expect(result.current.usage).toBeNull();
    expect(result.current.canUseAI).toBe(false);
    expect(renderedTiers.at(-1)).toBeNull();
  });

  it('releases a settled status request so an explicit refresh reaches the backend', async () => {
    mocks.auth.isAuthenticated = true;
    mocks.auth.user = { id: 'account-a' };
    let statusCalls = 0;
    mocks.get.mockImplementation((path: string) => {
      if (path === '/api/subscriptions/tiers') return Promise.resolve({ data: tierResponse('Public tier') });
      statusCalls += 1;
      return Promise.resolve({ data: { success: true, subscription: { tier: statusCalls === 1 ? 'free' : 'elite' }, usage: null } });
    });

    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.subscription?.tier).toBe('free'));

    await act(async () => { await result.current.fetchStatus(); });

    await waitFor(() => expect(result.current.subscription?.tier).toBe('elite'));
    expect(statusCalls).toBe(2);
  });

  it('returns a safe action error and does not issue duplicate checkout requests in one tick', async () => {
    mocks.auth.isAuthenticated = true;
    mocks.auth.user = { id: 'account-a' };
    mocks.post.mockRejectedValue({ response: { data: { message: 'Checkout unavailable' } } });
    const { result } = renderHook(() => useSubscription());

    await act(async () => {
      const first = result.current.checkout('elite');
      const second = result.current.checkout('elite');
      await Promise.all([first, second]);
    });

    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe('Checkout unavailable');
  });

  it('does not navigate when checkout resolves after the authenticated identity changes', async () => {
    mocks.auth.isAuthenticated = true;
    mocks.auth.user = { id: 'account-a' };
    let resolveCheckout: ((value: unknown) => void) | undefined;
    mocks.post.mockImplementation((path: string) => {
      if (path === '/api/subscriptions/checkout') return new Promise(resolve => { resolveCheckout = resolve; });
      return Promise.resolve({ data: { success: true } });
    });

    const { result, rerender } = renderHook(() => useSubscription());
    let checkoutResult!: Promise<Record<string, unknown>>;
    await act(async () => {
      checkoutResult = result.current.checkout('elite');
    });

    mocks.auth.user = { id: 'account-b' };
    rerender();
    resolveCheckout?.({ data: { success: true, checkoutUrl: 'https://payments.invalid/session' } });

    let response: Record<string, unknown> | undefined;
    await act(async () => { response = await checkoutResult; });
    expect(response?.code).toBe('STALE_REQUEST');
    expect(window.location.href).not.toBe('https://payments.invalid/session');
  });
});
