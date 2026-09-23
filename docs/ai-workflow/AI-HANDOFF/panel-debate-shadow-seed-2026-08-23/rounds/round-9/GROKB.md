# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-9/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 20546 in / 14317 out · **Cost:** ~$0.1268 · **Wall:** 238.8s · **finish:** stop

---

The packet’s CI and data-truth surface still cannot certify a populated migrate-2. I adopt the quoted candidate. Evidence below is only what the files do.

**Password / trust boundary (workflow L25).** Service env sets `POSTGRES_PASSWORD: "***"` while the brief’s ground truth is user/password/database all `shadow`. The Export step is redacted to `<REDACTED-DB-URL>`, so the packet cannot prove the URL password matches the container. Quoted `"***"` only defeats the YAML alias; it does not authenticate as `shadow`. This YAML has no path to a real green run. That contradicts the builder’s “CI assertion is the production gate.”

**Assert is tail-order, not report-shaped.** Seed stdout is `SHADOW-SEED OK …`, optional `SHADOW-SEED cycle-backfill …`, then `serializeReport` → `` `SHADOW-SEED ${JSON.stringify(clean)}` ``. Assert does `grep '^SHADOW-SEED ' | tail -1`. Today `"rows":[0-9]*` saves it from OK/cycle-backfill false-success, but the contract line is selected by order, not by the JSON prefix the brief specified. `^SHADOW-SEED {` matches the current serializer (space then brace). The running-state claim that this pattern would miss the report is false.

**Seed graph and PK identity are wrong before the first insert.** Section-3 `deps` only walks `m.associations`. `normalizeModel` still sets `foreignKeyTarget` from `a.references.model` when no association exists — generate/backfill see those FKs, topo does not. Children can insert before parents. `pkCol = Object.keys(attrs).find(...)` plus `updateOnDuplicate: [pkCol]` and `values.map(v => v[pkCol])` drop composite PKs. `generateRowValues` assigns `parents[i]` whole; backfill computes `tPk` and never uses it (`insertedIds.get(...)?.[0]`). Those three are one coupled break: maps in `insertedIds` without changing the reader writes objects into FK columns.

**Retry is a false-green.** `backend/vitest.config.mjs` L34–L35 `retry: 1` can pass a failing safety-check on the second try. Delete it.

**Backfill.** `backfill.push` is per row; `UPDATE … WHERE col IS NULL` already fills the column. Dedupe `(table,col)` before UPDATE.

Migrate → seed → assert → migrate-2 order is correct. PII guard, determinism, and synthetic-over-snapshot stay accepted. No new MAJOR beyond the candidate.

=== VERDICT ===
status: CONSENSUS
confidence: 91
findings: F1=MAJOR: .github/workflows/migration-shadow-check.yml L25: POSTGRES_PASSWORD is "***" not "shadow"; Export DATABASE_URL is redacted so password match is unproven — this YAML cannot be a green production gate | F2=MAJOR: backend/scripts/seed-shadow-db.mjs §3 deps loop: parents only from m.associations; normalizeModel foreignKeyTarget from a.references is ignored so topo can insert children first | F3=MAJOR: backend/scripts/seed-shadow-db.mjs §4 pkCol=Object.keys(attrs).find(c=>attrs[c].pk) + updateOnDuplicate:[pkCol] — composite PKs lose conflict target | F4=MAJOR: backend/scripts/seed-shadow-db.mjs §4 insertedIds stores v[pkCol] scalars; generateRowValues assigns parents[i] whole; backfill uses [0] and unused tPk .find — composite PK identity broken | F5=MINOR: workflow Assert step: grep '^SHADOW-SEED ' | tail -1 selects JSON only by stdout order (OK/cycle-backfill share the prefix) | F6=MINOR: backend/vitest.config.mjs L34-L35 retry:1 can green a failed safety-check on retry | F7=MINOR: backend/scripts/seed-shadow-db.mjs §4 backfill.push per row; §4b UPDATE WHERE col IS NULL already fills all
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | F7=AGREE | STALE-GREP-BREAK=REJECT: serializeReport returns `SHADOW-SEED ${JSON.stringify(clean)}` which is `SHADOW-SEED {`; grep '^SHADOW-SEED {' matches; the running-state claim that the space-before-brace change would break the assert is false
open: Q1=unredacted Export DATABASE_URL password (packet redacts the echo) must be confirmed shadow | Q2=composite-PK count among 217 models still unknown until the required green run
consensus_block: FIX ALL: (1) seed-shadow-db.mjs: hoist tableNameToModel before the section-3 deps loop; after the associations walk, add parents from normalizeModel attrs with foreignKeyTarget, mapped through tableNameToModel and kept only if registry.has(parentNm). (2) Replace pkCol=.find with pkCols=Object.keys(attrs).filter(c=>attrs[c].pk); pass pkCols to updateOnDuplicate. (3) Store full PK maps in insertedIds (values.map(v=>Object.fromEntries(pkCols.map(c=>[c,v[c]])))); generateRowValues must set out[col]=parentRow[a.foreignKeyTarget.pk] (not the whole slot); backfill must read insertedIds[targetLower][0][attrs[bf.col].foreignKeyTarget.pk] and delete the unused tPk .find. Update seed-shadow-db.test.mjs + seed-shadow-db.selftest.mjs parentIds fixtures from scalar arrays to PK maps (or the readers break). (4) .github/workflows/migration-shadow-check.yml L25: POSTGRES_PASSWORD: "shadow"; Export DATABASE_URL password must be shadow. (5) Assert step: grep '^SHADOW-SEED {' (not '^SHADOW-SEED '). (6) delete backend/vitest.config.mjs L34-L35 retry:1. (7) dedupe backfill on (table,col) before UPDATE. All seven require one real green CI run as proof — F1 means none exists with this YAML. ACCEPTED INTENTIONAL: PII guard, deterministic generation, synthetic-over-snapshot (§3), F5/F6-of-prior-rounds deferred (unit suite not this job's gate). RESIDUAL RISK: deps still miss FKs not expressed as attributes or associations — manual review of 217 models advised; skipped hard-cycle tables stay empty for migrate-2 (Assert does not fail on skipped); composite-PK paths unverified until that green run.
=== END-VERDICT ===
