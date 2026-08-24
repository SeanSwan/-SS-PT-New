---
title: The learning system's own highest-value field was never schema-validated
date: 2026-08-23
originating_model: claude-opus-5
surface: hermes learning corpus / meta
decision: Validate the corpus fields you intend to aggregate, at write time, or accept that they are prose forever
status: open
supersedes: none
rule: >
  A field that every packet is required to carry, but that nothing validates, will be
  written six different ways and become unaggregatable. Discover this before you build the
  analysis that depends on it, not during. Fix forward — never retrofit a written record.
models_used:
  - model: claude-opus-5
    role: author, scoping the corpus review
    did: counted the corpus, found the six-schema defect, wrote the work order and this packet
    cost: $0 (subscription)
skills_touched:
  - id: hermes-learning-packet (Rule 68)
    change: proposed
    motivating_failure: >
      The skill mandates a `## External-model calibration` section but specifies no schema
      for it. 100 packets carry the section; only 6 use a table, and those 6 use 6 different
      column layouts. The most valuable field in the corpus cannot be summed.
---

# The learning system's own highest-value field was never schema-validated

## The lesson

Rule 68 requires every learning packet to carry `## External-model calibration` — per paid
seat, findings real vs disproven, plus cost. The stated purpose is explicit: *that is how
the routing table gets learned empirically instead of asserted.*

It is the highest-value field in the corpus, and it was never given a schema.

The result, measured across 120 packets:

- **100** carry the section.
- **6** express it as a table.
- Those 6 use **6 different column layouts.**
- **Column 2 is a dollar amount in three of them and a finding-count in the other three.**

| Packet | Header |
|---|---|
| `2026-08-21-a-number-survives-by-being-repeated` | Seat / Cost-wall / Findings real vs disproven / Worth it? |
| `2026-08-21-you-cannot-observe-your-own-effect` | Seat / Cost / Real on verification / Keep? |
| `20260818-a-determinism-test-that-never-asserts-difference` | Seat / Findings real / Findings refuted / Cost / Worth |
| `20260821-a-clean-tree-makes-stash-pop-a-loaded-gun` | Seat / Real findings / False positives / Notable |
| `20260821-the-approval-instrument-must-match-the-medium` | Seat / Cost / Wall / Findings real on verification / Worth |
| `20260822-a-git-deletion-is-not-a-retraction` | Seat / Real / Disproven-misread / Unique / Cost |

A script reading "column 2" across these averages dollars against counts and returns a
number that looks like a routing signal and is not one. Nothing would have flagged it.

**The generalisable form:** *a required field with no validator is a prose field wearing a
schema's name.* Requiring authors to carry a section guarantees the section exists. It
guarantees nothing about whether two instances of it can be compared — and comparison was
the entire reason the field was mandated.

This is the same shape as several lessons already in this corpus (a validator that exits
zero is not a gate; a correct gate nobody runs is not a gate). The new part is *where* it
landed: **on the learning system itself.** The machinery built to make the project learn
had the defect it exists to catch, in its own most important field, for six weeks.

## Who did what

`claude-opus-5` (this session) did all of it: counted the corpus while scoping a review
Sean assigned to Hermes, noticed the header rows disagreed while checking whether the
calibration data could be tabulated, and confirmed the three-cost/three-count split by
reading all six header rows rather than assuming from two.

No external seat was consulted and no spend was incurred. Notably, the finding came from
**trying to build the aggregation and failing**, not from reviewing the schema — the defect
was invisible to every author who wrote the field correctly by their own lights.

## Skills created or changed

**Proposed, not executed:** one canonical schema for `## External-model calibration` plus a
validator in the packet-emission path, so future packets are born comparable.

**Do not retrofit the existing 120.** A record rewritten after the fact is a damaged record —
it would show agreement that never happened. Fix forward; let the old prose stay prose.

## Mistakes I made

- **I repeated a documented mistake within a day.** A heredoc containing fenced code blocks
  and table pipes failed to find its delimiter — the same class already written up in a
  memo dated 2026-08-23. The write-up did not prevent the repeat, which proves the write-up
  was not a fix. The correction that would actually work is procedural, not resolutional:
  *for any file containing fenced blocks or table pipes, use the Write tool first and do
  not attempt a heredoc at all.* "Be careful with heredocs" was the version that failed.
- **Ran a command with a relative `cd` after the working directory had reset**, got `No such
  file or directory`, lost a round-trip. Absolute paths from the first command.
- **Nearly delivered the analysis instead of the work order.** Sean's ask was to *hand the
  job to Hermes*; my first instinct was to run the corpus review myself. That would have been
  useful work and the wrong deliverable — and it would have put a Claude in charge of grading
  a corpus written entirely by Claude, which is the exact independence problem the assignment
  exists to avoid. Caught by re-reading the request rather than by any check.
- **Asserted "Hermes authored none of it" before I could support it.** True for all 120
  packets by `originating_model`; only 285 of 455 memos have a parseable agent field. I
  downgraded the claim to `[LIKELY]` and told Hermes to self-exclude if it finds its own
  memo — but I wrote the strong version first.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Heredoc broken by fenced blocks / table pipes | 1 | **Yes — 2026-08-23** | Nothing yet. Prose correction failed. Procedural rule proposed above: Write tool first, no heredoc attempt for such files. |
| Relative path after cwd reset | 1 | No | Absolute paths for the rest of the session. Held. |
| Claim stated stronger than evidence | 1 | Repeatedly, corpus-wide | Caught in self-review before commit; downgraded to `[LIKELY]` in the artifact. |

The first row is the one that matters. An error class documented *and then repeated inside a
day* is evidence that documentation is not a control. Only the procedural form — a rule that
changes which tool is reached for first — has any chance of holding.

## External-model calibration

No external or paid model was consulted this session. $0 spent.

One calibration claim already in the corpus that the assigned review should **test rather
than inherit**: a recent packet asserts *"the free seats were not the weak seats"* — GLM 5.3
and Ox Alpha carrying a five-round debate at zero cost while paid seats contributed on two
hard arguments rather than on volume. That is one workstream. If six weeks of packets confirm
it, the routing table changes materially. If they do not, a single-workstream impression got
written down as a general lesson — which is its own failure mode, and precisely the kind the
calibration field was mandated to prevent.

## Applies to

Any required-but-unvalidated field in any structured corpus: packet sections, memo headings,
frontmatter keys, ADR templates, review verdicts. If you intend to aggregate it, validate it
at write time. If you never validate it, plan to read it, not to count it.
