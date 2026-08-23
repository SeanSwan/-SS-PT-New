# Coach endpoint-truth harness + client-hub a11y fix

**When:** 2026-08-23 · **Agent:** Opus 5, VS Code terminal · **Surface:** Swan Coach command lane + admin/trainer client hub
**Branch:** `claude/coach-endpoint-truth-clienthub-a11y-20260823` @ `1c07213b3` — pushed, NOT merged, not deployed
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
mounted points a forensic reviewer at fiction. Five commands did that; one was a real
factual error and is fixed, four are pinned with reasons and the pin fails if one
starts resolving.

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
  it answers the question "is this defended?" with a false yes. **Deleted this session
  on Sean's go-ahead** — see the second batch below.
- Nine of ten commands the handoff flagged as authz drift are wired and correct.
  `dispatchScheduleSession` asserts trainer-or-admin and pins `trainerId` to self.

## Second batch — Sean approved the recommended fixes mid-session

- **`AI_ACTION_PERMISSIONS` deleted, not wired.** Its vocabulary never mapped to the
  139 command types; wiring it meant inventing a 139->6 mapping that fails closed on
  every gap. Replaced with a comment naming the gates that DO run.
- **`set_availability` endpoint corrected** to `PUT /api/availability/:trainerId` —
  a real route whose gate matches its declared roles. Pinned list down to 4.
- **Dead code removed:** `dashboard-tabs.ts` 241 -> 120 lines (three tab configs +
  two types, zero external importers); `TrainerVideosPage` lazy export.
- **CLAUDE.md + AGENTS.md** stale Coach figures corrected (20 cmds/214 lines ->
  139 registered/112 wired/391 lines), mirror verified in sync.
- **Behavioural a11y test added** — the source-text contract could not prove the
  element ever renders or that Retry refetches.

**Two handoff claims did NOT survive verification and were NOT actioned:**
1. `ClientSelfOnboardingWizard` "verified zero refs" — it is used at
   `routeComponents.tsx:178`, in the same file. The handoff fell into the exact trap
   it warned about two lines earlier for a different symbol.
2. "Kill the `?intent=log_workout` nav fork" — that intent pattern is deliberate and
   tested, and admin uses it too (`AdminOverviewQuickActions.config.tsx:32`).
   Changing it would diverge from a tested pattern and could land trainers on a
   logger with no client selected. Left alone; reported.

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
- **Wrote a behavioural test with over-broad queries** — `getByRole('alert')` and a
  container-wide `[aria-busy]` query both matched sibling nutrition panels, so two
  assertions were passing/failing for reasons unrelated to the roster.
- **Shipped a flaky test.** It passed 5/5 in isolation and failed once under a full
  parallel run (1000ms default timeout). A test that fails under load is worse than
  no test — it teaches people to re-run rather than to look.
- **Ran `git branch -f` and assumed I had switched branches.** Two commits landed on
  the old branch; caught only because a push reported "Everything up-to-date" while
  the count said otherwise. Verify `git branch --show-current`, never infer it.
- **Nearly deleted live code on the handoff's say-so** (`ClientSelfOnboardingWizard`).
  Only a same-file grep caught it. An inherited "verified" claim is a hypothesis.

## Verification

Final state after both batches:

- `tsc --noEmit` true exit 0 / 0 errors (12GB heap, redirected not piped)
- `vite build` exit 0
- **FULL frontend suite: 1584 files / 8025 tests — all pass**
- **FULL backend suite: 1185 passed, 23 files failing — set is BYTE-IDENTICAL to
  `known-failing-baseline.json` (recorded 2026-08-19). Zero regressions, and zero
  accidental fixes either.** Compared as sets, not counts: 23-vs-23 would have hidden
  a swap.
- Comparable DashBoard+ui scope 712/3464 -> 713/3471; the +7 is exactly the 3 restored
  retry-contract assertions plus the 4 new behavioural ones. No existing assertion was
  rewritten or re-anchored.
- All 11 route/endpoint assertions mutation-tested; each restored byte-identical.
- Secret scan CLEAN on every changed file.

## Open for Sean

1. Two branches now carry this work — the old `fix/p1a-dead-myclientsview-export`
   (pre-rebase) and the new one above. I did NOT force-push (Rule 45). The new branch
   supersedes; the old can be deleted once you agree.
2. What `endpoint` should say for the 4 remaining lane-internal commands. They have
   no REST route, so any value is invented; this is a registry-wide convention call,
   not a per-row fix.
3. `AI_ACTION_PERMISSIONS` is now DELETED. If a second action-verb-shaped gate is
   ever wanted, it belongs in the command lane with tests — not restored as a matrix
   nothing calls.
4. A pre-existing flake in `AdminViewAsWrapper.*` ("open fixture client") surfaced
   once and did not reproduce on a clean tree across 3 runs. Not in my diff. Worth a
   look, [LIKELY] pre-existing.
