# 26 — L5 artifact supply vs `11-lane-test-index.md` (index falsification)

**Purpose:** `11-lane-test-index.md §3` measured L5 at `2026-09-20T17:30-07:00` and recorded
**every named L5 artifact as `NOT FOUND`**. That measurement is now stale: most of those artifacts
have been built and committed. This record replaces the stale claim with a measurement at
`6407f6b40`, so no later reader inherits a false "L5 is unbuilt" premise.

## 1. The index's L5 table, re-measured

Measured with `git cat-file -e HEAD:<path>` — object presence at HEAD, not a worktree read, so
untracked scratch cannot inflate the result.

| Artifact (per `05-slices.md`) | Index said (17:30) | Measured at `6407f6b40` | Supplied by |
|---|---|---|---|
| `emailTemplates.mjs` | NOT FOUND | **PRESENT** | S1 `786d0b8ca` |
| `leadUnsubscribeToken.mjs` | NOT FOUND | **PRESENT** | S1 `786d0b8ca` |
| `__tests__/emailTemplates.test.mjs` | NOT FOUND | **PRESENT** (44 tests) | S1 `786d0b8ca` |
| `leadRoutes.mjs` (S2 handler) | PRESENT (base) | **PRESENT + MOD** | S2 `1f82e57a2` |
| `tests/api/leadUnsubscribe.test.mjs` | NOT FOUND | **PRESENT** (11 tests) | S2 `1f82e57a2` |
| `emailAutomationSender.mjs` | NOT FOUND | **PRESENT** | S3 `85edad178` |
| `__tests__/automationService.emailChannel.test.mjs` | NOT FOUND | **NOT FOUND — blocked** | S3 (see below) |
| `__tests__/automationService.speedToLead.test.mjs` | NOT FOUND | **NOT FOUND — gated** | S4 (not started) |
| `SpeedToLeadStatusCard.tsx` (+ test) | NOT FOUND | **PRESENT** (11 tests) | S5 `55c538686` |

**7 of 9 supplied. 2 outstanding, and both are outstanding for the same named reason.**

## 2. Why the two remain absent — and why that is not drift

`automationService.emailChannel.test.mjs` is S3's processor test. It cannot be written to pass
while `automationDecisionService.mjs:86` fails every non-sms channel: the behaviours the test must
assert (status `sent`, `sent_at` set, `sendGridEmail` called with the rendered subject/html) all
require the send branch at `automationService.mjs:312`, which is unreachable. Writing the test
against a knowingly-unreachable branch would produce either a red suite or a test that asserts the
*wrong* behaviour. **Recorded in `24-l5-s3-specification-gap.md`; ruling requested in
`25-astra-ruling-request-l5-s3.md`.**

`automationService.speedToLead.test.mjs` is S4's sequence test, and S4 is downstream of S3 in the
declared slice order.

## 3. The path-drift note, resolved

The index flagged that L5's criteria name S1/S3 tests as `__tests__/…` and S2 as `tests/api/…`,
while existing suites live in `backend/__tests__/`, concluding the paths are *"not all resolvable
as written."*

**This is now settled by construction rather than by argument.** S2's declared path
`tests/api/leadUnsubscribe.test.mjs` was honoured literally — the file is at
`backend/tests/api/leadUnsubscribe.test.mjs` (i.e. `tests/api/…` relative to `backend/`), and it
runs green under `npx vitest run tests/api/leadUnsubscribe.test.mjs` from `backend/`. S1/S3's
declared `__tests__/…` was likewise honoured literally at `backend/__tests__/…`. **Both declared
directory conventions resolve when read relative to `backend/`; the drift was in the index's
reading, not in the criteria.** No reconciliation is owed at admission.

## 4. Classification is unchanged

The index's `EXTEND, not greenfield` classification (per A1-04) still holds and is now *more*
supported: three of the four modified-in-place files were pre-existing
(`automationService.mjs`, `leadRoutes.mjs`, `automationSafetyRoutes.mjs`), and S2/S5 modified
`leadRoutes.mjs` and `automationSafetyRoutes.mjs` in place rather than replacing them — which is
what `EXTEND` predicts. Astra's count of **three backend modules + one frontend component** is also
confirmed: the three backend modules and the one component now all exist.

## 5. What this does and does not establish

**Establishes:** the artifacts exist at HEAD, and their acceptance suites pass as recorded in the
per-slice queue entries (`04-build-order.md` rows 10, 10c, 10d).

**Does not establish:** admission. Round 2's verdict stands — *"DEFECTS-FOUND. Admission remains
blocked"* — and nothing here claims otherwise. A test suite passing is a lane artifact fact, not a
product acceptance. Per Round 1's PART C, *"Can artifact tests grant product acceptance?
**Decided:** no."*

**Does not establish:** that S3's block is resolved. It is not; it awaits the ruling.
