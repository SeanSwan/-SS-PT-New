# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-11/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 20811 in / 8591 out · **Cost:** ~$0.0098 · **Wall:** 171.2s · **finish:** stop

---

=== VERDICT ===
status: CONSENSUS
confidence: 95
findings: F1=MAJOR: seed-shadow-db.mjs §3 deps loop misses FK targets from normalizeModel attrs (consensus item 1) | F2=MAJOR: seed-shadow-db.mjs pkCol=.find + updateOnDuplicate breaks composite PK idempotency (consensus item 2) | F3=MAJOR: seed-shadow-db.mjs insertedIds scalars + generateRowValues/backfill assume single-column PK (consensus item 3) | F4=MAJOR: .github/workflows/migration-shadow-check.yml L25 POSTGRES_PASSWORD is "***" not "shadow" (consensus item 4) | F5=MAJOR: workflow Assert step grep '^SHADOW-SEED ' matches non-report lines (consensus item 5) | F6=MINOR: backend/vitest.config.mjs L34-L35 retry:1 (consensus item 6) | F7=MINOR: seed-shadow-db.mjs backfill loop should dedupe on (table,col) (consensus item 7) | F8=NOTE: Builder's self-test claim of 32/32 PASS is accurate; selftest has 32 ok() assertions. Consensus item (8) is incorrect.
rebuttals: F8=REJECT: The selftest file contains exactly 32 ok() calls (8 validateShadowUrl + 4 topoSort + 4 deterministicUuid + 5 serializeReport + 6 generateRowValues + 5 value-type mirror = 32). The builder's claim is verified; no fix needed.
open: Q1=Verify composite-PK paths with a green CI run | Q2=Confirm that the deps loop fix captures all FK targets from attrs
consensus_block: FIX ALL: (1) seed-shadow-db.mjs: hoist tableNameToModel before the section-3 deps loop; after the associations walk, add parents from normalizeModel attrs with foreignKeyTarget, mapped through tableNameToModel and kept only if registry.has(parentNm). (2) Replace pkCol=.find with pkCols=Object.keys(attrs).filter(c=>attrs[c].pk); pass pkCols to updateOnDuplicate. (3) Store full PK maps in insertedIds (values.map(v=>Object.fromEntries(pkCols.map(c=>[c,v[c]])))); generateRowValues must set out[col]=parentRow[a.foreignKeyTarget.pk] (not the whole slot); backfill must read insertedIds[targetLower][0][attrs[bf.col].foreignKeyTarget.pk] and delete the unused tPk .find. Update seed-shadow-db.test.mjs + seed-shadow-db.selftest.mjs parentIds fixtures from scalar arrays to PK maps. (4) .github/workflows/migration-shadow-check.yml L25: POSTGRES_PASSWORD: "shadow"; Export DATABASE_URL password must be shadow. (5) Assert step: grep '^SHADOW-SEED {' (not '^SHADOW-SEED '). (6) delete backend/vitest.config.mjs L34-L35 retry:1. (7) dedupe backfill on (table,col) before UPDATE. (8) NO CHANGE: builder's self-test claim of 32/32 is correct; selftest has 32 ok() assertions. ACCEPTED INTENTIONAL: PII guard, deterministic generation, synthetic-over-snapshot (§3), F5/F6-of-prior-rounds deferred (unit suite not this job's gate). RESIDUAL RISK: deps still miss FKs not expressed as attributes or associations — manual review of 217 models advised; skipped hard-cycle tables stay empty for migrate-2 (Assert does not fail on skipped); composite-PK paths unverified until that green run.
=== END-VERDICT ===
