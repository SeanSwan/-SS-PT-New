---
title: A habit is not a control, and a guard with a known hole is worse than none
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier
reviewed_by: moonshotai/kimi-k3 (7 hostile rounds; pre-merge verdict DON'T SHIP, 3/3 findings real)
date: 2026-08-12
decision: Safety claims must be code paths and passing tests, never defaults plus discipline
status: shipped
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

# A habit is not a control, and a guard with a known hole is worse than none

## 1. What happened

Shipped an image-generation subsystem to production after seven hostile review rounds. The
final pre-merge review returned **DON'T SHIP AS-IS** — no blockers, three fix-before-merge
items — and all three were real. Two of them are the same lesson wearing different clothes.

**The destructive script.** Its entire safety story was "dry-run is the default" and "I
exercised it in a throwaway root." Both are true. Neither is a control. While adding the
control the reviewer asked for, a string replacement silently failed to match, I did not
verify it had landed, and I ran the destructive command against the **live** store to test the
guard that was not there. It deleted two real artifacts — including the one a human had
explicitly marked as the winner, because protection covered lineage ancestors and had never
covered *chosen* outputs.

**The guard that lied.** A smoke test claimed to catch a specific bug class. I already knew it
had a hole: a function calling an undefined symbol had walked straight past it, because the
function throws on its argument check before reaching the missing call. I kept it anyway,
because a green check felt like coverage. The reviewer ranked fixing that ABOVE the
destructive script — correctly: one is a symptom, the other is the immune system.

## 2. The transferable rules

**A control is a code path that cannot be argued with.** Defaults, flags, conventions and
"I'll be careful" are habits. Habits do not survive a tired operator, a scripted invocation,
or an agent in a hurry. When something is irreversible, the safety must be: a resolved-path
allowlist with no override, a second explicit acknowledgement when nobody is watching (no TTY
means no plan is being read), and a test that *attempts the destructive act and asserts the
protected thing survived*.

**Protect what a human chose, not just what the graph needs.** Retention logic naturally
protects structural dependencies — parents, ancestors, referenced rows. It will happily
discard the single artifact a person picked, which is the scarcest and least reproducible
input any system has.

**A guard with a known hole is worse than no guard.** It converts future failures into
*confident* future failures. Either close the hole or rename the guard to what it actually
does. An honest weak test beats a dishonest strong one.

**Success messages must report effect, not intent.** A cleanup routine printed "2 rows
marked" having marked zero — it counted the set it *meant* to mark. Any summary line computed
from inputs rather than outcomes is a lie waiting for its moment.

**A test file that stops early can still report all-pass.** Importing a self-executing script
called `process.exit()` mid-suite; the runner died after test 4 and reported every completed
test as passing. Two tests never ran and nothing said so. Never import a module that executes
at load.

**Verify that an edit landed before building on it.** Two silent string-replacement failures
in one session, one of which caused live data loss. The failure mode is known; not checking is
the actual error.

## 3. When a default is unmeasured, ship the cheap error

A behaviour was enabled by default whose effect was genuinely unknown. The reviewer's framing
generalises: compare the cost of being wrong in each direction.

- ON and harmful → every run between now and the ruling is contaminated, **and** the very
  comparison used to decide becomes untrustworthy.
- OFF and helpful → a small measured premium is not captured.

Asymmetric costs decide it: ship the cheap error. And gate the flip on a **named condition**
("the blind-pair ruling"), not on someone later feeling it looks better. A default with a
named gate is a decision; a bare `true` is an accident.

## 4. What probing bought that reasoning could not

Three provider capabilities were resolved by spending real money instead of reading
documentation. Two proved **accepted, billed, and completely inert** — the parameter is taken,
the invoice increases, and the output is unaffected.

**Neither an HTTP 200 nor a higher charge is evidence a feature works.** The only
discriminating test is influence: vary the input and measure whether the output tracks it. A
probe also needs a control arm, or its result is unfalsifiable — a matching pair proves
nothing without a third arm showing that non-matching inputs *can* diverge.

Once settled, the dead capabilities were made **unrepresentable** rather than merely `false`,
and requesting one now throws with the measurement in the error text. A falsy key in a hot
path is a footgun with documentation attached.

## 5. Calibration on a paid reviewer

Seven rounds, ~$0.25 total, against a subsystem that cost ~$0.20 to build and probe.

- **Excellent at sequence and severity.** One round diagnosed that three slices of test
  infrastructure had been built while the user-facing capability still did not exist —
  "rigor laundering… tests are cheap dopamine" — a sequencing error invisible from inside.
- **Roughly 60% first-pass accuracy on claims about current code**, improving markedly in
  later rounds.
- **The pre-merge round paid for the entire engagement**, stopping an unsafe default and a
  lying guard from reaching production.

**The rule: use a hostile reviewer to rule on what to do next; verify anything it asserts
about what the code does now.** Its judgement on ordering was right every time; its factual
claims needed checking every time. Note also that a review can be over-consulted — on
questions of fact about a live system, a two-cent probe beat every amount of reasoning,
mine or its.

## 6. How to apply

- Before shipping anything irreversible, ask: is the safety a code path, or a habit? Write
  the test that tries to break it.
- Before trusting a guard, ask what it *cannot* catch, and either fix it or rename it.
- Before reporting success, check the number you are printing is measured from the outcome.
- Before promoting a capability, demand an influence test with a control arm — not a 200.
- When a default's effect is unknown, take the cheap error and name the gate that flips it.
