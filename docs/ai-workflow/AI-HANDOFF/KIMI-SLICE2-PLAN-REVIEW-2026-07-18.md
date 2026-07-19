# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** C:/tmp/ss-logger-handoff-20260718/docs/ai-workflow/AI-HANDOFF/POST-SAVE-HANDOFF-SLICE-2-HANDOFF-2026-07-18.md
**Seed:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/023a7358-014c-4d44-b231-e8b8db3a61dd/scratchpad/kimi-slice2-seed.md
**Tokens:** 3649 in / 16000 out · **Cost:** ~$0.2509 · **Wall:** 536.3s

---

# KIMI K3 — HOSTILE REVIEW: Post-Save Handoff Slice-2 Work Order

## (a) VERDICT: **REVISE**

The architecture is sound and several calls are exactly right — the §2 receipt correction (attach to `POST /api/workout/sessions`, not the email endpoint), reuse of `assertAssignmentOrAdmin` (§4), fail-closed money-path posture (§2), additive-only migration shape (§3), and lazy-mount/portal conventions (§5). But I cannot LOCK a plan that wires a live-prod save path while its own §2 admits the **hero-path call site is untraced**, while §2's receipt **contradicts the data-model finding** (client form logger saves via `dailyWorkoutFormRoutes` → `WorkoutLog.bulkCreate` — possibly a *different* commit endpoint than the one we're attaching to), while the dual-source unification that decides whether the chart renders at all has **no normalization spec, no collision policy, and no both-sources precedence rule**, while §3's idempotency has an unhandled **TOCTOU unique race**, while §1 puts `pendingSync` — client queue state — in the **backend** assembler, and while there is **no server-side kill switch** on a money path. Not SEND-BACK: every defect is enumerable and closable in one revision cycle; the fold-ins below close them. Do not cut code until Step-0 (§e) lands.

---

## (b) WHAT'S WRONG / MISSING / RISKY — ranked by incident potential

**1. §2's receipt contradicts the CRITICAL FINDING — the hero path may not even hit the endpoint we're wiring.** The receipt says the canonical save for all three roles is `POST /api/workout/sessions`. The finding says the dominant human path (client form logger) writes via `dailyWorkoutFormRoutes → WorkoutLog.bulkCreate :1062`. If the form logger commits its WorkoutSession anywhere other than `workoutSessionController.createWorkoutSession`, attaching the handoff **only** there means the client-self hero moment (my rec #1) never fires. §2 lists the trace as a "still to" note; for a prod save-path wire it is a **blocking gate**. Fix: Step-0 trace (§e); factor assembly into one shared `assembleHandoff` helper invoked from **every** WorkoutSession-committing endpoint the trace finds (controller, and `dailyWorkoutFormRoutes` if it commits sessions).

**2. Dual-source unification is under-specified — and the failure modes are asymmetric.** Concretely:
- **Normalization spec:** missing. Mandate `trim → toLowerCase → collapse \s+ → ' '`. Nothing more. **No fuzzy matching, no stemming, no punctuation stripping.**
- **Collision policy:** asymmetric-risk ruling: a *false merge* (two real exercises conflated → fabricated all-time PR on a screen literally called "proof") is unforgivable; a *false split* ("Bench Press" vs "Barbell Bench Press" → underreported series) is recoverable. So: exact-match after normalization only; document underreport as accepted behavior.
- **Both sources in one session:** unspecified. Ruling (zero builder decisions): within `(sessionId, nameKey)`, **if any `logs` rows exist, prefer `logs`; else use `exercises→sets`**. Rationale: `WorkoutLog` rows are written *only* by an explicit human bulkCreate at save; normalized `Set` rows can originate from plan/MCP/structured generation (`workoutService`) where `weightUsed`/`repsCompleted` may be template placeholders — preferring them risks rendering **planned values as performed PRs**. Then dedupe within the winning source by `setNumber` (keep max weight on dup `setNumber`). Note: e1RM/PR maxima are duplicate-insensitive but **collision-sensitive**; volume is duplicate-sensitive — dedupe is mandatory regardless.
- **Invalid-set guards (new exposure from the logs path):** free-text logger ⇒ drop rows with `weight<=0 | null`, `reps<=0 | null`, `reps>36` (Epley validity cap). Bodyweight exercises (weight 0) silently vanish from proof — accepted for Slice 2, documented; do NOT build a bodyweight mode now.
- **PII vector:** `WorkoutLog.exerciseName` is **free text**. It must never appear in analytics events, server error logs, or the share stub payload. This is a zero-PII house-law enforcement point nobody flagged.
- **Units:** no unit column on either source. Do not convert; assume store-consistency; record as known risk.

**3. Money-path has a TOCTOU hole and no kill switch (§2/§3).** Pre-check-then-insert races: two concurrent retries both pass the pre-check, both insert → second throws `SequelizeUniqueConstraintError`. The catch-and-replay path is **required**, not optional: catch → fetch by `clientRequestId` → return `200 { deduplicated:true, session, handoff }` — **with handoff assembled on the replay path too** (the retrying client never saw response #1). Deduction must live **inside** the create transaction only, so a unique-violation rollback can never double-deduct or half-deduct. Separately: the only flag is `VITE_` (build-time, frontend). A prod incident on the save path needs a **server-side kill switch**: `ENABLE_POST_SAVE_HANDOFF` env, default `false`, assembler returns `null` when off. Missing = REVISE on its own.

**4. Migration cross-dialect details absent (§3).** Partial unique index is valid on PG and SQLite ≥3.8 (both also tolerate multiple NULLs under plain unique, so the partial is intent documentation — keep it). Missing: explicit fixed index name; `down` order (drop index **then** column — SQLite `removeColumn` recreates the table and will choke otherwise); the **write-lock window** (non-concurrent `CREATE INDEX` blocks writes on a shared 4-logger table during its scan — run off-peak, say so); and the Sequelize `where: { [Op.ne]: null }` idiom that generates `IS NOT NULL` on both dialects.

**5. Re-entry route is keyed on the wrong resource (§4).** `GET /api/workout-summaries/:id/handoff` re-imports the exact confusion the §2 receipt corrected — the handoff belongs to a **WorkoutSession**, not a summary email. Re-key to `GET /api/workout/sessions/:id/handoff`. The 404-not-403 rule (good, keep it) applies to both not-found and not-authorized. If summary-keyed re-entry is wanted later → Slice 3.

**6. `pendingSync` is in the wrong layer (§1).** The server cannot know the request was queued offline — by the time it arrives, it's just a request. `pendingSync` is **client queue state**; the frontend merges it into the view model. Slice-2 behavior on a queued save: no server response ⇒ **no handoff shown** (deep offline display is deferred, rec #8). The queued replay eventually returns `handoff` normally; showing it late is Slice 3.

**7. Analytics contract undefined (rec #3).** "Wire to the real sink" without naming the sink is a builder decision — forbidden. Contract below (§d F6): event names, payload schema, fire points, once-per-session dedupe, zero-PII (roles, headline kind, rule ids, booleans only — never `exerciseName`, never user/client ids).

**8. Client-vs-trainer UX gaps beyond authz.** Trainer-views-client-proof is authorized and fine — but **headline/declaration copy must be viewer-role-aware** ("Your client just hit a PR" vs "You hit a PR"), else it's a confusion leak if not a data leak. NBA for trainer viewer must yield trainerOnly-safe actions; for client viewer, `enforceClientSafety` already fails closed — keep. Share stays `eligible:false, reason:'not-owner'` for trainers (§1 correct). And the client sees **nothing** when the trainer logs — that's what makes the session-keyed re-entry route (item 5) load-bearing rather than optional.

**9. Headline 'first' can render an empty chart (§1 NOTE).** With dual-source, `isFirstEver` must mean "first session **with ≥1 proof-eligible set in either source**," and `'pr'`/`'first'` headlines must require a non-empty series — else the hero sees "First workout!" above a blank Victory chart. Guard in §d F4.

**10. Lazy-load/portal (§5) mostly right; three holes.** Suspense fallback needs a fixed-min-height skeleton (CLS pop on the proof zone); focus-trap and Esc tests must run **against the portal mount** (Slice-1 tests were in-tree); body scroll-lock while open. `SafeChart` reuse is correct — verify it exists as named in Step 0.

---

## (c) SLICE-1 DECISIONS THE WIRING EXPOSES AS WRONG

1. **Single-source loader (`exercises→sets` only)** — the headline defect. Slice-1's "proof from REAL logs" claim is false for the dominant client-form path until the dual-source loader lands. Do not repeat that copy in any Slice-2 doc until fixed.
2. **`isFirstEver` computed but unread** — now consumed by the headline map, but only with the empty-series guard (b#9) and redefined semantics ("first session with proof-eligible sets," either source).
3. **`pendingSync` typed as assembler output** — wrong layer (b#6); move to client-side merge.
4. **Single global `VITE_` flag** — no server kill switch on a money path (b#3). Add `ENABLE_POST_SAVE_HANDOFF` (backend, default off). Document that the VITE flip is build-time and happens only in Slice 3+ rollout.
5. **`share.reason` vocabulary unfrozen** — freeze the enum at `'owner' | 'not-owner'` for Slice 2; `reason` is diagnostic-only; keep the UI double-guard on `reason==='owner'`.
6. **Proof identity keyed on `exerciseId`** — migrates to `nameKey`; `ProofChart` display label = most recent raw `exerciseName` (trimmed) for that key.

---

## (d) PASTE-READY FOLD-INS

**F1 — `backend/utils/exerciseIdentity.mjs`** (shared, pure):
```js
export const normalizeExerciseName = (raw) =>
  (raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
// Identity policy (Slice-2, frozen): exact match after normalize.
// NO fuzzy matching — false-merge fabricates PRs; false-split only underreports.
```

**F2 — Migration** (`migrations/20260718000000-add-client-request-id-to-workout-sessions.cjs`):
```js
'use strict';
const TABLE = 'WorkoutSessions'; // Step-0: confirm against model tableName
const IDX = 'workout_sessions_client_request_id_uidx';
module.exports = {
  async up(qi, Sequelize) {
    await qi.addColumn(TABLE, 'clientRequestId',
      { type: Sequelize.STRING(64), allowNull: true, defaultValue: null });
    await qi.addIndex(TABLE, ['clientRequestId'], {
      name: IDX, unique: true,
      where: { clientRequestId: { [Sequelize.Op.ne]: null } }, // → IS NOT NULL; PG + SQLite ≥3.8
    });
  },
  async down(qi) {
    await qi.removeIndex(TABLE, IDX);        // index FIRST (SQLite table-recreate safety)
    await qi.removeColumn(TABLE, 'clientRequestId');
  },
};
// NOTE: non-concurrent build write-locks WorkoutSessions during scan — run off-peak.
```

**F3 — Controller wiring** (inside create handler; deduction stays in the create tx):
```js
let session;
try {
  session = await createSessionWithDeduction(/* existing logic */);
} catch (err) {
  if (err.name === 'SequelizeUniqueConstraintError' && req.body.clientRequestId) {
    const existing = await WorkoutSession.findOne({ where: { clientRequestId: req.body.clientRequestId } });
    if (existing) {
      const handoff = await safeAssemble({ viewerUserId: req.user.id, viewerRole: req.user.role,
        targetUserId: existing.userId, todaySessionId: existing.id, models });
      return res.status(200).json({ deduplicated: true, session: existing, handoff });
    }
  }
  throw err;
}
// ← commit point. Money path ends here. Everything below is best-effort.
const handoff = await safeAssemble({ viewerUserId: req.user.id, viewerRole: req.user.role,
  targetUserId: session.userId, todaySessionId: session.id, models });
return res.status(201).json({ deduplicated: false, session, handoff });
```

**F4 — `backend/services/postSaveHandoffAssembler.mjs`** (per-zone resilience + kill switch + headline guard; **no `pendingSync`**):
```js
const zone = async (fn) => { try { return await fn(); } catch { return null; } };
const resolveHeadline = (proof) => {
  const has = !!proof?.series?.length;
  if (has && proof.pr) return 'pr';
  if (has && proof.isFirstEver) return 'first';
  if ((proof?.sessionsThisWeek ?? 0) >= 3) return 'streak';
  return 'default';
};
export async function assembleHandoff(args) {
  if (process.env.ENABLE_POST_SAVE_HANDOFF !== 'true') return null;
  const proof = await zone(() => buildProofSeries(args));
  const nba   = await zone(() => resolveNextBestAction({ ...args, proofSeries: proof ?? null }));
  const share = await zone(async () => resolveShare(args)) ?? { eligible: false, reason: 'not-owner' };
  return { proof: proof ?? null, nba: nba ?? null, headline: resolveHeadline(proof), share };
}
export const safeAssemble = (args) => assembleHandoff(args).catch(() => null);
```

**F5 — Re-entry route** (session-keyed; 404 for both miss and unauthorized):
```js
router.get('/sessions/:id/handoff', protect, async (req, res) => {
  const s = await WorkoutSession.findByPk(req.params.id, { attributes: ['id', 'userId'] });
  if (!s) return res.sendStatus(404);
  const ok = await assertAssignmentOrAdmin(req.user.id, req.user.role, s.userId); // adapt to helper's actual throw/bool contract — Step-0
  if (!ok) return res.sendStatus(404);
  const handoff = await safeAssemble({ viewerUserId: req.user.id, viewerRole: req.user.role,
    targetUserId: s.userId, todaySessionId: s.id, models });
  if (!handoff) return res.sendStatus(404);
  return res.json({ handoff });
});
```

**F6 — Analytics contract** (`handoff/handoffAnalytics.ts`; sink = repo's existing tracker found in Step-0; if none exists, adapter no-ops in prod, consoles in dev, recorded as a finding — NO new endpoint):
```ts
export type HandoffEvent =
  | { name: 'handoff_shown';      viewerRole: Role; headline: HeadlineKind; proofPresent: boolean; deduplicated: boolean }
  | { name: 'nba_cta_tapped';     viewerRole: Role; ruleId: string }
  | { name: 'proof_share_tapped'; viewerRole: Role };
// handoff_shown fires ONCE per todaySessionId (ref-guard). FORBIDDEN in payloads:
// exerciseName (free text = PII), userId, clientId, session timestamps.
```

**F7 — Frontend mount** (portal + lazy + zone-parity):
```tsx
const ProofChart = lazy(() => import('./ProofChart'));
return createPortal(
  <HandoffShell /* existing a11y: focus-trap/Esc/restore — re-test against portal */>
    <Declaration … />
    <SafeChart fallback={null}>
      <Suspense fallback={<ChartSkeleton /* fixed min-height, CLS guard */ />}>
        {handoff.proof && <ProofChart series={handoff.proof.series} />}
      </Suspense>
    </SafeChart>
    {handoff.nba && <NextBestActionCard … />}
  </HandoffShell>, document.body);
// view-model merge: { ...response.handoff, pendingSync: saveWasQueued }
```

---

## (e) FINAL SLICE-2 BUILD ORDER — zero builder decisions

**STEP 0 — BLOCKING TRACES (no code until recorded in the work order):**
0.1 `grep -rn "workout/sessions\|workout-sessions\|dailyWorkoutForm" frontend/src/components/WorkoutLogger frontend/src/hooks frontend/src/services` → identify the **exact** client-form save endpoint(s); list every WorkoutSession-committing route; verify `/api/workout*` mount order (Rule 31).
0.2 Read `assertAssignmentOrAdmin` → record bool-vs-throw and whether it requires an **active** assignment.
0.3 Read `WorkoutLog` model → `weight`/`reps` column types; confirm `WorkoutSessions` tableName; confirm `Session.status` enum vs the NBA loader's query values.
0.4 `grep -rn "trackEvent\|analytics\.\|logEvent" frontend/src` → name the analytics sink for F6.
0.5 Confirm `SafeChart` exists as named.

**BACKEND:**
1. `backend/utils/exerciseIdentity.mjs` (F1).
2. Migration F2 — run `up`/`down`/`up` on SQLite (in-memory) **and** PG (test DB); assert legacy NULL rows untouched.
3. `backend/services/workoutProofLoader.mjs` (NEW, ≤300 lines) — dual-source include (`logs` + `exercises→sets→exercise`), map to common per-set shape `{sessionId, performedAt, nameKey, displayName, setNumber, weight, reps, source}`, apply guards (weight>0, 0<reps≤36), logs-win precedence + setNumber dedupe, limit 60, try/catch→null.
4. `backend/services/workoutProofSeriesService.mjs` (EDIT; split pure core into `workoutProofCore.mjs` if >300) — `pickProofExercise` + point identity on `nameKey`; display name = latest raw; `isFirstEver` = first session with ≥1 eligible set.
5. `backend/services/postSaveHandoffAssembler.mjs` (F4).
6. `workoutSessionController.mjs` (EDIT, F3) — + the same `safeAssemble` call at any session-committing endpoint found in 0.1 (incl. `dailyWorkoutFormRoutes` if applicable).
7. Route F5 in `workoutSessionRoutes.mjs`.

**BACKEND TESTS (node harness):** migration up/down both dialects; loader: logs-only / sets-only / both-sources precedence / casing-merge / no-fuzzy-split / dup setNumber / zero-weight drop; unique-race replay → 200 + one row + deduction once; assembler zone-failure matrix (proof throws → nba still resolves; all throw → `handoff` null, save still 201); headline guards; re-entry 404/404/200 matrix (missing / unauthorized / owner+trainer+admin).

**FRONTEND:**
8. `handoff/workoutHandoff.types.ts` (EDIT) — `pendingSync` out of `HandoffData` → into client view-model; add `deduplicated?: boolean
