/**
 * V3c.4 — ohsaCompensationAggregator regression tests
 * ====================================================
 *
 * Locks the OHSA-wizard → MovementProfile bridge:
 *   - extractCompensationsFromOHSA: pure mapping from wizard payload
 *     to clientIntelligenceService commonCompensations shape.
 *   - upsertMovementProfileFromOHSA: idempotent upsert by userId,
 *     tolerant of missing/empty inputs, error-propagating.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  extractCompensationsFromOHSA,
  upsertMovementProfileFromOHSA,
  __testing__,
} from '../services/ohsaCompensationAggregator.mjs';

const { OHSA_FIELD_TO_CES_KEY, SEVERITY_BY_LEVEL } = __testing__;

// ─── extractCompensationsFromOHSA ─────────────────────────────────

describe('extractCompensationsFromOHSA — pure aggregator', () => {
  it('returns [] for missing/non-object ohsa', () => {
    expect(extractCompensationsFromOHSA(null)).toEqual([]);
    expect(extractCompensationsFromOHSA(undefined)).toEqual([]);
    expect(extractCompensationsFromOHSA('string')).toEqual([]);
    expect(extractCompensationsFromOHSA(42)).toEqual([]);
  });

  it('returns [] when all OHSA fields are "none"', () => {
    const ohsa = {
      anteriorView: { feetTurnout: 'none', kneeValgus: 'none', kneeVarus: 'none', feetFlattening: 'none' },
      lateralView: { excessiveForwardLean: 'none', lowBackArch: 'none', armsFallForward: 'none', forwardHead: 'none' },
      asymmetricWeightShift: 'none',
    };
    expect(extractCompensationsFromOHSA(ohsa)).toEqual([]);
  });

  it('emits one entry per detected compensation with the correct CES_MAP key', () => {
    const ohsa = {
      anteriorView: { kneeValgus: 'minor', feetTurnout: 'none' },
      lateralView: { forwardHead: 'significant', lowBackArch: 'minor' },
    };
    const result = extractCompensationsFromOHSA(ohsa);
    const types = result.map((c) => c.type).sort();
    expect(types).toEqual(['head_protrusion', 'knee_valgus', 'low_back_arch']);
  });

  it('uses correct severity per level (none=0, minor=5, significant=8)', () => {
    const ohsa = {
      anteriorView: { kneeValgus: 'minor' },
      lateralView: { lowBackArch: 'significant' },
    };
    const result = extractCompensationsFromOHSA(ohsa);
    const knee = result.find((c) => c.type === 'knee_valgus');
    const back = result.find((c) => c.type === 'low_back_arch');
    expect(knee.avgSeverity).toBe(5);
    expect(back.avgSeverity).toBe(8);
  });

  it('collapses overlapping wizard fields onto same CES_MAP key, keeping max severity', () => {
    // Both feetTurnout and feetFlattening map to foot_pronation. The
    // significant value should win over the minor value.
    const ohsa = {
      anteriorView: { feetTurnout: 'minor', feetFlattening: 'significant' },
    };
    const result = extractCompensationsFromOHSA(ohsa);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('foot_pronation');
    expect(result[0].avgSeverity).toBe(8);
  });

  it('emits frequency=1, trend="stable" for single-assessment input', () => {
    const ohsa = { anteriorView: { kneeValgus: 'minor' } };
    const [entry] = extractCompensationsFromOHSA(ohsa);
    expect(entry.frequency).toBe(1);
    expect(entry.trend).toBe('stable');
  });

  it('uses provided lastDetected when supplied', () => {
    const ohsa = { anteriorView: { kneeValgus: 'minor' } };
    const ts = '2026-04-15T12:00:00.000Z';
    const [entry] = extractCompensationsFromOHSA(ohsa, { lastDetected: ts });
    expect(entry.lastDetected).toBe(ts);
  });

  it('handles asymmetricWeightShift at top level', () => {
    const result = extractCompensationsFromOHSA({ asymmetricWeightShift: 'significant' });
    expect(result).toEqual([
      expect.objectContaining({ type: 'hip_drop', avgSeverity: 8 }),
    ]);
  });

  it('ignores wizard fields not in the CES_MAP', () => {
    const ohsa = {
      anteriorView: { kneeValgus: 'minor', someUnknownField: 'significant' },
    };
    const result = extractCompensationsFromOHSA(ohsa);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('knee_valgus');
  });

  it('mapping table covers all expected OHSA wizard fields', () => {
    expect(OHSA_FIELD_TO_CES_KEY).toMatchObject({
      feetTurnout: 'foot_pronation',
      feetFlattening: 'foot_pronation',
      kneeValgus: 'knee_valgus',
      kneeVarus: 'knee_varus',
      excessiveForwardLean: 'excessive_forward_lean',
      lowBackArch: 'low_back_arch',
      armsFallForward: 'arms_fall_forward',
      forwardHead: 'head_protrusion',
      asymmetricWeightShift: 'hip_drop',
    });
  });

  it('severity map values are deterministic', () => {
    expect(SEVERITY_BY_LEVEL).toEqual({ none: 0, minor: 5, significant: 8 });
  });
});

// ─── upsertMovementProfileFromOHSA ────────────────────────────────

describe('upsertMovementProfileFromOHSA — idempotent upsert', () => {
  function makeMockMP() {
    return {
      findOrCreate: vi.fn(),
    };
  }

  it('skips when userId is missing/null/zero', async () => {
    const mp = makeMockMP();
    const result = await upsertMovementProfileFromOHSA({
      userId: null,
      ohsa: { anteriorView: { kneeValgus: 'minor' } },
      MovementProfile: mp,
    });
    expect(result.updated).toBe(false);
    expect(result.reason).toBe('no-userId');
    expect(mp.findOrCreate).not.toHaveBeenCalled();
  });

  it('skips when MovementProfile model is missing', async () => {
    const result = await upsertMovementProfileFromOHSA({
      userId: 1,
      ohsa: { anteriorView: { kneeValgus: 'minor' } },
      MovementProfile: null,
    });
    expect(result.updated).toBe(false);
    expect(result.reason).toBe('no-MovementProfile-model');
  });

  it('skips when ohsa payload is missing', async () => {
    const mp = makeMockMP();
    const result = await upsertMovementProfileFromOHSA({
      userId: 1,
      ohsa: null,
      MovementProfile: mp,
    });
    expect(result.updated).toBe(false);
    expect(result.reason).toBe('no-ohsa-payload');
    expect(mp.findOrCreate).not.toHaveBeenCalled();
  });

  it('creates a new MovementProfile when none exists', async () => {
    const mockProfile = { update: vi.fn(), totalAnalyses: 0 };
    const mp = makeMockMP();
    mp.findOrCreate.mockResolvedValueOnce([mockProfile, /* created */ true]);

    const result = await upsertMovementProfileFromOHSA({
      userId: 42,
      ohsa: { anteriorView: { kneeValgus: 'minor' } },
      MovementProfile: mp,
    });

    expect(mp.findOrCreate).toHaveBeenCalledTimes(1);
    const args = mp.findOrCreate.mock.calls[0][0];
    expect(args.where).toEqual({ userId: 42 });
    expect(args.defaults.commonCompensations).toEqual([
      expect.objectContaining({ type: 'knee_valgus', avgSeverity: 5 }),
    ]);
    expect(args.defaults.totalAnalyses).toBe(1);

    // No update() call when row was created.
    expect(mockProfile.update).not.toHaveBeenCalled();
    expect(result.updated).toBe(true);
    expect(result.created).toBe(true);
  });

  it('updates an existing MovementProfile and increments totalAnalyses', async () => {
    const mockProfile = {
      totalAnalyses: 3,
      update: vi.fn().mockResolvedValue(undefined),
    };
    const mp = makeMockMP();
    mp.findOrCreate.mockResolvedValueOnce([mockProfile, /* created */ false]);

    const result = await upsertMovementProfileFromOHSA({
      userId: 7,
      ohsa: { lateralView: { lowBackArch: 'significant' } },
      MovementProfile: mp,
    });

    expect(mockProfile.update).toHaveBeenCalledTimes(1);
    const updateArgs = mockProfile.update.mock.calls[0][0];
    expect(updateArgs.commonCompensations).toEqual([
      expect.objectContaining({ type: 'low_back_arch', avgSeverity: 8 }),
    ]);
    expect(updateArgs.totalAnalyses).toBe(4); // 3 + 1
    expect(result.updated).toBe(true);
    expect(result.created).toBe(false);
  });

  it('writes empty compensations array when assessment finds nothing', async () => {
    // "We assessed and found nothing" is meaningful — distinguishes from
    // "never assessed."
    const mockProfile = { update: vi.fn(), totalAnalyses: 0 };
    const mp = makeMockMP();
    mp.findOrCreate.mockResolvedValueOnce([mockProfile, true]);

    const ohsa = {
      anteriorView: { kneeValgus: 'none', feetTurnout: 'none' },
      lateralView: { lowBackArch: 'none', forwardHead: 'none' },
    };
    const result = await upsertMovementProfileFromOHSA({
      userId: 1, ohsa, MovementProfile: mp,
    });

    const args = mp.findOrCreate.mock.calls[0][0];
    expect(args.defaults.commonCompensations).toEqual([]);
    expect(result.updated).toBe(true);
  });

  it('rethrows DB errors so callers can decide how to handle', async () => {
    const mp = makeMockMP();
    mp.findOrCreate.mockRejectedValueOnce(new Error('Database connection lost'));

    await expect(
      upsertMovementProfileFromOHSA({
        userId: 1,
        ohsa: { anteriorView: { kneeValgus: 'minor' } },
        MovementProfile: mp,
      }),
    ).rejects.toThrow(/Database connection lost/);
  });

  it('passes the optional transaction through to Sequelize calls', async () => {
    const mockProfile = { update: vi.fn(), totalAnalyses: 1 };
    const mp = makeMockMP();
    mp.findOrCreate.mockResolvedValueOnce([mockProfile, false]);

    const fakeTx = { id: 'tx-123' };
    await upsertMovementProfileFromOHSA({
      userId: 1,
      ohsa: { anteriorView: { kneeValgus: 'minor' } },
      MovementProfile: mp,
      transaction: fakeTx,
    });

    expect(mp.findOrCreate.mock.calls[0][0].transaction).toBe(fakeTx);
    expect(mockProfile.update.mock.calls[0][1].transaction).toBe(fakeTx);
  });
});
