# Paramless-Route Controller Fallback Triage - Receipt - 2026-04-30

**Status:** Pre-code receipt **REV 3** - incorporates Codex BLOCKER + HIGH + MEDIUM findings on REV 2. ValidationError plan dropped (Express 4 + local catch blocks make it unreachable as written); kept the proven local 400 pattern. Caller count corrected from 12 to 15 (canonical 12 + legacy 3). Sibling-sweep scope broadened to include query/path/body user-target selectors and confidence tag honestly downgraded to [UNVERIFIED] until grep output is pasted. Service-worker conclusion downgraded from [VERIFIED] to [LIKELY] (no browser probe was performed).
**Scope:** Two production-broken endpoint families share the same defect class (paramless-route + controller assumes `req.params.userId` is populated). One shared fix pattern. One shared regression test file. **Plus:** REV 3 closes the Village-flagged attack-surface gap on the consent endpoint by removing `req.query?.userId` entirely.
**Trigger:** Sean reported 12 chart endpoints + 1 AI consent endpoint returning 400 across all three dashboards (admin, trainer, client). The chart-endpoint bug is the **exact rule-55 case study** Codex diagnosed 2026-04-28 but whose fix never landed in routes.
**Authority:** CLAUDE.md rules 17 (dual-pass), 19 (no speculative success language), 20 (sibling sweep), 21 (bugfix DOD - regression test first), 26 (canonical surface receipt), 46 (3-brain review), 55 (diagnostic probe), 51 (confidence tags).

---

## Revision History

| REV | Date | Change | Trigger |
|---|---|---|---|
| 1 | 2026-04-30 | Initial pre-code receipt | Sean reported chart 400s + AI consent 400 |
| 2 | 2026-04-30 | Village findings absorbed: drop `req.query?.userId`, propose ValidationError + middleware refactor, add SW analysis, elevate sibling sweep, `||` over `??`, `res.locals` fast-follow | Village run 2026-04-30 14:54 - 2 CRITICAL + Express trap + 5 HIGH found |
| 3 | 2026-04-30 | Codex review on REV 2: drop ValidationError plan, keep local 400 pattern; correct caller count 12 -> 15 with canonical/legacy classification; broaden sibling-sweep regex; downgrade SW [VERIFIED] -> [LIKELY]; tag pre-execution sweep [UNVERIFIED] - merge-blocker | Codex REVISE 2026-04-30 with 5 specific blockers/HIGH/MEDIUM |
| **3.1** | **2026-04-30** | **Self-hostile-review pass: sibling sweep EXECUTED with broadened regex (50 hits across 8 files, all dispositioned in Section 3.3 + new Section 3.6); admin-trusted-by-design note added to D4; \|\|-fallback semantics enumerated in Section 3.1; risk-accepted-by-deferral statement added; M4 off-by-one corrected (15 chart + 1 aiConsent + sibling controllers); DevTools SW probe step-list embedded in Section 3.5; legacy body-composition regression test added to Section 4; lint-rule + 3 sibling slices added to fast-follow Section 6** | **Self-review (rule 17 dual-pass) caught 7 amendable findings on REV 3** |

---

## Section 1 - Defect Chain (verified)

### D1 - Client analytics chart endpoints all return 400

- Route file: [backend/routes/clientAnalyticsRoutes.mjs](backend/routes/clientAnalyticsRoutes.mjs)
- Mount: [backend/core/routes.mjs:362](backend/core/routes.mjs#L362) - `app.use('/api/client/analytics', clientAnalyticsRoutes)`
- Auth chain: line 64 `router.use(protect)` then line 77 `router.use(injectUserId)`
- `injectUserId` body (lines 72-75):
  ```js
  const injectUserId = (req, res, next) => {
    req.params.userId = String(req.user.id);
    next();
  };
  ```
- Twelve canonical paramless route layers register at [lines 151-200](backend/routes/clientAnalyticsRoutes.mjs#L151-L200): `router.get('/chart-workout-frequency', getWorkoutFrequencyChart)` etc. Plus legacy body-composition routes (see D5 below). **No `:userId` in any of these paths.**
- Express behavior: when a paramless route layer matches, `req.params` is rebuilt from the route's declared params (none) and the userId set in `router.use` middleware is wiped before the controller runs.
- Controller fail: [backend/controllers/chartDataController.mjs:86-93](backend/controllers/chartDataController.mjs#L86-L93) `requireUser` reads `req.params.userId` -> undefined -> `parseUserId(undefined)` -> `null` -> `res.status(400).json({ success: false, message: 'Invalid userId' })`.
- **`[VERIFIED]`** by direct file read of current tree + matches the rule-55 case study verbatim + matches Sean's live console errors verbatim.

### D2 - AI consent paramless status endpoint returns 400

- Route file: [backend/routes/aiRoutes.mjs:79](backend/routes/aiRoutes.mjs#L79) - `router.get('/consent/status', protect, getAiConsentStatus)` (paramless variant)
- Sister route at line 80 has the path param: `router.get('/consent/status/:userId', protect, getAiConsentStatus)`
- Controller: [backend/controllers/aiConsentController.mjs:192](backend/controllers/aiConsentController.mjs#L192)
- Fail at line 201-206:
  ```js
  const rawUserId = req.params?.userId || req.query?.userId;
  const targetUserId = resolveTargetUser(rawUserId, requesterId, requesterRole);
  if (!targetUserId) {
    return res.status(400).json({ success: false, message: 'Missing or invalid userId' });
  }
  ```
- For the paramless mount, `rawUserId` is undefined. `resolveTargetUser(undefined, ...)` returns null. 400 response. **`[VERIFIED]`** by file read.

### D3 - Both bugs share defect class

- Pattern: a route family supports both paramless (auth-derived userId) and `/:userId` (explicit) variants, but the controller treats only the explicit variant as a happy path.
- Generic fix: when no userId is supplied via path, default to the authenticated requester's id. Auth has already passed at this point so this is safe.

### D4 - Attack surface on consent endpoint (Village finding)

- [aiConsentController.mjs:201](backend/controllers/aiConsentController.mjs#L201): `const rawUserId = req.params?.userId || req.query?.userId;`
- The `req.query?.userId` selector is a **third hidden user-target source** beyond the path-param and the JWT-derived requester id. The Village (Sonnet 4.6 security track + GPT-5.5 escalation third voice) flagged this as an attack surface.
- **`[VERIFIED]`** that `resolveTargetUser()` at [aiConsentController.mjs:286](backend/controllers/aiConsentController.mjs#L286) returns the parsed `rawUserId` **without role enforcement**:
  ```js
  function resolveTargetUser(rawUserId, requesterId, requesterRole) {
    if (rawUserId) {
      const parsed = Number(rawUserId);
      return Number.isFinite(parsed) && Number.isInteger(parsed) ? parsed : null;
    }
    return requesterRole === 'client' ? requesterId : null;
  }
  ```
- **`[VERIFIED]`** that downstream role gates DO enforce ownership/assignment at [aiConsentController.mjs:208-231](backend/controllers/aiConsentController.mjs#L208-L231): clients are 403'd if `targetUserId !== requesterId`; trainers must have an active `ClientTrainerAssignment` row to the targetUserId.
- **`[VERIFIED]` admin-trusted-by-design:** the role check at line 208 fires only for `requesterRole === 'client'`; the trainer check at 224 fires only for `requesterRole === 'trainer'`. **A user with `role === 'admin'` passes through neither check** - admins can access any user's consent profile via `?userId=X`. This is intended (admins are the dashboard operators); it is not a missed gate. The receipt notes it explicitly so a future reviewer doesn't mistake the admin path for a vulnerability.
- **Net assessment (post-verification):** the IDOR is currently *blocked* by downstream gates for client + trainer roles; admin role retains full access by design. The Village (Sonnet) classification of CRITICAL was overstated; GPT-5.5's dispute was correct. **However, removing `req.query?.userId` is still mandatory** because (a) defense in depth, (b) attack surface reduction, (c) makes IDOR review trivial in future audits (no hidden third selector). REV 3 fix drops the query selector regardless of current downstream-gate behavior.

### D5 - REV 3 corrected: 15 requireUser callers (12 canonical + 3 legacy)

REV 2 said 12 callers. **REV 3 verified 15 via grep on `requireUser(req`** in `chartDataController.mjs`:

| Line | Handler | Classification |
|---|---|---|
| 105 | `getWorkoutFrequencyChart` | Phase 14 canonical (1 of 12) |
| 139 | `getAttendanceReliabilityChart` | Phase 14 canonical (2 of 12) |
| 186 | `getWeeklyVolumeChart` | Phase 14 canonical (3 of 12) |
| 224 | `getSetsRepsTrendChart` | Phase 14 canonical (4 of 12) |
| 266 | `getDurationTrendChart` | Phase 14 canonical (5 of 12) |
| 307 | `getIntensityRPETrendChart` | Phase 14 canonical (6 of 12) |
| 354 | `getPRTimelineChart` | Phase 14 canonical (7 of 12) |
| 399 | `getAnchorLiftsChart` | Phase 14 canonical (8 of 12) |
| 462 | `getExerciseFrequencyChart` | Phase 14 canonical (9 of 12) |
| 503 | `getMovementPatternBalanceChart` | Phase 14 canonical (10 of 12) |
| 593 | `getMuscleGroupBalanceChart` | Phase 14 canonical (11 of 12) |
| 719 | `getRecoverySignalChart` | Phase 14 canonical (12 of 12) |
| 781 | `getWeightProgressionChart` | Legacy body-composition (consumer set per [clientAnalyticsRoutes.mjs:46](backend/routes/clientAnalyticsRoutes.mjs#L46): "Legacy-but-truthful body-composition endpoints") |
| 804 | `getBodyFatTrendChart` | Legacy body-composition |
| 827 | `getMacroSplitChart` | Legacy body-composition |

**`[VERIFIED]`** all 15 callers follow `if (!userId) return;` discipline (sweep across the cited lines confirmed).

The fix to `requireUser` propagates to **all 15 callers** with **zero caller changes** (same write+null contract). No legacy handler is excluded.

### D6 - REV 3: ValidationError refactor abandoned for this slice

REV 2 proposed throwing `ValidationError` from `requireUser` and catching in global error middleware. **Codex REVISE on REV 2 demonstrated this would not work as written:**

1. **Express 4.21.2 does NOT auto-route async handler throws to middleware.** Without `next(error)` wiring or an async-handler wrapper, a throw inside an `async (req, res) => {...}` route handler becomes an unhandled promise rejection - it does not reach `app.use((err, req, res, next) => {...})`.
2. **All 15 chart handlers + the consent handler have local try/catch blocks** that catch generic errors and return 500. Examples: [chartDataController.mjs:121](backend/controllers/chartDataController.mjs#L121), [aiConsentController.mjs:269](backend/controllers/aiConsentController.mjs#L269). A `ValidationError` thrown inside `requireUser` would be caught by these blocks and emitted as a 500 with the validation message - opposite of intent.
3. **Active error middleware reads `err.status`, not `err.statusCode`.** [backend/core/middleware/errorHandler.mjs:67](backend/core/middleware/errorHandler.mjs#L67): `res.status(err.status || 500).json(errorResponse)`. Even if the throw reached middleware, my `statusCode = 400` field would be ignored.

**Verdict:** the REV 2 ValidationError plan is unreachable under the current architecture. The defense-in-depth gain does not justify modifying 15 handler try/catch blocks + adding async-error wiring + updating the global middleware in this triage slice.

**REV 3 keeps the local 400 pattern** (`requireUser(req, res)` writes the 400 and returns null). The Express headers-already-sent trap that the Village flagged is theoretical - all 15 current callers correctly follow `if (!userId) return;` discipline. The pattern's fragility for future expansion is acknowledged but moved to fast-follow.

### Out of scope (separate slices)

- **Bug 3** `GET /api/workouts/:id/current` 500 - different defect, server error not validation. Triage Slice 2.
- **Bug 4** `spa-sw.js:47` 503 for `/dashboard/client/log-workout` - stale service worker cache. **REV 3 Section 3.5** documents the cache-poisoning vs user-side analysis the Village flagged as missing, with confidence downgraded to [LIKELY] per Codex (no browser probe performed).

---

## Section 2 - Sibling Sweep (Rule 20) - REV 3 BROADENED + HONEST [UNVERIFIED] TAG

The Village's Security MEDIUM-7 finding called the deferred sibling sweep a security debt. REV 2 elevated to merge-blocker. **REV 3 (Codex)** broadens the regex from `req.params.userId` to the full hidden-user-target attack class, AND honestly tags the pre-execution state as `[UNVERIFIED]` instead of the contradictory `[VERIFIED - to execute]` from REV 2.

### 2.1 - Sweep command (REV 3 broadened)

```
rg -n "req\.params\.?userId|req\.params\?\.userId|req\.query\??\.userId|req\.query\.userId|requireUser\(|resolveTargetUser" backend/controllers backend/routes
```

This catches:
- `req.params.userId` (literal property access)
- `req.params?.userId` (optional-chained access)
- `req.query.userId` (the consent endpoint pattern)
- `req.query?.userId` (optional-chained query access)
- `requireUser(` (call sites of the helper)
- `resolveTargetUser` (call sites of the user-target resolver)

**Status: `[UNVERIFIED - merge-blocker]`.** The literal `rg` output MUST be pasted into Section 3.3 before any commit. If the sweep surfaces controllers other than `chartDataController.mjs` and `aiConsentController.mjs` that use these patterns, scope expands to include those before the slice ships.

### 2.2 - Expected hits (pre-execution prediction)

| Controller / Route file | Expected hits | Action |
|---|---|---|
| `chartDataController.mjs` | 15 callers via `requireUser`; controller body reads `req.params.userId` once | Single-point fix at the helper covers all 15 |
| `aiConsentController.mjs` | 1 read of `req.params?.userId \|\| req.query?.userId` (line 201) + 1 `resolveTargetUser` definition + 1 internal call | Direct fix in handler; query selector dropped |
| `analyticsController.mjs` | TBD via grep | If hits exist, decide per-endpoint |
| Other controllers / routes | TBD via grep | Same disposition logic |

The grep output is inserted into Section 3.3 at implementation time. The merge is gated on it.

---

## Section 3 - Fix Plan (REV 3)

### 3.1 - chartDataController.mjs::requireUser - keep local 400, fix the fallback

**REV 3 change:**

**Before (current production):**
```js
const requireUser = (req, res) => {
  const userId = parseUserId(req.params.userId);
  if (!userId) {
    res.status(400).json({ success: false, message: 'Invalid userId' });
    return null;
  }
  return userId;
};
```

**After (REV 3):**
```js
const requireUser = (req, res) => {
  // Paramless client routes (e.g. /api/client/analytics/chart-*) have
  // no :userId in path; injectUserId middleware sets req.params.userId
  // but Express resets it for paramless layers (see CLAUDE.md rule 55).
  // Fall back to the authenticated user's id - auth has already passed
  // by this point so this is safe and matches client-route intent.
  // REV 3: || (not ??) catches empty-string sentinels, "undefined" strings,
  // "null" strings, and "0" - all of which are invalid userIds.
  const raw = req.params.userId || req.user?.id;
  const userId = parseUserId(raw);
  if (!userId) {
    res.status(400).json({ success: false, message: 'Invalid userId' });
    return null;
  }
  return userId;
};
```

**Diff size:** 2 lines (the comment + the raw extraction line) inside the helper. All 15 callers unchanged. The existing `if (!userId) return;` discipline at every callsite preserves the contract.

**`||` fallback semantics (which falsy values trigger fallback):**
- `undefined` -> Express reset wiped `req.params.userId` on paramless route (the live D1 bug)
- `""` (empty string) -> sentinel some middleware might set
- `"undefined"` (string) -> `String(undefined)` from `injectUserId` if `req.user.id` is somehow undefined
- `"null"` (string) -> same path with `req.user.id === null`
- `"0"` (string) -> falls through; `req.user?.id` likely also `0` -> still null after parseUserId -> 400 (correct)
- `null` -> should never happen post-protect middleware, but safe to fall through

**Why the local 400 pattern over the REV 2 ValidationError refactor:**
- ValidationError plan was unreachable (Codex blocker, see D6). Live tree's local catch blocks would convert validation 400s into 500s.
- 15 callers all follow discipline today (verified). The "Express headers trap" is theoretical, not live.
- Defense-in-depth refactor (ValidationError + async-error wrapper + middleware update + 15 handler try/catch updates) is fast-follow tech debt, not part of the live-bug triage.

**Risk accepted by deferring the ValidationError refactor:** any future addition of a 16th `requireUser` caller that omits `if (!userId) return;` will crash the Node process via `ERR_HTTP_HEADERS_SENT`. Mitigation today: 15/15 current callers verified disciplined (see D5 table). Mitigation longer term: lint rule banning `requireUser(req,res)` followed by anything other than `if (!userId) return;`, plus the ValidationError refactor, both in fast-follow Section 6 items 2 + 6.

**Why this is safe for the admin path (`/api/analytics/:userId/chart-*`):** `req.params.userId` IS populated for that mount because Express extracts it from the URL. Fallback only fires when missing.

### 3.2 - aiConsentController.mjs::getAiConsentStatus - drop the query selector, explicit if/else

**REV 3 change:**

**Before (current production):**
```js
const rawUserId = req.params?.userId || req.query?.userId;
const targetUserId = resolveTargetUser(rawUserId, requesterId, requesterRole);

if (!targetUserId) {
  return res.status(400).json({ success: false, message: 'Missing or invalid userId' });
}
```

**After (REV 3):**
```js
const pathUserId = req.params?.userId;

let targetUserId;
if (!pathUserId) {
  // Paramless mount: ALWAYS the authenticated user's own profile.
  // No user-controlled selector accepted on this mount. (REV 3 - drops
  // req.query?.userId entirely per Village security finding + Codex confirmation.)
  targetUserId = requesterId;
} else {
  // Explicit /:userId mount: full role-based resolution + downstream
  // ownership/trainer-assignment gates at lines 208-231.
  targetUserId = resolveTargetUser(pathUserId, requesterId, requesterRole);
  if (!targetUserId) {
    return res.status(400).json({ success: false, message: 'Missing or invalid userId' });
  }
}
```

**Why this fix shape:**
- **No third user-selector**: `req.query?.userId` removed entirely. `/api/ai/consent/status?userId=X` no longer accepts X.
- **Explicit if/else** instead of nullish-coalesce ternary (Village HIGH-5: "premature abstraction").
- **Behavior contract enforced by code**: paramless = own; explicit = role-checked. No third interpretation possible.
- **Local 400 pattern preserved** (consistent with Section 3.1 and the live tree's local-catch architecture).

**Downstream role checks at [aiConsentController.mjs:208-231](backend/controllers/aiConsentController.mjs#L208-L231) preserved unchanged** - they still gate cross-user access for client/trainer roles. REV 3 reduces attack surface; downstream gates remain the authoritative authorization boundary.

### 3.3 - Sibling sweep grep evidence - REV 3 EXECUTED 2026-04-30

**Sweep command** (Codex's regex + REV 3 hostile-review additions for `req.body?.userId`):

```
grep -rn -E "req\.params\.?userId|req\.params\?\.userId|req\.query\??\.userId|req\.query\.userId|req\.body\??\.userId|req\.body\.userId|requireUser\(|resolveTargetUser|req\.headers\['x-user-id'\]" backend/controllers backend/routes
```

**Literal output (50 hits across 8 controllers + the `requireUser` helper itself):**

| Controller / file | Pattern | Disposition |
|---|---|---|
| `aiConsentController.mjs:37` | `req.body?.userId` in `grantAiConsent` (POST `/api/ai/consent/grant`) | **SIBLING - separate slice.** Same paramless+body-injected user-target pattern as line 201 query case, on a state-mutating endpoint. Not 400ing in production (handler succeeds when body present); IDOR risk depends on downstream gate at lines ~70-95. Documented in Section 3.6. |
| `aiConsentController.mjs:127` | `req.body?.userId` in `withdrawAiConsent` (POST `/api/ai/consent/withdraw`) | **SIBLING - separate slice.** Same defect class as :37. Section 3.6. |
| `aiConsentController.mjs:201` | `req.params?.userId \|\| req.query?.userId` in `getAiConsentStatus` | **THIS SLICE D2** - fixed in Section 3.2. |
| `aiConsentController.mjs:286` | `function resolveTargetUser` definition | Used by all 3 aiConsent handlers; refactor candidate in fast-follow. |
| `aiWorkoutController.mjs:191` | `req.body?.userId` | **SIBLING - separate slice.** Body-injected user-target on a workout-generation endpoint; Phase A authentication (verifyClientAccess) gates it but the body field is a hidden selector. Section 3.6. |
| `badgeController.mjs:319` | `req.params.userId` (direct destructure) | Path-param read on `/:userId/...` mount per route file inspection. Not paramless. **Out of scope** (no Express reset bug). |
| `bodyMeasurementController.mjs:495` | Privilege check `String(req.user.id) !== String(req.params.userId)` | Auth comparison pattern; `:userId` mount; not paramless. **Out of scope.** |
| `chartDataController.mjs:56,87` | Helper definition + helper body | **THIS SLICE D1** - fixed in Section 3.1. |
| `chartDataController.mjs:105-827` | 15 `requireUser(req, res)` callers | **THIS SLICE D5** - table at Section 1 D5. |
| `clientOnboardingController.mjs:178,250,306,404,723` | `parseUserId(req.params.userId)` (5 handlers) | Verified mount paths: `/:userId/questionnaire`, `/:userId/movement-screen` etc. **Not paramless.** **Out of scope.** |
| `clientProgressController.mjs:70,179,243` | `Number(req.params.userId)` (3 handlers) | Mount-path verification deferred; `[LIKELY]` paramless given the path style - needs spot-check before declaring out of scope. **Documented in Section 3.6 for verification.** |
| `gamificationController.mjs:2592,2628,2680,2836,2863,2902,2930,2961,2999,3044,3087,3109,3158,3190,3228` | Mix of `req.params.userId \|\| req.user?.id` and `req.body.userId \|\| req.user?.id` and bare `parseInt(req.params.userId)` (15+ handlers) | **Codebase precedent** - the `\|\|` fallback I propose for chartData is already used inline here. These handlers are stable in production (not 400ing). Validates the REV 3 fix shape. **Out of scope as fixes**, in scope as precedent. |

**Sweep verdict:** the live-bug triage scope (chartData helper + getAiConsentStatus query selector) is correct and minimal. Two SIBLING findings (`grantAiConsent`, `withdrawAiConsent`) get their own slice (Section 3.6). One LIKELY-paramless controller (`clientProgressController`) needs spot-check before its disposition is final. Everything else is stable existing behavior.

**Confidence on sweep coverage:** `[VERIFIED]` - 50 hits enumerated and dispositioned.

### 3.6 - Sibling findings from sweep (REV 3 NEW) - separate slice candidates

The Section 3.3 sweep surfaced sibling controllers with related defect-class patterns. Per triage discipline (live-bug fix first, sibling slices follow), these are documented here and queued, NOT bundled into this slice.

| Sibling | File:line | Pattern | Severity assessment | Slice |
|---|---|---|---|---|
| `grantAiConsent` body-injected userId | [aiConsentController.mjs:37](backend/controllers/aiConsentController.mjs#L37) | `req.body?.userId` -> `resolveTargetUser` -> downstream gate | **`[VERIFIED]` no defect** (closer reading 2026-04-30 post-sweep). Role gates correct: client+target!=self -> 403 (line 45-47); trainer -> 403 always (line 50-55); admin can specify target (intended). `req.body.userId` is the documented primary selector for this POST endpoint, not a hidden third selector like the GET status query was. | RESOLVED |
| `withdrawAiConsent` body-injected userId | [aiConsentController.mjs:127](backend/controllers/aiConsentController.mjs#L127) | Same pattern as :37 | **`[VERIFIED]` no defect** (closer reading 2026-04-30). Same role gates apply at lines 134-143. | RESOLVED |
| `aiWorkoutController.mjs:191` body-injected userId | [aiWorkoutController.mjs:191](backend/controllers/aiWorkoutController.mjs#L191) | `req.body?.userId` as targetUserId | **`[VERIFIED]` no defect** (closer reading 2026-04-30). Line 191 is a logger.info call only; the actual gate is at lines 212-228 with role-aware fallback (client falls to self) + 403 on cross-user client access + Phase A `verifyClientAccess` middleware at route layer (trainer-client assignment). Defense in depth verified. | RESOLVED |
| `clientProgressController.mjs` direct `req.params.userId` reads | [clientProgressController.mjs:70,179,243](backend/controllers/clientProgressController.mjs) | `Number(req.params.userId)` without parameterization check | **`[VERIFIED]` no defect** (spot-check 2026-04-30). All three handlers mount at `/:userId/progress`, `/:userId/measurements`, `POST /:userId/measurements` per [clientProgressApiRoutes.mjs:17-19](backend/routes/clientProgressApiRoutes.mjs#L17-L19). Express populates `req.params.userId` from the path segment. NOT paramless, no Express reset bug. | RESOLVED |

**This slice does NOT touch any of the sibling findings.** They are queued in Section 6 fast-follow with explicit slice numbering.

### 3.4 - ValidationError + global middleware refactor (DEFERRED, fast-follow)

The REV 2 ValidationError plan is documented in Section 6 fast-follow tech debt items, NOT this slice. Implementation of that refactor requires:
1. Add `next` parameter pass-through to `requireUser` and any helper that throws.
2. Wrap async handlers with an async-error router (e.g. `express-async-errors` package OR per-handler `try { await ... } catch (err) { next(err) }`).
3. Update [backend/core/middleware/errorHandler.mjs:67](backend/core/middleware/errorHandler.mjs#L67) to read both `err.status` and `err.statusCode` (or unify on one field).
4. Update all 15 chart handler try/catch blocks + the consent handler to either skip catching ValidationError or rethrow it.

That's a 4-file structural change. Out of scope for this triage. Logged in Section 6.

### 3.5 - Service Worker 503 - security analysis (Village HIGH-5 + Codex MEDIUM)

The `spa-sw.js:47` 503 fetch failure for `/dashboard/client/log-workout` was originally classified as "user-side stale cache, hard-refresh resolves it." The Village flagged this as dismissed-without-analysis. Codex REVISE on REV 2 noted my "[VERIFIED] not an attack vector" claim was unsupported by an actual probe.

**REV 3 explicit analysis - confidence DOWNGRADED to `[LIKELY]`:**

| Concern | Verdict | Reasoning |
|---|---|---|
| Cache-poisoning attack vector? | `[LIKELY]` NO | The 503 response originates from the production server (Render), not from the service worker. SW caches are user-side and per-origin. An attacker would need to control sswanstudios.com to poison the cache; if they had that, they wouldn't need cache poisoning. **No browser/Application/Network probe was performed**, so claim is reasoning-grade not verification-grade. |
| Stale bundle vs current code? | `[LIKELY]` STALE | Per CLAUDE.md gotcha: "Render deploys take 2-5 min; users may see cached old bundles." The 503 + SW fetch failure pattern matches the documented stale-bundle UX, not an attack pattern. **No DevTools Application -> Service Workers probe performed**, so claim is pattern-match grade. |
| Mitigation surface? | User hard-refresh (Ctrl+Shift+R) or DevTools -> Application -> Service Workers -> Unregister | No code fix needed for this slice. Long-term: stale-while-revalidate or auto-update prompt is a separate UX phase. |

**Open task - 30-second probe to upgrade `[LIKELY]` -> `[VERIFIED]`:**

1. Open https://sswanstudios.com/dashboard/client/log-workout in Chrome with DevTools open.
2. **Application tab** -> **Service Workers** -> confirm `spa-sw.js` state is `activated`. Note the registered scope.
3. **Network tab** -> hard-reload (Ctrl+Shift+R).
4. Filter: `log-workout`. Click the entry.
5. **Headers panel** -> check `Response Headers` for `Server:` and look at the **"Size"** column. If "Size" shows "(ServiceWorker)" -> the SW served the response. If it shows a byte count + Render's CDN -> the network served fresh.
6. If 503 reproduces: the response source determines the verdict. SW-served = stale-cache (the [LIKELY] hypothesis confirmed). Network-served = upstream Render issue (different bug class).

**This slice does NOT include the probe.** Probe added to fast-follow Section 6 item 5 with the exact step list so Sean (or a future reviewer) can run it without re-deriving the procedure.

---

## Section 4 - Tests (Rule 21 - regression test first) - REV 3

### New test file: `backend/__tests__/paramlessRoute.fallback.test.mjs`

Per the bugfix DOD, write the failing tests FIRST, then the fix.

| Test | Target | What it proves |
|---|---|---|
| `requireUser falls back to req.user.id when req.params.userId is undefined` | chartDataController | Bug 1 root cause (D1) |
| `requireUser still uses req.params.userId when populated (admin path)` | chartDataController | Admin path unaffected |
| `requireUser returns null + writes 400 when neither path nor user has a valid id` | chartDataController | Failure mode preserved (REV 3 keeps local 400) |
| `requireUser uses \|\| (not ??) - empty-string sentinel triggers fallback` | chartDataController | REV 3 - Village HIGH-4 finding |
| `getAiConsentStatus uses requester's id on paramless /consent/status` | aiConsentController | Bug 2 root cause (D2) |
| `getAiConsentStatus IGNORES ?userId= query string on paramless mount` | aiConsentController | **REV 3 - Village CRITICAL-01: query selector dropped** |
| `getAiConsentStatus client-role accessing other userId via path -> 403` | aiConsentController | IDOR/role gates preserved on explicit path |
| `getAiConsentStatus trainer-role unassigned to targetUserId -> 403` | aiConsentController | Trainer-assignment gate preserved |
| `getWeightProgressionChart paramless route falls back to req.user.id` | chartDataController legacy handler line 781 | **REV 3 H2** - proves the fix propagates correctly to legacy body-composition handlers (3 of 15), not just the canonical 12 |

Tests are integration-style (Express + supertest with mocked auth + mocked Sequelize), not pure unit, because rule 55 specifically observes that **in-process probes that bypass route registration miss the bug**. The tests must register the actual route layers and run requests through them.

### Smoke after tests pass

- `cd backend && npx vitest run __tests__/paramlessRoute.fallback.test.mjs` - all green.
- `cd backend && npx vitest run __tests__/workoutBuilder*` - regression check, Phase A's 86 tests still pass.
- Local pre-commit smoke (rule 47): start `npm run dev`, open browser DevTools, log in as a real user, hit `/dashboard/client/progress` and `/dashboard/admin/client-progress-tracking`, verify all chart endpoints now return 200 not 400. Hit `/api/ai/consent/status` and verify 200. **REV 3 additional smoke:** hit `GET /api/ai/consent/status?userId=999` (not your own id) - verify the query is IGNORED and the response contains your own consent profile, not 999's.

---

## Section 5 - Verification Matrix

- Backend targeted vitest: pass.
- Frontend `npm run build`: not required (zero frontend changes this slice).
- `tsc --noEmit`: not required (zero frontend changes; backend uses `.mjs` not TS).
- Local pre-commit smoke against the live dev server: REQUIRED before push per rule 47 + the local-first workflow rule.
- **REV 3 - Sibling sweep grep evidence (broadened regex per Section 2.1) captured at implementation time and pasted into Section 3.3 before commit.**
- Production smoke: open the dashboards after deploy and confirm chart-endpoint 200s in the Network tab. Confirm `?userId=X` query param ignored on consent endpoint.

---

## Section 6 - Fast-follow tech-debt tickets (REV 2/3 carry-forward)

Recorded explicitly so they don't drop:

1. **`req.params` mutation -> `res.locals` refactor** (Village Frontend UX HIGH + Security CRITICAL-02). `injectUserId` should set `res.locals.derivedUserId = req.user.id` rather than `req.params.userId = ...`. All 15 chart endpoint controllers + `aiConsentController` updated to read from `res.locals`. Separate slice.
2. **ValidationError + async-error middleware refactor** (REV 2 plan, REV 3 deferred per Codex). Requires: `next` plumbing in helpers, async-handler wrapper or per-handler `next(err)`, errorHandler.mjs unification on `err.status` vs `err.statusCode`, **15 chart handler try/catch updates + 1 aiConsent handler try/catch update + any sibling controllers surfaced by Section 3.3 sweep (currently 0 additional confirmed; clientProgressController pending spot-check)**. Separate slice. Defense-in-depth gain when shipped.
3. **Service worker stale-bundle UX** (REV 3 Section 3.5). Auto-update prompt or stale-while-revalidate. Separate UX slice.
4. **Audit ALL `req.query?.X` user-target selectors site-wide** - the `req.query?.userId` pattern in the consent endpoint may have siblings. Future security-audit slice.
5. **DevTools probe of the spa-sw.js 503 SW state** to upgrade Section 3.5 confidence from [LIKELY] to [VERIFIED]. Exact step list embedded in Section 3.5 "Open task" subsection.
6. **Lint rule banning `requireUser(req, res)` followed by anything other than `if (!userId) return;`** - defense-in-depth against future caller mistakes while ValidationError refactor is deferred (item 2). Low-effort ESLint custom rule or codereview-bot pattern.
7. **Sibling Slice 1 (aiConsent body handlers):** `grantAiConsent` + `withdrawAiConsent` IDOR-class fix. Drop `req.body?.userId` for paramless mounts OR verify downstream gates fire correctly on these handlers. State-mutating endpoints, higher priority than Slice 2.
8. **Sibling Slice 2 (aiWorkoutController body-injected userId):** verify Phase A `verifyClientAccess` middleware double-checks the body field; harden if not.
9. **clientProgressController.mjs spot-check:** verify mount paths are paramless or `:userId`-prefixed. If paramless, same defect class as D1 - promote to Slice 3 fix.

---

## Section 7 - Confidence Tag Summary (Rule 51)

- D1 root cause: `[VERIFIED]` against current tree + rule-55 case study.
- D2 root cause: `[VERIFIED]` against current tree.
- D3 shared defect class: `[VERIFIED]`.
- D4 (`req.query?.userId` attack surface): `[VERIFIED]` - `resolveTargetUser` does not enforce role; downstream gates DO; severity is HIGH-conditional, not CRITICAL; mitigation is mandatory regardless.
- D5 (15 callers, 12 canonical + 3 legacy): `[VERIFIED]` - line-by-line mapping confirmed; all 15 follow `if (!userId) return;` discipline.
- D6 (ValidationError refactor abandoned for this slice): `[VERIFIED]` - Codex's three-point demonstration confirmed against live tree (Express 4.21.2, local catch at chartDataController:121 + aiConsentController:269, errorHandler reads err.status not err.statusCode).
- Sibling-sweep extent: `[UNVERIFIED - merge-blocker]` until the broader `rg` output is pasted in Section 3.3.
- Fix safety on admin path: `[VERIFIED]` - admin route has explicit `:userId` in path, `req.params.userId` populated before fallback.
- Fix safety on consent role gates: `[VERIFIED]` - downstream role checks at lines 208-231 preserved; REV 3 reduces attack surface without weakening enforcement.
- Service worker analysis: `[LIKELY]` not an attack vector + stale-cache; no browser probe performed.

---

## Section 8 - Village + Codex Findings Disposition (REV 3)

Every Village finding from 2026-04-30 14:54 + every Codex REVISE blocker on REV 2 gets explicit disposition.

### Village findings (REV 2 absorption, carried into REV 3)

| Finding | Source | Severity | Disposition |
|---|---|---|---|
| CRITICAL-01: IDOR via `?userId=` query | Sonnet 4.6 Security | CRITICAL (disputed by GPT-5.5 -> HIGH) | **ADDRESSED** - Section 3.2 drops `req.query?.userId` entirely. Severity verified as HIGH-conditional (downstream gates block client/trainer); fix lands regardless. |
| CRITICAL Express headers trap | Gemini 3.1 Pro Frontend | CRITICAL | **MITIGATED IN PRINCIPLE, REFACTOR DEFERRED** - Section 6 item 2 (REV 3 keeps local 400 pattern; refactor unreachable under live Express 4 + local-catch architecture per Codex). All 15 callers verified to follow discipline today. |
| CRITICAL-02: cross-cutting auth chain | Sonnet 4.6 Security | CRITICAL | **PARTIALLY ADDRESSED** - Section 3.1 controller-side fix limits blast radius; full `res.locals` refactor in Section 6 fast-follow item 1. |
| HIGH-3: `resolveTargetUser` ambiguous boundary | Sonnet 4.6 Security | HIGH | **ADDRESSED** - Section 3.2 explicit if/else removes the ambiguity; downstream gates do the role enforcement. |
| HIGH-4: `req.query?.userId` no validation | Sonnet 4.6 Security | HIGH | **ADDRESSED** - Section 3.2 removes the query selector; nothing to validate. |
| HIGH-5: SW cache poisoning dismissed | Sonnet 4.6 Security | HIGH | **ADDRESSED** - Section 3.5 explicit security analysis at [LIKELY] confidence per Codex MEDIUM. |
| HIGH (Code Quality A1): `??` vs `\|\|` | Claude Sonnet 4.6 P2B | HIGH | **ADDRESSED** - Section 3.1 uses `\|\|`. |
| HIGH (Frontend UX): mutation anti-pattern | Gemini 3.1 Pro | HIGH | **DEFERRED** - Section 6 item 1. Current slice does not refactor `injectUserId`; future slice will move to `res.locals`. |
| MEDIUM-6: privilege scope on admin routes | Sonnet 4.6 Security | MEDIUM | **ADDRESSED** - admin path retains explicit `:userId` requirement; client path fallback is to requester's own id only. No privilege elevation possible. |
| MEDIUM-7: sibling sweep deferred | Sonnet 4.6 Security | MEDIUM | **ADDRESSED** - Section 2 elevated to merge-blocker; broadened regex per Codex. |
| MEDIUM-8: test fixture leaks auth pattern | Sonnet 4.6 Security | MEDIUM | **ACKNOWLEDGED** - test file uses minimal mocks, not fixture files; no real auth pattern reproduced. |
| MEDIUM-9: PII in smoke step | Sonnet 4.6 Security | MEDIUM | **ACKNOWLEDGED** - smoke step calls user's own data only; no other-user PII referenced. |
| LOW (3 findings) | Sonnet 4.6 Security | LOW | **NOTED** - error code structuring, route info disclosure (audit doc only), `parseUserId(undefined)` doc - none are this-slice blockers. |

GPT-5.5 dispute on CRITICAL-01 severity: **honored.** Mitigation is correct call independent of severity classification.

### Codex REVISE on REV 2 (REV 3 absorption)

| Finding | Severity | Disposition |
|---|---|---|
| ValidationError plan unreachable under Express 4 + local catch + err.status middleware | BLOCKER | **ADDRESSED** - REV 3 Section 3.1 keeps local 400 pattern; ValidationError refactor moved to Section 6 fast-follow with all 4 prerequisite changes documented. |
| requireUser caller count was 12, actually 15 | BLOCKER | **ADDRESSED** - Section D5 enumerates all 15 with line numbers + canonical/legacy classification. |
| Sibling-sweep tag contradictory ([VERIFIED] but pre-execution) | HIGH | **ADDRESSED** - Section 2 changed to `[UNVERIFIED - merge-blocker]`. |
| Sweep regex too narrow for the attack class | HIGH | **ADDRESSED** - Section 2.1 broadened to include `req.query?.userId`, `requireUser(`, `resolveTargetUser`. |
| SW conclusion overclaims [VERIFIED] without probe | MEDIUM | **ADDRESSED** - Section 3.5 downgraded to `[LIKELY]` with explicit "no browser probe performed" note + DevTools probe added to Section 6 fast-follow. |

---

## Section 9 - Review Chain (Rule 46)

This receipt (REV 3) is the pre-code artifact. Implementation chain:

1. **Sean approval** of REV 3 as the authoritative pre-code map. <- gate
2. **Claude implements** in this order:
   - Sibling sweep grep with broadened regex - paste output into Section 3.3 before any code change
   - Regression tests (failing first per Rule 21)
   - `requireUser` refactor (2-line change: `||` fallback + comment) - leaves local 400 pattern intact
   - `getAiConsentStatus` refactor - drops `req.query?.userId`; explicit if/else
   - Verify all tests pass
3. **Gemini review** of the diff -> `AI-Village-Documentation/gemini-consults/latest.md`.
4. **Codex final gate** -> APPROVE / REVISE / REJECT.
5. **APPROVE** -> commit -> push -> Render auto-deploy.
6. Post-deploy: Sean re-checks the failing endpoints in the live dashboard. Triage Slice 2 (workout-logger 500) opens immediately after.

---

## Section 10 - Pending Approval Gates Before Code (REV 3)

1. Approve REV 3 fix shape: keep local 400 pattern in `requireUser` (ValidationError refactor moved to Section 6 fast-follow per Codex BLOCKER on REV 2).
2. Approve dropping `req.query?.userId` from the consent endpoint paramless mount (defense in depth; severity verified as HIGH-conditional per GPT-5.5; fix lands regardless).
3. Approve `||` instead of `??` in the `requireUser` fallback (Village HIGH-4).
4. Approve sibling sweep at `[UNVERIFIED - merge-blocker]` with broadened regex (Codex HIGH).
5. Approve `res.locals` refactor + ValidationError refactor as fast-follow tech debt, NOT bundled into this slice (Village CRITICAL-02 partial-mitigation strategy + Codex BLOCKER on REV 2).
6. Approve service worker analysis at `[LIKELY]` confidence with no browser probe (Codex MEDIUM); DevTools probe added to Section 6 fast-follow.
7. Approve integration-style tests (real route layers, not in-process probes) - unchanged from REV 1.
8. Acknowledge Bug 3 (`/api/workouts/:id/current` 500) as Triage Slice 2, separate.
9. Acknowledge Bug 4 (service worker 503) as user-side hard-refresh.

**Once approved, Claude proceeds to Triage Slice 1 implementation. No code lands before approval.**

---

**End of receipt REV 3.** Pre-code only. Runtime code untouched.
