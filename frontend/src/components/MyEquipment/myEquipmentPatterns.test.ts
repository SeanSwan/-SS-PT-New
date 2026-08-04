/**
 * myEquipmentPatterns — pure grouping + self-serve profile rule regression.
 * =========================================================================
 * S5 blueprint §4.3: AI movementPatterns win, category heuristic fills in,
 * canonical 7-pattern ordering with 'none' last, and the client-side mirror
 * of the S4 profile policy (home/park/custom only, max 3).
 */
import { describe, it, expect } from 'vitest';
import type { EquipmentItem } from '../../hooks/useEquipmentAPI';
import {
  CATEGORY_PATTERN_MAP,
  getItemPatterns,
  getPatternCoverage,
  getProfileCapState,
  getVisibleItems,
  groupItemsByPattern,
  isUserLocationType,
  USER_LOCATION_TYPES,
  USER_PROFILE_CAP,
} from './myEquipmentPatterns';

const makeItem = (
  id: number,
  name: string,
  category: string,
  overrides: Partial<EquipmentItem> = {},
): EquipmentItem => ({
  id,
  profileId: 1,
  name,
  trainerLabel: null,
  category,
  resistanceType: null,
  description: null,
  photoUrl: null,
  aiScanData: null,
  approvalStatus: 'approved',
  approvedAt: null,
  isActive: true,
  quantity: 1,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('getItemPatterns', () => {
  it('maps every heuristic category exactly as specified', () => {
    expect(CATEGORY_PATTERN_MAP.dumbbell).toEqual(['push', 'pull', 'hinge', 'squat', 'lunge', 'carry']);
    expect(CATEGORY_PATTERN_MAP.resistance_band).toEqual(['push', 'pull', 'core']);
    expect(CATEGORY_PATTERN_MAP.bench).toEqual(['push']);
    expect(CATEGORY_PATTERN_MAP.pull_up_bar).toEqual(['pull', 'core']);
    expect(CATEGORY_PATTERN_MAP.kettlebell).toEqual(['hinge', 'carry']);
    expect(CATEGORY_PATTERN_MAP.barbell).toEqual(['push', 'pull', 'hinge', 'squat']);
    expect(CATEGORY_PATTERN_MAP.cardio).toEqual([]);
    expect(CATEGORY_PATTERN_MAP.other).toEqual([]);
  });

  it('uses the category heuristic when the scan reported no patterns', () => {
    expect(getItemPatterns(makeItem(1, 'Kettlebell', 'kettlebell'))).toEqual(['hinge', 'carry']);
    expect(getItemPatterns(makeItem(2, 'Treadmill', 'cardio'))).toEqual([]);
    expect(getItemPatterns(makeItem(3, 'Mystery', 'not_a_category'))).toEqual([]);
  });

  it('prefers aiScanData.movementPatterns when present, normalizing labels', () => {
    const item = makeItem(4, 'Loop Bands', 'resistance_band', {
      aiScanData: { movementPatterns: ['Pulling', 'CORE', 'Pull'] } as EquipmentItem['aiScanData'],
    });
    expect(getItemPatterns(item)).toEqual(['pull', 'core']);
  });

  it('falls back to the heuristic when AI patterns are all unrecognized', () => {
    const item = makeItem(5, 'Bench', 'bench', {
      aiScanData: { movementPatterns: ['mystery-movement'] } as EquipmentItem['aiScanData'],
    });
    expect(getItemPatterns(item)).toEqual(['push']);
  });
});

describe('groupItemsByPattern', () => {
  it('orders groups canonically, repeats multi-pattern items, and buckets patternless gear last', () => {
    const groups = groupItemsByPattern([
      makeItem(1, 'Exercise Bike', 'cardio'),
      makeItem(2, 'Pull-Up Bar', 'pull_up_bar'),
      makeItem(3, 'Flat Bench', 'bench'),
    ]);
    expect(groups.map((group) => group.pattern)).toEqual(['push', 'pull', 'core', 'none']);
    expect(groups.map((group) => group.label)).toEqual(['Pushing', 'Pulling', 'Core', 'Everything else']);
    const pullGroup = groups.find((group) => group.pattern === 'pull');
    const coreGroup = groups.find((group) => group.pattern === 'core');
    expect(pullGroup?.items.map((item) => item.name)).toEqual(['Pull-Up Bar']);
    expect(coreGroup?.items.map((item) => item.name)).toEqual(['Pull-Up Bar']);
    expect(groups.find((group) => group.pattern === 'none')?.items.map((item) => item.name)).toEqual(['Exercise Bike']);
  });

  it('omits empty groups entirely', () => {
    expect(groupItemsByPattern([])).toEqual([]);
    expect(groupItemsByPattern([makeItem(1, 'Bench', 'bench')]).map((g) => g.pattern)).toEqual(['push']);
  });
});

describe('getVisibleItems + getPatternCoverage', () => {
  it('hides rejected and archived items', () => {
    const visible = getVisibleItems([
      makeItem(1, 'Bench', 'bench'),
      makeItem(2, 'Rejected', 'bench', { approvalStatus: 'rejected' }),
      makeItem(3, 'Archived', 'bench', { isActive: false }),
      makeItem(4, 'Pending Dumbbells', 'dumbbell', { approvalStatus: 'pending' }),
    ]);
    expect(visible.map((item) => item.name)).toEqual(['Bench', 'Pending Dumbbells']);
  });

  it('reports coverage across the 7-pattern model', () => {
    const coverage = getPatternCoverage([makeItem(1, 'Kettlebell', 'kettlebell')]);
    expect(coverage).toEqual({
      push: false, pull: false, hinge: true, squat: false, lunge: false, carry: true, core: false,
    });
  });
});

describe('self-serve profile rules (S4 mirror)', () => {
  it('allows only home/park/custom location types', () => {
    expect([...USER_LOCATION_TYPES]).toEqual(['home', 'park', 'custom']);
    expect(isUserLocationType('home')).toBe(true);
    expect(isUserLocationType('park')).toBe(true);
    expect(isUserLocationType('custom')).toBe(true);
    expect(isUserLocationType('gym')).toBe(false);
    expect(isUserLocationType('client_home')).toBe(false);
  });

  it('caps self-serve profiles at 3', () => {
    expect(USER_PROFILE_CAP).toBe(3);
    expect(getProfileCapState([])).toEqual({ atCap: false, remaining: 3 });
    expect(getProfileCapState([{ id: 1 }, { id: 2 }])).toEqual({ atCap: false, remaining: 1 });
    expect(getProfileCapState([{ id: 1 }, { id: 2 }, { id: 3 }])).toEqual({ atCap: true, remaining: 0 });
    expect(getProfileCapState([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }])).toEqual({ atCap: true, remaining: 0 });
  });
});
