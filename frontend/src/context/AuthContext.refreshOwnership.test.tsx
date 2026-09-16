import axios from 'axios';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth, type User } from './AuthContext';
import { ProductionTokenManager } from '../services/api.service';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiSetAuthToken: vi.fn(),
  dispatch: vi.fn(),
  loggerLog: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock('../services/api.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api.service')>();
  const apiService = Object.create(actual.default) as typeof actual.default;
  apiService.get = mocks.apiGet;
  apiService.post = mocks.apiPost;
  apiService.put = mocks.apiPut;
  apiService.setAuthToken = mocks.apiSetAuthToken;

  return {
    ...actual,
    default: apiService,
    ProductionTokenManager: actual.ProductionTokenManager,
  };
});

vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: () => null,
}));

vi.mock('../services/client-progress-service', () => ({
  createClientProgressService: () => ({}),
}));

vi.mock('../services/exercise-service', () => ({
  createExerciseService: () => ({}),
}));

vi.mock('../services/adminClientService', () => ({
  createAdminClientService: () => ({}),
}));

vi.mock('../services/session-service', () => ({
  default: {},
}));

vi.mock('../hooks/useBackendConnection', () => ({
  useBackendConnection: () => ({}),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    log: mocks.loggerLog,
    warn: mocks.loggerWarn,
    debug: vi.fn(),
  },
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
};

const makeJwt = (subject: string): string => {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => btoa(JSON.stringify(value));
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: subject, iat: now - 60, exp: now + 3600 })}.${encode(subject)}`;
};

const accountA: User = {
  id: 'account-a',
  email: 'account-a@example.test',
  username: 'account-a',
  firstName: 'Account',
  lastName: 'A',
  role: 'client',
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const accountB: User = {
  ...accountA,
  id: 'account-b',
  email: 'account-b@example.test',
  username: 'account-b',
  lastName: 'B',
};

let latestAuth: ReturnType<typeof useAuth> | null = null;
let unsubscribeRotation: (() => void) | null = null;
const refreshTransport = vi.spyOn(axios, 'post');

const AuthProbe = () => {
  latestAuth = useAuth();
  const { loading, user } = latestAuth;
  return (
    <div data-testid="auth-state">
      {loading ? 'loading' : user?.id ?? 'guest'}
    </div>
  );
};

const renderProvider = () => render(
  <AuthProvider>
    <AuthProbe />
  </AuthProvider>
);

const setSession = (token: string, timestamp = Date.now()) => {
  ProductionTokenManager.setToken(token);
  ProductionTokenManager.setRefreshToken('refresh-A');
  localStorage.setItem('tokenTimestamp', String(timestamp));
};

describe('AuthProvider refresh ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshTransport.mockReset();
    latestAuth = null;
    unsubscribeRotation = null;
    ProductionTokenManager.clearAuthData();
    localStorage.clear();
    sessionStorage.clear();
    mocks.apiGet.mockResolvedValue({ data: { user: accountA } });
    mocks.apiPost.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    unsubscribeRotation?.();
    unsubscribeRotation = null;
    ProductionTokenManager.clearAuthData();
  });

  it('preserves replacement B when age refresh A becomes superseded and returns false', async () => {
    const tokenA = makeJwt('A');
    const tokenB = makeJwt('B');
    const refresh = deferred<unknown>();
    refreshTransport.mockReturnValue(refresh.promise as ReturnType<typeof axios.post>);
    setSession(tokenA, Date.now() - (25 * 60 * 60 * 1000));

    renderProvider();

    await waitFor(() => expect(refreshTransport).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/refresh-token'),
      { refreshToken: 'refresh-A' },
    ));

    act(() => {
      ProductionTokenManager.setToken(tokenB);
    });
    await act(async () => {
      refresh.reject({ response: { status: 401 } });
      await refresh.promise.catch(() => undefined);
    });

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('guest'));
    expect(ProductionTokenManager.getToken()).toBe(tokenB);
    expect(localStorage.getItem('token')).toBe(tokenB);
    expect(mocks.apiSetAuthToken).not.toHaveBeenCalledWith(null);
  });

  it('does not store stale A when a successful refresh is superseded by B before provider continuation', async () => {
    const tokenA = makeJwt('A');
    const tokenB = makeJwt('B');
    setSession(tokenA);
    mocks.apiGet.mockResolvedValue({ data: { user: accountA } });
    refreshTransport.mockResolvedValue({
      data: { success: true, token: tokenA, refreshToken: 'refresh-A' },
    } as never);

    renderProvider();
    await waitFor(() => expect(latestAuth?.user?.id).toBe(accountA.id));
    mocks.apiSetAuthToken.mockClear();

    let rotated = false;
    unsubscribeRotation = ProductionTokenManager.subscribe((token) => {
      if (token === tokenA && !rotated) {
        rotated = true;
        ProductionTokenManager.setToken(tokenB);
        ProductionTokenManager.setRefreshToken('refresh-B');
      }
    });

    let result: boolean | undefined;
    await act(async () => {
      result = await latestAuth!.refreshToken();
    });

    expect(result).toBe(false);
    expect(ProductionTokenManager.getToken()).toBe(tokenB);
    expect(ProductionTokenManager.getRefreshToken()).toBe('refresh-B');
    expect(mocks.apiSetAuthToken).not.toHaveBeenCalledWith(tokenA);
  });

  it('preserves B installed by the failed age-refresh cleanup notification', async () => {
    const tokenB = makeJwt('B');
    setSession(makeJwt('A'), Date.now() - 25 * 60 * 60 * 1000);
    refreshTransport.mockResolvedValue({ data: { success: false } } as never);
    let replaced = false;
    unsubscribeRotation = ProductionTokenManager.subscribe(value => {
      if (value === null && !replaced) {
        replaced = true;
        ProductionTokenManager.setToken(tokenB);
        ProductionTokenManager.setRefreshToken('refresh-B');
      }
    });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('guest'));
    expect(ProductionTokenManager.getToken()).toBe(tokenB);
    expect(ProductionTokenManager.getRefreshToken()).toBe('refresh-B');
    expect(mocks.apiSetAuthToken).not.toHaveBeenCalledWith(null);
  });

  it('does not publish stale A from /api/auth/me after canonical token rotates to B', async () => {
    const tokenA = makeJwt('A');
    const tokenB = makeJwt('B');
    const profile = deferred<{ data: { user: User } }>();
    setSession(tokenA);
    mocks.apiGet.mockReturnValue(profile.promise);

    renderProvider();
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledWith('/api/auth/me'));

    act(() => {
      ProductionTokenManager.setToken(tokenB);
    });
    await act(async () => {
      profile.resolve({ data: { user: accountA } });
      await profile.promise;
    });

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('guest'));
    expect(latestAuth?.user).toBeNull();
    expect(ProductionTokenManager.getToken()).toBe(tokenB);
  });

  it('does not clear replacement B when a stale /api/auth/me rejection arrives', async () => {
    const tokenA = makeJwt('A');
    const tokenB = makeJwt('B');
    const profile = deferred<{ data: { user: User } }>();
    setSession(tokenA);
    mocks.apiGet.mockReturnValue(profile.promise);

    renderProvider();
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledWith('/api/auth/me'));

    act(() => {
      ProductionTokenManager.setToken(tokenB);
    });
    await act(async () => {
      profile.reject({ response: { status: 401 } });
      await profile.promise.catch(() => undefined);
    });

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('guest'));
    expect(ProductionTokenManager.getToken()).toBe(tokenB);
    expect(localStorage.getItem('token')).toBe(tokenB);
    expect(mocks.apiSetAuthToken).not.toHaveBeenCalledWith(null);
  });

  it('does not publish stale public refreshUser data after token ownership moves to B', async () => {
    const tokenA = makeJwt('A');
    const tokenB = makeJwt('B');
    const refreshUserRequest = deferred<{ data: { user: User } }>();
    setSession(tokenA);
    mocks.apiGet.mockResolvedValueOnce({ data: { user: accountB } });

    renderProvider();
    await waitFor(() => expect(latestAuth?.user?.id).toBe(accountB.id));
    mocks.apiGet.mockReturnValueOnce(refreshUserRequest.promise);

    let result: Awaited<ReturnType<NonNullable<typeof latestAuth>['refreshUser']>> | undefined;
    const refreshPromise = act(async () => {
      result = await latestAuth!.refreshUser();
    });
    await waitFor(() => expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/auth/me'));

    act(() => {
      ProductionTokenManager.setToken(tokenB);
    });
    refreshUserRequest.resolve({ data: { user: accountA } });
    await refreshPromise;

    expect(result?.success).toBe(false);
    expect(latestAuth?.user?.id).toBe(accountB.id);
    expect(ProductionTokenManager.getToken()).toBe(tokenB);
  });

  it('does not publish a stale public refreshUser error after token ownership moves to B', async () => {
    const tokenA = makeJwt('A');
    const tokenB = makeJwt('B');
    const refreshUserRequest = deferred<{ data: { user: User } }>();
    setSession(tokenA);
    mocks.apiGet.mockResolvedValueOnce({ data: { user: accountB } });

    renderProvider();
    await waitFor(() => expect(latestAuth?.user?.id).toBe(accountB.id));
    mocks.apiGet.mockReturnValueOnce(refreshUserRequest.promise);

    let result: Awaited<ReturnType<NonNullable<typeof latestAuth>['refreshUser']>> | undefined;
    const refreshPromise = act(async () => {
      result = await latestAuth!.refreshUser();
    });
    await waitFor(() => expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/auth/me'));

    act(() => {
      ProductionTokenManager.setToken(tokenB);
    });
    refreshUserRequest.reject({ response: { status: 401 } });
    await refreshPromise;

    expect(result?.success).toBe(false);
    expect(latestAuth?.user?.id).toBe(accountB.id);
    expect(latestAuth?.error).toBeNull();
    expect(ProductionTokenManager.getToken()).toBe(tokenB);
  });
});
