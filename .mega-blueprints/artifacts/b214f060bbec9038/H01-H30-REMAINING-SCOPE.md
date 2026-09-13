# H01–H30 REMAINING SCOPE — scoping pass, 2026-09-13

**Status: SCOPED, NOT STARTED.** This document exists so the next slice begins from a bounded
plan instead of a re-read of the register. It asserts no implementation.

---

## ⚠ SUPERSEDED IN PART — read this banner before the body (added round 113)

A hostile review of this file found that its **status sentences went stale while its scope analysis
stayed good**, and that two of its claims about the code are simply wrong. The body below is kept as
the point-in-time record it is; this banner is the current truth. Where a body claim is *false about
the code itself* (not merely overtaken by later work), it is also corrected inline and marked.

| Body claim | Current fact (round 113) |
|---|---|
| "The durable **taught-log record** (H29 `ClassLog` migration) is **not started**" (`:135`) | **DONE.** Model `BootcampClassLog.mjs`, service `sprintSlotTaughtLog.mjs`, link + counter in `sprintConfirmSlot.mjs`, unit suite `bootcampTaughtIdempotency.test.mjs` and a real-PostgreSQL block incl. a two-connection row-lock proof. The migration exists as a fixture-only script by packet constraint (no production migration). |
| "step 4 **NOT DONE** — no test drives `onProgress` with `{type:'error',interrupted:true}`" (`:338-342`) | **DONE.** `frontend/src/components/SprintPlanner/SprintPlannerPage.terminalNotice.test.tsx:95-102` emits exactly that event and asserts the notice text. |
| "did **not** advance H09, H15–H18, H20 or H28, and H29 is half done" (`:500-502`) | **H09, H20, H28 and H29 are all in this packet's scope** and covered by the readiness receipt §2 — H09 media identity (`bootcampTemplateMedia.mjs`), H20 progression (`sprintProgression.mjs`, `sprintProgressionPolicy.mjs`, `workIntervalProgression.mjs`), H28 attendance truth (`bootcampAttendance.mjs`), H29 taught-log identity. |
| "The H-register is at D/E/F unstarted" (`:484`, `:498`) | Superseded by the receipt's §2/§5, which are the current register. |
| Line counts (`:131`, `:336`) | Stale: `sprintGenerator.mjs` is **246** (was 299) and `SprintPlannerPage.tsx` is **298** (was 287). Both under the 300 cap; measured by the rule-4 `split(/\r?\n/).length` metric, which reads one higher than a physical line count. |

**Two claims below are false about the code at any date, and are corrected inline:** the
`generationVersion: null` residual (`:57-64`) and the `sprintStream` event-id claim (`:145-146`).


## Why this is not a findings list

`s08-architecture.md:3` states it directly:

> "Claim fencing, atomic memory, durable reconnect, taught-log idempotency and frontend stream
> recovery **remain separately pending**; do not mark those complete from an access-control
> patch."

Those are **features with acceptance criteria**, not defects to close. S08's authorization work
— which is finished and locked — deliberately does **not** discharge them, and the architecture
doc says so before the fact so nobody could claim otherwise. The diagnosis-and-fix loop that
closed ~30 findings this session is the wrong instrument for them.

## What is provably done

| Requirement | Evidence |
|---|---|
| R-H01 (H01) admission / trusted fields | `bootcampTemplateSaveSafety.test.mjs`, `bootcampTemplateValueHardening.test.mjs`, `bootcampTemplateSaveRealShape.test.mjs` |
| R-H02 (H02) real-PostgreSQL persistence | `bootcampTemplatePersistence.integration.test.mjs` — **5/5 exit 0** on the owned fixture, including mid-write rollback and RETURNING-order verification |
| R-H03 (H03) Sprint object authorization | `sprintAccess.test.mjs`, `sprintServiceOwnership.test.mjs`, `sprintRoutesErrorMapping.test.mjs` (mounted route, hostile driver error) |
| R-H06 (H06) calendar safety | `sprintCalendarContract.test.mjs` — now with a **host-independent** TZ parity test |
| R-H13 (H13) library-state engine | `exerciseSearchLibraryState.ts` + F3/F4 locks |

## What remains — bounded slices, in dependency order

### A. Claim fencing (R-H04 part 1) — **ALREADY IMPLEMENTED; this scoping doc was WRONG**

**Correction, round 39.** This section previously asserted *"there is no fencing token, so two
callers can both observe `status !== 'generating'` and both proceed."* **That was inferred from
the pattern, not read from the code, and it is false.** `sprintGenerator.mjs:95-106` already
implements a proper compare-and-swap:

```js
const currentVersion = sprint.generationVersion;
const [affectedRows] = await BootcampSprint.update(
  { status: 'generating', generationVersion: currentVersion + 1 },
  { where: { id: sprintId, generationVersion: currentVersion } },
);
if (affectedRows === 0) {
  throw new Error('Sprint generation conflict — another generation is already in progress');
}
```

Two concurrent callers read the same version, the first UPDATE bumps it, and the second matches
zero rows and throws. That is atomic at the database level — the correct construction. The
authorization ordering around it was also already fixed in S08 (`:84-93` authorizes the previous
Sprint *before* the claim, so a denial cannot strand `status='generating'`).

So **slice A is not work.** It is recorded here because a scope document that misdescribes the
code is worse than no document: it would have sent the next agent to build fencing that exists.

**Residual gap worth a small slice (LOW):** `generationVersion` declares `defaultValue: 1` but
**not** `allowNull: false` (`models/BootcampSprint.mjs:95-97`). Every row created through
`createSprint` gets `1`, so the CAS is sound in practice. A row with a NULL version would be
normalized by the existing arithmetic, but nothing prevents such a row from existing.

> **CORRECTED (round 113 hostile review — this paragraph was WRONG):** an earlier version claimed a
> NULL version "makes `currentVersion + 1` arithmetic on `null` and the `where` clause unable to
> match, so **generation would fail permanently**", and proposed adding `allowNull: false`. Both
> halves are refuted by reading the code: `sprintGenerator.mjs:93-94` computes `currentVersion + 1`
> **in JavaScript** (`null + 1 === 1`, a bound literal — not SQL `col + 1`) and passes
> `where: { generationVersion: currentVersion }`, which Sequelize renders as
> **`AND "generationVersion" IS NULL`** for a null. The row therefore MATCHES, the CAS succeeds, and
> the next attempt knows the version — the NULL row **self-heals** on first use instead of failing
> permanently. `allowNull: false` is the harmful half of the proposal: it is a schema constraint,
> so it would need a migration to add and could reject pre-existing rows — for a case that already
> recovers. No change made.


**Evidence relied on:** `backend/services/bootcamp/sprintGenerator.mjs:95-106`,
`backend/models/BootcampSprint.mjs:95-97`.

### B. Atomic memory union (R-H04 part 2) — **DONE (round 41)**

**Verified real in round 40, fixed in round 41.** `sprintGenerator.mjs:174-191` marked the slot
`generated` with its full `exerciseKeys` and *then* wrote memory one `findOrCreate` at a time with
no transaction; the caller's `catch` swallowed a mid-loop failure while the slot UPDATE had
already committed. Partial memory is read by the next generation as "these exercises are free",
so it would re-pick exercises the class already used — and the partial write was
indistinguishable from a complete one to any later reader.

**Fix:** new `sprintSlotWrite.mjs` exports `persistGeneratedSlotAtomically`, which performs the
slot update and every memory write **inside ONE `sequelize.transaction`**, so they commit or roll
back together. Applied to **BOTH call sites** — the generation loop and `regenerateSlot` — because
finding one and fixing one is how this same defect has recurred all session.

The extraction was a deliberate part of the slice, not an afterthought: `sprintGenerator.mjs` was
at 299/300 and wrapping in a transaction would have breached the cap. It now sits at **299** with
the helper at 61.

`in-memory` exclusion (`sprintMemory.add`) moved to **after** the commit, so a rolled-back slot no
longer suppresses this run's own exclusion set.

**Locked:** `sprintSlotWrite.test.mjs` (8 tests) — one transaction; **every** write carries the
**same** transaction object; a mid-loop failure **propagates** instead of being absorbed; the slot
is marked `generated` with the full key list; each memory row is keyed to its slot and week;
empty and malformed key lists are handled. Discriminating — pre-fix **not one** write carried a
transaction, so the `transaction` assertions could not pass.

**Still open for this slice:** the real-PostgreSQL rollback proof. The existing real-PG suite
proves atomicity for **template save**, not for sprint slot writes, and no sprint integration
runs against the owned fixture yet. Tracked under F above (H09/H28 integration).

Evidence: backend **1228 files / 10122 passed, 6 skipped — exit 0**; real PostgreSQL **5/5 —
exit 0**; `git diff --check` clean.

### C. Taught-log idempotency — **DONE (round 60), after the review found TWO HIGH defects I introduced**

The race fix worked — and **traded one bug for two**. A hostile reviewer probed the exported
function directly and found both; neither had any test.

| # | Sev | Defect I introduced | Fix |
|---|---|---|---|
| 1 | **HIGH** | **A successful confirmation returned a STALE slot.** `SprintClassSlot.update` is a **static** model method — it does **not** mutate the local instance. `return slot` therefore reported the PRE-write state (`planned`/`false`) while the row was `taught`/`true`. Probe output: response `{"status":"planned","wasUsed":false}` against a DB row of `{"status":"taught","wasUsed":true}`. **Zero coverage — 19 tests touch this function and none asserted the resolved value.** | `Object.assign(slot, taughtAt)` before returning. Two tests now assert the returned `wasUsed`/`status`. |
| 2 | **HIGH** | **A transient counter failure became a PERMANENT under-count.** The claim UPDATE and `sprint.increment` were untransacted. If `increment` failed, the slot was already `taught`; the retry matched zero rows, returned 200 success, and **never counted** — unrecoverable. My comment claimed the count was "request-independent", which was false: it depended on whether a previous request's increment committed. | Both statements now share **one `sequelize.transaction`**, so they commit together or not at all. A test asserts both carry the same transaction. |

**This is the clearest instance of the session's pattern:** I fixed a concurrency bug and thereby
introduced a stale response and an unrecoverable counter — and my own suite, which I had called
green, contained **no assertion on the return value at all**. A green suite is not a verification.

### Verified real-database proof (round 56)

`backend/scripts/s06-slice-c-probe.mjs` — two **independent connections** issuing the same
conditional update **concurrently**:

```json
{ "affectedRows": [0, 1], "uniqueClaimants": 1, "finalCounter": 1, "exactlyOnce": true }
```

Concurrency claim: **TRUE, proven at real PostgreSQL** and independently reproduced by the reviewer.

### Structure

Extracted to `sprintConfirmSlot.mjs` (79) after the fixes pushed `sprintService.mjs` over cap;
sprintService re-exports it, so callers and tests are unchanged. `sprintService.mjs` is now **268**.

### Not claimed

The durable **taught-log record** (H29 `ClassLog` migration) is **not started**.
**CORRECTED (round 113): DONE.** `BootcampClassLog.mjs` (model), `sprintSlotTaughtLog.mjs`
(derivation + date validation), the link and counter in `sprintConfirmSlot.mjs`, the unit suite
`bootcampTaughtIdempotency.test.mjs`, and a real-PostgreSQL block that proves one log / one link /
one count including the two-connection row-lock case. The migration is a fixture-only script because
this packet forbids production migrations.

### Open LOW items from the review, recorded not fixed

- **API-only un-teach → re-teach silently under-counts.** `wasUsed` has one writer (always `true`),
  and `validateSlotUpdate` accepts `status` but not `wasUsed`, so `PUT … {status:'planned'}` leaves
  a counted slot matching zero rows on the next confirm — a silent no-op returning 200. No UI
  affordance reaches it.
- A **repeat confirmation silently discards** the caller's new `usedDate` (correct under
  "idempotent, not an error", but the API cannot express a correction and nothing says so).
- `sprintStream.mjs` event ids. **CORRECTED (round 113):** this line previously read "always sends
  `id: 1`", which is **false**. `streamJobEvents` sends an INCREMENTING id — `writeEvent(res, i + 1,
  …)` on the replay loop (`sprintStream.mjs:53`) and `writeEvent(res, lastSent + 1, …)` on the poll
  loop (`:63`) — and honours `Last-Event-ID` (`:49-50`). Only the ONE-SHOT terminal fallback writes
  `id: 1` (`:98`) and it calls `res.end()` immediately (`:99`), so it cannot regress a replay
  cursor. The residual concern is therefore not the id value but that the fallback's id is
  hardcoded; low and unreachable today.

**Round 47 shipped a guard that did not close the case it claimed to close.** It read the slot,
tested `wasUsed` in JavaScript, then wrote. That stops **sequential** retries only. **A double-click
sends both requests before either commits** — both read `wasUsed: false`, both passed the guard,
and **both incremented `totalClassesCompleted`**. The comment said the fix covered "a double-click,
retry or second tab"; it covered one of the three.

**Now an atomic conditional update** — the UPDATE *is* the guard:

```js
const [claimed] = await SprintClassSlot.update(
  { wasUsed: true, usedDate: ..., trainerConfirmedAt: new Date(), status: 'taught' },
  { where: { id: normalizedSlotId, sprintId: authorizedId, wasUsed: false } },
);
if (claimed === 0) return slot;      // someone else confirmed first
await sprint.increment('totalClassesCompleted');
```

The first commit flips `wasUsed`; the second matches zero rows and does not count. **This is the same
compare-and-swap idiom slice A already used for `generationVersion`** — I should have looked at that
implementation before writing the JS-side guard, and the lesson is that claim-style code in this
repo has an established pattern.

**A test now models the race** (`Promise.all` of two interleaved confirmations → exactly one
increment), and the harness **throws if the guard is ever not conditional**, so a regression to
test-then-write fails loudly rather than silently. 27 tests in that file.

### Proof scope — model-mocked AND real-database (gap CLOSED, round 56)

The unit tests are **model-mocked**: the harness's `update` is code I wrote to return `[0]`/`[1]`, so
they prove the *logic* given the model. They do **not** by themselves prove PostgreSQL's
conditional-update behaviour — and this workstream's own H02 justification is that **four real
defects were found ONLY by the real database**.

**Closed by a real-database probe:** `backend/scripts/s06-slice-c-probe.mjs`, run against the owned
disposable fixture. It opens **two independent connections**, issues the same
`UPDATE … WHERE id = 1 AND "wasUsed" = false` on both **concurrently**, and increments a counter
only when a call matched. Result (`hf44-slice-c-probe.log`):

```json
{ "affectedRows": [0, 1], "uniqueClaimants": 1,
  "finalCounter": 1, "finalWasUsed": true, "exactlyOnce": true }
```

**Two racing callers, one affected row, one increment.** The conditional update is atomic in fact,
not merely in model. The probe creates and drops a synthetic table on the disposable fixture and
touches nothing else, so it is re-runnable as standing evidence.

Slice C is therefore: **counter exactly-once, verified in logic AND against real PostgreSQL.**
The durable taught-log record (H29) remains unstarted.

Evidence: backend **1228 files / 10132 passed, 6 skipped — exit 0**; real PostgreSQL **5/5 —
exit 0**; `sprintService.mjs` at 300.

**Verified against the source before implementing.** `sprintService.mjs` read, in full:

```js
await slot.update({ wasUsed: true, usedDate: ..., status: 'taught' });
await sprint.increment('totalClassesCompleted');     // unconditional
```

S08's own comment said this was *"NON-IDEMPOTENT by design"* and deferred the exactly-once work
to this slice — and `s08-architecture.md:3` warned in advance not to treat an access-control patch
as discharging it. The consequence: a **double-click, a client retry after a lost response, or two
open tabs** incremented `totalClassesCompleted` once per *request*, inflating a counter the
objective requires preserved, with **no way afterwards to distinguish an inflated count from a
real one**.

**Fix:** an already-taught slot (or one with `wasUsed` set) is returned **unchanged** and not
re-counted. Idempotent rather than an error, so a retry after a lost response still succeeds — the
counter must reflect classes taught, not requests received.

**Locked:** 6 tests in `sprintUpdateContract.test.mjs:
- a first confirmation counts once and marks the slot taught
- **a SECOND confirmation does not re-count** (pre-fix: two increments — discriminating)
- a slot already taught on arrival is untouched
- `used-but-not-taught` also counts as confirmed (either signal suffices)
- foreign and malformed slots are still refused with **zero** increments
- `usedDate` is honoured, falling back to the scheduled date

**Not claimed:** the durable **taught-log record** (`ClassLog` / H29's migration) is a separate
piece of R-H29 and is **not** started. This slice makes the *counter* exactly-once; it does not
create the audit trail.

Evidence: backend **1228 files / 10128 passed, 6 skipped — exit 0**; real PostgreSQL **5/5 —
exit 0**; `sprintService.mjs` at 300.

### D. Durable SSE reconnect — **SERVER HALF DONE + EXTRACTED (rounds 49-50)**

**Implemented:** a missing job is answered from **persisted** status instead of a bare 404:

| Persisted `sprint.status` | Response |
|---|---|
| `generating` | 200 event-stream, terminal `{ type: 'error', interrupted: true }` |
| anything else | 200 event-stream, terminal `{ type: 'done', replayUnavailable: true }` |

A reconnecting client now gets a **definitive** answer — stop waiting, or restart — instead of a
404 that could equally mean "finished", "never ran", or "a restart ate the buffer".

**The 404-contract check paid off.** The only test touching this route asserts 404 for a **foreign
trainer** — the *authorization* denial, which returns before the job lookup. Verifying that first
let me proceed instead of skipping a safe fix. First time in four slices that reading the source
first let me *act* rather than correct myself.

**Cap regression FIXED, not just disclosed.** The extraction I owed is done: the route, its
Last-Event-ID replay and its terminal fallback now live in `routes/sprintStream.mjs` (106 lines).
`sprintRoutes.mjs` went **304 baseline → 346 with the fix → 298**. The file is now **under** the cap
for the first time, so this slice also cleared a **pre-existing** rule-4 violation rather than
merely avoiding a new one.

**Locked:** 3 tests in `sprintRoutesErrorMapping.test.mjs` (11 total) — the over case, the
interrupted case, and that a **foreign** sprint is still a JSON 404 that never opens a stream.
Both new cases fail pre-fix.

**Frontend half — INVESTIGATED (rounds 58-59), and it exposed a defect in MY OWN server change.**

`frontend/src/hooks/useSprintAPI.ts:200-228` — `readStream` forwards **every** `data:` frame to
`onProgress` and does not filter terminal events, so no transport change is needed.

**But the only consumer, `SprintPlannerPage.tsx:83`, reacts to exactly two types:**

```js
if (evt.type === 'complete' || evt.type === 'error') { setGenerating(false); loadSprintDetail(...); }
```

My first version emitted `{ type: 'done', replayUnavailable: true }` for the "run is over" case.
`'done'` matches **neither**, so the event would be forwarded and then **ignored** — the spinner
would run forever. **That is strictly worse than the 404 it replaced**, because the 404 produced an
`onProgress({type:'error'})` the client *did* handle. I had invented a protocol type without reading
the consumer, and my three tests asserted the invented type — they passed while the behaviour was
worse than before.

**FIXED:** the terminal event is now `{ type: 'complete', replayUnavailable: true }`, using the
client's existing vocabulary, with a regression assertion that the payload is **not** `'done'`.

**Frontend half — the gap is now PRECISE (round 63), and it is a real one.**

Reading the consumer closed the last uncertainty. `SprintPlannerPage.tsx`:

| Line | What it does |
|---|---|
| `:83-86` | on `'complete'` **or** `'error'`: `setGenerating(false); loadSprintDetail(...)` |
| `:179` | label reads `generating ? 'Generating... X%' : 'Generate All Classes'` |
| `:186` | `{generating && progress && ( …progress panel… )}` |

**The progress panel renders ONLY while `generating` is true — and the terminal handler clears
`generating` immediately. So the terminal event unmounts the very surface that could show it, and
nothing else renders `progress.error`** (grep: no `progress.error` reference exists in the file).

**Consequence for the interrupted case:** my server emits `{ type: 'error', interrupted: true }`
correctly; the transport forwards it; the handler consumes it; the spinner disappears; the button
returns to "Generate All Classes"; the sprint reloads with no classes. **The trainer is told
nothing about why.** The server-side fix is necessary but *not sufficient* — a definitive answer
that the UI discards is not a UX improvement.

**The bounded fix — scoped precisely (round 64), NOT started.** Two reads settled it:

- `SprintPlannerPage.tsx:33-44` imports **every** style from `./SprintPlannerStyles`. There is **no
  error/notice/alert primitive** available — the closest are `ProgressContainer`, `ProgressText`
  and `EmptyState`.
- So the fix is **not** a two-line JSX addition. It needs a new styled primitive (e.g.
  `TerminalNotice`) added to `SprintPlannerStyles.ts`, then rendered in the page **outside** the
  `generating &&` guard, distinguishing `progress.interrupted === true` from a normal failure.

**Concrete steps for whoever takes it:**
1. ~~Check `SprintPlannerStyles.ts` against the cap.~~ **DONE (round 65) — and the answer changes the
   plan.** The file is **587 lines**, 287 over the 300 cap, a **pre-existing** violation (not
   introduced this session). The rest of the folder is clean: `SprintPlannerPage.tsx` 269,
   `SlotDetailPanel.tsx` 249, `CreateSprintModal.tsx` 182, `BootcampCalendar.tsx` 143.
   **So D's frontend fix is now a choice, and it should be made deliberately rather than by
   drift:**
   - **(a) Add the primitive anyway** (~12 lines → 599). Cheapest, and it marginally worsens a
     violation that already exists and is disclosed. Acceptable only if recorded as such.
   - **(b) Extract first**, then add. Correct, but it makes D's frontend a two-part slice —
     a styles-file split plus the UI change — with no test coverage on either half today.
   Neither is a tail-of-budget edit. **Recommend (a) plus an explicit line in the register**, because
   (b) bundles an unrelated refactor into a feature fix, which is how slices become unreviewable.
2. **DONE (round 66).** `TerminalNotice` added to `SprintPlannerStyles.ts` — `$tone` prop, rule-6
   token-with-fallback colors, Frost White on a tinted panel (rule 7). **Cost: 587 → 617 lines**,
   recorded in the file itself rather than only here. Verified: `tsc` exit 0 and the full frontend
   consumer suite **261 files / 1591 passed, exit 0**. Nothing renders it yet, so the addition is
   inert until step 3 — a deliberately reviewable increment.
3. **DONE (round 67).** Rendered at `SprintPlannerPage.tsx`, **outside** the `generating && progress`
   guard, keyed on `!generating && progress?.type === 'error'`, with distinct copy for
   `progress.interrupted` ("…Start it again.") vs an ordinary failure. The terminal event now
   survives the `setGenerating(false)` that used to erase it.
   **This also required a real type fix:** `GenerationProgress` (`useSprintAPI.ts:69`) had no
   `interrupted` field, so `tsc` failed with TS2339 — the client type did not model what the server
   emits. Added `interrupted`, `replayUnavailable` and `persistedStatus` as optional fields.
   `SprintPlannerPage.tsx` is now 287 lines (under cap) + 1 import.
   **Verified:** `tsc` exit 0, frontend consumers **261 files / 1591 passed, exit 0**.
4. **NOT DONE — and this is a real gap, not a formality.** No test drives `onProgress` with
   `{ type: 'error', interrupted: true }`, so the fix is **type-verified and visually reasoned but
   behaviourally UNTESTED**. This is exactly the state I have repeatedly criticised in this
   workstream: a change whose only evidence is that it compiles. **Do not count step 3 as verified
   until this exists.**
   **CORRECTED (round 113): IT NOW EXISTS.** `frontend/src/components/SprintPlanner/SprintPlannerPage.terminalNotice.test.tsx`
   (168 lines) drives exactly this event at `:99` (`emit({ type: 'error', interrupted: true })`) and
   asserts the notice text at `:102` (`'Generation was interrupted'`). Step 3 is behaviourally
   tested; the recipe below is retained as the record of how the gap was closed.

   **Exact recipe, read from the source (round 68) — no discovery left:**
   - `useSprintAPI()` must return three mocks: `listSprints` resolving to `[sprint]`,
     `getSprint` resolving to the detail object with an `id`, and `generateSprint` **capturing its
     second argument** (the `onProgress` callback) and returning a cancel function.
   - The page renders the **list view** until `activeSprint` is set (`:103` is
     `if (!activeSprint) return (…list…)`). `activeSprint` is only set by `loadSprintDetail`
     (`:71-74`), which runs when the user **selects a sprint** — so the test must click the sprint
     card before the Generate button exists. `listSprints` alone is not enough.
   - Then click Generate (`:178`, label `'Generate All Classes'`), invoke the captured callback with
     `{ type: 'error', interrupted: true }`, and assert a `role="alert"` notice containing
     "Generation was interrupted".
   - Second case worth adding: the same callback with `{ type: 'complete' }` must produce **no**
     notice, which is what proves the notice is keyed to the terminal error rather than to the
     end of generation.
   - The callback fires inside `setProgress(evt)` then `setGenerating(false)` (`:83-86`), so wrap
     the invocation in `act()`.
5. Browser-harness proof on port 5317 — still outstanding.

**Why this is a slice and not a tail edit:** it introduces a new UI primitive and the page's first
interaction test. Attempting it with the remaining budget would have produced exactly the kind of
half-verified change this session's reviews kept catching.

This is the fifth time in this stretch that reading the source changed the work: the slice was
"server half done, frontend half open", then "frontend needs a copy decision", and it is actually
"**the UI discards the terminal signal entirely**".

### OPEN — an UNEXPLAINED intermittent full-suite failure (slice C tests)

**Observed once, not reproduced.** During round 61 the full backend suite reported
**6 failed tests, all in `backend/tests/unit/sprintUpdateContract.test.mjs`**, with
`AssertionError: expected [] to deeply equal [ 'totalClassesCompleted' ]` — i.e. the conditional
claim matched zero rows so the counter was never incremented.

- The file **passes in isolation** (28/28) and passed in the preceding and following full runs.
- **My first explanation was wrong and is retracted.** I stated that a test in another file had
  polluted shared module state. It cannot: **neither vitest config sets `isolate`**, so the default
  (`isolate: true`, `pool: 'forks'`) gives every test file a fresh module registry.
- The only delta between the green run before and the red run was an edit to a **different file**,
  which under per-file isolation cannot be causal. That edit was reverted, and the next full run was
  green — consistent with an intermittent fault, **not** with the fix having addressed it.

**Do not treat this as benign.** It is an intermittent failure inside the tests that lock slice C's
exactly-once claim, which is the claim most load-bearing for the counter's integrity.

**Reproduction attempt (round 62): NOT REPRODUCED.** Two further full runs, both
`10133 passed | 6 skipped, exit 0` (`hf51-run1.log`, `hf51-run2.log`). Tally to date:

| Run | Result |
|---|---|
| hf48 (before the unrelated edit) | green |
| **hf49** | **6 failed in `sprintUpdateContract.test.mjs`** |
| hf50 (after revert) | green |
| hf51 run 1 | green |
| hf51 run 2 | green |

**One failure in five runs.** Rare enough that a fix cannot be validated by "it went green after" —
which is exactly the reasoning that must not be used here. It is also rare enough that guessing at a
cause is worse than recording the rate.

**Next probes, in order:** (1) `--no-file-parallelism` across several runs, to separate a
timing/load effect from an ordering effect; (2) a fixed worker count repeated, to see whether the
rate depends on pool size; (3) if neither shows it, treat it as a load-sensitivity in the suite
rather than a defect in the confirmed-once logic — but only after those runs, not before.

**Also open from the same review:** the `sprintRoutesErrorMapping.test.mjs` foreign-trainer case is
**non-discriminating** (an empty job map yields 404 both before and after the slice-D fix). The
discriminating shape is documented in-file; implementing it is blocked on understanding the
intermittent failure above, not on a technical obstacle.

## A FLAKE, disclosed rather than buried

The full backend run in round 50 reported **1 failed file / 1226 passed**: 
`tests/api/cartQuantityCeilingBinding.test.mjs`. It **passes in isolation (5/5)**, it is unrelated
to sprints, and the run log shows it as a file-level load failure rather than an assertion — so it
is a **flake under full-suite parallelism**, not a regression from this slice. Recording it because
a green-suite claim would otherwise be slightly false: the suite is currently 1-flaky, not clean,
and the flake should be investigated on its own rather than assumed benign.

**My earlier description was partly wrong again — the replay half already exists.**
`sprintRoutes.mjs:236-279` already implements:
- **Last-Event-ID replay** (`:253-260`) — a reconnecting client gets every event it missed
- polling for new events, `job.done` termination, and `req.on('close')` cleanup (`:267-278`)

So "there is no resume path" (what I wrote) is false. The real gap is narrower and sharper:

**1. The job buffer is an in-memory Map** (`:53`) with a TTL delete (`:232`). Two consequences:
- a **server restart mid-generation** loses the buffer entirely, and
- a reconnect **after `SPRINT_JOB_TTL`** finds nothing.

**2. A missing job answers a bare `404`** (`:242-244`) — which is **ambiguous**. The client cannot
distinguish *"finished, buffer expired"* from *"never ran"* from *"interrupted by a restart"*. It
therefore cannot know whether to keep waiting, retry, or report failure — the exact "durable
reconnect" property R-H04 is about.

**The bounded fix** (design, not yet code): on a missing job, consult **persisted** state rather
than answering blind. `getSprintById(...).status` is authoritative and survives restarts, so:
- status `generating` + no job ⇒ the run was **interrupted**; emit a definitive terminal
  `{ type: 'error', interrupted: true }` so the client stops waiting and can restart it
- status anything else ⇒ generation is **over**; emit a terminal `{ type: 'done',
  replayUnavailable: true }`

That converts an ambiguous 404 into a definitive answer **without** a migration or a durable job
store — the affordable version of the slice.

**CHECK THIS FIRST (risk I did not take blindly):** `:242-244` returns **404**, and a test may
assert that. Changing it to a 200-with-terminal-event is an **API contract change**, and I did not
have the budget to find every assertion that depends on the status. Grep for the stream route in
`tests/api/sprintRoutesSecurity.test.mjs` and friends before editing; if a test pins 404, decide
deliberately whether the contract or the test is wrong, and record the decision.

**Exit:** a reconnecting client resumes from `Last-Event-ID`, or receives a definitive terminal
event; the three "nothing to replay" cases are distinguishable from one another; and the frontend
stops waiting. Browser-harness proof via the S04 harness (port 5317) for the frontend half.

**Evidence relied on:** `backend/routes/sprintRoutes.mjs:53, 190, 200, 232, 236-279`.

### E. H20 progression / deload
Untouched. Needs its own requirement read before scoping further — **do not guess its criteria
from the name.**

### F. H09 / H28 integration
`s06-architecture.md:44` requires the final combined review to include later H09/H28/H29
integration. Not started.

## Constraints that bind all of the above

- **No production DB or migration.** The owned fixture is `rolodex-postgres-s06-20260913`
  (PID 79488, port 55089, db `rolodex_s06_test`). Migrations may be authored and applied to that
  fixture only, and must be disclosed as fixture-only.
- **No main push, no deployment.** Everything stays in the worktree.
- **No paid fallback.** No provider calls.
- **Preserve receipts/counters/roles.** `state-relocated.json` unchanged at
  `93a9e7becbda69c92a02e4fa957f2c100a27d3b32dd020ccf30139b1bafd7f26`; the controller is
  deliberately not migrated (its override accepts only a `gpt-5.6-luna`@`xhigh` build actor, and
  migrating would also reset S01/S02 from `tested` to `build`).
- **300-line cap.** Four times this session my own comment tripped it. Trim comments first.
- Each slice needs its own architecture doc before code, per the established packet format.

## The honest position

Rows: **A phantom, B done, C done, D verified-not-implemented, E and F unstarted.**

**Three of the four slices I have examined had a wrong or partial premise in the first version of
this document** — A claimed fencing was missing when it existed; C under-described the counter
impact; D claimed there was no replay path when Last-Event-ID replay was already implemented. The
pattern is consistent: **I wrote the scope from requirement names and surrounding docs rather than
from the source.** Every correction came from reading the code.

That is the same failure the review found in my code comments and tests, which means it is not a
documentation problem — it is how I form claims. The rule for the remaining slices is therefore
mechanical: **read the implementation before writing a single line about it**, and expect the first
description to be wrong.

The findings register is at **15 open** (11 prior + the `[] → [X]` residual + stream items), and a
fresh-context review of rounds 42–46 is **in flight**. The H-register is at D/E/F unstarted.

This session hardened the surfaces it touched and closed a large finding register; it did **not**
advance H09, H15–H18, H20 or H28, and H29 is half done (counter, not audit trail). Saying that
plainly is more useful than a percentage.
