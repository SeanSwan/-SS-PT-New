---
title: The cheapest seat carried the panel, and the sharpest finding was about my own instrument
originating_model: claude-opus-5
tier_basis: Sean's designation 2026-08-10 — Opus 5 is Fable-tier; claude-opus-5 is on the Rule 68 tier_allowlist. GLM 5.3, Kimi K3, GPT-5.6 Sol Pro and local Qwen 3.8 contributed as reviewed seats, not as corpus authors.
date: 2026-08-20
decision: run paid panels against the instrument as well as the artifact, verify every checkable reviewer claim before relaying it, and route by measured per-seat value rather than by price
status: shipped
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
models_used:
  - model: claude-opus-5
    role: packet author, orchestrator, verifier, synthesiser
    did: wrote the hostile packet framing the owner's own goal as the thing under attack; ran four seats; executed three checkable reviewer claims against source rather than relaying them (1 confirmed, 1 refuted, 1 downgraded); caught a foreign review file sitting in the output folder before citing it; adopted the ranked month
    cost: subscription (flat)
  - model: z-ai/glm-5.3
    role: hostile reviewer (free — subscription seat)
    did: HIGHEST-VALUE OUTPUT OF THE PANEL — quantified that structure carries ~6% effective weight not the nominal 32%; reframed the goal by noting the reference product fails the same test 19x/day; named the missing Theme artifact; produced the ranked month adopted wholesale; ALSO produced the one refuted claim and the one overstated claim
    cost: $0 marginal (subscription)
  - model: moonshotai/kimi-k3
    role: hostile reviewer
    did: tight and correct; named the descriptor-as-single-governor as the highest risk and proposed splitting rather than rebuilding it; overstated one security finding to P0
    cost: $0.0288
  - model: openai/gpt-5.6-sol-pro
    role: opening reviewer, statistics
    did: correctly held that 18 clusters is sample-capped at n=24 and is a collision rate, not a support-size estimate — the one statistical correction nobody else made; 96% of total spend
    cost: $0.6210
  - model: qwen3.8 (local)
    role: free standing seat
    did: matched the paid seats' headline conclusions almost exactly at zero cost and full privacy
    cost: $0 (local)
skills_touched:
  - id: Rule 30 (subagent/external output is a hypothesis)
    change: reinforced
    failure: two of three checkable claims from paid reviewers did not survive execution — one refuted outright, one materially overstated — and both would have shipped as fact in a synthesis if relayed
  - id: panel packet design
    change: amended
    failure: earlier packets asked reviewers to attack an artifact; this one asked them to attack the OWNER'S GOAL and the MEASURING INSTRUMENT, and that framing produced every finding that mattered
---

## What happened

The owner asked for a hostile panel on a generative visualizer, against two goals in his own
words: granular authoring control, and twenty-four hours without seeing a repeat.

Four seats. Zero endorsed the plan. The most valuable output came from the seat that cost
nothing, the most expensive seat produced 96% of the spend and one insight, and the sharpest
finding in the whole panel was not about the product — it was about the ruler I had been using
to measure the product, including in the report I had given the owner an hour earlier.

## Who did what

**claude-opus-5** wrote the packet and did the verification. The packet design is the part worth
copying: rather than "review this feature", it stated the owner's goal in his own words, put the
measured evidence next to it, and asked the seats to attack *the goal and the instrument*. Every
finding that mattered came out of that framing rather than out of code review.

**GLM 5.3, at zero marginal cost, carried the panel.** It produced the effective-weight algebra,
the reframing that broke the goal open, the missing-artifact diagnosis, and the ranked month that
was adopted wholesale. It also produced the one refuted claim and the one overstated claim —
high variance in both directions, which is exactly why claims get executed rather than believed.

**Sol Pro cost 96% of the spend** and returned one thing nobody else had: the statistical
correction that a cluster count of 18 drawn from a sample of 24 is a collision rate capped by
its own sample size, not an estimate of how many distinct looks exist. That is a real
contribution, and it was expensive per insight.

**Qwen, running locally for free, reached the same headline conclusions as the paid seats.**

## Skills created or changed

Packet design changed. The prior pattern — hand reviewers an artifact and ask what is wrong with
it — produces findings bounded by the artifact. This packet handed them the owner's *goal*, the
measured evidence, and an explicit invitation to say the goal was wrong. The unanimous verdict
was that the goal as stated was unreachable **and mis-specified**, with the reference product
failing the same test 19 times a day. No amount of reviewing the code would have surfaced that.

## Mistakes I made

- **I under-reported the damage to my own instrument, to the owner, an hour earlier.** I said the
  metric was "roughly half blind" because a colour term unrelated to the property under test
  carried 36 of 76 dimensions. The true effective weight on the property was **~6%**. I had every
  number needed to solve for that and stopped at the qualitative statement.
- **I read declared weights and treated them as operative.** Unstandardised dimensions make
  declared weights decorative — variance-dominant dimensions swamp the rest. I know this in
  general. I did not check it here, in the one place it governed a verdict I had shipped.
- **I ran two studies against an uncalibrated threshold and reported absolute numbers.** The
  programme's own document names the owner as the instrument of last resort; it contains zero
  owner judgments, and the distinguishability threshold was never fitted to his eye. Every
  absolute figure I quoted — including the ones I used to fail my own work — floats free.
- **I nearly cited a review of a different document as part of this panel.** A foreign review
  file sat in the shared output folder from another agent's earlier run. One `head` settled it.
  In a synthesis whose entire value is "these claims were verified", citing it would have been
  fabricated evidence.

## Error → fix → repeat ledger

| error class | recurrences this session | previously written up? | what actually stopped it |
|---|---|---|---|
| Believed an artefact without checking provenance | 1 (foreign review file) — caught before output | **Yes**, by me, twice this week | The standing check now fires before the claim, not after. Third consecutive session caught pre-output |
| Relayed external-model claims without execution | 0 — all three checkable claims executed | Yes (Rule 30) | Executing each claim as a precondition of citing it; 2 of 3 did not survive |
| Stopped at a qualitative statement where algebra was available | 1 | No | New: when a number governs a verdict, solve for it |

The first row is the one I have been tracking across three sessions. It went 4 → 2 → 1, and the
one occurrence this session was caught *before* it reached output. The fix that worked was
procedural — print the artefact's provenance beside the claim — not resolve-to-be-careful.

## The transferable finding

**Panel a paid review at your instrument, not only at your artifact.** The reviewers were given
the measurement I had been using to adjudicate my own work, and the highest-value finding in the
entire run was that the measurement gave the property it adjudicated about 6% of the vote. If
the packet had only asked "is this kernel good", nobody would have looked at the ruler, and I
would have kept reporting confident numbers derived from it.

Two corollaries:

1. **Price is not value; measure per-seat contribution and route on it.** The free subscription
   seat produced the finding that reframed the project. The most expensive seat produced 96% of
   the spend and one insight. The free local seat matched the paid seats' headlines. On this task
   class the correct default roster is the free seats first, with a paid seat added for a
   specific competence — here, statistics.
2. **A reviewer's confidence is uncorrelated with its correctness, in both directions.** The seat
   that produced the best finding also produced the only refuted claim and the only overstated
   severity. Two of three checkable claims did not survive execution. **The verification step is
   not a formality applied to weak reviewers; it is what makes a strong reviewer usable.**

## External-model calibration

| seat | cost | findings real on verification | notes |
|---|---|---|---|
| GLM 5.3 | $0 (subscription) | best insight of the panel; 1 refuted, 1 overstated | highest value AND highest variance — always execute its claims |
| Kimi K3 | $0.0288 | correct on structure; 1 severity overstated | tight, cheap, reliable on architecture |
| Sol Pro | $0.6210 | 1 unique statistical correction, sound | 96% of spend; reserve for statistical/rigour questions |
| Qwen 3.8 (local) | $0 | matched paid headlines | free, private, no reason not to include on every panel |
