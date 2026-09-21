/**
 * Shared rig for the SwanGuard -> SwanStudios Spotlight bridge suites.
 *
 * WHY: `bridgeSpotlightOrdering.contract.test.mjs` was 417 lines against `06-bans.md` #50's
 * 300-line budget (hostile review R5-08). 88 of those lines were this rig, and more than one
 * suite needs it — so it lives here rather than being duplicated into each. A copy would drift,
 * and the drift would be invisible: the suites assert against these very mocks.
 *
 * ── WHAT THIS MOCK SET CAN AND CANNOT PROVE ──────────────────────────────────────
 * The model and both network-touching services are mocked. Nothing reached from here touches
 * DNS, R2, or a database — so a suite using it can prove a predicate is CONSTRUCTED and a
 * branch is TAKEN. It cannot prove PostgreSQL honours the predicate under real concurrency;
 * that needs a live database and is recorded as `[UNKNOWN]`, not asserted.
 *
 * ── THE HOISTING RULE ────────────────────────────────────────────────────────────
 * `vi.mock(path, factory)` is hoisted above the imports of the module it appears in, so the
 * factory may only close over bindings already initialised at that moment. A suite therefore
 * CANNOT declare these mocks and pass them in — the factory would be hoisted out of the suite
 * and fail with `ReferenceError`. The declarations are hoisted HERE, in this module, next to the
 * factories that use them. Same arrangement (and same three measured failures) as
 * `coachSignalHarness.mjs`; see its header for the full account.
 */
import express from 'express';
import request from 'supertest';
import { Op } from 'sequelize';
import { afterEach, beforeEach, vi } from 'vitest';

const {
  mockFindByPk, mockUpdate, mockCreate, mockFindAll, mockUploadPhoto, mockFetchDecode,
} = await vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    mockFindByPk: fn(), mockUpdate: fn(), mockCreate: fn(),
    mockFindAll: fn(), mockUploadPhoto: fn(), mockFetchDecode: fn(),
  };
});

vi.mock('../../models/social/SwanSpotlight.mjs', () => ({
  default: { findByPk: mockFindByPk, update: mockUpdate, create: mockCreate, findAll: mockFindAll },
}));

// NOTE: the route imports `uploadPhoto` from photoStorageService.mjs. S3's suite mocks
// r2StorageService.mjs, which does not export it — so its image assertions currently pass
// because the REAL upload fails on missing credentials, not because the mock fired. These are
// the specifiers the route actually resolves. (Since 2026-09-20 the call lives in
// services/bridgeSpotlightImageRehost.mjs, which resolves the same two specifiers.)
vi.mock('../../services/photoStorageService.mjs', () => ({ uploadPhoto: mockUploadPhoto }));
vi.mock('../../services/spotlightImageFetch.mjs', () => ({
  fetchAndDecodeSpotlightImage: mockFetchDecode,
}));

export const mocks = {
  mockFindByPk, mockUpdate, mockCreate, mockFindAll, mockUploadPhoto, mockFetchDecode,
};

export const SECRET = 'test-swan-bridge-secret-value-0123456789';
export const ITEM = '11111111-2222-3333-4444-555555555555';

export const body = (overrides = {}) => ({
  itemId: ITEM,
  revision: 1,
  retracted: false,
  headline: 'A community garden doubled its harvest',
  imageUrl: null,
  ...overrides,
});

/** The predicate the database is asked to evaluate — the whole point of the D1 fix. */
export const predicateOf = (call) => call[1]?.where?.revision?.[Op.lt];

/**
 * Bind the mocked dependency graph and hand back the app plus the two request helpers.
 * Await at the top of a suite: the dynamic imports here are what bind the mocks registered
 * above, and the returned `signPayload` is the real signer, not a stub — the signature path
 * is deliberately NOT mocked, so a suite proves the route accepts a genuine signature.
 */
export const installBridgeSpotlightHarness = async () => {
  const { signPayload } = await import('../../services/swanBridgeSignature.mjs');
  const { default: bridgeRouter } = await import('../../routes/bridge/bridgeIngestRoutes.mjs');

  const app = express();
  app.use('/api/bridge', bridgeRouter);

  /** The regression rig: a global JSON parser mounted BEFORE the bridge router. */
  const preParsedApp = express();
  preParsedApp.use(express.json());
  preParsedApp.use('/api/bridge', bridgeRouter);

  const send = (target, payload, opts = {}) => {
    const raw = JSON.stringify(payload);
    const timestamp = opts.timestamp ?? new Date().toISOString();
    const signature = opts.signature ?? signPayload(timestamp, Buffer.from(raw), SECRET);
    return request(target)
      .post('/api/bridge/spotlight')
      .set('Content-Type', 'application/json')
      .set('X-Swan-Signature', signature)
      .set('X-Swan-Timestamp', timestamp)
      .send(raw);
  };

  const getManifest = (opts = {}) => {
    void opts;
    const timestamp = new Date().toISOString();
    const signature = signPayload(timestamp, Buffer.alloc(0), SECRET);
    return request(app)
      .get('/api/bridge/spotlight/manifest')
      .set('X-Swan-Signature', signature)
      .set('X-Swan-Timestamp', timestamp);
  };

  beforeEach(() => {
    process.env.SPOTLIGHT_ENABLED = 'true';
    process.env.SWAN_BRIDGE_SECRET_V1 = SECRET;
    mockFindByPk.mockReset().mockResolvedValue(null);
    // Default: the conditional UPDATE matches nothing, so the create path runs.
    mockUpdate.mockReset().mockResolvedValue([0]);
    mockCreate.mockReset().mockResolvedValue({});
    mockFindAll.mockReset().mockResolvedValue([]);
    mockUploadPhoto.mockReset();
    mockFetchDecode.mockReset();
  });

  afterEach(() => {
    delete process.env.SPOTLIGHT_ENABLED;
    delete process.env.SWAN_BRIDGE_SECRET_V1;
  });

  return { app, preParsedApp, send, getManifest, signPayload };
};
