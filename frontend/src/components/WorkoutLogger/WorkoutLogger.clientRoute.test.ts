/**
 * Phase 16.2 (2026-04-17) - WorkoutLogger client-self-route wiring tests
 * ========================================================================
 * Before 2026-04-17 the `/dashboard/client/log-workout` route mounted
 * `<WorkoutLogger />` via UniversalDashboardLayout's role router, which
 * passes no props. The component declared `clientId: number` required,
 * so on that route:
 *   - `Client #undefined` rendered in the header
 *   - `GET /api/workout-forms/client/undefined/info` returned 403
 *   - `GET /api/exercises/all` returned 403 (trainer/admin gated)
 *   - `GET /api/equipment-profiles` returned 403 (admin/trainer gated)
 *   - no honest workout could be saved
 *
 * The 2026-04-17 fix makes `clientId` optional, resolves an
 * `effectiveClientId` from the authenticated session for client users,
 * routes the client-info fetch through `/api/workout-forms/my/info`
 * when in self-mode, swaps the exercise source to `/api/exercises/library`
 * (a new client-safe endpoint), and hides the EquipmentProfilePicker
 * on the client self-route so clients do not hit the trainer/admin
 * equipment endpoint.
 *
 * This test file is a **source-text lock** - it does not mount the
 * full 1000-line WorkoutLogger (heavy auth / provider / hook stack).
 * Instead it asserts the specific regression-class patterns that broke
 * smoke live: the deleted `Client #undefined` pathway, the trainer-only
 * endpoint calls, and the equipment mount condition.
 *
 * Phase 16 / 16.1-UX behavior is proven preserved by the other tests
 * in this directory continuing to pass.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Slice D1 decomposition: the AI-events cluster now lives in useWorkoutAiEvents.ts;
// these locks cover the logger + that hook as one contract surface.
const RAW_SOURCE = readFileSync(
  resolve(__dirname, './WorkoutLogger.tsx'),
  'utf8',
) + readFileSync(
  resolve(__dirname, './useWorkoutAiEvents.ts'),
  'utf8',
) + readFileSync(
  resolve(__dirname, './useWorkoutSubmit.ts'),
  'utf8',
) + readFileSync(
  resolve(__dirname, './useWorkoutPlanLoading.ts'),
  'utf8',
);
const LOCAL_TYPES_SOURCE = readFileSync(
  resolve(__dirname, './WorkoutLogger.localTypes.ts'),
  'utf8',
);
const EXERCISE_SEARCH_SOURCE = readFileSync(
  resolve(__dirname, './useExerciseSearch.ts'),
  'utf8',
);
const SUBMIT_RECEIPT_SOURCE = readFileSync(
  resolve(__dirname, './WorkoutLogger.submitReceipt.ts'),
  'utf8',
);
const EXERCISE_ROUTES_SOURCE = readFileSync(
  resolve(__dirname, '../../../../backend/routes/exerciseRoutes.mjs'),
  'utf8',
);
const DASHBOARD_ROUTE_COMPONENTS_SOURCE = readFileSync(
  resolve(__dirname, '../DashBoard/UniversalDashboardLayout.routeComponents.tsx'),
  'utf8',
);
const DASHBOARD_ROUTES_SOURCE = readFileSync(
  resolve(__dirname, '../DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const SOURCE = stripComments(RAW_SOURCE);
const LOCAL_TYPES = stripComments(LOCAL_TYPES_SOURCE);
const EXERCISE_SEARCH = stripComments(EXERCISE_SEARCH_SOURCE);

// -----------------------------------------------------------------------------
// clientId prop: now optional + effectiveClientId resolution
// -----------------------------------------------------------------------------

describe('Phase 16.2 - WorkoutLogger clientId prop is optional', () => {
  it('declares clientId as optional on WorkoutLoggerProps', () => {
    // The old type `clientId: number` broke the self-route mount
    // because UniversalDashboardLayout passes no props to role-routed
    // components. `clientId?: number` + session-derived fallback is
    // the new contract.
    expect(LOCAL_TYPES).toMatch(/clientId\?\s*:\s*number\s*;/);
    expect(LOCAL_TYPES).not.toMatch(/clientId\s*:\s*number\s*;/);
  });

  it('also allows onComplete and onCancel to be optional for the role-router mount', () => {
    expect(LOCAL_TYPES).toMatch(/onComplete\?\s*:/);
    expect(LOCAL_TYPES).toMatch(/onCancel\?\s*:/);
  });

  it('accepts and uses schedule-origin dates instead of hardcoding today', () => {
    expect(LOCAL_TYPES).toMatch(/scheduledSessionDate\?\s*:\s*string\s*\|\s*null\s*;/);
    expect(SOURCE).toMatch(/const workoutDateValue = scheduledSessionDate/);
    expect(SOURCE).toMatch(/date: workoutDateValue/);
    expect(SOURCE).toMatch(/workoutDate=\{workoutDateValue\}/);
  });

  it('declares forceSelfMode for admin/owner personal workout logging', () => {
    expect(LOCAL_TYPES).toMatch(/forceSelfMode\?\s*:\s*boolean\s*;/);
  });

  it('mounts the schedule-origin billing notice from the shared logger surface', () => {
    expect(SOURCE).toMatch(/ShellNotices/);
    expect(SOURCE).toMatch(/scheduledSessionId=\{scheduledSessionId\}/);
    expect(SOURCE).toMatch(/scheduledSessionCreditHint=\{scheduledSessionCreditHint\}/);
    expect(SOURCE).toMatch(/scheduledSessionDate=\{scheduledSessionDate\}/);
    expect(SOURCE).toMatch(/clientSource=\{client\.clientSource\}/);
  });

  it('resolvedOnComplete default navigates to a real client route (not a silent no-op)', () => {
    // Codex round 2 regression: the earlier draft set
    // `resolvedOnComplete = onComplete ?? (() => { /* no-op */ })`
    // which meant a successful save on the self-route left the user
    // on the logger page with no feedback. Lock that the default path
    // invokes `navigate(` with a canonical client route.
    const idx = SOURCE.indexOf('resolvedOnComplete');
    expect(idx).toBeGreaterThan(-1);
    const slice = SOURCE.slice(idx, idx + 500);
    expect(slice).toMatch(/onComplete\s*\?\?\s*\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?navigate\s*\(/);
    expect(slice).toMatch(/\/dashboard\/client\//);
  });

  it('resolvedOnCancel default navigates to a real client route (not a silent no-op)', () => {
    const idx = SOURCE.indexOf('resolvedOnCancel');
    expect(idx).toBeGreaterThan(-1);
    const slice = SOURCE.slice(idx, idx + 500);
    expect(slice).toMatch(
      /useCallback\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?if\s*\(\s*onCancel\s*\)[\s\S]*?onCancel\(\)[\s\S]*?navigate\s*\(/
    );
    expect(slice).toMatch(/\/dashboard\/client\//);
  });

  it('ANTI-REGRESSION: no silent no-op default callback for Save or Cancel on the self-route', () => {
    // Explicitly ban the exact pattern that regressed the self-route
    // UX: `() => { /* self-route: no-op */ }` and similar tautological
    // arrow functions. The default must call navigate() or equivalent.
    expect(SOURCE).not.toMatch(/self-route:\s*no-op/);
    // Bare `() => {}` or `() => { /* ... */ }` attached to the default
    // for onComplete / onCancel is also banned.
    const idxC = SOURCE.indexOf('resolvedOnComplete');
    const idxX = SOURCE.indexOf('resolvedOnCancel');
    for (const start of [idxC, idxX]) {
      const s = SOURCE.slice(start, start + 300);
      // No empty-body arrow - body must contain `navigate(`.
      expect(s).toMatch(/navigate\s*\(/);
    }
  });

  it('WorkoutLoggerFooter receives the guarded cancel handler (not the raw optional prop)', () => {
    // The footer is the surface where these handlers actually fire.
    // The earlier draft passed `onCancel={onCancel}` (raw undefined
    // on self-route). The current handler confirms unsaved work before
    // delegating to the resolved route-aware cancel callback.
    expect(SOURCE).toMatch(/const\s+handleCancel\s*=\s*useCallback/);
    expect(SOURCE).toMatch(/<WorkoutLoggerFooter[\s\S]*?onCancel=\{handleCancel\}/);
  });

  it('confirms before discarding unsaved workout entries on cancel', () => {
    const idx = SOURCE.indexOf('const handleCancel');
    expect(idx).toBeGreaterThan(-1);
    const slice = SOURCE.slice(idx, idx + 650);
    expect(slice).toMatch(/hasUnsavedWorkout/);
    expect(slice).toMatch(/!submittedFormId/);
    expect(slice).toMatch(/setConfirmRequest\s*\(/);
    expect(slice).toMatch(/Discard unsaved workout/);
    expect(slice).toMatch(/onConfirm:\s*resolvedOnCancel/);
    expect(slice).toMatch(/resolvedOnCancel\s*\(\s*\)/);
    expect(SOURCE).toMatch(/<WorkoutLoggerConfirmDialog[\s\S]*?request=\{confirmRequest\}/);
  });

  it('self-route success path uses resolvedOnComplete, not the raw optional onComplete', () => {
    // handleSubmit's response-success block calls the resolved handler
    // so the default navigation fires on self-route. If a future edit
    // reverts to raw `onComplete(response.data)`, the self-route would
    // silently swallow success again.
    // Phase 2.1a: onComplete is deferred behind the SaveSuccessPanel's Done
    // action — the success handler stores the response; the panel invokes
    // resolvedOnComplete(lastSaveResponse) so every mount still navigates.
    expect(SOURCE).toMatch(/setLastSaveResponse\s*\(\s*response\.data\s*\)/);
    expect(SOURCE).toMatch(/onDone=\{\(\) => resolvedOnComplete\(lastSaveResponse\)\}/);
  });

  it('requires a saved workout form id before generating and sending a summary', () => {
    const idx = SOURCE.indexOf('const handleGenerateSummary');
    expect(idx).toBeGreaterThan(-1);
    const slice = SOURCE.slice(idx, idx + 700);
    expect(slice).toMatch(/if\s*\(\s*!submittedFormId\s*\)/);
    expect(slice).toMatch(/Complete and save the workout before sending a summary/);
    expect(slice).toMatch(/formId:\s*submittedFormId/);
  });

  it('uses neutral fallback success copy when the backend omits a billing message', () => {
    expect(SOURCE).not.toMatch(/Session deducted and points earned/);
    expect(SOURCE).toMatch(/buildWorkoutSubmitSuccessMessage\(response\.data, response\.message\)/);
    expect(SUBMIT_RECEIPT_SOURCE).toMatch(/Workout logged successfully! Progress updated\./);
  });

  it('resolves an effectiveClientId from prop OR authenticated self-mode session', () => {
    const declIdx = SOURCE.indexOf('effectiveClientId');
    expect(declIdx).toBeGreaterThan(-1);
    expect(SOURCE).toMatch(/const\s+allowSelfMode\s*=\s*isSelfLoggingDashboardRole\(user\?\.role\)\s*\|\|\s*forceSelfMode/);
    const body = SOURCE.slice(declIdx, declIdx + 500);
    expect(body).toMatch(/typeof\s+clientId\s*===\s*['"]number['"]/);
    expect(body).toMatch(/allowSelfMode\s*\?\s*userNumericId\s*:\s*undefined/);
  });

  it('coerces user.id to a numeric id (AuthContext types it as string)', () => {
    // AuthContextProvider.tsx types User.id as string, but
    // effectiveClientId is number-typed and all downstream URLs/hooks
    // expect numbers. Lock that the coercion exists - via an explicit
    // helper (coerceToNumericId), Number.isFinite, or equivalent guard
    // - so the self-mode check does not silently fail for string ids.
    expect(SOURCE).toMatch(/coerceToNumericId|Number\s*\(\s*user/);
    expect(SOURCE).toMatch(/Number\.isFinite/);
  });

  it('treats member-role users as self-loggers on the client dashboard route', () => {
    const allowSelfModeIdx = SOURCE.indexOf('const allowSelfMode');
    expect(allowSelfModeIdx).toBeGreaterThan(-1);
    const slice = SOURCE.slice(allowSelfModeIdx, allowSelfModeIdx + 450);
    expect(slice).toMatch(/user\?\.role\s*===\s*['"]user['"]|SELF_LOGGING_DASHBOARD_ROLES|isSelfLoggingDashboardRole/);
  });

  it('derives isClientSelfMode for authenticated client self-route or forced owner self-route', () => {
    // Accepts either the raw `user.id` or the coerced `userNumericId`
    // since Codex round 2 introduced the numeric coercion helper. The
    // invariant is that self-mode requires a self-logging dashboard role AND the
    // effective id equals the (possibly-coerced) authenticated user id.
    const allowSelfModeIdx = SOURCE.indexOf('const allowSelfMode');
    const isSelfModeIdx = SOURCE.indexOf('const isClientSelfMode');
    expect(allowSelfModeIdx).toBeGreaterThan(-1);
    expect(isSelfModeIdx).toBeGreaterThan(allowSelfModeIdx);
    const slice = SOURCE.slice(allowSelfModeIdx, isSelfModeIdx + 250);
    expect(slice).toMatch(/isSelfLoggingDashboardRole\(user\?\.role\)\s*\|\|\s*forceSelfMode/);
    expect(slice).toMatch(/isClientSelfMode[\s\S]*?allowSelfMode/);
    expect(slice).toMatch(/effectiveClientId\s*===\s*userNumericId/);
  });
});

describe('Phase 16.2 - admin owner personal logger route', () => {
  it('mounts AdminPersonalWorkoutLogger on /dashboard/admin/log-my-workout', () => {
    expect(DASHBOARD_ROUTE_COMPONENTS_SOURCE).toMatch(
      /export const\s+AdminPersonalWorkoutLogger\s*=\s*React\.lazy\(\(\)\s*=>\s*import\('\.\.\/WorkoutLogger\/AdminPersonalWorkoutLogger'\)\)/,
    );
    expect(DASHBOARD_ROUTES_SOURCE).toMatch(
      /path:\s*['"]\/log-my-workout['"][\s\S]*?component:\s*AdminPersonalWorkoutLogger/,
    );
  });
});

// -----------------------------------------------------------------------------
// Client-info endpoint routing: /my/info for self, /client/:id/info otherwise
// -----------------------------------------------------------------------------

describe('Phase 16.2 - client-info endpoint routes through self-mode when appropriate', () => {
  it('uses /api/workout-forms/my/info when in client self-mode', () => {
    expect(SOURCE).toMatch(/isClientSelfMode[\s\S]{0,200}\/api\/workout-forms\/my\/info/);
  });

  it('uses /api/workout-forms/client/${effectiveClientId}/info otherwise, NOT `${clientId}`', () => {
    // Old broken pattern: `/api/workout-forms/client/${clientId}/info`
    // with clientId === undefined -> hit /client/undefined/info -> 403.
    // The fix uses effectiveClientId in the URL template.
    expect(SOURCE).toMatch(/\/api\/workout-forms\/client\/\$\{effectiveClientId\}\/info/);
    expect(SOURCE).not.toMatch(/\/api\/workout-forms\/client\/\$\{clientId\}\/info/);
  });

  it('guards the client-info fetch against an undefined effectiveClientId (no /client/undefined/info request)', () => {
    // The loader must short-circuit before reaching the network call
    // if effectiveClientId failed to resolve.
    const loaderIdx = SOURCE.indexOf('const executeLoadClientData');
    expect(loaderIdx).toBeGreaterThan(-1);
    const loaderBody = SOURCE.slice(loaderIdx, loaderIdx + 2500);
    expect(loaderBody).toMatch(/typeof\s+effectiveClientId\s*!==\s*['"]number['"]/);
    // When the guard fires, the loader should setClient(null) and return
    // - not still call `api.get(...)`.
    expect(loaderBody).toMatch(/setClient\s*\(\s*null\s*\)/);
  });
});

// -----------------------------------------------------------------------------
// Exercise source: client-safe library endpoint
// -----------------------------------------------------------------------------

describe('Phase 16.2 - exercise source is client-safe', () => {
  it('useExerciseSearch hits /api/exercises/library, NOT /api/exercises/all', () => {
    // /api/exercises/all is trainer/admin-only (exerciseRoutes.mjs:293).
    // The new /library endpoint is protect-only (any authenticated user).
    expect(EXERCISE_SEARCH).toMatch(/\/api\/exercises\/library/);
    expect(EXERCISE_SEARCH).not.toMatch(/\/api\/exercises\/all/);
  });

  it('backend exposes /api/exercises/library behind protect only (no trainer/admin gate)', () => {
    // The new endpoint must NOT be wrapped in trainerOrAdminOnly.
    // Matches: `router.get('/library', protect, apiLimiter, ...)`.
    expect(EXERCISE_ROUTES_SOURCE).toMatch(
      /router\.get\(\s*['"]\/library['"]\s*,\s*protect\s*,\s*apiLimiter/,
    );
    // Anti-regression: the library handler block must not contain
    // trainerOrAdminOnly anywhere in its middleware chain.
    const libIdx = EXERCISE_ROUTES_SOURCE.indexOf(`router.get('/library'`);
    expect(libIdx).toBeGreaterThan(-1);
    const libOpenLine = EXERCISE_ROUTES_SOURCE.slice(libIdx, libIdx + 200);
    expect(libOpenLine).not.toMatch(/trainerOrAdminOnly/);
  });

  it('/api/exercises/all auth gate remains unchanged for existing callers', () => {
    // Defense-in-depth: do not regress the old trainer/admin gate on
    // /all - other callers in the repo may depend on its current shape.
    expect(EXERCISE_ROUTES_SOURCE).toMatch(
      /router\.get\(\s*['"]\/all['"]\s*,\s*protect\s*,\s*trainerOrAdminOnly/,
    );
  });
});

// -----------------------------------------------------------------------------
// Equipment profile picker: hidden on client self-route
// -----------------------------------------------------------------------------

describe('Phase 16.2 - EquipmentProfilePicker does not mount on the client self-route', () => {
  it('renders EquipmentProfilePicker conditionally behind !isClientSelfMode', () => {
    // The old unconditional render caused the client self-route to
    // fetch /api/equipment-profiles (admin/trainer gated -> 403).
    // The fix wraps the picker in `{!isClientSelfMode && (...)}`.
    expect(SOURCE).toMatch(
      /!\s*isClientSelfMode\s*&&\s*\(\s*<EquipmentProfilePicker/,
    );
  });

  it('does not render EquipmentProfilePicker unconditionally', () => {
    // Anti-regression: a future refactor that drops the guard would
    // silently re-break the client route. Lock the pattern.
    const beforeGuardIdx = SOURCE.indexOf('<EquipmentProfilePicker');
    expect(beforeGuardIdx).toBeGreaterThan(-1);
    const preamble = SOURCE.slice(Math.max(0, beforeGuardIdx - 200), beforeGuardIdx);
    expect(preamble).toMatch(/!isClientSelfMode|isClientSelfMode\s*===\s*false/);
  });
});

// -----------------------------------------------------------------------------
// Codex round 4 (2026-04-18): backend POST middleware + ghost-prefill
// -----------------------------------------------------------------------------

describe('Phase 16.2 (Codex round 4) - backend POST /api/workout-forms accepts client self-log', () => {
  it('middleware chain no longer includes trainerOrAdminOnly on POST /', () => {
    // The previous chain `protect, trainerOrAdminOnly, checkTrainerClientRelationship`
    // 403'd client self-log at the middleware layer before the
    // handler's own self-check could run. The fix drops the outer
    // role gate - `checkTrainerClientRelationship` at
    // authMiddleware.mjs:614+ is already role-aware and permits
    // clients accessing their own data (line 631).
    const ROUTES = readFileSync(
      resolve(__dirname, '../../../../backend/routes/dailyWorkoutFormRoutes.mjs'),
      'utf8',
    );
    // Locate the POST / route registration.
    const routeIdx = ROUTES.search(/router\.post\(\s*['"]\/['"]/);
    expect(routeIdx).toBeGreaterThan(-1);
    // Slice the registration line (up to the handler function).
    const routeLine = ROUTES.slice(routeIdx, ROUTES.indexOf('async (req, res)', routeIdx));
    expect(routeLine).not.toMatch(/trainerOrAdminOnly/);
    // `protect` and `checkTrainerClientRelationship` should still be
    // present - they are the correct middleware for this route.
    expect(routeLine).toMatch(/\bprotect\b/);
    expect(routeLine).toMatch(/\bcheckTrainerClientRelationship\b/);
  });

  it('in-handler client self-check preserved with numeric comparison (defense-in-depth)', () => {
    // Even with the middleware loosened, the handler body still
    // explicitly rejects a client attempting to submit for another
    // user id. Phase 16.2 round 5 update: both sides of the comparison
    // must be numbers - previously `parseInt(clientId) !== req.user.id`
    // compared number !== string, which was always true and silently
    // 403'd every client save. The fix derives `userNumericId` at the
    // top of the handler and compares it against a strict parsed client id.
    const ROUTES = readFileSync(
      resolve(__dirname, '../../../../backend/routes/dailyWorkoutFormRoutes.mjs'),
      'utf8',
    );
    const submitRoute = ROUTES.slice(
      ROUTES.indexOf("router.post('/', protect, checkTrainerClientRelationship"),
      ROUTES.indexOf("router.get('/', protect, trainerOrAdminOnly")
    );
    expect(submitRoute).toContain('const parsedClientId = parseStrictPositiveInteger(clientId);');
    expect(submitRoute).toContain('if (isWorkoutSelfLogRole(userRole) && parsedClientId !== userNumericId)');
    expect(ROUTES).toMatch(/Clients can only log their own workouts/);
    // Negative lock: the broken pre-fix shape must not come back.
    expect(ROUTES).not.toMatch(
      /userRole\s*===\s*['"]client['"][\s\S]{0,200}parseInt\(\s*clientId\s*\)\s*!==\s*req\.user\.id/,
    );
  });
});

describe('Phase 16.2 (Codex round 4) - useGhostPreFill skip option on client self-route', () => {
  it('hook signature accepts an options bag with a skip flag', () => {
    const HOOK = readFileSync(
      resolve(__dirname, './useGhostPreFill.ts'),
      'utf8',
    );
    expect(HOOK).toMatch(
      /useGhostPreFill\s*\(\s*clientId\s*:\s*number\s*,\s*options\s*:\s*\{\s*skip\?\s*:\s*boolean/,
    );
  });

  it('fetchExerciseHistory short-circuits when skip is true', () => {
    const HOOK = readFileSync(
      resolve(__dirname, './useGhostPreFill.ts'),
      'utf8',
    );
    // The skip guard must fire BEFORE any network request. The
    // fetch call lives inside fetchExerciseHistory - the early
    // return on skip prevents the admin-only 403.
    const fnIdx = HOOK.indexOf('const fetchExerciseHistory');
    expect(fnIdx).toBeGreaterThan(-1);
    const body = HOOK.slice(fnIdx, fnIdx + 1500);
    const skipGuardIdx = body.indexOf('if (skip)');
    const requestIdx = body.indexOf('apiService.get');
    expect(skipGuardIdx).toBeGreaterThan(-1);
    expect(requestIdx).toBeGreaterThan(-1);
    expect(skipGuardIdx).toBeLessThan(requestIdx);
  });

  it('WorkoutLogger passes skip: isClientSelfMode to useGhostPreFill', () => {
    expect(SOURCE).toMatch(
      /useGhostPreFill\s*\(\s*hookClientId\s*,\s*\{\s*skip\s*:\s*isClientSelfMode\s*\}\s*\)/,
    );
  });

  it('real fetchExerciseHistory useCallback deps include `clientId` AND `skip` (Phase 16.2 rounds 5 + 12)', () => {
    // Anti-regression for the round 4 incomplete fix: the short-circuit
    // existed but the callback's deps were only [clientId], so the closure
    // captured the initial skip value. When isClientSelfMode flipped to
    // true after mount, the memoized callback still had skip=false and
    // fired the admin-only history fetch. The deps must include `skip`.
    //
    // Round 12 (2026-04-18): the real fetcher was renamed to
    // `fetchExerciseHistoryReal` and a ref-stable `noOpFetchExerciseHistory`
    // was introduced; the hook now returns whichever one matches the
    // current `skip` value. The deps-array invariant still applies to
    // the REAL fetcher.
    const HOOK = readFileSync(
      resolve(__dirname, './useGhostPreFill.ts'),
      'utf8',
    );
    // Tolerate both the pre-round-12 name (`fetchExerciseHistory`) and
    // the post-round-12 name (`fetchExerciseHistoryReal`). Either is the
    // real fetcher that must have `skip` in its deps.
    const fnIdx =
      HOOK.indexOf('const fetchExerciseHistoryReal = useCallback') !== -1
        ? HOOK.indexOf('const fetchExerciseHistoryReal = useCallback')
        : HOOK.indexOf('const fetchExerciseHistory = useCallback');
    expect(fnIdx).toBeGreaterThan(-1);

    // Walk forward from the callback start until we find the deps array
    // that closes that useCallback. Size the slice to the remainder of
    // the file so the test is resilient to body-length drift.
    const body = HOOK.slice(fnIdx);
    const depsMatch = body.match(/\}\s*,\s*\[([^\]]*)\]\s*\)\s*;/);
    expect(depsMatch).toBeTruthy();
    const deps = depsMatch![1];
    expect(deps).toMatch(/\bclientId\b/);
    expect(deps).toMatch(/\bskip\b/);
  });
});

// -----------------------------------------------------------------------------
// Phase 16 + 16.1-UX behavior preserved
// -----------------------------------------------------------------------------

describe('Phase 16.2 - Phase 16 + 16.1-UX contracts preserved', () => {
  it('null-honest overallIntensity state initializer preserved', () => {
    expect(SOURCE).toMatch(/useState<number\s*\|\s*null>\s*\(\s*null\s*\)/);
  });

  it('buildWorkoutFormSubmitBody still invoked on save path', () => {
    expect(SOURCE).toMatch(/buildWorkoutFormSubmitBody\s*\(\s*\{/);
  });

  it('CompactProtocolSection imports preserved', () => {
    expect(SOURCE).toMatch(/import\s+CompactProtocolSection/);
  });

  it('AI_TOGGLE_NASM_ITEM bridge preserved', () => {
    expect(SOURCE).toMatch(/addEventListener\(\s*['"]AI_TOGGLE_NASM_ITEM['"]/);
    expect(SOURCE).toMatch(/const acknowledgeAIWorkoutEvent = \(event: Event,\s*handled = true\)/);
  });

  it('AI_SUBMIT_WORKOUT bridge submits through the same save path', () => {
    expect(SOURCE).toMatch(/addEventListener\(\s*AI_SUBMIT_WORKOUT\s*,/);
    expect(SOURCE).toMatch(/acknowledgeAIWorkoutEvent\?\.\(\)/);
    expect(SOURCE).toMatch(/handleSubmit\(\{\s*overallIntensity:\s*nextIntensity,\s*sessionNotes:\s*nextNotes\s*\}\)/);
  });

  it('AI_UPDATE_SET bridge only acknowledges once the form state actually changes', () => {
    const fnIdx = SOURCE.indexOf('const onUpdateSet');
    expect(fnIdx).toBeGreaterThan(-1);
    const body = SOURCE.slice(fnIdx, fnIdx + 1200);
    expect(body).not.toMatch(/if \(!detail\?\.exerciseName\) return;\s*acknowledgeAIWorkoutEvent\(e\);/);
    expect(body).toMatch(/const next = applyAIUpdateSet\(prev, detail\);/);
    expect(body).toMatch(/acknowledgeAIWorkoutEvent\(e,\s*next !== prev\)/);
  });

  it('no phantom seed pattern reintroduced', () => {
    expect(SOURCE).not.toMatch(/\brpe\s*:\s*5\b/);
    expect(SOURCE).not.toMatch(/\bformQuality\s*:\s*3\b/);
    expect(SOURCE).not.toMatch(/\bformRating\s*:\s*3\b/);
  });
});

describe('WorkoutLogger voice/file import surface', () => {
  it('mounts the voice import section for ANY numeric client context (3c.3 un-gate)', () => {
    // Phase 3c.3: clients dictate their OWN workouts too. Self-only scope is
    // enforced server-side (resolveVoiceUploadScope); the section omits the
    // display name in self mode (see WorkoutLoggerVoiceImportSection locks).
    expect(SOURCE).toMatch(/<WorkoutLoggerVoiceImportSection[\s\S]*?clientId=\{effectiveClientId\}/);
    expect(SOURCE).toMatch(/isSelfMode=\{isClientSelfMode\}/);
    expect(SOURCE).toMatch(/onParsed=\{handleVoiceMemoParsed\}/);
  });

  it('applies parsed uploads through parsedWorkoutToExerciseEntries', () => {
    expect(SOURCE).toMatch(/parsedWorkoutToExerciseEntries\s*\(\s*workout\s*\)/);
    expect(SOURCE).toMatch(/setExercises\s*\(\s*prev\s*=>\s*\[\s*\.\.\.prev\s*,\s*\.\.\.parsedExercises\s*\]\s*\)/);
  });
});
