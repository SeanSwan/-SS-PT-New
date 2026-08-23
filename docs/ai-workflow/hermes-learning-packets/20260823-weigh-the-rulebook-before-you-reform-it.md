---
title: "Weigh the rulebook before you reform it"
originating_model: claude-opus-5
tier_basis: "Session model is claude-opus-5 (harness-stated: 'You are powered by the model named Opus 5', exact id claude-opus-5[1m]) — on the Rule 68 allowlist via Sean's designation 2026-08-10"
date: 2026-08-23
decision: "Ran an ox-alpha-led 2-round review of why the agent hedges instead of shipping. Measured the rulebook by byte cost per rule for the first time: 968 B of product invariants against 88 KB of process governance. Produced an executable trim (73 rules -> ~28) and adopted shadow-mode as the resolution to keep-vs-cut arguments."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: governance / operating-files / hooks
models_used:
  - model: claude-opus-5
    role: brief author + measurer
    did: "Measured per-rule byte cost and the full hook inventory — data nobody had — then verified ox's two arithmetic challenges against my own document and found both correct."
    cost: subscription
  - model: stealth/ox-alpha
    role: LEAD seat, both rounds
    did: "Refused to triage 73 rules without their identities (round 1), demanded the inventory, then on receiving it produced an executable annex and caught three errors in my brief. Designed its own anti-herding protocol and diverged from the consensus it helped create."
    cost: "$0.0000 (data-egress seat)"
  - model: glm-5.3
    role: advisor
    did: "Most concrete plan: token cap, retire-list, and observable week-one outcomes. Argued a skill cannot fix hedging caused by punitive context because it adds context."
    cost: "$0 (subscription)"
  - model: x-ai/grok-4.6
    role: advisor
    did: "Supplied the sharpest framing: the Stop-gates and the constitution have become the scheduler."
    cost: "~$0.04"
  - model: deepseek/deepseek-v4-pro
    role: advisor (dissent)
    did: "Warned against blind removal of gates that catch real defects; forced the evidence question that shadow-mode answered."
    cost: "~$0.007"
skills_touched:
  - id: rule-12
    action: retire-proposed
    motivated_by: "A 539-byte repealed tombstone still loaded into every turn. Four seats read the rulebook and none flagged it until byte costs were visible."
  - id: rule-58
    action: gap-identified
    motivated_by: "6,692 bytes of Proactive Schema-Drift Detection that does not cover config drift — the governance missed three safety gates going absent from main."
  - id: rule-73
    action: amended-in-practice
    motivated_by: "Proof-Before-Done, Dual-Tier and Phase Audit together cost ~16 KB of always-loaded text; ox proposes replacing their behaviour with a ~10-line closeout skill that forbids new .md at closeout."
---

# Weigh the rulebook before you reform it

## The lesson

A governance system had grown for months on the strength of arguments about which rules
were *right*. Nobody had asked what each rule *cost*. One script answered it:

```
rules  1-11  =    968 bytes   the actual product invariants
rules 46-73  = 88,100 bytes   process governance about how to work and report
73 rules     = 103,724 B of a 164,499 B always-loaded file
```

**Roughly 99% of the constitution's weight was procedure, not product.** No argument
about rule quality would ever have surfaced that, because every individual rule was
defensible. The distribution was the finding, and it was invisible until measured.

> **The rule:** before reforming a rulebook, **weigh it**. Cost per rule, always-loaded
> vs on-trigger, and last-known-catch. A rule's *value* is argued; a rule's *cost* is
> measured — and a system where only value is discussed will grow without bound, because
> expansion is visible and the tax is invisible.

The same asymmetry ran through the tooling: the project tracked panel spend to four
decimal places while spending nothing on measuring whether any gate had ever prevented a
defect. **You can price the policing but not the policed.** That guarantees growth.

## Who did what

**stealth/ox-alpha ($0), lead seat, both rounds.** In round 1 it refused to answer two
of the six deliverables, because the brief demanded per-rule and per-hook verdicts
without supplying the rules or 9 of the 14 hook names: *"any reply containing specific
rule numbers is confabulation."* That refusal was the most valuable thing in the round —
it converted an unanswerable brief into a data-gathering task.

It also designed the anti-herding protocol itself, observing that handing the lead seat
every advisor reply before its final ruling is *"a herding mechanism, not a correction
mechanism,"* and asking to restate its own position first. Implemented in round 2 — after
which it **diverged from the consensus it had helped create**: all four seats had said
*instrument, then cut*; ox came back with *"pure instrument-then-cut is itself becoming a
procrastination mechanism, and several cuts need zero telemetry."*

**GLM 5.3 ($0)** produced the most concrete plan and the sharpest instrument critique: a
skill cannot fix hedging caused by punitive context, because a skill *adds* context.

**Grok 4.6 (~$0.04)** supplied the framing that explains the symptom: the gates and the
constitution have become the scheduler.

**DeepSeek V4 Pro (~$0.007)** was the dissent that mattered — do not remove gates blind;
two of them catch real defects.

**claude-opus-5 (me)** measured the rulebook, and then shipped prose that contradicted my
own tables twice.

## Skills created or changed

Nothing was built. What was produced is an **executable trim** (73 rules → ~28, keep-list
by number, 300-line/12 KB cap) and two reusable techniques:

**SHADOW MODE** — the resolution to any keep-vs-remove argument stalled on missing
evidence. Turn the contested gate from `block` into `warn + JSONL` for a fixed window.
The side that fears removal gets its true-positive data; the side that wants speed gets
it immediately; nobody guesses, and the argument dissolves rather than being won.

**WEIGH-THEN-TRIAGE** — before any rulebook reform, emit cost-per-rule and cost-per-gate.
Four seats had read this rulebook without noticing a 539-byte repealed tombstone loaded
into every turn; it became obvious the moment byte costs were printed next to titles.

## Mistakes I made

- **My prose said "6 of 14 hooks untested" while my own table said 7.** ox recounted from
  the table I supplied and was right — verified 7/7. **MECHANISM:** derive prose counts
  from the table programmatically; never retype a number you already printed.
- **"~57 KB" for a column that sums to 59,579 B.** Same class, same document.
  **MECHANISM:** if I printed the addends, I can print the sum.
- **Shipped a `?` in an inventory cell under a heading reading "the data you demanded is
  here."** **MECHANISM:** an unknown cell invalidates any completeness claim in the
  surrounding prose — fill it or drop the claim.
- **Led the evidence section with a metric I had myself flagged as selection-biased.** ox:
  *"the author flags it and then does it anyway."* **MECHANISM:** a metric that needs a
  caveat to be fair does not lead the section.
- **I am the agent under review and I wrote the brief.** I disclosed it and the framing
  still tilted. Disclosure is not neutrality.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What stopped it |
|---|---|---|---|
| Narrative drifts from its own table | **3** | **Yes — twice earlier today** | Nothing yet. Recurred inside a document praising a seat for catching it. Now: derive counts programmatically. |
| Interested-party framing after disclosing it | 1 | No | Metric that needs a caveat cannot lead |
| Incomplete data presented as complete | 1 | No | `?` invalidates the completeness claim |

The top row is the signal. **Three occurrences in one day, after two write-ups.** Prose
restating a number that already exists in structured form is the mechanism; the fix has
to remove the retyping, not add care. Every correction so far has been resolutional and
every one has failed within hours.

## External-model calibration

Two rounds, ~$0.05 total, and **running the second round changed the answer.** One round
would have shipped "instrument then cut" as four-seat consensus. Round 2 rejected it as
procrastination and produced shadow-mode instead.

Standing pattern, now three panels deep: **ox-alpha is the strongest lead seat available
and its highest-value output is refusal** — refusing to invent rule numbers, refusing to
read past unreconciled totals, refusing its own consensus. A seat that will say *"I
cannot answer this and here is what you must supply"* is worth more than four that answer
anyway. **The free tier again carried the review.**

## Applies to

Any rulebook, prompt library, lint config or policy set that has grown by accretion; any
keep-vs-remove argument blocked on missing evidence; any document whose prose restates
numbers that already exist in one of its own tables.
