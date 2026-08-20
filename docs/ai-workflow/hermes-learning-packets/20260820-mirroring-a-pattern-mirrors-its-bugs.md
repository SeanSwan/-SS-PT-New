---
title: Mirroring a pattern mirrors its bugs — and the copy is where you finally see them
originating_model: claude-opus-5
tier_basis: Opus 5 designated Fable-tier by Sean 2026-08-10 (Rule 68 allowlist)
date: 2026-08-20
decision: When you write a new function by mirroring an existing one, you have inherited its defects, not just its shape. Audit the original the moment you find anything wrong in the copy. And when the key of an accumulator comes from data rather than from an allowlist, use Object.create(null) — validating the write path does not make the read path safe.
status: shipped
reviewed_by: self dry-loop, 12 rounds, CLEAN×2 (no external model consulted)
supersedes: none
models_used:
  - model: claude-opus-5
    role: sole implementer and hostile reviewer
    did: Verified a handoff's premise before building on it and found it false, avoiding a redundant page that would have failed a security contract test. Shipped the narrower real fix. Then introduced a prototype-pollution bug by mirroring an existing helper, and found it only by reading its own diff — ten rounds of behaviour tests had passed over it.
    cost: subscription
skills_touched:
  - id: rule-20-sibling-sweep
    change: reinforced
    failure: Fixed the live contact form and nearly shipped without its dormant twin, which already carried a prior agent's note explaining why parity there matters. Then, on the pollution bug, the sibling was the function I had copied FROM — a direction the rule is usually not read in.
  - id: law-3-a-gate-must-read-what-the-human-judges
    change: reinforced
    failure: A gate check searched the document for the link path and passed while the link was reverted to href="#", because the explanatory note below the doors named the same path. It matched my prose about the thing instead of the thing. Second occurrence of this exact class in two sessions.
  - id: feedback_validate_probe_before_absence_claim
    change: reinforced
    failure: Four false alarms from counts matching comments rather than code, plus one grep against a file that does not exist whose empty output I briefly read as evidence.
privacy: IDs, file paths and code only. No client data, no PII, no secrets. Secret scan CLEAN on every emitted file.
---

# Mirroring a pattern mirrors its bugs

## What happened

Sean picked the smallest of three options for closing a funnel gap: make the trainer
signal a structured CRM tag instead of prose inside a free-text column.

Implementing it meant writing an aggregator to count leads by intent. One already
existed that counted leads by channel, over the same rows, in the same shape. I mirrored
it — correctly, faithfully, including the plain `{}` it accumulated into.

That accumulator is keyed by a substring of a tag. Tags are writable through the admin
lead-update API. A lead tagged `prism:intent:__proto__` makes `acc[key]` resolve to
`Object.prototype` — truthy, so the initialisation guard skips — and the `+= 1` then
lands on `Object.prototype.count`, giving every object in the Node process an inherited
`count: NaN`.

Both functions had it. Mine because I copied it; the original because it had always been
there and nobody had asked what an untrusted key does.

## Who did what

**claude-opus-5** — everything. The relevant fact is *how* the bug surfaced. Twelve
hostile rounds ran. Rounds 1–9 tested behaviour: adversarial inputs to the validator
(including `__proto__`, which correctly returned null), null tags, malformed tags,
missing keys, a 1MB string, schema type, middleware interference, consumer breakage.
All passed. All were the wrong question.

Round 10 was "read your own diff as a reviewer" and took one look at `acc[intent]`.
The validator's `__proto__` test had even passed — which is precisely what made it
misleading. **The write path was hardened and the read path was not, and the tests I
wrote asked only about the write path**, because that is the part I had authored.

## Skills created or changed

No new skill. Three reinforced, and the interesting one is a *direction* the sibling-sweep
rule is not usually read in:

- **Rule 20 normally means:** you fixed X, now find the other places that look like X.
- **This session added:** you found a defect in code you wrote by mirroring — now audit
  the thing you mirrored *from*. The copy is downstream, but the bug is upstream, and
  fixing only the copy leaves the source to be mirrored again by the next author. That is
  not a hypothetical; the mirroring is exactly how it reached a second file.

## Mistakes I made

- Introduced a prototype-pollution bug by copying a pattern without asking what its
  accumulator key was made of.
- Wrote adversarial tests for the validator and none for the aggregator, because I had
  written the validator and merely *moved* the aggregator — an unexamined assumption that
  copied code is already tested code.
- Shipped a gate check that could not fail, and only discovered it by injecting the
  regression. It searched for a string that my own explanatory prose also contained.
- Claimed a chain "works end to end" before tracing it to the database.
- Four false alarms from counts that matched comments instead of code.
- Grepped a non-existent file and briefly read the empty result as a finding.
- Fixed the live contact form and nearly left its dormant twin, in a file that already
  carried a previous agent's written warning about exactly that.

## Error → fix → repeat ledger

**Class: a check that matches prose about the thing instead of the thing.**

| | |
|---|---|
| Recurrences | **2 sessions running** — a doc sweep that searched its own documentation (2026-08-19), a gate that searched its own caption (2026-08-20) |
| Already written up before recurring? | **Yes.** The first was written into a durable packet the day before, by me. |
| Correction that failed | Knowing about it. I had authored the write-up and still built the same shape. |
| Correction that held | Injecting the regression and requiring the check to FAIL before trusting it pass. A green check is evidence of nothing until you have watched it go red. |

**Class: asserted a count instead of reading it.** 4 occurrences this session, 0 real
defects, all resolved in one call by printing the actual match. Consistent with the prior
packet. The standing fix remains procedural: print the hit, not the tally.

**Class: hardened the path I wrote, not the path I inherited.** New this session. The
generalisation worth keeping: *test coverage follows authorship, and bugs do not.* Code
that arrives by copy-paste, by refactor, or by mirroring carries the lowest test density
and the highest inherited-defect rate, because at no point did anyone treat it as new.

## External-model calibration

**No external or paid model consulted. $0.00.** Recorded explicitly so its absence reads
as a decision rather than an omission.

Routing note, and it is the second session in a row to reach this: self-review executed
every check it thought to write and never noticed the check it had just written was
aimed at the wrong half of the code. The pollution bug was found by a *vantage change*
(read the diff as a reviewer), not by more of the same rigor. An external reader supplies
that vantage change by construction. For any work where I mirror, move, or refactor
existing code — as opposed to authoring it — one outside pass is worth its cost, because
that is precisely the code my own tests will under-cover.
