# R5-11 closure — real-`User` and real-controller consent coverage

**Date:** 2026-09-21
**Finding:** Astra Review-5, R5-11 (Medium), verbatim:

> [VERIFIED] **The existing consent suite cannot substantiate the package's real-model-class claim.**
> `backend/tests/integration/coachConsentPersistence.postgres.test.mjs:90–98` defines an `S85User`
> surrogate. It exercises the real preference service and real database locking, which is useful, but
> not the production `User` class or both HTTP writers. **Fix:** retain those tests with their actual
> boundary label; add real-`User` and real-controller participation coverage inside the admitted test
> harness. Include opt-out/profile interleavings and route validation.

Astra was **correct on both halves of the diagnosis**, and both prescriptions are now discharged.

---

## 1. The finding, verified at its cited lines

`coachConsentPersistence.postgres.test.mjs:90–98`:

```js
User = db.define('S85User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: false },
  notificationPreferences: { type: DataTypes.JSON, allowNull: true },
  firstName: { type: DataTypes.STRING(8), allowNull: true },
}, { tableName: 'Users', timestamps: false });
```

Three columns, over the real `Users` table. It is **not** the production `models/User.mjs` class.

### A correction about how this was verified

While working this finding I recorded the blocker as *"the existing suite still uses an `S85User`
surrogate"* **before** being able to find the file, then ran a repo-wide grep for `s85user` that
returned **nothing**. I wrote the blocker down anyway, without flagging that I had failed to
reproduce my own claim.

The claim happened to be true. **That is luck, not verification**, and it is the same defect class as
R4-03 and R5-01/R5-02 — a value never actually computed, then presented as consulted. Two of my
three searches in that session were killed by `SIGTERM` before returning, and the third was
`--include`-filtered; the empty result was a tooling artifact mistaken for evidence of absence.

Recorded in `evidence/admission.json#verificationNote.r5-11` rather than quietly dropped.

---

## 2. Prescription (a) — retain with the actual boundary label ✅

Applied to `coachConsentPersistence.postgres.test.mjs` as a comment-only header block (no behaviour
change). It now states:

- the suite is `S85User`, a three-column surrogate, **not** the production class;
- **what it legitimately proves** — the real preference service under real row-lock contention, in
  both interleavings, including that the lock is genuinely taken;
- **what it cannot prove** — that the production `User` class persists or returns
  `notificationPreferences` the same way, or that the real HTTP writers participate;
- where the missing coverage now lives.

The label exists because **the claim and the instrument must match**. Before it, this file could be
cited for "tested against the real `User` model", which it does not support.

---

## 3. Prescription (b) — real-`User` + real-controller coverage ✅

Three new files:

| File | Lines | Purpose |
|---|---|---|
| `tests/helpers/coachConsentRealModelHarness.mjs` | 89 | Shared app builder, switchable `protect`, production row seed |
| `tests/integration/coachConsentRealModel.postgres.test.mjs` | 238 | The production `User` class: round-trip, route validation, defaults |
| `tests/integration/coachConsentRealModelInterleavings.postgres.test.mjs` | 151 | Opt-out / profile interleavings; the two-writer contract |

All three are within the 300-line cap (Rule 4).

### How the production class is reached — not re-declared

`models/User.mjs:3` is `import sequelize from '../database.mjs'`, so the class binds to whatever that
module resolves to **at module load**. Mocking `../../database.mjs` to
`helpers/coachTestDatabase.mjs` means the real `User` class — every column, validator and hook —
initialises against the disposable container. `User.sync()` then creates the **production table
shape**, which is the thing a three-column surrogate cannot do.

Nothing re-declares the model. A re-declaration would have been the same defect a third time.

### Coverage added

**Round-trip and validation** (`...RealModel.postgres.test.mjs`):
- opt-in persists through the real route and reads back from the real class, with the cron's own
  predicate agreeing on the production instance;
- an explicit **opt-out is STORED as `false`**, not treated as absent — pinned with
  `hasOwnProperty`, because "false" and "missing" are different and the cron reads `=== true`;
- snooze set then cleared, including that `null` **deletes** the key rather than storing a null;
- sibling preference keys (`sms`, `email`, `quietHours`, `autoShareWorkoutsToFeed`) preserved
  through the production model;
- eight refused bodies, asserted to leave the production row untouched;
- the **real `protect`** refusal, pinned on the middleware's own message so the case cannot pass
  with `protect` deleted;
- the subject is `req.user.id` — a caller-supplied `?userId=` is ignored, asserted on real rows;
- `NULL` preference document reads as OFF; a snooze-only write never introduces the consent key.

**Interleavings** (`...Interleavings.postgres.test.mjs`) — half of Astra's explicit ask:
- a profile write **after** an opt-out does not resurrect consent;
- a consent write after a profile write keeps the profile column;
- a profile-only write leaves consent untouched;
- the coach-owned key list is exactly two keys, and `profileController.mjs` **consults the shared
  list** rather than keeping a local copy;
- the consent route is registered **before** the admin `/:id` route.

---

## 4. Execution status — WRITTEN, NOT RUN. This is not a green result.

Both `.postgres.` suites require a live disposable PostgreSQL server on `SWAN_COACH_TEST_PORT`.
This sandbox cannot provide one. **Neither suite carries a passing result, and neither may be cited
as evidence until it has been executed against the cluster in `evidence/g0-db-receipt.json`.**

### What was actually measured (2026-09-21)

Running the guarded runner — `SWAN_COACH_TEST_PORT=55440 node run-coach-postgres.mjs --file …`:

| Step | Observed |
|---|---|
| Bare `vitest --config vitest.coach-postgres.config.mjs` | **REFUSED** — `resetCoachTestSchema.mjs:65`: *"the Coach PostgreSQL schema reset may only run under the guarded runner"* (the R3-04 guard). |
| Same suite via the guarded runner | `target 127.0.0.1:55440/coach_test_20260906` → **`ECONNREFUSED 127.0.0.1:55440`**. Passed the lease guard; died at connect. |
| Recovery of the resulting marker | **REFUSED** — *"could not connect to verify quiescence"*. Marker **retained**, by design. |
| Host → container, direct | `172.17.0.3:5432` **TIMEOUT**; `127.0.0.1:55440` `ECONNREFUSED`; container name `ENOTFOUND`. |

### What this establishes

1. **The new suites load correctly.** The bare-vitest failure is the *guard*, not an import error —
   every module in the graph resolved, including the production `User` class and both real routes.
2. **The suites integrate with the shipped runner.** They reached the runner's own connect step.
3. **The block is environmental, not specific to these files.** A pre-existing suite fails at the
   same boundary under the same environment.
4. **`172.17.0.3` timing out rather than refusing** means host→container traffic is blocked
   wholesale — no choice of host port would have worked. This is a broader block than "port
   publishing is forbidden", and it is recorded as such in `admission.json#g0-db-identity`.
5. **The marker guard and the recovery guard both work in production**, on the real filesystem,
   against a blocker I did not anticipate. `--recover-target` refused because it could not verify
   quiescence, and told the operator not to delete the marker by hand. The marker was **left in
   place**.

### The retained marker — deliberate, not an oversight

```
%LOCALAPPDATA%\Temp\swan-coach-target-127.0.0.1-55440-coach_test_20260906.marker
pid 56300 · host DESKTOP-O9FEC42 · started 2026-09-21T18:44:53.635Z
token f67807a56b1499fa9a5945e5f663b9a7
```

Left on disk. It is the only record that a previous run may still have live work, and the runner
explicitly forbids hand-deletion to get past it. **Whoever next has a reachable cluster must
recover it with the token above**, and must expect recovery to succeed only once the target is
demonstrably quiescent.

---

## 5. Cohort impact — the full run grows by two, and needs the server

Suite inventory comes from **disk**, not a manifest (`coachSuiteSelection.mjs#partitionSuites`:
`vitestFiles = knownSuiteFiles.filter(f => !nodeLabels.has(f))`), so both new files are discovered
automatically. **No manifest edit was required** — verified against the on-disk list:

| | Before | After |
|---|---|---|
| vitest integration suites | 10 | **12** |
| node:test suites | 3 | 3 |

**Consequence to expect:** the next full-cohort run attempts two more suites that cannot connect,
so it will fail for the reachability reason rather than a code reason. A cohort failure reporting
`coachConsentRealModel*` is the environment, **not a regression** — the same class as the existing
`.postgres.` suites already blocking under this sandbox. Recorded here so it is not misread.

The **runnable** suites are unaffected: `scripts/coach-completion-checkpoint.test.mjs` 29/29, and
`node --test tests/unit/coachRunnerLifecycle.test.mjs tests/unit/coachRunnerVerdict.test.mjs` 37/37.

---

## 6. A second trap, caught while verifying this work

Running the two runner suites under **vitest** reported `Test Files 2 failed (2) / Tests no tests` —
which reads exactly like a broken import. They are `node:test` suites; under `node --test` the same
files give **37/37 pass**. `RUNNER-HARDENING-NOTES.md` already records the reverse direction
(vitest file under `node --test`); this reverse case is now appended there too, because the
zero-tests-that-look-like-a-crash shape is convincing enough to send someone "fixing" green code.

---

## 7. What is NOT claimed

- That either suite passes. **Neither has been run.**
- That the production `User` class round-trips consent correctly. **Plausible and untested** — that
  is precisely the gap R5-11 identified, and this file narrows it without closing it.
- That the profile route's refusal is end-to-end correct. Asserted at the source level and via the
  shared key list; the HTTP-level case needs the live server.
- That the interleavings hold under genuine concurrent load. These are sequential orderings, not
  lock-contention races — `coachConsentPersistence.postgres.test.mjs` is the instrument for that,
  and it needs the same live server.

## 8. What would close this

One owned, reachable PostgreSQL 17 cluster, and:

```
SWAN_COACH_TEST_PORT=<port> node run-coach-postgres.mjs --file tests/integration/coachConsentRealModel.postgres.test.mjs
SWAN_COACH_TEST_PORT=<port> node run-coach-postgres.mjs --file tests/integration/coachConsentRealModelInterleavings.postgres.test.mjs
```

Then, and only then, R5-11 moves from *written* to *evidenced*.
