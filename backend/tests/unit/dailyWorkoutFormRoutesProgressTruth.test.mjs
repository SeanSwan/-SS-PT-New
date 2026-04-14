/**
 * dailyWorkoutFormRoutes — progress truth & fallback auth regression
 * ==================================================================
 * Locks two truths on the canonical /dashboard/client/progress/detailed surface:
 *
 *   (1) HIGH-1 — the /progress and /progress-detailed handlers MUST NOT fabricate
 *       NASM category levels. The primary handler previously returned a heuristic
 *       (Math.min(totalWorkouts * 20, 1000)) and the fallback returned pure
 *       hardcoded placeholders (Core 75%, Balance 60%, Strength 80%, Power 40%,
 *       Agility 55%). Both shipped fake data to NASMCategoryRadar on a mounted
 *       canonical surface. The fix is to return empty categories; the frontend
 *       chart is gated on data.length > 0 so the card simply hides.
 *
 *   (2) BLOCKER-1 — the fallback GET /client/:clientId/progress was gated
 *       `trainerOrAdminOnly`, which made the frontend's catch-and-retry path in
 *       ClientProgressCharts.tsx permanently dead for client self-access (403).
 *       The fix is to drop the router-level gate and enforce per-role access
 *       inside the handler (client self, assigned trainer, any admin), mirroring
 *       the /progress-detailed pattern.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dailyWorkoutFormRoutes from '../../routes/dailyWorkoutFormRoutes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROUTE_FILE = resolve(__dirname, '../../routes/dailyWorkoutFormRoutes.mjs');
const source = readFileSync(ROUTE_FILE, 'utf8');

/**
 * Find the router layer for a given method + path literal.
 * Express stores routes on layer.route; each has a methods map and a stack
 * of middleware layers whose .name is the function name at declaration.
 */
function findLayer(method, path) {
  return dailyWorkoutFormRoutes.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === path &&
      layer.route.methods &&
      layer.route.methods[method.toLowerCase()]
  );
}

function middlewareNames(layer) {
  return layer.route.stack.map((l) => l.name);
}

describe('dailyWorkoutFormRoutes — progress truth (HIGH-1)', () => {
  it('primary /progress-detailed handler does NOT fabricate NASM category levels from workout counts', () => {
    // The fabricated heuristic baked strength/core category progress as
    // (totalWorkouts * 20) and (totalWorkouts * 15), clamped at 1000. These
    // specific expressions are forbidden on the canonical surface.
    expect(source).not.toMatch(/Math\.min\s*\(\s*totalWorkouts\s*\*\s*20/);
    expect(source).not.toMatch(/Math\.min\s*\(\s*totalWorkouts\s*\*\s*15/);
  });

  it('fallback /progress handler does NOT fabricate hardcoded NASM category percentages', () => {
    // The fallback literally shipped { level: 750, percentComplete: 75 },
    // { level: 600, ... 60 }, { level: 800, ... 80 }, etc. Any reappearance
    // of that exact literal shape on Core/Balance/Strength/Power/Agility is a
    // regression onto a mounted canonical surface.
    const forbiddenLiteral =
      /'Core Stability'[^}]*level:\s*750|'Balance'[^}]*level:\s*600|'Strength'[^}]*level:\s*800|'Power'[^}]*level:\s*400|'Agility'[^}]*level:\s*550/;
    expect(source).not.toMatch(forbiddenLiteral);
  });

  it('neither handler invents a "Mock NASM categories" comment either', () => {
    // Lock against a softer regression: someone deletes the literal but leaves
    // the "Mock NASM categories" comment as a TODO that silently grows hardcoded
    // data back again.
    expect(source).not.toMatch(/Mock NASM categories/i);
  });
});

describe('dailyWorkoutFormRoutes — hidden-chart wireup (Phase 3 completeness audit)', () => {
  // Phase 3 audit 2026-04-13: the /progress-detailed handler historically
  // shipped only 9 keys, leaving RPE Distribution, Personal Records, Exercise
  // Frequency, and Session Intensity charts silently hidden on the mounted
  // canonical surface. Writer-schema cross-check proved all four are
  // derivable from persisted fields: set.rpe, set.weight, set.reps,
  // exerciseName, formData.overallIntensity, formData.estimatedDuration.
  // Rest Compliance remains structurally unmeasurable — ExerciseSet has
  // restTime (goal) but no restTaken (actual) — and must NOT be faked.

  it('/progress-detailed response ships rpeDistribution', () => {
    // Narrow positive lock: the response-builder block must include the key.
    expect(source).toMatch(/progressData\s*=\s*\{[\s\S]{0,1200}rpeDistribution[\s\S]{0,1200}summary/);
  });

  it('/progress-detailed response ships personalRecords', () => {
    expect(source).toMatch(/progressData\s*=\s*\{[\s\S]{0,1200}personalRecords[\s\S]{0,1200}summary/);
  });

  it('/progress-detailed response ships exerciseFrequency as an array key', () => {
    expect(source).toMatch(/progressData\s*=\s*\{[\s\S]{0,1200}exerciseFrequency[\s\S]{0,1200}summary/);
  });

  it('/progress-detailed response ships sessionIntensity', () => {
    expect(source).toMatch(/progressData\s*=\s*\{[\s\S]{0,1200}sessionIntensity[\s\S]{0,1200}summary/);
  });

  it('/progress-detailed does NOT ship restCompliance (structurally unmeasurable)', () => {
    // Negative lock: ExerciseSet has no restTaken field, so rest compliance
    // cannot be computed truthfully. Any re-introduction of this key must be
    // accompanied by a writer-side schema change audit.
    expect(source).not.toMatch(/restCompliance\s*:/);
  });

  it('RPE distribution aggregation reads set.rpe per set', () => {
    // Positive lock: the zone-counting logic must bucket real persisted rpe
    // values, not default 5s.
    expect(source).toMatch(/set\.rpe|parseInt\(set\.rpe/);
  });

  it('Personal records filter zero-weight entries to avoid bodyweight 1RM fabrication', () => {
    // Positive lock: Epley on w=0 returns 0 estimated 1RM. Shipping those
    // would produce meaningless "PR: 0 lbs" rows. The fix must gate on w > 0.
    expect(source).toMatch(/w\s*>\s*0\s*&&\s*rm\s*>\s*0|weight\s*>\s*0[\s\S]{0,200}estimated1RM/);
  });
});

describe('dailyWorkoutFormRoutes — fallback auth (BLOCKER-1)', () => {
  it('GET /client/:clientId/progress layer is mounted', () => {
    const layer = findLayer('get', '/client/:clientId/progress');
    expect(layer).toBeTruthy();
  });

  it('GET /client/:clientId/progress requires `protect` (auth) but NOT `trainerOrAdminOnly`', () => {
    const layer = findLayer('get', '/client/:clientId/progress');
    const names = middlewareNames(layer);
    // protect must still be present — unauthenticated callers stay out
    expect(names).toContain('protect');
    // trainerOrAdminOnly must NOT be router-level — it made client self-access
    // impossible on the fallback path the frontend catch-retry depends on
    expect(names).not.toContain('trainerOrAdminOnly');
  });

  it('GET /client/:clientId/progress-detailed remains `protect`-only at router level', () => {
    // Sibling sanity — the primary path's auth shape is unchanged
    const layer = findLayer('get', '/client/:clientId/progress-detailed');
    expect(layer).toBeTruthy();
    const names = middlewareNames(layer);
    expect(names).toContain('protect');
    expect(names).not.toContain('trainerOrAdminOnly');
  });

  it('POST / (form submission) still requires `trainerOrAdminOnly` — writers are unchanged', () => {
    // Anti-regression: the fix must be scoped to the read path. Writes must
    // remain trainer/admin gated so clients cannot forge their own workout logs.
    const layer = findLayer('post', '/');
    expect(layer).toBeTruthy();
    const names = middlewareNames(layer);
    expect(names).toContain('protect');
    expect(names).toContain('trainerOrAdminOnly');
  });
});

describe('dailyWorkoutFormRoutes — muscleGroup bucketing truth (Phase 2 writer-chain audit)', () => {
  // Phase 2 audit 2026-04-13: proved the writer chain never persists
  // muscleGroup / category / exerciseType on ExerciseEntry objects. The
  // canonical ExerciseEntry type at frontend/src/services/nasmApiService.ts
  // has only { exerciseId, exerciseName, sets, formRating, painLevel,
  // performanceNotes }, and every WorkoutLogger handler strips classification
  // metadata when it builds an entry. The backend's muscleGroupVolume reducer
  // previously defaulted unclassified exercises to a single "Uncategorized"
  // bucket, so the mounted MuscleGroupRadar chart always rendered exactly one
  // blob labelled "Uncategorized" — a truthfulness drift on the canonical
  // /progress/detailed surface. The fix is to skip exercises without real
  // classification so muscleGroupVolume returns [] and the frontend hides
  // the chart via its existing data.length > 0 gate.
  it('/progress-detailed muscleGroupVolume reducer does NOT fabricate an "Uncategorized" bucket', () => {
    expect(source).not.toMatch(/\|\|\s*['"]Uncategorized['"]/);
  });

  it('/progress-detailed muscleGroupVolume reducer still reads the three real classification keys', () => {
    // Positive lock: once the writer chain starts persisting these keys, the
    // chart must light up without a second code change.
    expect(source).toMatch(/ex\.muscleGroup\s*\|\|\s*ex\.category\s*\|\|\s*ex\.exerciseType/);
  });
});

describe('dailyWorkoutFormRoutes — writer-default-value defensive locks (Phase 5 UX audit)', () => {
  // Phase 5 audit 2026-04-13: WorkoutLogger.tsx seeds neutral defaults
  // (formRating=3 at lines 173/223/266/406/435, set.rpe=5 in createEmptySet
  // at :423, overallIntensity=5 in state init at :112) and handleSubmit at
  // :514-548 does not enforce explicit slider interaction before submitting.
  // A trainer who logs a workout without touching the sliders persists
  // neutral defaults that render as flat/centered chart output on Form
  // Quality, RPE Distribution, and Session Intensity.
  //
  // The truthful fix is writer-side: change defaults to null/undefined and
  // gate submit on explicit input. That fix requires touching WorkoutLogger
  // .tsx (currently dirty with unrelated carryover) and is recommended as a
  // separate slice. These tests lock the EXISTING null-safe behavior of the
  // backend reducers so the writer-side fix can land without read-chain
  // adjustments.

  it('formTrends reducer uses a truthy filter on ex.formRating — handles null/undefined safely', () => {
    // The current filter is `exercises.filter(ex => ex.formRating)` which
    // drops 0/null/undefined and keeps 1-5. When the writer-side fix changes
    // the default from `3` to `null`, untouched exercises will be filtered
    // out automatically and the chart will only average over real ratings.
    expect(source).toMatch(/exercises\.filter\(\s*ex\s*=>\s*ex\.formRating\s*\)/);
  });

  it('RPE bucketing guards on Number.isFinite + 1..10 range — handles null/undefined safely', () => {
    // The current guard is `Number.isFinite(rpeVal) && rpeVal >= 1 && rpeVal <= 10`.
    // parseInt(null) and parseInt(undefined) both return NaN, which fails
    // Number.isFinite, so untouched sets will be silently skipped after the
    // writer-side fix flips the default to null.
    expect(source).toMatch(
      /Number\.isFinite\(rpeVal\)\s*&&\s*rpeVal\s*>=\s*1\s*&&\s*rpeVal\s*<=\s*10/
    );
  });

  it('sessionIntensity reducer reads form.formData?.overallIntensity with a defensive coercion', () => {
    // Today the reducer ships `intensity: form.formData?.overallIntensity || 0`.
    // Once the writer-side fix flips overallIntensity default to null, this
    // coercion will produce 0-intensity entries — a follow-up read-chain fix
    // must add `.filter(s => s.intensity > 0)` before shipping. Lock the
    // current shape so the follow-up is forced through review.
    expect(source).toMatch(
      /intensity:\s*form\.formData\?\.overallIntensity\s*\|\|\s*0/
    );
  });

  it('rpeDistribution reducer iterates set.rpe (not session-level intensity)', () => {
    // Anti-regression: a future "simplification" that swaps per-set rpe for
    // per-form overallIntensity would change the chart's semantics from
    // "RPE distribution across all sets" to "RPE distribution across
    // sessions" — wrong. Lock the per-set iteration shape.
    expect(source).toMatch(/parseInt\(set\.rpe,\s*10\)/);
  });
});

describe('dailyWorkoutFormRoutes — fallback handler per-role access (BLOCKER-1, source-level)', () => {
  // The handler body must enforce what the router-level middleware used to:
  //   - client role → only self (requestingUserId === parsedClientId)
  //   - trainer role → only assigned clients (ClientTrainerAssignment lookup)
  //   - admin → passthrough
  //
  // The authoritative check is the /progress-detailed handler at lines 1001-1015.
  // The /progress fallback must mirror that shape. We assert the three branches
  // are present in the file by pattern.
  it('fallback handler rejects non-self client access with 403', () => {
    expect(source).toMatch(
      /requestingUserRole === 'client'[\s\S]{0,300}Clients can only view their own progress/
    );
  });

  it('fallback handler keeps the assigned-trainer ClientTrainerAssignment lookup', () => {
    expect(source).toMatch(/ClientTrainerAssignment[\s\S]{0,400}You are not assigned to this client/);
  });
});
