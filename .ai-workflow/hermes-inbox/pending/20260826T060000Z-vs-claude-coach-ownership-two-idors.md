---
surface: vs-claude
utc: 20260826T060000Z
topic: Swan Coach ownership — two live cross-tenant holes found and closed, one read, one destructive write
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
- Branch `claude/coach-endpoint-truth-v2-20260824`, 4 commits, clean tree, NOT pushed.
- 3 new contracts, 27 tests: client-ownership (12), trainer-scope (8), plan-archive (8).
- Full backend gate exit 0: 9700 passed, failing-file set identical to the recorded
  baseline. 21/21 mutations fire, every file restored byte-identical.
- Every id-shaped parameter on every trainer-runnable command was swept; the others were
  already guarded (`cancelSessionForAI`, `resolveAiScheduledSessionForLog`, `Goal.findOne`
  scoped by userId, `resolveOwnedProfile`, `resolveTrainerId`).
- Still open: dispatcher self-gating as defence in depth (handlers are mocked in the
  contracts), and a role revoked mid-flight inside the confirm lane's 120s window.

## Mistakes I made
- My first ownership survey read `Object.keys(schema.shape)`, which returns `[]` for the 19
  wrapped (`.refine()` / `.optional()`) schemas — 12 commands' entire parameter lists were
  invisible, `update_client`'s clientId among them → caught by writing an unwrap and
  re-measuring (40 → 43 commands) → rule: a shape reader that cannot see through wrappers
  under-reports, and under-reports in the reassuring direction; validate the instrument
  before believing a survey, exactly as before believing an absence.
- Wrote a multi-line mutation anchor with `\n` against CRLF files — matched nothing.
  **This is the same escaping class I have now hit in three consecutive sessions** (the
  prior handoff logs four instances of heredoc `\n`/`\b` corruption). Caught only because
  the harness reports ANCHOR x0 separately from SURVIVED → rule: prose about escaping has
  not worked; the thing that worked was a harness that distinguishes "not applied" from
  "did not fire". Single-line anchors, or a harness that says which one happened.
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
