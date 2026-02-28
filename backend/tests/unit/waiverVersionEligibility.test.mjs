/**
 * Waiver Version Eligibility Service — Phase 5W-F Tests
 * ======================================================
 * Covers:
 *   Section A: evaluateWaiverVersionEligibility (12 tests)
 *
 * Contract: WAIVER-CONSENT-QR-FLOW-CONTRACT.md §7
 */
import { describe, it, expect, vi } from 'vitest';
import { evaluateWaiverVersionEligibility } from '../../services/waivers/waiverVersionEligibilityService.mjs';

// ── Helpers ────────────────────────────────────────────────────

const NOW = new Date('2026-02-27T12:00:00Z');

function makeModels(overrides = {}) {
  return {
    WaiverVersion: {
      findAll: vi.fn().mockResolvedValue([]),
    },
    WaiverRecord: {
      findOne: vi.fn().mockResolvedValue(null),
    },
    WaiverRecordVersion: {
      findAll: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
}

// Current versions fixture: one core (id=1), one ai_notice (id=2)
function makeCurrentVersions(extra = []) {
  return [
    { id: 1, waiverType: 'core', requiresReconsent: false },
    { id: 2, waiverType: 'ai_notice', requiresReconsent: false },
    ...extra,
  ];
}

// ═══════════════════════════════════════════════════════════════
// Section A: evaluateWaiverVersionEligibility (12 tests)
// ═══════════════════════════════════════════════════════════════

describe('evaluateWaiverVersionEligibility', () => {

  it('A.1 — returns AI_WAIVER_MISSING when models are not available', async () => {
    const result = await evaluateWaiverVersionEligibility({
      targetUserId: 1, models: {}, now: NOW,
    });
    expect(result.hasWaiverConsent).toBe(false);
    expect(result.isCurrent).toBe(false);
    expect(result.reasonCode).toBe('AI_WAIVER_MISSING');
    expect(result.consentSource).toBe('none');
  });

  it('A.2 — returns AI_WAIVER_MISSING when no current required versions exist', async () => {
    const models = makeModels({
      WaiverVersion: { findAll: vi.fn().mockResolvedValue([]) },
    });
    const result = await evaluateWaiverVersionEligibility({
      targetUserId: 1, models, now: NOW,
    });
    expect(result.reasonCode).toBe('AI_WAIVER_MISSING');
    expect(result.details.requiredVersionIds).toEqual([]);
  });

  it('A.3 — returns AI_WAIVER_MISSING when only core version exists (ai_notice missing)', async () => {
    const models = makeModels({
      WaiverVersion: {
        findAll: vi.fn().mockResolvedValue([
          { id: 1, waiverType: 'core', requiresReconsent: false },
        ]),
      },
    });
    const result = await evaluateWaiverVersionEligibility({
      targetUserId: 1, models, now: NOW,
    });
    expect(result.reasonCode).toBe('AI_WAIVER_MISSING');
  });

  it('A.4 — returns AI_WAIVER_MISSING when user has no linked waiver', async () => {
    const models = makeModels({
      WaiverVersion: { findAll: vi.fn().mockResolvedValue(makeCurrentVersions()) },
      WaiverRecord: { findOne: vi.fn().mockResolvedValue(null) },
    });
    const result = await evaluateWaiverVersionEligibility({
      targetUserId: 1, models, now: NOW,
    });
    expect(result.hasWaiverConsent).toBe(false);
    expect(result.reasonCode).toBe('AI_WAIVER_MISSING');
    expect(result.details.requiredVersionIds).toEqual([1, 2]);
  });

  it('A.5 — returns AI_WAIVER_MISSING when linked waiver has no accepted required versions', async () => {
    const models = makeModels({
      WaiverVersion: { findAll: vi.fn().mockResolvedValue(makeCurrentVersions()) },
      WaiverRecord: { findOne: vi.fn().mockResolvedValue({ id: 10 }) },
      WaiverRecordVersion: { findAll: vi.fn().mockResolvedValue([]) },
    });
    const result = await evaluateWaiverVersionEligibility({
      targetUserId: 1, models, now: NOW,
    });
    expect(result.hasWaiverConsent).toBe(false);
    expect(result.reasonCode).toBe('AI_WAIVER_MISSING');
  });

  it('A.5b — returns AI_WAIVER_VERSION_OUTDATED when user accepted older retired versions but not current ones', async () => {
    const findAllMock = vi.fn()
      .mockResolvedValueOnce([])              // 1st call: no current versions accepted
      .mockResolvedValueOnce([{ waiverVersionId: 99 }]); // 2nd call: has an older accepted version
    const models = makeModels({
      WaiverVersion: { findAll: vi.fn().mockResolvedValue(makeCurrentVersions()) },
      WaiverRecord: { findOne: vi.fn().mockResolvedValue({ id: 10 }) },
      WaiverRecordVersion: { findAll: findAllMock },
    });
    const result = await evaluateWaiverVersionEligibility({
      targetUserId: 1, models, now: NOW,
    });
    expect(result.hasWaiverConsent).toBe(true);
    expect(result.isCurrent).toBe(false);
    expect(result.reasonCode).toBe('AI_WAIVER_VERSION_OUTDATED');
    expect(result.consentSource).toBe('waiver_signature');
  });

  it('A.6 — returns AI_WAIVER_VERSION_OUTDATED when only core accepted (ai_notice missing)', async () => {
    const models = makeModels({
      WaiverVersion: { findAll: vi.fn().mockResolvedValue(makeCurrentVersions()) },
      WaiverRecord: { findOne: vi.fn().mockResolvedValue({ id: 10 }) },
      WaiverRecordVersion: {
        findAll: vi.fn().mockResolvedValue([
          { waiverVersionId: 1 }, // only core accepted
        ]),
      },
    });
    const result = await evaluateWaiverVersionEligibility({
      targetUserId: 1, models, now: NOW,
    });
    expect(result.hasWaiverConsent).toBe(true);
    expect(result.isCurrent).toBe(false);
    expect(result.reasonCode).toBe('AI_WAIVER_VERSION_OUTDATED');
    expect(result.consentSource).toBe('waiver_signature');
    expect(result.details.missingRequiredVersionIds).toEqual([2]);
  });

  it('A.7 — returns AI_WAIVER_VERSION_OUTDATED when requiresReconsent=true on accepted version', async () => {
    const versionsWithReconsent = [
      { id: 1, waiverType: 'core', requiresReconsent: true }, // <-- reconsent
      { id: 2, waiverType: 'ai_notice', requiresReconsent: false },
    ];
    const models = makeModels({
      WaiverVersion: { findAll: vi.fn().mockResolvedValue(versionsWithReconsent) },
      WaiverRecord: { findOne: vi.fn().mockResolvedValue({ id: 10 }) },
      WaiverRecordVersion: {
        findAll: vi.fn().mockResolvedValue([
          { waiverVersionId: 1 },
          { waiverVersionId: 2 },
        ]),
      },
    });
    const result = await evaluateWaiverVersionEligibility({
      targetUserId: 1, models, now: NOW,
    });
    expect(result.hasWaiverConsent).toBe(true);
    expect(result.isCurrent).toBe(false);
    expect(result.reasonCode).toBe('AI_WAIVER_VERSION_OUTDATED');
    expect(result.details.reconsentRequiredVersionIds).toEqual([1]);
  });

  it('A.8 — returns allow (null reasonCode) when both required versions accepted and current', async () => {
    const models = makeModels({
      WaiverVersion: { findAll: vi.fn().mockResolvedValue(makeCurrentVersions()) },
      WaiverRecord: { findOne: vi.fn().mockResolvedValue({ id: 10 }) },
      WaiverRecordVersion: {
        findAll: vi.fn().mockResolvedValue([
          { waiverVersionId: 1 },
          { waiverVersionId: 2 },
        ]),
      },
    });
    const result = await evaluateWaiverVersionEligibility({
      targetUserId: 1, models, now: NOW,
    });
    expect(result.hasWaiverConsent).toBe(true);
    expect(result.isCurrent).toBe(true);
    expect(result.reasonCode).toBeNull();
    expect(result.consentSource).toBe('waiver_signature');
    expect(result.details.missingRequiredVersionIds).toEqual([]);
    expect(result.details.reconsentRequiredVersionIds).toEqual([]);
  });

  it('A.9 — queries WaiverVersion with correct effectiveAt/retiredAt filters', async () => {
    const findAllMock = vi.fn().mockResolvedValue([]);
    const models = makeModels({
      WaiverVersion: { findAll: findAllMock },
    });
    await evaluateWaiverVersionEligibility({ targetUserId: 1, models, now: NOW });
    expect(findAllMock).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        retiredAt: null,
      }),
    }));
  });

  it('A.10 — queries WaiverRecord for linked status with consentFlags association', async () => {
    const waiverFindOne = vi.fn().mockResolvedValue(null);
    const models = makeModels({
      WaiverVersion: { findAll: vi.fn().mockResolvedValue(makeCurrentVersions()) },
      WaiverRecord: { findOne: waiverFindOne },
    });
    await evaluateWaiverVersionEligibility({ targetUserId: 42, models, now: NOW });
    expect(waiverFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 42,
        status: 'linked',
      }),
      include: [expect.objectContaining({
        association: 'consentFlags',
        where: { aiConsentAccepted: true },
        required: true,
      })],
    }));
  });

  it('A.11 — reconsent flag only triggers on accepted versions (not missing ones)', async () => {
    const versionsWithReconsent = [
      { id: 1, waiverType: 'core', requiresReconsent: true },
      { id: 2, waiverType: 'ai_notice', requiresReconsent: false },
    ];
    const models = makeModels({
      WaiverVersion: { findAll: vi.fn().mockResolvedValue(versionsWithReconsent) },
      WaiverRecord: { findOne: vi.fn().mockResolvedValue({ id: 10 }) },
      WaiverRecordVersion: {
        findAll: vi.fn().mockResolvedValue([
          { waiverVersionId: 2 }, // only ai_notice accepted; core is MISSING
        ]),
      },
    });
    const result = await evaluateWaiverVersionEligibility({
      targetUserId: 1, models, now: NOW,
    });
    expect(result.reasonCode).toBe('AI_WAIVER_VERSION_OUTDATED');
    // core is missing not reconsentRequired, because it's not accepted at all
    expect(result.details.reconsentRequiredVersionIds).toEqual([]);
    expect(result.details.missingRequiredVersionIds).toEqual([1]);
  });

  it('A.12 — handles null models gracefully', async () => {
    const result = await evaluateWaiverVersionEligibility({
      targetUserId: 1, models: null, now: NOW,
    });
    expect(result.reasonCode).toBe('AI_WAIVER_MISSING');
    expect(result.consentSource).toBe('none');
  });
});
