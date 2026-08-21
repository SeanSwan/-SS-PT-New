/**
 * healthBuildIdentity.test.mjs
 * ============================
 * BEHAVIOURAL cover: the pure module is unit-tested next door, but a helper
 * that is never called is decoration. This drives the real health router and
 * asserts the field arrives in the actual HTTP response.
 *
 * That distinction is not academic here — six times in this workstream a test
 * passed against effectively-deleted code, including a source-text suite that
 * scored 14/14 while both guards it covered were neutered.
 *
 * The gap being closed (money-path deploy, 2026-08-21): `/health` returned
 * `{status: healthy, server: listening, ready: true}`, which is byte-identical
 * to what the PREVIOUS build would have returned. Deploy verification was an
 * assumption.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockCount: vi.fn(),
}));

// The router imports models at module load inside a try/catch. Mock it so the
// suite needs no database.
vi.mock('../../models/index.mjs', () => ({
  getStorefrontItem: () => ({ count: mocks.mockCount }),
  Op: { gt: Symbol('gt') },
}));

const ORIGINAL_ENV = { ...process.env };
process.env.RENDER_GIT_COMMIT = 'cf58d18ed0a1b2c3d4e5f60718293a4b5c6d7e8f';
process.env.RENDER_GIT_BRANCH = 'main';
process.env.RENDER_SERVICE_NAME = 'ss-pt-new';

const { default: healthRouter } = await import('../../routes/healthRoutes.mjs');

const app = () => {
  const instance = express();
  instance.use('/health', healthRouter);
  return instance;
};

describe('/health names the build that is answering', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.mockCount.mockResolvedValue(7);
  });

  it('returns the short commit', async () => {
    const response = await request(app()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.build?.commit).toBe('cf58d18');
  });

  it('returns branch and service', async () => {
    const response = await request(app()).get('/health');

    expect(response.body.build?.branch).toBe('main');
    expect(response.body.build?.service).toBe('ss-pt-new');
  });

  it('returns uptime so a restart is observable', async () => {
    const response = await request(app()).get('/health');

    expect(typeof response.body.build?.uptimeSeconds).toBe('number');
    expect(response.body.build.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('keeps the existing contract intact', async () => {
    // Render points liveness at this endpoint. Adding a field must not disturb
    // what is already there.
    const response = await request(app()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBeDefined();
    expect(response.body.server).toBe('listening');
    expect(response.body.timestamp).toBeDefined();
  });

  it('still reports the build when the database check FAILS', async () => {
    // The status branches Object.assign over the body; the build field must
    // survive that, because a degraded response is exactly when an operator
    // needs to know which deploy is degraded.
    mocks.mockCount.mockRejectedValue(new Error('db down'));

    const response = await request(app()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.build?.commit).toBe('cf58d18');
  });

  it('never publishes the full commit hash', async () => {
    const response = await request(app()).get('/health');

    expect(JSON.stringify(response.body)).not.toContain(ORIGINAL_ENV.RENDER_GIT_COMMIT ?? 'cf58d18ed0a1b2c3d4e5f60718293a4b5c6d7e8f');
  });

  it('leaks no other environment value', async () => {
    const response = await request(app()).get('/health');

    expect(Object.keys(response.body.build).sort()).toEqual(
      ['branch', 'commit', 'service', 'uptimeSeconds'].sort(),
    );
  });
});

describe('/health/ready names the build too', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.mockCount.mockResolvedValue(7);
  });

  it('returns the short commit', async () => {
    const response = await request(app()).get('/health/ready');

    expect(response.body.build?.commit).toBe('cf58d18');
  });

  it('returns it on the NOT-ready path as well', async () => {
    // Readiness fails closed. A failing readiness probe that cannot name its
    // build tells an operator nothing actionable.
    mocks.mockCount.mockRejectedValue(new Error('db down'));

    const response = await request(app()).get('/health/ready');

    expect(response.body.build?.commit).toBe('cf58d18');
    expect(response.body.ready).toBe(false);
  });
});
