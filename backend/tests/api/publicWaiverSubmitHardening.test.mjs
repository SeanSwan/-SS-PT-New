/**
 * Public Waiver Submit — SWA-140 hardening contract
 * ==================================================
 * Proves the behaviours added by the waiver overhaul:
 *   §1 minor policy is server-enforced (DOB is evaluated, not just collected)
 *   §2 bundle staleness rejects a signature against text the signer never saw
 *   §3 idempotency replays instead of minting a second legal record
 *   §4 optional documents record shown-and-declined, not blanket acceptance
 *   §5 a durable signed artifact is produced and hashed
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockLogger, mockGetModel, mockTransaction, mockCommit, mockRollback } = vi.hoisted(() => {
  const mockCommit = vi.fn();
  const mockRollback = vi.fn();
  return {
    mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    mockGetModel: vi.fn(),
    mockTransaction: { commit: mockCommit, rollback: mockRollback },
    mockCommit,
    mockRollback,
  };
});

vi.mock('../../utils/logger.mjs', () => ({ default: mockLogger }));
vi.mock('../../models/index.mjs', () => ({
  getModel: mockGetModel,
  Op: { in: Symbol('in'), lte: Symbol('lte'), or: Symbol('or') },
}));
vi.mock('../../database.mjs', () => ({
  default: { transaction: vi.fn(async () => mockTransaction) },
}));

import {
  submitPublicWaiver,
  computeBundleHash,
  __clearVersionsCache,
} from '../../controllers/publicWaiverController.mjs';

// ── Fixtures ───────────────────────────────────────────────────
const VERSIONS = [
  { id: 1, waiverType: 'core', activityType: null, version: '2.0', title: 'Core', htmlText: '<p>core</p>', markdownText: null, textHash: 'a'.repeat(64), effectiveAt: new Date('2026-08-01') },
  { id: 2, waiverType: 'ai_notice', activityType: null, version: '2.0', title: 'Swan Coach', htmlText: '<p>coach</p>', markdownText: null, textHash: 'b'.repeat(64), effectiveAt: new Date('2026-08-01') },
  { id: 4, waiverType: 'media_release', activityType: null, version: '1.0', title: 'Media', htmlText: '<p>media</p>', markdownText: null, textHash: 'd'.repeat(64), effectiveAt: new Date('2026-08-01') },
  { id: 3, waiverType: 'activity_addendum', activityType: 'HOME_GYM_PT', version: '2.0', title: 'Home Gym', htmlText: '<p>home</p>', markdownText: null, textHash: 'c'.repeat(64), effectiveAt: new Date('2026-08-01') },
];

const ADULT_BODY = {
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

/** DOB for someone who is exactly `age` years old today. */
function dobForAge(age) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setDate(d.getDate() - 1); // safely past the birthday
  return d.toISOString().slice(0, 10);
}

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
  return { body, user, ip: '203.0.113.9', headers: { 'user-agent': 'vitest-agent' } };
}

/** Wires model mocks; returns captured writes. */
function setup({ existingByKey = null } = {}) {
  const captured = { record: null, links: null, flags: null, updates: [] };

  mockGetModel.mockImplementation((name) => {
    if (name === 'WaiverVersion') {
      return { findAll: vi.fn().mockResolvedValue(VERSIONS) };
    }
    if (name === 'WaiverRecord') {
      return {
        findOne: vi.fn().mockResolvedValue(existingByKey),
        create: vi.fn().mockImplementation((data) => {
          captured.record = data;
          return {
            id: 77,
            metadata: data.metadata,
            update: vi.fn().mockImplementation((patch) => { captured.updates.push(patch); }),
          };
        }),
      };
    }
    if (name === 'WaiverRecordVersion') {
      return { bulkCreate: vi.fn().mockImplementation((rows) => { captured.links = rows; return []; }) };
    }
    if (name === 'WaiverConsentFlags') {
      return { create: vi.fn().mockImplementation((data) => { captured.flags = data; return {}; }) };
    }
    if (name === 'User') return { findAll: vi.fn().mockResolvedValue([]) };
    if (name === 'PendingWaiverMatch') return { bulkCreate: vi.fn().mockResolvedValue([]) };
    return {};
  });

  return captured;
}

beforeEach(() => {
  vi.clearAllMocks();
  __clearVersionsCache();
});

// ═══════════════════════════════════════════════════════════════
describe('§1 minor policy is server-enforced', () => {
  it('1.1 — a 14-year-old signing alone is refused', async () => {
    setup();
    const req = makeReq({ ...ADULT_BODY, dateOfBirth: dobForAge(14) });
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('WAIVER_GUARDIAN_REQUIRED');
    expect(res.body.ageBand).toBe('13_17');
  });

  it('1.2 — an 11-year-old is refused and banded under_13', async () => {
    setup();
    const req = makeReq({ ...ADULT_BODY, dateOfBirth: dobForAge(11) });
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.ageBand).toBe('under_13');
  });

  it('1.3 — a minor with a guardian but no emergency contact is refused', async () => {
    setup();
    const req = makeReq({
      ...ADULT_BODY,
      dateOfBirth: dobForAge(15),
      submittedByGuardian: true,
      guardianName: 'Pat Doe',
      guardianTypedSignature: 'Pat Doe',
    });
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('WAIVER_VALIDATION_FAILED');
  });

  it('1.4 — a minor with guardian + emergency contact is accepted, minor recorded as participant', async () => {
    const captured = setup();
    const req = makeReq({
      ...ADULT_BODY,
      dateOfBirth: dobForAge(15),
      submittedByGuardian: true,
      guardianName: 'Pat Doe',
      guardianTypedSignature: 'Pat Doe',
      emergencyContactName: 'Alex Doe',
      emergencyContactPhone: '+15550100',
      minorAssentName: 'Jane Doe',
    });
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(201);
    expect(captured.record.participantName).toBe('Jane Doe');
    expect(captured.record.guardianName).toBe('Pat Doe');
    expect(captured.record.emergencyContactName).toBe('Alex Doe');
    expect(captured.record.metadata.signerAgeBand).toBe('13_17');
    expect(captured.record.metadata.minorAssentName).toBe('Jane Doe');
  });

  it('1.5 — an adult is unaffected and banded 18_plus', async () => {
    const captured = setup();
    const res = makeRes();
    await submitPublicWaiver(makeReq({ ...ADULT_BODY }), res);

    expect(res.statusCode).toBe(201);
    expect(captured.record.metadata.signerAgeBand).toBe('18_plus');
    expect(captured.record.participantName).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
describe('§2 bundle staleness', () => {
  it('2.1 — a stale bundle hash is refused with 409', async () => {
    setup();
    const req = makeReq({ ...ADULT_BODY, bundleHash: 'f'.repeat(64) });
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('WAIVER_BUNDLE_STALE');
  });

  it('2.2 — the current bundle hash is accepted and recorded as verified', async () => {
    const captured = setup();
    const req = makeReq({ ...ADULT_BODY, bundleHash: computeBundleHash(VERSIONS) });
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(201);
    expect(captured.record.metadata.bundleHashVerified).toBe(true);
  });

  it('2.3 — an older client with no bundle hash still submits, flagged unverified', async () => {
    const captured = setup();
    const res = makeRes();
    await submitPublicWaiver(makeReq({ ...ADULT_BODY }), res);

    expect(res.statusCode).toBe(201);
    expect(captured.record.metadata.bundleHashVerified).toBe(false);
  });

  it('2.4 — bundle hash is order-independent', () => {
    expect(computeBundleHash(VERSIONS)).toBe(computeBundleHash([...VERSIONS].reverse()));
  });
});

// ═══════════════════════════════════════════════════════════════
describe('§3 idempotency', () => {
  it('3.1 — a repeat submit with the same key replays the original record', async () => {
    const captured = setup({ existingByKey: { id: 55, status: 'pending_match' } });
    const req = makeReq({ ...ADULT_BODY, idempotencyKey: 'abcd1234efgh5678' });
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.waiverRecordId).toBe(55);
    expect(res.body.replayed).toBe(true);
    expect(captured.record).toBeNull(); // nothing new was written
  });

  it('3.2 — a first submit with a key stores it', async () => {
    const captured = setup();
    const req = makeReq({ ...ADULT_BODY, idempotencyKey: 'abcd1234efgh5678' });
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(201);
    expect(captured.record.idempotencyKey).toBe('abcd1234efgh5678');
  });

  it('3.3 — a malformed key is ignored rather than stored', async () => {
    const captured = setup();
    const req = makeReq({ ...ADULT_BODY, idempotencyKey: 'short' });
    const res = makeRes();
    await submitPublicWaiver(req, res);

    expect(res.statusCode).toBe(201);
    expect(captured.record.idempotencyKey).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
describe('§4 optional documents record the real answer', () => {
  it('4.1 — a declined media release is linked as shown-and-declined', async () => {
    const captured = setup();
    const res = makeRes();
    await submitPublicWaiver(makeReq({ ...ADULT_BODY, mediaConsentAccepted: false }), res);

    const media = captured.links.find((l) => l.waiverVersionId === 4);
    expect(media).toBeDefined();
    expect(media.accepted).toBe(false);
  });

  it('4.2 — an accepted media release is linked as accepted', async () => {
    const captured = setup();
    const res = makeRes();
    await submitPublicWaiver(makeReq({ ...ADULT_BODY, mediaConsentAccepted: true }), res);

    expect(captured.links.find((l) => l.waiverVersionId === 4).accepted).toBe(true);
  });

  it('4.3 — a declined Swan Coach notice is linked as declined; core stays accepted', async () => {
    const captured = setup();
    const res = makeRes();
    await submitPublicWaiver(makeReq({ ...ADULT_BODY, aiConsentAccepted: false }), res);

    expect(captured.links.find((l) => l.waiverVersionId === 2).accepted).toBe(false);
    expect(captured.links.find((l) => l.waiverVersionId === 1).accepted).toBe(true);
    expect(captured.links.find((l) => l.waiverVersionId === 3).accepted).toBe(true);
  });

  it('4.4 — a missing media_release document never blocks submission', async () => {
    const captured = { record: null };
    mockGetModel.mockImplementation((name) => {
      if (name === 'WaiverVersion') {
        return { findAll: vi.fn().mockResolvedValue(VERSIONS.filter((v) => v.waiverType !== 'media_release')) };
      }
      if (name === 'WaiverRecord') {
        return {
          findOne: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation((data) => {
            captured.record = data;
            return { id: 78, metadata: data.metadata, update: vi.fn() };
          }),
        };
      }
      if (name === 'WaiverRecordVersion') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      if (name === 'WaiverConsentFlags') return { create: vi.fn().mockResolvedValue({}) };
      if (name === 'User') return { findAll: vi.fn().mockResolvedValue([]) };
      if (name === 'PendingWaiverMatch') return { bulkCreate: vi.fn().mockResolvedValue([]) };
      return {};
    });

    const res = makeRes();
    await submitPublicWaiver(makeReq({ ...ADULT_BODY }), res);
    expect(res.statusCode).toBe(201);
  });
});

// ═══════════════════════════════════════════════════════════════
describe('§5 durable signed artifact', () => {
  it('5.1 — an artifact is produced, hashed, stored, and returned', async () => {
    const captured = setup();
    const res = makeRes();
    await submitPublicWaiver(makeReq({ ...ADULT_BODY }), res);

    expect(res.statusCode).toBe(201);
    expect(res.body.artifactSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.artifactHtml).toContain('Signed Waiver &amp; Consent Record');

    const stored = captured.updates.find((u) => u.metadata?.artifactSha256);
    expect(stored).toBeDefined();
    expect(stored.metadata.artifactSha256).toBe(res.body.artifactSha256);
    expect(stored.metadata.artifactHtml).toContain('<!DOCTYPE html>');
  });

  it('5.2 — the artifact carries the full signed text and the consent grid', async () => {
    setup();
    const res = makeRes();
    await submitPublicWaiver(makeReq({ ...ADULT_BODY, mediaConsentAccepted: false }), res);

    const html = res.body.artifactHtml;
    expect(html).toContain('<p>core</p>');
    expect(html).toContain('<p>home</p>');
    expect(html).toContain('Liability waiver');
    expect(html).toContain('Photo &amp; media release (optional)');
  });

  it('5.3 — the response names exactly what was signed', async () => {
    setup();
    const res = makeRes();
    await submitPublicWaiver(makeReq({ ...ADULT_BODY }), res);

    const titles = res.body.signedSummary.map((s) => s.title);
    expect(titles).toContain('Core');
    expect(titles).toContain('Home Gym');
    expect(res.body.signedSummary.every((s) => s.version)).toBe(true);
    expect(res.body.signedAt).toBeTruthy();
  });
});
