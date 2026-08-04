/**
 * equipmentGapReport — unit tests (Slice S6)
 * ==========================================
 * Locks the deterministic pattern-coverage math and suggestion ranking:
 *   - empty profile → 0 coverage everywhere + ranked suggestions
 *   - dumbbell-only profile → push/pull (etc.) half-covered, weakest identified
 *   - aiScanData.movementPatterns wins over the category heuristic
 *   - coverage caps at 1.0; suggestions skip already-owned categories
 *   - the DB read path filters to active approved/manual items only
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';

const mocks = vi.hoisted(() => ({
  equipmentItem: { findAll: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getEquipmentItem: () => mocks.equipmentItem,
}));

import {
  buildEquipmentGapReport,
  computeGapReportFromItems,
  resolveItemPatterns,
  CATEGORY_PATTERN_MAP,
  COUNTED_APPROVAL_STATUSES,
  MOVEMENT_PATTERNS,
} from '../../services/equipmentGapReport.mjs';

describe('computeGapReportFromItems', () => {
  it('empty profile → 0 coverage on all 8 patterns, weakest = first canonical, ranked suggestions', () => {
    const report = computeGapReportFromItems(7, []);

    expect(report.profileId).toBe(7);
    expect(report.patterns).toHaveLength(8);
    expect(report.patterns.map((p) => p.pattern)).toEqual(MOVEMENT_PATTERNS);
    for (const p of report.patterns) {
      expect(p.coverage).toBe(0);
      expect(p.itemCount).toBe(0);
      expect(p.exampleItems).toEqual([]);
    }
    expect(report.overallCoverage).toBe(0);
    expect(report.weakestPattern).toBe('push'); // canonical-order tie-break

    // Deterministic ranking by total coverage lift:
    // kettlebell (7 patterns) > adjustable dumbbells (6) > loop band (3).
    expect(report.suggestions.map((s) => s.addition)).toEqual([
      'Kettlebell', 'Adjustable dumbbells', 'Loop resistance band',
    ]);
    for (const s of report.suggestions) {
      expect(s.unlocksPatterns.length).toBeGreaterThan(0);
      expect(typeof s.reason).toBe('string');
    }
  });

  it('dumbbell-only profile → push/pull half-covered, core is the weakest, own category never suggested', () => {
    const report = computeGapReportFromItems(3, [
      { name: 'Dumbbell Set', category: 'dumbbell', aiScanData: null },
    ]);

    const byPattern = Object.fromEntries(report.patterns.map((p) => [p.pattern, p]));
    for (const pattern of CATEGORY_PATTERN_MAP.dumbbell) {
      expect(byPattern[pattern].itemCount).toBe(1);
      expect(byPattern[pattern].coverage).toBe(0.5); // 1 of 2 items toward full coverage
      expect(byPattern[pattern].exampleItems).toEqual(['Dumbbell Set']);
    }
    expect(byPattern.core.coverage).toBe(0);
    expect(byPattern.rotation.coverage).toBe(0);
    expect(report.weakestPattern).toBe('core'); // first 0-coverage pattern in canonical order
    expect(report.overallCoverage).toBe(0.38);  // (6 * 0.5) / 8 rounded to 2dp

    // 'Adjustable dumbbells' skipped (category already owned); scores:
    // kettlebell 6*0.5+1 = 4 > loop band 0.5+0.5+1 = 2 > pull-up bar 0.5+1 = 1.5.
    expect(report.suggestions.map((s) => s.addition)).toEqual([
      'Kettlebell', 'Loop resistance band', 'Doorway pull-up bar',
    ]);
    // Suggestions are deterministic: same input → identical output.
    const rerun = computeGapReportFromItems(3, [
      { name: 'Dumbbell Set', category: 'dumbbell', aiScanData: null },
    ]);
    expect(rerun).toEqual(report);
  });

  it('aiScanData.movementPatterns wins over the category heuristic', () => {
    expect(resolveItemPatterns({
      category: 'other',
      aiScanData: { movementPatterns: ['Pull', 'core', 'not-a-pattern'] },
    })).toEqual(['pull', 'core']);

    // Empty/garbage scan patterns fall back to the category map.
    expect(resolveItemPatterns({
      category: 'bench',
      aiScanData: { movementPatterns: ['nonsense'] },
    })).toEqual(CATEGORY_PATTERN_MAP.bench);
  });

  it('coverage caps at 1.0 with two covering items and prefers trainerLabel for example names', () => {
    const report = computeGapReportFromItems(9, [
      { name: 'Flat Bench', category: 'bench', aiScanData: null },
      { name: 'Incline Bench', trainerLabel: 'My Incline', category: 'bench', aiScanData: null },
      { name: 'Third Bench', category: 'bench', aiScanData: null },
      { name: 'Fourth Bench', category: 'bench', aiScanData: null },
    ]);
    const push = report.patterns.find((p) => p.pattern === 'push');
    expect(push.coverage).toBe(1);
    expect(push.itemCount).toBe(4);
    expect(push.exampleItems).toEqual(['Flat Bench', 'My Incline', 'Third Bench']); // ≤3
  });
});

describe('buildEquipmentGapReport (DB read path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads only active approved/manual items for the profile', async () => {
    mocks.equipmentItem.findAll.mockResolvedValue([
      { name: 'Kettlebell 16kg', category: 'kettlebell', aiScanData: null },
    ]);

    const report = await buildEquipmentGapReport(42);

    expect(mocks.equipmentItem.findAll).toHaveBeenCalledTimes(1);
    const query = mocks.equipmentItem.findAll.mock.calls[0][0];
    expect(query.where.profileId).toBe(42);
    expect(query.where.isActive).toBe(true);
    expect(query.where.approvalStatus).toEqual({ [Op.in]: COUNTED_APPROVAL_STATUSES });
    expect(COUNTED_APPROVAL_STATUSES).toEqual(['approved', 'manual']); // pending/rejected never count

    expect(report.profileId).toBe(42);
    expect(report.patterns.find((p) => p.pattern === 'hinge').itemCount).toBe(1);
  });

  it('rejects a non-positive or non-integer profileId', async () => {
    await expect(buildEquipmentGapReport(0)).rejects.toThrow(/positive integer/);
    await expect(buildEquipmentGapReport('abc')).rejects.toThrow(/positive integer/);
    expect(mocks.equipmentItem.findAll).not.toHaveBeenCalled();
  });
});
