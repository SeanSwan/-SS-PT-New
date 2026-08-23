# Coach endpoint-truth harness + client-hub a11y fix

**When:** 2026-08-23 · **Agent:** Opus 5, VS Code terminal · **Surface:** Swan Coach command lane + admin/trainer client hub
**Branch:** `claude/coach-endpoint-truth-clienthub-a11y-20260823` @ `cfc5becec` — pushed, NOT merged, not deployed
**Linear:** SWA-64

## What happened

Picked up the dashboard-convergence handoff. Its top-ranked next action was an
"authz parity harness": assert for all ~139 Coach commands that `roleRequired` is a
subset of the role middleware on the command's `endpoint` route.

Building it disproved its own premise. `endpoint` is declarative metadata — nothing
dispatches on it. Execution picks a service dispatcher by command *type*
(`commandDispatcher.mjs:347`), so the route's middleware never runs for the Coach
lane. The parity law would have failed 10 correct-by-design commands.

Shipped instead: a mount-resolved route-table extractor plus an **endpoint-truth**
contract. `endpoint` is HMAC-signed into destructive-op audit payloads
(`destructiveOperations.mjs:34`), so an endpoint naming a route that was never
mounted points a forensic reviewer at fiction. Five commands do that today; pinned
with reasons, and the pin fails if one starts resolving.

Also fixed the client-hub a11y defect the handoff ranked P1: roster loading was
silent to screen readers, and the error path said "reload the page" on a hub whose
container already had `loadClients()` available.

## Decisions worth carrying

- **The `endpoint` field is metadata, not a route.** Do not build authz reasoning on
  it. The real gates are `stepRBAC` (`commandExecutor.mjs:369`) and the dispatcher.
- **`AI_ACTION_PERMISSIONS` / `isAIActionAllowed` (`authMiddleware.mjs:966-981`) has
  ZERO production consumers** — only a test's `vi.mock` stub. It is labelled
  "AI Village CRITICAL — prevents AI prompt injection from escalating privileges".
  A security control that exists only as documentation is worse than none, because
  it answers the question "is this defended?" with a false yes. Flagged, not touched.
- Nine of ten commands the handoff flagged as authz drift are wired and correct.
  `dispatchScheduleSession` asserts trainer-or-admin and pins `trainerId` to self.

## Mistakes I made

- **Shipped `aria-busy="true"` on a transient node, then caught it in my own hostile
  pass.** The node unmounts rather than clearing busy, and a live region left busy
  can have its announcement dropped — so the "fix" could have suppressed the very
  announcement it added. Moved to the persistent container. Caught before push, but
  the first version was wrong.
- **Wrote a guard that matched its own documentation.** `not.toContain('aria-busy="true"')`
  failed because the comment explaining why aria-busy is wrong contains that literal.
  This repo committed two rounds about exactly this class days ago ("a fix can
  contain the defect it was written to kill"). I repeated it anyway. Fix: match
  structurally (`/<LoadingPulse[^>]*aria-busy/`), never by bare substring, when the
  file also *discusses* the thing being banned.
- **Built a route parser with two blind spots that would have made it lie.** It
  ignored `import { protect as authMiddleware }` aliases and mis-scanned regex
  literals containing quotes — the latter silently dropped a file's only route. Both
  under-report, i.e. produce false "this doesn't exist" claims. Found by attacking
  the instrument, not by it failing.
- **Took the handoff's ranked next action at face value for the first hour**, and
  only questioned the premise once the numbers looked wrong (10 "drift" rows all of
  the same shape). The premise should have been the first thing tested, not the last.
- Trusted a plain heredoc for a large file and had bash choke on it; wasted a cycle.

## Verification

tsc `--noEmit` true exit 0 / 0 errors (12GB heap, not piped) · `vite build` exit 0 ·
frontend DashBoard+ui **712 files / 3467 tests pass** · backend `tests/api` **428
passed, 3 failed — all 3 in `known-failing-baseline.json`, recorded 2026-08-19, zero
new** · all 11 new assertions mutation-tested and restored byte-identical · secret
scan CLEAN (7 files, 0 hits).

## Open for Sean

1. Two branches now carry this work — the old `fix/p1a-dead-myclientsview-export`
   (pre-rebase) and the new one above. I did NOT force-push (Rule 45). The new branch
   supersedes; the old can be deleted once you agree.
2. Whether `endpoint` should be corrected for the 5 stale commands, or the field
   redefined for lane-internal execution. That is a registry-wide design call.
3. `AI_ACTION_PERMISSIONS` — wire it, or delete it and its "CRITICAL" comment.
