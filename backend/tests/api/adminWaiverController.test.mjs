/**
 * Admin Waiver Controller Tests — Phase 5W-D
 * ============================================
 * Tests all 6 controller endpoints + computeBadges helper.
 * Uses direct function invocation with mocked models/DB.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Hoisted mock primitives ──────────────────────────────────
const {
  mockLogger,
  mockFindAndCountAll,
  mockFindByPk,
  mockModelUpdate,
  mockCreate,
  mockInstanceUpdate,
  mockTransaction,
  mockCommit,
  mockRollback,
} = vi.hoisted(() => {
  const mockCommit = vi.fn();
  const mockRollback = vi.fn();
  return {
    mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    mockFindAndCountAll: vi.fn(),
    mockFindByPk: vi.fn(),
    mockModelUpdate: vi.fn(),
    mockCreate: vi.fn(),
    mockInstanceUpdate: vi.fn(),
    mockTransaction: { commit: mockCommit, rollback: mockRollback },
    mockCommit,
    mockRollback,
  };
});

vi.mock('../../utils/logger.mjs', () => ({ default: mockLogger }));

vi.mock('../../models/index.mjs', () => ({
  getModel: vi.fn((name) => {
    const base = {
      findAndCountAll: mockFindAndCountAll,
      findByPk: mockFindByPk,
      update: mockModelUpdate,
      create: mockCreate,
    };
    return base;
  }),
  Op: {
    ne: Symbol('ne'),
    or: Symbol('or'),
    iLike: Symbol('iLike'),
  },
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: vi.fn(async () => mockTransaction) },
}));

// ── Import controller after mocks ────────────────────────────
const {
  listWaiverRecords,
  getWaiverRecordDetail,
  approveMatch,
  rejectMatch,
  attachUser,
  revokeWaiver,
  computeBadges,
} = await import('../../controllers/adminWaiverController.mjs');

// ── Test Helpers ─────────────────────────────────────────────
function makeReq(overrides = {}) {
  return {
    query: {},
    params: {},
    body: {},
    user: { id: 1 },
    ...overrides,
  };
}

function makeRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function makeRecord(overrides = {}) {
  return {
    id: 10,
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-0001',
    status: 'pending_match',
    source: 'qr',
    signatureData: 'data:image/png;base64,abc',
    signedAt: '2026-02-27T00:00:00Z',
    submittedByGuardian: false,
    userId: null,
    consentFlags: { aiConsentAccepted: false, liabilityAccepted: true, mediaConsentAccepted: false, guardianAcknowledged: false },
    versionLinks: [{ accepted: true, waiverVersion: { retiredAt: null } }],
    pendingMatches: [],
    update: mockInstanceUpdate,
    ...overrides,
  };
}

function makeMatch(overrides = {}) {
  return {
    id: 5,
    waiverRecordId: 10,
    candidateUserId: 42,
    status: 'pending_review',
    waiverRecord: { id: 10, status: 'pending_match' },
    update: mockInstanceUpdate,
    ...overrides,
  };
}

// ── Reset between tests ──────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockInstanceUpdate.mockResolvedValue(undefined);
  mockModelUpdate.mockResolvedValue([1]);
  mockCreate.mockResolvedValue({ id: 99 });
  mockCommit.mockResolvedValue(undefined);
  mockRollback.mockResolvedValue(undefined);
});

// ═════════════════════════════════════════════════════════════
// Section A: computeBadges
// ═════════════════════════════════════════════════════════════
describe('computeBadges', () => {
  it('A1 — returns Waiver Signed when signature + accepted version exist', () => {
    const record = makeRecord();
    const badges = computeBadges(record);
    expect(badges).toContain('Waiver Signed');
  });

  it('A2 — returns Consent Missing when liability not accepted', () => {
    const record = makeRecord({ consentFlags: { liabilityAccepted: false, aiConsentAccepted: false, mediaConsentAccepted: false, guardianAcknowledged: false } });
    const badges = computeBadges(record);
    expect(badges).toContain('Consent Missing');
  });

  it('A3 — returns AI Consent Signed when aiConsentAccepted', () => {
    const record = makeRecord({ consentFlags: { aiConsentAccepted: true, liabilityAccepted: true, mediaConsentAccepted: false, guardianAcknowledged: false } });
    const badges = computeBadges(record);
    expect(badges).toContain('AI Consent Signed');
    expect(badges).not.toContain('Consent Missing');
  });

  it('A4 — returns Guardian Required when guardian submitted but not acknowledged', () => {
    const record = makeRecord({ submittedByGuardian: true, consentFlags: { liabilityAccepted: true, guardianAcknowledged: false, aiConsentAccepted: false, mediaConsentAccepted: false } });
    const badges = computeBadges(record);
    expect(badges).toContain('Guardian Required');
  });

  it('A5 — returns Version Outdated when any accepted version is retired', () => {
    const record = makeRecord({ versionLinks: [{ accepted: true, waiverVersion: { retiredAt: '2026-01-01' } }] });
    const badges = computeBadges(record);
    expect(badges).toContain('Version Outdated');
  });

  it('A6 — returns Pending Match for pending_match status', () => {
    const record = makeRecord({ status: 'pending_match' });
    const badges = computeBadges(record);
    expect(badges).toContain('Pending Match');
  });

  it('A7 — does not return Pending Match for linked status', () => {
    const record = makeRecord({ status: 'linked' });
    const badges = computeBadges(record);
    expect(badges).not.toContain('Pending Match');
  });
});

// ═════════════════════════════════════════════════════════════
// Section B: listWaiverRecords
// ═════════════════════════════════════════════════════════════
describe('listWaiverRecords', () => {
  it('B1 — returns paginated results with default params', async () => {
    const records = [makeRecord()];
    mockFindAndCountAll.mockResolvedValue({ rows: records, count: 1 });

    const req = makeReq();
    const res = makeRes();
    await listWaiverRecords(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          records,
          pagination: { page: 1, limit: 25, total: 1, pages: 1 },
        }),
      }),
    );
    // Verify distinct: true was passed
    expect(mockFindAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ distinct: true }),
    );
  });

  it('B2 — applies status filter when provided', async () => {
    mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const req = makeReq({ query: { status: 'linked' } });
    const res = makeRes();
    await listWaiverRecords(req, res);

    const callArgs = mockFindAndCountAll.mock.calls[0][0];
    expect(callArgs.where.status).toBe('linked');
  });

  it('B3 — applies source filter when provided', async () => {
    mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const req = makeReq({ query: { source: 'qr' } });
    const res = makeRes();
    await listWaiverRecords(req, res);

    const callArgs = mockFindAndCountAll.mock.calls[0][0];
    expect(callArgs.where.source).toBe('qr');
  });

  it('B4 — applies search term with Op.iLike', async () => {
    mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const { Op } = await import('../../models/index.mjs');
    const req = makeReq({ query: { search: 'jane' } });
    const res = makeRes();
    await listWaiverRecords(req, res);

    const callArgs = mockFindAndCountAll.mock.calls[0][0];
    expect(callArgs.where[Op.or]).toBeDefined();
  });

  it('B5 — returns 500 on database error', async () => {
    mockFindAndCountAll.mockRejectedValue(new Error('DB down'));
    const req = makeReq();
    const res = makeRes();
    await listWaiverRecords(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═════════════════════════════════════════════════════════════
// Section C: getWaiverRecordDetail
// ═════════════════════════════════════════════════════════════
describe('getWaiverRecordDetail', () => {
  it('C1 — returns record with badges', async () => {
    const record = makeRecord();
    mockFindByPk.mockResolvedValue(record);

    const req = makeReq({ params: { id: '10' } });
    const res = makeRes();
    await getWaiverRecordDetail(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          record,
          badges: expect.any(Array),
        }),
      }),
    );
  });

  it('C2 — returns 404 when record not found', async () => {
    mockFindByPk.mockResolvedValue(null);
    const req = makeReq({ params: { id: '999' } });
    const res = makeRes();
    await getWaiverRecordDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('C3 — returns 500 on database error', async () => {
    mockFindByPk.mockRejectedValue(new Error('DB error'));
    const req = makeReq({ params: { id: '10' } });
    const res = makeRes();
    await getWaiverRecordDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═════════════════════════════════════════════════════════════
// Section D: approveMatch
// ═════════════════════════════════════════════════════════════
describe('approveMatch', () => {
  it('D1 — approves match, links waiver, rejects others', async () => {
    const match = makeMatch();
    mockFindByPk.mockResolvedValue(match);

    const req = makeReq({ params: { matchId: '5' } });
    const res = makeRes();
    await approveMatch(req, res);

    expect(mockInstanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', reviewedByUserId: 1 }),
      expect.any(Object),
    );
    // WaiverRecord.update (static)
    expect(mockModelUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, status: 'linked' }),
      expect.any(Object),
    );
    expect(mockCommit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('D2 — returns 404 if match not found', async () => {
    mockFindByPk.mockResolvedValue(null);
    const req = makeReq({ params: { matchId: '999' } });
    const res = makeRes();
    await approveMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockRollback).toHaveBeenCalled();
  });

  it('D3 — returns 409 if match already resolved', async () => {
    mockFindByPk.mockResolvedValue(makeMatch({ status: 'approved' }));
    const req = makeReq({ params: { matchId: '5' } });
    const res = makeRes();
    await approveMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockRollback).toHaveBeenCalled();
  });

  it('D4 — returns 409 if candidateUserId is null', async () => {
    mockFindByPk.mockResolvedValue(makeMatch({ candidateUserId: null }));
    const req = makeReq({ params: { matchId: '5' } });
    const res = makeRes();
    await approveMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('no candidate user') }),
    );
  });

  it('D5 — returns 409 if parent waiver is revoked', async () => {
    mockFindByPk.mockResolvedValue(makeMatch({ waiverRecord: { id: 10, status: 'revoked' } }));
    const req = makeReq({ params: { matchId: '5' } });
    const res = makeRes();
    await approveMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('revoked') }),
    );
  });

  it('D6 — returns 409 if parent waiver is superseded', async () => {
    mockFindByPk.mockResolvedValue(makeMatch({ waiverRecord: { id: 10, status: 'superseded' } }));
    const req = makeReq({ params: { matchId: '5' } });
    const res = makeRes();
    await approveMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('D7 — rolls back on unexpected error', async () => {
    mockFindByPk.mockResolvedValue(makeMatch());
    mockInstanceUpdate.mockRejectedValue(new Error('Unexpected'));
    const req = makeReq({ params: { matchId: '5' } });
    const res = makeRes();
    await approveMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockRollback).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════
// Section E: rejectMatch
// ═════════════════════════════════════════════════════════════
describe('rejectMatch', () => {
  it('E1 — rejects match and sets reviewer fields', async () => {
    const match = makeMatch();
    mockFindByPk.mockResolvedValue(match);

    const req = makeReq({ params: { matchId: '5' } });
    const res = makeRes();
    await rejectMatch(req, res);

    expect(mockInstanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected', reviewedByUserId: 1 }),
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('E2 — returns 404 if match not found', async () => {
    mockFindByPk.mockResolvedValue(null);
    const req = makeReq({ params: { matchId: '999' } });
    const res = makeRes();
    await rejectMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('E3 — returns 409 if match already resolved', async () => {
    mockFindByPk.mockResolvedValue(makeMatch({ status: 'rejected' }));
    const req = makeReq({ params: { matchId: '5' } });
    const res = makeRes();
    await rejectMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('E4 — returns 409 if parent waiver is revoked', async () => {
    mockFindByPk.mockResolvedValue(makeMatch({ waiverRecord: { id: 10, status: 'revoked' } }));
    const req = makeReq({ params: { matchId: '5' } });
    const res = makeRes();
    await rejectMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

// ═════════════════════════════════════════════════════════════
// Section F: attachUser
// ═════════════════════════════════════════════════════════════
describe('attachUser', () => {
  it('F1 — links waiver to client and creates audit record', async () => {
    const record = makeRecord();
    // First findByPk returns waiver record, second returns client user
    mockFindByPk.mockResolvedValueOnce(record).mockResolvedValueOnce({ id: 42, role: 'client' });

    const req = makeReq({ params: { id: '10' }, body: { userId: 42 } });
    const res = makeRes();
    await attachUser(req, res);

    expect(mockInstanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, status: 'linked' }),
      expect.any(Object),
    );
    // Audit record must be created (§12 requirement 4)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'override_used', userId: 42, actorUserId: 1 }),
      expect.any(Object),
    );
    expect(mockCommit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('F2 — returns 400 if userId not provided', async () => {
    const req = makeReq({ params: { id: '10' }, body: {} });
    const res = makeRes();
    await attachUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockRollback).toHaveBeenCalled();
  });

  it('F3 — returns 404 if waiver record not found', async () => {
    mockFindByPk.mockResolvedValue(null);
    const req = makeReq({ params: { id: '999' }, body: { userId: 42 } });
    const res = makeRes();
    await attachUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('F4 — returns 409 if waiver already linked', async () => {
    mockFindByPk.mockResolvedValue(makeRecord({ status: 'linked' }));
    const req = makeReq({ params: { id: '10' }, body: { userId: 42 } });
    const res = makeRes();
    await attachUser(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('F5 — returns 409 if waiver is revoked', async () => {
    mockFindByPk.mockResolvedValue(makeRecord({ status: 'revoked' }));
    const req = makeReq({ params: { id: '10' }, body: { userId: 42 } });
    const res = makeRes();
    await attachUser(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('F6 — returns 404 if user not found', async () => {
    mockFindByPk.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(null);
    const req = makeReq({ params: { id: '10' }, body: { userId: 999 } });
    const res = makeRes();
    await attachUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'User not found' }),
    );
  });

  it('F7 — returns 422 if target user is not a client', async () => {
    mockFindByPk.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce({ id: 42, role: 'trainer' });
    const req = makeReq({ params: { id: '10' }, body: { userId: 42 } });
    const res = makeRes();
    await attachUser(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('non-client') }),
    );
    expect(mockRollback).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════
// Section G: revokeWaiver
// ═════════════════════════════════════════════════════════════
describe('revokeWaiver', () => {
  it('G1 — revokes waiver with withdrawn action when AI consent was active', async () => {
    const record = makeRecord({
      userId: 42,
      consentFlags: { aiConsentAccepted: true, liabilityAccepted: true, mediaConsentAccepted: false, guardianAcknowledged: false },
    });
    mockFindByPk.mockResolvedValue(record);

    const req = makeReq({ params: { id: '10' } });
    const res = makeRes();
    await revokeWaiver(req, res);

    expect(mockInstanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'revoked' }),
      expect.any(Object),
    );
    // Audit: unconditional, 'withdrawn' action when AI consent was active
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'withdrawn', userId: 42, reason: expect.stringContaining('AI consent withdrawn') }),
      expect.any(Object),
    );
    expect(mockModelUpdate).toHaveBeenCalled();
    expect(mockCommit).toHaveBeenCalled();
  });

  it('G2 — revokes waiver with override_used action when no AI consent', async () => {
    const record = makeRecord();
    mockFindByPk.mockResolvedValue(record);

    const req = makeReq({ params: { id: '10' } });
    const res = makeRes();
    await revokeWaiver(req, res);

    expect(mockInstanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'revoked' }),
      expect.any(Object),
    );
    // Audit: unconditional, 'override_used' when no AI consent
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'override_used', reason: 'Waiver revoked by admin' }),
      expect.any(Object),
    );
    expect(mockCommit).toHaveBeenCalled();
  });

  it('G3 — returns 404 if waiver not found', async () => {
    mockFindByPk.mockResolvedValue(null);
    const req = makeReq({ params: { id: '999' } });
    const res = makeRes();
    await revokeWaiver(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockRollback).toHaveBeenCalled();
  });

  it('G4 — returns 409 if waiver already revoked', async () => {
    mockFindByPk.mockResolvedValue(makeRecord({ status: 'revoked' }));
    const req = makeReq({ params: { id: '10' } });
    const res = makeRes();
    await revokeWaiver(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockRollback).toHaveBeenCalled();
  });

  it('G5 — force-closes pending matches on revoke', async () => {
    const record = makeRecord();
    mockFindByPk.mockResolvedValue(record);

    const req = makeReq({ params: { id: '10' } });
    const res = makeRes();
    await revokeWaiver(req, res);

    // PendingWaiverMatch.update should be called to reject pending matches
    expect(mockModelUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected' }),
      expect.objectContaining({
        where: expect.objectContaining({ waiverRecordId: 10, status: 'pending_review' }),
      }),
    );
  });
});
