# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-8/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 20610 in / 19042 out · **Cost:** ~$0.1553 · **Wall:** 352.9s · **finish:** stop

---

The migrate→seed→assert→migrate-2 order in `.github/workflows/migration-shadow-check.yml` is the brief §5.3 contract and is implemented. The defects below are the ones that make that gate lie or fail to boot.

**F1 — password/comment/URL trust boundary (MAJOR).** Workflow L15–L16 claim user/password/database are the literal word `shadow`. L25 is `POSTGRES_PASSWORD: "***"` (quoted, so this is the literal password, not a YAML alias; builder header even brags the alias was “caught and quoted”). Brief §4 requires all three names `shadow`. Export `DATABASE_URL` is packet-redacted, so the pairing is unverifiable. Two outcomes, both contract breaks: URL password `shadow` → Postgres auth fails → job never green; URL password `***` → job can go green on a password the comments/brief say does not exist. No honest green run exists until both sides are `shadow`.

**F2 — deps graph is associations-only (MAJOR).** In `main()` §3, `parents` is filled only from `Object.values(m.associations || {})`. `normalizeModel` already records `a.references` as `foreignKeyTarget`, and `generateRowValues` / backfill consume that. A references-only FK is therefore invisible to `topoSort`. Child can insert first; nullable FK is written NULL; seed still `bulkCreate`s; `countRows` is > 0; Assert greps `rows` > 0; migrate-2 never sees the FK populated. That is a green gate over empty FK columns.

**F3 — single `pkCol` via `.find` (MAJOR).** `const pkCol = Object.keys(attrs).find((c) => attrs[c].pk)` then `updateOnDuplicate: [pkCol]`. Composite PKs: conflict target is incomplete; second-run idempotence AC is false.

**F4 — `insertedIds` stores a scalar; readers assume a scalar (MAJOR).** `values.map((v) => v[pkCol])` then `generateRowValues` does `out[col] = parents[rowIndex % parents.length]` (whole slot) and backfill does `insertedIds.get(bf.targetLower)?.[0]` plus a dead `tPk` `.find`. Switching storage to PK maps without changing the two readers assigns an object to a scalar FK column. Both sides must move together; tests/selftest currently pass scalar `parentIds` and must be updated.

**F5 — Assert greps the wrong surface (MAJOR for this lens).** `grep '^SHADOW-SEED '` matches `SHADOW-SEED OK …`, `SHADOW-SEED cycle-backfill …`, and the JSON report. `"rows":N` is taken from `tail -1`. Today the report is last, so it works by order, not by shape — brief §9 “signal that is always true / wrong surface”. Anchor is `^SHADOW-SEED {`.

**F6 — `retry: 1` (MINOR, still fix).** `backend/vitest.config.mjs` L34–L35. Deterministic DB-free tests must not get a free pass on first failure.

**F7 — backfill not deduped (MINOR).** §4 pushes one `{table,col,…}` per row; §4b `UPDATE … WHERE col IS NULL` already fills every null on the first hit. Dedupe on `(table,col)` before UPDATE.

Cycle alpha-order is a false-failure (job goes red), not a false-success. I do not elevate it. Independent `psql` count is defense-in-depth, not required by §5.3.

=== VERDICT ===
status: CONSENSUS
confidence: 91
findings: F1=MAJOR: .github/workflows/migration-shadow-check.yml L25 vs L15-L16: POSTGRES_PASSWORD is "***" while comments/brief §4 require "shadow"; Export DATABASE_URL redacted — auth pairing unverified | F2=MAJOR: backend/scripts/seed-shadow-db.mjs §3 deps loop: parents from m.associations only; normalizeModel foreignKeyTarget FKs omitted so nullable FKs stay NULL while rows>0 still greens Assert | F3=MAJOR: backend/scripts/seed-shadow-db.mjs §4 pkCol=Object.keys(attrs).find(c=>attrs[c].pk) + updateOnDuplicate:[pkCol] drops composite PKs | F4=MAJOR: backend/scripts/seed-shadow-db.mjs §4 insertedIds stores v[pkCol] scalars; generateRowValues assigns whole parent slot; backfill uses [0] and unused tPk .find | F5=MAJOR: workflow Assert step grep '^SHADOW-SEED ' matches OK/cycle-backfill; JSON chosen only by tail-order | F6=MINOR: backend/vitest.config.mjs L35 retry:1 is a false-success amplifier on a deterministic suite | F7=MINOR: backend/scripts/seed-shadow-db.mjs §4 backfill.push per row; §4b UPDATE WHERE col IS NULL already fills all
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | F7=AGREE
open: Q1=alpha cycle order is false-failure not false-success — other seats decide if it joins FIX ALL | Q2=composite-PK path unproven until the required green CI run | Q3=brief §7 AC8 scan-secrets.sh CLEAN still unrecorded
consensus_block: FIX ALL: (1) seed-shadow-db.mjs: hoist tableNameToModel before the section-3 deps loop; after the associations walk, add parents from normalizeModel attrs with foreignKeyTarget, mapped through tableNameToModel and kept only if registry.has(parentNm). (2) Replace pkCol=.find with pkCols=Object.keys(attrs).filter(c=>attrs[c].pk); pass pkCols to updateOnDuplicate. (3) Store full PK maps in insertedIds (values.map(v=>Object.fromEntries(pkCols.map(c=>[c,v[c]])))); generateRowValues must set out[col]=parentRow[a.foreignKeyTarget.pk] (not the whole slot); backfill must read insertedIds[targetLower][0][attrs[bf.col].foreignKeyTarget.pk] and delete the unused tPk .find. Update seed-shadow-db.test.mjs + seed-shadow-db.selftest.mjs parentIds fixtures from scalar arrays to PK maps (or the readers break). (4) .github/workflows/migration-shadow-check.yml L25: POSTGRES_PASSWORD: "shadow"; Export DATABASE_URL password must be shadow. (5) Assert step: grep '^SHADOW-SEED {' (not '^SHADOW-SEED '). (6) delete backend/vitest.config.mjs L34-L35 retry:1. (7) dedupe backfill on (table,col) before UPDATE. All seven require one real green CI run as proof — F1 means none exists with this YAML. ACCEPTED INTENTIONAL: PII guard, deterministic generation, synthetic-over-snapshot (§3), F5/F6-of-prior-rounds deferred (unit suite not this job's gate). RESIDUAL RISK: deps still miss FKs not expressed as attributes or associations — manual review of 217 models advised; skipped hard-cycle tables stay empty for migrate-2 (Assert does not fail on skipped); composite-PK paths unverified until that green run.
=== END-VERDICT ===
