---
title: "Six-seat panel synthesis — The Deterministic Turn"
date: 2026-08-25
author: Claude Opus 5 (fold), six-seat panel (findings)
status: open
decision: "Rule 68 falls unanimously. Rule 15 falls as written. grill-me survives bounded. The values corpus ships EMPTY."
supersedes: none
expires_if: "Sean arbitrates Rules 15/64/68 — then this becomes the record, not the proposal"
---

# Six-seat panel synthesis

**Seats:** GLM 5.3, Grok 4.6, Ox Alpha, DeepSeek V4 Pro, Kimi K3, HY3 — **6/6 returned
cleanly.** Total spend **~$0.275** against an approved $1.15 ceiling.

**Identity verified:** `Served:` headers confirmed on all three shared-transport seats
(`deepseek/deepseek-v4-pro`, `x-ai/grok-4.6`, `stealth/ox-alpha`) — the SWA-196 attribution
fix is working. GLM/HY3/Kimi use separate scripts that emit no `Served:` line; their
reviewer declarations are self-reported, which is weaker evidence and is recorded as such.

**One process note against myself:** I reported GLM as "stalled at 0 chars" mid-run. It was
not stalled — it was buffering 15,495 reasoning tokens before streaming. I hedged the claim
at the time ("watching for a failure, not assuming a verdict"), which was correct, but the
observation itself was a misread of the instrument.

---

## 1. Unanimous verdicts (6/6)

### Rule 68 — "a plan so complete a worker-bot executes it verbatim with ZERO further questions"

**FALLS. Completely. Every seat.** Three independent arguments, none of which needed Bob's
authority:

- **Completeness is asserted, never achieved** (Kimi). A plan complete enough to execute
  with zero questions must be written by someone who has already written the code in their
  head — but the planner cannot see code that does not exist yet.
- **"ZERO further questions" is the tell** (Kimi, GLM). It forbids the feedback loop, which
  is the only known correction mechanism for plan-reality divergence. A plan that is 95%
  complete produces a worker 100% committed, and the 5% gap is exactly where disasters
  live — with surfacing them banned by rule.
- **It manufactures the stale-artifact problem as a side effect** (Kimi, Ox). Persisted
  verbatim-execution plans are the artifact class this repo measurably cannot drain.

### Rule 15 — "NO code without a plan"

**FALLS AS WRITTEN; the kernel survives. Every seat.** The indefensible part is the
universal quantifier: a rule that prices a typo fix and a billing migration identically
prices all risk at maximum, which is the same as pricing nothing (GLM).

**Two corrections to my proposed fix, both of which I accept:**

- **It is a rewrite, not a defense** (Kimi). I framed this as "the rule survives as
  proportionality." That was too generous to my own position. The rule as written falls.
- **"Proportionality" is not checkable — use an allowlist** (Grok, GLM). GLM's cut is the
  sharpest thing in the panel: *"Proportionality cannot be checked by a drift probe; it is
  a value wearing a rule number. Keeping it as numbered prose violates the packet's own
  doctrine. Renaming is not resolution."* An **explicit allowlist of surfaces that require
  the full treatment** (money, auth, data migration, PII, outward-facing) is mechanical. A
  vibe about reversibility is not.

### Rule 64 — grill-me

**SURVIVES, but splits — and not for the reason I gave.**

- **The right defense** (Kimi): grill-me is an **elicitation protocol**, not a values
  extractor. Waterfall fails by committing early to a *solution*; grill-me commits to the
  *problem definition*, which is what small-slice work needs to slice correctly.
- **"Exhaustive" falls** (GLM) — an exhaustive interview about a reversible slice is the
  waterfall tax relocated to the requirements stage. Same proportionality test as Rule 15.
- **"Durable brainstorm doc" falls** (GLM, Kimi, HY3) — Bob's waterfall artifact and Theo's
  stale-file generator in one.
- **The failure mode to watch** (Grok): if grill-me extracts implementation — "use a
  queue," "split this module" — it becomes *"Rule 68 with Socratic makeup."*

---

## 2. Where the panel took apart MY resolution

I proposed *"keep the interview, kill the blueprint, keep the checks,"* with (c) — the
expensive model writes the **acceptance check, not the plan** — as the centerpiece. The
panel judged (c) the cleverest and most fragile piece. Three breaks, converged:

1. **A wrong check is worse than a wrong plan** (Kimi, DeepSeek). A wrong plan gets
   *deviated from* — visibly, recoverably. A wrong check gets *satisfied*. The worker
   optimizes the check, not the intent: Goodhart, mechanically enforced. My own selling
   point — "fails loudly instead of rotting silently" — cuts both ways, because it also
   **passes loudly while being wrong silently.**
2. **Whole classes of work have no check writable in advance** (both): taste work,
   exploratory debugging, integration work where the check needs the system to exist. For
   these, (c) degrades to a vacuous check — and a vacuous check that *passes* is a
   compliance illusion, strictly worse than no check.
3. **Who reviews the check?** (Kimi). Expensive model writes it, cheap model satisfies it,
   Sean audits… the check. Then Sean is reviewing specs again under a new name. *"The
   waterfall didn't die; it changed file extension."*

**Accepted scope limit:** acceptance-check-first applies to **correctness-verifiable work
only**. Outside that class it is not a resolution and must not pretend to be.

**GLM's alternative, which I think is better than my inversion:** *plans are runtime
artifacts, not repo artifacts.* A plan whose TTL is one pipeline run — written, handed to
the worker in-context, never committed — keeps the legitimate function (cross-context
handoff) without the rot. **Rule 68's discrete error is not "Fable writes a plan"; it is
"the plan is persisted and worshipped."**

---

## 3. The values corpus — unanimous against the version I shipped

**Verdict: "artifact #1,608 with better branding"** unless structural conditions hold.

- **Nothing in the design causes a read** (Ox). "Tier-7 compounds" is a theory about
  *writes*. Promotion-only entry, no eviction, no read-enforcement, no staleness probe.
- **It was agent-seeded** (Grok): *do not start a values corpus until the front of one file
  is under ~8KB and Sean has personally acked every line.*
- **The rot problem migrates rather than dying** (GLM) — from brainstorm docs to the corpus.

**Folded (this commit):** the corpus now ships **EMPTY**, with the 20 inferred values
demoted to a clearly-labelled candidate queue carrying no authority; a hard **~2 KB / ~20
entry cap by token budget**; mandatory **eviction with demote-not-delete** (Rule 34);
**ack-date + expiry** because values expire too; a requirement that every entry name a
decision it would have changed; and the **unresolved read-mechanism condition stated as a
prerequisite**, not a follow-up.

---

## 4. What the panel says to do NEXT — and it is not what the handoff proposed

The handoff's Slice C proposed building CRAP scoring, mutation testing, and a dependency
checker. **Grok's ranking rejects that ordering outright:**

> Do not build CRAP/mutants/dep-checkers next. **Drain, cull skills, stop emission
> requirements, gate PII/money/auth/payload.** Everything else is the OS generating OS.

That last phrase is the finding: an operating system whose main output is more operating
system. The measured backlog — 491 pending memos, 308 stale handoffs, 105 skills, 84 rules
— is the evidence.

**GLM's cheap decisive measurement, not yet run:** grep the 180 session transcripts for
post-implementation re-reads or updates of persisted plans. If the number is near zero,
Bob's rot claim is confirmed *locally* and the arbitration is short. One day of work to
settle the argument with our own data instead of an outside opinion.

---

## 5. The dissent I most deserved

Kimi, Q9: **"Sean decides" is doing political work.** Parking the spec-conflict on Sean's
desk reads as deference but functions as **risk transfer** — the packet's answer was fully
formed ("keep the interview, kill the blueprint, keep the checks" is not a neutral framing
of options) while disclaiming the decision. *"The packet has already decided; 'Sean
arbitrates' is the ceremony hook of governance — paperwork completeness, not correctness."*

This is accurate. I presented a finished conclusion dressed as an open question. Recorded
rather than smoothed over.

---

## 6. Still Sean's call (genuinely, with the argument now on the record)

1. **Rules 15 / 64 / 68.** The panel is unanimous that 68 falls and 15 falls as written.
   What replaces them — allowlist scoping, runtime-only plans, or something else — changes
   how Sean works day to day.
2. **Whether to build the read-mechanism** that would make a values corpus real, or to drop
   the corpus idea entirely.
3. **Sequencing:** the panel says drain-and-cull before new instruments. The handoff said
   build instruments. These are incompatible.
