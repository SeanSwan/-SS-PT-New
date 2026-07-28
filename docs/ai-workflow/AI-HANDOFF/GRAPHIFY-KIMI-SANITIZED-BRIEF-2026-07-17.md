# Sanitized Local Knowledge Graph Architecture Brief

## Mission

Design an implementation-grade upgrade from an existing Obsidian/Karpathy knowledge-governance policy into a real local-first Graphify-enabled system on one private Windows workstation. This packet contains no client data, credentials, private hostnames, private paths, or production infrastructure identifiers.

## Verified baseline

- Docker CLI is available.
- No Graphify, Graphiti, Neo4j, or Obsidian executable/package/service/container is currently verified.
- No Graphify MCP server is registered.
- Existing work is documentation and static-prototype only.
- Defined vault lanes: `raw/`, `wiki/`, `outputs/`, `runs/`, `graph-imports/`, `references/`, `templates/`.
- Every major lane requires an `index.md`.
- Provenance, staleness, confidence, privacy, quarantine, promotion, and removability rules are documented.
- A local operator console specifies a read-only Graphify preview, but it is not implemented.

## Binding governance

1. Graph traversal is for multi-hop relationship questions; flat lookup stays file or semantic search.
2. Every run uses a named, bounded, PII-free corpus. Whole-repository or whole-vault ingestion is forbidden.
3. Output lands in a standalone run directory, then `graph-imports/<date>-<slug>/` quarantine.
4. Quarantined output is never citable and never written directly to `wiki/`.
5. Every retained node/edge has exact sources, content hashes, run identity, confidence, and evidence status.
6. Inferred edges are explicitly `INFERRED` and `[HYPOTHESIS]`.
7. Promotion is per concept and human-reviewed.
8. Promoted notes must remain useful without the graph and trace claims to source documents.
9. Imports and promoted notes must be cleanly removable.
10. No PII, secrets, raw transcripts, or changing business truth enters the graph/vault.
11. The product database remains authoritative for changing business records; the graph cannot access it directly.
12. Local-first, offline-capable, no public ingress, and no source-content network egress.
13. Operator UI is a read-only window, not an independent authority.
14. Deterministic parsing, hashing, validation, lifecycle, and receipts are preferred over LLM calls.

## Missing runtime capabilities

- Concrete tool/product and license decision
- Pinned versions and reproducible local deployment
- Graph-store and optional vector-store selection
- Source registry and allowlisted corpus manifests
- Preflight PII/secret/prompt-injection scanner
- Parser/chunker and deterministic identifiers
- Entity/relation schema and extraction pipeline
- Idempotent reconciliation/deduplication
- Quarantine importer and promotion state machine
- Query CLI/API/MCP and hybrid retrieval router
- Audit receipts, metrics, health checks, kill switch
- Backup/restore, migrations, retention, disaster recovery
- Read-only graph viewer
- Bounded pilot corpus and golden multi-hop evaluation set

## Required response

Produce these exact sections:

1. `VERDICT`: BUILD, RESHAPE, or DO NOT BUILD.
2. Reality table: `Capability | Verified built | Documentation/prototype only | Missing | Recommended disposition`.
3. Tool clarification: distinguish similarly named Graphify/Graphiti/GraphRAG approaches. Compare a deterministic graph stack, Neo4j-based options, Graphiti/temporal approaches, GraphRAG, and simpler embedded stores. Recommend one primary local-first stack and one fallback. Identify license, privacy, maintenance, and lock-in checks.
4. Target architecture: source registry, manifests, scanner, parser/chunker, extraction, IDs, provenance/hashes, graph store, optional vector index, quarantine artifacts, promotion, wiki materialization, query router, CLI/API/MCP boundary, viewer, receipts, metrics, kill switch, backup/restore. Separate deterministic and LLM-assisted components.
5. Canonical schema: bounded node/edge types for repository governance/design/architecture knowledge; required metadata; confidence/evidence; temporal/staleness; quarantine/promotion states; run receipt; stable IDs and deduplication.
6. End-to-end workflows: bounded corpus, preflight, extraction, validation/quarantine, review/promotion, multi-hop query, reconciliation, rollback/delete, backup/restore.
7. Valid Mermaid code for:
   - component architecture
   - ingestion/quarantine flow
   - promotion state machine
   - hybrid-query sequence
   - single-Windows-host deployment topology
8. Desktop and mobile ASCII wireframes for a calm Graph Brain panel containing promoted graph, quarantine queue, chain-question composer, evidence drawer, run health, staleness warnings, and explicit read-only state. Include interaction, accessibility, loading, empty, and error states.
9. Phased plan table: `Phase | Goal | Deliverables | Tests/gates | Rollback | Human decision`:
   - Phase 0 tool/license/security spike
   - Phase 1 local graph foundation
   - Phase 2 deterministic bounded ingestion
   - Phase 3 LLM-assisted extraction to quarantine
   - Phase 4 promotion and Obsidian materialization
   - Phase 5 hybrid query CLI/MCP
   - Phase 6 read-only viewer
   - Phase 7 hardening, evaluations, backup/restore
   Define a pilot of 10–30 PII-free canonical documents and 10 golden chain questions.
10. Acceptance criteria and hostile failure analysis with measurable provenance coverage, unsupported-edge rate, duplicate rate, retrieval precision, citation completeness, stale detection, idempotency, rollback, offline operation, restore, accessibility, and responsiveness. Attack pollution, hallucinated edges, circular evidence, stale policy, prompt injection from documents, accidental PII, network egress, licensing, graph explosion, latency, partial failure, and approval fatigue.
11. Exact proposed implementation tree: scripts, schemas, fixtures, tests, Docker/config, runbooks, sample quarantine output, and viewer components. Avoid giant files.
12. A compact but complete senior-agent implementation directive containing objective, non-goals, anchors, laws, phases, expected files, tests, stopping conditions, prohibitions, and evidence required for completion.

## Judgment

- Mark claims `[VERIFIED]`, `[LIKELY]`, `[HYPOTHESIS]`, or `[UNKNOWN]`.
- Prefer the smallest operable architecture.
- The graph is a relationship index, never evidence.
- Do not include the retired bridge computer.
- Do not invent installation state.
- Do not recommend public ingress, direct product-database access, or direct-to-wiki writes.
