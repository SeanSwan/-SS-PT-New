/**
 * FILE: NutritionWorkspace.segments.test.ts
 * PURPOSE: Locks the Phase 4B segment map — every one of the 14 nutrition
 *          tab ids lives in exactly one segment, gated ids are marked, and
 *          segment taps always land on a reachable tab.
 */
import { describe, expect, it } from 'vitest';
import {
  GATED_NUTRITION_TABS,
  NUTRITION_SEGMENTS,
  firstReachableTab,
  isGatedNutritionTab,
  segmentForTab,
} from './NutritionWorkspace.segments';
import { NUTRITION_ALL_TABS, type Tab } from './NutritionWorkspace.tabs';

const ALL_TAB_IDS: Tab[] = [
  'today', 'log', 'voice', 'search', 'barcode', 'restaurant', 'hydration',
  'macros', 'intelligence', 'learn', 'garden', 'farms', 'supplements', 'meal-plan',
  'quality', // 4E Food Quality resurrection
];

describe('NutritionWorkspace segments (4B IA)', () => {
  it('covers every one of the 15 tab ids in exactly one segment', () => {
    const seen = new Map<Tab, number>();
    NUTRITION_SEGMENTS.forEach((segment) => {
      segment.tabs.forEach((tab) => seen.set(tab, (seen.get(tab) || 0) + 1));
    });

    expect(ALL_TAB_IDS).toHaveLength(15); // +quality (4E Food Quality resurrection)
    ALL_TAB_IDS.forEach((tab) => {
      expect(seen.get(tab), `tab "${tab}" segment count`).toBe(1);
    });
    // No extra/unknown ids snuck into a segment.
    expect(seen.size).toBe(ALL_TAB_IDS.length);
  });

  it('stays in lockstep with the registered tab configs (label/icon source)', () => {
    const configIds = NUTRITION_ALL_TABS.map((tab) => tab.id).sort();
    const segmentIds = NUTRITION_SEGMENTS.flatMap((segment) => [...segment.tabs]).sort();
    expect(segmentIds).toEqual(configIds);
  });

  it('matches the HY3 intent grouping', () => {
    const byId = Object.fromEntries(NUTRITION_SEGMENTS.map((s) => [s.id, [...s.tabs]]));
    expect(byId.capture).toEqual(['today', 'log', 'voice', 'barcode', 'restaurant', 'hydration']);
    expect(byId.insights).toEqual(['macros', 'intelligence', 'garden', 'farms']);
    expect(byId.fuel).toEqual(['meal-plan', 'supplements']);
    expect(byId.explore).toEqual(['search', 'quality', 'learn']);
  });

  it('marks exactly the CrystallineLockOverlay-gated tabs as locked', () => {
    expect([...GATED_NUTRITION_TABS].sort()).toEqual(['intelligence', 'meal-plan', 'voice']);
    expect(isGatedNutritionTab('voice')).toBe(true);
    expect(isGatedNutritionTab('today')).toBe(false);
  });

  it('resolves the owning segment for every tab', () => {
    NUTRITION_SEGMENTS.forEach((segment) => {
      segment.tabs.forEach((tab) => expect(segmentForTab(tab)).toBe(segment.id));
    });
  });

  it('lands segment taps on an ungated tab while premium is locked', () => {
    expect(firstReachableTab('capture', true)).toBe('today');
    expect(firstReachableTab('insights', true)).toBe('macros');
    expect(firstReachableTab('fuel', true)).toBe('supplements');
    expect(firstReachableTab('explore', true)).toBe('search');
    // Every segment must always keep at least one ungated tab.
    NUTRITION_SEGMENTS.forEach((segment) => {
      expect(isGatedNutritionTab(firstReachableTab(segment.id, true))).toBe(false);
    });
  });

  it('lands segment taps on the first tab when unlocked', () => {
    expect(firstReachableTab('capture', false)).toBe('today');
    expect(firstReachableTab('fuel', false)).toBe('meal-plan');
  });
});
