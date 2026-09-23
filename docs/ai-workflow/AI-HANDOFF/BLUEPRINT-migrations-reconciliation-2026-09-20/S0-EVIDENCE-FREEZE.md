# S0 — EVIDENCE FREEZE AND RECONCILIATION

**Package:** `BLUEPRINT-migrations-reconciliation-2026-09-20`
**Executed:** 2026-09-20, against the working tree
**Slice:** S0 of `05-slices.md` — scope *"package, evidence index, supplied claims"*
**Deliverable:** this file (hash-bound input list + reconciled status table). Runtime tests are N/A for the documentary correction itself.
**Rule 86 filing for this package:** `Z:\HostileReviews\2026-09-20-172515-ss-pt-migrations-reconciliation-safe-migrate.md` (published, indexed, 0/8/4/0, unproven 8)

---

## 0. The STOP gate, answered

> **S0 STOP: do not implement S1 against an unidentified source/configuration snapshot.**

The **source** snapshot is now identified, by proof rather than assertion. The **configuration** snapshot is not, and S0 does not claim otherwise.

**Source — IDENTIFIED.** The runner text the reviewer reasoned from is byte-identical to the runner on disk:

```
packet fence   lines 104..560 of CONSULT-PACKET.md
inlined        457 lines · sha256 cf48433b078560a9bd7c8411d81f32635b387fb46f9a492baabd90183bd114c9
tree           457 lines · sha256 cf48433b078560a9bd7c8411d81f32635b387fb46f9a492baabd90183bd114c9
tree raw bytes 20534 · crlf true
MATCH — the reviewed text is byte-identical to the tree (modulo CRLF and final newline).
```

Measured by `C:/tmp/s0-packet-vs-tree.mjs`, which extracts the first fenced block after the `## 2. THE RUNNER, VERBATIM` heading and compares it to `backend/scripts/safe-migrate.mjs` after CRLF normalisation. **The review is not stale with respect to the runner.** Nothing in the twelve findings was reasoned from a text that has since changed.

**Configuration — NOT identified.** No production catalog observation was authorised, and none was attempted. Production's `users.id` type, and whether production holds `"Users"`, `users`, or both, remain `[UNKNOWN]`. S1 is therefore authorised to *start* (its scope is runner modules and unit tests), but **not to deploy** — which is S1's own STOP gate and is unaffected by this file.

---

## 1. Hash-bound input list

Every artifact this package reasons from, hashed at the snapshot S0 operated on. `HEAD = 378bdad2f5aec0e3c252ed6f9ffbbad2b03df3a8`, branch `creator-brains-engine-r2-20260915`.

| # | File | sha256 (pre-S0) | git | S0 touched |
|---|---|---|---|---|
| 1 | `backend/scripts/safe-migrate.mjs` | `b291aec476d310b55598d5f1f5ed746aafddd634d03ebc6e010e6aea475fb9a1` | tracked · **M** | no |
| 2 | `backend/scripts/render-start.mjs` | `8c316b77ec3c973035aa9cab948ef17192066f76cbf888ba8c72b8b7b707dae2` | tracked · **M** | no |
| 3 | `backend/core/startup.mjs` | `ebdd7a422e3db8a124f63c59f0c83fa94f603a3a2d92be5ede1e0b2f0990cbd8` | tracked · **M** | no |
| 4 | `backend/utils/productionDatabaseSync.mjs` | `78d8570665348734f06f9fba7c2117192effa22cf818820dbd239fe92cafd7b0` | tracked · clean | no |
| 5 | `backend/models/User.mjs` | `2f97cfa502d0b3f10f017a4bd7511ec5f5bfaff2578e5237c4f12a06f6b223f2` | tracked · clean | no |
| 6 | `backend/tests/unit/migrationGuardTableNames.test.mjs` | `63af7fef24fc569d6ccaa8f55526605ad61a8e242275740dac09fab1e046e8ee` → **`051c7c10d806f3103bd68fce071d57fb20f92f426fa442787b69cfc523e69f58`** | **UNTRACKED** | **YES** (§3) |
| 7 | `backend/tests/unit/safeMigrateControlFlow.test.mjs` | `4b796008de9c3d3a68652c8c7c07b98e80497a13c7e5b9feb7c17a54fcd98106` | **UNTRACKED** | no |
| 8 | `backend/migrations/helpers/resolveUsersTable.cjs` | `02d9c23c2e07a08ac67afacfc2fa2aa27d51b25372194fef8b890e63e99b65ec` | tracked · clean | no |
| 9 | `backend/migrations/20260220100000-fix-sessions-fk-to-correct-users-table.cjs` | `f9201b5ff6f8106f1c1de2df4084e827aa3ea6b627791c65527c348e78c089c0` | tracked · clean | no |
| 10 | `backend/migrations/20250528140000-fix-uuid-integer-mismatch.cjs` | `05131623546a47379abae7823046b24c63aff4b7c4175fab906edd215b088362` | tracked · clean | no |
| 11 | `backend/migrations/20250212060728-create-user-table.cjs` | `3e60e454b34c133a7376bfbd3a73e59c5f9f049ff5addef60b687e0019a5a455` | tracked · clean | no |
| 12 | `backend/migrations/20240115000000-update-orientation-model.cjs` | `bb31d8a8684c84162f58d8ca6ebee0dc00da576c29bd07d82269975029bb5dc7` | tracked · **M** | no |
| 13 | `docs/ai-workflow/AI-HANDOFF/FIX-WORK-ORDER-SUCCESSOR-2026-09-20.md` | `fa7909b0a0c37afca8aaf4f928dbf2e9bc19b54e4aed230ea41f9904527be33a` → **`02daa2cd0e309fb87a51768927955cb9d436ca4d6c7b65cfa932d56a95fc420a`** | **UNTRACKED** | **YES** (§4) |
| 14 | `backend/package.json` | `2e8aba144ec589424564d1d299baeb9a535b6a7b49d5676c5a9a54899141fd5d` | tracked · **MM** | no |
| 15 | `package.json` | `146cdd002f7cefb1ce41010558ac32216176595d41532bcd3413228dfa511abc` | tracked · clean | no |

### 1.1 Three inputs are UNTRACKED — and one of them is the document S0 corrects

`git ls-files --error-unmatch` fails for items **6, 7 and 13**. They exist on disk and are not ignored; they are simply not in the index or in `HEAD`.

**Why this matters, concretely:**

- **Item 13 is the successor work order** — the reconciliation document itself. A `git clean -fd`, an aggressive checkout, or a fresh clone would remove it. Its status corrections in §4 below are therefore **only** bound by the hash in the table above, not by any commit.
- **Items 6 and 7 are the only two test files the review's evidence rests on.** Item 7 is the suite whose 9/9 receipt the review cites. Neither is tracked, so neither is protected by anything.
- **Item 14 is `MM`** — a peer has staged changes to `backend/package.json` *and* further modified it. The test-command evidence in §5 reads the **working tree**, not `HEAD`, so the recorded commands describe an uncommitted configuration.

This is the strongest available argument for S0's own hash-binding requirement: for three of fifteen inputs, **a commit reference cannot identify the artifact, because there is no commit.** Hash is the only identifier that works.

### 1.2 Dirty state

```
HEAD                              378bdad2f5aec0e3c252ed6f9ffbbad2b03df3a8
branch                            creator-brains-engine-r2-20260915
git status --porcelain (lines)    1278
git diff --cached --name-only     97
```

**1,278 dirty paths**, of which **97 are already staged** by concurrent workstreams. S0 staged nothing and modified nothing outside items 6 and 13. The staged count is recorded here because it is a live hazard for any commit attempt from this tree: a scratch index seeded from a stale `HEAD` would convert a peer's mid-run commit into staged *deletions*. (The full mechanism is in the `surgical-partial-commit` skill, §1c.)

**No production connection was made. No migration was run. No file was renamed, moved, or deleted.**

---

## 2. Packet-reported counts vs fresh measurements

S0's third acceptance item. Every count the package asserts, re-measured here, with the direction of any disagreement stated.

| Claim | As supplied (packet/review) | Fresh measurement | Agreement |
|---|---|---|---|
| Migrations in the chain | 312 | not re-counted in S0 (no runner execution) | **carried — see §6** |
| `KNOWN_UNGUARDED` entries | 23 | **23** | agree |
| Debt distribution | "22 `Users` + 1 `SocialLikes`" | **`"Users"` 19 · `"Gamifications"` 2 · `"SocialLikes"` 1 · `"messages"` 1** | **DISAGREES — corrected, §3** |
| Un-dated `.cjs` migrations | 18, of which 3 sort last | 18 / 3 (re-measured cwd-relative) | agree |
| Top-level migrations referencing `"Users"` | 36 | not re-counted in S0 | **carried** |
| Migrations using `resolveUsersTable.cjs` | 10 | not re-counted in S0 | **carried** |
| `ALREADY_APPLIED_PATTERNS` | 6 patterns | 6, of which **5 add zero matches** behind pattern 0 | agree + strengthened |
| `safeMigrateControlFlow` result | 9/9 | **9 passed (9)** via `npx vitest run`, 8.33 s | agree |
| `migrationGuardTableNames` result | not asserted | **5 passed (5)** via `npx vitest run`, 574 ms | newly measured |
| The reviewed runner text | inlined in packet | **byte-identical to disk**, sha256 `cf48433b…` | agree (§0) |
| Extension sets in the runner | three differ | three differ: CLI `cjs\|js\|cts\|ts` · discovery `cjs\|js\|mjs\|sql` · classification `cjs\|js` | agree |

Two claims are marked **carried**: re-measuring them requires executing the runner or walking the whole migration directory, which is S2 scope, and S0 does not silently upgrade an unmeasured number to a measured one.

---

## 3. Debt distribution corrected to 19/2/1/1 — derived, not restated

**File:** `backend/tests/unit/migrationGuardTableNames.test.mjs`
**Change:** the `WHY 23 AND NOT 0` paragraph, which read *"22 of the 23 alter `"Users"`, and the 23rd alters `"SocialLikes"`"*.

The correction is **derived from the array**, not typed from the review:

```
total entries: 23
  "Users"            19
  "Gamifications"    2
  "SocialLikes"      1
  "messages"         1
distinct families: 4
```

The replacement text states the four families with their counts, records that the previous sentence was false on both counts, attributes it to A1-08 of the hostile review, and states explicitly that **the register itself is unchanged** — a wrong comment is not licence to shrink a ratchet. It also marks deriving these counts at test time as **S2 scope**, since S2's own scope line includes "historical debt comment".

**Ratchet re-verified after the edit:** `npx vitest run tests/unit/migrationGuardTableNames.test.mjs` → `Test Files 1 passed (1) · Tests 5 passed (5)`, 574 ms.

---

## 4. H-item statuses corrected

**File:** `docs/ai-workflow/AI-HANDOFF/FIX-WORK-ORDER-SUCCESSOR-2026-09-20.md`, the §1 reconciliation table.

| Item | Was | Now | Why |
|---|---|---|---|
| **H-03** | `FIXED — do not "fix" further` | **`PARTIAL — STRICT decision settled; completion classification remains defective`** | "Fails the run" was conflated with "classifies the outcome correctly". `ALREADY_APPLIED_PATTERNS[0]` (`/already exists/i`, `safe-migrate.mjs:91-98`) still records a migration complete from error *text*, and `SWAN_MIGRATE_ALLOW_FAILURE=1` (`:373-374`) still marks failures applied while `:64` and `:422` state the opposite. Settled: do not set STRICT. Not settled: completion classification. |
| **H-04** | `FIXED` | **`VISIBILITY-ONLY — the inert set is reported, not reconciled; extension sets unreconciled`** | Recursion and `isExecutableByCli` are real, but three extension sets disagree inside one file — `.cts`/`.ts` are CLI-resolvable yet invisible to the runner; `.mjs`/`.sql` are discovered yet not CLI-loadable. Reporting an inert set is not implementing its schema effects. |
| **H-07** | `OPEN — needs a fresh observation, not a replay` | **`OPEN — production state UNKNOWN; needs a fresh observation, not a replay`** | The word "unknown" was in the evidence column but not the status. Production's `"Users"`/`users` state and `users.id` type are not determinable from the tree — and `helpers/resolveUsersTable.cjs` resolving that ambiguity at runtime in 10 files is the repo's own admission of it. A read-only catalog observation is required and has not been authorised. |

No other row was touched. In particular **H-02, M-10 and O-02 keep their existing verdicts** — the review did not disturb them and S0 is not a licence to re-grade the table wholesale.

---

## 5. Actual test commands from the supplied runtime configuration

S0's sixth acceptance item: record what the runtime actually is, *before* relying on historical results. Read from `backend/package.json` (item 14, working tree — note the `MM` state).

**Runtime, as configured:**

| Key | Value |
|---|---|
| `engines.node` | `>=22 <23` |
| `vitest` | `^4.0.18` |
| `sequelize` | `^6.37.5` |
| `pg` | `^8.13.3` |
| `sequelize-cli` | `^6.6.2` |

**Scripts that exist:**

| Script | Command |
|---|---|
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `test:coverage` | `vitest run --coverage` |
| `test:integration:waiver` | `vitest run --config vitest.integration.config.mjs` |
| `test:mutation` | `vitest run --config vitest.mutation.config.mjs` |
| `test:all` | `npm run test:mutation && npm test` |
| `migrate:test` | `npx sequelize-cli db:migrate --config config/config.cjs --migrations-path migrations --models-path models --env test` |

**Config facts that matter:** `vitest.config.mjs:13` sets `globals: true`; `:16` includes `tests/**/*.test.{js,mjs}`; `:23` loads `setupFiles: ['./tests/setup.mjs']` (the source of the `[Test Setup] Backend test environment initialized` banner). There is **no `node --test` script anywhere** in `backend/package.json`.

**Historical results, restated with the command that produced them:**

| Result | Command actually used | Verified |
|---|---|---|
| 9/9 control-flow | `npx vitest run tests/unit/safeMigrateControlFlow.test.mjs` | re-run, 8.33 s |
| 5/5 guard ratchet | `npx vitest run tests/unit/migrationGuardTableNames.test.mjs` | re-run, 574 ms |

Both were produced by **vitest**, not by `node --test`.

---

## 6. N-1 — every acceptance command in this package is a false-green generator

**This is a new defect, found while executing S0. It is NOT in the filed review** (`2026-09-20-172515-ss-pt-migrations-reconciliation-safe-migrate.md`), which covered the runner and the package as supplied. No reader should treat that filing as complete without this section.

**Claim under review:** the S1–S6 acceptance commands gate their slices.

**Evidence.** Every acceptance command in `05-slices.md` is written as `node --test <file>`. Measured on the two suites that exist:

```
$ node --test tests/unit/migrationGuardTableNames.test.mjs
1..1
# tests 1
# suites 0
# pass 1
# fail 0
exit=0

$ node --test tests/unit/safeMigrateControlFlow.test.mjs
1..1
# tests 1
# suites 0
# pass 1
# fail 0
exit=0
```

Those files declare **5** and **9** cases respectively (`grep -cE "^\s*(it|test)\("`), and both begin with `import { describe, expect, it } from 'vitest';` (`safeMigrateControlFlow.test.mjs:42`).

**Mechanism.** `node --test` loads each file as a single test. The vitest import resolves against `node_modules`, so `describe`/`it` are defined and register cases with **vitest's collector, which is not running**. Nothing throws. The module loads cleanly, so `node --test` counts the *file* as one passing test. **The reported `pass 1` is the file, not the cases: 0 of 5 and 0 of 9 assertions executed, and the exit code is 0.**

**Exploitability / reach.** Total, and silent. S1, S2, S4, S6 and S5 all specify this command form. A builder who writes the named contract test in the repo's own house style — `import { describe, expect, it } from 'vitest'`, which is what both existing test files do — gets **`PASS` printed by a gate that ran nothing**, with no failure and no warning. The mutation requirements (`05-slices.md:32`, `:88`) do not help: a mutation test needs the suite to execute before it can detect the mutation.

**Why it matters.** This is the exact failure class the package's STOP gates were written to prevent, one layer down. S1's acceptance is *"all 12 top-level cases pass"* — and the command specified to establish that cannot count cases at all. A green S1 would be evidence of nothing, and every later slice inherits the false green. It also means the *historical* results are the only trustworthy ones, because they were run through vitest.

**Fix.** Do not change the tests to suit the command — change the command to suit the runtime, and make the gate prove it ran something:

1. Write the S1–S6 acceptance commands as `npx vitest run <file>` (or `npm test -- <file>`), matching `backend/package.json`'s actual runtime.
2. Make each acceptance **assert its own case count**, so a gate that executes zero cases fails: the `vitest run` reporter already prints `Tests N passed (N)`, and the builder must record `N` matching the slice's declared case count. A `pass 1 / suites 0` signature must be treated as a **failure**, not a pass.
3. If `node --test` is genuinely wanted, the test files must be written as `node:test` files (`import { describe, it } from 'node:test'`) and must not rely on `globals: true` or `setupFiles` — a real change of house style, not a one-line edit, and it would lose `tests/setup.mjs`.
4. Add a negative control to the slice: run the acceptance command against a deliberately empty test file and confirm the gate **fails**. A gate that passes an empty file is not a gate.

**Handling.** Recorded here rather than filed as a second Rule 86 artifact, because Rule 86's unit of record is a *review pass* and this was found by execution during S0, not by a reviewer seat. It must be carried into the next hostile pass — which S1's dry-loop requires anyway — where it will be archived with the round's other findings. Flagged loudly so it is not mistaken for something the existing filing covers.

---

## 7. Every A1 finding — corrected instruction or named unresolved dependency

S0's first acceptance item. Twelve rows, each resolved to exactly one of the two permitted states.

| A1 | Resolution | Where it landed |
|---|---|---|
| **A1-01** completion by error text; pattern 0 subsumes 1–5 | **Corrected instruction** | D1 of the filing; H-03 → PARTIAL (§4). Fix direction: delete patterns 1–5, stop classifying completion by text, route existing databases to a catalog-verified adoption path. |
| **A1-02** `ALLOW_FAILURE` makes logs state the opposite of the code | **Corrected instruction** | D2. Reject `ALLOW_FAILURE=1` before connecting; report observed metadata state separately from execution outcome. |
| **A1-03** parent and child configuration not demonstrably shared | **Corrected instruction + named unresolved dependency** | D3. Fix is a unified configuration plus a database-identity handshake; the dependency is *whether they currently agree in production*, which requires reading `config.cjs` and is **not established**. |
| **A1-04** `getExecutedMigrations()` swallows every error | **Corrected instruction** | D4. Recognise only the confirmed absence of the metadata relation; every other error stops before child execution. |
| **A1-05** child wrapper has no error handler or deadline; guard comment overclaims | **Corrected instruction** | D9. Handle `error`/signals/timeout/`close`, settle once; compare resolved filesystem identities; rewrite the comment. |
| **A1-06** schema conclusion exceeded its evidence | **Corrected instruction** | D5. Retract the asserted production two-table state; obtain a read-only catalog observation. The packet's own search is corrected in the filing §5 (C1). |
| **A1-07** D4's "renaming changes nothing" premise inverted | **Corrected instruction** | D6. Preserve historical filenames and bytes; introduce a tracked migration epoch. The premise is corrected in the filing §5 (C2). |
| **A1-08** debt register explanation false | **Corrected instruction — executed** | **Done in S0** (§3): 19/2/1/1, derived, ratchet re-verified 5/5. |
| **A1-09** "self-contradiction" overstated; §5.4 command unreproducible | **Corrected instruction** | D11 and filing §5 (C3, C4). Use "overlapping, unverified transformations"; run the count cwd-relative. |
| **A1-10** migration exit is not a release gate; model layer keeps DDL authority | **Corrected instruction + named unresolved dependency** | D7. Couple epoch selection, schema-readiness enforcement and removal of the production DDL fallback; the dependency is the **cutover decision**, owner-held. |
| **A1-11** three extension sets differ; "H-04 FIXED" overstates | **Corrected instruction** | D12; H-04 → VISIBILITY-ONLY (§4). Distinguish discovered / CLI-resolvable / approved. |
| **A1-12** tests' scope bounded; 9/9 asserted without receipt | **Corrected instruction** | D8. Receipt pasted; add real PostgreSQL/CLI fixtures and catalog assertions; mark unexecuted tests NOT RUN. |

**All twelve resolved. Zero left as bare assertions.** Four carry a named unresolved dependency (A1-03, A1-06, A1-10, and A1-12's missing fixtures); none of those dependencies is answerable from the repository.

---

## 8. S0 acceptance — measured, not claimed

| S0 acceptance item | Status | Evidence |
|---|---|---|
| Every A1 finding has a corrected instruction or a named unresolved dependency | **MET** | §7 — 12/12 resolved |
| Record current file hashes and dirty state without staging or modifying unrelated files | **MET** | §1 — 15 files hashed pre- and post-edit; `HEAD` and 1,278/97 dirty+staged counts recorded; only items 6 and 13 modified |
| Distinguish packet-reported counts from fresh measurements | **MET** | §2 — two claims explicitly marked *carried*, not upgraded |
| Correct debt distribution to 19/2/1/1 | **MET** | §3 — derived from the array; ratchet re-run 5/5 |
| Mark H-03 partial, H-04 visibility-only, H-07 production state unknown | **MET** | §4 — all three status cells rewritten |
| Record actual test commands from supplied test/runtime configuration before using historical results | **MET** | §5 — runtime, config facts and the two commands that produced the historical results |

**S0 is complete.** It made two documentary edits and one new measurement (N-1), touched nothing else, and staged nothing.

---

## 9. What S0 did NOT do, and why

- **No production connection, read or write.** The blocking unknown (§0) is untouched by design; it needs authorisation S0 does not hold.
- **Did not run the migration runner.** So "312" stays a *carried* count rather than a re-measured one. Running it would execute DDL.
- **Did not rename, reorder or delete any migration.** D6 establishes that renaming re-runs in production.
- **Did not shrink or re-derive the guard register at test time.** S2 scope; S0 corrects the comment only.
- **Did not re-grade the H-table beyond the three named rows.** S0's instruction is three rows, not a revision of the reconciliation.
- **Did not commit.** 97 paths are already staged by peers; the tree is not a safe commit surface for this workstream, and S0's scope is a documentary freeze, not a landing.
- **Did not file N-1 as its own archive artifact.** Reasoning stated in §6.

---

## 10. Carried into the next slice

| # | Item | Owner |
|---|---|---|
| 1 | **N-1** (§6) — acceptance commands false-green; must be fixed before S1's gate means anything | next builder + next hostile pass |
| 2 | **Three untracked inputs** (§1.1) — including the successor work order. A `git clean` deletes them | whoever lands this workstream |
| 3 | **`backend/package.json` is `MM`** — the recorded test commands describe an uncommitted configuration | whoever lands this workstream |
| 4 | **`03-contracts.md` is 312 lines**, over the Forge's ~300-line budget; splitter WARNed | builder, at the schema-contract boundary |
| 5 | **Five rows of `04-build-order.md` self-marked BLOCKED/UNKNOWN** — honest gates, not gaps to fill with judgement | owner evidence supplement, before S1 |
| 6 | **D1/D2/D3/D4/D5/D6/D8 remain owner-held decisions** | Sean |
| 7 | **S1's STOP** — do not deploy independently of catalog reconciliation | standing |
