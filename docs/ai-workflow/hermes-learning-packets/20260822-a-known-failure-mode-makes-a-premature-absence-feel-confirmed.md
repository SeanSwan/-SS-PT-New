---
title: "A known failure mode makes a premature absence feel confirmed"
originating_model: "claude-opus-5"
tier_basis: "Sean designated claude-opus-5 Fable-tier 2026-08-10; this session ran as Opus 5 and authored every verification, fix and correction in this packet."
privacy: "IDs and roles only. No client names, no PII, no credentials, no key values. Secret-scanned clean before commit."
date: 2026-08-22
surface: "agent-behaviour / review tooling / trainer dashboard audit"
decision: "An absent artifact from an in-flight async producer is a race, not a failure. Prior knowledge of a plausible failure mode is what converts a premature absence-claim into false certainty — so a matching known failure mode must RAISE the evidence bar, not lower it."
status: shipped
supersedes: none
models_used:
  - model: "claude-opus-5"
    role: "orchestrator, code verifier, final synthesiser"
    did: "verified every audit claim against source; made the false-absence claim documented below; built a guard on top of that wrong claim and had to correct both the guard's default and its comment"
    cost: "subscription"
  - model: "x-ai/grok-4.6"
    role: "hostile review seat"
    did: "sole seat to spot that the plan's authorization gate would enforce against a contract the same document called broken — became the session's crux finding once verified in code"
    cost: "~$0.05"
  - model: "moonshotai/kimi-k3"
    role: "hostile review seat"
    did: "named the four correct probes; contributed the skip-proof router-factory mechanism, adopted"
    cost: "~$0.06"
  - model: "openai/gpt-5.6-sol-pro"
    role: "hostile review seat"
    did: "one unique insight (house-rule PII outranks the reported P0s); the control it feared was missing already existed"
    cost: "~$0.41"
  - model: "deepseek/deepseek-v4-pro"
    role: "hostile review seat"
    did: "consent-gap SQL precondition, adopted as gate zero"
    cost: "~$0.01"
  - model: "deepseek/deepseek-v4-flash"
    role: "hostile review seat"
    did: "returned a full review after 813.5s — the seat this packet's false-absence claim was about"
    cost: "~$0.00"
  - model: "glm-5.3"
    role: "hostile review seat"
    did: "profile the assignment table before building enforcement on it; adopted"
    cost: "subscription"
  - model: "qwen3.8 (local)"
    role: "hostile review seat"
    did: "shadow mode — enforce and log the would-deny without denying; adopted into the build order"
    cost: "$0 local"
  - model: "anthropic/claude-fable-5"
    role: "final decider"
    did: "overturned the insider-threat severity downgrade that every other seat and I had accepted, on shared-gym-workstation grounds; output silently truncated at the token ceiling"
    cost: "~$0.96"
skills_touched:
  - id: "feedback_validate_probe_before_absence_claim"
    change: "amended"
    motivating_failure: "That memory covers a MISCONFIGURED instrument (wrong cwd, missing .env). It does not cover an instrument that is simply NOT DONE YET. I read the existing lesson as covered and made the uncovered version of the same error 24 hours later."
  - id: "rule-51 (confidence tags)"
    change: "reinforced"
    motivating_failure: "I stated an unverified inference as flat fact in a user-facing report — no [LIKELY] tag — because a known failure mode made it feel verified."
  - id: "rule-73 / proof-before-done"
    change: "reinforced"
    motivating_failure: "I asserted a component's outcome without the producing process having exited, which is the definition of an unproven claim."
  - id: "scripts/consult-panel.mjs"
    change: "amended"
    motivating_failure: "Promise.all over all seats means one genuinely stuck seat prevents INDEX.md — the artifact recording panel coverage truth — from ever being written. Added a per-seat wall cap, calibrated ABOVE the slowest measured healthy seat."
---

# A known failure mode makes a premature absence feel confirmed

## The lesson

Yesterday's packet, `20260821-validate-the-instrument-before-reporting-absence.md`,
established: a tool reporting something missing is a claim about the tool's environment,
not about the world. I read it. I had it in context. **I made the same class of error
again the next day, in a form that packet does not cover.**

Seven review seats were running in parallel. Six reply files appeared on disk. The
seventh did not. I reported to Sean, as fact:

> "DeepSeek V4 Flash never returned — the known reasoning-eats-output-budget failure.
> Panel is therefore **incomplete**, not full."

The seat returned a complete, high-quality review **813.5 seconds** in. The panel was
complete. Every part of my claim was wrong.

The existing packet covers a **misconfigured** instrument. This is a different failure:
the instrument was fine and simply **had not finished**. An absent artifact from an
in-flight asynchronous producer is a **race condition**, not a result.

## Why it felt verified — the actual mechanism

I would not have made this claim about an unfamiliar seat. I made it because I had
*specific documented prior knowledge*: the transport's own header comment records that
DeepSeek V4 Flash once "burned all 16k reasoning and emitted NOTHING ($0.102 for an
empty reply)."

So the absence matched a real, previously-observed, written-down failure mode. Pattern
completion did the rest. **The prior knowledge is exactly what made the wrong conclusion
feel like a confirmed one.** Without it I would have written "still running."

That inverts the usual instinct. A matching known failure mode feels like corroboration.
It is not — it is a *prior*, and it must **raise** the evidence bar rather than lower it,
because it is the condition under which a premature conclusion is most persuasive to
the person making it.

## The compounding cost

The wrong claim did not stay contained. I built on it:

1. I declared a defect ("one hung seat blocks the INDEX forever") from the absence.
2. I wrote a per-seat wall cap to fix that defect, defaulting to **900s**.
3. I wrote a code comment asserting the seat "streamed reasoning deltas indefinitely."

The seat finished at 813.5s. My 900s default would have killed a healthy seat with 86
seconds to spare, and shipped a comment permanently documenting an event that never
happened — a `[VERIFIED]`-looking artifact built entirely on an unverified inference.
Only re-checking caught it. I raised the default to 1800s, **calibrated above the
slowest seat I have actually measured**, and rewrote the comment to carry the real
timings.

The underlying guard is still correct and shipped: `Promise.all` over all seats does mean
a genuinely stuck child prevents the coverage-truth index from ever being written. **A
real defect found via a false premise is still a real defect — but its parameters must be
re-derived from measurement, because the premise that motivated it cannot calibrate it.**

## The bitter symmetry

I spent this entire session criticising an external audit for reasoning-from-absence —
"the check I expected was not in the function I read, therefore it does not exist." I
wrote that criticism into a verification document, disproved five such inferences against
source, and then committed the identical error about my own tooling within the same hour.

**Recognising a bias in someone else's work provides no protection against it in your
own.** If anything it provides false cover: having just audited for it, I felt inoculated.

## Error → fix → repeat ledger

| Error class | Times this session | Already written up before recurring? | What actually stopped it |
|---|---|---|---|
| Claiming absence before the producer exited | 1 | **Yes** — packet 2026-08-21, in context, one day old | Nothing procedural yet. This packet adds the control below. |
| Shell-interpolating code with nested quotes/backticks | **2** | No | After corrupting a committed file with `node -e`, switched to the Edit tool. Rule: any multi-line edit containing quotes, backticks or `${}` uses Edit — never shell interpolation. |
| Announcing a finding before reading the code | 1 | Yes (rule 30, rule 73) | Caught pre-report by reading the file. The flagged route was correctly clamped. |
| Designing a multi-part deliverable without checking the output ceiling | 1 | No | Cost ~$0.96 for a reply truncated at exactly 16000 tokens that read as complete. |

The first row is the one that matters. **A lesson that was documented and then repeated
proves the write-up was not a fix.** Yesterday's packet stated a principle. Principles do
not fire at the moment of error; procedures do.

## The control (procedural, not resolutional)

Not "be more careful about absence." That is what failed.

**Before reporting any component's outcome, confirm the producing process has exited.**
For a background task: read its exit status. For a subprocess fleet: read the completion
artifact the orchestrator writes on exit — here, `INDEX.md`, which is precisely the file
that exists to record coverage truth. I had that artifact available as the definitive
check and reported without consulting it, inferring from directory contents instead.

Operationally:
- Missing artifact + producer still running ⇒ **"still running."** Never a failure.
- Missing artifact + producer exited ⇒ now, and only now, diagnose.
- Absence matching a known failure mode ⇒ **treat as the highest-risk case for premature conclusion**, and require the exit check before speaking.

And the reporting rule that would have caught it regardless: **do not state a component's
outcome without either its exit code or its completion artifact.** "Six of seven have
landed; the seventh is still running" was both true and available at zero cost. It is
also more useful to Sean than a confident wrong diagnosis.

## Related

- [[20260821-validate-the-instrument-before-reporting-absence]] — the misconfigured-instrument half. This packet is the not-finished-yet half.
- [[a-written-trap-is-not-a-control]] — same shape: writing the lesson down did not prevent the repeat.
- [[a-green-suite-is-evidence-only-about-what-you-thought-to-check]] — absence of a signal is not evidence of its absence.
