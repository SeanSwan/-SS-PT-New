---
title: The instrument is part of the system under test — a tool that sanitizes, measures, or reports can manufacture the finding it reports
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 is Fable-tier and may write the durable corpus
reviewed_by: HY3 external implementation review (5 findings, 3 real / 1 false / 1 non-defect) + 6 local hostile rounds from distinct vantages; Kimi K3 attempted twice and returned no content
date: 2026-08-14
decision: Before believing any finding, verify what the instrument actually presented — the sanitized packet, the probe's exit path, the ledger's own writers. Three separate false or missed conclusions this session all trace to trusting an instrument's output about a system the instrument was silently altering.
status: shipped
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no credential values, no absolute paths
models_used:
  - model: claude-opus-5
    role: auditor, hostile reviewer, adjudicator, final synthesis
    did: confirmed and re-scoped the CI outage (found it has NEVER been green, not "dead 2 days"); built and ran the review packet; found 4 defects both paid reviewers missed (host-dependent escape predicate, truncation-recorded-as-ok, packet-corrupting redactor, test-suite ledger forgery); verified and re-severitised every HY3 finding; disproved one HY3 CRITICAL
    cost: subscription
  - model: tencent/hy3
    role: external hostile implementation reviewer
    did: 3 real findings (collapseHome cross-separator leak, trim() misses zero-width chars, a literal-vs-literal bucket assertion), 1 false CRITICAL caused by its own script's redactor, 1 non-defect. Correctly refused the design remit it was handed, citing the packet's override
    cost: $0.0146 (264.9s, effort high, finish_reason stop) + ~$0.03 on a first attempt that truncated with no content
  - model: moonshotai/kimi-k3
    role: intended second independent reviewer
    did: NOTHING USABLE, but the two failures were DIFFERENT and must not be described as one streak. Attempt 1 (handoff's verbatim recipe, effort high, design remit) returned HTTP 200 with finish_reason=error, 3085 completion tokens billed, zero content — recorded error/EMPTY_RESPONSE with cost retained. Attempt 2 (corrected implementation remit, effort medium, raised max-tokens) never returned at all, aborting at the provider's 600s timeout — recorded error/TRANSPORT, costUsd null
    cost: $0.1664 recorded, 0 usable reviews
skills_touched:
  - name: rule-73 / proof-before-done
    change: exercised; held
    why: nothing was claimed fixed because nothing was fixed. All 8 findings shipped as OPEN with probe evidence, which is the honest state. The rule's value showed up as a brake on the phrase "the redaction is platform-independent" — a claim the module's own header makes and the code does not support.
  - name: feedback_validate_probe_before_absence_claim
    change: reinforced, and extended with a new failure shape
    why: the existing memory covers "validate the instrument before believing a NEGATIVE". This session added a second shape — a probe whose ERROR exit code equals its FINDING exit code. My POSIX probe crashed on a module-loader error and exited 1, the same code it uses for "leak confirmed". The extension: a probe's failure path and its finding path must be distinguishable without reading stdout.
  - name: rule-30 / subagent-and-external-model skepticism
    change: extended from "verify the finding" to "verify what the reviewer was SHOWN"
    why: HY3's false CRITICAL was not a hallucination. It reported the packet faithfully; the packet had been corrupted by the sending script. Skepticism aimed only at the model would have concluded "HY3 hallucinates" and discarded a real pipeline defect.
---

# The instrument is part of the system under test

## The one-line lesson

**When a tool sanitizes, measures, or reports on a system, that tool is inside the system.**
Three independent wrong-or-missed conclusions this session came from trusting an instrument's
output about something the instrument itself was quietly changing.

## The three instances, which are the same bug wearing three costumes

**1. The redactor manufactured a CRITICAL finding.**
The HY3 consult script sanitizes a packet before egress. Its regexes are tuned for prose: a
phone pattern matching any 10 consecutive digits, and `Bearer <token>`. Run against a *code*
diff they rewrote two security-test fixtures from `'Bearer abcdef0123456789 invalid_token'` to
`'<REDACTED_KEY><REDACTED_PHONE> invalid_token'`, and chewed a git blob SHA into
`index 000<REDACTED_PHONE>2e3ba`. HY3 then filed a CRITICAL: those assertions check for a string
that isn't in the fixture, so they can never fail. **In the packet HY3 received, that was true.**
In the repo it is false — the tests are sound and load-bearing.

The finding was wrong. The reviewer was not. Had I "verified" by re-reading the repo and
declaring HY3 unreliable, I would have discarded a systematic false-finding generator that has
been running on every review through that path.

**2. The measuring tool wrote into the thing it measures.**
The whole S0 slice exists to make consult spend auditable via an append-only receipt ledger.
Its own test suite injects **4 fabricated audit records** into that ledger on every run:
`consult.test.mjs` spawns the real wrapper with `cwd: ROOT` (it needs the real scripts), and the
wrapper keys receipts off `process.cwd()`. Bisected: full suite +4, the receipt suite alone +0.
Append-only by design, so it accumulates, and the forged rows name providers that were never
called.

**3. The probe's crash looked exactly like its finding.**
My POSIX simulation exited `1` on a module-loader error — the identical exit code it uses for
"leak confirmed". One glance at the exit status and I'd have recorded a confirmed defect from a
program that never ran a single assertion.

## What generalises

- **Verify the artifact that egressed, not the artifact you built.** For any external review,
  the question is not "what does the repo say" but "what did the reviewer actually receive". If a
  transform sits between them, read the transformed thing.
- **A sanitizer tuned for prose is a corruptor when pointed at code.** Hashes, fixtures, IDs,
  timestamps and diff metadata are dense in exactly the character classes secret-regexes match.
  Redaction quality is packet-type-dependent, and nothing currently declares the packet type.
- **A test that runs the real entry point inherits the real side effects.** Using the production
  cwd to get the production scripts also gets the production write paths.
- **Give a probe distinct exit codes for "I failed" and "I found it".** Or make it print a
  verdict line that cannot be produced without running the assertions.

## Who did what

- **Opus 5 (me)** — everything load-bearing. Found the four defects the paid reviewers missed,
  including both of the two most serious. Corrected the CI scope from the handoff's "dead two
  days" to "never green in 3,673 runs" by validating the API filter before trusting a zero.
  Disproved HY3's CRITICAL and, in disproving it, found the redactor defect. **Also made the
  session's worst error** (below) and needed a Stop hook to catch it.
- **HY3** — genuinely useful at ~$0.015. Three real findings, and it independently declined a
  design remit that conflicted with the packet, for the second session running. Its severity
  calibration is unreliable: it rated a latent primitive defect CRITICAL on a reachability claim
  that is false (the caller builds paths with `join()`, so separators always agree). Its
  supporting details were wrong twice — right that `.trim()` misses zero-width characters, wrong
  that it misses the BOM. **Direction reliable; specifics and severity are not.**
- **Kimi K3** — nothing, twice, for $0.1664. Now 5 consecutive failures on this lane across two
  sessions while HY3 handled the same packet fine. Its historical record elsewhere is strong;
  this lane specifically should stop routing to it until it produces one usable review.
- **The handoff author (prior Opus 5 session)** — wrote an excellent document whose *commands*
  were wrong in two places: an HY3 token budget below the script's own default (guaranteed
  truncation) and a Kimi invocation using a hardcoded design remit against a packet that forbids
  design findings. It described its recipe as "dry-run verified", which verified the packet
  build, not the calls. **A verified sub-step does not verify the step.**

## Skills created or changed

None created. Three existing disciplines were exercised and two need amendment — see
`skills_touched` frontmatter. The substantive change is to rule-30: skepticism must extend from
"is the finding true of the code" to "was the reviewer shown the code", because those diverge
whenever a transform sits in the path.

## Mistakes I made

- **I found a real defect, half-checked it, and nearly dropped it.** My probe showed +4 receipts
  written into the live ledger during a test run. I opened `receiptV1.test.mjs`, saw it used
  `tmpdir()`, and moved on when a background job returned — leaving a flat contradiction
  unresolved and unmentioned. Only the Stop hook sent me back. Bisecting took **one command** and
  produced one of the two strongest findings of the session. *A probe result that contradicts
  your follow-up read is a lead, not noise.*
- **I read the "`cmd | head` masks the exit code" warning in the handoff and then did it twice.**
  Both consults were piped through `| tail`, so the harness reported the pipe's exit 0 while the
  scripts exited 1. The first time cost nothing because I read stdout; the second time I caught
  it only because I was already suspicious. **This is a documented lesson that did not change my
  behaviour — the same meta-failure the 2026-08-14 sibling packet is about.** The fix that will
  hold is mechanical: redirect to a log, check `$?` directly, never pipe a command whose exit
  code matters.
- **I ran both handoff recipes verbatim before reading the scripts they invoke.** That burned two
  failed paid calls (~$0.19). Rule 18 (existing-pattern-first: inspect the real API before
  using it) applies to *documented commands*, not just library calls. A recipe in a handoff is a
  claim about a script's interface, and claims get verified.
- **I wrote a probe whose crash exit code was identical to its finding exit code**, then read
  that exit code. Caught by looking at stdout, not by design.
- **I nearly accepted an external CRITICAL at its stated severity.** HY3's `collapseHome`
  finding is real as a primitive but not reachable through the caller it named. Existence and
  reachability are different questions and only the second sets severity.
- **I began writing up a HIGH finding from a stack trace and it was false.** A Kimi call aborted
  at the 600s provider timeout and died with an uncaught `DOMException` and a raw Node stack
  trace. I started drafting "the lane crashes on timeout without recording a receipt" — which
  would have been the slice's founding defect recurring. The ledger disproved it in one command:
  the receipt exists (`error / TRANSPORT`), because `errorCodeOf` classes any unrecognised throw
  as TRANSPORT *specifically so* an unexpected error still gets recorded, and the rethrow is
  deliberate. **A loud stack trace is the runtime's presentation, not the system's state** — the
  fourth instance of this packet's own thesis, and the one that nearly bit me. Checking the
  ledger cost one command; publishing that finding would have cost a fix to working code.
- **I reported Kimi's second failure as "no content either" before its process had exited.** It
  had not returned empty — it had not returned at all. I inferred a mode from an absent output
  file rather than waiting for the exit path. Two failures with different causes got flattened
  into one streak, which is exactly the kind of imprecision that produces a wrong routing
  decision later.

## Error → fix → repeat ledger

| Error class | Times this session | Already written up before recurring? | What actually stopped it |
|---|---|---|---|
| Exit code of a piped command read as the command's own | **2** | **YES** — in the handoff I had just read, and in prior packets | Redirect to a log file; check `$?` directly. Not "be careful" — the pipe has to go. |
| Instrument alters or misrepresents the system it reports on (redactor / test-writes-ledger / probe exit code / stack trace read as unhandled) | **4** (four distinct instruments) | No — this is the new class | Verify the egressed artifact, the tool's write paths, and the recorded state — not the tool's presentation |
| Failure mode inferred before the process exited | 1 | No | Wait for the exit path; an absent output file names no cause |
| Contradictory probe result abandoned mid-thread | 1 | No | Stop hook. Needs a procedural form: an unresolved contradiction is a blocker, not a footnote |
| Documented recipe trusted without reading the script | 1 (two calls) | Partially — Rule 18 covers libraries, not docs | Extend Rule 18 explicitly to documented commands |
| External finding accepted at stated severity | 1 (caught) | YES — prior packet says "take the finding, write the fix yourself" | Verify reachability separately from existence |

**The highest-signal row is the first: a lesson I had read minutes earlier, in the very document
driving the task, and repeated twice anyway.** That is the second session in a row to produce
this row. It is now conclusive that this class does not respond to being written down. It needs
a gate or a habit that fires *before* the risky action, exactly as the sibling packet argued.

## External-model calibration

| Model | Calls | Usable | Cost | Findings real / false | Verdict |
|---|---|---|---|---|---|
| `tencent/hy3` | 2 | 1 | ~$0.045 | 3 real, 1 false, 1 non-defect | **Keep.** Best cost-per-usable-review on this lane by ~10×. Trust direction, verify specifics and severity. |
| `moonshotai/kimi-k3` | 2 | 0 | $0.1664 | — | **Suspend on this lane.** 5 consecutive failures across 2 sessions. Revisit only after a config change, not another blind retry. |

The false HY3 finding was **not** a model quality failure — it was a pipeline failure. Counting
it against HY3 would have produced the wrong routing decision. **Attribute the failure to the
component that caused it, or the calibration table teaches the wrong lesson.**

## Sean owes

- **GitHub Actions billing/settings.** CI has never produced a green run in 3,673 attempts;
  diagnosis needs account access no agent has.
- **Rotate the Linear token**, then fully restart Claude Code. Verified live: configured at USER
  scope, HTTP 401, zero tools registered.
