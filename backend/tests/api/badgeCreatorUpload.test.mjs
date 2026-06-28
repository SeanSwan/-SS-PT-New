import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const badgeCreateMock = vi.hoisted(() => vi.fn());
const badgeCountMock = vi.hoisted(() => vi.fn(async () => 0));
const badgeFindByPkMock = vi.hoisted(() => vi.fn());
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
    findByPk: badgeFindByPkMock,
  },
}));

const { default: badgeCreatorRoutes } = await import('../../routes/badgeCreatorRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/admin/badge-creator', badgeCreatorRoutes);

const makeBadgeRecord = (overrides = {}) => {
  const record = {
    id: 'badge-1',
    name: 'Existing Badge',
    description: 'Existing badge description.',
    imageUrl: '/uploads/products/existing.png',
    category: 'general',
    difficulty: 'beginner',
    criteriaType: 'custom_criteria',
    criteria: {
      source: 'badge_upload',
      metadata: { rarity: 'common', prompt: 'admin uploaded badge art' },
    },
    rewards: { points: 50 },
    collectionId: null,
    isActive: true,
    createdBy: 'admin-1',
    createdAt: '2026-06-28T00:00:00.000Z',
    ...overrides,
  };
  record.update = vi.fn(async (updates) => Object.assign(record, updates));
  record.toJSON = () => ({ ...record, update: undefined, toJSON: undefined });
  return record;
};

describe('badge creator direct upload', () => {
  beforeEach(() => {
    badgeCreateMock.mockReset();
    badgeCountMock.mockClear();
    badgeFindByPkMock.mockReset();
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

  it('updates saved badge metadata through canonical Badge JSON fields', async () => {
    const badgeRecord = makeBadgeRecord({
      id: 'badge-edit-1',
      name: 'Old Badge',
      criteria: {
        source: 'badge_upload',
        assignment: { assignedTo: 'tab', assignedTarget: 'profile' },
        metadata: { rarity: 'common', prompt: 'admin uploaded badge art' },
      },
    });
    badgeFindByPkMock.mockResolvedValue(badgeRecord);

    const response = await request(app)
      .patch('/api/admin/badge-creator/badge-edit-1')
      .send({
        name: 'Swan Glacier Guardian',
        description: 'Updated milestone badge.',
        rarity: 'epic',
        category: 'strength',
        difficulty: 'advanced',
        abilityPoints: '180',
        assignment: { assignedTo: 'achievement', assignedTarget: 'swan_level_100' },
        isActive: false,
      });

    expect(response.status).toBe(200);
    expect(badgeRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Swan Glacier Guardian',
      description: 'Updated milestone badge.',
      category: 'strength',
      difficulty: 'advanced',
      isActive: false,
      rewards: { points: 180 },
      criteria: expect.objectContaining({
        source: 'badge_upload',
        assignment: { assignedTo: 'achievement', assignedTarget: 'swan_level_100' },
        metadata: expect.objectContaining({
          rarity: 'epic',
          prompt: 'admin uploaded badge art',
        }),
      }),
    }));
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: 'badge-edit-1',
        name: 'Swan Glacier Guardian',
        rarity: 'epic',
        xpReward: 180,
        assignedTo: 'achievement',
        assignedTarget: 'swan_level_100',
      },
    });
  });

  it('rejects invalid edit XP instead of silently resetting the reward', async () => {
    const badgeRecord = makeBadgeRecord({ id: 'badge-invalid-xp-1' });
    badgeFindByPkMock.mockResolvedValue(badgeRecord);

    const response = await request(app)
      .patch('/api/admin/badge-creator/badge-invalid-xp-1')
      .send({ abilityPoints: 'not-a-number' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'abilityPoints must be a positive number',
    });
    expect(badgeRecord.update).not.toHaveBeenCalled();
  });
  it('replaces an existing badge image without creating a new badge row', async () => {
    const badgeRecord = makeBadgeRecord({
      id: 'badge-image-1',
      name: 'Image Badge',
      criteria: { source: 'badge_upload', metadata: { rarity: 'rare' } },
      rewards: { points: 75 },
    });
    badgeFindByPkMock.mockResolvedValue(badgeRecord);
    storeGeneratedBadgeImageMock.mockResolvedValue({
      imageUrl: '/uploads/products/replacement.webp',
      storage: 'local',
      storageKey: '/uploads/products/replacement.webp',
    });

    const response = await request(app)
      .post('/api/admin/badge-creator/badge-image-1/image')
      .attach('image', Buffer.from('replacement-image'), {
        filename: 'replacement.webp',
        contentType: 'image/webp',
      });

    expect(response.status).toBe(200);
    expect(badgeCreateMock).not.toHaveBeenCalled();
    expect(storeGeneratedBadgeImageMock).toHaveBeenCalledWith(expect.objectContaining({
      buffer: expect.any(Buffer),
      mimeType: 'image/webp',
      userId: 'admin-1',
    }));
    expect(badgeRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      imageUrl: '/uploads/products/replacement.webp',
      criteria: expect.objectContaining({
        metadata: expect.objectContaining({
          rarity: 'rare',
          uploadStorage: 'local',
          uploadStorageKey: '/uploads/products/replacement.webp',
        }),
      }),
    }));
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: 'badge-image-1',
        imageUrl: '/uploads/products/replacement.webp',
        rarity: 'rare',
      },
    });
  });
});
