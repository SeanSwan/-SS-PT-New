---
title: "Panel claims are hypotheses — verification flips them"
originating_model: claude-fable-5
tier: fable-tier
tier_basis: "claude-fable-5 is the running session model (Fable 5, Final Decider); provenance is first-hand, not relayed"
date: 2026-08-16
topic: "A full-spectrum panel is only half the method — in-repo verification flipped two of its load-bearing claims"
decision: "Every repo-checkable panel claim gets an in-repo verification pass BEFORE any ruling is issued on it; the packet author's framing/ranking carries hypothesis status and the synthesis must re-derive build order from the panel, not inherit the packet's"
privacy: "IDs/roles only; no PII, no secrets, no client data; all named artifacts are code files and public-package facts; costs are API list prices"
status: draft
models_used:
  - model: claude-fable-5
    role: orchestrator, Fable seat, Final Decider, builder
    did: "Wrote the packet, ran own in-repo hostile pass, verified every repo-checkable panel claim, ruled 12 conflicts, built and shipped the first two ratified slices."
    cost: in-session
  - model: z-ai/glm-5.3
    role: full-spectrum seat, declared depth on architecture/absence
    did: "Deepest structural absences and best product ideas; also the seat whose confident licensing claim was refuted on verification."
    cost: subscription, 308s
  - model: moonshotai/kimi-k3
    role: full-spectrum seat, declared depth on logic/feasibility
    did: "Found the ratified plan's self-contradiction (mask requires a banned capability). All its repo-checkable claims held."
    cost: $0.178, 327s
  - model: openai/gpt-5.6-sol
    role: full-spectrum seat, declared depth on security/determinism
    did: "Executable-content boundary P0, confirmed by verification; 22 systematic findings."
    cost: $0.433, 248s
  - model: tencent/hy3
    role: full-spectrum seat, declared depth on design/human factors
    did: "Delivered the owed wireframes; 2 of 3 dissents adopted."
    cost: $0.003, 99s
skills_touched:
  - id: rule-82-full-spectrum-panel
    action: applied-in-practice
    motivated_by: "First full run of the corrected panel law: every seat answered every angle; the mandatory DISSENT sections produced 12 adjudicated rulings — the panel's highest-value output."
---

# Panel claims are hypotheses — verification flipped two of them

## The lesson

A multi-model panel's output, however rigorous it reads, is a *hypothesis sheet*. On the Swan
Visualizer five-seat review, in-repo verification of the panel's repo-checkable claims flipped
two load-bearing ones in opposite directions:

- **GLM's licensing wall (Butterchurn is GPL-family) was REFUTED** — both packages are MIT.
  Building the panel's remediation (clean-room replacement planning) would have burned weeks
  against a wall that does not exist.
- **Sol/Kimi's executable-preset hypothesis was CONFIRMED** — `new Function('a',
  preset.init_eqs_str…)` is in the vendored library. That confirmation converted a
  "hypothetical hardening idea" into a binding architectural ruling (no generated equation
  text, ever; CSP staged; sandbox before any import surface).

Same session, same panel, same confidence register in the prose. Only the grep told them
apart. The verification pass is not an audit formality after the panel — it IS the second
half of the method, and it must run before any ruling is issued on a checkable claim.

Corollary: **the packet author's framing is itself a reviewable bias.** My attack-surface
ranking led with the hardest reading of the owner's ask (equation breeding) and buried the
feasible one (genome mapping). A seat's dissent caught it. Panels review the packet too.

## Who did what

- **Fable 5 (me):** packet, own hostile pass with file:line evidence, all verifications,
  12 rulings, then built the first two slices (Director wiring + MilkDrop themes),
  255/255 tests, pushed to the feature branch only.
- **Kimi K3** found the single best catch: the two-model-"ratified" masked-feedback plan
  silently required ML segmentation that the project's own Tier-2 ruling bans — a plan
  contradiction invisible to everyone who had already accepted the ratification, including me.
- **GLM 5.3** produced the deepest absence analysis and the best product ideas — and the
  session's one refuted claim. Best and worst from the same seat; verification, not
  reputation, is the filter.
- **Sol 5.6** wrote the security contract that verification promoted to binding.
- **HY3** delivered what a prior (more expensive) design seat had truncated on: the owed
  wireframes. $0.003.

## Skills created or changed

- **Rule 82 (full-spectrum panel) applied end-to-end for the first time**: identical packet,
  declared-not-restrictive roles, mandatory DISSENT. The DISSENT sections alone produced 12
  Final Decider rulings — more decision-value than the findings lists. Keep the mandatory
  dissent; it is where panels earn their cost.
- **Wiring-invariant test pattern reinforced** (`tests/core/directorWiring.test.ts`,
  modeled on `singleAudioGraph.test.ts`): when a review finds "built but never imported,"
  the fix ships WITH a source-scan test so un-wiring is a red build forever. This is the
  second application of the pattern in this repo; it should be the default remedy for the
  tested-but-unwired failure class.

## Mistakes I made

- **False-negative instrument, again:** I grepped `butterchurn/dist/` (does not exist) and
  briefly held a "no eval in butterchurn" result. The standing validate-the-instrument
  lesson caught it; the real path was `lib/`. The claim class ("X is absent") demanded a
  verified instrument before belief, and nearly didn't get one.
- **Flaky test authored, caught in self-review:** my conductor tests asserted a guaranteed
  scene switch from a current scene that was itself in the director's candidate pool — the
  seeded pick could legally return the current scene. Fixed by choosing a current scene
  outside the energy-class pool. Determinism in the code does not make an assertion correct.
- **Packet framing bias** (described above) — an external seat had to catch it.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What stopped it |
|---|---|---|---|
| Believing a negative from an unvalidated instrument | 1 (caught in-session) | YES — standing memory + two prior packets | The written rule actually fired this time: re-checked the path before recording the negative. First observed instance of this class being stopped by its own write-up. |
| Confident external-model claim treated as fact | 0 (all verified before ruling) | yes (prior sessions) | The verification-pass-before-ruling structure; two flips prove the discipline pays. |
| Packet-author framing steering build order | 1 | no — new class | A seat's mandatory DISSENT. Procedural fix: the packet's ranking section now carries the same hypothesis status as model output; the synthesis must re-derive build order from the panel, not inherit the packet's. |

## External-model calibration

| Model | Cost / latency | Findings real on verification | Notes |
|---|---|---|---|
| GLM 5.3 | subscription · 308s | High yield; 1 major claim REFUTED (license) | Do not lens; do verify |
| Kimi K3 | $0.178 · 327s | All repo-checkable claims held | Best contradiction-finder; give it the ratified plan, not just the code |
| Sol 5.6 | $0.433 · 248s | P0 confirmed by grep | Reserve for load-bearing contracts |
| HY3 | $0.003 · 99s | Dissents 2/3 adopted | Delivered what a costlier seat truncated on |

Whole-session external spend: **~$0.61** against a disclosed $7.50 worst case.
