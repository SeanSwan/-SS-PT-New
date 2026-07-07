/**
 * cesCoverageBackfill.test.mjs — launch charter Phase 4B.1 locks
 * ================================================================
 * The Mobility Board's engine gate: every syndrome the OHSA aggregator can
 * emit must resolve to ≥1 ces-* exercise per inhibit/lengthen/activate.
 * Prod truth 2026-07-07 (read-only matrix): knees_bow 0/0/0,
 * excessive_forward_lean 0-inhibit/0-activate, asymmetric_shift
 * 0-inhibit/0-lengthen. This suite parses BOTH seeders (starter + backfill)
 * as the fixture and asserts the holes are closed, keys stay unique, the
 * retag pass is additive-only, and the lacrosse_ball equipment category
 * exists.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  BACKFILL_ROWS,
  ADDITIVE_RETAGS,
} from '../../seeders/20260707020000-seed-ces-coverage-backfill.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(__dirname, rel), 'utf8');
const STARTER = read('../../seeders/20260504-seed-nasm-corrective-starter.mjs');
const BACKFILL = read('../../seeders/20260707020000-seed-ces-coverage-backfill.mjs');
const EQUIPMENT_MODEL = read('../../models/EquipmentItem.mjs');

/** Tags reachable through the aggregator → tag-map chain (verbatim vocab). */
const REACHABLE_TAGS = [
  'knees_cave',
  'pronation_distortion_syndrome',
  'knees_bow',
  'excessive_forward_lean',
  'lower_crossed_syndrome',
  'arms_fall_forward',
  'upper_crossed_syndrome',
  'low_back_arch',
  'forward_head',
  'asymmetric_shift',
];
const REQUIRED_STEPS = ['inhibit', 'lengthen', 'activate'];

/** Parse the starter seeder's rows from source (key + step + tags). */
function parseStarterRows(source) {
  const rows = [];
  const rowRegex = /exercise_key:\s*'(ces-[^']+)'[\s\S]*?nasmCorrectiveCategory:\s*(\[[^\]]*\])[\s\S]*?cesProtocolStep:\s*'(\w+)'/g;
  let match;
  while ((match = rowRegex.exec(source)) !== null) {
    rows.push({
      exercise_key: match[1],
      tags: JSON.parse(match[2].replace(/'/g, '"')),
      step: match[3],
    });
  }
  return rows;
}

const starterRows = parseStarterRows(STARTER);

describe('CES coverage backfill (4B.1)', () => {
  it('parses the starter fixture (sanity: 32 rows)', () => {
    expect(starterRows).toHaveLength(32);
  });

  it('every aggregator-reachable syndrome has ≥1 exercise per inhibit/lengthen/activate', () => {
    // Compose the post-backfill fixture: starter rows + retags + new rows.
    const retagged = starterRows.map((row) => {
      const extra = ADDITIVE_RETAGS[row.exercise_key] ?? [];
      return { ...row, tags: [...new Set([...row.tags, ...extra])] };
    });
    const fixture = [
      ...retagged,
      ...BACKFILL_ROWS.map((r) => ({
        exercise_key: r.exercise_key,
        tags: r.nasmCorrectiveCategory,
        step: r.cesProtocolStep,
      })),
    ];
    const holes = [];
    for (const tag of REACHABLE_TAGS) {
      for (const step of REQUIRED_STEPS) {
        const count = fixture.filter((r) => r.step === step && r.tags.includes(tag)).length;
        if (count === 0) holes.push(`${tag}/${step}`);
      }
    }
    expect(holes).toEqual([]);
  });

  it('new keys are ces-prefixed, unique, and collision-free with the starter', () => {
    const newKeys = BACKFILL_ROWS.map((r) => r.exercise_key);
    expect(new Set(newKeys).size).toBe(newKeys.length);
    for (const key of newKeys) {
      expect(key).toMatch(/^ces-[a-z0-9-]+$/);
      expect(starterRows.some((r) => r.exercise_key === key)).toBe(false);
    }
  });

  it('every new row is board-ready (valid step, tags, recovery category, citation)', () => {
    for (const row of BACKFILL_ROWS) {
      expect(['inhibit', 'lengthen', 'activate', 'integrate']).toContain(row.cesProtocolStep);
      expect(Array.isArray(row.nasmCorrectiveCategory)).toBe(true);
      expect(row.nasmCorrectiveCategory.length).toBeGreaterThan(0);
      expect(row.bodyPartCategory).toBe('recovery');
      expect(row.sourceCitation).toMatch(/NASM/);
      expect(row.instructions.length).toBeGreaterThan(40);
    }
  });

  it('retag pass is additive-only and targets existing starter keys', () => {
    for (const [key, tags] of Object.entries(ADDITIVE_RETAGS)) {
      expect(starterRows.some((r) => r.exercise_key === key)).toBe(true);
      expect(Array.isArray(tags)).toBe(true);
      for (const tag of tags) expect(REACHABLE_TAGS).toContain(tag);
    }
    // Additive means the seeder merges via set-union, never replaces.
    expect(BACKFILL).toMatch(/new Set\(\[\.\.\./);
    // Insert is guarded by exercise_key existence (idempotent).
    expect(BACKFILL).toMatch(/WHERE exercise_key = /);
  });

  it('EquipmentItem accepts the lacrosse_ball category (blueprint gap #5)', () => {
    expect(EQUIPMENT_MODEL).toMatch(/'lacrosse_ball'/);
  });

  it('a build-time migration delegates to the seeder (Render runs migrations, not seeders)', () => {
    const migration = read('../../migrations/20260707030000-run-ces-coverage-backfill.cjs');
    expect(migration).toMatch(/seeders\/20260707020000-seed-ces-coverage-backfill\.mjs/);
    expect(migration).toMatch(/mod\.default\.up\(queryInterface\)/);
    expect(migration).toMatch(/mod\.default\.down\(queryInterface\)/);
  });
});
