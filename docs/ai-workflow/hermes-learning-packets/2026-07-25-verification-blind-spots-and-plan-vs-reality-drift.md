---
originating_model: claude-opus-5[1m]
tier_gate: PASS
date: 2026-07-25
topic: Four durable failure classes from the Swan Coach Hive-Mind C0/C0.5/C1 arc — planning-doc drift, advisory guards, the guard-regex blind spot (3 instances), and the silent-empty defect
surfaces: [swan-coach-command-lane, ai-dispatchers, ai-chat-enrichment, client-intake-pipeline, backend-eval-harness]
---

> **Tier note.** `claude-opus-5` designated at/above Fable's level by Sean 2026-07-25, using Rule 68's own designation mechanism. Opus 4.8 and below remain blocked. This packet is a **backfill** for three slices closed before that designation.

## What was decided/built (Fable-tier lesson)

A three-slice arc on the Swan Coach lane: **C0** located the lane, **C0.5** fixed a live wrong-client write and shipped it to production, **C1** traced the intake pipeline and fixed two silent enrichment defects. The individual fixes matter less than the four classes below — each one changed how the *next* slice was written, and the third class recurred **three times in three consecutive slices** before it was named.

---

### Class 1 — Planning documents describe the codebase an author *remembers*, not the one that exists

A master prompt, hostile-reviewed by two models and carrying a verified file inventory, asserted the Coach backend was **missing** and had to be located. It wasn't missing — it was `backend/services/ai/`, the largest service tree in the app: **165 files, 19 command registries, 49 dispatchers, ~119 commands**. The prompt's *file counts* were exact (369/203/160/64/10, `WorkoutLogger.tsx` 866 — all re-verified). Its *interpretations* were wrong.

Across the arc, **six** planned "build this" items turned out to be already built: the Coach backend, a CI-wired eval harness, the eval harness's own golden-scenario seed (written, never imported), the event bus, the typed-intent schema *with a confidence field*, and — the largest — the entire "informed mind" enrichment layer, which already assembled **21 client data sources** including movement screens, pain entries, and the onboarding questionnaire.

- **Rule:** before building from a plan, trace what exists. A builder who took that prompt literally would have rebuilt four working systems and shipped exactly the drift the program existed to remove.
- **The tell:** a plan that says a subsystem is "missing" or "unknown" is asserting a *negative*. Negatives are cheap to write and expensive to verify, so they are where drift accumulates. Verify every "does not exist" claim before scoping work around it.
- **Corollary:** the file inventory being exact is what made the wrong interpretations credible. Precise numbers next to an unverified conclusion are a trust amplifier, not evidence for the conclusion.

### Class 2 — An advisory guard is not a guard

`clientScope.mjs#resolveCommandClientId` encoded the correct precedence — the trainer's selected client beats the speech classifier's extracted id — in 14 lines. **21 of 49 dispatchers called it. Four did not**, and two of those four were live defects on write paths, one of them **destructive** (`dispatchCancelSession` fed the classifier's id into the query deciding *which session to cancel*).

Every other dispatcher family had a hand-written client-scope test. **Nothing tested the rule across the set**, so a new dispatcher could silently opt out — and two did.

- **Rule:** a shared helper that callers must remember to call is a convention, not an invariant. If correctness depends on universal adoption, write an **executable law over the whole set** with an empty allowlist, not N per-file tests.
- **Detection heuristic:** for any shared safety helper, compute adoption as a ratio. `21/49` was the finding. The helper's existence was mistaken for the property holding.
- **Inline copies are the same bug wearing a disguise.** Two dispatchers hand-rolled `Number(resolvedClient?.id ?? params.clientId)` — equivalent precedence, but it yields `NaN` for a malformed id where the shared helper validates and falls back. No downstream `NaN` guard existed. Converging them was a real fix, not tidying.

### Class 3 — A guard regex finds the shape you imagined, not the shapes that exist ⚠ RECURRED 3×

The single highest-yield lesson of the arc, because it happened **three times in three consecutive slices**, each time in a different language surface, each time producing a confident and wrong "this doesn't exist" conclusion:

| # | Slice | Searched for | Actual form in code | Consequence |
|---|---|---|---|---|
| 1 | C0 | `window.SpeechRecognition` | `speechWindow.SpeechRecognition` (aliased first) | Missed one of the speech implementations |
| 2 | C0.5 | `params.clientId` | `const { sessionId, clientId, date } = params` (destructured) | **Missed the destructive cancel defect entirely** |
| 3 | C1 | `clientContext\|coachContext\|intake` in the Logger | fetches `/api/workout-builder/corrective-recommendations` | Wrongly concluded the Logger had no intake context |

Instance 2 is the expensive one: a property-access-only pattern let a **destructive wrong-client write** pass an audit that was explicitly hunting for exactly that bug.

- **Rule:** enumerate **access shapes** before trusting a count — property, optional-chained (`a?.b`), destructured (`const { b } = a`), bracket (`a['b']`), signature-destructured (`fn({ b })`), and aliased (`const x = window; x.b`).
- **Stronger rule:** to conclude a surface *lacks* something, enumerate what it **actually does** (its real API calls, its real imports) rather than grepping for what you expect it to have. Absence proven by keyword search is not proven.
- **Where this became durable:** the C0.5 invariant test now matches both property access **and** destructuring, because the destructuring blind spot is precisely how the destructive path escaped the original sweep.

### Class 4 — The silent empty: code that is correct, throws nothing, and quietly degrades

Two C1 defects shared a shape with no error, no log, and no test failure:

**(a) Wrong subject, valid SQL.** The Coach enrichment filtered `equipment_profiles."trainerId" = :userId` where `:userId` was the **client**, but `trainerId` is the *owning trainer*. Clients own no profiles → zero rows, always. Coach recommended exercises equipment-blind for every client, indefinitely.

**(b) Absence indistinguishable from emptiness.** Every enrichment block is `if (rows.length > 0) push(...)`. An empty source emitted **nothing**, so Coach could not tell *"screened, no compensations found"* from *"never screened"* — and answered with identical confidence either way. Structural, not incidental: client intake is written by **three separate surfaces**, and completing onboarding populates only one, so a new client legitimately has holes.

- **Rule:** when auditing a read/context/enrichment layer, the question is not "does it run" but **"what does it look like when it finds nothing, and can the consumer tell the difference between *nothing found* and *never looked*?"**
- **The anomaly is the evidence.** What identified (a) was not reading the query — it was noticing **20 of 21** enrichment sources key on `"userId"` and exactly one keys on `"trainerId"`. A single inconsistency in an otherwise uniform set is a stronger defect signal than any line looks in isolation. Sweep for uniformity, then investigate the outlier.
- **Fixing false confidence can manufacture false uncertainty.** The first absence-marker draft warned Coach against inferring "no injuries" *even when pain records were on file*. Scope every such warning strictly to what is actually missing, or you trade one lie for another.

---

## Method lessons that generalize beyond this codebase

- **Extract to make testable.** The intake-coverage and event-log logic were put in small pure modules rather than inlined, because their hosts are 2267 and 202 lines. That extraction is what converted "CI-deferred, not claimed" into genuinely executed proof.
- **When the test runner cannot be installed, execute anyway.** `node_modules` is empty in every local tree here. Two techniques recovered real proof: (1) a **minimal `vitest` shim** (`describe`/`it`/`expect`) dropped into gitignored `node_modules/vitest` so the **real committed test files run in place** — copying them to a scratch dir breaks relative imports and does not work; (2) `node --experimental-strip-types` to execute TypeScript modules directly. Both produce evidence, not assurances.
- **Clean-apply is not verification.** A cherry-pick that applies without conflict can still be wrong; re-run the full proof on the rebased tree before pushing.
- **Blast radius × verification depth decides what ships, not correctness.** Two finished, correct changes were treated differently: a 17-line security fix with RED→GREEN proof shipped immediately; a SQL-subject change on the hot path of *every* Coach enrichment was **held**, because it could not be executed against a real database. Both were right. Only one was verified enough for production.

## Standing gap this arc exposed

**This repo publishes no release/commit marker.** `/health` returns only `{status, timestamp, server, checks, message}`, and no `RENDER_GIT_COMMIT`/`releaseSha` exists anywhere in routes/server/core. Every backend deploy can therefore be confirmed *up and not crash-looping* but **never confirmed to be running the pushed commit**. One `/health` field echoing `process.env.RENDER_GIT_COMMIT` would make deploy verification real instead of inferential, and would retire a disclosure that otherwise recurs on every single backend ship.

## Provenance & privacy

`originating_model: claude-opus-5[1m]`, designated Fable-tier by Sean 2026-07-25. Sanitizer PASS — IDs and roles only, no client names, no PII, no credentials, no absolute paths. Client references are synthetic (`42`, `99`) or schema field names.
