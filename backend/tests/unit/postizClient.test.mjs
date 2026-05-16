/**
 * Postiz Client - Public API Contract Tests
 * =========================================
 * Guards SwanStudios social publishing against Postiz public API drift.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = {
  POSTIZ_API_URL: process.env.POSTIZ_API_URL,
  POSTIZ_API_KEY: process.env.POSTIZ_API_KEY,
  POSTIZ_AUTH_SCHEME: process.env.POSTIZ_AUTH_SCHEME,
};

const setPostizEnv = (overrides = {}) => {
  delete process.env.POSTIZ_API_URL;
  delete process.env.POSTIZ_API_KEY;
  delete process.env.POSTIZ_AUTH_SCHEME;
  Object.assign(process.env, overrides);
};

const importClient = async (env = {}) => {
  vi.resetModules();
  setPostizEnv(env);
  return import('../../services/postizClient.mjs');
};

const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
  json: vi.fn(async () => data),
  text: vi.fn(async () => JSON.stringify(data)),
});

describe('postizClient public API contract', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setPostizEnv(ORIGINAL_ENV);
  });

  it('fails closed when Postiz env is missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { checkHealth } = await importClient();
    const health = await checkHealth();

    expect(health).toEqual({
      success: false,
      configured: false,
      error: 'Postiz not configured. Set POSTIZ_API_URL and POSTIZ_API_KEY in .env',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lists integrations through /public/v1 and normalizes account fields', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([
      {
        id: 'acct-1',
        name: 'Swan Studios',
        identifier: 'bluesky',
        profile: 'swanstudios',
        picture: 'https://example.test/avatar.jpg',
        disabled: false,
      },
    ]));
    vi.stubGlobal('fetch', fetchMock);

    const { listConnectedAccounts } = await importClient({
      POSTIZ_API_URL: 'https://api.postiz.com',
      POSTIZ_API_KEY: 'test-postiz-key',
    });
    const result = await listConnectedAccounts();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.postiz.com/public/v1/integrations',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'test-postiz-key',
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'acct-1',
        platform: 'bluesky',
        name: 'Swan Studios',
        profile: 'swanstudios',
        disabled: false,
      }),
    ]);
  });

  it('uses the current OAuth URL endpoint for connecting channels', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ url: 'https://oauth.example.test/start' }));
    vi.stubGlobal('fetch', fetchMock);

    const { getOAuthUrl } = await importClient({
      POSTIZ_API_URL: 'https://api.postiz.com/public/v1/',
      POSTIZ_API_KEY: 'test-postiz-key',
    });
    const result = await getOAuthUrl('instagram');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.postiz.com/public/v1/social/instagram',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result).toEqual({ success: true, data: { url: 'https://oauth.example.test/start' } });
  });

  it('builds the documented create-post payload with platform settings', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([
        { id: 'acct-1', name: 'Swan Studios', identifier: 'bluesky' },
      ]))
      .mockResolvedValueOnce(jsonResponse([{ postId: 'post-1', integration: 'acct-1' }]));
    vi.stubGlobal('fetch', fetchMock);

    const { publishPost } = await importClient({
      POSTIZ_API_URL: 'https://api.postiz.com',
      POSTIZ_API_KEY: 'test-postiz-key',
    });
    const result = await publishPost({
      content: 'Training tip for today',
      platformIds: ['acct-1'],
      scheduledAt: '2026-05-16T18:00:00.000Z',
    });

    const postCall = fetchMock.mock.calls[1];
    expect(postCall[0]).toBe('https://api.postiz.com/public/v1/posts');
    expect(JSON.parse(postCall[1].body)).toEqual({
      type: 'schedule',
      date: '2026-05-16T18:00:00.000Z',
      shortLink: false,
      tags: [],
      posts: [
        {
          integration: { id: 'acct-1' },
          value: [{ content: 'Training tip for today', image: [] }],
          settings: { __type: 'bluesky' },
        },
      ],
    });
    expect(result).toEqual({ success: true, data: [{ postId: 'post-1', integration: 'acct-1' }] });
  });
});
