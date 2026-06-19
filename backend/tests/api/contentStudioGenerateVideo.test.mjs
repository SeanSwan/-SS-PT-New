import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockRole = 'admin';

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 'admin-1', role: mockRole };
    next();
  },
  adminOnly: (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Admin access required' });
  },
}));

const { default: contentStudioRoutes } = await import('../../routes/contentStudioRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/content-studio', contentStudioRoutes);

const originalEnv = {
  SEEDANCE_API_KEY: process.env.SEEDANCE_API_KEY,
  SEEDANCE_API_URL: process.env.SEEDANCE_API_URL,
  DREAMINA_API_KEY: process.env.DREAMINA_API_KEY,
  DREAMINA_API_URL: process.env.DREAMINA_API_URL,
  HIGGSFIELD_API_URL: process.env.HIGGSFIELD_API_URL,
};

function restoreVideoEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe('Content Studio generate-video route', () => {
  beforeEach(() => {
    mockRole = 'admin';
    restoreVideoEnv();
    delete process.env.SEEDANCE_API_KEY;
    delete process.env.SEEDANCE_API_URL;
    delete process.env.DREAMINA_API_KEY;
    delete process.env.DREAMINA_API_URL;
    delete process.env.HIGGSFIELD_API_URL;
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    restoreVideoEnv();
    vi.unstubAllGlobals();
  });

  it('rejects invalid prompts before calling a provider', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app)
      .post('/api/content-studio/generate-video')
      .send({ prompt: '   ', category: 'exercise-demo', style: 'cinematic', duration: 10 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Prompt is required.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a configuration dependency error when no video provider is ready', async () => {
    const response = await request(app)
      .post('/api/content-studio/generate-video')
      .send({
        prompt: 'Side angle kettlebell deadlift demo with clear hip hinge form.',
        category: 'exercise-demo',
        style: 'cinematic',
        duration: 10,
      });

    expect(response.status).toBe(424);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Seedance video generation is not configured yet. Set SEEDANCE_API_KEY and SEEDANCE_API_URL on Render.',
    });
  });

  it('calls the configured provider with a bounded content-studio payload', async () => {
    process.env.SEEDANCE_API_KEY = 'test-seedance-key';
    process.env.SEEDANCE_API_URL = 'https://provider.swanstudios.test/v1/video/generations';

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'provider-job-123',
        status: 'queued',
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app)
      .post('/api/content-studio/generate-video')
      .send({
        prompt: 'Side angle kettlebell deadlift demo with clear hip hinge form.',
        category: 'exercise-demo',
        style: 'dynamic',
        duration: 15,
        ignoredField: 'must-not-forward',
      });

    expect(response.status).toBe(202);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        provider: 'seedance',
        providerJobId: 'provider-job-123',
        status: 'queued',
        videoUrl: null,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://provider.swanstudios.test/v1/video/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-seedance-key',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const providerBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(providerBody).toEqual({
      prompt: 'Side angle kettlebell deadlift demo with clear hip hinge form.',
      category: 'exercise-demo',
      style: 'dynamic',
      duration: 15,
      metadata: {
        source: 'swanstudios-content-studio',
        requestedBy: 'admin-1',
      },
    });
  });
});
