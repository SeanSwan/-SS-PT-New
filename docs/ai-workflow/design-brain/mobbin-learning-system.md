# Governed Mobbin Learning System

- **Date:** 2026-07-19
- **Status:** CANONICAL for external-reference learning intake
- **Scope:** converts inspected Mobbin references into reviewable Swan design evidence without copying vendor content or allowing automatic canon writes.

---

## 1. Decision

Swan will use Mobbin as a time-bounded research source, not as a bulk dataset and not as an autonomous teacher. The system learns by accumulating distilled, inspected, deduplicated observations. Humans retain the only authority to promote a pattern into Design Brain canon.

The 88-reference sample collected before this gate is **exploratory and anecdotal**. It may guide future queries, but none of it can be promoted unless a reference is reopened, inspected, and submitted through `evidence/2`.

## 2. Authority boundary

| Layer | Purpose | Write authority |
|---|---|---|
| L0 Control | mode, caps, kill switch, actor registry | Sean or explicitly authorized maintainer |
| L1 Acquire | draft and run bounded Mobbin queries | registered researcher |
| L2 Inspect | open returned screens/flows/sections and record inspection | registered researcher |
| L3 Observe | extract principles and Swan translations | registered researcher |
| L4 Ledger | validate `evidence/2`, reject duplicates, append audit | validating writer only |
| L5 Synthesis | compare evidence, contradictions, and gaps | reviewer/agent, non-canonical |
| L6 Adjudication | accept, reject, or request trial | **human only** |
| L7 Canon | change Design Brain doctrine | **human-approved repo change only** |
| L8 Delivery | builders consume canon and receipts | read-only |

No agent, schedule, recursive loop, or MCP connector may bypass L6-L7.

## 3. Controlled state machine

```text
IDLE -> PLAN -> QUERY_DRAFT -> QUERY_SCORE -> FETCH -> INSPECT
     -> OBSERVE -> NORMALIZE -> DEDUPE -> SYNTHESIZE
     -> CONTRA_SEARCH -> SCORE -> TRIAL -> ADJUDICATE
     -> COMMIT -> REPLAN

ANY STATE -> PAUSED | KILLED
```

`ADJUDICATE` and `COMMIT` require a human decision. "Continuous learning" means repeated bounded cycles with evidence and review, not unattended self-modification.

## 4. P0 controls

The executable control files live in `scripts/ai-workflow/mobbin-learning/`:

- `control.json`: manual mode, kill switch, weekly caps.
- `identity-registry.json`: active actor IDs and roles; no account emails or secrets.
- `evidence-policy.json`: schema version, denied fields, K1-K5 requirement.
- `evidence-v2.schema.json`: portable JSON Schema contract.
- `evidence-gate.mjs`: validator, exclusive-create writer, audit writer, and dedupe-ledger writer.
- `evidence-gate.test.mjs`: regression suite.

Default weekly maximums are 12 research runs, 144 reviewed results, and 36 opened flows. Concurrency is one governed run. Hitting a cap stops acquisition until the next budget period or a human changes the control file.

## 5. Mandatory inspection

Search-result metadata is not evidence. Every submitted record must say:

- who inspected it and when;
- how many actual surfaces were opened (minimum one);
- substantive notes about sequence, hierarchy, state, or interaction;
- at least one design question, extracted principle, Swan translation, and confidence score.

Titles, categories, and result thumbnails alone fail the gate. Raw screenshots, page copy, HTML, connector/OAuth URLs, cookies, tokens, account emails, and customer data are denied.

## 6. Mobbin dedupe K1-K5

Each key is an independent collision detector. A match on any key rejects the record for review rather than silently counting it twice.

- **K1:** vendor + stable opaque source reference.
- **K2:** vendor + product + reference type + surface + platform.
- **K3:** vendor + flow + step identity + platform.
- **K4:** design question + reference type + product category + normalized surface.
- **K5:** normalized principle + workflow phase + user role.

K1-K3 catch repeated vendor items; K4 catches query wording variants; K5 catches the same lesson repeatedly harvested from different products. A rejected collision may still be used as corroboration in a synthesis, but does not become a new evidence unit.

## 7. Evidence lanes and promotion

1. Accepted `evidence/2` records stay in a run-specific evidence directory outside Git.
2. Audit receipts and K1-K5 ledger rows are append-only JSONL outside Git.
3. Synthesis must cite evidence IDs, name contradictions, and distinguish convergence from novelty.
4. High-impact principles require a counter-search and a Swan-specific trial before adjudication.
5. Sean accepts, rejects, or requests more evidence.
6. Only an accepted decision may update `design.md`, `components.md`, `motion.md`, `anti-patterns.md`, or another canonical file.
7. Obsidian/Graphify receives only adjudicated principles and decisions; raw Mobbin material stays out.

## 8. First governed conversion run

The next Mobbin use should be one narrow conversion problem, not another broad fitness sweep. Recommended first question:

> How do shipped fitness products move a client from completed workout to credible progress proof and one clear next action on mobile?

Run 3-5 targeted searches, review no more than 12 results, open no more than 3 flows, and produce `evidence/2` records only for references actually inspected. End with one synthesis containing: convergence, contradictions, rejected patterns, Swan translation, confidence, and the evidence gap for the next run.

## 9. Stop rules

Pause immediately when the kill switch is on, an identity is unknown, inspection is missing, a budget is exceeded, denied data appears, the dedupe ledger collides, or evidence cannot be tied to a concrete design question. Do not weaken validation to increase intake volume.

Cold-mode verification is mandatory before treating the system as self-sufficient: a future design task must be completed using Swan canon and promoted evidence with Mobbin unavailable. Until that passes repeatedly, Mobbin remains a research dependency, not something the brain has replaced.