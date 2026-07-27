# Swan Design Brain Mobbin Protocol v3 Review Packet

- **Date:** 2026-07-25
- **Status:** SANITIZED KIMI REVIEW INPUT
- **Scope:** design-reference intake and the shipped learning loop. No product code, PII, secrets, screenshots, raw Mobbin content, connector URLs, canon promotion, push, or deploy.

---

## 1. Goal

Improve the Swan Design Brain continuously with Mobbin while reducing long-term dependence on Mobbin. Preserve original Swan authorship, prevent cloning and generic drift, keep Sean as the human taste/canon authority, and avoid an overbuilt control plane.

## 2. Verified current system on origin/main

### Canonical reference protocol

docs/ai-workflow/design-brain/external-reference-mcp.md requires:

- targeted screen, flow, and section searches for net-new pages and major redesigns;
- visual inspection before describing a reference;
- principles-not-pixels translation into Swan B2/C1-C13 grammar;
- anti-clone rules and no committed screenshots, connector data, account data, or customer data;
- an external-reference receipt before implementation.

Its connector-status sentence is stale: it says Mobbin was unavailable in a 2026-07-09 client. In the current 2026-07-25 Codex task, search_screens, search_flows, and search_sections are callable. Availability remains runtime-local and must be rechecked every task.

### Shipped Minimum Viable Engine

scripts/design-brain is the current executable Mobbin learning engine. It intentionally superseded the larger scripts/ai-workflow/mobbin-learning design preserved on old branches.

Pipeline:

1. log inspected receipt;
2. synthesize receipts into convergence claims;
3. auto-corroborate near-verbatim re-hits from new shipped products;
4. surface ambiguous matches and contradictions;
5. render one compact batch packet;
6. Sean marks a, r, t, or m;
7. adjudicate into append-authoritative claims.jsonl;
8. emit accepted claims into the existing brain vault design-claims collection.

Trust model:

- Claims are recall-tier even when Sean accepts them.
- Canon remains Design Brain doctrine and Sean-edited config/doctrine.md.
- There is deliberately no promote script.
- Only shipped products corroborate; agent text never counts.
- Single-source claims stay low confidence.
- Contradictions remain visible and are never resolved by scoring.
- A deterministic lexical matcher may corroborate only strong near-verbatim re-hits. True semantic paraphrases remain visible for Sean to merge.
- The novelty dial reads INSUFFICIENT DATA, PRODUCTIVE, COOLING, or TAPPED OUT. It recommends the next domain and never blocks.
- Mobbin is one inspector source, not an engine dependency. Sean-dictated observations can enter the same loop.
- Cold mode is the proof of learning: a design task succeeds from accepted claims and Swan canon without a new Mobbin lookup.

The first documented pilot produced six Sean-accepted convergence claims. The live external data root is outside Git and is not part of this review packet.

### Superseded material that must not be revived

Old branches contain a 47-file governance engine with PAUSE_NOVELTY, resume receipts, acquisition leases, K1-K5 gates, and a broker. The July 20 architecture decision intentionally replaced it with the smaller present-human MVE. Those branches are historical candidates, not missing mainline code.

## 3. Confirmed protocol gaps

### P0 - Canonical intake does not route into the shipped MVE

external-reference-mcp.md ends at a task receipt. It does not say when an inspected task-reference receipt should remain temporary, when it may be nominated to the learning corpus, or how it enters scripts/design-brain.

### P0 - Research modes are conflated

The protocol needs three explicit modes:

- HEALTH CHECK: prove MCP tools are callable; no learning claim.
- TASK REFERENCE: answer one approved surface question; temporary receipt by default.
- CORPUS LEARNING: a Sean-triggered domain run through scripts/design-brain.

Without the split, a health query can be mistaken for learning, task research can accidentally expand the corpus, or old hard-pause doctrine can be reintroduced.

### P1 - Kimi's role is ad hoc

Kimi is Swan's design/front-end reviewer but has no explicit authority boundary in the learning loop. Proposed boundary: Kimi attacks genericness, evidence-to-design translation, counterexamples, implementation cost, accessibility, and whether a proposed principle remains Swan-ownable. Kimi cannot trigger acquisition, accept a claim, promote canon, or override Sean.

### P1 - No compact canon-promotion scorecard

The MVE handles receipt shape, convergence, contradiction visibility, confidence, and Sean's claim letters. A separate canon change needs a small scorecard that prevents a popular-but-generic market convention from entering Swan doctrine.

### P1 - Cold-mode progress is not measured

The protocol names cold mode but does not define success. Candidate measures:

- percent of design tasks completed with zero new Mobbin queries;
- percent of task decisions supported by existing accepted claim IDs;
- new-query count per completed surface over time;
- Sean adjudication minutes per net-new accepted claim;
- contradiction and merge rate;
- whether cold-mode outputs pass hostile review and user taste approval.

### P2 - Revalidation and retirement are unspecified

Canon and accepted claims need event-driven review triggers, not unattended scheduled research. Candidate triggers: Swan doctrine conflict, failed implementation trial, repeated counterevidence, inaccessible/responsive failure, product-data-truth mismatch, or a material source/product convention change.

### P2 - Historical naming causes confusion

Product-feature roadmaps named MOBBIN-BRAIN-BUILD-PLAN are not the learning engine. The current engine is scripts/design-brain. Protocol wording should distinguish feature ideas learned from Mobbin from the mechanism that learns.

## 4. Proposed v3 shape

### Mode H - Connector health

- One smallest-useful query solely to prove callable tools.
- Record timestamp and callable tool names.
- No corpus write, canon claim, novelty claim, or implementation recommendation.

### Mode T - Task reference

- Requires a named surface, primary job, one design question, and declared query/result budget.
- Inspect returned visuals before describing them.
- Produce the existing external-reference receipt and in-brand report.
- Temporary by default. Corpus nomination is a separate explicit decision.
- If nominated, convert observations to receipt/1 and run the shipped MVE. Never paste the task report directly into claims.

### Mode L - Corpus learning

- Sean triggers a named domain run.
- Use scripts/design-brain exactly as shipped.
- Novelty advises where to spend attention; it does not grant or remove authority.
- Sean adjudicates claims. Accepted claims remain recall-tier.
- A separate explicit canon edit is required for doctrine.

### Canon-change scorecard

Score each proposed doctrine change 0, 1, or 2 on:

1. independent shipped-product convergence;
2. contradiction coverage;
3. Swan distinctiveness and anti-clone translation;
4. user-workflow and product-data truth;
5. accessibility, responsive, and reduced-motion safety;
6. implementation cost and reuse leverage;
7. Swan-specific trial evidence;
8. cold-mode usefulness.

Hard fail regardless of total: copied layout/assets/copy, PII or private account content, fake data, inaccessible behavior, violation of Swan law, unresolved high-severity contradiction, or no named product job.

Kimi reviews the scorecard and hostile-attacks the proposed translation. Under Sean's 2026-07-26 amendment, Kimi is the standard doctrine-change reviewer and commit gate; the matching completed Kimi review for this packet satisfies that gate. Fable is explicit opt-in only. Sean alone accepts, rejects, trials, or edits canon.

## 5. Questions for Kimi K3

1. Is the H/T/L split the smallest clear model, or can it be simpler without losing safety?
2. Which scorecard dimensions or hard fails are missing, redundant, or gameable?
3. What exact cold-mode acceptance test proves the brain is becoming less dependent on Mobbin without rewarding generic output?
4. What event-driven revalidation/retirement rules should apply to accepted claims versus canon?
5. Where should Kimi participate per batch or per doctrine change without adding bureaucracy?
6. What is the smallest safe patch to external-reference-mcp.md and the router now?
7. What would a design-savvy competitor do better?

Return:

- VERDICT: STRONG, SHIP-WITH-CHANGES, or SEND-BACK.
- Findings in severity order.
- Revised H/T/L model if needed.
- Revised compact scorecard with hard fails.
- Exact cold-mode test.
- Authority matrix for Sean, Kimi, Fable, builders, and scripts/design-brain.
- Exact minimal canonical-doc patch recommendations.
## 6. Kimi result and Codex disposition

Kimi K3 returned SHIP-WITH-CHANGES. Accepted: H/T/L with an exit rule, a Swan-ownable blocking gate, blast-radius trial evidence, explicit contradiction disposition, two bounded Kimi review seats, event-driven revalidation, and a measurable cold-mode drill.

Safety adjustments applied:

- tracked task history is preserved; the 14-day limit expires future evidence authority rather than deleting files;
- contradictions block acceptance of the affected claim, not unrelated claims in an entire domain;
- the 60%/70%/12-of-16 targets are provisional until one measured quarter creates a real baseline;
- the shipped novelty formula remains authoritative in scripts/design-brain and remains advisory;
- the old 47-file engine stays untouched and is explicitly marked superseded.