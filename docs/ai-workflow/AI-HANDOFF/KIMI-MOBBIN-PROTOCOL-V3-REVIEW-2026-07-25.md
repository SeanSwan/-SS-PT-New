# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** ..\..\..\..\..\tmp\sspt-mobbin-protocol-v3-20260725\docs\ai-workflow\AI-HANDOFF\MOBBIN-PROTOCOL-V3-REVIEW-PACKET-2026-07-25.md
**Seed:** (none)
**Tokens:** 2071 in / 3209 out · **Cost:** ~$0.0543 · **Wall:** 112.9s

---

# KIMI K3 REVIEW — Mobbin Learning Protocol v3

## VERDICT: SHIP-WITH-CHANGES

The v3 shape is sound: three modes, Sean as sole taste authority, recall-tier claims, no promote script, and the refusal to revive the 47-file governance engine are all correct instincts. The packet's biggest weaknesses are not architectural — they are measurement and gameability: cold-mode "success" is still unmeasured, the scorecard has exploitable dimensions, and nothing prevents corpus growth from *looking* like learning while dependence quietly stays flat. Ship it with the patch and scorecard revisions below.

---

## FINDINGS (severity order)

**F1 (P0) — The protocol has no metric for its stated primary goal.**
The #1 goal is "reduce long-term dependence on Mobbin," yet the shipped system measures nothing about dependence. Cold mode is defined as a *concept* but never as a *test with a threshold and a review cadence*. Without F1's fix, the loop can happily produce hundreds of accepted claims while every design task still opens with a Mobbin query — learning theater. Fix: adopt the cold-mode acceptance test below as a release gate for the *protocol*, not just a nicety.

**F2 (P0) — H/T/L split is right but missing an exit rule.**
Mode T receipts are "temporary by default," but temporary is undefined. Ungoverned receipts become a shadow corpus: a builder can cite a week-old task receipt as de facto evidence without it ever entering the MVE, bypassing convergence and contradiction logic. Fix: receipts expire (see patch) — a receipt not nominated within N days is deleted and cannot be cited.

**F3 (P1) — Scorecard dimensions 1 and 2 are gameable through Mobbin homogeneity.**
"Independent shipped-product convergence" is weak evidence when the sampled products all copy each other — which is exactly the failure mode Mobbin catalogues. Three near-identical onboarding flows score 2/2 on dimension 1 while proving only that a pattern is *common*, not *good* or *Swan*. Fix: dimension 1 requires convergence across **different product categories/user jobs**, and dimension 3 (Swan distinctiveness) must be a **gate, not a score**: a principle that cannot be restated in B2/C1–C13 grammar without describing the reference's pixels fails at 0 and blocks.

**F4 (P1) — No scoring dimension measures cost of being wrong.**
A claim about button radius and a claim about checkout-flow structure get the same 8-dimension treatment, but the blast radius differs by orders of magnitude. Fix: add hard fail "unbounded blast radius without trial evidence" — any canon change touching a money, trust, or data-integrity surface requires dimension 7 (Swan-specific trial) = 2, no averaging out.

**F5 (P1) — Contradiction visibility has no consumer.**
"Contradictions remain visible and are never resolved by scoring" is admirable but inert. Visible-to-whom, reviewed-when? An ever-growing contradiction list will be ignored by month three. Fix: contradiction count is a required field on every batch packet, and Sean must explicitly dispose each one (merge / reject one side / defer-with-reason) before new claims in that domain can be accepted.

**F6 (P1) — Kimi's authority boundary is stated but has no trigger.**
"Kimi reviews the scorecard" — which scorecard, when? Ad hoc invocation means Kimi is called when convenient and skipped when the answer is predictable. Fix: Kimi review is mandatory (a) on every Mode L batch packet before Sean adjudication, (b) on every canon-change scorecard. One round, async, no veto — but the attack must be *answered in writing* in the receipt, not necessarily accepted.

**F7 (P2) — Revalidation triggers are listed but have no owner or outcome.**
"Event-driven review" with no assigned first-responder means nobody runs it. Fix: the builder who hits the trigger files a one-line revalidation note; Sean disposes at next batch. Retirement outcome for a failed canon item is **demote to claim with contradiction link**, not silent deletion — silent deletion loses the counterevidence.

**F8 (P2) — Novelty dial states are undefined thresholds.**
PRODUCTIVE vs COOLING vs TAPPED OUT with no stated criteria is a vibe gauge. It "never blocks," fine — but an uncalibrated advisory trains Sean to ignore it, at which point why have it. Fix: define each state in one line tied to accepted-claim rate per query over the last N runs (exact formula belongs in scripts/design-brain docs, not the canonical doc).

**F9 (P2) — Naming hygiene is insufficient.**
Renaming guidance isn't enough; old roadmap files still exist and will be found by search. Fix: the canonical doc patch includes a one-line "NOT the learning engine" pointer that builders can paste into legacy docs, rather than relying on memory.

---

## REVISED H/T/L MODEL

The three modes are the smallest clear model. Do **not** merge H into T — health checks writing nothing is a load-bearing invariant. Add the exit rule:

- **H — Health:** one minimal query, log timestamp + callable tools, **write nothing else**. If tools are down, the task proceeds from canon/claims only (implicitly a cold-mode rep — log it as such; this makes outages useful data).
- **T — Task reference:** named surface, one question, declared budget, receipt produced. Receipt carries `expires: +14 days`. Before expiry: nominate to corpus (→ receipt/1 → MVE) or let it lapse. **Lapsed receipts may not be cited in any later receipt, claim, or scorecard.**
- **L — Corpus learning:** Sean-triggered, named domain, MVE as shipped, novelty advisory only, Kimi pre-adjudication attack, Sean disposes claims and contradictions. Canon unchanged without separate scorecard.

---

## REVISED COMPACT SCORECARD (canon change only)

Score 0/1/2 each; **D3 is a blocking gate (must be ≥1 to proceed at all)**:

1. Cross-category convergence (different product types/jobs, not lookalikes)
2. Contradiction coverage (all known contradictions disposed, not ignored)
3. **[GATE]** Swan-ownable translation: principle restatable in B2/C1–C13 grammar with zero reference-specific layout/copy/assets
4. User-workflow + product-data truth fit
5. Accessibility / responsive / reduced-motion safety
6. Implementation cost and reuse leverage
7. Swan-specific trial evidence
8. Cold-mode usefulness (does canon-izing this reduce future lookups?)

**Hard fails (regardless of total):** copied layout/assets/copy · PII/private content · fake data · inaccessible behavior · Swan-law violation · unresolved high-severity contradiction · no named product job · **unbounded blast radius (money/trust/data surface) without D7 = 2** · **D3 = 0**.

Threshold suggestion: accept at ≥12/16 with no hard fail; 9–11 = trial-only; <9 reject.

---

## EXACT COLD-MODE ACCEPTANCE TEST

Run per quarter over all completed design tasks, with a rolling window:

1. **Cold-start rate:** ≥60% of design tasks (excluding Sean-triggered Mode L runs) complete with **zero** new Mobbin queries, AND the trend over two consecutive quarters is non-decreasing.
2. **Claim-backed decisions:** ≥70% of non-trivial design decisions in those tasks cite at least one existing accepted claim ID or canon line in the task receipt.
3. **Quality guard (anti-generic):** every cold-mode task passes (a) hostile review (Kimi) with no "generic market convention" finding and (b) Sean taste approval. A cold task that fails review counts **against** the rate, not neutrally — this prevents gaming by shipping bland output lookup-free.
4. **Efficiency signal:** Sean adjudication minutes per net-new accepted claim is flat or declining; contradiction rate is not rising (rising contradictions + high cold rate = canon is stale, trigger revalidation).

Pass = 1 + 2 + 3 + 4. Fail any → the *protocol* (not a task) is reviewed. This is the only honest proof of decreasing dependence: fewer queries, more internal citation, no quality decay.

---

## AUTHORITY MATRIX

| Action | Sean | Kimi | Fable | Builders | scripts/design-brain |
|---|---|---|---|---|---|
| Trigger Mode H | ✅ any agent may run | — | — | ✅ run | n/a |
| Trigger Mode T | approves question/budget | may propose question | — | execute | n/a |
| Trigger Mode L | **sole trigger** | may recommend domain | — | execute run | execute only on trigger |
| Nominate T receipt → corpus | ✅ | may recommend | — | may propose | ingest only |
| Accept/reject/merge claims (a/r/t/m) | **sole authority** | mandatory pre-adjudication attack, no veto | — | — | propose, never decide |
| Dispose contradictions | **sole authority** | must be answered in writing | — | file revalidation notes | surface only |
| Canon-change scorecard | **sole accept/edit/reject** | mandatory hostile review of translation | final repo-policy reviewer / commit gate | may initiate proposal | supplies evidence only |
| Promote claim → canon | only via scorecard path | — | commit gate | — | **no promote path exists; keep it that way** |
| Revalidation/retirement | disposes | attacks stale items | gate on canon edits | file triggers | flag only |

---

## MINIMAL SAFE CANONICAL-DOC PATCH

Patch target: `docs/ai-workflow/design-brain/external-reference-mcp.md` (+ router one-liner). Concrete, additive, no deletions of existing receipt/anti-clone rules:

```diff
 docs/ai-workflow/design-brain/external-reference-mcp.md
@@ connector-status sentence
-As of 2026-07-09, Mobbin tools were unavailable in the client.
+Tool availability is runtime-local. Recheck at task start (Mode H).
+Do not record availability claims beyond the current task.

@@ after "external-reference receipt before implementation"
+## Research modes (H/T/L)
+- HEALTH CHECK (H): one minimal query proving tools are callable.
+  Log timestamp + callable tool names only. No corpus write, no claim,
+  no recommendation. If tools are down, proceed from canon/claims and
+  log the task as an unplanned cold-mode rep.
+- TASK REFERENCE (T): named surface, primary job, ONE design question,
+  declared query/result budget. Inspect visuals before describing.
+  Produce the external-reference receipt. Receipts are temporary:
+  `expires: +14 days`. Before expiry, Sean may nominate the receipt to
+  the learning corpus (convert to receipt/1; run scripts/design-brain).
+  Lapsed receipts are deleted and may NOT be cited as evidence anywhere.
+  Never paste a task report into claims.
+- CORPUS LEARNING (L): Sean-triggered named domain run via
+  scripts/design-brain exactly as shipped. Novelty dial advises only.
+  Kimi hostile-review of each batch packet is mandatory BEFORE Sean
+  adjudication; Sean must answer each attack in writing in the batch
+  record (accept or rebut). Sean disposes all surfaced contradictions
+  before accepting new claims in that domain. Accepted claims are
+  recall-tier. Canon changes require the separate canon-change
+  scorecard and Fable commit gate.
+
+## Learning engine pointer
+The learning engine is scripts/design-brain. Roadmap docs named
+MOBBIN-BRAIN-BUILD-PLAN describe product FEATURE IDEAS learned from
+Mobbin, not the mechanism. The 47-file governance engine on old
+branches (PAUSE_NOVELTY, leases, K1-K5) is superseded; do not revive.
+
+## Dependence metric (cold mode)
+Quarterly: (1) >=60% of design tasks complete with zero new Mobbin
+queries, trend non-decreasing; (2) >=70% of decisions cite existing
+claim IDs/canon; (3) every cold task passes hostile review + Sean
+taste approval, failures count against the rate; (4) adjudication
+minutes per accepted claim flat/declining, contradiction rate not
+rising. Any failure triggers protocol review, not task blocking.
+
+## Revalidation triggers (event-driven, no scheduled research)
+Trigger: doctrine conflict, failed implementation trial, repeated
+counterevidence, a11y/responsive failure, product-data-truth mismatch,
+or material source-convention change. The builder who hits a trigger
+files a one-line note; Sean disposes at next batch. Retired canon is
+demoted to a claim linked to its counterevidence — never silently
+deleted.
```

Router (one-liner, wherever tasks dispatch):
```diff
+design-reference task? -> classify H/T/L per external-reference-mcp.md
+before any Mobbin call; default is T; corpus writes only via L.
```

---

## ANSWERS TO THE PACKET'S QUESTIONS (compressed)

1. **H/T/L smallest?** Yes — with the receipt-expiry exit rule (F2). Anything simpler collapses H into T and loses the no-write invariant.
2. **Scorecard gaps:** cross-category requirement on D1, D3-as-gate, blast-radius hard fail (F3, F4).
3. **Cold-mode test:** the 4-part quarterly test above; the key anti-gaming move is that failed cold tasks count *against* the rate.
4. **Revalidation:** event-driven triggers are right; add owner (filing builder) and outcome (demote-with-link, never delete).
5. **Kimi's seat:** exactly two mandatory seats — pre-adjudication batch attack, and canon-scorecard translation attack. Written answers required, no veto. Anything more is the 47-file engine sneaking back.
6. **Smallest patch:** above. ~40 lines, purely additive.
7. **What a design-savvy competitor would do better:** they'd (a) measure dependence from day one instead of asserting it, (b) treat contradictions as a review queue with a disposition SLA, not a museum, and (c) run deliberate cold-mode *drills* — periodically forcing no-lookup tasks to find canon gaps on purpose rather than discovering them mid-deadline. Swan should adopt (c) explicitly: one forced cold drill per month, logged, feeding the quarterly metric.

**Bottom line:** the philosophy is right and the restraint is right. What separates "learning loop" from "receipt hoard" is F1's metric and F5's contradiction queue — land those two in the canonical doc and this ships.
