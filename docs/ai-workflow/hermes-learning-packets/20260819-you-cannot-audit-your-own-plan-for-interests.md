---
title: You cannot audit your own plan for interests — self-review catches errors and misses exemptions
originating_model: claude-opus-5
tier_basis: Opus 5 designated Fable-tier by Sean 2026-08-10 (Rule 68 allowlist)
date: 2026-08-19
decision: For any plan the author has a stake in, two independent adversaries are not optional. Grep yourself for exemptions — a standard applied to others' work and waived for your own.
status: shipped
reviewed_by: glm-5.3 (REVISE, applied); moonshotai/kimi-k3 (REVISE, applied)
supersedes: none
models_used:
  - model: claude-opus-5
    role: author of the handoff + 9-round self dry-loop
    did: Re-grounded against origin/main before writing, which prevented a duplicate-ledger collision. Then failed to find a single instance of its own motivated reasoning across nine self-review rounds.
    cost: subscription
  - model: glm-5.3
    role: hostile reviewer
    did: REVISE — 1 BLOCKER + 10 MAJOR. Caught that the document violated its own stated sweep rule one section after stating it, and that the author's centerpiece was declared "still holds" without re-derivation.
    cost: plan credit (effectively $0), 261s
  - model: moonshotai/kimi-k3
    role: hostile reviewer
    did: REVISE — 2 BLOCKER + 5 MAJOR. Converged with GLM on both blockers, then added two GLM missed — the quarantine belonged in the reader, and the obvious consumer the author never mentioned was the Atelier itself.
    cost: $0.3384, 373s
skills_touched:
  - id: stale-check
    change: reinforced
    failure: A five-day-old plan was handed forward as current. Re-grounding against origin/main before writing found it had been overtaken by another agent's shipped build.
  - id: rule-73-proof-before-done
    change: reinforced
    failure: The handoff stated bare verification numbers with no command output, inside a document that quotes Rule 73. A verification claim is a completion claim.
  - id: agent-lane
    change: reinforced
    failure: The slice instructed edits to another agent's reviewed, merged artifact without reading its full rulings or checking for an owner.
privacy: IDs, model names, file paths and public repo SHAs only. No client data, no PII, no secrets. Secret scan CLEAN.
---

# You cannot audit your own plan for interests

## What happened

Asked for a handoff so another agent could take over, I grepped `main` before writing rather
than writing from memory. That single habit paid immediately: five days and ~2000 commits had
passed, and the slice I was about to hand over had been overtaken. Another agent had shipped a
build whose ledger **was** the artifact my plan proposed creating, complete with a ruling of
record forbidding a second one. Written from recall, the handoff would have sent the next agent
to build a duplicate in violation of a merged ruling, discovered at integration with both
halves already built.

Then I ran nine rounds of hostile self-review, found and fixed real defects, and shipped it.

Two paid reviewers then returned REVISE, and **independently found the same thing I had missed
in all nine rounds.**

## The lesson

**Self-review catches errors. It does not catch interests.**

My nine rounds found: a stale cross-reference, an over-read of thin data, a broken markdown
fix, a wrong module count. All *errors* — mistakes with no beneficiary.

What both reviewers found instead was an **exemption**:

- I deferred another workstream on the grounds that it would "fill a ledger nothing consumes"
  — while specifying, in the same document, **a distiller with no consumer.** Same principle,
  applied to the work that wasn't mine, waived for the work that was.
- I declared my own prior blueprint's decisions *"still hold"* **without re-deriving them**
  against the shipped build — the exact staleness failure my document accuses its predecessor
  of, three sections earlier.
- One reviewer named the consumer **I never mentioned once**: the shipped system itself, whose
  schema already carried fields that only make sense if verdicts feed the next generation. I
  had routed the work to *my* component because *my* blueprint said so, and never asked the
  question, because the answer I preferred was already written down.

None of these are errors of fact. Each is a place where I was the beneficiary of the reasoning.
**A blind spot you have an interest in maintaining is invisible to the person maintaining it,
however many review rounds they run.**

## What to do about it

1. **Grep yourself for exemptions.** The tell is asymmetry: a standard you applied to someone
   else's work and quietly waived for your own. State the standard, then check every item you
   own against it. If an item is exempt, say why in writing — the sentence usually collapses.
2. **When you have a stake, get an adversary with none.** Not a second pass by yourself, and
   not one reviewer — two. The **overlap** validated the blockers; the **divergence** produced
   the single most valuable finding of the session. One reviewer would have got half of it.
3. **Flag your own stake in the artifact.** The handoff now says, at the load-bearing decision:
   *"the blueprint's answer is mine, so treat my confidence in it as suspect."* A reader who
   knows where the author is invested can discount correctly. A reader who doesn't, cannot.
4. **Cheap adversaries make this routine.** One reviewer cost plan credit; the other $0.34. At
   that price there is no defensible reason to ship a plan you authored and reviewed alone.

## Secondary lessons worth keeping

- **Writing a rule down does not install it.** My document stated *"fixing a claim in one place
  is not fixing it — sweep repo-wide"* and then left the superseded instruction live at both
  sources. I fixed one site, and my own later sweep found a second site in the same file.
  Same lesson, three instances, one session.
- **In an append-only store, capture gaps are not "fix it later."** Backfilling is forbidden by
  policy, so every session that runs before enforcement lands banks another permanently-blank
  row. I had the capture fix as step 4 of 4; it is now step 1.
- **A quarantine belongs in the reader, not the consumer.** Guarding inside one consumer
  protects that consumer; the next one written re-introduces the bug. Push it to the layer
  everything downstream inherits.
- **"Cites N things" is gameable; "change an input, the output must change" is not.** Prefer
  mutation tests to citation counts whenever a criterion is meant to prove consumption.

## Who did what

- **Opus 5 (me)** — authored the handoff. Got the one genuinely high-value move right:
  re-grounding against `origin/main` before writing, which caught that the plan had been
  overtaken and prevented a duplicate-ledger collision. Then ran nine rounds of self-review and
  **found zero instances of its own motivated reasoning.** Also produced an unsatisfiable exit
  criterion from data it had read the same hour, and mis-sequenced the only irreversible step.
- **GLM-5.3** — REVISE, 1 BLOCKER + 10 MAJOR, ~$0 (plan credit), 261s. Found the blocker: the
  document violated its own repo-wide-sweep rule one section after stating it. Also caught the
  Rule 73 violation (bare verification numbers, no command output) and the un-re-derived
  "still holds."
- **Kimi K3** — REVISE, 2 BLOCKER + 5 MAJOR, $0.3384, 373s. Converged with GLM on both
  blockers, then contributed the two findings GLM missed, both architectural placement calls:
  the placeholder quarantine belongs in the reader rather than the consumer, and the obvious
  consumer — never mentioned in my draft — was the shipped system itself.
- **Claude Fable 5** (prior session, not consulted here) — shipped the build that overtook my
  plan, and wrote a commit body honest enough to label its own `kill_rank` values as
  placeholders. **That honesty is the only reason the placeholder trap was catchable at all**;
  had the field simply been populated, a later distiller would have weighted canvas ordering as
  taste and nobody would have known.

## Skills created or changed

- **`stale-check` — reinforced.** A five-day-old plan was about to be handed forward as
  current. The re-ground caught it. This is the second time in this workstream that grepping
  before asserting prevented a day-scale loss.
- **`agent-lane` — reinforced.** My slice instructed edits to another agent's reviewed, merged
  artifact without reading its full rulings or checking for an owner. The revised text now
  requires reading all rulings and running `lane.mjs digest` first.
- **Rule 73 — reinforced.** Bare verification numbers were stated inside a document that quotes
  Rule 73 at the reader. A verification claim is a completion claim; it now ships with the
  commands that produced it.
- **No new skill proposed.** The gap this packet describes is not automatable — it needs an
  adversary with no stake, which is a routing decision, not a script.

## Error → fix → repeat ledger

| error class | recurrences this session | written up before recurring? | what actually stopped it |
|---|---|---|---|
| Partial fix — corrected a claim in one location, left it live in another | **3** (index entry on 08-14; blueprint interface vs slice table today) | **Yes — the rule is written in section 6 of the very document that broke it** | A repo-wide `git grep` for the claim, run as its own review round. Prose did not work; the grep did. |
| Motivated reasoning — exempting my own work from a standard I applied to others' | 2 in one document (consumer-less distiller; "§4 still holds") | No — never previously identified as a class | Two independent paid reviewers. **Nine rounds of self-review found neither.** |
| Over-reading thin data | 1, caught by my own round 2 | Yes (the metric-that-certifies-itself packet) | Reading the source commit body instead of the derived artifact. |
| Stale cross-reference after my own renumbering | 2, caught by my own round 5 | No | Grepping for every `criterion N` / `question N` reference after any renumber. |

**The row that matters is the first one.** Three recurrences of a rule I had already written
down, one of them *inside the document that states the rule*. The correction that finally held
was procedural — a grep executed as a distinct review round — not resolutional. **A lesson
recorded and then repeated proves the write-up was not the fix.**

## Mistakes I made

- **I exempted my own plan from the scrutiny I applied to everything else** — a consumer-less
  distiller, and a "still holds" asserted without re-derivation. Two independent models found
  this; nine rounds of my own review found neither instance.
- **I never asked the most important question** — who should consume this — because my own
  earlier document had already answered it in my favour.
- **I violated my document's own sweep rule inside the document that states it**, then repeated
  the partial fix a second time in the same session.
- **I wrote an exit criterion that could not be satisfied** on data I had read the same hour.
- **I mis-sequenced the only irreversible item**, putting the append-only capture fix last.

## External-model calibration

- **GLM-5.3** — best value-per-cost in this workstream by a wide margin: effectively free on
  plan credit, and its distinctive strength is **holding a document to its own stated rules**,
  which is precisely the failure mode an author cannot self-detect. Its blocker was structural,
  not cosmetic.
- **Kimi K3** — $0.3384. Its differentiator is **architectural placement** (*which component
  should own this?*) rather than defect-spotting; both of its unique findings were placement
  calls, and both were right.
- **Running both was correct and should be the default for authored plans.** Convergence on the
  blockers raised confidence they were real; divergence produced the finding neither I nor the
  cheaper reviewer alone would have surfaced. Total marginal cost: about thirty-four cents.
