/**
 * colorwayFamilies.test.ts
 * ========================
 * Guards the curated-tray grouping: every colorway lands in exactly one visible family
 * (nothing hidden — the whole point of unlocking the 38), grouping is deterministic, and
 * the active/current colorway stays reachable.
 */
import { describe, it, expect } from 'vitest';
import { groupByFamily, familyOf, FAMILY_ORDER } from './colorwayFamilies';
import { themes, type ThemeId } from '../UniversalThemeContext';

const ALL_IDS = Object.keys(themes) as ThemeId[];

describe('colorwayFamilies', () => {
  it('classifies every registered colorway into exactly one known family', () => {
    for (const id of ALL_IDS) {
      const fam = familyOf(id);
      expect(FAMILY_ORDER, `${id} → ${fam}`).toContain(fam);
    }
  });

  it('groupByFamily preserves ALL colorways (nothing hidden)', () => {
    const grouped = groupByFamily(ALL_IDS);
    const flat = grouped.flatMap((g) => g.ids);
    expect(flat.length).toBe(ALL_IDS.length);
    expect(new Set(flat).size).toBe(ALL_IDS.length);
  });

  it('is deterministic', () => {
    expect(JSON.stringify(groupByFamily(ALL_IDS))).toBe(JSON.stringify(groupByFamily(ALL_IDS)));
  });

  it('keeps a current-first input reachable in its family group', () => {
    const reordered: ThemeId[] = ['crystalline-light', ...ALL_IDS.filter((i) => i !== 'crystalline-light')];
    const grouped = groupByFamily(reordered);
    const flat = grouped.flatMap((g) => g.ids);
    expect(flat).toContain('crystalline-light');
  });

  it('every family group is non-empty and headed by a known order', () => {
    const grouped = groupByFamily(ALL_IDS);
    for (const g of grouped) {
      expect(g.ids.length).toBeGreaterThan(0);
      expect(FAMILY_ORDER).toContain(g.family);
    }
  });
});
