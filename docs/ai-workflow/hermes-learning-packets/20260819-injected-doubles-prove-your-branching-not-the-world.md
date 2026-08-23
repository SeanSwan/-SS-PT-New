---
title: Injected doubles prove your branching, not the world
originating_model: claude-opus-5
tier_basis: Sean's designation 2026-08-10 — Opus 5 is Fable-tier; claude-opus-5 is on the Rule 68 tier_allowlist
date: 2026-08-19
decision: any check that crosses a real boundary (git, filesystem, process, network) requires at least one test that actually crosses it; a detector that BLOCKS is calibrated against the real corpus before its patterns are fixed
status: shipped
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
models_used:
  - model: claude-opus-5
    role: builder, hostile reviewer of own work
    did: built the fail-closed privacy boundary gate and the runGate choke point; ran five hostile rounds from distinct mechanical vantages (real-git drill, 1,736-artifact corpus scan, 15-mutant run, end-to-end stdin drill, locale/TZ/determinism); found and fixed two defects its own unit suite passed clean over, and two decorative tests of its own
    cost: subscription (flat)
skills_touched:
  - id: gate-run.mjs
    change: created
    failure: GLM Q4 — failOpen()'s truthy return moved the obligation to ~24 future call sites enforced by a docblock; nothing mechanical detected a call site that logged and allowed anyway
  - id: privacy-boundary-gate.mjs
    change: created
    failure: 203 committed, model-read memos on main had never been scanned for structured identifiers, and nothing distinguished a boundary gate from an observer gate
  - id: test-driven-development
    change: proposed-amendment
    failure: a unit suite with an injected `exec` passed completely while the real code path was inert — the stub encoded the author's belief about git rather than git's behaviour
  - id: systematic-debugging
    change: proposed-amendment
    failure: a blocking detector was designed from first principles and only measured against the real corpus afterwards, where it produced 8 false positives that would each have been a hard block
---

# Injected doubles prove your branching, not the world

## The lesson

`stagedGitignored()` shipped with unit tests that injected a fake `exec`. Every test passed.
Against a **real** repository it returned an empty list for force-staged ignored files — the
one situation the function exists to detect.

The cause is a genuine git behaviour I did not know: `git check-ignore` omits **tracked**
paths by default, and a force-staged file is tracked. `--no-index` is required. My stub
returned what I *believed* git returned, so the suite was a test of my model of git, not of
git. It was green, and the feature was inert.

**The generalisable rule:** a test with an injected double proves your branching. It cannot
prove anything about the dependency's behaviour, because you wrote the dependency's answers.
Any check that crosses a real boundary — a subprocess, the filesystem's actual semantics, a
network service, another process's locking — needs at least one test that actually crosses
it. Keep the doubles for the branch matrix; add one real crossing for the truth.

This is the same shape as the defect the whole gate system was built after: a mechanism that
*looks* satisfied while enforcing nothing. A string-matching gate and a genuine review are
indistinguishable from the outside; so are a stubbed test and a real one.

## The second lesson: calibrate a blocking detector before you fix its patterns

I designed the PII patterns from first principles, then ran them over the 1,736 LLM-bound
artifacts already in the repo. Luhn-only card detection produced **eight false positives** —
13- and 14-digit identifiers beginning 2, 6 and 9. A checksum is not an identity: roughly one
in ten random digit runs satisfies Luhn. Requiring a real issuer prefix *and* a real length
took eight to zero without weakening detection of an actual card.

For a gate that BLOCKS, the false-positive rate is not a quality score — it decides whether
the gate is still switched on next week. A gate everyone disables catches nothing, so the
noise budget is a **security** parameter. The corpus scan belonged *before* the patterns were
fixed, not after.

That scan also produced a real finding: 14 personal-mailbox addresses and 2 real-looking
phone numbers already sit in committed, model-read documents. Not mass-edited — that is the
owner's call, and it is history. Logged on the board.

## Who did what

- **Opus 5 (me)** built it and found every defect below — but only from vantages that touch
  reality. Reading my own code found nothing in any round. The two highest-severity defects
  came from running against a real git repository and a real document corpus.
- **No external model was consulted.** Worth recording against the routing table: this class
  of defect (a stub that encodes the author's wrong belief) is not reliably found by *another
  reader* either, because a reviewer reading the same stub inherits the same belief. It is
  found by execution. Spending a paid review here would likely have missed it.
- **GLM-5.3** (three days earlier, on slice 1) is the reason `runGate()` exists at all: its
  Q4 finding correctly called the previous fix a deferred obligation rather than a fix.

## Skills created or changed

- **`gate-run.mjs` (created).** One wrapper owns env sanitization, disable honouring,
  telemetry, latency and exit mapping. A gate author writes the CHECK and is structurally
  unable to write the telemetry-silent-so-allow bug. Two explicit modes, and the distinction
  is not stylistic: an **observer** that breaks must not halt the repo; a **boundary** that
  cannot perform its check must block, because the thing it prevents is irreversible.
- **`privacy-boundary-gate.mjs` (created).** Scans artifacts written this turn under
  model-read paths, and gitignored content force-staged for commit. It reports the file and
  the pattern class and **never echoes the match** — a gate that prints the PII it found into
  the transcript has performed the leak it exists to prevent.
- **Scope honesty in the docblock.** It does not detect names; "Sarah called about her knee"
  has no syntax to match. Writing that down beats letting a future reader infer coverage it
  does not have — the same overclaim GLM caught in `isFreshForSha` on slice 1.

## Mistakes I made

- **Escape literalization, twice more, in the session whose predecessor packet is about
  exactly this.** That packet's fix — "write patch scripts to a file rather than `python -c`"
  — was too narrow. A backslash was eaten inside a *quoted* heredoc, so the mangling happens
  ABOVE the shell, in the command transport, and quoting does not help. **The correction that
  actually holds: never inline code through Bash; write the file, then run the file.**
  Running total across two sessions: four occurrences.
- **I asserted a branch-local fact as a global one.** I told the owner the Hermes inbox was
  "gitignored by design". On `main` it is explicitly un-ignored and 203 memos are committed;
  only the stale branch ignores it. I checked one tree. The two disagree — and the committed
  side turned out to be the highest-value thing the new gate protects.
- **Two of my own tests were decorative,** surfaced by mutation rather than by reading: a
  `stop_hook_active` fixture that returned null whether the guard existed or not, and zero
  coverage of the env-sanitization call.
- **My first PII fixture was a plausible real personal email address** — in the test file of
  a privacy gate, bound for a public repo. Fixed before commit; should never have been typed.

## Error → fix → repeat ledger

| error class | times this session | written up before? | what actually stopped it |
|---|---|---|---|
| escape/backslash literalization through the shell | **2** | **YES — my own packet, 3 days earlier** | Widening the rule from "no `python -c`" to "no inline code through Bash at all". The narrow version failed because it named a tool instead of the mechanism. |
| green suite over an injected double while the real path is inert | 1 | no | One real crossing per boundary. The stub stays for the branch matrix. |
| blocking detector designed before measuring real data | 1 | no | Corpus calibration before the patterns are fixed, and false-positive rate treated as a security parameter. |
| decorative test of my own | 2 | YES (slice 1 packet) | Mutation run every slice; a mutant that survives names the decorative test directly. |
| stating a branch-local fact as global | 1 | partially (drift-check) | Check both trees explicitly and say which one is authoritative. |

**Row one is the signal.** It was documented, in a durable packet, by me, three days before —
and recurred twice. The write-up failed because it recorded the *instance* (`python -c`)
rather than the *mechanism* (any code inlined through the command transport). A correction
that names a specific tool will be evaded by the next tool.

## External-model calibration

No paid model was consulted this session. The observation worth keeping is a routing one:
defects of the form *"the stub encodes a wrong belief"* are poor candidates for external
review, because a second reader of the same stub inherits the same wrong belief. They are
found by execution against reality, which is cheap. Reserve paid reviews for judgement and
adversarial framing — the class where GLM's Q4 and Q10a genuinely beat in-house passes.
