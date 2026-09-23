# SS-PT · Shadow-DB seeder for the migration gate (SWA-200)

**Branch:** `wip/comms-notifications-2026-07-05`
**Status:** **UNMERGED — left for Sean per 2026-08-23 instruction.**

## What this PR does

Adds a **shadow-database seeder** for the CI migration gate: a second Postgres
container that the second migration run executes against a *populated* database,
so a destructive / data-dependent migration has something honest to break against
instead of silently no-op'ing on an empty schema.

Deliverables:

- `backend/scripts/seed-shadow-db.mjs` — the seeder (pure core + `main()`)
- `backend/scripts/seed-shadow-db.test.mjs` — vitest, brief §5.2 cases
- `backend/scripts/seed-shadow-db.selftest.mjs` — dependency-free self-test (36/36)
- `.github/workflows/migration-shadow-check.yml` — shadow job
- `docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/` — packet, debate, Ox reviews

## Safety contract (non-negotiable, enforced in code)

- **No override switch, no `SKIP`, no `FORCE`.**
- `validateShadowUrl` is the **first statement in `main()`** — gate before *any* DB import.
- Host must be exactly `localhost` / `127.0.0.1` AND the URL must contain `shadow` (case-insensitive).
- **Synthetic values only:** `seed-<table>-<n>`; `looksLikeEmail` throws — the PII guard is live.
- **No prod read, no snapshot, no `SequelizeMeta`, no fake PII, no `render.yaml` / guard edits.**
- `rows` is counted from a post-insert `SELECT count(*)` — **a silent no-op cannot look green.**
- `exitCode=1` when `dbRows===0` or any table is in `failed[]` — **fail-closed.**
- **Credential echo (F3) is scrubbed:** the gate never interpolates the raw `DATABASE_URL`
  into a reason that prints to stdout / CI logs — the parse-failure branch is redacted.

## Verification evidence (executed, not claimed)

| Check | Result |
|---|---|
| `node --check` on all three JS deliverables | **PASS** |
| Dependency-free selftest (36 checks) | **36/36 PASS, exit 0** |
| Workflow YAML (js-yaml) | 1 job, **12 steps in order** (npm ci → selftest → migrate → seed → assert → migrate) |
| Real-registry audit (in-memory SQLite, 167 models) | **257/257 FK attributes resolve, 0 dangling** · **139/139 enums non-null after recovery** · 3 cycle nodes → backfill path |
| Redaction audit on all five deliverables | **No credential material** — no `zapi`, no `OPENROUTER_API_KEY`, no `GLM_API_KEY`, no bearer, no `BEGIN PRIVATE` — |
| **Ox Alpha final review (3 × separate calls)** | **CONFIRM ×3, REJECT 0, cleared** · $0.48 total |

## Panel debate (authoritative design)

- **Seats:** GLM 5.3 · Grok 4.6 ×2 · DeepSeek V4 Pro · Ox Alpha — **5 seats.**
- **Format:** 10-min floor → 20-round cap, `--min-seats 3`, budget cap `$6.00`, consensus-stop.
- **Outcome:** **budget-capped at 15 rounds, $5.4272** — the orchestrator *refused* round 16
  on the `BUDGET GUARD` and wrote `DISPUTE REMAINS / no fake consensus`. The **R15 strongest
  candidate** was used as the binding ruling.
- **Fixes applied verbatim from the panel ruling:** §1 + 1a (BelongsTo-only FK deps,
  `foreignKeyTarget` attrs as sole source), §2 (composite-PK `updateOnDuplicate`),
  §3 (full parent PK tuples, `fkTarget.pk` read), §4 (workflow `POSTGRES_PASSWORD` +
  DATABASE_URL both `"shadow"`), §5 (Assert grep anchored to `^SHADOW-SEED {`),
  §6 (NO CHANGE — vitest `retry` stays), §7 (backfill deduped on `(table,col)` at push),
  §8 (NO CHANGE — 32/32 selftest claim stands), NEW §9 (selftest step after `npm ci`),
  NEW §10 (seed step `2>&1`).

### Disclosed deviations (per operator's standing rule — say it loud)

1. **GLM R15 "NEW 11" enum fix was applied** and is *not* in the orchestrator's strongest
   candidate block. Kept because the real-registry audit proved it **live**: **139/139 enum
   attributes resolve to a value after the fix, 0 before** — without it every enum column
   seeded NULL and CI would have stayed red. **Flagged for Sean: revert if you want the
   strict 4-seat consensus** (CI risk: red without it).
2. **Ox F3 credential-echo scrub was applied** — `validateShadowUrl`'s parse-failure branch
   no longer interpolates the raw `DATABASE_URL` into the printed reason. **This crosses the
   operator's absolute privacy law (raw credentials must never reach logs)** and was therefore
   fixed above the panel's severity-graded scope. 36/36 re-verified after the scrub.

## Known-unresolved (fail-closed; expected first-CI items if the job goes red)

- **F1** — seed labels not truncated to declared `CHAR/VARCHAR` length → short columns fail closed.
- **F5** — `/INT/` regex matches INTERVAL; `VARCHAR[]` matches `/CHAR/`; no `setval` after explicit INTEGER PKs — first real-Postgres run can fail-closed on CHECK/UNIQUE/ARRAY/sequence.
- **F4** — double-run AC #3 unproven on Postgres (`updateOnDuplicate:pkCols` is the SET list, not the conflict target; the fallback plain-insert marks tables *failed* on run 2, which is honest).
- **F2** — paranoid `deletedAt` always filled → live-row / `defaultScope` data migrations don't see seeded rows (raw SQL does).
- **F6** — JSON branch emits `{seed:true,table,row}` vs the brief's `{}` (spec drift, not PII).
- **F7** — vitest suite is wired but the CI shadow job runs the dependency-free selftest (rollup-blocked locally) — a coverage gap, not a safety gap.
- **F12** — no e2e real-Postgres insert proof (locally unrunnable: no Postgres, no Docker, sudo blocked — **accepted residual**).

## Acceptance gate (per Ox Alpha, all three reviewers independently agreed)

> "Sean should merge only after the shadow job itself is green; that
> run is the remaining proof, not a reason to block the PR on design."

Open the PR → let `migration-shadow-check` run → **observe it green once** → merge.
Left unmerged for Sean as ordered (2026-08-23).

## File list (deliverables)

- `backend/scripts/seed-shadow-db.mjs`
- `backend/scripts/seed-shadow-db.test.mjs`
- `backend/scripts/seed-shadow-db.selftest.mjs`
- `.github/workflows/migration-shadow-check.yml`
- `docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/PACKET.md`
- `docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/FINAL-CONSENSUS.md`
- `docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/final/OX-REVIEW-{1,2,3}.md`
- `docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/final/REVIEW-SUMMARY.md`
- `docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/PR-BODY.md` *(this file)*

## Budget

- Panel debate: **$5.4272** (cap $6.00, 15 of 20 rounds used)
- Ox final review (3 × separate calls): **$0.48**
- **Total: ≈ $5.91 / $6.00 cap** — within budget.
