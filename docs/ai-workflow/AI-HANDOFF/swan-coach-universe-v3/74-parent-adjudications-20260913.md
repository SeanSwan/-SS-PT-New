# Parent (Astra seat) adjudications — 2026-09-13 session

Every decision below was the root agent's to make, not a subagent's. They are
recorded together because each one either bounded a subagent's scope or corrected
a claim, and a future reader should be able to see the reasoning without
reconstructing it from commit messages.

Session context: executing the held queue in packet [70](70-release-and-worktree-audit.md).
Branch `codex/swan-coach-astra-owned-20260906`. Worktree
`tmp/worktrees/swan-coach-astra-owned-20260906`.

---

## A1 — HR12 Rule 4 cap overflow: bounded 8th production file APPROVED

**Requested by** the HR12/P58 implementer, which correctly refused to add an
eighth production file unilaterally because plan [58](58-planner-async-retirement.md)
§9 reserves that to the parent.

**Facts established by root before deciding:** `useWorkoutPlannerAiEvents.ts` was
**366 lines** against the repo's 300-line Rule 4 cap, and was already 265 at HEAD —
so the P58-B receiver contract genuinely does not fit. (Root's first count said 347;
that was wrong. PowerShell's `Measure-Object -Line` skips blank lines. The
implementer's 366 was correct.)

**Decision: APPROVED.** Extract to
`frontend/src/components/DashBoard/Pages/admin-workout-planner/workoutPlannerAsyncEditReceiver.ts`,
with conditions: both resulting files ≤300 lines; purely mechanical move; no
signature changes; can-fail proof re-run afterwards, because a refactor that turns
a guard into dead code is the failure mode that matters here.

**Outcome — VERIFIED.** `useWorkoutPlannerAiEvents.ts` is now **296** lines and the
new file is **102**; every file in the slice is ≤300. Planner suite re-verified by
root at **88 files / 442 tests, exit 0**.

**False alarm recorded.** During verification root ran the full planner suite and
saw `plannerContexts/useWorkoutPlannerDraftMutation.ts` failing
`plannerContextBoundary.test.ts` at **301** lines, and nearly reported an
extraction regression. Re-running the boundary test alone passed 5/5 and the full
suite passed 442/442 — the file was mid-edit by the implementer at the moment of
the first run. **Lesson: in a worktree with live writers, a single failing run is
not evidence of a regression; re-run before attributing.**

---

## A2 — C1-C4 admission of one new test file: APPROVED

**Requested by** the plan-55 implementer, which found that plan 55 §3 C4 names four
source files "and their existing/focused tests", but two of them
(`hooks/useCoachCommandCenterPendingFood.ts` and the §5 line-125 addendum
`hooks/useSwanCoachPendingFoodQuery.ts`) have **no test file at all** — so it could
not write a RED test without creating one.

**Decision: APPROVED**, as a parent-adjudicated scope amendment:

`frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachCommandCenterPendingFood.admission.test.tsx`

Reasoning:
- The plan's "root admits exactly ONE additional test file" budget was **already
  consumed** by `CoachCommandCenterPage.test.harness.tsx` (plan 55 lines 335-354
  record it as consumed). That constraint exists to bound scope, not to forbid
  proof.
- The alternative — leave the seams unimplemented and report them NOT STARTED —
  would leave production behaviour changed without a failing-then-passing test.
  Everywhere else in this workstream, a behaviour change without such a test is not
  evidence.
- It is test-only: no product file, no dependency, no config change.

Conditions imposed: test-only (no second new file without asking again); real
behavioural RED then GREEN, not source-text; a negative control so neither blanket
allow nor blanket deny can pass; must cover both named seams or state which it does
not reach; and the implementer must report it as a parent-approved amendment.

---

## A3 — C1-C4 implementer's contradiction report: ACCEPTED, root's prompt was stale

Root's launch prompt told the implementer to start with the B2 transport fences.
The implementer read plan 55 further and found its own B1/B2 exit sections
(lines 313-332 and 357-367) already record those as implemented and verified, with
the one admitted extra test file consumed — and independently ran
`useAIChat.retirement` + `useCoachCommand.retirement` + `usePremiumTTS.retirement`
→ **3 files / 83 tests PASS**.

**Decision: ACCEPTED. Do not redo B1/B2; continue from C1-C4.** Root's prompt drew
on the plan's *baseline* line (8 files / 45 tests) without reading far enough down
the same document. The document wins, as the standing instruction says. Recorded
because the error was root's, and the correct response to a subagent contradicting
a parent prompt is to check the document, not to overrule it.

---

## A4 — HR13/59 ordering: must land AFTER C1-C4

Established from plan [59](59-rest-adjust-contract.md) itself, which states its
R59-B work must be an "exclusive edit window" on
`frontend/src/hooks/useCoachCommand.ts` that integrates *with* plan 55's current
generation fences rather than overwriting them.

Two consequences, neither previously recorded anywhere:
1. **Ordering** — C1-C4 (plan 55) must land first, so HR13 builds on its fences
   rather than racing them.
2. **Collision** — HR13 also needs `WorkoutLogger/**`, which R60-A occupied for the
   whole of this session. HR13 was therefore **not launched**, deliberately, rather
   than being started and colliding.

Plan 59 is also marked "plan only, no implementation enqueue" in its own text, so
launching it required this adjudication regardless.

---

## A5 — P64/S66 Rule 4 deviation: corrected, NOT excused

The P64/S66 implementer left three test files over the 300-line cap —
`aiChatTtsPaywallParity.test.mjs` 346 (HEAD 172),
`coachConversationReadAuthorization.test.mjs` 403 (HEAD 287),
`coachIntentRoutes.test.mjs` 328 (HEAD 205) — and justified it by stating that
"packets 64/66 explicitly bound the change to these existing files and forbid
additional test files".

**Root checked that claim and it is NOT SUPPORTED.** Neither packet [64](64-route-privacy-regression-tests.md)
nor [66](66-speech-access-contract-tests.md) contains any such prohibition; a
targeted search for it returns nothing, and the only related phrase is a
description of a four-file baseline rerun.

**Decision: the deviation is a genuine, unfixed Rule 4 violation, not a
packet-constrained one.** It is recorded as such in commit `adf5e74c5` rather than
being repeated as the implementer's reasoning. Splitting the three suites is queued
as follow-up. The functional work itself is sound and was independently verified by
root: **7 files / 100 tests, 0 skipped, exit 0**.

This is the second time in this session that a subagent's stated justification did
not survive checking. Subagent justifications are hypotheses like any other claim.

---

## A6 — CA-0 severity: narrowed by executed probe, not by argument

Recorded in full in [72](72-clientaccess-policy-and-caller-audit.md), which strikes
its own earlier wrong claims in place. Summary: the first version of that audit
called CA-0 a live cross-client exposure at a URL that does not exist. The probe
showed the mounted URL is `/api/admin/ai-bff/client-summary/:clientId`, sits behind
a pathless `authorizeAdmin`, and returns **zero of four** sub-results even when the
handler is reached under an ungated prefix. The endpoint also has no consumers.

**Decision: the fix shipped as defence-in-depth; the severity claim was corrected
down.** CA-1 (photo privacy fail-open on the default role) is the defect with real
user impact.

---

## A7 — HR16 root cause: root's own hypothesis refuted

Root proposed an auth-binding race. Instrumentation refuted it: the request reaches
the wire, then React.StrictMode's dev double-invoke aborts it before dispatch, and
an optimistic latch makes that permanent. **Corrected in place in
[71](71-m68-transcript-containment-exit.md)**, which keeps the wrong reasoning
visible next to the right one rather than quietly editing it.

---

## A8 — `known-failing-baseline.json`: do NOT grow the list

The CA audit observed 12 failing full-suite files against a 7-file baseline recorded
**2026-09-02**. The tempting move is to add the 5 extras. **Refused.**

The file's own note says *"Shrink this list; never grow it casually"*, and that is
correct: the list is a claim about **pre-existing** failures, and the runs happened
while three other slices were concurrently running Playwright, `tsc` and vitest in
the same worktree, where load flakes were directly observed
(`CoachCommandCenterVoiceLifecycle` times out at 5s in the full suite, passes in
isolation; suite duration swung 24s → 52s on identical code).

**Decision: the five files' status is UNKNOWN — neither confirmed pre-existing nor
confirmed flake.** Closure is a serialized run on a quiet tree. Growing the list
under load would produce a baseline that misrepresents the tree, which is worse than
a stale one. Recorded in commit `86a68749b`.

---

## Standing pattern from this session

Three of the eight decisions above (A3, A5, A6, and the A1 false alarm) were
corrections — of a root prompt, a subagent justification, a subagent audit claim,
and a root measurement respectively. The useful habit was not "trust less" but
**check the specific claim against its source**: the plan text, the packet text, or
a re-run. Two of those checks took under a minute and changed the conclusion.
