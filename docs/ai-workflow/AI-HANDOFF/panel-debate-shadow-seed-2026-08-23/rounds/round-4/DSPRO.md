# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-4/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 18975 in / 5760 out · **Cost:** ~$0.0124 · **Wall:** 103.8s · **finish:** stop

---

=== VERDICT ===
status: CONSENSUS
confidence: 98
findings: F1=MAJOR: .github/workflows/migration-shadow-check.yml (services shadow-postgres env POSTGRES_PASSWORD): value is literal "***" instead of "shadow", which will cause authentication failure when the container starts | F2=MAJOR: seed-shadow-db.mjs L240 (approx): `updateOnDuplicate: [pkCol]` uses only the first discovered primary key column; tables with composite primary keys will cause idempotency failures or duplicate key errors on re-runs | F3=MAJOR: seed-shadow-db.mjs L210 (approx): dependency graph `deps` is built solely from `model.associations`; it ignores FK relationships declared in attributes (via `normalizeModel`'s `foreignKeyTarget`), leading to incorrect insertion order when associations are missing | F4=MAJOR: seed-shadow-db.mjs L280 (approx): backfill logic assumes a single primary key column (`tPk` and `insertedIds.get(...)?.[0]`), breaking for tables with composite primary keys — cyclic FK updates will fail or update wrong rows
rebuttals: F1=AGREE | F2=AGREE | F3=AGREE | F4=AGREE
open: Q1=Must validate composite-PK fixes in real CI environment with actual composite-key tables present in the schema; self-tests do not currently exercise composite PK paths
consensus_block: Adopt the consensus candidate fixes: (1) Dependency graph: modify the graph-building loop in seed-shadow-db.mjs (around L210) to also inspect each model’s attributes from `normalizeModel(m)` for entries with `foreignKeyTarget` and add those target table names as dependencies. (2) updateOnDuplicate: replace `pkCol` (single column) with a list of all primary key columns (from `Object.keys(attrs).filter(c => attrs[c].pk)`), and use that list in `updateOnDuplicate`. (3) Backfill: store the full PK tuple per row (as an object or array) in `insertedIds`, and during backfill, extract the correct composite PK value from the stored tuple instead of just the first element. (4) POSTGRES_PASSWORD: In `.github/workflows/migration-shadow-check.yml`, change the value from `"***"` to `"shadow"`. These fixes must be validated end-to-end in the actual CI environment, as local self-tests do not cover composite-PK scenarios. Accepted as intentional: the PII guard and deterministic generation logic remain correct. Residual risk: the dependency graph extension may still miss implicit FK relationships not expressed as attributes or associations; manual review of the 217 models is advisable to ensure no silent ordering gaps.
=== END-VERDICT ===
