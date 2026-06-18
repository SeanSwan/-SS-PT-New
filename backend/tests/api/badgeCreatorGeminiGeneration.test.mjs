import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateBadgeMock = vi.hoisted(() => vi.fn());
const isConfiguredMock = vi.hoisted(() => vi.fn(() => true));
const checkHealthMock = vi.hoisted(() => vi.fn(async () => ({
  success: true,
  configured: true,
  provider: 'gemini',
  model: 'gemini-3.1-flash-image',
})));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
}));

vi.mock('../../services/geminiBadgeImageService.mjs', () => ({
  default: {
    generateBadge: generateBadgeMock,
    isConfigured: isConfiguredMock,
    checkHealth: checkHealthMock,
  },
  generateBadge: generateBadgeMock,
  isConfigured: isConfiguredMock,
  checkHealth: checkHealthMock,
  DEFAULT_GEMINI_BADGE_IMAGE_MODEL: 'gemini-3.1-flash-image',
}));

vi.mock('../../models/Badge.mjs', () => ({
  default: {
    count: vi.fn(async () => 0),
  },
}));

const { default: badgeCreatorRoutes } = await import('../../routes/badgeCreatorRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/admin/badge-creator', badgeCreatorRoutes);

describe('badge creator Gemini generation', () => {
  beforeEach(() => {
    generateBadgeMock.mockReset();
    isConfiguredMock.mockReset();
    checkHealthMock.mockReset();
    isConfiguredMock.mockReturnValue(true);
    checkHealthMock.mockResolvedValue({
      success: true,
      configured: true,
      provider: 'gemini',
      model: 'gemini-3.1-flash-image',
    });
  });

  it('generates a badge through Gemini Nano Banana instead of Recraft', async () => {
    generateBadgeMock.mockResolvedValueOnce({
      success: true,
      imageUrl: '/uploads/products/badge-gemini.png',
      provider: 'gemini',
      model: 'gemini-3.1-flash-image',
      storage: 'local',
    });

    const response = await request(app)
      .post('/api/admin/badge-creator/generate')
      .send({ prompt: 'crystalline swan badge', style: 'luxury icon' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        imageUrl: '/uploads/products/badge-gemini.png',
        provider: 'gemini',
        model: 'gemini-3.1-flash-image',
      },
    });
    expect(generateBadgeMock).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'crystalline swan badge',
      style: 'luxury icon',
      userId: 'admin-1',
      size: 1024,
    }));
  });

  it('returns a non-5xx admin-facing response when Gemini is not configured', async () => {
    isConfiguredMock.mockReturnValueOnce(false);

    const response = await request(app)
      .post('/api/admin/badge-creator/generate')
      .send({ prompt: 'crystalline swan badge', style: 'luxury icon' });

    expect(response.status).toBe(424);
    expect(response.body).toEqual({
      success: false,
      message: 'Badge generation is not configured yet. Add GEMINI_API_KEY or GOOGLE_API_KEY on Render before using Nano Banana generation.',
    });
    expect(generateBadgeMock).not.toHaveBeenCalled();
  });

  it('reports Gemini as the badge image provider in health', async () => {
    const response = await request(app).get('/api/admin/badge-creator/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        configured: true,
        provider: 'gemini',
        model: 'gemini-3.1-flash-image',
      },
    });
  });
});
