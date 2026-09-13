# S08 — Sprint object authorization and canonical IDs (R-H03)

**Slice:** `S08` · **Checkout:** `tmp/worktrees/rolodex-luna-01a098de-20260913` @ `c0cbe538d`
**Date:** 2026-09-13 · **Status:** IMPLEMENTATION VERIFIED at the unit and route-execution level.
Claim fencing / taught-log idempotency remain separate pending slices (see §5).

Nothing committed, pushed, migrated or deployed.

---

## 0. Round 10 update — the ownership tests found a hole in my own fix

Writing `sprintGeneratorOwnership.test.mjs` immediately failed with
`TypeError: BootcampSprint.update is not a function` — because `generateSprintClasses` went
**straight to a static status update** after `if (!sprint) throw`, with **no ownership check at all**.
I had threaded the actor into its signature in round 9 but never added the authorization call. A
foreign trainer could therefore have triggered **full generation** — provider cost, status mutation
and exercise-memory writes — for a Sprint they do not own.

Fixed by routing the fetch through `requireOwnedSprint` before the optimistic claim, any memory read
or any catalog access, then normalizing `sprintId` to the authorized id. The Sprint's stored
`trainerId` remains the data owner for an admin caller.

That is the concrete value of the executable ownership tests the architecture demanded and I had
deferred: the source-level wiring *looked* complete.

---

## 1. What was wrong

Every public Sprint service took a raw `trainerId` from the route (`req.user.id`) and scoped its own
query by it, so there was no single place that decided authorization. `getSprintById` had **none at
all** — the route did its own check afterwards and answered `403 Not authorized`, which
**distinguishes a foreign Sprint from a missing one**. Week and slot updates trusted
`findOne({ where: { id: weekId, sprintId } })` with a **client-supplied** `sprintId`. The two SSE
routes read the in-memory job cache and flushed event-stream headers before any ownership check.

## 2. What changed

| File | Lines | SHA256 | Change |
|---|---|---|---|
| `backend/services/bootcamp/sprintAccess.mjs` | 152 | `26272693…aa18` | **NEW** — access contract |
| `backend/services/bootcamp/sprintService.mjs` | 302 | `c50493b0…21d5` | actor on every export |
| `backend/services/bootcamp/sprintGenerator.mjs` | 275 | `43d5ed6e…39c7` | actor threaded; authorize before memory |
| `backend/routes/sprintRoutes.mjs` | 304 | `b979e162…c1b9` | actor from `req.user`; SSE order fixed |
| `backend/tests/unit/sprintAccess.test.mjs` | 172 | `b5dddfb0…e5fb` | **NEW** — 17 tests |

### Access contract (`sprintAccess.mjs`)

- `normalizePositiveSafeInteger` — positive safe integer, or a trimmed **decimal digit string**.
  Rejects zero, negative, fractional, `NaN`, `Infinity`, unsafe values, junk suffixes (`12abc`),
  exponent notation (`1e3`, `0x10`), signs, blanks and non-primitives. **400.**
- `normalizeActor` — `{userId, role}` with a normalized positive `userId` and role exactly
  `admin`/`trainer`. Anything else is **403**, including a missing actor.
- `requireOwnedSprint` — normalizes the id, reads the object, then authorizes: owner, or an explicit
  authenticated `admin`. A **foreign object is reported exactly like an absent one** (same message,
  404, no wording that leaks ownership). Returns `dataOwnerTrainerId` = the Sprint's own
  `trainerId`, so an admin acting on it **never adopts ownership**.
- `requireChildOfSprint` — a child is only reachable when its `sprintId` matches the authorized
  Sprint, with string-vs-number handled by the common normalizer.
- `requireOptionalOwnedSprint` — a referenced previous Sprint is authorized under the same actor
  **before** its exclusions are read.

### Wiring

- All nine exports now take the actor: `createSprint(actor, params)`, `getSprintById(id, actor)`,
  `listSprints(actor)`, `updateSprint(id, actor, updates)`, `archiveSprint(id, actor)`,
  `updateWeek(sprintId, weekId, actor, updates)`, `updateSlot(sprintId, slotId, actor, updates)`,
  `confirmSlotUsed(sprintId, slotId, actor, body)`, `getSprintExerciseMemoryKeys(sprintId, actor)`.
  No omitted-actor fallback and no trusted-internal bypass exists.
- Child week/slot queries now **additionally include the authorized Sprint id**.
- `listSprints` stays scoped to the actor's own identity — **no unsolicited all-trainers admin
  listing was added**.
- `createSprint` owns the Sprint by `actor.userId` and returns via the authorized `getSprintById`.
- The route builds the actor **only** from `req.user` (`actorFromRequest`), maps access errors to
  their sanitized 400/403/404, and keeps the existing envelope for 5xx without echoing ORM messages.
- **SSE ordering verified by line position**: POST generate — authorize (159) → job-cache read (162)
  → job write (172) → `writeHead` (175). GET stream — authorize (211) → job-cache read (214) →
  `writeHead` (220).

> **Explicitly NOT claimed:** claim fencing, atomic memory union, durable reconnect and taught-log
> idempotency remain separate pending slices. `confirmSlotUsed` is still **non-idempotent** and says
> so in the code.

## 3. Evidence

- `s08-access.log` exit **0** — **17/17** access tests: malformed ids rejected **before any model
  lookup** (spy asserts zero calls), bad actor likewise, foreign ≡ missing (identical message), admin
  passes without adopting ownership, child scoping, optional previous Sprint.
- `s08-suite-final.log` exit **0** — **1054 files / 8616 tests**.
- `s08-suite1.log` (16 failed) and `s08-suite2.log` are preserved: the only regressions from the
  signature change were in **my own** S07 create suite, which was updated to pass an actor; the
  mocked post-create row also needed a `trainerId` because that read is now ownership-checked.

## 4. Round 10 — the three named test files now exist and pass

| File | Lines | SHA256 | Tests |
|---|---|---|---|
| `tests/api/sprintRoutesSecurity.test.mjs` (extended) | 230 | `49b3ca61…07e1` | +9 executable |
| `tests/unit/sprintServiceOwnership.test.mjs` | 163 | `eee61aad…8136` | 22 |
| `tests/unit/sprintGeneratorOwnership.test.mjs` | 103 | `f04191e3…ecb0` | 6 |

`e08-routes-exec2.log` exit **0** — **11/11** in the security file. The new block mounts the **real**
router on a real Express app via supertest. **Declared split** (permitted by the architecture and
disclosed in-file): the auth middleware and the generator are mocked to control `req.user` and spy on
dispatch; `sprintRoutes`, `sprintService` and `sprintAccess` are **real**, so the denial is produced
by the real access code, never by mocking the authorization helper.

Executed, not inferred:
- a foreign Sprint answers **exactly** like a missing one (identical body; nothing matching
  `own|belong|another|permission|not authorized`) and **no children are read**;
- a foreign generation POST is refused **before** any job, header or generator work — JSON, not
  `event-stream`, and the generator spy is untouched;
- **the ordering proof that was missing**: the owner starts generation (job cached), then a foreign
  trainer reconnects — `404` JSON, no SSE flush, **the other trainer's cached job is not revealed**;
- a foreign PUT never reaches the model;
- an explicit admin is allowed and the actor `{userId: 99, role: 'admin'}` reaches the generator;
- a malformed id is `400` with **no model lookup**;
- a downstream `Error('SEQUELIZE_LEAK_42')` never appears in the response body.

`s08-service-own.log` exit **0** — **22/22**. Seven boundaries each deny a foreign actor with
**zero writes and no memory read**; a missing actor, a wrong role and a zero user id are forbidden
**before any model lookup**; six malformed ids are rejected before lookup; a child row whose
`sprintId` belongs elsewhere is refused **and the child query is asserted to include the authorized
sprint id**; the owner path works; an admin may edit without ownership being rewritten.

`s08-gen-own.log` → `s08-gen-own2.log` exit **0** — **6/6**. The headline assertion: a foreign caller
must not be able to **DELETE another trainer's exercise-memory rows** (`memoryDestroy` never called).

**Full backend suite: `s08-suite-final2.log` exit 0 — 1056 files / 8653 tests.**

## 5. NOT DONE

1. **`sprintService.mjs` (302) and `sprintRoutes.mjs` (304) are over the 300 cap.** Disclosed;
   splitting the route's SSE handlers out is the obvious tidy.
2. **`generateSprintClasses` does not yet consume `dataOwnerTrainerId`** for the admin case. The
   plumbing exists and ownership is never rewritten, but the data-owner value is not read.
3. **Shared-model integration against the owned database is NOT run** for sprint ownership — the
   architecture defers it to final server proof.
4. **Claim fencing, atomic memory union, durable SSE reconnect and taught-log idempotency remain
   separate pending slices.** `confirmSlotUsed` is still **non-idempotent** and says so in code.
   Nothing here claims distributed concurrency protection: the in-memory job map is progress
   storage, not authority.
5. The route fixture mocks the generator, so it proves **route order**, not generator behaviour;
   generator behaviour is covered separately by `sprintGeneratorOwnership.test.mjs`.


---

## Round 163 update - the two "separate pending slices" now have passing executable coverage

The header above records that "Claim fencing / taught-log idempotency remain separate pending slices (see section 5)". This note does NOT re-read section 5 in full and does not claim those slices are formally closed; it records what is now executable and green, so the next reader can judge the remainder against tests rather than against this sentence.

**Claim fencing.** `backend/tests/unit/sprintGeneratorOwnership.test.mjs` and `backend/tests/unit/sprintServiceOwnership.test.mjs` cover the ownership path the round-10 update describes - the hole where `generateSprintClasses` went straight to a static status update after `if (!sprint) throw` with no ownership check, letting a foreign trainer trigger full generation. Round 128 of this packet added the claim guard in `sprintRegenerateSlot.mjs` and the claim-aware skip in `sprintGenerator.mjs`, and made `sprintRoutes.mjs` map the failure to `sendSprintServiceError` instead of a silent success.

**Taught-log idempotency.** `backend/tests/unit/sprintSlotTaughtLog.test.mjs` covers the server-side log, and `frontend/src/hooks/useBootcampTaughtLog.latch.test.tsx` covers the client latch that round 127 repaired - a retry used to re-send a clock-derived `classDate` under a surviving run key, which produced a permanent 409; the request body is now frozen with the key so a retry is byte-identical. `useBootcampTaughtLog.test.ts` covers the surrounding behaviour.

**Verified together:** `npx vitest run` on the three backend files is **37 passed / 3 files**, and on the two frontend files **9 passed / 2 files**.

**One recorded limitation stands, deliberately.** Round 132 of this packet established that the content-keyed latch overshoots: a SECOND byte-identical class cannot be logged, because the key does not distinguish two genuinely distinct classes that happen to share a payload. `GeneratedBootcamp` carries no `id`, so there is nothing finer to key on. That is recorded as item 18 in the receipt's section 5, not reverted and not hidden, and it is the reason this note says "coverage" rather than "resolved".