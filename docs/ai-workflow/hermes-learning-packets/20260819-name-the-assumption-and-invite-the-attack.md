---
title: "Name the load-bearing assumption and invite attack on it — a review that asks for opinions gets politeness"
originating_model: claude-opus-5
tier_basis: "Session model is claude-opus-5 (harness-stamped in system context) — on the Rule 68 allowlist per Sean's 2026-08-10 designation"
date: 2026-08-19
decision: "Unified local assistant planned; my central capability-synergy claim rejected 3-0 by three independent model families in a single round, because the review packet named the claim and demanded it be attacked rather than asking for a plan review"
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; secret-scanned CLEAN"
models_used:
  - model: claude-opus-5
    role: author / Final Decider / synthesist
    did: "Wrote the packet that named two load-bearing claims for attack; ruled on three dissents rather than averaging them; replaced its own broken regression proposal after it was refuted"
    cost: subscription
  - model: glm-5.3
    role: hostile reviewer (full-spectrum)
    did: "Rejected Claim A as 'a hope wearing a hypothesis costume'; named the impossibility inside the owner's stated goal; broke the frozen-suite proposal on three counts and supplied the tiered ledger, the paired exact test, and judge-pinning"
    cost: subscription ($0)
  - model: moonshotai/kimi-k3
    role: hostile reviewer (full-spectrum)
    did: "Rejected Claim A independently; proposed the separated-adapter architecture as the dissenting position and supplied the exact falsifier for it; produced the sharpest kill criterion in the review"
    cost: "$0.92 of a $3 cap, owner-approved, preflight verified before spend"
  - model: qwen3.8 (local)
    role: hostile reviewer (free, private)
    did: "Rejected Claim A first and gave the clearest statement of the interference mechanism — register conflict between terse determinism and warmth"
    cost: "$0 (local)"
skills_touched:
  - id: hermes-learning-packet
    action: applied
    motivating_failure: none
  - id: hermes-inbox
    action: applied
    motivating_failure: none
---

# Name the assumption. Invite the attack.

## The situation

A programme was re-scoped from three specialised models to one unified assistant. I wrote the review packet, and in it I made a central claim: the three capabilities are fundamentally one skill, so they will reinforce each other rather than compete.

Three reviewers, from three independent model families, rejected it. Unanimously. In one round.

## Why they caught it, and why that matters more than the verdict

The packet did not say *"review this plan."* It said: **here are two load-bearing claims, labelled Claim A and Claim B — attack them, and say 'this is motivated reasoning' if that is what it is.**

That phrasing is the entire reason the flaw surfaced in a single round instead of after a dataset had been built.

A review that asks for an opinion gets politeness and marginal suggestions. A review that isolates the assumption everything rests on, states it plainly, and explicitly authorises the reviewer to call it motivated reasoning — gets the truth. All three took the invitation. One wrote the phrase back verbatim.

**The generalisation: before any expensive commitment, identify the single belief that, if wrong, invalidates the plan. Write it as a labelled claim. Ask reviewers to break specifically that.** Everything else in a review is decoration compared to this.

## What was actually wrong with the claim

I conflated **output format** with **cognitive mode**. All three capabilities do share a shape — emit correctly-structured output, obey constraints, invent nothing. But as one reviewer observed, that describes *every instruction-following task ever*; by my logic all fine-tuning is one skill and interference cannot exist, which is empirically false.

The shared substrate is real but shallow. It makes co-training **cheap**. It does not make it **synergistic**. What competes is register: two capabilities want terse rigid determinism, the third wants warmth and tolerance for ambiguity. Train the first two harder and the third goes cold — measurably, via counters, not as a matter of taste.

**And the conclusion survived anyway**, on an argument I had not supplied: one model is correct because one working session must read a record and then modify the code that renders it. Cross-capability context is an operational requirement. **A right answer reached by a wrong argument is still a wrong argument** — and the difference matters, because the wrong argument would have justified decisions the right one does not.

## The second durable lesson: an unmeasurable guarantee is not a guarantee

The owner asked for a system that "only gets smarter, never regresses."

A reviewer named the impossibility directly: **no protocol can promise no-regression over behavior nobody measures.** It can only be made **auditable** — nothing degrades without being detected. That reframing is checkable. The original promise is a feeling.

My own proposed safeguard — freeze every evaluation forever, never let the score fall — was broken on three counts: it cements early mistakes into permanent vetoes; it drifts invisibly the moment a judging model changes; and a large noisy suite produces *more* false blocks than a smaller clean one. **Quantity is not rigor.**

The sharpest line of the review, worth preserving verbatim: *"A no-regression program with n=40 suites is astrology."* Below roughly a hundred items per capability, the gate cannot separate signal from noise and will emit confident numbers that mean nothing. **The evaluation investment is not overhead around the real work — it is the precondition for the real work existing at all.**

## Third lesson: record dissent, never average it

The reviewers split five-fold on dataset scale and split on architecture. The tempting move is a middle number.

That would have manufactured false precision. Instead each disagreement is preserved with **a named experiment that resolves it** — the cheaper position is adopted first, and the dissenter's own stated failure condition becomes the pre-registered trigger to switch. The minority view is *deferred*, not rejected.

A dissent converted into a scheduled measurement is worth more than a consensus reached by arithmetic.

## Mistakes I made

- **I built a taxonomy that made my preferred conclusion inevitable, and presented it as analysis.** Three families spotted it in one round, so it was not subtle. I had chosen the answer and reasoned backwards to it.
- **I dismissed the interference risk as "vibes" in my own earlier reasoning**, then a reviewer produced the exact counters that measure it — counters I could have specified myself had I tried rather than hand-waved.
- **My safeguard optimised for feeling safe rather than being informative.** "The number may never go down" sounds rigorous and mostly generates false alarms.

## Error → fix → repeat ledger

| Error class | Recurrences | Previously written up? | What actually stopped it |
|---|---|---|---|
| Reasoned toward a conclusion already chosen | 1 (this) | Not in these words | Naming the claim and inviting attack on it specifically |
| Called a risk unmeasurable without attempting to measure it | 2 (same session) | Yes, same session | Demand the counter that would detect it before saying "vibes" |
| Proposed a safeguard optimised for reassurance | 1 | New | Ask what it would falsely block, not only what it catches |

Row two recurred within a single session after being written up in that same session — the recurring shape across this whole programme has been *believing something is unmeasurable, or that silence is data, without checking*. Every correction that held was mechanical and performed before the belief formed.

## External-model calibration

Three families, unanimous on the central question — the strongest signal this programme has produced, because these three have disagreed on plenty. Per-model value was genuinely distinct and none was redundant: the paid reviewer was most concise and produced the sharpest kill criterion; the free subscription reviewer contributed the most usable engineering (tiered ledger, paired exact test, judge-pinning); the local model gave the clearest mechanism statement and did it fastest and free.

Routing implication: on questions where a *framing* may be wrong, breadth across families beats depth in one — the agreement of three independent families is evidence the single strongest model cannot supply alone.
