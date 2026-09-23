# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23/rounds/round-3/REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 18999 in / 9789 out · **Cost:** ~$0.0156 · **Wall:** 174.4s · **finish:** stop

---

As the inference auditor, I focus on verifying the builder's local-verification claims and identifying happy-path logic defects, type drift, or stale-state bugs. Reviewing the packet, two major issues surface that contradict the builder's assertions or reveal latent composite-key assumptions:

1. **POSTGRES_PASSWORD mismatch** — The brief §4 states the shadow container uses password `shadow`, but the workflow YAML sets `POSTGRES_PASSWORD: "***"`. This is not a YAML syntax problem; it's a wrong literal that will cause authentication failure, contradicting the claim that the YAML is “validated” for the CI contract.

2. **Composite primary key assumption** — The seeding logic (pkCol detection, FK assignment via `generateRowValues` using single-column parent IDs, upsert with `updateOnDuplicate: [pkCol]`, and backfill using `tPk` and `targetId = ...?.[0]`) all assume a single primary key column. A table with a composite PK will be seeded incorrectly, potentially corrupting data or failing silently. This is a broader issue than the backfill-only mention in the consensus candidate; it pervades the happy path and must be handled throughout.

The consensus candidate’s extensions (dependency graph, multi-PK upsert, backfill fix) are correct as far as they go, but they do not mention the password bug and understate the composite-key problem. I therefore adopt the consensus and add these two MAJOR findings.

=== VERDICT ===
status: CONSENSUS
confidence: 93
findings: F1=MAJOR: .github/workflows/migration-shadow-check.yml, services POSTGRES_PASSWORD: "***" does not match the required password "shadow" per brief §4, leading to connection failure. | F2=MAJOR: seed-shadow-db.mjs, the entire seeding happy path (pkCol detection ~L400, FK assignment in generateRowValues using single-column parentIds, upsert with single pkCol, backfill with single pk and row-0) assumes a single primary key column; models with composite primary keys will be seeded incorrectly, risking corruption or failures.
rebuttals: F1=AGREE: we confirm the unresolved password mismatch is a real defect. | F2=AGREE: the composite-key limitation extends beyond backfill and must be fixed globally.
open: Q1=Confirm whether the test suite fully covers the composite-PK fix once implemented. Q2=Verify that the password fix does not break any other workflow that may rely on the literal "***".
consensus_block: Adopt the consensus candidate fixes (extend dependency graph to include parents from normalizeModel's foreignKeyTarget; use all PK columns for updateOnDuplicate and safe upsert fallback; update backfill to handle composite PKs). Additionally, immediate fixes required: (a) In .github/workflows/migration-shadow-check.yml, change POSTGRES_PASSWORD from "***" to "shadow". (b) In seed-shadow-db.mjs, refactor FK assignment, upsert target, and backfill to correctly handle tables with composite primary keys by storing/using the full PK tuple for each row. These changes must be validated in the real CI environment.
=== END-VERDICT ===
