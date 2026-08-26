---
surface: vs-claude
utc: 20260826T060000Z
topic: Swan Coach ownership — three live cross-tenant holes found and closed, one read, one destructive, one time-shifted write
tags: [swan-coach, authorization, idor, workout-plans]
---

## What I did / learned
- The previous slice proved no BELOW-ROLE caller reaches a Coach dispatcher. This one asked
  the other question — WHOSE record may a correctly-roled caller act on — and found two
  live holes, both now closed with contracts and mutation coverage.
- **Hole 1 (read).** `stepResolveClient` derived the resolver's scope as
  `trainerId: role === 'trainer' ? user.id : undefined`. That reads as "trainers are
  scoped"; it MEANS "every role except trainer is unscoped". `view_xp_streaks` permits a
  `client` caller, requires a client ref, and is not self-service — so any authenticated
  client could name another client's id and receive their points, level, tier, streaks and
  achievements. Role check passed (the role IS permitted), capability gate has no policy
  for that command, resolver was handed no scope.
- **Hole 2 (destructive write).** `delete_workout_plan` is `destructive: true`, takes a
  `planId`, declares `requiresClientRef: false` — so the pipeline resolves no client at all
  — and passed the caller-supplied id to `transitionWorkoutPlanLifecycle`, which validates
  `actorId` is a positive integer and records it for audit. Any trainer could archive any
  plan. The same operation over HTTP is guarded by `verifyClientAccessByPlanId`, middleware
  written for exactly this class. The dispatcher's own header claimed parity with that
  protected route.
- **Hole 3 (time-shifted).** A command requiring confirmation is authorized once, in the
  pipeline, then parked for up to 120 seconds. Redemption checked ownership of the pending
  operation, expiry, and (destructively) an HMAC signature — none of which notice that the
  caller's role was revoked, or the client transferred away, inside that window. The
  signature proves the operation was not tampered with; it says nothing about who may run it
  NOW, because it was signed when the caller still could. Now re-authorized on both lanes
  against the caller's CURRENT role and current client access.
- **The transferable shape:** a ternary that names ONE privileged case silently defines
  every other case as the permissive default. Written as a named set with the fall-through
  spelled out, the hole is visible on sight.
- **Second shape:** sharing a service with a protected caller is not protection. Commands
  never travel over routes, so no middleware runs for this lane; a guard has to be called,
  not inherited.

## Why it matters to Hermes
- Both fixes reuse an existing in-repo helper (`assertAssignmentOrAdmin`) rather than a new
  rule. When Hermes is asked "how do we authorize X in the Coach lane", the answer is: find
  the REST route that does the same operation and call the helper its middleware calls.
- Denial deliberately looks identical to absence (the repo's 404-not-403 discipline), so an
  id-walker learns nothing. There are THREE ways to say no on the archive path and all
  three now return one expression.
- The Coach lane's authorization is layered and each layer answers a different question:
  role (step 5) → surface capability (5.5, only planner/workout-form) → client ownership
  (6) → handler-side ownership of any OTHER id. The fourth layer has no framework; each
  handler does it itself, and one of eight did not.

## State right now
- Branch `claude/coach-endpoint-truth-v2-20260824`, 7 commits, clean tree, NOT pushed.
- 4 new contracts, 39 tests: client-ownership (12), trainer-scope (8), plan-archive (8),
  confirm-lane re-authorization (12).
- Full backend gate exit 0: 9712 passed, failing-file set identical to the recorded
  baseline. 29/29 mutations fire, every file restored byte-identical.
- Every id-shaped parameter on every trainer-runnable command was swept; the others were
  already guarded (`cancelSessionForAI`, `resolveAiScheduledSessionForLog`, `Goal.findOne`
  scoped by userId, `resolveOwnedProfile`, `resolveTrainerId`).
- Still open: dispatcher self-gating as defence in depth (handlers are mocked in the
  contracts), and a role that changes DURING dispatch rather than before it.

## Mistakes I made
- My first ownership survey read `Object.keys(schema.shape)`, which returns `[]` for the 19
  wrapped (`.refine()` / `.optional()`) schemas — 12 commands' entire parameter lists were
  invisible, `update_client`'s clientId among them → caught by writing an unwrap and
  re-measuring (40 → 43 commands) → rule: a shape reader that cannot see through wrappers
  under-reports, and under-reports in the reassuring direction; validate the instrument
  before believing a survey, exactly as before believing an absence.
- Wrote a multi-line mutation anchor with `\n` against CRLF files — matched nothing. **Hit
  it FIVE times in this session alone**, on top of four prior sessions of write-ups. Caught
  only because the harness reports ANCHOR x0 separately from SURVIVED → rule: prose has
  failed nine times; the harness now REFUSES to run on an anchor whose `\n` is anywhere but
  index 0, and running that guard is what finally taught the precise rule — a leading `\n`
  matches the `\n` half of a `\r\n` and is fine; a `\n` in the middle cannot, because the
  source has a `\r` the anchor lacks. No write-up ever contained that distinction.
- Shipped a confirm-lane fail-closed catch with NOTHING exercising it: a mutation flipping
  it to fail-open SURVIVED while all 10 other assertions stayed green → caught by the
  mutation harness → rule: a fail-closed branch needs a test that makes the dependency
  THROW, not merely return false. It works in every test and stops working exactly when the
  database is unhappy.
- Recorded the confirm-lane denial as `blocked_reauthorization`, an audit outcome outside
  the vocabulary the model documents → caught in hostile round 2 → rule: an outcome value
  nobody else uses is a row nobody else queries; put the specific reason in `errorCode` and
  keep `outcome` inside the documented set.
- Asserted an audit row synchronously when the write is fire-and-forget behind a dynamic
  import → the assertion failed → rule: it would have failed whether or not the row was
  ever written, so it proved nothing either way; await the effect.
- Asserted denial and absence were identical with `toEqual` on the whole object, when both
  echo the caller's own planId → caught by running it (it failed) → rule: an
  indistinguishability assertion must compare everything EXCEPT the caller's own input.
- Shipped a sweep whose loop body could execute zero times: the non-privileged pass would
  have reported a clean result over zero pairs if `view_xp_streaks` ever stopped permitting
  a client → caught in hostile round 2 → rule: any test that iterates a discovered set must
  assert the set is non-empty, or an empty surface reads as a clean one.
- Left `isLastExport` and an exported `handlerModuleSource` that nothing consumed → caught
  in hostile round 5 → rule: an unused export is a claim about an interface nobody checked.
- Ran `cmd | tail; echo $?` and read tail's status → the exit-status hook blocked it before
  it ran → rule: the hook exists because this is the most-recurring mechanism in the
  corpus; use `${PIPESTATUS[0]}` or redirect to a file.

## External-model calibration (only if a paid/external model was consulted)
- None consulted. $0.00 spent. Hostile review was self-run over 7 rounds (2 dry).

## Sean owes / blockers (if any)
- Merge/deploy decision on 4 commits — still unpushed, and every GitHub Actions gate is
  dead at the account level, so nothing validates a merge. github.com/settings/billing.
- `view_xp_streaks` still lists `client` in roleRequired. Harmless now (a client resolves
  only themselves, matching `my_xp`), but the entry is redundant. Removing it would start
  denying at the role gate what now succeeds, so it was left alone deliberately.
