---
title: "Three numbers for one quantity is a scope boundary, not sloppiness"
originating_model: claude-opus-5
tier_basis: "Session model is claude-opus-5 (harness-stated: 'You are powered by the model named Opus 5', exact id claude-opus-5[1m]) — on the Rule 68 allowlist via Sean's designation 2026-08-10"
date: 2026-08-23
decision: "Ran the Village blueprint panel; the spend gate ran 4 free seats first and all 4 returned REVISE/REJECT on the brief. Reconciled the corpus arithmetic and found memo-mistakes.json excludes all 84 learning packets — so every error-class ranking in the programme was computed from the lower-quality half of the corpus. Revised the brief; paid seats held pending explicit spend approval."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: village-panel / forensics-corpus
models_used:
  - model: claude-opus-5
    role: brief author + verifier
    did: "Wrote the brief (with three inconsistent totals in it), then verified every seat finding by arithmetic rather than accepting them — confirming two, disproving one, and reconciling the corpus exactly."
    cost: subscription
  - model: stealth/ox-alpha
    role: hostile reviewer (free seat)
    did: "Refused to read past three inconsistent corpus totals, computed true coverage at ~35% vs the 43% claimed, and flagged 7 undocumented registered gates. Both confirmed."
    cost: "$0.0000"
  - model: glm-5.3
    role: hostile reviewer (free/subscription seat)
    did: "Found a real design error — the brief demanded fail-open from every mechanism, which specifies a leak path for the PII gate — and that the constraint catalogue listed 5 of 11 binding rules."
    cost: "$0 (subscription)"
  - model: qwen3.8 (local)
    role: hostile reviewer (free, local)
    did: "Attacked the programme thesis: hooks are binary, many of these errors are semantic. 'A hook cannot detect that a test passed but tested the wrong thing.'"
    cost: "$0 (local)"
  - model: gemini-3.1-pro
    role: hostile reviewer + blueprint author (free seat)
    did: "Correctly rejected the brief's 334 KB boot-surface figure, then replaced it with its own error ('the agent reads the same rulebook twice'). Delivered a complete blueprint regardless."
    cost: "$0 (direct Google API)"
skills_touched:
  - id: rule-16
    action: reinforced
    motivated_by: "The spend gate ran free seats first and blocked paid ones; the free seats then proved the brief was not worth paying against. Gating order was worth more than the money."
  - id: rule-29
    action: amended-in-practice
    motivated_by: "A schema cross-check artifact must reconcile its own totals before any ranking is derived from them. Three totals in one document was the only visible symptom of a scope boundary."
  - id: rule-51
    action: reinforced
    motivated_by: "Gemini was right that my number was wrong AND wrong in its replacement. A correct refutation does not confer correctness on the substitute."
---

# Three numbers for one quantity is a scope boundary, not sloppiness

## The lesson

I wrote a brief that cited **2,546**, **2,096** and **2,523** as the total size of the
same corpus. I noticed the inconsistency, disclosed it in a weak-evidence section, and
shipped it anyway as untidiness.

A hostile seat refused to read past it and did the arithmetic. The gap is exact:

```
528 inbox memos      -> 2,096 issues   == the ENTIRE machine extract
 84 learning packets ->   450 issues   == absent from the extract
                        2,546 total
```

The extract is **memos-only**. Every class distribution, every catch-profile figure, and
the governing "mechanisms beat rules" finding **excluded all 84 Fable-tier learning
packets** — the corpus written specifically to hold the durable, highest-quality
lessons. Months of prioritisation ran off the lower-quality half of the record.

> **The rule:** when the same quantity has more than one number, that is not
> untidiness to disclose — it is a **structural fact you have not found yet**. Two
> numbers that differ mean something is being counted under two different definitions.
> **Reconcile before you rank.** Ranking derived from an unreconciled total describes an
> unknown subset of an unknown population.

The tell was available the whole time and cost nothing to check: three numbers, one
subtraction. Disclosing an inconsistency is not the same as resolving it, and disclosure
made me feel honest enough to proceed.

## Who did what

**stealth/ox-alpha ($0)** produced the finding. It treated the inconsistency as a
blocker rather than a caveat, computed the corrected coverage (35.5%, not 43%), and was
right. It also flagged that 7 registered guards have no documented trigger or failure
mode — confirmed, and worse than it guessed (14 registered vs 7 documented).

**glm-5.3 ($0)** found the design error with the largest blast radius: I had specified
that *every* mechanism must fail open and publish an off-switch. Applied to the PII
egress gate, that is a written-down leak path; applied to the spend gate, a documented
budget bypass. Compliance gates must fail closed.

**qwen3.8 (local, $0)** attacked the programme's thesis rather than its details, and the
attack has not been answered: hooks are deterministic binary checks, but a large share
of the recorded errors are semantic.

**gemini-3.1-pro ($0)** is the calibration lesson. It correctly rejected my "334 KB
combined boot surface" — and then asserted the agent "reads the exact same rulebook
twice," which is also false. One reader per file. **A reviewer being right that you are
wrong tells you nothing about whether its replacement is right.**

**claude-opus-5 (me)** authored every defect above and verified each seat's claim by
arithmetic instead of accepting it — which is how one of the four was disproven.

## Skills created or changed

Nothing new was built this turn. What changed is a working practice with a command
attached: **the reconciled-triple rule.** One script emits `(issues, extracted,
classified)`, and that output is the only citable source. Any document quoting a corpus
size cites the script, not a remembered figure. This is ox's prescription and it is
unbuilt — recorded here so it is not lost.

Also corrected in the brief, and worth carrying forward as spec-writing practice:
classify a gate as **compliance** or **convenience** *before* specifying its failure
direction. The failure mode is not a uniform property of "being a gate."

## Mistakes I made

- **Shipped three totals for one corpus to four reviewers.** The programme's #1 recorded
  error class is number drift; the brief diagnosing it exhibited it. **MECHANISM:**
  reconcile totals with one script before deriving any ranking.
- **Described three hooks as an open finding after committing them hours earlier.** Two
  seats spent their entire P0 slot on a fixed defect — the **second time** this
  programme burned panel capacity this way, committed inside the section that warns
  about it. **MECHANISM:** mark fixed items inline with their SHA in the same row.
- **Corrected a number in one place and left it live in another.** My revised brief
  still cited the discredited 2,523 figure eleven lines above my own text saying it must
  never be cited. **MECHANISM:** after correcting a number, grep the whole document for
  the old value; fixing one instance is not fixing it.
- **Specified a failure direction that would have leaked data**, by demanding fail-open
  universally. **MECHANISM:** classify compliance vs convenience before specifying
  failure behaviour.
- **Treated disclosure as a substitute for resolution.** I put the inconsistent totals
  in a weak-evidence section and proceeded. **MECHANISM:** a disclosed inconsistency in
  a *countable* quantity is a blocker, not a caveat — counting is cheap.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What stopped it |
|---|---|---|---|
| Fixed and open items in one undifferentiated list | 1 | **Yes — same programme, prior panel** | Nothing yet. Recurred *inside* the section warning about it. Now: inline SHA per row. |
| Number drift in my own document | 3 (2,523 ×2, 334 KB, 5-of-11) | Yes — it is the corpus's #1 class | Stale-number grep after each correction |
| Disclosure used as resolution | 1 | No | Treat countable inconsistencies as blockers |
| Asserted harness behaviour without checking own context | 1 | No | The context window is the evidence; read it |

The top row is the one to watch. It has now recurred **after** being written up, in the
document that cites the write-up. That proves the write-up was not a fix — the pattern
this corpus keeps demonstrating. The correction that might survive is mechanical (a SHA
in the row), not resolutional.

## External-model calibration

Four seats, **$0.00 total**, four substantive replies. Findings real on verification:
ox's corpus non-reconciliation ✅, ox's undocumented-gate gap ✅, GLM's fail-open design
error ✅, GLM's incomplete constraint catalogue ✅, GLM's missing success metric ✅.
Disproven: Gemini's double-load claim ❌.

**The free tier carried this entire review.** ox-alpha, GLM, Qwen and Gemini cost
nothing and between them found a corrupted evidence base, a leak-shaped spec error, and
an unanswered attack on the programme thesis — before a single paid seat ran. The
standing routing lesson holds and strengthens: **run free seats first, and let them
audit the brief before paid seats answer it.**

Second consecutive panel where an explicit "our own evidence is weak here" section
prevented premise-echo. Two seats cited it and reasoned *from* the disclosed weakness.

## Applies to

Any corpus with more than one stated size; any ranking derived from an extraction
pipeline whose scope is undocumented; any review brief mixing fixed and open items; any
gate specification that assumes one failure direction fits every gate.
