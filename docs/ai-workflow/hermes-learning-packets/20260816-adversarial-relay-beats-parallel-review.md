---
originating_model: claude-opus-5
tier: fable-tier
date: 2026-08-16
topic: Adversarial relay — chaining reviewers against each other's FIXES found three holes a parallel panel would have missed
models_used:
  - model: claude-opus-5
    role: builder, Final Decider, third hostile reviewer
    did: shipped the fix, then shipped a second fix with the same class of hole, then a third; wrote all 5 regression tests and proved each fails without its fix
    cost: subscription (flat)
  - model: z-ai/glm-5.3
    role: hostile security reviewer #1
    did: found the chained-alias blocklist bypass and supplied the executable probe that confirmed it
    cost: flat-rate Z.ai coding plan
  - model: moonshotai/kimi-k3
    role: hostile security reviewer #2 (prompted to attack #1's fix)
    did: found the fix was fail-OPEN because gateway and worker hop budgets are additive
    cost: $0.2818
  - model: tencent/hy3
    role: hostile security reviewer #3 (prompted to attack #2's fix)
    did: found the bare except still fail-OPEN on config error; flagged the supply-chain gap both others ignored; correctly downgraded one of Kimi's severities
    cost: $0.0084
skills_touched:
  - id: ai-village-fusion
    change: proposed-amendment
    failure: tiers describe running reviewers in PARALLEL for consensus; that shape would have missed holes 2 and 3, which only exist relative to the previous reviewer's FIX
  - id: closeout-evidence-lock
    change: proposed-amendment
    failure: a regression test that passes on fixed code proves nothing; nothing currently requires demonstrating the test FAILS on the vulnerable code
---

# Adversarial relay beats parallel review

## The lesson

Three independent hostile reviewers examined the same ~20 lines of command-routing code. Each found
a **different HIGH-severity hole**. None found the other two.

The reason is structural: **holes 2 and 3 did not exist until hole 1 was fixed.**

1. **GLM 5.3** found a chained-alias bypass of a command blocklist.
2. I fixed it with bounded fixpoint expansion. **Kimi K3**, prompted specifically to *attack that
   fix*, found it was fail-OPEN: the gateway capped at 8 hops and forwarded the partial result, and
   the downstream worker expanded once more. **Hop budgets are additive across sites: 8+1=9.**
3. I fixed that with fail-closed refusal. **HY3**, prompted to *attack that fix*, found the bare
   `except Exception: pass` still made the entire control fail-open on config-load error — the
   original command routed unverified with the guard never seeing the truth.

A conventional panel — three reviewers, same brief, run in parallel, synthesize consensus — would
have surfaced hole 1 three times and shipped holes 2 and 3.

> **The relay prompt is the mechanism:** *"Reviewer N+1: here is reviewer N's report and the fix I
> made from it. Find what they missed, and attack my fix. Echoing them is worthless."*

Consensus optimises for agreement. Security needs the opposite — each reviewer standing on the
previous one's shoulders to reach higher.

## Who did what

- **Opus 5 (me)** — shipped the original relocation, then **shipped a fix containing the same class
  of flaw it was fixing** (reasoned about one component in isolation, never asked what the next one
  does with a partial result). Wrote all 5 regression tests and, critically, proved each **fails**
  on the vulnerable code before accepting it.
- **GLM 5.3** — best architectural reviewer; supplies *executable probes*, not just objections. One
  finding (type confusion) was **refuted by execution** — its mechanism was wrong.
- **Kimi K3** ($0.28) — the single most valuable finding. Excelled specifically at attacking a fix
  rather than original code.
- **HY3** ($0.0084) — genuinely third perspective. Found the residual both missed, raised the
  supply-chain exposure neither examined, and **downgraded** one of Kimi's severities with sound
  reasoning (the exec hole is pre-existing and reachable directly; the alias only evades *name-based*
  blocking).

Total spend for three independent security reviews that found three distinct HIGH holes: **$0.29**.

## Skills created or changed

Proposed, not applied (Sean's call):

- **`ai-village-fusion`** — add an **adversarial-relay tier** distinct from the parallel-consensus
  tiers. Reviewers run in *sequence*, each receiving the prior report **and the fix made from it**,
  briefed to attack the fix. Consensus tiers stay for design questions; the relay is for
  security-relevant and correctness-critical code.
- **`closeout-evidence-lock`** — require that a regression test be demonstrated **failing on the
  unfixed code**, not merely passing on the fixed code. Every one of the 5 tests here was verified
  by reverting the fix and observing the specific failure; that step is what converted "a test
  exists" into proof. It is not currently mandated anywhere.

## Mistakes I made

- Shipped a security fix that was fail-open at its own limit, because I analysed the gateway in
  isolation and never asked what the downstream component does with a half-resolved command.
- My own `except Exception: pass` swallowed a `NameError` in my own fix, silently disabling the
  control for a full test cycle. Found only by making the except print what it was hiding.
- **Refuted a reviewer's reasoning and wrongly treated that as refuting their conclusion.** GLM
  flagged the bare except; its stated mechanism was wrong and I proved it. The underlying concern
  was correct and bit me minutes later, then was independently re-raised by HY3 with the right
  mechanism. *Disproving the argument is not disproving the claim.*
- Nearly shipped an off-by-one that would have refused legitimate max-length chains (the loop needs
  N+1 iterations to *observe* termination). Caught by re-reading my own patch before applying.
- Eighth instance of the session's standing error class — a narrow reading stated as a broad fact —
  written inside the very document where I instructed reviewers to hunt for one.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What stopped it |
|---|---|---|---|
| Narrow/static/secondhand reading → broad fact | **8** | Yes, repeatedly | **Control terms inside probes**; external reviewers |
| Security control analysed in isolation from its downstream consumer | **2** (fixpoint cap, bare except) | No — new class this session | **Relay reviewer briefed to attack the fix** |
| Silent `except` hiding a real defect | 1 (mine, in the code under review) | Flagged by a reviewer *before* it bit me | Instrumenting the except to print |
| Refuting reasoning ≠ refuting conclusion | 1 | No — new class | A third reviewer re-raising the same claim with correct mechanism |

**Highest-signal row:** the second. It is a *new* class, it recurred immediately within the same
session, and it was caught only because a reviewer was pointed at my fix rather than at the original
code. Parallel review would not have caught it. The procedural correction is the relay prompt —
never "be more careful about downstream effects".

## External-model calibration

| Model | Cost | Real | Disproven | Route to it for |
|---|---|---|---|---|
| GLM 5.3 | flat-rate | 3 | 1 (Q5b mechanism) | First-pass architecture + probe generation |
| Kimi K3 | $0.2818 | 4 | 0 | **Attacking a proposed fix** — its standout strength |
| HY3 | $0.0084 | 3 | 0 | Third perspective, supply-chain/posture blind spots, severity calibration |

**Cost is not a proxy for review quality.** The cheapest reviewer (under one cent) found a HIGH the
other two missed and corrected a peer's severity rating.
