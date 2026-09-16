import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductionTokenManager as tokens } from './productionTokenManager';
import { createProductionApiClient, registerPaywallTrigger, unregisterPaywallTrigger } from './apiClientFactory';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('../utils/adminImpersonationSession', () => ({ restoreAdminSessionFromImpersonation: vi.fn(() => false) }));
const location = { hostname: 'localhost', pathname: '/dashboard/client/overview', href: '', assign: vi.fn() };
const token = (owner: string, expired = false) => `synthetic.${btoa(JSON.stringify({ id: owner, exp: Math.floor(Date.now() / 1000) + (expired ? -60 : 3600) }))}.fixture`;
const login = (owner: string, expired = false) => {
  tokens.setToken(token(owner, expired));
  tokens.setRefreshToken(`fixture-refresh-${owner}`);
  tokens.setUser({ id: owner });
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({ config, data, status, statusText: String(status), headers: {} });
const denied = (config: InternalAxiosRequestConfig, status = 401, data: unknown = { errorCode: 'TOKEN_EXPIRED' }) => new AxiosError('Synthetic denied', 'ERR_BAD_REQUEST', config, undefined, response(config, data, status));
const settled = (promise: Promise<unknown>) => promise.then(value => value, error => error);

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(axios, 'post').mockRejectedValue(new Error('Unexpected synthetic refresh transport'));
  vi.stubGlobal('window', { location, addEventListener: vi.fn() });
  location.href = '';
  location.assign.mockReset();
  tokens.clearAuthData();
  localStorage.clear();
  login('A');
});
afterEach(() => { unregisterPaywallTrigger(); vi.unstubAllGlobals(); });

describe('actual API client and token manager authentication admission', () => {
  it.each(['success', 'failure'] as const)('a retired reactive refresh %s cannot clear B or retry A under B', async outcome => {
    const refresh = deferred<any>();
    vi.spyOn(axios, 'post').mockReturnValue(refresh.promise);
    const client = createProductionApiClient('http://synthetic.invalid', false);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => { throw denied(config); });
    client.defaults.adapter = adapter;
    const pending = settled(client.post('/api/recovery/complete', { exerciseId: 'fixture-A' }));
    await vi.waitFor(() => expect(axios.post).toHaveBeenCalledOnce());
    login('B');
    const clear = vi.spyOn(tokens, 'clearAuthData');
    if (outcome === 'success') refresh.resolve({ data: { success: true, token: token('A-refreshed') } });
    else refresh.reject(new Error('retired refresh failed'));
    expect((await pending).code).toBe('ERR_CANCELED');
    expect(tokens.getUser()?.id).toBe('B');
    expect(tokens.getToken()).toBe(token('B'));
    expect(clear).not.toHaveBeenCalled();
    expect(location.href).toBe('');
    expect(adapter).toHaveBeenCalledOnce();
  });

  it('logout retires both the reactive refresh owner and a waiting request', async () => {
    const refresh = deferred<any>();
    vi.spyOn(axios, 'post').mockReturnValue(refresh.promise);
    const client = createProductionApiClient('http://synthetic.invalid', false);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => { throw denied(config); });
    client.defaults.adapter = adapter;
    const first = settled(client.get('/api/private/first'));
    const second = settled(client.get('/api/private/second'));
    await vi.waitFor(() => expect(adapter).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(axios.post).toHaveBeenCalledOnce());
    tokens.clearAuthData();
    const clear = vi.spyOn(tokens, 'clearAuthData');
    refresh.resolve({ data: { success: true, token: token('A-refreshed') } });
    expect((await first).code).toBe('ERR_CANCELED');
    expect((await second).code).toBe('ERR_CANCELED');
    expect(tokens.getToken()).toBeNull();
    expect(clear).not.toHaveBeenCalled();
    expect(location.href).toBe('');
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('a proactive expired-token refresh cannot send the old operation after B signs in', async () => {
    login('A', true);
    const refresh = deferred<any>();
    vi.spyOn(axios, 'post').mockReturnValue(refresh.promise);
    const client = createProductionApiClient('http://synthetic.invalid', false);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, {}));
    client.defaults.adapter = adapter;
    const pending = settled(client.post('/api/private/change', {}));
    await vi.waitFor(() => expect(axios.post).toHaveBeenCalledOnce());
    login('B');
    refresh.resolve({ data: { success: true, token: token('A-refreshed') } });
    expect((await pending).code).toBe('ERR_CANCELED');
    expect(tokens.getUser()?.id).toBe('B');
    expect(location.href).toBe('');
    expect(adapter).not.toHaveBeenCalled();
  });

  it.each([200, 401, 403, 402])('a late %i response cannot affect the replacement account', async status => {
    const network = deferred<any>();
    const refresh = vi.spyOn(axios, 'post');
    const paywall = vi.fn();
    registerPaywallTrigger(paywall);
    const client = createProductionApiClient('http://synthetic.invalid', false);
    let sent!: InternalAxiosRequestConfig;
    client.defaults.adapter = async config => { sent = config; return network.promise; };
    const pending = settled(client.get('/api/private/data'));
    await vi.waitFor(() => expect(sent).toBeDefined());
    login('B');
    const clear = vi.spyOn(tokens, 'clearAuthData');
    if (status === 200) network.resolve(response(sent, { privateOwner: 'A' }));
    else network.reject(denied(sent, status, status === 403 ? { code: 'AI_CONSENT_STALE_VERSION' } : { errorCode: 'TOKEN_EXPIRED' }));
    expect((await pending).code).toBe('ERR_CANCELED');
    expect(tokens.getUser()?.id).toBe('B');
    expect(clear).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(paywall).not.toHaveBeenCalled();
    expect(location.assign).not.toHaveBeenCalled();
    expect(location.href).toBe('');
  });

  it('legitimate same-session refresh retries once with the returned credential', async () => {
    const refreshed = token('A-refreshed');
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, token: refreshed } });
    const client = createProductionApiClient('http://synthetic.invalid', false);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (adapter.mock.calls.length === 1) throw denied(config);
      return response(config, { saved: true });
    });
    client.defaults.adapter = adapter;
    expect((await client.post('/api/private/change', {})).data).toEqual({ saved: true });
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(adapter.mock.calls[1][0].headers.Authorization).toBe(`Bearer ${refreshed}`);
    expect(tokens.getUser()?.id).toBe('A');
    expect(location.href).toBe('');
  });

  it('current-session refresh failure still clears expired auth and routes to sign in', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('current refresh failed'));
    const client = createProductionApiClient('http://synthetic.invalid', false);
    client.defaults.adapter = async config => { throw denied(config); };
    expect((await settled(client.get('/api/private/data'))).code).toBe('AUTH_SESSION_EXPIRED');
    expect(tokens.getToken()).toBeNull();
    expect(tokens.getUser()).toBeNull();
    expect(location.href).toBe('/login');
  });

  it.each(['failed-refresh', 'missing-refresh'])('proactive %s reports expiry, without sending the operation', async mode => {
    login('A', true);
    if (mode === 'missing-refresh') localStorage.removeItem('refreshToken');
    const client = createProductionApiClient('http://synthetic.invalid', false);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, {}));
    client.defaults.adapter = adapter;
    expect((await settled(client.post('/api/private/change', {}))).code).toBe('AUTH_SESSION_EXPIRED');
    expect(tokens.getToken()).toBeNull();
    expect(location.href).toBe('/login');
    expect(adapter).not.toHaveBeenCalled();
  });

  it('a queued retry cannot acquire B credentials at asynchronous request admission', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, token: token('A-refreshed') } });
    const client = createProductionApiClient('http://synthetic.invalid', false);
    client.interceptors.request.use(config => {
      if ((config as any)._retry) login('B');
      return config;
    });
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (adapter.mock.calls.length === 1) throw denied(config);
      return response(config, { saved: true });
    });
    client.defaults.adapter = adapter;
    expect((await settled(client.post('/api/private/change', { owner: 'A' }))).code).toBe('ERR_CANCELED');
    expect(adapter).toHaveBeenCalledOnce();
    expect(tokens.getUser()?.id).toBe('B');
    expect(location.href).toBe('');
  });

  it.each([false, true])('a failed refresh cannot expire B installed during cleanup (proactive=%s)', async proactive => {
    login('A', proactive);
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: false } });
    const client = createProductionApiClient('http://synthetic.invalid', false);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => { throw denied(config); });
    client.defaults.adapter = adapter;
    let replaced = false;
    const unsubscribe = tokens.subscribe(value => {
      if (value === null && !replaced) { replaced = true; login('B'); }
    });
    try {
      const result = await settled(client.post('/api/private/change', { owner: 'A' }));
      expect.soft(result.code).toBe('ERR_CANCELED');
      expect.soft(tokens.getUser()?.id).toBe('B');
      expect.soft(tokens.getRefreshToken()).toBe('fixture-refresh-B');
      expect.soft(location.href).toBe('');
      expect(adapter).toHaveBeenCalledTimes(proactive ? 0 : 1);
    } finally { unsubscribe(); }
  });

  it.each([false, true])('missing refresh cannot redirect B installed during cleanup (proactive=%s)', async proactive => {
    login('A', proactive);
    localStorage.removeItem('refreshToken');
    const client = createProductionApiClient('http://synthetic.invalid', false);
    client.defaults.adapter = async config => { throw denied(config); };
    let replaced = false;
    const unsubscribe = tokens.subscribe(value => {
      if (value === null && !replaced) { replaced = true; login('B'); }
    });
    try {
      expect.soft((await settled(client.get('/api/private/data'))).code).toBe('ERR_CANCELED');
      expect.soft(tokens.getUser()?.id).toBe('B');
      expect(location.href).toBe('');
    } finally { unsubscribe(); }
  });

  it('the auth failure threshold cannot redirect a login installed during cleanup', async () => {
    const client = createProductionApiClient('http://synthetic.invalid', false);
    client.defaults.adapter = async config => { throw denied(config, 401, { errorCode: 'TOKEN_INVALID' }); };
    await settled(client.get('/api/private/data'));
    await settled(client.get('/api/private/data'));
    let replaced = false;
    const unsubscribe = tokens.subscribe(value => {
      if (value === null && !replaced) { replaced = true; login('B'); }
    });
    try {
      expect.soft((await settled(client.get('/api/private/data'))).code).toBe('ERR_CANCELED');
      expect.soft(tokens.getUser()?.id).toBe('B');
      expect(location.href).toBe('');
    } finally { unsubscribe(); }
  });
});
