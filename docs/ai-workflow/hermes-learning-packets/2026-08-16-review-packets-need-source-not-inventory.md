---
packet: review-packets-need-source-not-inventory
date: 2026-08-16
originating_model: claude-opus-5
tier: fable-tier
surface: ai-review-pipeline
status: durable
models_used:
  - model: claude-opus-5
    role: packet architect, verifier, final decider
    did: sourced ground truth from origin/main, built both packets, hostile-verified GLM output against real source, caught one wrong finding
    cost: subscription (flat rate)
  - model: glm-5.3
    role: hostile reviewer + blueprint architect
    did: Packet A architecture review + 4 Mermaid + 4 wireframe sets + build order (546s, 25.4k out); Packet B source-grounded design critique (606s, 34.5k out)
    cost: subscription coding-plan credits (no per-token spend)
skills_touched:
  - id: rule-30 (subagent/external skepticism)
    change: reinforced
    failure: an external model's highest-severity finding was factually wrong; relaying it unverified would have sent Sean to fix a non-bug
  - id: hermes-learning-packet
    change: applied
    failure: none
---

# A review packet built from file NAMES produces confident, wrong findings. The same model given SOURCE produces verifiable ones.

## The lesson

When commissioning an external model to review code, **what you put in the packet determines
whether the output is a review or a guess** — and the model's confidence does not change between
the two cases. Both read as authoritative.

Two runs of the same model (GLM-5.3), same session, same repo, same remit style:

| | Packet A | Packet B |
|---|---|---|
| Input | file inventory + contracts + doctrine docs | **verbatim styled-components source** |
| Size | 91 KB | 113 KB |
| Design findings | self-flagged `[inference]` | line-cited with real values |
| Accuracy on spot-check | **top bootcamp finding was WRONG** | **4/4 verified true** |

Packet A's "WORST" finding for the bootcamp creator was that `BootcampDemoMode` ships mock/demo data
in the production component tree — a data-truth violation. Reading the component header disproved it:
it is a *TV/mobile floor board for showing station exercises and Rolodex demo media to a class*. A
legitimate production feature. The model had inferred from the word "Demo" in a filename.

Meanwhile every Packet B claim spot-checked against source held: off-palette hardcoded hex at
specific lines, zero `prefers-reduced-motion` guards in a whole feature, a `100dvh - 210px` vs
`min-height: 520px` collision at 375px, charts-only Arctic Cyan used in a button gradient.

## Who did what

- **claude-opus-5** — established ground truth from `origin/main` (the working branch was 1947
  commits behind, so auditing it would have reviewed fiction), authored both packets, ran both
  consults, then hostile-verified the returned findings against real source. Caught the wrong finding.
- **glm-5.3** — did genuinely strong architecture work from Packet A: correctly identified the
  `uploadTranscript(file, clientId)` contract as the structural blocker for the requested feature,
  argued to *keep* an existing safety fence rather than remove it, and produced a build order with
  real file paths and testable acceptance criteria. Its §F honesty ledger pre-disclosed exactly which
  claims were inference — the failure was in **my packet**, not in its candour.

The division that worked: the external model is excellent at architecture and synthesis from
contracts and doctrine; it is unreliable at *visual/behavioural* judgement without source. Route
accordingly instead of asking one packet to do both.

## Skills created or changed

- **Rule 30 (subagent/external skepticism) reinforced.** The rule says external output is a
  hypothesis until verified. This session is the concrete proof: the single highest-severity finding
  in one deliverable was false, and only a 30-second read of the component header caught it. The
  procedural form of the rule is what survives: **before relaying any external finding, open the file
  it names.** Not "be skeptical" — *open the file*.
- **Packet-construction rule (new, proposed):** a review packet must carry the *artefact class the
  review is about*. Design review → style source. Contract review → type/route source. Architecture
  review → inventory + contracts is sufficient. State the evidence basis in the packet so the
  reviewer's honesty ledger is possible.

## Mistakes I made

- Built the design half of the review on an inventory, then had to build a second packet mid-flight.
  The tell was available before the run: I wrote "hostile-review these for beautification" and gave
  the reviewer no pixels, no colors, no spacing — only paths.
- Piped a long background job through `| tail -25`. `tail` buffers, so a 9-minute run showed zero
  interim output and a progress check was wasted. Unbuffered the second run.
- Assumed a 0-byte output file meant a stalled job rather than a buffering artefact of my own command.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Packet lacks the evidence class the question needs | 1 | No — new | Built Packet B with verbatim source; every spot-check then passed |
| Relaying an external finding without opening the named file | 0 (caught pre-relay) | Yes — Rule 30 | Reading the component header before writing the report. The rule only worked because it was executed as an *action*, not held as an attitude |
| Buffering a background job through `tail` | 1 | No — new | Drop the pipe; read the output file directly |

The one that matters: **Rule 30 was already written down and it still nearly failed**, because a
plausible, well-argued, severity-ranked finding from a strong model does not *feel* like a hypothesis.
What converted the rule into a save was having a cheap mechanical check attached to it (open the file
the finding names) rather than a disposition to be careful.

## External-model calibration

**glm-5.3, this task class (architecture + design review):**
- Findings **real** when grounded in supplied source: 4/4 spot-checked true.
- Findings **wrong** when inferred from filenames: at least 1 of 5 targets' top finding was false.
- Self-disclosure: **excellent** — it volunteered a 9-item honesty ledger naming precisely what it
  had not verified, unprompted beyond a remit line asking for it. This makes it safe to use on thin
  packets *provided* the consumer reads §F and treats flagged items as open.
- Instruction-following: produced all six requested deliverables with exact headings, valid Mermaid
  (4 blocks, correct diagram types, balanced fences), and both mobile+desktop wireframes as demanded.
- Cost/latency: 546s and 606s wall; subscription-billed. Cheap for the depth returned.
- **Routing verdict:** good default for deep architecture/blueprint synthesis. For visual critique,
  only with real style source in the packet — otherwise its confidence will outrun its evidence.

## How to apply next time

1. Name the artefact class the review needs *before* assembling the packet.
2. Source from the branch that is actually current (check drift first — this tree was 1947 commits behind).
3. Ask for an explicit honesty ledger; it is the cheapest quality signal available.
4. Spot-check at minimum the single highest-severity finding against real source before relaying anything.
