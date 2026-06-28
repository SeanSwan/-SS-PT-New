import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const badgeCreateMock = vi.hoisted(() => vi.fn());
const badgeCountMock = vi.hoisted(() => vi.fn(async () => 0));
const storeGeneratedBadgeImageMock = vi.hoisted(() => vi.fn());

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
}));

vi.mock('../../services/geminiBadgeImageService.mjs', () => ({
  default: {
    generateBadge: vi.fn(),
    isConfigured: vi.fn(() => true),
    checkHealth: vi.fn(async () => ({ success: true, configured: true })),
    storeGeneratedBadgeImage: storeGeneratedBadgeImageMock,
  },
  storeGeneratedBadgeImage: storeGeneratedBadgeImageMock,
  DEFAULT_GEMINI_BADGE_IMAGE_MODEL: 'gemini-3.1-flash-image',
}));

vi.mock('../../models/Badge.mjs', () => ({
  default: {
    count: badgeCountMock,
    create: badgeCreateMock,
  },
}));

const { default: badgeCreatorRoutes } = await import('../../routes/badgeCreatorRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/admin/badge-creator', badgeCreatorRoutes);

describe('badge creator direct upload', () => {
  beforeEach(() => {
    badgeCreateMock.mockReset();
    badgeCountMock.mockClear();
    storeGeneratedBadgeImageMock.mockReset();
    storeGeneratedBadgeImageMock.mockResolvedValue({
      imageUrl: '/uploads/products/badge-admin-upload.png',
      storage: 'local',
      storageKey: '/uploads/products/badge-admin-upload.png',
    });
    badgeCreateMock.mockImplementation(async (payload) => ({
      toJSON: () => ({ id: 'badge-upload-1', ...payload, createdAt: '2026-06-28T00:00:00.000Z' }),
    }));
  });

  it('stores an uploaded badge image and optional gamification assignment through Badge.imageUrl', async () => {
    const response = await request(app)
      .post('/api/admin/badge-creator/upload')
      .field('name', 'Swan Sapphire Finisher')
      .field('description', 'Awarded for a verified Swan Sapphire training milestone.')
      .field('rarity', 'legendary')
      .field('abilityPoints', '125')
      .field('assignedTo', 'achievement')
      .field('assignedTarget', 'max_level')
      .attach('image', Buffer.from('not-real-png-but-valid-buffer'), {
        filename: 'sapphire-finisher.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(201);
    expect(storeGeneratedBadgeImageMock).toHaveBeenCalledWith(expect.objectContaining({
      buffer: expect.any(Buffer),
      mimeType: 'image/png',
      userId: 'admin-1',
    }));
    expect(badgeCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Swan Sapphire Finisher',
      description: 'Awarded for a verified Swan Sapphire training milestone.',
      imageUrl: '/uploads/products/badge-admin-upload.png',
      criteriaType: 'custom_criteria',
      rewards: { points: 125 },
      createdBy: 'admin-1',
      criteria: expect.objectContaining({
        source: 'badge_upload',
        assignment: { assignedTo: 'achievement', assignedTarget: 'max_level' },
      }),
    }));
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: 'badge-upload-1',
        name: 'Swan Sapphire Finisher',
        imageUrl: '/uploads/products/badge-admin-upload.png',
        rarity: 'legendary',
        assignedTo: 'achievement',
        assignedTarget: 'max_level',
        xpReward: 125,
      },
    });
  });
});