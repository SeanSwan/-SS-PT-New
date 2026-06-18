import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;
  delete process.env.GEMINI_BADGE_IMAGE_MODEL;
  delete process.env.AI_GEMINI_IMAGE_MODEL;
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

function makeGeminiImageResponse({ mimeType = 'image/png', data = 'aW1hZ2UtYnl0ZXM=' } = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            inlineData: {
              mimeType,
              data,
            },
          }],
        },
      }],
    }),
  };
}

describe('geminiBadgeImageService', () => {
  it('uses Gemini Nano Banana 2 as the default badge image model and stores a short URL', async () => {
    process.env.GEMINI_API_KEY = 'gemini-test-key';
    const fetchMock = vi.fn(async () => makeGeminiImageResponse());
    const storeMock = vi.fn(async () => ({
      imageUrl: '/uploads/products/badge-test.png',
      storage: 'local',
      storageKey: '/uploads/products/badge-test.png',
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { generateBadge, DEFAULT_GEMINI_BADGE_IMAGE_MODEL } = await import('../../services/geminiBadgeImageService.mjs');

    const result = await generateBadge({
      prompt: 'crystalline swan badge',
      style: 'luxury icon',
      userId: 'admin-1',
      storeImage: storeMock,
    });

    expect(DEFAULT_GEMINI_BADGE_IMAGE_MODEL).toBe('gemini-3.1-flash-image');
    expect(result).toMatchObject({
      success: true,
      imageUrl: '/uploads/products/badge-test.png',
      provider: 'gemini',
      model: 'gemini-3.1-flash-image',
    });
    expect(result.imageUrl.startsWith('data:image/')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/v1/models/gemini-3.1-flash-image:generateContent');
    expect(url).toContain('key=gemini-test-key');
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts[0].text).toContain('crystalline swan badge');
    expect(body.contents[0].parts[0].text).toContain('luxury icon');
    expect(storeMock).toHaveBeenCalledWith(expect.objectContaining({
      buffer: Buffer.from('image-bytes'),
      mimeType: 'image/png',
      userId: 'admin-1',
    }));
  });

  it('reports an admin-facing dependency failure when no Gemini key is configured', async () => {
    const { generateBadge, isConfigured } = await import('../../services/geminiBadgeImageService.mjs');

    expect(isConfigured()).toBe(false);
    await expect(generateBadge({
      prompt: 'badge',
      style: 'icon',
      userId: 'admin-1',
    })).resolves.toMatchObject({
      success: false,
      code: 'GEMINI_NOT_CONFIGURED',
    });
  });

  it('returns a provider failure without leaking raw Gemini response bodies', async () => {
    process.env.GOOGLE_API_KEY = 'google-key';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 403,
      text: async () => 'secret provider details',
    })));

    const { generateBadge } = await import('../../services/geminiBadgeImageService.mjs');

    const result = await generateBadge({
      prompt: 'badge',
      style: 'icon',
      userId: 'admin-1',
    });

    expect(result).toMatchObject({
      success: false,
      code: 'GEMINI_PROVIDER_FAILED',
      statusCode: 403,
    });
    expect(result.error).not.toContain('secret provider details');
  });
});
