# CONSULT PACKET — One unified local assistant, trained to get monotonically smarter

**Date:** 2026-08-19 · **Owner:** Sean · **Reviewers:** GLM 5.3, Kimi K3, Qwen 3.8, + Claude (Opus 5)
**Status:** open question. Nothing decided. Attack the plan, do not ratify it.

---

## 0. What changed, and why this packet exists

A previous consult produced a three-model program (Coach / Classroom / Coder). **The owner has now re-scoped to ONE unified assistant** and named the base himself. This packet exists because that re-scope invalidates parts of the earlier plan and nobody has stress-tested the new shape.

**The three capabilities wanted in one model:**
1. **Coding** in his stack — React 18 + TypeScript + styled-components (frontend), Node ESM + Express + Sequelize + PostgreSQL (backend). ~4,400 frontend and ~2,200 backend source files of accumulated house convention.
2. **Operator/tool-calling** — driving a personal assistant ("Hermes") that runs commands, reads local stores, and returns structured results. Reliable tool-call formatting and refusal discipline matter more than prose quality.
3. **Domain work in his product** — a personal-training SaaS: reading client records, building training profiles, sorting and summarising client data, answering "what should I do next with this client".

**Base model, owner-specified:** `Qwen3.8-27B`. Verified available as safetensors (`Qwen/Qwen3.8-27B` 200, `unsloth/Qwen3.8-27B` 200; partially cached locally). **No prebuilt 4-bit exists** (401), so quantize-on-load. Single RTX 5090, 32GB. The same model currently serves as the assistant's brain at ~17GB resident, so training evicts it.

**The owner's stated goal, verbatim in spirit:** prompts and training that are *"immaculate, perfect… only gonna make it so that we're winning… always making an agent smarter at all times. No regression."*

---

## 1. The claim we most want attacked

**Claim A — the three capabilities are one skill, so they reinforce rather than compete.**
Our reasoning: a house-idiom React component, a well-formed tool call, and a client-record extraction are all *"emit correctly-shaped output, obey stated constraints, invent nothing."* Tasks sharing that shape should co-train well.

**Attack it.** Is this true, or motivated reasoning? Where specifically do these three interfere? Our suspicion is that the domain capability wants warmth and hedging ("ask a follow-up before assuming") while tool-calling wants terse determinism, and that these pull tone in opposite directions. Is that real, and does it show up as measurable degradation or only as vibes?

**Claim B — the failure mode is proportion, not capacity.** A 27B has room for all three; the risk is that a mix weighted toward coding produces a coder that is mediocre elsewhere. Is proportion really the lever, and what mix would you actually run?

---

## 2. The hard requirement: monotonic improvement, no regression

This is the owner's real ask and the part we think is under-specified everywhere.

**Our proposal, for you to break:** a **frozen regression suite that may never go down**. Every eval ever written is retained forever. A new checkpoint ships only if it (a) beats the current champion on the target capability AND (b) loses no ground on any prior eval beyond a pre-registered noise band. Champion/challenger with one-command rollback.

**Questions:**
- Is a never-shrinking frozen suite the right mechanism, or does it ossify — freezing in early mistakes and blocking legitimate behaviour changes?
- What is the correct noise band? A fixed point-drop threshold is arbitrary; is there a defensible statistical formulation given we can only afford tens, not thousands, of eval items?
- **Catastrophic forgetting is the specific technical risk.** With LoRA at what rank, and what mix, does adding capability #3 measurably damage #1? What is the cheapest early-warning signal — a general-capability canary, a held-out slice per capability, perplexity drift?
- Multi-capability models usually regress *silently and unevenly*. What instrumentation catches that before a human notices?

---

## 3. The measurement we have, and the one we are missing

**What we measured (real number, this program):** on the coaching capability, across 60 eval inputs, the bare base produced 18 banned-pattern violations; the base **plus a 679-character system prompt** produced 5. **A prompt alone removed 72% of rule violations at zero training cost**, and every survivor sat in the slice that applies deliberate adversarial pressure.

**What we have NOT measured:** the same ceiling for coding or tool-calling.

**The tension we want you to resolve, not smooth over:** the owner wants "immaculate, perfect" prompts. We believe perfect prompts are *measured, not authored* — you cannot know a prompt is good without a baseline to beat. But measurement costs time he would rather spend building.

- Given the 72% datapoint, **what should we honestly expect prompting alone to achieve for coding and for tool-calling?** Be specific and be willing to say "most of it".
- If prompting gets most of the way, what is left that genuinely requires weights?
- Is there a cheaper proxy than a full baseline experiment?

---

## 4. What we are asking you to add

The owner explicitly asked: *"besides what I already told you"* — what capabilities should this assistant have that he has not thought to request?

Constraints on your suggestions: they must be trainable or promptable, evaluable, and worth the proportion they would consume. Do not suggest scope for its own sake. Rank by value-per-row-of-training-data.

Areas we suspect are underexploited, for you to confirm or reject:
- **Self-knowledge about its own limits** — knowing when to escalate to a frontier model instead of guessing. Arguably the single highest-value behaviour for a local model, and rarely trained.
- **Refusal and uncertainty calibration** — saying "I don't know which token that is, retrieve it" instead of inventing a plausible name. This has bitten this project repeatedly.
- **Reading its own tool output honestly** — an entire work session was recently lost to tools reporting success while doing nothing, and to empty output being read as a clean result rather than a crash. Can "distrust silence, verify the negative" be trained as a behaviour?

---

## 5. Prompt engineering — what makes these prompts immaculate

We need three prompts and want them attacked, not admired:
1. The **ship-time system prompt** the tuned model carries.
2. The **baseline prompt** for the measurement in §3 — this must be *best-effort*; a weak baseline flatters the tune and is how this experiment lies to us.
3. The **training-row prompt shape** that teaches judgment rather than mimicry.

Specific questions: how many ranked rules before marginal value hits zero on a 27B? Should the system prompt differ per capability (three modes, one weights set) or be single and unified? How do we teach *conditional* compliance — obeying a rule normally but correctly overriding it when the user explicitly says to — without teaching blanket disobedience?

---

## 6. Output we want

1. **Verdict on Claim A and Claim B** — plainly, including "this is motivated reasoning" if it is.
2. **A regression-proof training protocol** — the mechanism that makes "always smarter, never worse" a measurable fact rather than an aspiration.
3. **Recommended capability mix** with row counts and rationale.
4. **The three prompts**, written out.
5. **Your additions from §4**, ranked by value-per-row.
6. **A pre-registered kill criterion** — what result should stop this program.

Be blunt. If the unified model is a worse idea than three separate ones, say so and show why. If the owner's stated goal contains an impossibility, name it rather than working around it.
