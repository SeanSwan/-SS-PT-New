---
schema: 1.1.0
date: 2026-08-21
originating_model: claude-fable-5
tier_basis: claude-fable-5 is Fable-tier by definition (Rule 68 source gate)
topic: Auditing the auditor — six-seat hostile panel on the Swan Design Brain audit
decision: audit diagnosis accepted, prescription rebuilt (2 of 3 audit P0s reversed)
status: shipped (blueprint delivered, SWA-185; build not started)
privacy: IDs/roles only; no client data; no secrets (word-boundary scan run)
models_used:
  - model: claude-fable-5 / final seat + arbiter / verified audit claims vs origin/main, wrote blind seat review, arbitrated, authored blueprint v2 / subscription
  - model: glm-5.3 / hostile seat / deepest review (8-mechanism slop taxonomy, fingerprint engine, claims-coverage CI) / Z.ai plan credit, 668s
  - model: moonshotai/kimi-k3 / hostile seat / state-machine acceptance tests, AI-detection gate, scope-promotion mechanism / $0.079
  - model: x-ai/grok-4.6 / hostile seat / highest accepted-reversal density (shared-pack refutation, adjective linter, autonomy matrix) / $0.098
  - model: tencent/hy3 / hostile seat (UX specialist) / metricAgreement, JSON-Patch annotation specs, template-signature scoring / $0.005
  - model: qwen3.8 local / free seat / 3 usable findings (taste polarity schema, layout-first) then generic filler — never-lead policy re-confirmed / $0
skills_touched:
  - id: consult-panel.mjs + consult-hy3-design.mjs / used / HY3 script absent from the wip branch — pulled from origin/main; branch drift nearly made a panel seat look "missing"
  - id: swan-design-router + design-brain doctrine / amendment proposed (not applied) / panel found runtime prompts must lose doctrine adjectives; exemplars replace them
---

# Auditing the auditor: what a $0.18 panel did to a confident design-brain audit

## The lesson

An external audit correctly diagnosed the Swan Design Brain's core defect — artifacts with writers and no consumers — and then prescribed **three more writer-shaped artifacts** as its P0s. Nobody inside one document notices its prescription has the same shape as its diagnosis. A six-seat hostile panel caught it unanimously in one round, and two of the audit's three P0s were REVERSED on evidence (shared-material-pack-before-directions forces homogeneity; taste-reader-first distills starvation-grade data into confident noise). **Review a plan's SHAPE against the failure class it diagnoses, not just its content.**

Second durable lesson: **AI slop has two factories.** The audit only closed the "caught-too-late" factory (no critique loop, no memory, no materials). The panel's biggest add was the "produced-at-source" factory: template-prior mode collapse, adjective→token substitution ("crystalline" → glow+blur), component-library gravity, lorem-grade copy. A critique loop bolted onto an unconstrained generator converges to *polished template*. Generation-side forcing (layout IR, skeleton commitment, slop denylist, exemplar anchoring, content-truth stage) is the higher-leverage half.

Third: **plumbing tests masquerade as behavior tests.** The audit's acceptance test — "changing the profile fixture changes the generated pre-brief" — passes while pixels stay identical. Brief ≠ pixels. Acceptance must assert on the final artifact (IR hash, screenshot delta), a class of weak-test that had already earned a REVISE verdict once in this repo and reappeared anyway.

## Who did what

Fable 5 verified every audit factual claim against origin/main BEFORE arbitrating (all held), wrote its seat review blind, then arbitrated. Its unique catches: the direction→production fidelity gate (no other seat saw that the shipped page must be pairwise-judged against its own winning mockup) and the engineering-budget inversion (~25 reference-compliance modules vs ~3 creation modules). GLM 5.3 and Kimi K3 were co-best and fully survived arbitration. Grok 4.6 changed the plan most — both audit-P0 reversals rest on its arguments. HY3 delivered niche-but-real specialist findings at 1/20th the price of the other paid seats. Qwen (local, free) front-loaded three usable findings then padded — it stays a panel voice and never the lead. The original auditor (external, unattributed model) was RIGHT on every verifiable fact and WRONG on prescription shape, sequencing, and test strength — a clean demonstration that factual accuracy does not validate judgment.

## Skills created or changed

None created. Proposed (in the blueprint, Sean-gated): an adjective linter over generator prompts (motivating failure: doctrine adjectives are satisfied as cheap tokens — "crystalline" becomes glow+blur — so the doctrine itself feeds the slop); a claims-coverage CI lint (motivating failure: this repo's design docs previously claimed enforcement mechanisms that never existed, and nothing mechanical stops the new architecture prose from doing it again).

## Mistakes I made

- Skipped the pair-coding lane read at session start; discovered mid-session that Codex was committing to the same tree when HEAD moved under me. No collision — my writes were all in a new directory — but the read-before-edit step is protocol and I dropped it. Fix that survives: the lane read is part of boot, not something recalled when a conflict looms.
- First secret-scan regex had no word boundaries → 3 false-positive "key" hits ("task-success" contains "sk-"). Disproven by a word-boundary re-probe before reporting. This is the mirror image of the documented "validate the instrument before believing a negative" lesson — the instrument must be validated before believing a POSITIVE too.
- Blueprint v1 contained a sequencing self-contradiction (taste distiller gated on annotations from a stage sequenced later) and one miscredited cost claim. Both caught by my own hostile round 3, fixed before delivery — which is the dry-loop working as designed, and also proof the arbiter's synthesis needs the same hostile pass as any other artifact.

## Error → fix → repeat ledger

- **Instrument-not-validated (probe class):** 0 repeats this session after the word-boundary fix; the prior write-up existed (false-absence variant) and generalized to false-presence. The surviving correction is procedural: every scan hit gets one re-probe with a tightened pattern before it is reported.
- **Weak acceptance test (brief-delta instead of artifact-delta):** recurred across sessions — this exact class earned the taste-slice REVISE on 2026-08-19 and the audit re-proposed it a day later. Written up before, repeated anyway → the write-up was not the fix. The fix now proposed is structural: the blueprint's acceptance tests are specified as IR-hash/screenshot deltas, and the claims-coverage lint would make an untested "must" a build failure.
- **Protocol-step skipped at session start (lane read):** first occurrence for this agent; counted once; watch for repeat.

## External-model calibration

- **GLM 5.3** (plan credit): ~11 findings, all real on verification; none disproven. Slowest seat (668s) but highest depth. Route: first-choice free deep reviewer.
- **Kimi K3** ($0.079): all findings real; best at acceptance-test design; ONE-review rule honored. Route: co-lead hostile seat.
- **Grok 4.6** ($0.098): no finding disproven; 2 accepted plan-reversals — highest decision impact per finding. Slight overreach in absolutist phrasing, arbitrated down without loss. Route: keep on every substantial panel (cheapest high-impact paid seat).
- **Tencent HY3** ($0.005): specialist findings real (metric-agreement, patch schema); weak on strategy. Route: UX-mechanics seat, never arbiter.
- **Qwen 3.8 local** ($0): findings 1–3 real, tail generic. Route: always-on free voice, never lead (re-confirmed).
- **Panel economics:** $0.18 total paid overturned two confidently-specified P0s in a plan that would have cost weeks. Reversal-catching, not confirmation, is where panel spend pays.
