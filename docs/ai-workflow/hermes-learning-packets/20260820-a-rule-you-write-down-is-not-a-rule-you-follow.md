---
title: A rule you write down is not a rule you follow — I broke mine eight rounds after writing it, in the same document
originating_model: claude-opus-5
tier_basis: Opus 5 designated Fable-tier by Sean 2026-08-10 (Rule 68 allowlist)
date: 2026-08-20
decision: A correction phrased as a discipline ("be careful with line numbers") does not survive contact with the next section. Only a runnable command with a control survives. When you fix a wrong value, sweep for its siblings in the same breath — and prove the sweep can see a positive before you believe its zero.
status: shipped
reviewed_by: self dry-loop, 14 rounds, CLEAN×2 (no external model consulted)
supersedes: none
models_used:
  - model: claude-opus-5
    role: sole author, verifier, and hostile reviewer across 14 rounds
    did: Verified a handoff's central claim before building on it and found it false, which prevented building a redundant page that would have failed a security contract test. Then produced three instances of the same self-inflicted error class inside the correcting document, each caught only by a later round of its own dry-loop.
    cost: subscription
skills_touched:
  - id: rule-20-sibling-sweep
    change: reinforced
    failure: Fixed three wrong line numbers in §2 and moved on. The same wrong number was still sitting in the §3 table, two sections below the paragraph explaining the error. Fixing the instance is not fixing the class.
  - id: feedback_validate_probe_before_absence_claim
    change: reinforced
    failure: Three separate alarms this session were instrument defects, not artifact defects — a grep filter that matched its own documentation, a head-masked exit code, and a citation count. Each resolved in one call by looking at the actual hit instead of the number.
  - id: law-5-run-what-you-hand-over
    change: reinforced
    failure: Shipped a sibling-sweep command with no `cd` that dies from the repo root, then shipped a replacement sweep that reported false hits because the paragraph documenting it contains the strings it searches for. Both caught only by executing them verbatim.
privacy: IDs and file paths only. No client data, no PII, no secrets. Secret scan CLEAN on all emitted files.
---

# A rule you write down is not a rule you follow

## What happened

Picked up a front-page handoff whose §8 named `/trainers` the hard blocker and the best
use of an unattended session, on the stated premise that a trainer's click lands in a
client signup form.

Verified the premise before building on it. It was false. Every trainer CTA already
routes to `/contact`; two Prism touchpoints carry `?intent=trainer`; the contact page
reads it. More importantly a contract test *forbids* public trainer self-registration —
so the page the handoff asked for would have failed a gate on its way in. Building first
would have cost a session and produced something that could not merge.

The real gap was narrower and real: `intent:'trainer'` is validated and tagged in the
capture route with zero senders, and the signal that does travel ends up as prose in
`Lead.notes` because the contact API accepts no `subject` and no `intent`. The structured
channel exists and is empty.

Wrote the correction as a Canonical Surface Receipt. Then spent fourteen hostile rounds
discovering that the correcting document kept committing the error it was correcting.

## Who did what

**claude-opus-5** — everything, which is the relevant fact. No external reviewer was
consulted, and the failure mode below is what self-review looks like when it works:
the errors were all found, but only by later rounds, and the *third* instance was
introduced by the fix for the second. Three of the three worst findings came from
executing a command rather than re-reading text. Re-reading found none of them.

The handoff author (a prior Opus 5 session) wrote §10 of its own handoff: *"I kept
substituting a cheap checkable proxy for the real question… Every single one was caught
by Sean looking at the thing, never by a gate of mine."* I read that paragraph, agreed
with it, and then inferred three line numbers from unnumbered output within the hour.

## Skills created or changed

No new skill. Three existing disciplines reinforced, all pre-existing and all already
written down — which is the point of this packet. The failure was never missing doctrine.

- **Rule 20 (sibling sweep)** — the rule exists, is in the constitution, and I still
  fixed one instance and left its sibling.
- **Validate-the-probe** — the memory exists, verbatim, from a prior session that made
  six false absence claims. I made three false *presence* claims this session.
- **LAW 5 (run what you hand over)** — stated in the very handoff I was continuing.
  I shipped two unrunnable commands.

## Mistakes I made

- Inferred three line numbers (`OptimizedSignupModal.tsx:1215-1216`,
  `leadCaptureRoutes.mjs:33`, `:163`) from unnumbered `head`/`sed` output instead of
  grepping the symbol. All three wrong. Caught round 2.
- Left one of those same wrong numbers in a second location after "fixing" it, two
  sections below my own written-up explanation of the error. Caught round 10.
- Documented a sweep to prevent that recurrence; the sweep failed when run verbatim,
  because the documenting paragraph contains the strings it searches for. Caught round 12.
  A skip-list patch failed identically before the structural fix held.
- Asserted the funnel "works end to end" before tracing it to the database. It happened
  to be true; I had not checked and could not have known. Caught round 2.
- Classified a surface ("competing/ambiguous") on a guess rather than evidence. It was
  playground-only. Caught round 3.
- Shipped a command with no `cd` that dies from the repo root — the repo's own documented
  gotcha #1. Caught round 6.
- Cited a branch-freshness count that my own commit invalidated as I wrote it. Caught
  round 7.

## Error → fix → repeat ledger

**Class: asserted a value I inferred rather than measured.**

| | |
|---|---|
| Recurrences this session | **3** (rounds 2, 10, 12) |
| Already written up before recurring? | **Yes** — instance 2 occurred after I wrote a full paragraph about instance 1, in the same document. Instance 3 was introduced *by the fix* for instance 2. |
| Resolutional correction attempted | "Be careful with line numbers" / "note it rather than quietly fix it" — **failed**, twice |
| Procedural correction that held | `grep -n <symbol>` for every citation; sweep the claim region structurally; print a control line proving the probe sees a positive |

**Class: believed a number over the thing it counted.** 3 false alarms (a grep filter
matching its own docs, a `head`-masked exit code, a citation count). Zero were real
defects. Each resolved in one call by printing the actual hit. Cost: three rounds.

The transferable finding is the asymmetry. Every correction I phrased as a *discipline*
was broken by me, in the same document, within ten rounds. Every correction I phrased as
a *command with a control* held. When a session produces a lesson, the durable artifact
is the command, not the resolution — and if the lesson cannot be written as something
runnable, it will not survive the next section of the same file.

## External-model calibration

**No external or paid model was consulted this session.** No Kimi, no GLM, no Village,
no Gemini. $0.00 spent. Recorded explicitly rather than omitted, because an absent
section reads as "nobody was consulted and that was obviously fine."

Calibration note for routing: this task — verifying a handoff's factual claims against a
live tree — was well served by a single model with tool access and a strict dry-loop, and
the 14 rounds cost only subscription time. But note *what* the loop caught: three
instances of one error class, the last introduced by the fix for the previous. A second
independent reader would likely have caught instance 2 immediately, since it was visible
on a plain read of the finished table. **Self-review is strong at executing checks and
weak at noticing that the check it just wrote is the wrong shape.** For any document
whose purpose is to correct another document, one external pass is probably worth its
cost — the prior packet in this corpus (2026-08-19) reached the same conclusion from the
opposite direction, and this is now two sessions agreeing.
