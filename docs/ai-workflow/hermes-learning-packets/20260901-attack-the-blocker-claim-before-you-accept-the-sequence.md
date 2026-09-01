---
name: attack-the-blocker-claim-before-you-accept-the-sequence
date: 2026-09-01
originating_model: claude-fable-5
surface: Project Aftertaste (voxel game + AI asset factory), planning
models_used:
  - model: claude-fable-5
    role: Final Decider — hostile review of the packet, then the master plan
    did: Re-verified the grounded facts, made six decisions, reordered the critical path, designed the teaching layer, wrote the worker-bot plan.
    cost: subscription
  - model: claude-opus-5 (earlier this session, same lineage)
    role: prepared the packet Fable reviewed
    did: Grounded audit + Blender MCP research; the packet was sound but deferred decisions and had no teaching layer.
    cost: subscription
  - model: general-purpose subagent (free)
    role: Blender MCP research
    did: Found the telemetry-by-default IP-leak and the unrestricted exec; confirmed against repo source.
    cost: $0
skills_touched:
  - id: aftertaste teaching layer (new, docs/aftertaste/)
    change: proposed
    failure: A system explicitly for a beginner had no glossary, no concept cards, no self-narrating tools — teaching existed only as prose buried in a blueprint.
  - id: fable-mode / Final-Decider discipline
    change: reinforced
    failure: A "review" that defers every decision back to the owner wastes the expensive seat; the point of the seat is to decide.
---

# Attack the "blocker" claim before you accept the sequence

## The lesson

**Most things called "blockers" only block one specific downstream step. Re-ordering the work can
dissolve them off the critical path without resolving them at all.**

Project Aftertaste's blueprint and handoff both carried, in bold, "the four decisions that block
everything." Accepting that framing means four decisions must be made before progress. But the claim
does not survive one question: *block WHAT, exactly?*

- "Two visual tiers or three" — only matters when you author a creature's **art**.
- The MIRROR-BREAK grammar ambiguity — only matters when you turn a creature **roster into geometry**.
- Both are art-authoring blockers.

The correct next move — a grey-box fun probe played with untextured boxes — **authors no art.** So
choosing to build the grey-box first removes two of the four "blockers" from the next month of work
*without answering either question*, and reduces the third (on-screen mode labels) to a cosmetic. The
four gates collapse to zero blockers on the critical path.

The generalisation for any planner, human or agent: when a plan front-loads a list of decisions as
gates, **do not accept the sequence — interrogate each gate for the exact step it blocks, then ask
whether a different first step avoids that step entirely.** Sequencing is a lever that is almost
always cheaper than resolution. A plan that resolves blockers it is not yet exercising is spending
effort to reduce anxiety, not risk.

## The second lesson: teaching is architecture, not tone

When a system is built for someone new to the domain, "teach him as we go" is not a writing style —
it is a set of mechanisms: a **living glossary** (every term defined on first use), **per-slice
concept cards** (what you are about to learn, the words, the why, the one video, and a thing you can
now DO), **tools that narrate what they just did and why**, and a **milestone-tied learning path**.
And it only holds if a single pre-commit gate fails a slice that uses an undefined term or ships
without its concept card — otherwise the teaching rots the moment the deadline presses. Teaching-as-a-
gate makes it a byproduct of building. Teaching-as-a-hope makes it the first thing cut.

## Who did what

- **Fable (me)** did the review and the plan, and made the six decisions. The highest-value move was
  not any decision — it was attacking the "four blockers" claim and finding three were off the real
  critical path. That reframing was worth more than the decisions it made unnecessary.
- **Opus 5 (earlier, same session)** wrote the packet Fable reviewed. It was honest and correctly
  grounded, but it (a) deferred the decisions a Final Decider exists to make and (b) carried teaching
  as a §7 tone note rather than a pillar. Both are exactly what a fresh adversarial seat is for — the
  author of a plan is the worst-placed to see what it defers.
- **A free research subagent** produced the Blender MCP findings; the load-bearing ones (unrestricted
  `exec(code, {"bpy": bpy})`, telemetry-on-by-default under a perpetual training licence) were
  confirmed against the repo source, not paraphrased from a summary.

## Skills created or changed

- **A teaching layer for Aftertaste (proposed, `docs/aftertaste/`)** — glossary, concept cards,
  self-narrating tools, learning path, one enforcing pre-commit gate. Built because a beginner-facing
  system had none, and Sean made it a requirement.
- **Final-Decider discipline (reinforced)** — a review that punts every decision wastes the seat.
  When switched in as the decider, decide, and reserve "ask the owner" for the one question that
  genuinely needs the owner (here: the mirror-break reading, and even that is deferred by sequencing
  until it is actually exercised).

## Mistakes I made

- Set the ORIENT `DONE` field over its 150-char cap twice this turn before trimming to 147. A field
  with a hard cap should be written to length the first time. Minor, but it is the length-budget miss
  class the corpus already knows, repeated.
- Nothing structural. I committed via `git commit -F <file>` (applying the standing lesson that the
  shell mangles commit messages containing backticks and quotes) and re-verified the three
  load-bearing facts this turn instead of trusting the prior session — which is the discipline, not a
  mistake, but worth recording that it was actually done rather than claimed.

## Error → fix → repeat ledger

| Error class | Times this turn | Written up before? | What actually stopped it |
|---|---|---|---|
| ORIENT field over its char cap | 2 | Yes (length budgets) | The gate blocked and I trimmed; the real fix is writing to length first, still procedural not habitual |
| Commit message mangled by the shell | 0 | Yes (prior packet) | `git commit -F <file>` — the mechanism held; the lesson stuck because it became a habit, not a note |
| Trusting a prior session's facts instead of re-verifying | 0 | Yes (instrument-did-not-run) | Re-ran the three load-bearing checks this turn before asserting |

The pattern worth keeping: the two error classes that did NOT recur this turn were the two with a
*mechanism* attached (`-F` for commits, re-verification as a habit). The one that recurred (char cap)
is still only enforced by a gate that complains after the fact, not by a habit. That is the whole
theme of this corpus: a lesson holds when it becomes a mechanism, and stays a repeat when it stays a
note.

## External-model calibration

No paid seat consulted; none was warranted — the work was judgment over evidence already on disk. The
one free research subagent scored well: its Blender MCP findings were real and quoted from source on
verification. Route future "is this tool safe to adopt" questions to a free research pass that is
required to quote source, not summarise it — the summary is where the telemetry clause would have been
lost.
