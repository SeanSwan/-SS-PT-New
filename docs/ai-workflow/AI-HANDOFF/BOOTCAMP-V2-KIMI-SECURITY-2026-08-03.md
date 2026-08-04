# SwanStudios Kimi K3 Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** bootcamp-v2-review-packet.md
**Seed:** (none)
**Tokens:** 9164 in / 7327 out · **Cost:** ~$0.1374 · **Wall:** 417.9s

---

# KIMI — HOSTILE SECURITY REVIEW (SWA-105)

Scope honored: backend security only. Line numbers cite the appended diff.

---

## VERDICT ON TARGET #1 (the just-landed IDOR fix)

The `verifyClientAccess` gate is **correctly designed** — deny-by-default (`verifyClientAccess = async () => false`, bootcampAttendance.mjs ~L115), admin bypass, self-log carve-out, whole-roster reject **before any write** (~L140–150), and guests cannot smuggle a `userId` (`{userId, guest}` takes the userId branch first, ~L48–56, so it still passes through the gate). The already-recorded branch (~L128–130) runs **after** the ownership check and is read-only — **the idempotency path does not re-open the IDOR**, and guests don't either (they get roster rows, never forms).

**But the fix is NOT complete.** The gate authorizes the write; nothing protects the write itself. The idempotency guarantee is enforcement theater — it's a check-then-act with no transaction and no unique constraint, and that's where the real damage lives. Findings 1 and 2 below.

---

## RANKED FINDINGS

### F1 — HIGH: Idempotency TOCTOU race + transaction-less write loop → duplicate DailyWorkoutForms

**File/lines:** `bootcampAttendance.mjs` ~L128–130 (check), ~L152–161 (write loop + `saveClassLog`); route `bootcampRoutes.mjs` ~L215–230 (`createWorkoutForm`).

**Attack:** The "idempotent" guarantee is:
```js
if (classLog.attendance?.recordedAt) { return { alreadyRecorded: true, ... } }
// ... 60 sequential verifyClientAccess queries + 60 sequential inserts ...
await saveClassLog(classLog, { attendance, ... });
```
Two parallel requests (double-click, retrying client, or deliberate `Promise.all([fetch, fetch])`) both pass the `recordedAt` check — the window is *huge* because the verify loop and insert loop are sequential awaits — and both write a full set of `DailyWorkoutForm` rows. The `idempotencyKey` (`bootcamp:${classLog.id}:${userId}`) is stuffed into the `formData` JSON blob (route ~L222), **not a unique column**, so the DB enforces nothing. Same bug on the failure path: forms are created one-by-one outside any transaction; if `saveClassLog` throws (or insert #37 of 60 fails), the client gets a 500, retries, and **re-creates every form** — duplicates plus orphans, exactly the "double-award through a second path" bug class the file's own header claims to fear.

**Impact:** Corrupted client workout history, duplicated charts/streaks data on arbitrary clients-of-the-trainer, and a permanent integrity mess (no force flag exists to fix it — by design).

**Fix:**
1. Promote `idempotencyKey` to a real column on `DailyWorkoutForm` with a **unique index**; catch the unique-violation and treat as no-op.
2. Wrap the entire operation in one DB transaction: `SELECT ... FOR UPDATE` the class-log row (or an atomic conditional `UPDATE class_logs SET attendance=? WHERE id=? AND attendance IS NULL` and check affected-rows), then insert forms, then commit.
3. Until then, this endpoint's "idempotent" claim in the header comment is false advertising.

---

### F2 — HIGH-MED: Rule 8 holds for client PII, but exercise KEYS are an unsanitized free-text channel to the LLM

**File/lines:** `bootcampBrain.mjs` `buildBrainPrompt` ~L104–118 (`Keys: ${pool.map((ex) => ex.key).join(', ')}`).

**Attack:** Client names/notes/history do **not** reach the model — verified, only keys + `dayTypeId` + `headcount` (an aggregate count) + mode. That part of Rule 8 is clean. **But** Rolodex custom exercises are trainer-authored free text, and the key is interpolated raw into the prompt. Two consequences:
- **PII side-channel:** a key like `johns-post-op-knee-rehab-client-miller` (trainers name exercises after clients constantly) is PII reaching a third-party LLM provider — a Rule 8 breach the current "keys only" framing doesn't catch because it assumes keys are sterile.
- **Prompt injection:** keys are joined comma-separated with no escaping; a key containing `\nIgnore previous instructions...` is a direct injection vector. Blast radius is limited (subset validation discards inventions; worst case is a reordered class or injected `assumptions` text shown to the trainer), but `assumptions` are attacker-influenced strings rendered as UI chips.

**Fix:** Decouple wire-identity from prompt-identity: map each key to an opaque token (`ex_01…ex_N`) server-side, send tokens only, map back after `validateBrainOrdering`. This kills both the PII path and key-borne injection in one move. Additionally enforce a key charset/length allowlist (`^[a-z0-9_-]{1,64}$`) at exercise-creation time.

---

### F3 — MED: N+1 sequential authorization + sequential inserts → latency-amplification DoS

**File/lines:** `bootcampAttendance.mjs` ~L142–150 (`no-await-in-loop` verify), ~L152–156 (insert loop).

**Attack:** Worst-case request = 60 sequential `ClientTrainerAssignment.findOne` round-trips **then** 60 sequential `DailyWorkoutForm.create` round-trips — ~120 serialized DB hops per call. A trainer (or anyone who compromises a trainer session) scripting this across many class logs holds connections and inflates pool pressure far beyond the request count. The 60-cap bounds the body but not the amplification.

**Fix:** Batch the authorization check into one query: `findAll({ where: { trainerId, clientId: { [Op.in]: registeredIds }, status: 'active' } })` and diff the sets. Use `bulkCreate` for forms (inside the F1 transaction). Also add endpoint rate-limiting — none is shown.

---

### F4 — MED-LOW: Unbounded LLM response before regex/parse; timeout leaks resources

**File/lines:** `bootcampBrain.mjs` ~L155–165.

**Attack (requires provider compromise or successful injection):** `raw` goes straight into `String(raw).match(/\{[\s\S]*\}/)` and `JSON.parse` with **no length cap** — a multi-hundred-MB response is a memory/CPU event per generation request. Secondary issues: the `setTimeout` in the race is never `clearTimeout`-ed (keeps the event-loop timer alive after success), and the losing `completionFn` promise keeps running to completion after a timeout — repeated timeouts pile up billable provider calls (cost DoS). Note: the request **cannot hang** — the race guarantees settlement within `timeoutMs`, and `Promise.race` keeps handlers attached so a late rejection isn't unhandled. That part of the target holds. Also clamp `SWAN_BOOTCAMP_BRAIN_TIMEOUT_MS` — currently `Number(env) || 8000` accepts `99999999` (ops-set, but defense in depth).

**Fix:** Reject `raw.length > 64KB` before parsing; `clearTimeout` on settle; pass an `AbortSignal` to the provider call; clamp timeout to e.g. 1s–30s.

---

### F5 — LOW: Crafted muscle strings — normalization cost unbounded; `__proto__` lookup fragility

**File/lines:** `dayTypeContract.mjs` `toCoreMovement` ~L122–135; `MUSCLE_REGION[primaryToken]` lookup.

**Attack:** A trainer with Rolodex write access creates exercises with megabyte-long `muscles` JSON strings; every generation re-runs `normalizeMuscleList`/`canonicalizeMuscle` per exercise (that code is **not in the diff** — ReDoS resistance is unverifiable; flag for follow-up). Classification itself fails closed (unknown → excluded, never guessed in — good). Separately, `MUSCLE_REGION` is a plain object: `MUSCLE_REGION['__proto__']` returns `Object.prototype` (truthy), so `primaryRegion` becomes an object; it happens to be rejected later by `Array.includes` (SameValueZero), so **not exploitable today**, but it's one refactor away from a hole.

**Fix:** Length-cap muscle fields at ingestion (e.g., 200 chars/token, 20 tokens); make `MUSCLE_REGION` a `Map` or guard with `Object.hasOwn`. Audit `bootcampTaxonomy.mjs` normalization for regexes over untrusted length.

---

### F6 — LOW: Minor information handling

- **403 echoes the probed ID** (`Not authorized to log attendance for client ${clientId}`, ~L149): it only reflects attacker-supplied input and reveals nothing about *other* trainers' relationships — but drop the ID from the message anyway; it's log-worthy, not client-worthy.
- **Guest labels** (~L56: trimmed, 60-char slice) are injection-safe at the DB layer (parameterized) but are a **stored-XSS sink** the moment any surface renders them raw. Strip control characters server-side; rendering escape is the UI seat's problem but the contract should be documented.
- **No temporal check:** attendance can be recorded against a future-dated `classDate`. Data-integrity, not authz — consider rejecting `classDate > now`.

---

## TARGETS THAT HOLD

- **Subset-validation bypass (target #2):** `validateBrainOrdering` (~L76–90) is sound — every key must be a string, present in the pool `Map` (`Map.has('__proto__')` is safe), non-duplicate, non-empty, else **wholesale null**. There is no path for the LLM to introduce an exercise. Minor hardening: pre-check `keys.length <= pool.length` to fail faster on giant arrays.
- **404 existence oracle (target #1 residual):** **Closed.** Wrong-trainer and missing-log both 404 via the same `notFound` (~L122–126), checked before any other branching; the already-recorded branch can't be reached without ownership. Residual timing delta between "row missing" and "row not owned" is negligible. Admins get an oracle — acceptable, they're trusted.
- **Timeout hang (target #2):** Cannot hang; see F4 for the resource-leak residue.

## UNVERIFIABLE / ASSUMPTIONS (must confirm before merge)

1. **Route-level auth middleware is not in the diff.** The handler dereferences `req.user.id`/`req.user.role` — if this router is ever mounted without the auth chain, behavior is fail-closed (NaN → 404) but confirm `requireAuth` + trainer-role gating exists, and that `role` comes from a verified JWT, never the body. The entire admin bypass inherits the integrity of that one claim.
2. **Target #4 (equipment feasibility + snapshot): no diff was provided.** The only aggregate observed reaching the LLM in the appended code is `headcount` (a count — clean). No per-person data path exists *in the shown code*, but "confirm no per-person path" is **unverifiable** without the feasibility/snapshot source. Request it.
3. `runLadder`, `alwaysLegalTopUp`, and `normalizeMuscleList` are imported but not shown — the R5 "still day-legal" claim and muscle-string DoS resistance rest on unaudited code.

---

## MERGE BLOCKERS

**F1** (race/transaction — the idempotency guarantee is currently unenforced) and **F2** (opaque-token mapping for LLM keys) should block. F3 is a strong should-fix. Everything else is hardening.
