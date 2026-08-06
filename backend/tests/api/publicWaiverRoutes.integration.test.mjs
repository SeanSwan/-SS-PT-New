/**
 * Public waiver routes — real router, real middleware chain
 * ==========================================================
 * SWA-140 dry-loop round 5. Every other waiver test mocks the model layer and
 * calls the controller directly, which cannot see whether the ROUTER is wired
 * correctly — middleware order, the limiter actually being attached, the JSON
 * body parser, or a handler that throws before validation ever runs.
 *
 * This mounts the genuine `publicWaiverRoutes` module in a real Express app
 * and drives it over HTTP. Only the model layer is stubbed, because there is
 * no database in this environment.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { mockGetModel, mockLogger } = vi.hoisted(() => ({
  mockGetModel: vi.fn(),
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../utils/logger.mjs', () => ({ default: mockLogger }));
vi.mock('../../models/index.mjs', () => ({
  getModel: mockGetModel,
  Op: { in: Symbol('in'), lte: Symbol('lte'), or: Symbol('or') },
}));
vi.mock('../../database.mjs', () => ({
  default: { transaction: vi.fn(async () => ({ commit: vi.fn(), rollback: vi.fn() })) },
}));

const publicWaiverRoutes = (await import('../../routes/publicWaiverRoutes.mjs')).default;
const { __clearVersionsCache } = await import('../../controllers/publicWaiverController.mjs');

const VERSIONS = [
  { id: 1, waiverType: 'core', activityType: null, version: '2.0', title: 'Core', htmlText: '<p>core</p><script>alert(1)</script>', markdownText: null, textHash: 'a'.repeat(64), effectiveAt: new Date('2026-08-01') },
  { id: 2, waiverType: 'ai_notice', activityType: null, version: '2.0', title: 'Swan Coach', htmlText: '<p>coach</p>', markdownText: null, textHash: 'b'.repeat(64), effectiveAt: new Date('2026-08-01') },
  { id: 3, waiverType: 'activity_addendum', activityType: 'HOME_GYM_PT', version: '2.0', title: 'Home Gym', htmlText: '<p>home</p>', markdownText: null, textHash: 'c'.repeat(64), effectiveAt: new Date('2026-08-01') },
];

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/public/waivers', publicWaiverRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  __clearVersionsCache();
  mockGetModel.mockImplementation((name) => {
    if (name === 'WaiverVersion') return { findAll: vi.fn().mockResolvedValue(VERSIONS) };
    if (name === 'WaiverRecord') {
      return {
        findOne: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation((data) => ({ id: 501, metadata: data.metadata, update: vi.fn() })),
      };
    }
    if (name === 'WaiverRecordVersion') return { bulkCreate: vi.fn().mockResolvedValue([]) };
    if (name === 'WaiverConsentFlags') return { create: vi.fn().mockResolvedValue({}) };
    if (name === 'User') return { findAll: vi.fn().mockResolvedValue([]) };
    if (name === 'PendingWaiverMatch') return { bulkCreate: vi.fn().mockResolvedValue([]) };
    return {};
  });
});

describe('GET /versions/current over the real router', () => {
  it('serves the document set with a bundle hash', async () => {
    const res = await request(makeApp()).get('/api/public/waivers/versions/current');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.versions).toHaveLength(3);
    expect(res.body.bundleHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('serves sanitized text — the script in the fixture never reaches the client', async () => {
    const res = await request(makeApp()).get('/api/public/waivers/versions/current');

    const core = res.body.versions.find((v) => v.waiverType === 'core');
    expect(core.displayText).toContain('<p>core</p>');
    expect(core.displayText).not.toContain('<script');
  });

  it('exposes version and effective date so the signer can see what they are signing', async () => {
    const res = await request(makeApp()).get('/api/public/waivers/versions/current');

    const core = res.body.versions.find((v) => v.waiverType === 'core');
    expect(core.version).toBe('2.0');
    expect(core.effectiveAt).toBeTruthy();
  });
});

describe('POST /submit over the real router', () => {
  const BODY = {
    fullName: 'Jane Doe',
    dateOfBirth: '1990-05-15',
    email: 'jane@example.com',
    activityTypes: ['HOME_GYM_PT'],
    signatureData: 'data:image/png;base64,abc123',
    liabilityAccepted: true,
    aiConsentAccepted: true,
    mediaConsentAccepted: false,
    source: 'qr',
  };

  it('accepts a valid adult submission end to end', async () => {
    const res = await request(makeApp()).post('/api/public/waivers/submit').send(BODY);

    expect(res.status).toBe(201);
    expect(res.body.waiverRecordId).toBe(501);
    expect(res.body.artifactSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('refuses a minor signing alone — the guard runs through the real chain', async () => {
    const minorDob = new Date();
    minorDob.setFullYear(minorDob.getFullYear() - 14);

    const res = await request(makeApp())
      .post('/api/public/waivers/submit')
      .send({ ...BODY, dateOfBirth: minorDob.toISOString().slice(0, 10) });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('WAIVER_GUARDIAN_REQUIRED');
  });

  it('refuses a stale bundle with 409', async () => {
    const res = await request(makeApp())
      .post('/api/public/waivers/submit')
      .send({ ...BODY, bundleHash: 'f'.repeat(64) });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('WAIVER_BUNDLE_STALE');
  });

  it('never leaks the signed artifact into the versions endpoint', async () => {
    const res = await request(makeApp()).get('/api/public/waivers/versions/current');
    expect(JSON.stringify(res.body)).not.toContain('artifactHtml');
  });

  it('rejects a malformed JSON body without crashing the route', async () => {
    const res = await request(makeApp())
      .post('/api/public/waivers/submit')
      .set('Content-Type', 'application/json')
      .send('{"fullName": ');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
