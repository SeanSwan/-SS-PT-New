import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
}));

vi.mock('../../services/recraftService.mjs', () => ({
  default: {
    isConfigured: vi.fn(() => false),
    checkHealth: vi.fn(async () => ({
      success: false,
      configured: false,
      error: 'Recraft not configured. Set RECRAFT_API_KEY in .env',
    })),
    generateBadge: vi.fn(async () => ({
      success: false,
      error: 'Recraft API key not configured. Set RECRAFT_API_KEY in .env',
    })),
  },
}));

const { default: badgeCreatorRoutes } = await import('../../routes/badgeCreatorRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/admin/badge-creator', badgeCreatorRoutes);

describe('badge creator Recraft precondition', () => {
  it('returns a non-5xx admin-facing response when Recraft is not configured', async () => {
    const response = await request(app)
      .post('/api/admin/badge-creator/generate')
      .send({ prompt: 'crystalline swan badge', style: 'icon' });

    expect(response.status).toBe(424);
    expect(response.body).toEqual({
      success: false,
      message: 'Badge generation is not configured yet. Add RECRAFT_API_KEY on Render before using AI generation.',
    });
  });

  it('returns the same dependency response for batch generation', async () => {
    const response = await request(app)
      .post('/api/admin/badge-creator/generate-batch')
      .send({ prompt: 'crystalline swan badge', style: 'icon' });

    expect(response.status).toBe(424);
    expect(response.body.message).toBe('Badge generation is not configured yet. Add RECRAFT_API_KEY on Render before using AI generation.');
  });

  it('returns the same dependency response for pet avatar generation', async () => {
    const response = await request(app)
      .post('/api/admin/badge-creator/generate-pet-avatar')
      .send({ species: 'swan', personality: 'focused', style: 'icon' });

    expect(response.status).toBe(424);
    expect(response.body.message).toBe('Badge generation is not configured yet. Add RECRAFT_API_KEY on Render before using AI generation.');
  });
});
