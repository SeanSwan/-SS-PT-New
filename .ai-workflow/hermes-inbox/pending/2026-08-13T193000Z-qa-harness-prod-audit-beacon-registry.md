---
surface: qa-harness
slug: prod-audit-beacon-registry
agent: vs-claude (Opus 5)
date: 2026-08-13
---

# Production Playwright audit run; stale write-allowlist fixed

## What happened

Ran the live read-only production audit (`playwright-mission.mjs --prod-live-readonly`)
against sswanstudios.com. 12 failures. Two classes:

1. **4 failures — harness stale, site fine.** Every non-auth check failed on
   `POST /api/telemetry/funnel`, the public funnel beacon (SWA-29): fail-soft,
   always-204, server-side event allowlist, zero-PII sanitizer, mutates no
   business record. The site was behaving exactly as designed. The audit's
   write-allowlist knew only about `/api/dashboard/track-pageview`.
2. **8 failures — correct loud failures.** No production auth states captured on
   this machine, so the four role crawls cannot authenticate. The harness fails
   rather than reporting green on a crawl that tested nothing. Needs Sean.

Fixed class 1. Audit now 12 failed → 8 failed; the remaining 8 are all class 2.

## The real defect was duplication, not the missing entry

The single tolerated endpoint was hardcoded in **five** places. Shipping a second
beacon therefore required five coordinated edits and received zero. Replaced with
one registry (`frontend/e2e/mission/benignBeacons.ts`); entries carry the reason
they are safe; matching is exact on method+path so `DELETE` on a beacon path is
still a finding. Beacons stay blocked (QA traffic must never reach production
analytics) but are answered 204 so the app's error path stays quiet.

## Lesson worth carrying

**A gate that fails on correct behaviour is a gate people stop reading.** This one
had been red on a working feature, and every real finding sat behind it. When an
allowlist is copied N times, the copies do not drift *maybe* — they drift the
first time the system grows.

**Corollary found the same hour:** a guard test that has been red for months is
proof nobody runs it. The backend mission-QA test asserted on `residualRisks` and
`blockedWrites` — internals of a report facade deleted in `d528fd25f`. Re-anchored
to the sections the generator actually emits plus the exit-code contract.

## Mistakes I made

- **Nearly treated a harness bug as a site bug.** My first read of
  `POST /api/telemetry/funnel` in the failure diff was "production is doing an
  unexpected write." Caught by reading the route + client lib before touching
  anything. Rule that prevents the repeat: verify the endpoint's actual semantics
  from source before classifying a finding — the failure message names a symptom,
  not a cause.
- **Fixed one copy before sweeping for the others.** I edited `crawlWorklist.ts`
  first and only then ran the sibling sweep that found five copies. The sweep
  should precede the first edit, or the fix ships partial. (Rule 20/54.)
- **Ran a whole-project `tsc` twice, at two heap sizes, before scoping it.** Both
  OOMed; ~5 minutes lost. Known repo gotcha I had in memory and did not apply.
- **Three long Playwright runs died silently in the background** with zero-byte
  output because the runner buffers via `spawnSync` and the harness kills long
  background tasks. Burned ~25 minutes before switching to bounded foreground
  chunks. Lesson: for this runner, run bounded greps in the foreground; do not
  background the full contract suite.
- **Nearly asserted a pre-existing failure was pre-existing without proving it.**
  `client-proof-loop` failed after my change. My change was type-only so the
  reasoning was sound, but I stashed and re-ran against a clean tree instead of
  arguing. It failed identically — pre-existing (needs a backend in contract
  mode). Reasoning is not evidence.

## External-model calibration

None. No paid or external model was consulted for this task.

## State for Hermes

- Commit `6975b3c13` on `claude/qa-harness-slice0-20260811` (worktree
  `C:/tmp/ss-qa-harness-slice0`). Committed, NOT pushed.
- Sean owes: capture production auth states (interactive login, headed browser,
  no credentials pass through any agent) to unlock the authenticated crawl.
- Open, not fixed: `client-proof-loop` contract spec needs a running backend;
  fails on a clean tree too. Full contract suite takes >10 min and cannot be run
  as one background task in this harness.
