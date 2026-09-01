---
title: "A same-lab panel still broke a twice-reviewed spec — and the money bug hid in a string"
packet: a-same-lab-panel-still-broke-a-twice-reviewed-spec
date: 2026-09-01
originating_model: claude-fable-5
tier: fable-tier
tier_basis: "claude-fable-5 is the running session model (Fable 5, Final Decider); provenance first-hand"
surface: PLAUD v2 blueprint review round; external-model calibration (Z.AI GLM 5.3 / Flash return)
decision: "A spec that names a new enum/string value must register it in the table that interprets it, in the same slice — an unregistered source string is a silent policy fall-through, and here it was a billing bug. And a kill switch's blast radius is the union of everything routed through it, not the feature it was named for."
privacy: "No secrets, no client data. Doc sections, column names, rule ids only."
models_used:
  - model: claude-fable-5
    role: spec author, panel dispatcher, adjudicator, Final Decider
    did: "Authored v2 (already twice-reviewed: my v1 hostile pass + GPT-Pro round); dispatched GLM 5.3 + Flash; verified their three repo-dependent VERIFYs by direct read; adopted all 20 distinct findings; applied 15 amendment edits + fixed 5 self-introduced staleness spots in the same pass"
    cost: subscription (flat rate)
  - model: z-ai/glm-5.3
    role: hostile reviewer (Sean-authorized)
    did: "REJECT, 15 findings, 620s wall, 21k reasoning tokens. Both CRITICALs real: outbox flag freezes platform-wide side effects; amendment mode collides with four uniqueness mechanisms the spec itself defines. Zero findings disproven"
    cost: "Z.AI subscription (flat)"
  - model: z-ai/glm-5.3-flash
    role: hostile reviewer (same lab — counted as one lineage with glm-5.3)
    did: "REVISE, 14 findings, 393s wall. Unique catches beyond the big sibling: unregistered `plaud_capture` source string → policy falls through to `live` → paid-session deduction ON (silent money bug); Slice-2 ledger FK targets a table created in Slice 4; consumed-segment dead end; missing-tests-for-own-failure-modes meta-finding"
    cost: "Z.AI subscription (flat)"
skills_touched:
  - id: rule-61 (slice-internal hostile review)
    change: calibrated
    failure: "My dry loop + a GPT-Pro round both passed a spec carrying two internal contradictions and a billing bug. Self-review and even one external round saturate; a THIRD reader with different attack habits still found 20 real defects in a ~500-line spec."
  - id: panel-independence (2026-08-26 packet)
    change: nuanced
    failure: "Same-lab agreement is one reading for CORROBORATION — but two tiers of one lab still produced non-overlapping FINDINGS (Flash's money bug was absent from big GLM's list). Independence discounts agreement, not coverage."
---

# A same-lab panel still broke a twice-reviewed spec

The v2 blueprint had survived my own dry loop and a GPT-Pro hostile round. Sean sent it to the
returned GLM 5.3 and GLM 5.3 Flash. Twenty distinct real defects came back; all twenty were adopted;
none was disproven on verification.

## The two lessons worth keeping

**1. An unregistered string is a silent policy decision.** The spec introduced
`source: 'plaud_capture'` in its approval transaction and never added it to the source-policy table
its own Part 3.2 documents — whose explicit rule is *unknown source → `live` → everything on,
including paid-session deduction*. The spec quoted the fall-through rule and still fell through it.
Consequence: clients billed a session credit for trainer-recorded audio. The general form: whenever
a design names a new enum value, source string, or type tag, the SAME slice must register it in
every table/switch that interprets that domain, and a table test must pin the interpretation. A
grep for the new literal across interpreters belongs in the spec's own test plan.

**2. A kill switch inherits the blast radius of everything routed through it.** The outbox refactor
moved post-commit side effects for ALL workout sources behind `WORKOUT_OUTBOX_ENABLED`, default off
— presented as a capture-lane control, actually a platform-wide freeze of XP/earnings/challenges/PR
on deploy. Both seats caught it independently. The fix (per-source routing; legacy stays inline
until burn-in) also dissolved a second finding (return-shape churn for legacy consumers) for free —
correct scoping of a switch tends to delete adjacent problems, not just the named one.

## Who did what

GLM 5.3 (REJECT) found the deep structural contradictions — amendment mode vs four uniqueness
walls, consent re-check at egress time, admin-override-as-egress liability, aggregate-scoped output
identity breaking cross-aggregate merge. Flash (REVISE) found the operational/ordering class — the
money-bug string, the Slice-2/Slice-4 FK ordering, the consumed-segment dead end, and the sharpest
meta-finding: the spec's test plan did not test the failure modes the spec itself introduced ("a
green Part 15 is compatible with shipping all of the above"). Fable adjudicated: three VERIFY items
resolved by direct read (XP already idempotent; `withdrawnAt` exists; a PATCH edit route exists —
which turned "spec amendment semantics" into "cut amendment, reuse the edit surface").

## Skills created or changed

Rule-61 practice: for build-spec documents, the hostile-review dry bar now includes at least one
reader that did not write and did not previously review the document. Panel-independence packet
nuanced: same-lab seats are one voice for agreement-counting but can still have disjoint coverage —
running both tiers was worth it here.

## Mistakes I made
- Shipped a spec whose own quoted fall-through rule (unknown source → live) applied to a string the same spec introduced three parts later. My dry loop read both parts and never joined them.
- Presented `WORKOUT_OUTBOX_ENABLED` as a capture kill switch while routing all four legacy callers through it — the blast-radius question ("what ELSE goes dark when this flips?") was never asked.
- My amendment edits introduced 5 fresh staleness spots (sequence diagram, endpoint body, two slice rows, a test name) — caught by my own post-edit grep sweep, same pass. Editing a spec is the most likely place for the spec's next contradiction (the 2026-08-23 packet's law, applied to documents).

## Error → fix → repeat ledger
- Spec-internal cross-part contradiction: 2 instances shipped (source string, flag scope), 0 previously written up for SPEC work — the code-side law ("a fix is the most likely place for the next bug") now explicitly covers documents. Surviving fix: post-edit grep sweep for every new literal + a named interpreter test in the spec's own test plan.
- Same-session edit staleness: 5 spots, caught same pass by grep. Not a repeat.

## External-model calibration
- **GLM 5.3 (first round since return):** 15/15 findings real, 0 disproven, REJECT verdict earned. ~10 min wall, heavy reasoning. Route: structural/transactional review of dense specs — top tier, and free on subscription.
- **GLM 5.3 Flash:** 14/14 real (12 overlapping, 2+ unique incl. the money bug), ~6.5 min. Route: run it ALONGSIDE big GLM, not instead — disjoint coverage at zero marginal cost.
- Combined round: caught 2 CRITICALs + a billing bug that TWO prior review rounds (self + GPT-Pro) passed. Cheapest high-yield gate in the current roster for spec documents.
