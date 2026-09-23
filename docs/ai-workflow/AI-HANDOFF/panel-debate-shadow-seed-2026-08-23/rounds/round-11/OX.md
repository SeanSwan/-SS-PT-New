# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-11/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 19835 in / 7901 out · **Cost:** ~$0.0000 · **Wall:** 322.9s · **finish:** stop

---

# Round 11 — Ox Alpha (stealth), fresh-eyes adversarial

## The defect class the other stances structurally miss: the gate's core mechanism is a no-op

Ten rounds have fought over PK maps, grep patterns, password literals, and dedupe keys. Every one of those fights assumes the seeded data is ever *exercised by a migration*. It never is. Nobody has attacked the two-step migration architecture itself.

**F1 — MIGRATION RUN 2 IS A GUARANTEED NO-OP, SO THE SEED PROVES NOTHING.**

Evidence, both sides cited:

- `.github/workflows/migration-shadow-check.yml`, step "Migrate (first run — empty database)": `npm run migrate` — this applies **all 373 migrations** (brief §4 ground truth) and, per standard Sequelize-migrator semantics, records every applied migration in `SequelizeMeta`.
- Brief §6, explicit non-goals: *"Do not seed `SequelizeMeta` — the migration runner owns that table."* The packet itself confirms the runner persists applied-state across runs.
- Therefore step "Migrate (second run — idempotence, WITH DATA)" (`npm run migrate`) lists pending migrations = **zero**. Umzug/sequelize-cli skips everything already logged. No migration statement — destructive or otherwise — ever touches a seeded row.
- The workflow's own comment claims: *"MIGRATION RUN 2 — against the POPULATED database … This is the check the empty-database version of this job could never provide."* False. The seeder header makes the same claim (*"the migration gate's SECOND migration run executes against a populated database. A destructive or data-dependent migration then has something to break against"*), as does brief §1 and §5.3. The code contradicts all three — per rule 5, that contradiction is a finding.
- Worse, doubly broken: even if run 2 did re-execute something, the seed runs *after* run 1, so the pushed commit's destructive migrations already executed against **empty** tables in run 1. The exact failure mode Grok's quote in brief §2 describes ("goes green on the empty shadow DB… Production data is gone") still goes green under this workflow, unchanged.

This is the §9 trap verbatim: *"a gate that reports green while inspecting the wrong surface is worse than no gate"* — here the gate inspects the right surface (populated DB) but **no migration ever runs against it**. Ten rounds of insert-mechanics findings are repairs to an engine that is never started.

Required fix direction (design-level, needs seat decision): run baseline migrations (all except the PR-new set, derived by diffing `backend/migrations/` against base branch), **then** seed, **then** apply only the PR-new migrations against populated tables. Alternatively drop SequelizeMeta rows for the PR-new migrations before run 2. Until one of those ships, the workflow comment and seeder header must stop claiming data-populated migration coverage, and the brief's acceptance criteria are unmet.

## Rejecting one consensus item on a direct count

**REJECT consensus item (8)** — "the selftest has 31 checks, not 32." Count the `ok()` calls in `backend/scripts/seed-shadow-db.selftest.mjs`: validateShadowUrl section = 8; topoSort = 4; deterministicUuid = 4; serializeReport = 3 + 2 = 5; generateRowValues section = 6; value-type mirror = 5. Total **8+4+4+5+6+5 = 32**. The builder's "32/32 PASS" claim is consistent with the file. The prior round's finding was a miscount; item (8) would "fix" a non-defect.

## Secondary finding while counting types

**F3 — MINOR:** `seed-shadow-db.mjs`, `generateRowValues` numeric dispatch chain: `/INT(eger)?|BIGINT|SMALLINT/` is an unanchored substring match — it matches `POINT` (contains "INT"), so a Postgres geometry column receives an integer and fails the insert (reported per-table, but avoidably). Anchor it (`/(^|[^A-Z])INT/i` style) or enumerate exact Sequelize type names.

Everything else in the consensus candidate — items (1)–(7) — is adopted verbatim; item (4) remains MAJOR (with `POSTGRES_PASSWORD: "***"` at workflow L25 the container password is the literal string `***`, so *no* step using the shadow URL can authenticate; the job can never go green, which also means consensus's demand for "one real green CI run as proof" is currently unsatisfiable — reinforcing F1's point that no honest end-to-end proof exists).

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F1=MAJOR: .github/workflows/migration-shadow-check.yml steps "Migrate (first run)"/"Migrate (second run)": run 2 is a guaranteed no-op — run 1 already logs all migrations in SequelizeMeta (brief §6 confirms runner owns it), so NO migration ever executes against seeded data; seeder header PURPOSE, workflow comment, and brief §1/§5.3 all claim coverage the mechanism cannot deliver | F2=MINOR: seed-shadow-db.mjs generateRowValues numeric chain: unanchored /INT(eger)?|BIGINT|SMALLINT/ substring-matches types like POINT, emitting integers for non-integer columns | F3=MINOR: consensus item (8) is a miscount — selftest has exactly 32 ok() calls (8+4+4+5+6+5); builder's 32/32 claim is correct
rebuttals: ITEM-8=REJECT: counted ok() assertions in seed-shadow-db.selftest.mjs total 32, not 31; there is no count defect to fix | F1=MAJOR: new finding, see above | ITEM-5=AGREE: grep tightening is sound hardening (note: tail -1 already selects the report line today, so (5) is defense-in-depth, not a live bug)
open: Q1=which run-2 redesign do seats endorse: baseline-migrations→seed→apply-only-PR-new-migrations, vs deleting SequelizeMeta rows for PR-new migrations before run 2 — and who verifies SequelizeMeta skip semantics on the real runner
consensus_block: ADOPT items (1)-(7) verbatim as specified (hoist tableNameToModel + attr-derived parents; pkCols array for updateOnDuplicate; PK-map insertedIds with generateRowValues/backfill readers plus fixture updates; workflow L25 POSTGRES_PASSWORD/DATABASE_URL password = "shadow"; assert grep '^SHADOW-SEED {'; delete vitest.config.mjs L34-L35 retry:1; dedupe backfill on (table,col)). REJECT item (8): no count fix needed — 32 ok() calls verified. ADD F1 as blocking MAJOR: the two-full-migrate architecture must be replaced (baseline migrate → seed → apply only PR-new migrations, or targeted SequelizeMeta rollback before run 2) OR the workflow/seeder/brief claims must be downgraded to "schema boot + seed smoke test" honestly stating no destructive-migration coverage. ACCEPTED INTENTIONAL: PII guard, determinism, synthetic-over-snapshot, F5/F6 deferral. RESIDUAL RISK: until F1 is resolved the job's green state certifies nothing about data migrations; composite-PK paths and the corrected YAML remain unproven without one real green run; deps graph still misses non-attribute/non-association FKs (manual review of 217 models advised).
=== END-VERDICT ===
