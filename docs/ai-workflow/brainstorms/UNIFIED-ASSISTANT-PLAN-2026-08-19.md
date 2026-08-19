---
decision: "One local assistant (coding + operator tool-calling + training domain) on Qwen3.8-27B. Unification justified by workflow, NOT by capability synergy — that claim was rejected 3-0. Measurement gates every training decision; 'no regression' is reframed as 'no regression ships unmeasured'."
status: open
supersedes: none
sanitized: true
---

# UNIFIED ASSISTANT — PLAN

**Date:** 2026-08-19 · **Author:** Opus 5 · **Panel:** GLM 5.3 ($0) · Qwen 3.8 ($0, local) · Kimi K3 ($0.92, Sean-approved)
**Packet:** `unified-assistant-consult-packet-2026-08-19.md` · **Reviews:** `unified-assistant-consults-2026-08-19/`

> **Dissents are recorded, not averaged.** Where the panel split, both positions are stated with their reasoning and a named experiment that resolves them. Averaging three estimates into one number would manufacture false precision — the disagreements are the most informative output of this review.

---

## 1. The verdict that reshapes the program

**Claim A — "the three capabilities are one skill, so they reinforce" — REJECTED 3–0.** No dissent.

- **Qwen:** conflates *output format* with *cognitive mode*.
- **GLM:** "a hope wearing a hypothesis costume" — zero evidence of positive transfer.
- **Kimi:** "describes every instruction-following task ever" — by that logic interference doesn't exist, which is empirically false.

**What is true instead:** a shared substrate (constraint-following, non-invention) makes co-training **cheap**. Divergent registers make it **interfering**. Cheap ≠ synergistic.

**Unification still stands — on operational grounds.** One session must read a client record and then patch the component that renders it. Cross-capability context in one window is the requirement. *Workflow justifies it; capability theory does not.*

**The interference is measurable, not vibes.** Counters, not judgments: preamble-token rate around tool calls · clarify-rate per 100 tool tasks · follow-up-question rate on client records · response-length p50/p95 per capability · bare-call rate. Adverse drift shows on a dashboard before a human feels it.

---

## 2. LIVE DISSENT — architecture (unresolved, resolve by experiment)

| | **GLM (+ Qwen)** | **Kimi** |
|---|---|---|
| Shape | **One weights set, three registers** selected by system prompt, trained with mode tags | **Three LoRA adapters** on one shared base, swapped per task |
| Rationale | Averaging produces lukewarm everything; conditioning preserves register separation without splitting weights | Interference is real enough that separation should be structural, not prompt-conditioned |
| Cost | One train, one artifact, one eval cycle | Three trains, three artifacts; hot-swap complexity at serve time |

**My call: start with one weights set + mode tags. Keep three-adapter as the pre-registered fallback.** Reason: it is the cheaper hypothesis and Kimi supplies the exact condition that falsifies it (§7 K2). Building three adapters first spends 3× to avoid a risk we have not yet observed.

---

## 3. LIVE DISSENT — how much prompting already achieves

Grounded in the one real measurement: coaching, 60 items, bare base **18** violations → base+679-char prompt **5**. GLM's caveat matters: binomial CIs are wide (30% ±12pp → 8% ±7pp); **the class-level insight is the durable part** — a prompt removes the *"forgot the rules"* class and leaves the *"pressured against the rules"* class. Every survivor sat in the adversarial slice.

| Capability | GLM | Qwen | Kimi | What weights actually buy |
|---|---|---|---|---|
| **Tool-calling** | 85–95% | 80–90% | "fewest weights" | Long-horizon stability, adversarial tail, token economy (emit the call, don't deliberate in prose) |
| **Coding** | ~50% | 40–50% | lowest (most rows) | **Tacit** convention — 6,600 files of micro-preference a rule list cannot carry; prompts wall out at ~18–24 rules |
| **Domain** | 72% measured | 60–70% | judgment rows | Tone, cross-session consistency, the adversarial slice |
| **Calibration** | "barely promptable" | — | own slice | A *disposition*, not a rule. GLM: **highest yield-per-token in the program** |

**Consensus:** tool-calling is nearly free from prompting; coding is where weights earn their keep; calibration is not promptable at all.

---

## 4. LIVE DISSENT — scale (5× split, the largest disagreement)

| | Rows | Shape |
|---|---|---|
| **GLM** | **~3,050** | 1 epoch, QLoRA r=16 |
| **Kimi** | **15,000** | 8,000 coding · 4,000 operator · 3,000 domain, per-adapter |
| **Qwen** | mid | quality over volume |

**My call: build GLM's ~3,000 first.** Two reasons. The earlier program established that convention adherence saturates around 300–600 excellent rows per capability and that past ~1,000 synthetic rows you pay in general-code regression. And 15,000 authored rows is months of work gated on an unproven premise. **If the 3,000-row run beats the baseline but plateaus below target, Kimi's scale is the pre-registered next step — not a rejected idea, a deferred one.**

**Composition (~3,050):** coding heaviest (tacit convention, prompts help least) · operator lighter (mostly prompt+schema) · domain judgment-dense and adversarial · **a dedicated calibration slice** (highest yield-per-token) · **honest-tool-output rows** — teaching the model to treat empty output as a possible crash rather than a clean result. That last one is drawn from this project's own most expensive failure class.

---

## 5. The three prompts

**Prompt 1 — ship-time system prompt.** Deliberately short. Conventions live in weights; the prompt carries only what weights cannot: the mode tag, the non-negotiables, the output contract, and the escalation rule. Full text in the consults; the load-bearing lines are the **register selector** (`MODE: code | operator | domain`) and an explicit *"if unsure a token, migration, or export exists: retrieve, never guess."*

**Prompt 2 — the baseline, and it must be strong.** Kimi: *"deliberately strong — schema inline, priorities explicit, CoT invited. If the tune can't beat this, the tune isn't earning its rows."* A weak baseline flatters the tune and is precisely how this experiment lies to us. Ranked rules only, ~18–24 max, ranked by **measured** violation frequency from a base dry-run — never by our priors.

**Prompt 3 — training-row shape.** Four mechanics, all panel-endorsed:
1. Never correct the same rule the same way twice — vary surface form so it learns the *rule*, not the phrasing.
2. **~15% of rows carry an explicit in-prompt override** ("this legacy file allows raw hex") — this is what teaches *conditional* compliance instead of baked reflex, and it is the answer to the "how do we avoid teaching blanket disobedience" question.
3. Clean-input rows answered "no findings" — teaches restraint instead of inventing work.
4. Rejected halves of preference pairs must be *plausible* failures mined from real base-model dry runs, never hand-invented strawmen.

---

## 6. The never-regress protocol

**First, the impossibility, named.** GLM: *"no regression, ever" over unmeasured behavior cannot be promised by any protocol on earth.* It can only be made **auditable — no regression ships unmeasured, and none survives unflagged.** That is the achievable guarantee and it is worth more than the promise, because it is checkable.

**My frozen-suite proposal was broken correctly** on three counts: it cements week-1 mistakes into permanent vetoes; it drifts invisibly the moment a judge model changes; and 400 items of which 150 are noisy produce *more* false blocks than 250 clean ones. Quantity is not rigor.

**Replacement — three-tier ledger (GLM's, adopted):**

| Tier | Contents | Gate |
|---|---|---|
| **0 — Contracts** | Deterministic validators: tool-call grammar parses · banned-pattern regex · destructive-action-without-confirmation · **empty-output-treated-as-success** | **Zero band. Any flip down blocks ship.** |
| **1 — Fixed suites** | 40–80 items/capability + ~60-item general canary + adversarial slices | Paired exact test (below) |
| **2 — Telemetry** | The §1 counters + perplexity on a fixed reference corpus | Non-gating; two adverse cycles **promotes** a counter into Tier 1 |

**The gate is paired, not threshold-based.** Champion and challenger run the *same* items; count discordant pairs. Under the null, losses L ~ Binomial(d, ½). Block on one-sided exact p<0.05 — at d=12, a 10–2 split gives p≈0.02 (**block**); 9–3 gives p≈0.07 (**record, don't block**). Heuristic: block when **L−W ≥ 2√d**. **If d<5 the comparison is underpowered — record it, never gate on it.**

**Judge pinning:** pin model, version, temperature, and judge prompt as a versioned artifact. When the judge changes, **re-run the champion to re-baseline** — never compare scores across judges. GLM: this is *the single most common way "never down" suites lie*.

**Determinism:** greedy, fixed seed, batch=1 at eval (batching can flip greedy outputs via kernel nondeterminism). Run every new item twice on adoption; flip-flopping items are flagged flaky and downweighted, so run-variance cannot masquerade as regression.

---

## 7. Pre-registered kill criteria (fixed before any run)

- **K1 — the tune is cargo.** The tuned model fails to beat the best-effort baseline (Prompt 2) by ≥10 points on the coding suite at α=0.10. → Ship prompt + guard layer; stop training.
- **K2 — unified weights are unmanageable.** The domain run degrades the coding suite beyond the noise band *despite* replay at rank ≤16, in two consecutive runs. → **Switch to Kimi's three-adapter architecture.** This is the experiment that resolves §2.
- **K3 — the framing itself dies.** *Kimi, verbatim and unsoftened:* **"A no-regression program with n=40 suites is astrology."** Minimum viable is **100 items per capability**. Below that the gate cannot separate signal from noise, and **the honest deliverable is Prompt 2 plus rollback discipline — not training.**

K3 is the one to read twice. It says the eval investment is not overhead around the real work; **it is the precondition for the real work existing at all.**

---

## 8. Sequence

1. **Author the eval items** — 100/capability. Gates everything; K3 fires without it. Sean owns the safety/voice/domain ideals personally.
2. **Measure the prompt ceiling** for coding and tool-calling against Prompt 2 — the number that decides whether steps 3–5 happen.
3. **Build ~3,000 rows** to the §4 composition, only if step 2 shows headroom.
4. **Smoke-train** (200 rows) → gate on loss + spot-check → full run.
5. **Evaluate through the §6 ledger**; promote only through the paired gate; rollback by registry tag.

**Standing constraint:** training evicts Hermes (~17 GB resident). Schedule GPU windows when the assistant is not needed, and restore it after.

---

## 9. What is NOT decided

- Architecture (§2) — one weights set vs three adapters. Resolved by K2, not by argument.
- Scale (§4) — 3,000 vs 15,000. Resolved by whether the small run plateaus.
- Whether training is needed at all — resolved by step 2. **The panel's most useful finding is that tool-calling may be ~90% free from prompting alone.**
