---
date: 2026-09-03
originating_model: claude-opus-5
title: A guard that matches a symbol's own definition reports everything as live
models_used:
  - model: claude-opus-5
    role: builder + sole hostile reviewer
    did: closed blueprint-v3 slices S4-S6 (durable job queue, worker, frontend API client, polling hook); found and fixed six defects in its own work, including a reachability guard that had been passing for weeks by matching definitions instead of callers, and an entire frontend feature surface with zero callers
    cost: subscription
skills_touched:
  - id: instrument-check
    change: reinforced
    failure: three separate guards written this session initially validated nothing - a flag-presence check satisfied by a comment, an over-strip test satisfied by a function that never calls the helper, and a shell mutation that silently did not apply while its run was read as a pass
  - id: closeout-evidence-lock
    change: reinforced
    failure: "done" was nearly claimed on a frontend surface that typechecks, tests green, and cannot be reached from App.tsx by any path
---

# A guard that matches a symbol's own definition reports everything as live

The backend reachability manifest exists because `exerciseMatchService` was hardened across
three review rounds while having zero call sites. Everyone reviewed the matcher's internals;
nobody asked whether anything reached it. So the fact got written down and checked mechanically.

The check was: does this symbol's name appear anywhere in reachable source. A symbol's own
definition **is** reachable source. So every symbol in a module that was reachable for any
reason read as LIVE — including one with no callers at all, which is the single case the file
exists to catch. It had been green for weeks.

It surfaced only under a negative control. Deleting `readCaptureDraft` from the controller left
the manifest passing, because a sibling function kept the service module reachable and the
definition kept matching. Had anything else in `exerciseMatchService`'s module been wired, the
guard built to catch it would have reported it LIVE through all fourteen rounds.

"Something calls it" means a reference from a file that is not itself. One clause.

## The same mistake, one layer out

That manifest walks backend entry points. So a complete, correct, fully tested React surface
that no page renders is invisible to it — and that is exactly what the capture flow is. Three
components, a polling hook, a typed API client, 66 passing tests, clean typecheck, and **nothing
outside that folder imports any of it**. No path from `App.tsx` reaches it.

A feature can be finished and not exist. The backend is genuinely live — routes mounted,
verified, 925 plaud tests passing. The frontend is a finished surface that reaches no user, and
the instrument built to catch precisely this could not see it because it was pointed at the
other half of the codebase. A guard covers what it walks, and the boundary of what it walks is
invisible from inside it.

## Who did what

**claude-opus-5 (this session)** built S4 (durable leased job queue + worker), the queue-honesty
refusal, the frontend API client, the polling hook, and both reachability manifests. It also
produced every defect listed below. No external model was consulted: every finding here came
from planted-mutation controls against its own work, which is the point worth generalising —
the hostile pass that found things was never the one that re-read the code, it was the one that
broke the code and checked whether anything noticed.

Two of the six defects were in guards *written in the same session as the fix they guarded*. A
guard authored by the same mind that wrote the bug inherits the assumption that produced it.
The mutation is what breaks that symmetry; nothing else did.

## Skills created or changed

`instrument-check` — reinforced, three times over. Every guard written this session was
initially satisfied by something other than what it claimed to check:

- The gated-flag check asserted `PLAUD_WORKER_ENABLED` appeared in the file. That file names the
  flag in three comments and a log line, so it stayed green after the condition became
  `if (false)`. Fixed by requiring `process.env.FLAG` — the READ, not the word. Deliberately not
  by stripping comments, which is its own way to be quietly wrong.
- The over-strip test asserted `organizeCaptureDay` still returned its segments. That function
  builds its result field by field and never calls the strip helper, so it passed no matter what
  the strip list contained. Adding `segments` back left all 11 tests green.
- Two shell mutations silently failed to match and their green runs were briefly read as passes.
  Caught only because the occurrence count was printed before the run.

`closeout-evidence-lock` — reinforced. Green tests, clean typecheck, and a mounted route are
three different claims. This session had all the evidence for the first two on a surface that
fails the third.

## Mistakes I made

- **Built a guard that matched definitions instead of callers**, and it had been passing for
  weeks. Found by control, not by reading.
- **Built an entire frontend surface with no caller** — and did not check until closeout, in a
  workstream whose defining lesson is that things get built with no callers.
- **Claimed a runtime guarantee that a TypeScript type cannot make.** Wrote "the transcript never
  appears in a response type… so there is no field here to render by accident." Types erase at
  build and strip nothing. Fixed by deleting the keys at runtime and rewriting the comment.
- **Put `segments` in a transcript-strip list** — a real, wanted field on the organize result. A
  helper that deletes legitimate data the moment someone reuses it is worse than the bug it
  guards.
- **Wrote a test for that mistake that could not detect it.** The decoration was found by the
  mutation, not by re-reading the test.
- **Shipped three failure codes as retryable under a comment saying "terminal, not retryable"** —
  `OUTPUT_NOT_FOUND`, `OUTPUT_NOT_OWNED`, `CLIP_NOT_FOUND`. Each retry re-ran an R2 restore and an
  ffmpeg merge before hitting the identical wall.
- **Made the API accept work nothing would do.** Moving processing to a queue while the worker is
  off by default meant 202 "processing" on a server with no drain — a permanent silent stall,
  strictly worse than the timeout it replaced, because a timeout tells someone.
- **Put the sequential row id on the wire** by spreading a draft whose shape carried it for
  internal use, undoing the choice of a UUID as the external identifier.
- **Asserted a response body shape from memory** (`body.code`) instead of reading `jsonError`
  (`body.error.code`). Caught by my own test.
- **Wrote a hook test harness that mixed `vi.useFakeTimers` with `waitFor`**, which polls on real
  timers, and used `clearAllMocks`, which leaves `mockResolvedValueOnce` queues in place. Nine of
  twelve tests failed on the harness; the hook needed no change.

## Error → fix → repeat ledger

| Error class | Recurred | Written up before? | What actually stopped it |
|---|---|---|---|
| Guard validates nothing (satisfied by comment / by an uninvolved function / by its own definition) | 4× this session | Yes — repeatedly | Plant a violation and require the run to FAIL. Reading the guard never caught one of the four. |
| Shell mutation silently does not apply; green read as a pass | 2× this session | Yes — round 8 of the earlier loop | Print the occurrence count before believing the run. This is what caught both. |
| Built with no caller | 2× this session (matcher earlier, whole frontend surface now) | Yes — the reason the manifest exists | A reachability manifest per trust boundary, with the definition excluded. One manifest only covers what it walks. |
| Claim stronger than the mechanism (type as runtime guarantee; comment vs code) | 3× this session | Partially | Make the mechanism match the claim, or narrow the claim. Rewriting the comment alone was never enough. |

The highest-signal row is the first. It was documented, then repeated four times inside one
session — which proves the write-up was not the fix. The correction that survived is procedural
and mechanical: **a guard is not believed until a planted violation makes it fail.** Not "be more
careful about guards."

## External-model calibration

None consulted. Every finding came from planted-mutation controls against my own work, at
subscription cost. Worth noting for routing: six real defects surfaced with zero paid spend, and
all six were found by breaking the code rather than by re-reading it. Before paying an external
reviewer for a surface like this, run the mutations first — they are free and they found things
two prior hostile rounds had walked straight past.
