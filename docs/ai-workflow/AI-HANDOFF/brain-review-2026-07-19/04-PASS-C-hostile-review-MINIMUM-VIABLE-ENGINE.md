# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .ai-workflow/brain-review/KIMI-PASS-C.md
**Seed:** .ai-workflow/brain-review/KIMI-PASS-B2-BLUEPRINT.md
**Tokens:** 10548 in / 8794 out · **Cost:** ~$0.1636 · **Wall:** 310.0s

---

# KIMI PASS C — HOSTILE REVIEW

**Stance:** I did not write this blueprint. I inherited it, I think Sean is about to build a second product instead of a tool, and my job is to prove it or fail trying.

---

## 1. KILL-OR-KEEP VERDICT

**Kill 80%. Build the Minimum Viable Engine in §4 (~800 lines, 5 days) and nothing else.** [VERIFIED — this is my verdict]

The blueprint is individually well-reasoned and collectively indefensible: 4,600 lines and 18 moving parts to manage a **70-node graph**. The do-nothing option (16.5h of direct observation) genuinely beats the full blueprint on risk-adjusted return for the stated deliverable — it loses only to the MVE, and only if ToS permits agent inspection. The architecture is not wrong; it is *premature by a factor of five*. Every subsystem answers a real question, but most of those questions don't exist until the corpus is 5–10× larger than this project will ever produce. Build the smallest thing that acquires, structures, and adjudicates claims. Let week-6 evidence — not week-0 foresight — authorize anything more.

---

## 2. THE THREE STRONGEST ARGUMENTS AGAINST THIS BLUEPRINT

### Argument 1 — The quality of observation is never audited, and the receipt schema caps it low by design. [VERIFIED as a design fact; LIKELY as the failure]

Read the spot-check questions (§6.4) honestly:

1. Does the flow have ~6 steps? — **existence check**
2. Is the surface label accurate? — **existence check**
3. Is the claim *visible* here? — **existence check**

All three verify *that the agent looked at a real screen*. None verify *that the agent saw anything*. An agent producing receipts with correct step counts, correct labels, and vacuous principle candidates ("use clear hierarchy," "provide feedback on action") **passes 100% of spot-checks forever**. The only quality filter is Sean's adjudication — 45 minutes over ~14 eight-line summaries, i.e., Sean judging *summaries of observations whose depth nobody checked*. The failure mode the blueprint fears (rubber-stamping) was not eliminated; it was moved one step downstream, from receipts to claims.

Worse, the schema enforces the ceiling: ToS hygiene (no screenshots, no artifacts, ≤25-char verbatim) means **the corpus never contains the design — only text about design**. Design insight disproportionately lives in the visual layer the receipt structurally refuses to capture. The mechanical confidence ladder then assigns HIGH to four shallow observations of the same surface. Confidence is mechanical, yes — mechanical *on unverified inputs*.

**Specific failure produced:** ~70 principles with rigorous-looking provenance that are, in large part, generic. The kind of output Sean could get from one afternoon on Mobbin's featured collections — except now it arrives with `confidence: high` and a Mermaid graph, which makes it *harder* to distrust. Discovered in week 8, or never.

### Argument 2 — The arithmetic never closes once build risk is priced in. [LIKELY]

The "~70 claims / 16.5 Sean-hours ≈ 4.2 claims per Sean-hour" framing **excludes the cost of building the machine**. W1–W2 carry four [UNKNOWN]s (K1–K4 composition, Mobbin MCP signatures, FTS conventions, tool-registration). The blueprint itself calls K1–K4 "the single most likely source of a W1 surprise" and budgets "half a day of mapping" for the MCP adapter — that is the canonical underestimate; an adapter wrapping unseen signatures against a contract written in the abstract is 1–2 days with rework into step 6 (corroboration logic) if K1–K4 differ from the reconstruction [LIKELY]. Realistic slip: first claims land W3–W4, not W2. Now the projection is ~70 claims over 8 effective weeks against ~20+ hours of Sean's *total* attention (build decisions, gate confirmations, debugging, plus the 16.5h ops). That is ~2.5–3 claims/hour — versus direct observation yielding 1–2 principles/hour **with first-hand visual context and zero ToS question**. The 4–5× claim survives only in the best case.

**Specific failure produced:** Sean's stated fear, exactly — stall in week 4. Metrics machinery, wiki emitter, and Linear sync get built before a single claim exists to measure, render, or sync. The project dies with a beautiful control plane and an empty corpus.

### Argument 3 — The least-mitigated risk is the load-bearing one. [VERIFIED as structure]

Every other risk has an engineered mitigation. D1 (ToS) has a *Sean decision* — and it sits under the acquisition layer of the entire engine. If the honest reading is that ~96 automated inspection runs against a paid design library is ToS-risky, the 4–5× economics invert (inspection becomes Sean-bound again), and the fallback — Sean inspects personally, agent structures his notes — **converges with the do-nothing option**. The blueprint's own fallback tier and degraded paths all assume agent inspection continues; none of them model "agents may never fetch." The single assumption with the highest blast radius is the only one the design cannot route around.

**Specific failure produced:** a W1 go-decision made under uncertainty that, if it resolves badly in week 5 (warning banner, cool-down trigger, or Sean's own re-read of the terms), strands the broker/gate/circuit-breaker investment entirely and forces the rebuild-versus-abandon conversation with sunk cost on the table.

---

## 3. CORRECTED YIELD

**Original:** ~70 accepted claims / 11 weeks / 16.5 Sean-hours. [HYPOTHESIS — labeled as such in the blueprint, correctly]

**Hostile derivation:**

| Factor | Effect | Basis |
|---|---|---|
| First claims land W3–W4, not W2 | −15–25% | 4 [UNKNOWN]s in the critical path; "half a day of mapping" is the classic underestimate [LIKELY] |
| Second-product corroboration costs more than first | MEDIUM+ share drops | Runs target a gap cell, so multi-product inspection is designed-in — but products *within a run* are often same-company or same-clone-family; the independence test will demote more claims to LOW than projected [HYPOTHESIS] |
| 5 min/claim adjudication including contradiction pairs, merges, Swan translation | session throughput ~9–10, not 14 | Contradictions and K5 merges are 10-min items interleaved with 2-min accepts [LIKELY] |
| Acceptance rate 55–65% in calibration weeks (W3–W5), rising to ~75% | −10–15% | Early agent/Sean taste mismatch is normal, not pathological [HYPOTHESIS] |
| One skipped/short week over 11 (§8.5 exists because this happens) | −8% | [LIKELY] |
| Distinct vs. total: merges + corroboration collapse ~20% of claims into existing nodes | −20% on *distinct principles* | The blueprint counts claims; Sean wants principles [LIKELY] |

**Realistic: ~40–50 accepted claims, of which ~30–38 distinct principles, ~half at MEDIUM+ confidence.**
**Pessimistic: ~20–25 accepted, ~15 distinct principles, majority LOW/single-source, first real yield week 5.**

**Do-nothing baseline for comparison:** 16.5h × ~1.5 principles/hour = **~20–25 first-hand principles**, full visual context, zero ToS exposure, zero build risk. Note what this means: **the pessimistic engine case loses to do-nothing outright.** The realistic case wins on volume and citability but loses on per-principle depth. The engine only clearly wins if agent parallelism (inspection happens while Sean does revenue work — the genuinely scarce resource) is preserved. [HYPOTHESIS throughout, but derived, not asserted]

---

## 4. THE MINIMUM VIABLE ENGINE

**Thesis:** the only things worth building are the ones that (a) fix a fails-open safety hole, (b) make claims durable and structured, (c) run the weekly loop. Everything else is a week-6 decision.

```
scripts/design-brain/
  src/paths.mjs              ~40 lines   — jail root resolution (Day 1)
  src/writer.mjs             ~120 lines  — §7.6 slimmed: jail, lstat-symlink, binary-magic,
                                           atomic rename, append-only audit log (Day 1)
  tests/writer.test.mjs      ~120 lines  — the 9 acceptance tests from §11, unchanged (Day 1)
  schemas/receipt.schema.json            — stepCount, hierarchyNotes, stateNotes,
  schemas/claim.schema.json              product, surface, platform, principleCandidate (Day 2)
  src/validate.mjs           ~60 lines   — ajv wrapper, nothing else (Day 2)
  src/log-receipt.mjs        ~80 lines   — CLI: append one receipt to receipts.jsonl (Day 2)
  src/synthesize.mjs         ~150 lines  — group week's receipts → proposed claims,
                                           MECHANICAL confidence (§7.1's product-count
                                           ladder — keep exactly this) (Day 3)
  src/packet.mjs             ~100 lines  — render BATCH-Wnn.md, ≤8 lines/claim (Day 3–4)
  src/adjudicate.mjs         ~120 lines  — import a/r/t/m letters, update claims.jsonl,
                                           regen INDEX.md (Day 4)
  config/domains.json                    — 11 domains, depth flags (Day 5, Sean, 1h)
  config/doctrine.md                     — a *document Sean reads*, not a rules engine (Day 5, Sean, 1h)
  data root: ~/design-brain/ — receipts.jsonl, claims.jsonl, batches/, ledger/writes.jsonl
```

**~790 lines + tests. 5 working days. Friday of week 1: first pilot run end-to-end — agent inspects one D01 surface across 4 products, receipts logged, packet rendered, Sean adjudicates 3–5 real claims.** Not W3. Week *one*.

**Operating model changes that make this possible:**

- **Sean is the gate.** He triggers each run by typing `node src/run.mjs --gap D01-P2`. No `authorizedRuns`, no tokens, no `control.mjs` state machine. A present human replaces ~300 lines of authorization machinery. Cost: 2 minutes per run. [VERIFIED — this is a design choice, and it's mine]
- **No broker.** One human-triggered run at a time is concurrency-1 by construction. A warning banner is handled by Sean's eyes, not a circuit-breaker. The lockfile is `$!` and a PID check if you insist — 15 lines.
- **No coverage matrix.** 70 claims into 55 cells is 1.3 claims/cell; the matrix is bookkeeping for a problem Sean holds in his head. The packet header prints domain×phase *counts* — 20 lines inside `packet.mjs`.
- **INDEX.md, not a wiki.** `adjudicate.mjs` regenerates one grouped index on import. 70 notes don't need a graph; they need grep.
- **Spot-checks stay — as a habit.** Three receipts, three questions, Monday, 12 minutes. No log schema, no auto-pause wiring. This is an honest downgrade (see §5), accepted knowingly.

**What the MVE preserves:** agent parallelism (the actual economic win), mechanical confidence, the corpus-as-single-store, markdown adjudication at the right friction level, human-only canon promotion (Sean hand-edits `doctrine.md` from accepted claims — no `promote.mjs`, it's an editor).

**Week-6 evidence gate:** if the corpus holds ≥25 accepted claims and Sean is still adjudicating weekly, *then* authorize, in order: (1) the 5 read-only MCP tools (~150 lines, 1 day) so builders can cite claims; (2) trigram dedupe *if* the merge problem actually appeared; (3) unattended runs + real gate *if* manual triggering is provably the bottleneck. Each is a day. Each must be earned.

---

## 5. WHAT TO CUT FROM THE BLUEPRINT

| Cut | What is genuinely lost | Why it's acceptable |
|---|---|---|
| **authorizedRuns / control.mjs gate** | Unattended Mon–Tue operation; defense against agent self-authorization | That threat exists only *because* runs are unattended. Manual trigger removes the threat and the defense together. |
| **Broker, circuit-breaker, 24h cool-down** | Automated ToS-signal handling | Manual runs = Sean *is* the circuit-breaker. He stops when told to stop. |
| **55-cell coverage matrix + metrics over rolling windows** | Low-yield auto-pause (§7.3) | ~9 runs per phase across a 4-run window is ~2 windows of data — statistical noise wearing a lab coat. Sean will notice low yield; he's reading every claim anyway. |
| **Trigram K5 + merge queue** | Systematic near-duplicate detection | At n≈70, duplicates are visible to the human reading weekly packets. If they aren't, *that* is the week-6 trigger to build it. |
| **doctrineConflictCheck** | ~50%-recall keyword flags | The blueprint itself admits half-recall [HYPOTHESIS, theirs]. Sean reads every claim against doctrine he wrote. A coin-flip attention-director pointing at a human already looking is ceremony. |
| **Spot-check log + auto-pause machinery** | *Enforcement* of the inspection-audit habit | **The honest loss.** Nothing mechanically stops a drifting inspector. But per Argument 1, the enforced version only checked existence anyway — the enforcement was worth less than it looked. Keep the habit; drop the scaffolding. |
| **wiki-emit.mjs + Mermaid graphs** | The visualization | 180 lines serving an emotional want [LIKELD — theirs is "regenerable," mine is "unnecessary"]. INDEX.md does the operational job. |
| **Eval harness + 10-question golden set** | Regression measurement | n=10, self-graded, measures nothing. [VERIFIED as statistics] |
| **MCP façade + FTS spine** | Builder citation loop | Deferred, not killed — highest-value deferred item, first in the week-6 queue. Until then builders grep `claims.jsonl` / INDEX.md. |
| **Linear sync (all of §10.1)** | Board mirrors engine state | The blueprint's own best line: "a claim living in two places is a claim that drifts." Engine state lives in the data root; work state is one manually-maintained Linear issue. |
| **Multi-client install runbook (§9)** | Documented portability | Keep the *discipline* (config-vs-code, 5-function adapter contract — it's ~zero marginal cost). Write the runbook when a second client exists. |
| **Retrofit of 17 records** | D01 seed data | Do it only if it's <2h in the new schema. Otherwise the pilot generates better-seeded data in week 1 than migrated legacy records would. |

**Ceremony called out directly:** the 4-run rolling-window auto-pause (noise), the T0–T4 effect-tier label system (a taxonomy applied to ~6 Linear issues), the byte-identical wiki regeneration acceptance test (testing a thing that shouldn't exist), and `doctrineConflictCheck` (flags for a human already reading). Each *looks* protective; none changes an outcome at this scale.

---

## 6. REVISED W1

Differs from Pass B2 §11 completely. SWA-10 through SWA-15 collapse into two issues:

- **SWA-10′ (Days 1–2):** `paths.mjs`, slimmed `writer.mjs`, 9 acceptance tests unchanged (they were the best thing in §11), schemas + `validate.mjs` + `log-receipt.mjs`. Stop condition unchanged: no writer-dependent code until all 9 pass.
- **SWA-11′ (Days 3–5):** `synthesize.mjs` (mechanical confidence ladder only), `packet.mjs` (with domain×phase counts in the header), `adjudicate.mjs` (+ INDEX.md regen). Day 5: Sean writes `domains.json` + `doctrine.md` (2h), then **pilot run: one D01 surface, 4 products, receipts → packet → adjudication of real claims on Friday afternoon.**

Pre-work, before Day 1: **read `evidence-gate.mjs`** (K1–K4 — irrelevant to the MVE's internals but 30 minutes that de-risks any later integration) and **answer D1**. Mobbin MCP signatures don't matter yet: week 1's receipts are produced by the agent *through whatever access it already has* and entered via `log-receipt.mjs`. The adapter is a week-6 problem.

Exit criteria: ≥3 accepted claims, one adjudication session completed in ≤75 min, Sean's written verdict on whether the packet was worth his time. That last item is the real gate — and no blueprint section had it.

---

## 7. THE D1 (ToS) ANALYSIS — BOTH WAYS

**Does it invalidate the architecture, or merely gate the pilot? Ruling: it gates the economics, not the architecture — but gating the economics is nearly as fatal at this scale.** [VERIFIED as reasoning from the blueprint's own structure]

**If ToS reads clean:** proceed with the MVE. Agent parallelism is preserved, the realistic-yield case beats do-nothing, and the week-6 queue (MCP tools, then dedupe, then unattended runs + real gate) proceeds on evidence. Note the MVE is *also* the right answer here — the full blueprint isn't redeemed by a clean ToS reading, it's just no longer moot.

**If ToS reads risky:** the architecture technically survives — §9.2's adapter contract already abstracts acquisition, and `log-receipt.mjs` doesn't care whether the inspector was an agent or Sean dictating structural notes. **But the value case collapses.** Inspection becomes Sean-bound: ~3 flows/hour, ~45 min/week → the engine is now a structuring tool for ~1 principle/hour of Sean's own observation, which is do-nothing plus JSON schemas. In that world the correct build shrinks to: `log-receipt.mjs` + `synthesize.mjs` + INDEX.md — *or honestly, a markdown template and a directory of dated notes*, which is 90% of the residual value at 2% of the cost.

**So the honest mapping is: the worse the ToS answer, the smaller the justifiable build, asymptoting to do-nothing.** The full blueprint is only defensible in the clean-ToS branch, and even there it's over-built. This is why D1 must be answered **before Day 1, not "before the W1 pilot"** — it determines whether the MVE's pilot is even the right pilot.

**And the do-nothing steelman, stated at full strength:** 16.5 hours of Sean on Mobbin — personally, which is unambiguously within terms — yields ~65 flows seen first-hand, ~20–25 principles with full visual context, and something no receipt schema captures: *Sean's own trained eye*, which for a solo operator is arguably the actual asset. Against the full blueprint, this wins. Against the MVE with clean ToS, it loses on parallelism and citability. Against the MVE with risky ToS, it's a coin flip that lands on do-nothing more often than the blueprint admits. **If D1 resolves risky, my recommendation is do-nothing plus a markdown template. I mean that.**

---

## 8. WHAT SURVIVES

Attacked from every angle I could load, these stand:

1. **The secure writer, built first, with those 9 tests.** Fails open today [VERIFIED per Pass A]; it's the one piece of the whole exercise that is non-negotiable. [VERIFIED]
2. **The corpus-as-asset thesis and the single-store rule.** Claims live in one ledger; nothing syncs to Linear. Correct then, correct now. [VERIFIED as judgment]
3. **Mechanical confidence derivation.** The agent writes inputs, the function derives level. It kills grade inflation at near-zero cost. Survives into the MVE unchanged. [VERIFIED as design]
4. **The 5-function adapter contract and config-vs-code discipline.** This is the *only* thing that justifies an engine over notes at all — portability to client engagements. Keep the contract; defer the runbook. [LIKELY]
5. **Markdown packet + letter-per-claim adjudication.** Right friction, right medium for this operator. [LIKELY]
6. **Spot-checks as a practice** — three receipts, three questions, Monday. Habit, not machinery. [VERIFIED as my recommendation]
7. **Human-only canon promotion.** No agent path to doctrine, ever. [VERIFIED]
8. **ToS hygiene posture:** no artifacts, structural notes only, ≤25-char verbatim, data root outside git. Necessary, though the review's honest point stands — it caps observation fidelity, and that cap should be stated in every pack header so nobody mistakes the corpus for the design. [VERIFIED]
9. **The D03→D04′ depth swap.** The reasoning is sound *independent of the build size*: an engine with a live consumer (the 14-surface program) in week 3 beats one with a hypothetical consumer. Whatever gets built, feed that program first. [LIKELY]
10. **The 45-min tier as a first-class citizen.** The one scope decision in the original that was already honest about attention being the scarce resource. [VERIFIED as endorsement]

**Final line, no authorship attached:** the blueprint was a good answer to "how would you build this safely at 10× scale?" That was never the question. The question was 70 principles for one operator. Build §4. Answer D1 first. If D1 is bad, build nothing and send Sean to look at good apps for 16.5 hours — and say so in the Linear ticket, so week 4 never gets the chance to stall.
