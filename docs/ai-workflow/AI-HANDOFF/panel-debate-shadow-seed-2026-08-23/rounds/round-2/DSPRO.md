# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-2/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 19997 in / 7213 out · **Cost:** ~$0.0080 · **Wall:** 161.3s · **finish:** stop

---

=== VERDICT ===
status: CONSENSUS
confidence: 95
findings: F1=MAJOR: seed-shadow-db.mjs L409-410,L464-472: Backfill logic for cyclic FKs assumes single-column primary keys; composite PKs may cause incorrect FK values or missed columns.
rebuttals: (none)
open: Q1=Should the backfill logic be extended to handle composite primary keys, or is it acceptable to document as a limitation?
consensus_block: Adopt the consensus candidate fixes: (1) Extend dependency graph to include parents from normalizeModel's foreignKeyTarget. (2) Use all PK columns for updateOnDuplicate and implement safe upsert fallback. Additionally, address F1: the backfill logic in main() (L409-410, L464-472) assumes a single PK column; it should be updated to handle composite PKs by storing and using the full PK values for each row, or at minimum document the limitation and ensure it does not silently corrupt data. All fixes must be validated in the real CI environment.
=== END-VERDICT ===
