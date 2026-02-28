/**
 * Public Waiver Submit Controller Tests — Phase 5W-G
 * ===================================================
 * Covers:
 *   Section A: getCurrentWaiverVersions (4 tests)
 *   Section B: submitPublicWaiver (18 tests)
 *
 * Contract: WAIVER-CONSENT-QR-FLOW-CONTRACT.md §5, §10.1, §12.6/7/8
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Hoisted mock primitives ──────────────────────────────────
const {
  mockLogger,
  mockFindAll,
  mockFindOne,
  mockCreate,
  mockBulkCreate,
  mockTransaction,
  mockCommit,
  mockRollback,
  mockGetModel,
} = vi.hoisted(() => {
  const mockCommit = vi.fn();
  const mockRollback = vi.fn();
  return {
    mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    mockFindAll: vi.fn(),
    mockFindOne: vi.fn(),
    mockCreate: vi.fn(),
    mockBulkCreate: vi.fn(),
    mockTransaction: { commit: mockCommit, rollback: mockRollback },
    mockCommit,
    mockRollback,
    mockGetModel: vi.fn(),
  };
});

vi.mock('../../utils/logger.mjs', () => ({ default: mockLogger }));

vi.mock('../../models/index.mjs', () => ({
  getModel: mockGetModel,
  Op: {
    in: Symbol('in'),
    lte: Symbol('lte'),
    or: Symbol('or'),
  },
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: vi.fn(async () => mockTransaction) },
}));

import {
  getCurrentWaiverVersions,
  submitPublicWaiver,
} from '../../controllers/publicWaiverController.mjs';

// ── Helpers ────────────────────────────────────────────────────

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
  };
  return res;
}

function makeReq(body = {}, user = null) {
  return {
    body,
    user,
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test-agent' },
  };
}

const VALID_BODY = {
  fullName: 'Jane Doe',
  dateOfBirth: '1990-05-15',
  email: 'jane@example.com',
  phone: '+1234567890',
  activityTypes: ['HOME_GYM_PT'],
  signatureData: 'data:image/png;base64,abc123',
  liabilityAccepted: true,
  aiConsentAccepted: true,
  mediaConsentAccepted: false,
  source: 'qr',
};

function makeVersionRows(overrides = []) {
  const defaults = [
    { id: 1, waiverType: 'core', activityType: null, title: 'Core Waiver', htmlText: '<p>Core waiver text</p>', markdownText: '# Core', textHash: 'a'.repeat(64), effectiveAt: new Date('2026-01-01') },
    { id: 2, waiverType: 'ai_notice', activityType: null, title: 'AI Notice', htmlText: '<p>AI notice text</p>', markdownText: null, textHash: 'b'.repeat(64), effectiveAt: new Date('2026-01-01') },
    { id: 3, waiverType: 'activity_addendum', activityType: 'HOME_GYM_PT', title: 'Home Gym PT Addendum', htmlText: '<p>Home Gym text</p>', markdownText: null, textHash: 'c'.repeat(64), effectiveAt: new Date('2026-01-01') },
  ];
  return overrides.length > 0 ? overrides : defaults;
}

function setupModels(versionRows = makeVersionRows()) {
  const models = {};

  mockGetModel.mockImplementation((name) => {
    if (name === 'WaiverVersion') {
      return {
        findAll: mockFindAll.mockResolvedValue(versionRows),
      };
    }
    if (name === 'WaiverRecord') {
      return {
        findOne: mockFindOne,
        create: mockCreate.mockResolvedValue({ id: 42 }),
      };
    }
    if (name === 'WaiverRecordVersion') {
      return { bulkCreate: mockBulkCreate.mockResolvedValue([]) };
    }
    if (name === 'WaiverConsentFlags') {
      return { create: mockCreate };
    }
    if (name === 'User') {
      return { findAll: vi.fn().mockResolvedValue([]) };
    }
    if (name === 'PendingWaiverMatch') {
      return { bulkCreate: vi.fn().mockResolvedValue([]) };
    }
    return {};
  });

  return models;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════
// Section A: getCurrentWaiverVersions (4 tests)
// ═══════════════════════════════════════════════════════════════

describe('getCurrentWaiverVersions', () => {

  it('A.1 — returns active versions with displayText', async () => {
    const versions = makeVersionRows();
    mockGetModel.mockImplementation(() => ({
      findAll: vi.fn().mockResolvedValue(versions),
    }));

    const req = makeReq();
    const res = makeRes();
    await getCurrentWaiverVersions(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.versions).toHaveLength(3);
    expect(res.body.versions[0].displayText).toBe('<p>Core waiver text</p>');
    // Should not expose raw htmlText/markdownText
    expect(res.body.versions[0].htmlText).toBeUndefined();
    expect(res.body.versions[0].markdownText).toBeUndefined();
  });

  it('A.2 — returns empty array when no active versions exist', async () => {
    mockGetModel.mockImplementation(() => ({
      findAll: vi.fn().mockResolvedValue([]),
    }));

    const req = makeReq();
    const res = makeRes();
    await getCurrentWaiverVersions(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.versions).toEqual([]);
  });

  it('A.3 — dedupes to one version per (waiverType, activityType)', async () => {
    const duplicateVersions = [
      { id: 10, waiverType: 'core', activityType: null, title: 'Core v2', htmlText: '<p>v2</p>', markdownText: null, textHash: 'x'.repeat(64), effectiveAt: new Date('2026-02-01') },
      { id: 5, waiverType: 'core', activityType: null, title: 'Core v1', htmlText: '<p>v1</p>', markdownText: null, textHash: 'y'.repeat(64), effectiveAt: new Date('2026-01-01') },
    ];
    mockGetModel.mockImplementation(() => ({
      findAll: vi.fn().mockResolvedValue(duplicateVersions),
    }));

    const req = makeReq();
    const res = makeRes();
    await getCurrentWaiverVersions(req, res);

    expect(res.body.versions).toHaveLength(1);
    expect(res.body.versions[0].id).toBe(10); // latest wins
  });

  it('A.4 — displayText falls back to markdownText when htmlText is null', async () => {
    const markdownOnly = [
      { id: 1, waiverType: 'core', activityType: null, title: 'Core', htmlText: null, markdownText: '# Core Waiver', textHash: 'z'.repeat(64), effectiveAt: new Date('2026-01-01') },
    ];
    mockGetModel.mockImplementation(() => ({
      findAll: vi.fn().mockResolvedValue(markdownOnly),
    }));

    const req = makeReq();
    const res = makeRes();
    await getCurrentWaiverVersions(req, res);

    expect(res.body.versions[0].displayText).toBe('# Core Waiver');
  });
});

// ═══════════════════════════════════════════════════════════════
// Section B: submitPublicWaiver (18 tests)
// ═══════════════════════════════════════════════════════════════

describe('submitPublicWaiver', () => {

  it('B.1 — rejects missing signature', async () => {
    const req = makeReq({ ...VALID_BODY, signatureData: '' });
    const res = makeRes();
    await submitPublicWaiver(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('WAIVER_SIGNATURE_REQUIRED');
  });

  it('B.2 — rejects missing both email and phone', async () => {
    const req = makeReq({ ...VALID_BODY, email: '', phone: '' });
    const res = makeRes();
    await submitPublicWaiver(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('WAIVER_CONTACT_REQUIRED');
  });

  it('B.3 — rejects invalid activity type', async () => {
    const req = makeReq({ ...VALID_BODY, activityTypes: ['SKYDIVING'] });
    const res = makeRes();
    await submitPublicWaiver(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('WAIVER_VALIDATION_FAILED');
  });

  it('B.4 — rejects empty activityTypes array', async () => {
    const req = makeReq({ ...VALID_BODY, activityTypes: [] });
    const res = makeRes();
    await submitPublicWaiver(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('WAIVER_VALIDATION_FAILED');
  });

  it('B.4b — rejects rollover calendar date like 2026-02-31', async () => {
    const req = makeReq({ ...VALID_BODY, dateOfBirth: '2026-02-31' });
    const res = makeRes();
    await submitPublicWaiver(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('WAIVER_VALIDATION_FAILED');
  });

  it('B.5 — rejects when required waiver version missing from DB', async () => {
    // Only core version exists — ai_notice missing
    const incompleteVersions = [
      { id: 1, waiverType: 'core', activityType: null, title: 'Core', htmlText: '<p>Core</p>', markdownText: null, textHash: 'a'.repeat(64), effectiveAt: new Date('2026-01-01') },
    ];
    mockGetModel.mockImplementation((name) => {
      if (name === 'WaiverVersion') {
        return { findAll: vi.fn().mockResolvedValue(incompleteVersions) };
      }
      return {};
    });

    const req = makeReq({ ...VALID_BODY });
    const res = makeRes();
    await submitPublicWaiver(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('WAIVER_VERSION_UNAVAILABLE');
  });

  it('B.6 — rejects source: admin_tablet on public route', async () => {
    const req = makeReq({ ...VALID_BODY, source: 'admin_tablet' });
    const res = makeRes();
    await submitPublicWaiver(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('WAIVER_VALIDATION_FAILED');
  });

  it('B.7 — rejects non-boolean aiConsentAccepted', async () => {
    const req = makeReq({ ...VALID_BODY, aiConsentAccepted: 'yes' });
    const res = makeRes();
    await submitPublicWaiver(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('WAIVER_VALIDATION_FAILED');
  });

  it('B.8 — valid submission creates WaiverRecord + WaiverRecordVersion + WaiverConsentFlags', async () => {
    const versions = makeVersionRows();
    const createCalls = [];
    const bulkCreateCalls = [];

    mockGetModel.mockImplementation((name) => {
      if (name === 'WaiverVersion') {
        return { findAll: vi.fn().mockResolvedValue(versions) };
      }
      if (name === 'WaiverRecord') {
        return {
          create: vi.fn().mockImplementation((data) => {
            createCalls.push({ model: 'WaiverRecord', data });
            return { id: 42 };
          }),
        };
      }
      if (name === 'WaiverRecordVersion') {
        return {
          bulkCreate: vi.fn().mockImplementation((data) => {
            bulkCreateCalls.push({ model: 'WaiverRecordVersion', data });
            return [];
          }),
        };
      }
      if (name === 'WaiverConsentFlags') {
        return {
          create: vi.fn().mockImplementation((data) => {
            createCalls.push({ model: 'WaiverConsentFlags', data });
            return {};
          }),
        };
      }
      if (name === 'User') {
        return { findAll: vi.fn().mockResolvedValue([]) };
      }
      if (name === 'PendingWaiverMatch') {
        return { bulkCreate: vi.fn().mockResolvedValue([]) };
      }
      return {};
    });

    const req = makeReq({ ...VALID_BODY });
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.waiverRecordId).toBe(42);

    // Verify all 3 models were called
    const recordCreate = createCalls.find(c => c.model === 'WaiverRecord');
    expect(recordCreate).toBeDefined();

    const consentCreate = createCalls.find(c => c.model === 'WaiverConsentFlags');
    expect(consentCreate).toBeDefined();

    expect(bulkCreateCalls.find(c => c.model === 'WaiverRecordVersion')).toBeDefined();
  });

  it('B.9 — unauthenticated → status: pending_match, userId: null', async () => {
    const versions = makeVersionRows();
    let recordArgs;

    mockGetModel.mockImplementation((name) => {
      if (name === 'WaiverVersion') return { findAll: vi.fn().mockResolvedValue(versions) };
      if (name === 'WaiverRecord') {
        return { create: vi.fn().mockImplementation((data) => { recordArgs = data; return { id: 42 }; }) };
      }
      if (name === 'WaiverRecordVersion') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      if (name === 'WaiverConsentFlags') return { create: vi.fn().mockResolvedValue({}) };
      if (name === 'User') return { findAll: vi.fn().mockResolvedValue([]) };
      if (name === 'PendingWaiverMatch') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      return {};
    });

    const req = makeReq({ ...VALID_BODY }, null); // no user
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('pending_match');
    expect(recordArgs.userId).toBeNull();
    expect(recordArgs.status).toBe('pending_match');
  });

  it('B.10 — authenticated (req.user.id=\'42\') → status: linked, userId: 42 (number)', async () => {
    const versions = makeVersionRows();
    let recordArgs;

    mockGetModel.mockImplementation((name) => {
      if (name === 'WaiverVersion') return { findAll: vi.fn().mockResolvedValue(versions) };
      if (name === 'WaiverRecord') {
        return { create: vi.fn().mockImplementation((data) => { recordArgs = data; return { id: 42 }; }) };
      }
      if (name === 'WaiverRecordVersion') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      if (name === 'WaiverConsentFlags') return { create: vi.fn().mockResolvedValue({}) };
      if (name === 'User') return { findAll: vi.fn().mockResolvedValue([]) };
      if (name === 'PendingWaiverMatch') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      return {};
    });

    const req = makeReq({ ...VALID_BODY }, { id: '42', role: 'client' });
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('linked');
    expect(recordArgs.userId).toBe(42);
    expect(typeof recordArgs.userId).toBe('number');
  });

  it('B.11 — matching uses compound email + dateOfBirth + role:client', async () => {
    const versions = makeVersionRows();
    let userFindAllArgs;

    mockGetModel.mockImplementation((name) => {
      if (name === 'WaiverVersion') return { findAll: vi.fn().mockResolvedValue(versions) };
      if (name === 'WaiverRecord') {
        return { create: vi.fn().mockResolvedValue({ id: 42 }) };
      }
      if (name === 'WaiverRecordVersion') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      if (name === 'WaiverConsentFlags') return { create: vi.fn().mockResolvedValue({}) };
      if (name === 'User') {
        return {
          findAll: vi.fn().mockImplementation((args) => {
            userFindAllArgs = args;
            return [];
          }),
        };
      }
      if (name === 'PendingWaiverMatch') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      return {};
    });

    const req = makeReq({ ...VALID_BODY }, null); // unauthenticated
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(userFindAllArgs).toBeDefined();
    expect(userFindAllArgs.where).toHaveProperty('dateOfBirth');
    expect(userFindAllArgs.where).toHaveProperty('role', 'client');
  });

  it('B.12 — matching skips admin/trainer accounts (role:client filter)', async () => {
    const versions = makeVersionRows();
    let matchBulkCreateArgs;

    mockGetModel.mockImplementation((name) => {
      if (name === 'WaiverVersion') return { findAll: vi.fn().mockResolvedValue(versions) };
      if (name === 'WaiverRecord') {
        return { create: vi.fn().mockResolvedValue({ id: 42 }) };
      }
      if (name === 'WaiverRecordVersion') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      if (name === 'WaiverConsentFlags') return { create: vi.fn().mockResolvedValue({}) };
      if (name === 'User') {
        // Simulate no client users match (admin with same email won't appear due to role:client filter)
        return { findAll: vi.fn().mockResolvedValue([]) };
      }
      if (name === 'PendingWaiverMatch') {
        return {
          bulkCreate: vi.fn().mockImplementation((data) => {
            matchBulkCreateArgs = data;
            return [];
          }),
        };
      }
      return {};
    });

    const req = makeReq({ ...VALID_BODY }, null);
    const res = makeRes();
    await submitPublicWaiver(req, res);

    // No matches should be created since no client users found
    expect(matchBulkCreateArgs).toBeUndefined();
  });

  it('B.13 — rejects liabilityAccepted: false', async () => {
    const req = makeReq({ ...VALID_BODY, liabilityAccepted: false });
    const res = makeRes();
    await submitPublicWaiver(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('WAIVER_VALIDATION_FAILED');
  });

  it('B.14 — guardian fields required when submittedByGuardian: true', async () => {
    const req = makeReq({ ...VALID_BODY, submittedByGuardian: true });
    const res = makeRes();
    await submitPublicWaiver(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('WAIVER_VALIDATION_FAILED');
  });

  it('B.15 — evidence metadata includes versionTextSnapshots with displayText', async () => {
    const versions = makeVersionRows();
    let recordArgs;

    mockGetModel.mockImplementation((name) => {
      if (name === 'WaiverVersion') return { findAll: vi.fn().mockResolvedValue(versions) };
      if (name === 'WaiverRecord') {
        return { create: vi.fn().mockImplementation((data) => { recordArgs = data; return { id: 42 }; }) };
      }
      if (name === 'WaiverRecordVersion') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      if (name === 'WaiverConsentFlags') return { create: vi.fn().mockResolvedValue({}) };
      if (name === 'User') return { findAll: vi.fn().mockResolvedValue([]) };
      if (name === 'PendingWaiverMatch') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      return {};
    });

    const req = makeReq({ ...VALID_BODY }, null);
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(recordArgs.metadata).toBeDefined();
    expect(recordArgs.metadata.versionTextSnapshots).toBeDefined();
    expect(recordArgs.metadata.versionTextSnapshots.length).toBeGreaterThan(0);
    expect(recordArgs.metadata.versionTextSnapshots[0]).toHaveProperty('displayText');
    expect(recordArgs.metadata.versionTextSnapshots[0]).toHaveProperty('textHash');
  });

  it('B.16 — POST version query attributes include markdownText', async () => {
    let findAllCallArgs;

    mockGetModel.mockImplementation((name) => {
      if (name === 'WaiverVersion') {
        return {
          findAll: vi.fn().mockImplementation((args) => {
            findAllCallArgs = args;
            return makeVersionRows();
          }),
        };
      }
      if (name === 'WaiverRecord') return { create: vi.fn().mockResolvedValue({ id: 42 }) };
      if (name === 'WaiverRecordVersion') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      if (name === 'WaiverConsentFlags') return { create: vi.fn().mockResolvedValue({}) };
      if (name === 'User') return { findAll: vi.fn().mockResolvedValue([]) };
      if (name === 'PendingWaiverMatch') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      return {};
    });

    const req = makeReq({ ...VALID_BODY }, null);
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(findAllCallArgs.attributes).toContain('markdownText');
  });

  it('B.17 — rejects when resolved version has null htmlText AND null markdownText (WAIVER_TEXT_UNAVAILABLE)', async () => {
    const noTextVersions = [
      { id: 1, waiverType: 'core', activityType: null, title: 'Core', htmlText: null, markdownText: null, textHash: 'a'.repeat(64), effectiveAt: new Date('2026-01-01') },
      { id: 2, waiverType: 'ai_notice', activityType: null, title: 'AI', htmlText: '<p>ok</p>', markdownText: null, textHash: 'b'.repeat(64), effectiveAt: new Date('2026-01-01') },
      { id: 3, waiverType: 'activity_addendum', activityType: 'HOME_GYM_PT', title: 'Addendum', htmlText: '<p>ok</p>', markdownText: null, textHash: 'c'.repeat(64), effectiveAt: new Date('2026-01-01') },
    ];

    mockGetModel.mockImplementation((name) => {
      if (name === 'WaiverVersion') return { findAll: vi.fn().mockResolvedValue(noTextVersions) };
      return {};
    });

    const req = makeReq({ ...VALID_BODY });
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('WAIVER_TEXT_UNAVAILABLE');
    expect(res.body.missingTextVersionIds).toEqual([1]);
  });

  it('B.18 — authenticated with malformed id (NaN) treated as unauthenticated', async () => {
    const versions = makeVersionRows();
    let recordArgs;

    mockGetModel.mockImplementation((name) => {
      if (name === 'WaiverVersion') return { findAll: vi.fn().mockResolvedValue(versions) };
      if (name === 'WaiverRecord') {
        return { create: vi.fn().mockImplementation((data) => { recordArgs = data; return { id: 42 }; }) };
      }
      if (name === 'WaiverRecordVersion') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      if (name === 'WaiverConsentFlags') return { create: vi.fn().mockResolvedValue({}) };
      if (name === 'User') return { findAll: vi.fn().mockResolvedValue([]) };
      if (name === 'PendingWaiverMatch') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      return {};
    });

    const req = makeReq({ ...VALID_BODY }, { id: 'not-a-number', role: 'client' });
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(201);
    expect(recordArgs.userId).toBeNull();
    expect(recordArgs.status).toBe('pending_match');
  });
});
