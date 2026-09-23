# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-7/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 20326 in / 18504 out · **Cost:** ~$0.1515 · **Wall:** 233.6s · **finish:** stop

---

The migrate→seed→assert→migrate-again order in `.github/workflows/migration-shadow-check.yml` matches brief §5.3. That path is not the defect. The gate still cannot be trusted: the service password contradicts the documented shadow contract, the assert greps a prefix the seeder also writes for non-report lines, and the seeder’s FK/PK bookkeeping can insert or backfill the wrong values while still emitting `rows > 0`.

**F1 — credential contract broken (CI never authenticates as specified).**  
Workflow comment L15–L16: user/password/database are “all the literal word `shadow`”. Brief §4 same claim. L25 is `POSTGRES_PASSWORD: "***"`. Builder header admits this is a quoted YAML alias workaround, not redaction. If `DATABASE_URL` uses password `shadow`, `npm run migrate` fails auth and the populated-DB gate never runs. If the URL also uses `***`, the job can connect but the published contract is a lie. Either way there is no successful run of this YAML.

**F4 — assert inspects the wrong surface unless tail-order holds.**  
Seed step stdout includes `SHADOW-SEED OK …` and `SHADOW-SEED cycle-backfill …` then the JSON report. Assert does `grep '^SHADOW-SEED ' | tail -1`. Today the report is last, so it works; any later stdout line, or a crash after OK lines if someone loosens the step, and the parser is staring at a status line. `grep -o '"rows":[0-9]*'` does not match those status lines (fail-closed), but the brief’s own trap is “a signal saved only by accident.” Anchor is `^SHADOW-SEED {`.

**F2/F3/F6 — data-truth: graph and keys.**  
Section-3 deps walk only `m.associations`. `normalizeModel` already records `a.references` as `foreignKeyTarget`. Attribute-only FKs are invisible to Kahn → child-before-parent → NOT NULL insert fail or NULL FK that is not a cycle edge.  
`pkCol = Object.keys(attrs).find(pk)` feeds `updateOnDuplicate: [pkCol]` and `insertedIds` scalars. `generateRowValues` assigns `parents[i]` (the whole slot) to one FK column and never reads `foreignKeyTarget.pk`. Backfill computes `tPk` then ignores it and uses `insertedIds.get(…)[0]`. Composite PK/FK writes the wrong value; a later “store tuples” fix that does not also index by `foreignKeyTarget.pk` regresses single-column FKs. Backfill pushes one entry per row then `UPDATE … WHERE col IS NULL` (first hit fills all); dedupe by `(table, col)`.

**F5 — `retry: 1` at `backend/vitest.config.mjs` L35.**  
That config now `include`s `scripts/**/seed-shadow-db.test.mjs`. A flaked safety-check can go green on the second try. False-success on the one test the brief calls most important.

Verified non-findings (named paths): `validateShadowUrl` runs before `import(associations.mjs)`; `countRows` is a real `SELECT count(*)` on quoted table names; seeder `exitCode = 1` when `dbRows === 0 || failed.length > 0`; no `REFERENCES users` in the seeder.

=== VERDICT ===
status: CONSENSUS
confidence: 93
findings: F1=MAJOR: .github/workflows/migration-shadow-check.yml L25 vs L15-L16: POSTGRES_PASSWORD "***" contradicts brief §4 and the comment that password is shadow | F2=MAJOR: backend/scripts/seed-shadow-db.mjs section-3 deps loop: parents from associations only; attribute foreignKeyTarget FKs omitted from Kahn graph | F3=MAJOR: seed-shadow-db.mjs pkCol=.find + insertedIds scalars + generateRowValues assigns whole parent slot (ignores foreignKeyTarget.pk) + backfill L363-L376 unused tPk and [0] | F4=MAJOR: workflow Assert step grep '^SHADOW-SEED ' matches OK/cycle-backfill stdout; JSON pick saved only by tail-order | F5=MINOR: backend/vitest.config.mjs L35 retry:1 can false-green the safety suite | F6=MINOR: seed-shadow-db.mjs backfill pushes per-row dupes then UPDATE WHERE col IS NULL
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE | F4=AGREE | F5=AGREE | F6=AGREE | missing-test-step=DEFER: this job's contract is seed-between-migrates + report assert; runtime gate still executes
open: Q1=any seat holding a green Actions log that used password shadow with this YAML? | Q2=how many of the 217 models are composite-PK so F3 is live vs latent? | Q3=should Assert also reject non-empty failed[] as belt-and-braces?
consensus_block: FIX ALL: (1) seed-shadow-db.mjs: hoist tableNameToModel before the section-3 deps loop; after the associations walk, add parents from normalizeModel attrs with foreignKeyTarget, mapped through tableNameToModel and kept only if registry.has(parentNm). (2) Replace pkCol=.find with pkCols=Object.keys(attrs).filter(c=>attrs[c].pk); pass pkCols to updateOnDuplicate. (3) Store full PK maps in insertedIds (values.map(v=>Object.fromEntries(pkCols.map(c=>[c,v[c]])))); generateRowValues must set out[col]=parentRow[a.foreignKeyTarget.pk] (not the whole slot); backfill must read insertedIds[targetLower][0][attrs[bf.col].foreignKeyTarget.pk] and delete the unused tPk .find. (4) .github/workflows/migration-shadow-check.yml L25: POSTGRES_PASSWORD: "shadow"; Export DATABASE_URL password must be shadow. (5) Assert step: grep '^SHADOW-SEED {' (not '^SHADOW-SEED '). (6) delete backend/vitest.config.mjs L34-L35 retry:1. (7) dedupe backfill on (table,col) before UPDATE. All seven require one real green CI run as proof — F1 means none exists with this YAML. ACCEPTED INTENTIONAL: PII guard, deterministic generation, synthetic-over-snapshot (§3), F5/F6-of-prior-rounds deferred (unit suite not this job's gate). RESIDUAL RISK: deps still miss FKs not expressed as attributes or associations — manual review of 217 models advised; skipped hard-cycle tables stay empty for migrate-2 (Assert does not fail on skipped); composite-PK paths unverified until that green run.
=== END-VERDICT ===
