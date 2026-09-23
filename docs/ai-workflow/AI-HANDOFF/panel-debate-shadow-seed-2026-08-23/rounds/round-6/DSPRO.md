# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-6/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 19469 in / 10047 out · **Cost:** ~$0.0103 · **Wall:** 231.9s · **finish:** stop

---

=== VERDICT ===
status: CONSENSUS
confidence: 95
findings: F1=MAJOR: seed-shadow-db.mjs L363-L376: deps graph built only from associations, missing FK dependencies from model attributes with foreignKeyTarget (e.g., references without association) — can cause incorrect seeding order and FK violations | F2=MAJOR: seed-shadow-db.mjs L449 (and similar): uses single pkCol via find(), fails for composite primary keys; must use all PK columns for updateOnDuplicate, insertedIds, and backfill | F3=MAJOR: seed-shadow-db.mjs insertedIds storage and backfill: stores only single PK column values, not full tuples; backfill reads only first element, incorrect for composite PKs | F4=MAJOR: .github/workflows/migration-shadow-check.yml L25: POSTGRES_PASSWORD is "***" (literal asterisks), but all clients use password "shadow"; causes authentication failure, so the CI gate has never run successfully | F5=MINOR: .github/workflows/migration-shadow-check.yml Assert step: grep pattern '^SHADOW-SEED ' may match non-report lines; should anchor to '^SHADOW-SEED {' to ensure the JSON report line is captured | F6=MINOR: backend/vitest.config.mjs L35: retry:1 can hide flaky tests; delete | F7=MINOR: seed-shadow-db.mjs backfill array: duplicate entries cause redundant updates; deduplicate
rebuttals: (none)
open: Q1=verify composite-PK handling with actual models; Q2=run CI to confirm fixes
consensus_block: FIX ALL: (1) seed-shadow-db.mjs section-3 deps loop: also add parents from normalizeModel(m) attributes with foreignKeyTarget, filtered through tableNameToModel/registry. (2) Replace single pkCol with Object.keys(attrs).filter(c=>attrs[c].pk) for updateOnDuplicate AND apply consistently at insertedIds extraction and backfill tPk lookup. (3) Store full PK tuples in insertedIds; backfill reads the correct tuple element. (4) workflow services.env POSTGRES_PASSWORD: "shadow". PLUS round-5 additions: (5) Assert step grep anchored to '^SHADOW-SEED {' (6) delete vitest.config.mjs L35 retry:1 (7) dedupe backfill entries. All fixes require one real green CI run as proof — F1 shows no successful run exists yet. ACCEPTED INTENTIONAL: PII guard, deterministic generation, synthetic-over-snapshot decision (§3), F5/F6 deferred with reasons. RESIDUAL RISK: dependency-graph extension may miss implicit FKs not expressed as attributes or associations — manual review of the 217 models advised; composite-PK paths remain unverified until the first green CI run.
=== END-VERDICT ===
