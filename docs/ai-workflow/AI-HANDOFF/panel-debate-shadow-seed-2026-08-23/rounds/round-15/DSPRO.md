# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-15/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 19941 in / 10310 out · **Cost:** ~$0.0165 · **Wall:** 173.0s · **finish:** stop

---

=== VERDICT ===
status: CONSENSUS
confidence: 95
findings: F1=MAJOR: seed-shadow-db.mjs dependency graph built from model.associations not from attrs foreignKeyTarget (misses FKs defined only in references, risks over-including non-BelongsTo) | F2=MAJOR: seed-shadow-db.mjs normalizeModel() association lookup does not require `BelongsTo` + foreignKey equality — may pick HasMany or wrong target, corrupting FK map | F3=MAJOR: seed-shadow-db.mjs updateOnDuplicate uses single pk column `pkCol`; composite-PK tables break idempotency | F4=MAJOR: seed-shadow-db.mjs insertedIds stores only first pk column values, insufficient for composite-PK FK resolution and backfill | F5=MAJOR: .github/workflows/migration-shadow-check.yml L25 POSTGRES_PASSWORD: `"***"` should be `"shadow"` to match container and seeder URL | F6=MAJOR: .github/workflows/migration-shadow-check.yml Assert step grep `'^SHADOW-SEED '` matches non-report lines (OK, cycle-backfill), risk of tail -1 picking wrong line; must use `'^SHADOW-SEED {'` | F7=MINOR: .github/workflows/migration-shadow-check.yml Seed step redirects only stdout; stderr diagnostics (SKIP/FAIL) lost from artifact | F8=MINOR: .github/workflows/migration-shadow-check.yml missing step to run `node scripts/seed-shadow-db.selftest.mjs` (acceptance criterion 2 not enforced) | F9=MINOR: seed-shadow-db.mjs backfill array may contain duplicate (table,col) entries; need dedupe to avoid redundant updates
rebuttals: (none)
open: Q1=composite-PK FK targets still resolve to first pk column only (residual risk noted); Q2=FKs expressed neither as attributes nor BelongsTo associations are missed (residual risk)
consensus_block:
FIX ALL: (1) AMENDED — seed-shadow-db.mjs: DELETE the §3 associations walk; build deps solely from meta attrs with foreignKeyTarget (complete only after fix below). (1a) normalizeModel(): change the association lookup to require `x.associationType === 'BelongsTo' && x.foreignKey === col` before using found.target; keep the a.references.model fallback. (2) pkCols=Object.keys(attrs).filter(c=>attrs[c].pk); pass pkCols to updateOnDuplicate. (3) Store full PK maps in insertedIds; generateRowValues sets out[col]=parentRow[a.foreignKeyTarget.pk]; backfill reads insertedIds[targetLower][0][attrs[bf.col].foreignKeyTarget.pk]; delete unused tPk .find; update fixtures. (4) workflow L25 POSTGRES_PASSWORD: "shadow"; DATABASE_URL password must be shadow. (5) Assert grep '^SHADOW-SEED {'. (6) NO CHANGE to vitest retry. (7) dedupe backfill on (table,col). (8) NO CHANGE: 32/32 selftest claim stands. NEW (9) workflow: add step after npm ci — `node scripts/seed-shadow-db.selftest.mjs` (dependency-free). NEW (10) Seed step: `> seed-shadow.log 2>&1` so SKIP/FAIL reach the artifact. ACCEPTED INTENTIONAL: PII guard, deterministic generation, synthetic-over-snapshot (§3), F5/F6 deferred. RESIDUAL RISK: composite-PK FK targets resolve to first pk column only until verified; FKs expressed neither as attributes nor BelongsTo associations are missed; hard-cycle tables without nullable edge stay empty for migration run 2.
=== END-VERDICT ===
