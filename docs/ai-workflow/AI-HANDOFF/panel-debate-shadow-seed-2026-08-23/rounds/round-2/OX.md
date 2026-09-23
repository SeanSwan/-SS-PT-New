# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-2/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 19137 in / 8767 out · **Cost:** ~$0.0000 · **Wall:** 315.2s · **finish:** stop

---

# OX-ALPHA — ROUND 2 — FRESH-EYES ADVERSARIAL

Holding the lens: find the defect class the other seats structurally miss. Round 1 converged on the dependency-graph gap and the single-vs-composite PK question. Both are real. Neither is the class I'm here for. The class being missed: **the idempotency contract is tested only against the happy path of "table has exactly one simple PK and no other unique constraints" — and the packet's own generator guarantees the unhappy path exists.**

## New findings

**F1 — MAJOR: two-run idempotency crashes on any table with a unique non-PK column.**
Evidence chain, fully locatable:
- `backend/scripts/seed-shadow-db.mjs` L278–287 (generateRowValues string branch): unique non-PK columns emit `seed-<table>-<col>-<rowIndex+1>` — **deterministic**, identical run-to-run by design.
- `backend/scripts/seed-shadow-db.mjs` L368–374 (main, bulkCreate block): `updateOnDuplicate: [pkCol]` makes Postgres emit `ON CONFLICT ("<pk>") DO UPDATE …`. On run 2, the row already exists; the **email-style unique index** (not the PK) is violated first. Postgres raises `unique_violation` because the conflicting constraint is not the conflict target.
- The catch at L371–373 falls back to a **plain** `bulkCreate` — which hits the same unique index and fails again.
- Result: `failed.push(...)` → exit 1. This directly contradicts brief §7 acceptance criterion: *"Running the seed twice in a row does not crash and does not duplicate primary keys"* — and the header's IDEMPOTENCE claim ("a second run inserts nothing new… leaves values untouched") is a builder assertion the code contradicts. Per rule 5, that contradiction is a finding.
- Note the consensus candidate's remedy ("ON CONFLICT DO NOTHING") is directionally right but underspecified: a **target-less** `ON CONFLICT DO NOTHING` is what covers *all* unique indexes; a targeted one reproduces this exact bug. The fallback must replace the plain-insert retry, not supplement it.

**F2 — MAJOR: the consensus fix as written introduces a new crash for zero-PK tables.**
Evidence: `seed-shadow-db.mjs` L368–374 — today, `pkCol === undefined` routes to the plain-insert else-branch, so a model with no declared PK (legal in Sequelize; join/through tables commonly) **duplicates every row on run 2** — same acceptance-criterion breach, currently sitting in the unresolved list as "bulkCreate no-pkCol else-branch." The consensus candidate changes `pkCol` → `pkCols` array and passes it unconditionally. When `pkCols.length === 0`, Sequelize builds `ON CONFLICT () DO UPDATE` → immediate SQL error → caught → plain insert → duplicates. The fix needs a guard: `if (pkCols.length > 0) { upsert path } else { explicit decision — delete-before-insert or documented skip }`. Adopting fix (2) verbatim converts a latent gap into a guaranteed syntax error on every zero-PK table.

**F3 — MINOR: the honest-count guarantee has a hole — `dbRows` counts rows the seeder did not insert.**
Evidence: `seed-shadow-db.mjs` countRows (≈L495–505) plus the counting loop over `seededNames` (≈L500–510): it runs `SELECT count(*)` on the whole table. Any table that a **migration itself populates** (defaults, lookup rows) contributes to `dbRows` even if the seeder's generated rows all failed validation for that table's remaining columns. The "silent no-op must not look green" contract (header REPORT block, brief §5.3) is weakened: a seeder that inserts nothing into migration-populated tables still reports `rows > 0`. Count delta (before vs after) or per-batch return accounting closes it.

**F4 — NOTE: `getTableName()` object-shape hazard.**
`seed-shadow-db.mjs` plainTable (≈L345–349) and normalizeModel (≈L296–305) do `String(raw).replace(/"/g,'')`. When a model declares a schema, Sequelize's `getTableName()` returns `{ schema, tableName }` — `String()` yields `"[object Object]"`, corrupting `insertedIds` keys, `tableNameToModel`, and `countRows`. Latent (no schema use visible in the packet), but the same one-line normalization fixes all three sites.

**F5 — MINOR (adopted from round 1, sharpened):** `migration-shadow-check.yml` assert step (L93–98): `grep '^SHADOW-SEED '` also matches the per-table `SHADOW-SEED OK …` and `SHADOW-SEED cycle-backfill …` lines. `tail -1` currently rescues it only because the report line happens to print last; harden to `grep '^SHADOW-SEED {'` so the assert survives any future log-line reordering. Also note the seed step (L77) redirects stdout only — FAIL/SKIP lines reach the console, which is correct, but the artifact upload captures only the log; acceptable.

## Rebuttals to the consensus candidate

- **AGREE** fix (1): extending the deps graph with `normalizeModel(m)`'s `foreignKeyTarget` parents aligns the graph with what `generateRowValues`/`fkColsOf` actually consume (meta is built from `foreignKeyTarget`; deps was built from `m.associations` only — the two surfaces disagree today).
- **REJECT** fix (2) as written: the unconditional `pkCols` array crashes on empty arrays (F2), and the prescribed fallback must be a **target-less** `ON CONFLICT DO NOTHING` replacing the plain-insert retry, otherwise F1 survives the fix. Amend, don't apply verbatim.

## Verdict rationale

Round 1's panel attacked structure (graph, PK arity, grep anchoring). The structurally missed class is **constraint interaction under determinism**: the generator deliberately makes values reproducible, which makes every unique constraint a run-2 collision, and the upsert strategy only defends the PK. F1 is provable without Postgres (SQLite honors unique indexes and `updateOnDuplicate`), so the "UNPROVEN-by-necessity" header claim does not shield it — this one is locally reproducible and was not exercised by either test file: `seed-shadow-db.test.mjs` never invokes the bulkCreate path, and `seed-shadow-db.selftest.mjs` tests only the pure core. The DB-free test boundary is precisely why this class escaped.

=== VERDICT ===
status: DISPUTE
confidence: 88
findings: F1=MAJOR: seed-shadow-db.mjs L368-374+L278-287: two-run idempotency crashes on tables with unique non-PK columns — deterministic unique values collide on run 2, ON CONFLICT(pk) does not cover that index, plain-insert fallback fails identically -> failed[] -> exit 1, contradicting brief §7 "runs twice without crashing" and the header IDEMPOTENCE claim | F2=MAJOR: seed-shadow-db.mjs L368-374: zero-PK tables take the plain-insert else-branch and duplicate all rows on run 2; the consensus fix (unconditional pkCols array) makes this worse by passing [] to updateOnDuplicate -> invalid ON CONFLICT () -> same crash; guard pkCols.length>0 required | F3=MINOR: seed-shadow-db.mjs L495-510: dbRows counts pre-existing migration-inserted rows in seeded tables, so a near-no-op seed can still clear the rows>0 CI assertion | F4=NOTE: seed-shadow-db.mjs L296-305+L345-349: getTableName() returning {schema,tableName} object stringifies to "[object Object]", corrupting insertedIds/tableNameToModel/countRows keys | F5=MINOR: migration-shadow-check.yml L93-98: grep '^SHADOW-SEED ' also matches SHADOW-SEED OK/cycle-backfill lines; harden to '^SHADOW-SEED {'
rebuttals: consensus-fix-2=REJECT: unconditional pkCols array crashes on empty arrays (F2) and the fallback must be target-less ON CONFLICT DO NOTHING replacing the plain-insert retry, else F1 survives the fix | consensus-fix-1=AGREE: deps graph must add normalizeModel foreignKeyTarget parents; meta and deps currently disagree
open: Q1=does CI ever re-run the seeder against a non-fresh shadow DB (calibrates F1/F2 severity vs the §7 criterion which demands it regardless) | Q2=do any of the 217 models lack a declared PK or carry unique non-PK columns (confirm F1/F2 blast radius empirically)
consensus_block: Adopt fix (1) verbatim: in seed-shadow-db.mjs main() deps construction, also push normalizeModel-detected foreignKeyTarget table names into deps.get(nm). AMEND fix (2): compute pkCols via filter; use updateOnDuplicate:pkCols ONLY when pkCols.length>0; replace the plain-insert catch fallback with a target-less INSERT ... ON CONFLICT DO NOTHING (raw query or sequelize.query) so ALL unique indexes are idempotent on run 2; for pkCols.length===0 choose delete-before-insert or document-and-report the duplicate. Add F3 fix: count rows as after-minus-before per table. Add F5 fix: yml L95 grep '^SHADOW-SEED {'. Accepted-as-intentional: strict deps graph red-gating DB-level drift; loopback-exact safety gate. Residual risks: end-to-end insert still unproven locally — F1/F2 MUST be reproduced against a real dialect (SQLite suffices for F1) before merge; schema-qualified table names (F4) latent.
=== END-VERDICT ===
