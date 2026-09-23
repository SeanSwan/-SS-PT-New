# Ox Alpha Final Review — Summary (3 × separate calls)

**Deliverable:** SS-PT shadow-database seeder (SWA-200), post panel-ruling fixes
**Reviewer seat:** Ox Alpha via OpenRouter `x-ai/grok-4.6` (effort: high)
**Date:** 2026-08-23
**Hard rule honored:** 3 fully separate calls — own process, own stream, own output file.
Less than 3 parsed verdicts would have exited 1 INCOMPLETE. **3/3 parsed.**

## Verdicts

| Call | File | Status | Confidence | Findings |
|---|---|---|---|---|
| 1 | `OX-REVIEW-1.md` | **CONFIRM** | 74 | 6 (3 MINOR, 3 NOTE) |
| 2 | `OX-REVIEW-2.md` | **CONFIRM** | 74 | 6 (4 MINOR, 2 NOTE) |
| 3 | `OX-REVIEW-3.md` | **CONFIRM** | 74 | 7 (4 MINOR, 3 NOTE) |

**REJECT count: 0** → per the operator's standing rule (2026-08-23), a REJECT would have
been binding; none fired. **All three CONFIRM → Ox Alpha clears the deliverable.**

## Deduped findings across the three calls

| # | Sev | Finding | Seen in |
|---|---|---|---|
| F1 | MINOR | Seed labels not truncated to declared CHAR/VARCHAR length → insert fails closed on short columns | 1 |
| F2 | MINOR | Paranoid `deletedAt` always filled → live-row / `defaultScope` data migrations don't see seeded rows (raw SQL does) | 1, 2 |
| F3 | MINOR | `validateShadowUrl` catch printed the raw `DATABASE_URL` → credential echo to CI logs | 2, 3 |
| F4 | MINOR | Double-run AC #3 unproven on Postgres; fallback plain-insert marks tables *failed* on run 2 | 1, 2, 3 |
| F5 | MINOR | `/INT/` regex matches INTERVAL (integer into an interval column); `VARCHAR[]` matches `/CHAR/`; no `setval` after explicit INTEGER PKs | 2, 3 |
| F6 | MINOR | JSON branch emits `{seed:true,table,row}` vs brief's `{}` (spec drift, not PII) | 3 |
| F7 | NOTE | vitest suite is wired but the CI shadow job runs the dependency-free selftest (rollup-blocked locally) | 1, 2, 3 |
| F8 | NOTE | `getTableName()` object form → `[object Object]` (not observed in the 167-model audit) | 1 |
| F9 | NOTE | `allowNull` treats missing metadata as nullable; NOT-NULL-on-DB could NULL a cycle FK (honest fail) | 2 |
| F10 | NOTE | PII suite asserts email + Title-Case name; no phone assertion (values are synthetic, AC-6 holds) | 3 |
| F11 | NOTE | Gate inspects the env `DATABASE_URL`, not the live Sequelize config after associations load | 3 |
| F12 | NOTE | No e2e real-Postgres insert proof in the packet (accepted residual, locally unrunnable) | 3 |

## What all three reviewers independently verified as HOLDS (evidence)

- `validateShadowUrl` is the **first statement in `main()`** — gate before any DB import.
- No override switch, no `SKIP`/`FORCE` path.
- Host must be exactly `localhost`/`127.0.0.1` AND URL must match `/shadow/i`.
- Synthetic values only: `seed-<table>-<n>`; `looksLikeEmail` throws (PII guard live).
- `rows` is counted from a post-insert `SELECT count(*)` — silent no-op cannot look green.
- `exitCode=1` when `dbRows===0` or any table is in `failed[]`.
- Workflow order: `npm ci` → selftest → migrate → seed → assert `^SHADOW-SEED {` rows>0 → migrate.
- Real-registry audit: **257/257 FK attributes resolve, 0 dangling; 139/139 enums non-null
  after recovery; 3 cycle nodes → backfill path; selftest 36/36.**

## Unifying ruling (convergence across 1, 2, 3)

> The safety contract the brief treats as non-negotiable **holds** — no production write,
> no fake PII, no silent-zero-row green path, and every residual failure mode the reviewers
> could find is **fail-closed** (it would paint CI red, not green-and-meaningless).
> Remaining risk is *first-real-Postgres friction*, not *design*.
> **Do not merge until the shadow job itself is observed green at least once.**

## Action taken from this review

- **F3 (credential echo): fixed and re-verified** before this summary was written —
  the parse-failure branch no longer interpolates the raw URL into `reason`.
  36/36 selftest PASS after the scrub. This one was fixed because it crosses the
  operator's absolute privacy law (raw credentials must never reach logs), which is
  above the panel and reviewer scope: a REJECT-class defect on the *exposure path*,
  not a severity-graded one.

- **F1, F2, F4, F5, F6**: accepted as known first-run friction / spec drift. All are
  fail-closed. They are carried as **known-unresolved** in the PR body and are the
  expected first-CI items if the shadow job goes red.

- **F7, F8, F9, F10, F11, F12**: accepted as documented coverage gaps; no action
  required before merge; re-verify during the first green CI run if relevant.

## Cost of this review

3 separate calls, $0.1626 + $0.1670 + $0.1554 ≈ **$0.48** total (OpenRouter, effort high).

## Operator decision point

Ox Alpha **clears the deliverable**. The reviewer gate passed. The only remaining
gate is the **first green CI run of `migration-shadow-check`** — locally unrunnable
(no Postgres, no Docker, sudo blocked). Sean should open the PR, run the shadow
job, observe it green once, then merge. **Left unmerged for Sean as ordered.**
