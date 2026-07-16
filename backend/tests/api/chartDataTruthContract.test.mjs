/**
 * chartDataTruthContract — data-truth locks (data-truth sweep 2026-07-15)
 * ======================================================================
 * (1) The muscle-group balance chart mislabeled 'Leg Curl'/'Leg Extension' as
 *     ARMS (the Arms curl/extension branch ran before Legs) — a trainer
 *     reading "is this client neglecting legs?" got a wrong answer. Arms now
 *     excludes leg/hamstring/quad names and Legs matches %leg%.
 * (2) The est-1RM trend chart clamped garbage estimates to a flat 1500 and
 *     plotted it as a real PR — the exact fabrication oneRepMaxService was
 *     rewritten to reject. Over-ceiling sets are now DROPPED, not clamped.
 * (3) The demo seeder that fabricates progress for real clients now refuses
 *     to run in production.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.resolve(here, rel), 'utf8');
const chart = read('../../controllers/chartDataController.mjs');

describe('muscle-group balance no longer mislabels legs as arms', () => {
  // The muscle-group CASE moved to a SHARED classifier (muscleGroupSql.mjs)
  // used by BOTH the balance chart and the strength-profile radar so they
  // can't drift. Assert the chart consumes it + the classifier is correct.
  it('the balance chart uses the shared MUSCLE_GROUP_CASE_SQL classifier', () => {
    expect(chart).toContain("import { MUSCLE_GROUP_CASE_SQL, MUSCLE_GROUP_DISPLAY } from '../services/analytics/muscleGroupSql.mjs'");
    expect(chart).toMatch(/\$\{MUSCLE_GROUP_CASE_SQL\} AS muscle_group/);
  });
  it('the shared classifier orders Legs BEFORE Arms so leg-curl/extension = legs', () => {
    const classifier = read('../../services/analytics/muscleGroupSql.mjs');
    const legsIdx = classifier.indexOf("THEN 'legs'");
    const armsIdx = classifier.indexOf("THEN 'arms'");
    expect(legsIdx).toBeGreaterThan(-1);
    expect(armsIdx).toBeGreaterThan(legsIdx); // legs evaluated first
    // and Back's greedy %lat% was tightened so 'Lateral Raise' != back
    expect(classifier).toContain("ILIKE '%lat pull%'");
  });
});

describe('est-1RM chart drops garbage instead of clamping to 1500', () => {
  it('no LEAST(..., 1500) clamp remains', () => {
    expect(chart).not.toMatch(/LEAST\(MAX\(ROUND\(wl\.weight[\s\S]*?\), 1500\)/);
  });
  it('over-ceiling sets are filtered in the WHERE clause', () => {
    expect(chart).toMatch(/\(wl\.weight \/ \(1\.0278 - 0\.0278 \* wl\.reps\)\) <= 1500/);
  });
});

describe('demo progress seeder is production-guarded', () => {
  it('refuses to fabricate progress when NODE_ENV=production', () => {
    const seeder = read('../../seeders/20250503-seed-client-progress.mjs');
    expect(seeder).toMatch(/process\.env\.NODE_ENV === 'production'[\s\S]{0,200}return;/);
  });
});
