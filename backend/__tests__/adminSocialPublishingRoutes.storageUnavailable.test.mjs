import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nativePublisherMock = vi.hoisted(() => ({
  getHealth: vi.fn(),
  listAccounts: vi.fn(),
  getHistory: vi.fn(),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
}));

vi.mock('../services/nativeSocialPublishingService.mjs', () => ({
  default: nativePublisherMock,
  PROVIDER_CAPABILITIES: [
    {
      id: 'bluesky',
      name: 'Bluesky',
      native: true,
      implementationStatus: 'available',
      connectionType: 'app_password',
    },
  ],
}));

const { default: adminSocialPublishingRoutes } = await import('../routes/adminSocialPublishingRoutes.mjs');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/social-publishing', adminSocialPublishingRoutes);
  return app;
};

const makeStorageError = table => Object.assign(
  new Error(`relation "${table}" does not exist`),
  { code: '42P01' },
);

describe('adminSocialPublishingRoutes storage unavailable fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns degraded health instead of 500 when native storage is missing', async () => {
    nativePublisherMock.getHealth.mockRejectedValueOnce(makeStorageError('social_publishing_accounts'));

    const response = await request(buildApp()).get('/api/admin/social-publishing/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      degraded: true,
      data: expect.objectContaining({
        configured: false,
        mode: 'native',
        storage: expect.objectContaining({ reason: 'storage_unavailable' }),
      }),
    }));
  });

  it('returns an empty degraded account list when account storage is missing', async () => {
    nativePublisherMock.listAccounts.mockRejectedValueOnce(makeStorageError('social_publishing_accounts'));

    const response = await request(buildApp()).get('/api/admin/social-publishing/accounts');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      degraded: true,
      data: [],
      storage: expect.objectContaining({ reason: 'storage_unavailable' }),
    }));
  });

  it('returns an empty degraded history list when job storage is missing', async () => {
    nativePublisherMock.getHistory.mockRejectedValueOnce(makeStorageError('social_publishing_jobs'));

    const response = await request(buildApp()).get('/api/admin/social-publishing/history');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      degraded: true,
      data: [],
      storage: expect.objectContaining({ reason: 'storage_unavailable' }),
    }));
  });
});
