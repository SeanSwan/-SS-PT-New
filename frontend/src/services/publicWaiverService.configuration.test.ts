import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicWaiverSubmission } from './publicWaiverService';

type RequestConfig = { headers?: Record<string, string> };

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  getToken: vi.fn(),
  instances: [] as Array<{
    config: { baseURL?: string; timeout?: number; headers?: Record<string, string> };
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    requestInterceptor?: (config: RequestConfig) => RequestConfig;
  }>,
}));

vi.mock('axios', () => ({
  default: { create: mocks.create },
}));

vi.mock('./api.service', () => ({
  ProductionTokenManager: { getToken: mocks.getToken },
}));

const importServiceWithEnv = async (env: {
  apiUrl?: string;
  apiBaseUrl?: string;
  backendUrl?: string;
  production?: boolean;
}) => {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', env.apiUrl ?? '');
  vi.stubEnv('VITE_API_BASE_URL', env.apiBaseUrl ?? '');
  vi.stubEnv('VITE_BACKEND_URL', env.backendUrl ?? '');
  vi.stubEnv('PROD', env.production === true);
  vi.stubEnv('DEV', env.production !== true);

  const get = vi.fn().mockResolvedValue({ data: { versions: [], bundleHash: null } });
  const post = vi.fn().mockResolvedValue({ data: { success: true } });
  const instance = {
    config: {},
    get,
    post,
    interceptors: {
      request: {
        use: vi.fn((interceptor: (config: RequestConfig) => RequestConfig) => {
          instance.requestInterceptor = interceptor;
        }),
      },
    },
    requestInterceptor: undefined as ((config: RequestConfig) => RequestConfig) | undefined,
  };
  mocks.create.mockImplementationOnce((config: typeof instance.config) => {
    instance.config = config;
    mocks.instances.push(instance);
    return instance;
  });

  const service = await import('./publicWaiverService');
  return { service, instance };
};

describe('public waiver transport configuration', () => {
  beforeEach(() => {
    mocks.create.mockReset();
    mocks.getToken.mockReset();
    mocks.instances.length = 0;
    mocks.getToken.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['configured origin', { apiUrl: 'https://waiver.example.test' }, 'https://waiver.example.test/api/public/waivers'],
    ['configured /api', { apiUrl: 'https://waiver.example.test/api' }, 'https://waiver.example.test/api/public/waivers'],
    ['configured /api with slash', { apiUrl: 'https://waiver.example.test/api/' }, 'https://waiver.example.test/api/public/waivers'],
    ['configured whitespace', { apiUrl: '  https://waiver.example.test/api/  ' }, 'https://waiver.example.test/api/public/waivers'],
    ['alternate API base', { apiBaseUrl: 'https://base.example.test/' }, 'https://base.example.test/api/public/waivers'],
    ['alternate backend URL', { backendUrl: 'https://backend.example.test/api/' }, 'https://backend.example.test/api/public/waivers'],
  ])('normalizes %s without duplicating the public API suffix', async (_label, env, expected) => {
    await importServiceWithEnv(env);
    expect(mocks.instances[0]?.config.baseURL).toBe(expected);
  });

  it('uses the documented precedence after trimming empty candidates', async () => {
    await importServiceWithEnv({
      apiUrl: '  ',
      apiBaseUrl: 'https://base.example.test/api',
      backendUrl: 'https://backend.example.test/api',
    });

    expect(mocks.instances[0]?.config.baseURL).toBe('https://base.example.test/api/public/waivers');
  });

  it('uses same-origin public API in production when no URL is configured', async () => {
    await importServiceWithEnv({ production: true });
    expect(mocks.instances[0]?.config.baseURL).toBe('/api/public/waivers');
  });

  it('keeps the development localhost fallback when no URL is configured', async () => {
    await importServiceWithEnv({ production: false });
    expect(mocks.instances[0]?.config.baseURL).toBe('http://localhost:10000/api/public/waivers');
  });

  it('keeps the public client contract and optional canonical token behavior', async () => {
    const { service, instance } = await importServiceWithEnv({ apiUrl: 'https://waiver.example.test' });
    expect(instance.config.timeout).toBe(30000);
    expect(instance.config.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(instance.requestInterceptor).toBeTypeOf('function');

    const publicConfig = instance.requestInterceptor?.({ headers: {} });
    expect(publicConfig?.headers).toEqual({});

    mocks.getToken.mockReturnValue('canonical-test-token');
    const authenticatedConfig = instance.requestInterceptor?.({ headers: {} });
    expect(authenticatedConfig?.headers).toEqual({ Authorization: 'Bearer canonical-test-token' });

    const submission = {
      fullName: 'Test Visitor',
      dateOfBirth: '1990-01-01',
      activityTypes: ['HOME_GYM_PT'],
      signatureData: 'typed-signature',
      liabilityAccepted: true,
      aiConsentAccepted: false,
      mediaConsentAccepted: false,
      source: 'qr',
      idempotencyKey: 'waiver-test-key',
      bundleHash: 'bundle-hash',
    } satisfies PublicWaiverSubmission;
    await service.fetchCurrentWaiverVersions();
    await service.submitPublicWaiver(submission);
    expect(instance.get).toHaveBeenCalledWith('/versions/current');
    expect(instance.post).toHaveBeenCalledWith('/submit', submission);
  });
});
