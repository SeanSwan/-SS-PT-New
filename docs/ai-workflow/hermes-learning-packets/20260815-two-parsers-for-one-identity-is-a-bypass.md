---
title: Two parsers for one identity is a bypass
packet: two-parsers-for-one-identity-is-a-bypass
date: 2026-08-15
originating_model: claude-opus-5
tier: fable-tier
tier_basis: authored by claude-opus-5, which is on the _schema.json tier_allowlist per Sean's
  designation 2026-08-10. Provenance is the MODEL, not the mode (Rule 71) — no fable-mode
  elevation is claimed or implied.
decision: A control that keys/buckets on an identity must resolve that identity exactly the way
  the handler it protects does. Two parsers for one id is a bypass. Fixed at the key generator
  rather than by middleware ordering, because ordering fragility is what caused the defect.
status: draft
privacy: IDs, roles and endpoint paths only. No client PII, no credentials, no secrets, no
  absolute user paths. Secret-scanned CLEAN before commit.
surface: security / rate limiting / test design
supersedes: none
extends: 20260814-a-control-that-passes-can-still-be-a-decoration.md
models_used:
  - model: claude-opus-5 (session main-seae22129)
    role: reviewer and fixer — the third eye in a mandated three-way review
    did: found the limiter bypass independently and was the only party to EXECUTE it (100 requests,
         0 throttled, 100 prekeys drained from one victim); verified the validationResult gap that
         Kimi could only rate conditionally; disproved one Kimi finding and one of its own
         hypotheses with positive controls; shipped fix + 3 regression tests + Rule 20 sibling sweep
    cost: subscription, $0 marginal
  - model: moonshotai/kimi-k3
    role: paid hostile reviewer (security remit, explicit --remit override)
    did: 13 findings. Headline correct AND correctly conditionalised ("Medium if the handler skips
         validationResult — this must be verified"). Also produced the arithmetic that falsified the
         limiter's own justifying comment, and the windowMs-mutation-survives test gap.
    cost: $0.3198
  - model: tencent/hy3
    role: paid hostile reviewer (security remit forced over its design default)
    did: found the same headline defect independently; contributed the string-vs-number req.user.id
         finding the other two missed; underestimated the bypass as "finite spellings"
    cost: $0.0133
  - model: claude-opus-5 (session main-s65632ef3)
    role: author of the work under review — deliberately excluded from reviewing it
    did: shipped the limiter and 8 executed authz suites; its own dry-loop returned CLEAN and
         missed this defect, which is the entire argument for excluding authors from their own review
    cost: subscription, $0 marginal
skills_touched:
  - id: rule-20 (sibling sweep)
    change: reinforced
    failure: the sweep was nearly skipped because the fix "was one line"; run properly it revealed
             the reviewer's own file-scoped grep had undercounted keyGenerators 1 vs 9
  - id: rule-30 (subagent/reviewer skepticism)
    change: validated at cost
    failure: one of 7 checked Kimi findings was a FABRICATED SOURCE QUOTE — a regex not present in
             the file. Relaying it unverified would have produced a pointless "fix" to correct code.
  - id: rule-73 (proof-before-done)
    change: reinforced
    failure: the author's CLEAN dry-loop was a true statement about a suite that could not see the bug
---

# Two parsers for one identity is a bypass

## The lesson

**When two pieces of code derive the same identity from the same input using different functions,
they will eventually disagree — and the security-relevant one is whichever is more lenient.**

A rate limiter on a live E2EE route bucketed on the **raw** `req.params.userId`. The handler it
protected resolved the target with `parseInt(x, 10)`. parseInt is lenient: `902`, `0902`, `+902`,
`902.0` and `902a` are all user 902. So the limiter had four buckets and the victim had one pool.

Measured: **100 requests, 0 × 429, 100 prekeys drained from a single target.** The limit was 20.

The generalisation is not about rate limiters. It is about any control that *keys, buckets,
caches, logs, or scopes* on an identity that something downstream *resolves* differently. Two
parsers for one identity is a bypass waiting for someone to notice.

## Why the tests could not see it

The suite that shipped with the limiter was good. It had a `CONTROL —` first test, it proved the
limiter sat before the handler (so a throttled attacker stops *consuming*, not just stops getting
200s), and it pinned the per-pair design against both collapse directions.

It used a canonical integer in every single test.

It varied the actor. It varied the target. It varied the count. It never varied **the spelling** —
the one input the key is actually derived from. A suite can be rigorous along every axis it
thought of and blind along the one that matters.

**The transferable form:** for any control, ask *what is the key computed from?* — then vary
exactly that, hostilely, and nothing else. If no test in the suite varies it, the suite does not
test the control; it tests the code path around the control.

## Why the author could not see it

The author's dry-loop returned `CLEAN×2 (rounds: 23)`. That was a **true statement** — 23 honest
rounds against a suite that could not see the defect. Confidence was calibrated to the
instrument, and the instrument was the blind spot.

This is the concrete argument for Sean's instruction that the next agent, not the author, runs
the hostile review. Not because the author was careless — the work was careful — but because a
builder's review reuses the builder's model of what could go wrong, and that model is exactly
what shipped the bug.

## Who did what

Three reviewers found the headline **independently**, which is the only reason it was trusted
quickly. But independence is not what settled it:

- **HY3** found it and called the bypass "finite spellings… not unlimited." Wrong: `902` followed
  by arbitrary trailing junk all parses to 902, so the set is unbounded.
- **Kimi** found it and rated it "Medium *if* the handler skips `validationResult`, Low if
  enforced — this must be verified." Exactly right, and exactly the correct thing to do with an
  unknown.
- **The reviewing agent** checked: `validationResult` appears **zero** times in that route file
  (positive control: three sibling route files do use it). So the validator is decorative and the
  Medium branch was live. Then it *executed* the attack rather than reasoning about it.

**Executed proof settled what two models' reasoning got approximately right and precisely wrong.**
A reviewer that says "verify this" is more valuable than one that guesses confidently; a reviewer
that *runs it* ends the argument.

## Skills created or changed

- **Rule 20 (sibling sweep)** — nearly skipped because the fix was one line. Run properly it
  immediately exposed that the reviewer's own earlier grep was file-scoped: **9 keyGenerators
  exist repo-wide, not 1.** The sweep then cleared all eight others (none reads `req.params`) and
  cleared `requireOwnershipOrTrainer`, which reads a raw param but compares `String()` on both
  sides — *stricter* than the handler, therefore fail-closed. That contrast is the durable part:
  **a strict comparison fails closed on a weird spelling; a bucket key silently becomes a
  different bucket.** Comparisons degrade safely. Keys do not.
- **Rule 30 (reviewer skepticism)** — earned its keep. 1 of 7 checked Kimi findings was a
  fabricated source quote.
- **Rule 73 (proof-before-done)** — the author's CLEAN was true and insufficient.

## Mistakes I made

- **File-scoped grep, repo-wide claim.** Checked `keyGenerator` in one file and was one sentence
  from writing "the only keyGenerator in the repo." There are nine. Caught only because the
  sibling sweep ran.
- **Repeated a handoff claim before verifying it.** Asserted the consult scripts default to a
  design remit because the handoff said so; verified first-hand only afterwards. It was true —
  and the same handoff contains a claim that is false. Trusting it happened to work.
- **Published a hypothesis ahead of its test.** Claimed express-rate-limit v7 would reject the raw
  `req.ip` via IPv6 validation; disproved it with a positive control minutes later.
- **Truncated my own evidence.** Backgrounded the full suite through `tail -25`, which cut the
  second failing filename out of the capture entirely. Same family as the pipe-swallows-exit-status
  error — *the shape of the capture must not decide what you are allowed to see.*
- **Wrote `echo "EXIT=$?"` after a pipe — one command after finishing the paragraph in this packet
  about that exact error.** It reported `EXIT=0` for a node process that had died with
  `MODULE_NOT_FOUND`. Knowing a lesson in prose and having it change your hands are different
  things.
- **Validated this packet against the wrong directory and nearly believed it.** The validator
  ignores a bare path argument and scans a fixed corpus dir; run from the main tree it never saw
  this file. It reported **27 packets — and my worktree also holds 27**, so the count looked
  right. Only a positive control (`ls` the two directories, then grep for this filename) exposed
  it. Run properly with `--file`, the packet failed **six** required-frontmatter checks, because I
  had modelled its header on an older packet that is itself one of the 16 currently failing
  migration. **A coincidence that makes a broken probe look correct is the most dangerous form of
  this error**, and it is the third distinct instance in one session.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| A probe reports absence and the probe itself is broken/mis-scoped | **5** (file-scoped keyGenerator grep; empty `req.user` grep on a shim; empty comparison grep on a 606-byte shim; IPv6 terms; **the validator scanning the wrong tree while the packet count coincidentally matched**) | **Yes — repeatedly, by two prior sessions** | Attaching a positive control to *every* probe, mechanically, before reading the result. All five were caught by the control, none by suspicion. The fifth is the worst kind: a coincidence made the broken probe's output look correct. |
| Output shape hides the truth (pipe eats exit status / tail eats the tail) | **2** (`tail -25` on the background run; `echo "EXIT=$?"` after a pipe — committed *one command after* writing the paragraph in this packet warning about it) | **Yes — the prior session did this 3×, and wrote a packet about it** | Not stopped, and now demonstrably not stopped *by writing about it either*. It recurred in a new form (truncation, not exit status) because the prior write-up named exit codes. **A lesson written narrowly only prevents the instance it names; a lesson written at all does not prevent the next instance ten minutes later.** The only correction with a chance of working is mechanical: redirect to a file, measure `$?` on the unpiped command, read the file afterwards. |
| Relaying an unverified claim as fact | 1 near-miss (handoff's remit claim) | Yes (Rule 30) | Verifying before publishing, not after. |

**The highest-signal row is the second one.** The prior session documented the pipe-swallows-status
error three times and wrote a durable packet on it. It still recurred here — because the write-up
named *exit codes* and the recurrence was *truncation*. The procedural correction that survives is
therefore not "check exit codes" but **"never let the capture shape decide the evidence"**, which
covers both. A lesson stated at the level of the instance does not generalise; only the procedural
form does.

## External-model calibration

| Model | Cost | Findings checked | Real | Disproven | Verdict |
|---|---|---|---|---|---|
| Kimi K3 | $0.3198 | 7 | 6 | 1 | Best analysis. Correctly flagged its own uncertainty instead of guessing. Watch for fabricated source quotes. |
| Tencent HY3 | $0.0133 | 2 | 2 | 0 | **24× cheaper and still found the headline.** Weaker on severity calibration. Outstanding value per dollar. |

**Routing implication:** HY3 is now the first paid reviewer to try for security work on a diff, with
Kimi reserved for cases needing depth of analysis rather than a second pair of eyes. Both scripts
default to a **design** remit (`consult-hy3-design.mjs:93` literally opens "Give only UI/UX and
interaction suggestions"); both return pure security analysis when handed an explicit `--remit`,
which **replaces** rather than appends (`options.remit || defaultRemit`, line 120 of each). Firing
either without a remit spends real money on a UI critique of an authorization change.

Total spend $0.333 against a $3 cap, approved by Sean before either call.
