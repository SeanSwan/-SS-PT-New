# A multi-agent batch-push hold went stale, and nobody noticed for 27 hours

**Surface:** cross-agent coordination / launch audit (5 parallel lanes)
**Date:** 2026-08-05
**Author:** Claude Opus 5, Lane 1 (user dashboard)
**Status:** transferable lesson + live state

---

## What happened

Five agents audited five dashboard surfaces in parallel, each in its own worktree, coordinating through gitignored lane files plus a shared conflicts file. An integrator agent was to merge all five and do **one** push, so Render deployed once.

Sean was asked on 2026-08-04 whether to push early or wait for the last lane, and chose to wait — explicitly, to get one deploy.

By 2026-08-05 that plan had quietly stopped being true:

- The integrator had not moved in **~27 hours**, and `main` had advanced **101 commits** past its branch.
- **Two lanes had already landed on `main` individually** (20 and 33 commits), so the single-batch deploy the hold was protecting **no longer existed** — it had been broken by other lanes, not by the one being held.
- **Two other lanes existed only on the integrator's local branch** — on neither `main` nor `origin`. The batch everyone was waiting for had silently become the *smallest* part of the outstanding work.

Meanwhile the held lane contained a live PII leak: a schedule endpoint returning the whole client roster **with email and phone** to any self-registered user.

## The transferable lesson

**A coordination hold is a claim about the world, and it decays.** It was recorded once, in prose, and then treated as binding by every later reader — including me — without anyone re-checking whether its premise still held. The premise ("one batch deploy") had been falsified a day earlier by two lanes landing directly, and nothing in the protocol noticed, because *the protocol had no way to notice*. Lane files record intent; nothing reconciled intent against `git`.

Three checks would have caught it, all cheap, none of which the protocol required:

1. **Is the coordinating agent still alive?** File mtime vs now. 27 hours is not "in progress."
2. **Has the base moved?** `git rev-list --count <branch>..origin/main`. 101 commits means the plan predates the world.
3. **Is the premise still true?** Grep `origin/main` for the other lanes' commits. Two were already there.

Generalised: **when a shared plan says "wait", verify the plan's premise against the system of record before honouring it — especially when honouring it delays a security fix.** Prose coordination state must be reconciled against `git`, because `git` is what actually happened. Staleness in a coordination file is invisible by construction: it looks exactly like a live instruction.

## The second lesson — scoped runs reported as full ones

I reported "backend 2389 passed / 1 failed." That run was scoped to one test directory (~2,162 tests). The **full** backend suite is ~**8,518 tests across ~1,106 files**, with **5** failing files. The number was not wrong; the **scope** was, and the scope is what made it sound like a clean bill of health.

A pass count without its denominator-defining command is not evidence. Any gate claim should carry the exact invocation, because "2389 passed" and "2389 passed out of a suite four times that size" support very different conclusions — and only one of them is honest.

## Also worth carrying: rebase drift re-opened a defect the tests were written to catch

While this lane was out of date, `main` added a completeness filter to one of two builders that must agree. On rebase, the other builder did not get it, and the two definitions of "this week" silently diverged again — a planned session would light a day tile while the count beside it ignored the same row. **The agreement tests written for the original defect caught the re-introduction.** Tests that pin *two things agreeing*, rather than one thing's output, survive refactors and merges that output-pinning tests do not.

## Live state (for whoever picks this up)

- Lane 1: 28 commits, rebased onto current `main`, gates re-run, handoff written to the conflicts file.
- Lanes 2 and 5: **unlanded**, on a local integration branch 101 commits behind. Real outstanding work.
- Known-baseline reds on `main` (do not re-diagnose): a type error in a checkout state-view file from lane 4; three frontend test files including a nav test asserting an exact label array a later commit added an entry to; one backend gallery-referral test that is stale rather than broken (the guard was strengthened to a DB unique index + 409; the assertion was never updated).
- Hostile loop ran **19 rounds, 16 with real findings, and never reached dry** — recorded as-is.
- No live authenticated browser journey was run. Backend claims are test-verified; the end-to-end member experience is not.

**Privacy:** roles and endpoints only — no client names, no user records, no credentials, no absolute paths beyond repo-relative.
