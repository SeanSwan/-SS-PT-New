# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/023a7358-014c-4d44-b231-e8b8db3a61dd/scratchpad/kimi-slice2-wiring-review.md
**Seed:** (none)
**Tokens:** 3854 in / 16000 out · **Cost:** ~$0.2516 · **Wall:** 512.7s

---

VERDICT: **REVISE** — architecture is sound (after-commit placement, `safeAssemble` never-throws, partial unique, 404-no-leak authz, no deduction touch on the form path are all correct), but there are two P0 defects in the idempotency implementation that will either take the structured route down entirely or leak one user's session to another. Neither requires redesign — both are precise edits.

---

## RANKED FINDINGS

### F1 — BLOCKER — Migration writes a camelCase column into a snake_case table; model has no `field` mapping

**Location:** migration `20260718120000` — `const COLUMN = 'clientRequestId';` → `addColumn(TABLE, COLUMN, …)` → `addIndex(TABLE, [COLUMN], { where: { [COLUMN]: … } })`; model — `clientRequestId: { type: DataTypes.STRING(64), … }` with **no `field:`**.

**Concrete failure:** The table is `workout_sessions` (snake_case; columns like `user_id`, `total_weight` — your zod uses `totalWeight`, which only works if the model maps camel attributes to snake columns, i.e. `underscored: true` or explicit `field`s). The migration creates a quoted camelCase PG identifier `"clientRequestId"`. If the model is underscored, `WorkoutSession.create(sessionData)` emits `INSERT … "client_request_id"` → **column does not exist → every structured save 500s**. If the model is *not* underscored, the migration column matches but is inconsistent with every other column and the replay `findOne({ where: { clientRequestId } })` semantics diverge from the rest of the codebase. Either way, as written, the attribute↔column contract is unverified and most likely broken — and since the whole idempotency feature hangs off this column, **an unmapped column means idempotency silently dies or the route dies loudly**. This is exactly the "Sequelize model attribute vs the DB column" trap you flagged.

**Exact fix:**
```js
// migration
const COLUMN = 'client_request_id';
// describeTable guard: if (!table[COLUMN]) — now checks the snake name
// addIndex where: { client_request_id: { [Sequelize.Op.ne]: null } }
```
```js
// model — keep the camel attribute (all route code uses it), pin the column:
clientRequestId: {
  type: DataTypes.STRING(64),
  allowNull: true,
  field: 'client_request_id',
  comment: '…'
}
```

---

### F2 — BLOCKER (security) — Replay path is a cross-user IDOR: unique key is global, lookup is unscoped, response returns the victim's row

**Location:** `workoutSessionRoutes.mjs` POST `/` —
```js
const existing = await WorkoutSession.findOne({ where: { clientRequestId } });
if (existing) {
  …
  return res.status(200).json({ session: existing, handoff, deduplicated: true });
}
```
plus the migration's single-column unique index on `clientRequestId` alone.

**Concrete failure:** `clientRequestId` is client-supplied. Because the unique index is global (not per-user) and the replay lookup never checks ownership, client A who sets a key already used by client B gets a `SequelizeUniqueConstraintError`, then `findOne` returns **B's session row — including `notes` (free text)** — serialized into A's response as `{ session: existing }`. That's a guessing-based read oracle on `workout_sessions` created by the idempotency feature itself. Even benign same-key-different-payload collisions across users return the wrong user's data.

**Exact fix — scope the key per user at the DB layer and the lookup:**
```js
// migration: composite partial unique
await queryInterface.addIndex(TABLE, ['user_id', 'client_request_id'], {
  name: 'workout_sessions_user_id_client_request_id_uidx',
  unique: true,
  where: { client_request_id: { [Sequelize.Op.ne]: null } },
  transaction,
});
```
```js
// route: scoped replay + mismatch is a conflict, not a success
const existing = await WorkoutSession.findOne({
  where: { clientRequestId, userId: sessionData.userId },
});
if (existing) { /* replay 200 as built */ }
else { return res.status(409).json({ success: false, message: 'Duplicate submission conflict' }); }
```
With the composite index, two users may legitimately reuse the same key value; a violation can then only come from the same user's retry, and the unscoped-leak window closes structurally rather than by convention.

---

### F3 — HIGH — Replay triggers on *any* unique violation, not the idempotency constraint

**Location:** POST `/` — `if (err?.name === 'SequelizeUniqueConstraintError' && clientRequestId)`.

**Concrete failure:** If the create fails on a *different* unique constraint (today or any future one added to this shared-by-4-loggers table), and the body happened to carry a `clientRequestId` that matches an older row, the handler returns that older row with `deduplicated: true` and HTTP 200 — a **false success for a save that never happened**. On a route with no deduction this is "only" data-integrity lying; the pattern must still be fail-closed.

**Exact fix — gate on the constraint identity:**
```js
const isIdemConflict =
  err?.name === 'SequelizeUniqueConstraintError' &&
  (err?.parent?.constraint === 'workout_sessions_user_id_client_request_id_uidx' ||
   (err?.fields && typeof err.fields === 'object' && 'client_request_id' in err.fields));
if (isIdemConflict && clientRequestId) { /* scoped replay */ }
throw err;
```

---

### F4 — HIGH (money path) — Form-plan as written can still 500 *after* a committed deduction

**Location:** `dailyWorkoutFormRoutes.mjs`, planned insertion after `await transaction.commit()` (~line 1171).

**Concrete failure:** `safeAssemble` itself never throws (`zone()` per zone + `.catch(() => null)` — verified), but the *surrounding expressions* can:
1. `todaySessionId: workoutSession.id` — you asked (a): yes, if any branch links the form to a pre-existing scheduled Session differently or leaves `workoutSession` unset, this is a `TypeError` **after commit** → outer catch → 500 → client sees failure after a successful `availableSessions` deduction. `sessionDeducted` prevents a *double* deduction on retry, but you've still violated "must not 500 after a successful deduction" and trained the client to re-submit.
2. `models: getAllModels()` is evaluated eagerly in the argument object — if the registry call throws, same 500-after-commit.
3. Any future refactor swapping `safeAssemble` → `assembleHandoff` reintroduces throw-ability at the call site.

**Exact fix:** guard + isolate. Full edit in the last section.

---

### F5 — MEDIUM (operational) — Non-concurrent unique index build inside a transaction write-locks `workout_sessions`

**Location:** migration `up()` — `addIndex(…, { transaction })` inside an explicit tx.

**Concrete failure:** Your comment acknowledges "run off-peak," but the real issue is that wrapping in a transaction *precludes* `CONCURRENTLY` on Postgres. The partial predicate means the index will contain zero existing rows (all NULL), but PG still heap-scans the whole table holding a lock that blocks writes from all 4 loggers for the duration. On a large `workout_sessions`, that's a write outage on the money path.

**Exact fix:** `addColumn` inside the tx (metadata-only, fast), then dialect-conditional index build *outside* the tx:
```js
await transaction.commit();
if (queryInterface.sequelize.getDialect() === 'postgres') {
  await queryInterface.addIndex(TABLE, ['user_id','client_request_id'], {
    name: INDEX, unique: true, concurrently: true,
    where: { client_request_id: { [Sequelize.Op.ne]: null } },
  });
} else { /* SQLite/CI: in-tx addIndex as built */ }
```

---

### F6 — MEDIUM (zero-PII) — Error logging can carry query detail; NBA strings unverifiable

**Location:** re-entry route — `console.error('Error building session handoff:', error);`

**Concrete failure:** A Sequelize error object can include `sql`/`parameters`. `WorkoutLog.exerciseName` is free text; a failing proof-series query logged in full can put user-entered exercise names (or bound values on constraint errors — cf. PG's `Key (client_request_id)=(…) already exists`) into server logs. Also: I cannot see `resolveNextBestAction` — if any NBA message interpolates `exerciseName`, the PII rule ("chart only") is broken in the `nba` zone of the response.

**Exact fix:** log sanitized — `console.error('Error building session handoff:', error?.name, error?.message);` (still can include constraint values on PG — prefer a static string + `error?.name`). Verify `nextBestActionResolverService.mjs` never string-interpolates exercise names.

---

### F7 — LOW / must-verify-before-push (I cannot see these from the excerpts)

1. **Imports**: the shown "new lines" import block adds `WorkoutLog`, `User`, `getAllModels`, `safeAssemble` — but the handlers use `sameId`, `isPrivileged`, `assertAssignmentOrAdmin`, `z`, `protect`, `validationMiddleware`, which are *not shown*. If any is missing → `ReferenceError` → 500 on every request. Confirm they exist in the pre-existing header of `workoutSessionRoutes.mjs`.
2. **`useWorkoutMcp` status check**: replay returns **200**, first-save presumably **201**. Your additive-safety reasoning holds *only if* the client relies on axios default `validateStatus` (2xx). If anything does `status === 201`, a deduplicated retry reads as failure. Grep it.
3. **Resolver fail-closed on role**: `req.user.role` is reliable (same `protect` payload the route already feeds to `isPrivileged(req.user.role)`), but `resolveNextBestAction` must treat `undefined`/unknown role as least-privilege (client framing), never as trainer. Verify.
4. **First-save shape**: include `deduplicated: false` explicitly so `{session, handoff, deduplicated}` is shape-stable across both exits.
5. **Form success payload** doesn't already define a `handoff` key you'd be clobbering.

---

## PASS ITEMS (verified, no change)

- **Money-path fail-closed, structured route:** between `WorkoutSession.create` and `res.json` there is exactly one await — `safeAssemble` — which cannot throw (`zone()` wraps both proof and NBA; `resolveShare`/`resolveHeadline` are non-throwing sync; `.catch(() => null)` backstops). No 500-after-save path exists as built. Structured route does no deduction, so replay cannot double-deduct. ✅
- **Zod passthrough:** `clientRequestId: z.string().max(64).optional()` is *declared*, so it survives whether `validationMiddleware` reassigns `req.body = schema.parse(...)` (strip mode) or validates in place. `.max(64)` matches `STRING(64)`. ✅
- **Re-entry authz:** miss→404 *before* authz, unauthorized→404, self OR `assertAssignmentOrAdmin`, full-catch→404 — no existence leak, no 403 oracle. `/:id/handoff` can't be shadowed by a `/:id` route (different segment count). Non-numeric `:id` → PG cast error → catch → 404. ✅ (404-on-infrastructure-error masks outages; acceptable as an intentional no-leak tradeoff.)
- **`targetClientId` logic** (viewer≠target ⇒ NBA gets ADJUST_PLAN context; self-log ⇒ null) and **`resolveShare`** (owner-only, string-coerced id compare) are correct, including trainer-logs-for-client and admin-self.
- **`down()` ordering** (index then column, for SQLite table-recreate) is correct; error-swallowing in `down` is tolerable.
- **Your additive-safety reasoning on `{session, handoff, deduplicated}` — CONFIRMED.** `useWorkoutMcp` returns `response.data` whole; callers read `.session`; adding keys to a JSON object cannot break destructuring or property access, and nothing echoes the response back into a request body. The only ways this breaks are a strict `===201` check (F7.2) or strict response-schema validation (frontend JS — none). Same argument covers adding `handoff` to the form response. ✅
- **(a) After-commit placement — CORRECT and mandatory.** Inside the tx it would hold locks on the deduction path, and a rollback would leave a handoff referencing a phantom session. After commit the save is durable and the handoff is definitionally best-effort. The scheduled-Session case is fine (the row exists, so `.id` exists) — the hazard is only an unset variable, handled by the guard below.
- **(d) `targetUserId = parsedClientId` — semantically right** (it's the client whose `availableSessions` was decremented), but the record owner is the more authoritative source — prefer `workoutSession.userId ?? parsedClientId`.
- **No `clientRequestId` on the form path — CORRECT.** Two idempotency mechanisms on one write path is how you get double-guard confusion; `sessionDeducted` remains the single source of truth. Form-path creates leave the new column NULL, so the partial index never engages there.

---

## THE PRECISE FORM-PATH EDIT

In `dailyWorkoutFormRoutes.mjs`, imports (match local naming if the registry is imported differently):
```js
import { getAllModels } from '../models/index.mjs';
import { safeAssemble } from '../services/postSaveHandoffAssembler.mjs';
```

Immediately **after** `await transaction.commit();` (~line 1171), **before** the existing success `res.json(...)`:
```js
// ── Post-Save Handoff (Slice-2). BEST-EFFORT + FAIL-CLOSED. ─────────────────
// The save and the availableSessions deduction are COMMITTED above. Nothing in
// this block may throw: a handoff failure must never 500 a completed money path.
let handoff = null;
try {
  if (workoutSession?.id) {                       // guards scheduled-session / null branches
    handoff = await safeAssemble({
      viewerUserId: req.user.id,
      viewerRole: req.user.role,                  // (c) reliable: same `protect` payload the
