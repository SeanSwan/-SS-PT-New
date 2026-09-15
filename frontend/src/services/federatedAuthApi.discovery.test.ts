import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FederatedAuthApi } from './federatedAuthApi';

describe('FederatedAuthApi.getAuthMethods DTO boundary', () => {
  let api: FederatedAuthApi;
  let get: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    api = new FederatedAuthApi();
    get = vi.fn();
    (api as unknown as { client: { get: typeof get } }).client = { get };
  });

  it.each([
    ['undefined response data', undefined],
    ['success data array', { success: true, data: [] }],
    ['missing methods', { success: true }],
    ['null methods', { methods: null }],
    ['missing providers', { methods: { emailPassword: true, magicLink: false, passkey: false } }],
    ['providers is not an array', { methods: { emailPassword: true, magicLink: false, passkey: false, providers: null } }],
    ['non-boolean method flag', { methods: { emailPassword: 'true', magicLink: false, passkey: false, providers: [] } }],
    ['provider missing id', { methods: { emailPassword: true, magicLink: false, passkey: false, providers: [{ label: 'Google' }] } }],
    ['provider blank label', { methods: { emailPassword: true, magicLink: false, passkey: false, providers: [{ id: 'google', label: ' ' }] } }],
    ['duplicate provider ids', { methods: { emailPassword: true, magicLink: false, passkey: false, providers: [{ id: 'google', label: 'Google' }, { id: 'google', label: 'Google again' }] } }],
  ])('rejects malformed %s without returning an undefined methods object', async (_name, data) => {
    get.mockResolvedValue({ data });

    await expect(api.getAuthMethods()).rejects.toThrow('Invalid authentication methods response');
  });

  it('accepts the server DTO with no optional providers', async () => {
    const methods = { emailPassword: true, magicLink: false, passkey: false, providers: [] };
    get.mockResolvedValue({ data: { success: true, methods } });

    await expect(api.getAuthMethods()).resolves.toEqual(methods);
  });

  it('accepts valid server-enabled provider choices and preserves their labels', async () => {
    const methods = {
      emailPassword: true,
      magicLink: true,
      passkey: false,
      providers: [{ id: 'google', label: 'Google' }, { id: 'tiktok', label: 'TikTok' }],
    };
    get.mockResolvedValue({ data: { success: true, methods } });

    await expect(api.getAuthMethods()).resolves.toEqual(methods);
  });
});
