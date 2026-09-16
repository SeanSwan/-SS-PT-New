import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { ProductionApiService, ProductionTokenManager } from './api.service';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    create: vi.fn(() => ({
      defaults: { headers: { common: {} } },
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));

const axiosPost = vi.mocked(axios.post);

describe('ProductionTokenManager lifecycle contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ProductionTokenManager.clearAuthData();
  });

  it('notifies same-tab token changes and unsubscribe stops future notifications', () => {
    const observed: Array<string | null> = [];
    const unsubscribe = ProductionTokenManager.subscribe((token) => observed.push(token));

    ProductionTokenManager.setToken('first-token');
    unsubscribe();
    ProductionTokenManager.setToken('second-token');
    ProductionTokenManager.clearAuthData();

    expect(observed).toEqual(['first-token']);
  });

  it('observes cross-tab token and account storage changes', () => {
    const observed: Array<string | null> = [];
    const unsubscribe = ProductionTokenManager.subscribe((token) => observed.push(token));

    window.dispatchEvent(new StorageEvent('storage', { key: 'token', newValue: 'cross-tab-token' }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'user', newValue: JSON.stringify({ id: 44 }) }));
    unsubscribe();

    expect(observed).toEqual(['cross-tab-token', null]);
  });

  it('settles refresh waiters and ignores a late refresh after logout', async () => {
    let resolveRefresh!: (value: unknown) => void;
    axiosPost.mockReturnValueOnce(new Promise((resolve) => { resolveRefresh = resolve; }) as never);
    ProductionTokenManager.setRefreshToken('refresh-before-logout');

    const first = ProductionTokenManager.refreshAccessToken('http://localhost:10000');
    const waiting = ProductionTokenManager.refreshAccessToken('http://localhost:10000');
    ProductionTokenManager.clearAuthData();

    await expect(waiting).resolves.toBeNull();
    resolveRefresh({ data: { success: true, token: 'late-token', refreshToken: 'late-refresh' } });
    await expect(first).resolves.toBeNull();
    expect(ProductionTokenManager.getToken()).toBeNull();
    expect(ProductionTokenManager.getRefreshToken()).toBeNull();
  });

  it('does not let an old refresh rejection clear a newer login', async () => {
    let rejectRefresh!: (error: Error) => void;
    axiosPost.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectRefresh = reject; }) as never);
    ProductionTokenManager.setRefreshToken('refresh-before-login');

    const oldRefresh = ProductionTokenManager.refreshAccessToken('http://localhost:10000');
    ProductionTokenManager.setToken('new-login-token');
    ProductionTokenManager.setRefreshToken('new-login-refresh');

    rejectRefresh(new Error('old refresh rejected'));
    await expect(oldRefresh).resolves.toBeNull();
    expect(ProductionTokenManager.getToken()).toBe('new-login-token');
    expect(ProductionTokenManager.getRefreshToken()).toBe('new-login-refresh');
  });

  it('clears canonical token state when the API service clears its auth token', () => {
    const api = new ProductionApiService();
    api.setAuthToken('active-token');
    expect(ProductionTokenManager.getToken()).toBe('active-token');

    api.setAuthToken(null);

    expect(ProductionTokenManager.getToken()).toBeNull();
    expect(api.getAuthorizationHeader()).toBeNull();
  });
});
