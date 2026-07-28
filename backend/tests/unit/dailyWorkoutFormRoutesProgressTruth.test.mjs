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

  it('POST / (form submission) requires `protect` but NOT `trainerOrAdminOnly` — client self-log is supported', () => {
    // Phase 16.2 round 4 fix (2026-04-18): the docstring at
    // dailyWorkoutFormRoutes.mjs:378 has always claimed this route supports
    // "Trainer, Admin, or Client (self only)", but the previous middleware
    // chain included `trainerOrAdminOnly`, which 403'd clients BEFORE the
    // handler's self-check could run. The canonical client self-log route
    // `/dashboard/client/log-workout` hit this on every save attempt.
    //
    // The fix is to drop the outer role gate. `checkTrainerClientRelationship`
    // is role-aware (authMiddleware.mjs:614+): admins pass, clients accessing
    // their own id pass, trainers must have an active
    // ClientTrainerAssignment. The handler also enforces client-self at
    // dailyWorkoutFormRoutes.mjs:414 and trainer edit_workouts permission at
    // dailyWorkoutFormRoutes.mjs:423-434 — so forging a peer's workout log
    // from a client session remains impossible.
    const layer = findLayer('post', '/');
    expect(layer).toBeTruthy();
    const names = middlewareNames(layer);
    expect(names).toContain('protect');
    expect(names).toContain('checkTrainerClientRelationship');
    expect(names).not.toContain('trainerOrAdminOnly');
  });

  it('POST / handler treats member-role users as self-log workout actors', () => {
    expect(source).toMatch(/SELF_LOG_WORKOUT_ROLES|isWorkoutSelfLogRole/);
    expect(source).toMatch(/['"]user['"]/);
  });

  it('POST / handler body still enforces client-self and trainer-permission checks (defense-in-depth)', () => {
    // Source-level lock: even though the outer `trainerOrAdminOnly` is gone,
    // the handler body MUST keep the in-handler client-self check and the
    // trainer edit_workouts permission check. Removing either would
    // re-enable the "clients forge peer logs" class of regression.
    //
    // Phase 16.2 round 5 update: the client-self check now compares numbers
    // on both sides (parsedClientId vs userNumericId). Previously
    // loose parsing compared number !== string and
    // was always true — every client save was silently 403'd by the inline
    // check even when the middleware allowed the request through.
    expect(source).toMatch(
      /isWorkoutSelfLogRole\(userRole\) && parsedClientId !== userNumericId[\s\S]{0,300}Clients can only log their own workouts/
    );
    expect(source).toMatch(
      /userRole === 'trainer'[\s\S]{0,400}checkTrainerPermission\s*\(\s*trainerId\s*,\s*PERMISSION_TYPES\.EDIT_WORKOUTS\s*\)/
    );
  });

  it('POST / handler coerces req.user.id to a number once at handler entry (Phase 16.2 round 5)', () => {
    // Anti-regression lock for the string/number drift that blocked the
    // canonical client self-log. `protect` may store req.user.id as a string,
    // and downstream code compares it against the parsed target client id.
    // The handler MUST derive `userNumericId` once at the top so every
    // comparison/Sequelize lookup uses the numeric form.
    expect(source).toMatch(
      /const\s+userNumericId\s*=\s*parseStrictPositiveInteger\(\s*req\.user\.id\s*\)\s*;/
    );
    expect(source).toMatch(
      /const\s+parsedClientId\s*=\s*parseStrictPositiveInteger\(\s*clientId\s*\)\s*;/
    );
    // trainerId used for permission checks and Sequelize lookups must be
    // the numeric form too.
    expect(source).toMatch(
      /const\s+trainerId\s*=\s*userNumericId\s*;/
    );
  });
});

describe('dailyWorkoutFormRoutes - paid-session deduction concurrency guard', () => {
  const postHandlerSlice = source.slice(
    source.indexOf("router.post('/', protect"),
    source.indexOf("router.get('/', protect"),
  );

  it('row-locks the client before reading availableSessions for billing decisions', () => {
    const clientLoadIdx = postHandlerSlice.indexOf('User.findByPk(parsedClientId');
    const decisionIdx = postHandlerSlice.indexOf('buildWorkoutSessionBillingDecision(client');

    expect(clientLoadIdx).toBeGreaterThan(-1);
    expect(decisionIdx).toBeGreaterThan(clientLoadIdx);
    expect(postHandlerSlice).toMatch(
      /User\.findByPk\(parsedClientId,\s*\{[\s\S]{0,160}transaction[\s\S]{0,160}lock:\s*transaction\.LOCK\.UPDATE/,
    );
  });

  it('row-locks linked scheduled sessions before reading sessionDeducted', () => {
    const scheduledLoadIdx = postHandlerSlice.indexOf('Session.findByPk(parsedScheduledSessionId');
    const decisionIdx = postHandlerSlice.indexOf('scheduledSessionAlreadyDeducted');

    expect(scheduledLoadIdx).toBeGreaterThan(-1);
    expect(decisionIdx).toBeGreaterThan(scheduledLoadIdx);
    expect(postHandlerSlice).toMatch(
      /Session\.findByPk\(parsedScheduledSessionId,\s*\{[\s\S]{0,160}transaction[\s\S]{0,160}lock:\s*transaction\.LOCK\.UPDATE/,
    );
  });
});

describe('dailyWorkoutFormRoutes — client self-log trainerId attribution (Phase 16.2 round 9)', () => {
  // For client self-log, the actor (req.user.id) IS the client — so
  // stamping `trainerId: userNumericId` on the DailyWorkoutForm creates
  // a row where clientId === trainerId, which the model's
  // `clientTrainerDifferent` validator (DailyWorkoutForm.mjs:349-353)
  // rejects with "Client and trainer must be different users".
  //
  // Fix: derive `attributedTrainerId` separately from the actor. For
  // client self-log, look up the client's active ClientTrainerAssignment
  // and use its trainerId; fall back to the lowest-id admin if no
  // assignment exists.

  it('derives attributedTrainerId separately from the actor trainerId', () => {
    expect(source).toMatch(
      /let\s+attributedTrainerId\s*=\s*trainerId\s*;/,
    );
  });

  it('branches on same-user self-log actors to look up an active assignment', () => {
    // Admin/trainer personal logging uses forceSelfMode on the frontend,
    // so the backend must treat parsedClientId === actor id as self-log
    // for trainer attribution. The client/user guard above still keeps
    // member self-log limited to their own account.
    const idx = source.indexOf('let attributedTrainerId');
    expect(idx).toBeGreaterThan(-1);
    const slice = source.slice(idx, idx + 2200);
    expect(slice).toMatch(/const\s+isSelfWorkoutLogActor\s*=\s*isWorkoutSelfLogRole\(userRole\)\s*\|\|\s*parsedClientId\s*===\s*userNumericId/);
    expect(slice).toMatch(/if\s*\(\s*isSelfWorkoutLogActor\s*\)/);
    expect(slice).toMatch(/ClientTrainerAssignment[\s\S]{0,300}findOne/);
    expect(slice).toMatch(/status:\s*['"]active['"]/);
  });

  it('falls back to the lowest-id admin when no active assignment exists', () => {
    const idx = source.indexOf('let attributedTrainerId');
    const slice = source.slice(idx, idx + 2000);
    expect(slice).toMatch(
      /User\.findOne\(\s*\{[\s\S]{0,200}role:\s*['"]admin['"][\s\S]{0,300}order:\s*\[\s*\[\s*['"]id['"]\s*,\s*['"]ASC['"]\s*\]/,
    );
  });

  it('guards the admin fallback against the self-fallback edge case', () => {
    // If for any reason the only admin user IS the actor (e.g. an admin
    // logging their own "client-role" workout via some migration path),
    // the fallback must not re-introduce the same-user bug.
    const idx = source.indexOf('let attributedTrainerId');
    const slice = source.slice(idx, idx + 2000);
    expect(slice).toMatch(/fallbackAdmin[\s\S]{0,200}=== userNumericId/);
  });

  it('also guards the assignment path from re-stamping the actor', () => {
    // Defense-in-depth: if an assignment row somehow has trainerId === clientId
    // (corrupt data), we must NOT use it.
    const idx = source.indexOf('let attributedTrainerId');
    const slice = source.slice(idx, idx + 2000);
    expect(slice).toMatch(/assignment\?\.trainerId[\s\S]{0,100}!==\s*userNumericId/);
  });

  it('DailyWorkoutForm.create uses attributedTrainerId for the trainerId column', () => {
    // The canonical DB write must use the derived attribution id, not
    // the actor id. This is the specific call site that threw the
    // validation error in round 9.
    const createIdx = source.indexOf('DailyWorkoutForm.create({');
    expect(createIdx).toBeGreaterThan(-1);
    const slice = source.slice(createIdx, createIdx + 600);
    expect(slice).toMatch(/trainerId:\s*attributedTrainerId/);
    // And it must NOT use the bare `trainerId` shorthand (which would be
    // the actor id — the bug we're locking out).
    expect(slice).not.toMatch(/\btrainerId\s*,\s*$|\btrainerId\s*,\s*\n\s*date/);
  });
});

describe('dailyWorkoutFormRoutes — ESM runtime hygiene (Phase 16.2 round 8)', () => {
  // The canonical POST /api/workout-forms save path ran `require('crypto')
  // .randomUUID()` inline when creating a new WorkoutSession. In an .mjs
  // module `require` is not defined, so every client self-log save that
  // reached the WorkoutSession.findOrCreate step 500'd with
  // `require is not defined` AFTER auth, middleware, Phase 16.2 schema
  // migration, and timestamp mapping were all clean. The fix was to
  // import `randomUUID` from `node:crypto` at module top and call it
  // directly.
  it('does not call CJS require() anywhere in this ESM route file', () => {
    // Allow `require` inside comments (the fix docstring explains the
    // previous bug). Strip comments before scanning.
    const stripComments = (src) => src
      .replace(/\/\*[\s\S]*?\*\//g, '')     // block comments
      .replace(/^[^\n]*\/\/[^\n]*$/gm, ''); // line comments (conservative)
    const codeOnly = stripComments(source);
    expect(codeOnly).not.toMatch(/\brequire\s*\(/);
  });

  it('imports randomUUID from node:crypto at the top of the file', () => {
    // Positive lock on the ESM replacement. If a future refactor removes
    // this import but re-introduces a bare require() somewhere, the test
    // above catches the require; this test catches the missing import.
    expect(source).toMatch(
      /^import\s*\{\s*randomUUID\s*\}\s*from\s*['"]node:crypto['"];?$/m,
    );
  });

  it('WorkoutSession.findOrCreate defaults use randomUUID() directly, not require', () => {
    // Narrow lock on the specific call site that broke the save path.
    // Positive lock looks in a wide window so we tolerate future formatting
    // changes. Negative lock strips comments first so the fix-docstring
    // (which references the old `require('crypto')` shape as context)
    // doesn't trip a false positive.
    const idx = source.indexOf('WorkoutSession.findOrCreate');
    expect(idx).toBeGreaterThan(-1);
    const slice = source.slice(idx, idx + 2000);
    expect(slice).toMatch(/\bid:\s*randomUUID\(\)/);

    const codeOnly = slice
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(codeOnly).not.toMatch(/require\(\s*['"]crypto['"]\s*\)/);
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

  it('formTrends reducer averages only positive numeric ratings and ships real set counts', () => {
    // The reducer coerces each rating to Number and keeps only positive
    // finite values. Invalid/null ratings must not become neutral 3/5 data,
    // and set counts must come from the persisted exercises, not estimates.
    expect(source).toMatch(
      /\.map\(ex\s*=>\s*Number\(ex\.formRating\)\)\s*[\r\n\s]*\.filter\(rating\s*=>\s*Number\.isFinite\(rating\)\s*&&\s*rating\s*>\s*0\)/
    );
    expect(source).toMatch(/totalSets:\s*form\.getTotalSets\(\)/);
    expect(source).toMatch(
      /totalSets:\s*exercises\.reduce\(\(sum,\s*ex\)\s*=>\s*sum\s*\+\s*\(\(ex\.sets\s*\|\|\s*\[\]\)\.length\),\s*0\)/
    );
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

  it('sessionIntensity reducer is now null-honest (Phase 16, 2026-04-16)', () => {
    // Phase 16 update: the reducer previously shipped
    // `intensity: form.formData?.overallIntensity || 0`, which would
    // zero-fill nulls once the writer flipped to null-honest. The
    // Phase 16 fix added a guarded coercion instead:
    //   const rawIntensity = form.formData?.overallIntensity;
    //   const intensity = (raw === undefined || raw === null) ? null : raw;
    // Lock the new shape: no `|| 0` fallback on this reader, and
    // explicit null propagation via the rawIntensity variable.
    expect(source).not.toMatch(
      /intensity:\s*form\.formData\?\.overallIntensity\s*\|\|\s*0/
    );
    // Locate the sessionIntensity reducer block and assert the new
    // guarded pattern lives inside.
    const sessionIntensityIdx = source.indexOf('sessionIntensity = forms.map');
    expect(sessionIntensityIdx).toBeGreaterThan(0);
    const sliceEnd = source.indexOf('Build response', sessionIntensityIdx);
    const slice = source.slice(sessionIntensityIdx, sliceEnd);
    expect(slice).toMatch(/rawIntensity/);
    expect(slice).toMatch(/=== undefined/);
    expect(slice).toMatch(/=== null/);
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

describe('dailyWorkoutFormRoutes - progress-detailed access guard (Slice 232)', () => {
  const progressDetailedSlice = source.slice(
    source.indexOf("router.get('/client/:clientId/progress-detailed'"),
    source.indexOf("router.post('/:id/reprocess'")
  );

  it('coerces req.user.id before client self-access comparison', () => {
    expect(source).toContain('const parseStrictPositiveInteger = (value) => {');
    expect(progressDetailedSlice).toContain('const requestingUserId = parseStrictPositiveInteger(req.user.id);');
    expect(progressDetailedSlice).toContain('requestingUserId !== parsedClientId');
    expect(progressDetailedSlice).not.toContain('const requestingUserId = req.user.id;');
    expect(progressDetailedSlice).not.toContain('const requestingUserId = Number.parseInt(req.user.id, 10);');
  });

  it('rejects unsupported authenticated roles instead of falling through as admin', () => {
    expect(progressDetailedSlice).toMatch(/else if \(requestingUserRole !== 'admin'\)[\s\S]{0,120}Access denied/);
  });

  it('rejects malformed requester and client IDs before model reads', () => {
    expect(progressDetailedSlice).toContain('const parsedClientId = parseStrictPositiveInteger(clientId);');
    expect(progressDetailedSlice).toContain('if (!Number.isInteger(parsedClientId) || parsedClientId <= 0)');
    expect(progressDetailedSlice).toContain('if (!Number.isInteger(requestingUserId) || requestingUserId <= 0)');
    expect(source).toContain("if (typeof value !== 'string' || !/^\\d+$/.test(value.trim())) {");
  });

  it('merges canonical WorkoutLog rows before legacy formData drives chart reducers', () => {
    expect(source).toContain('fetchCanonicalProgressWorkoutSessions');
    expect(progressDetailedSlice).toContain("attributes: ['id', 'sessionId', 'date', 'formData'");
    expect(progressDetailedSlice).toContain(
      'forms = buildProgressDetailedAnalysisRows({ forms, workoutSessions: canonicalWorkoutSessions });'
    );
    const mergeIdx = progressDetailedSlice.indexOf('buildProgressDetailedAnalysisRows');
    const volumeIdx = progressDetailedSlice.indexOf('const volumeProgression = forms.map');
    expect(mergeIdx).toBeGreaterThan(-1);
    expect(volumeIdx).toBeGreaterThan(mergeIdx);
  });
});

