# Swan Coach Universe V3 — session handoff, 2026-09-13 (Astra seat)

Written for whoever picks this up next. It exists on disk and has been verified to
exist, because the previous handoff for this workstream was reported as created and
**did not exist** — that is the first thing this session established, and the reason
this file leads with how to check it.

## Verify this file is real before trusting anything in it

```
cd <repo>/tmp/worktrees/swan-coach-astra-owned-20260906
git log --oneline -1
ls docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/78-session-handoff-20260913.md
```

If either fails, stop and re-derive state from git rather than from prose.

| Item | Value |
|---|---|
| Worktree | `C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906` |
| Branch | `codex/swan-coach-astra-owned-20260906` |
| Session base | `4345b86cf` |
| Pushed? | **No. Nothing was pushed, deployed, or sent to any provider.** |
| Session commits | **39** since base `4345b86cf` (`git rev-list --count 4345b86cf..HEAD`). The count in this row read 36 when first written and then 37; it is re-derived, not incremented by hand. C2/C3 and the third-wave closure were still in flight when this line was written. |
| Open findings | [77 — open findings register](77-open-findings-register.md) — **read this second** |

## Read order for a fresh agent

1. This file.
2. [77 — open findings register](77-open-findings-register.md). The open set lives
   there; do not reconstruct it from commit messages.
3. [74 — parent adjudications](74-parent-adjudications-20260913.md). The eight
   decisions that were root's to make, including two where root was wrong.
4. The slice plan you are about to take, from the table in
   [70 — release and worktree audit](70-release-and-worktree-audit.md).
5. [48 — capability truth and release gaps](48-capability-truth-and-release-gaps.md)
   for the product-truth ledger.
6. [80 — citation drift and re-anchoring](80-citation-drift-and-reanchoring-20260913.md)
   **before following any `file:line` citation in documents 70–79.** A hostile review
   found that many of them no longer point at the code they describe: the claims are
   true, but later commits in this session inserted lines above the cited positions.
   Doc 80 records the per-file shift, which citations were repaired, which were left
   alone on purpose, and the two probes — including that those probes are gitignored
   and therefore local to this machine.

## What this session did, in one paragraph

Executed the held queue from packet 70: implement each bounded slice, verify it by
executing tests rather than citing them, run hostile review, and commit only what
survived. Fourteen slices are closed and committed. Two were in flight when this
was written. Sixteen defects were found and fixed; **five of them were one root
cause** — role checks that compare literally against `'client'` while the database's
default self-registration role is `'user'`. Five more findings were *corrections to
earlier claims*, four of them to root's own, and they are all recorded in place
rather than quietly edited.

## Closed and committed this session

| Slice | Commit | What it settled | Independent evidence root ran |
|---|---|---|---|
| M68 | `2cc843ad1` | Talk tab laid intent bar and transcript side-by-side (`display:flex` with no direction); transcript crushed to 253.125px at every phone width | RED 88 failures / 20 viewports → GREEN 3 Playwright projects |
| HR16 | `2aeb2783e` | A routed thread never hydrated its messages | unit 2/2; mounted transcript children 1→3, exactly one detail call |
| CA-1/2 + CA-0 | `62d753514` | Photo visibility fail-open; profile-update fail-closed; AI-BFF latent fall-through | 3 files / 19 tests |
| P64, S66 | `adf5e74c5` | Two obsolete source-guards → real route privacy regressions; four skipped speech probes → current access contract | 7 files / 100 tests, 0 skipped |
| HR14 | `2d5aec4b3` | Vite resolved `.tsx`, tsc and vitest resolved `.ts` → two React contexts; the `.tsx` copy crashed on null | focused 7 files / 36 tests; `DIVERGENT(3)` → `SINGLE_OWNER` |
| HR15 | `2fd272bf4` | A client could not read its own null-target conversation | 5 files / 152 tests |
| R60-A | `dce0da517` | Unbound AI submit could edit notes/intensity, lock, POST and toast a save | 10 files / 162 tests; RED 7 failed / 2 passed |
| HR12 / P58 | `19fba5c8a` | A Planner lookup resolving after a client switch attached to the NEW client | 88 files / 442 tests; browser gate RED 2 failed / 2 passed with both anti-vacuity controls passing |
| C4 | `b36f874d7` | Four selection consumers restored/posted/staged while unadmitted | 4 files / 40 tests; blanket allow → 12 failures |
| C1 | `f343d3df4` | Client reference API + actor generation + selection interceptor. **DORMANT — See below.** | 9 files / 93 tests; extraction can-fail re-run proved the guard survived the move |
| F1–F5 | `474b3524c` | Second wave of the default-role class: trainer-note privacy fail-open, pain-entry 403, conversation-create 500, untested HR16 cap, nudge audience | 5 files / 37 backend tests + 3 frontend, executed by root |
| G09 routes | `47012147e` | Coach memory service was complete and **unreachable** — no route imported it | 3 files / 48 tests |
| G10 wiring | `c88fa7039` | Nudge engine was green but **unconsumed**; no client could receive a nudge | 2 files / 19 tests; restart proven across 4 separate processes |
| G10 consent | `c6de0d021` | The opt-in key was read by the cron and **written by nothing** | 31 tests; end-to-end control flips the cron predicate |
| P77-B | `d05e9eaa0` | Video queue logged false success; health surface misreported capability; route shadowed | 3 files / 55 tests |
| Docs | `cbb6087ea`, `a261a4fd0`, `8ccaaae71`, `86a68749b`, `ae39d6eba`, `ef2593807`, `b0399b8a6`, `c9f737087`, `040cc5a1a`, `eb5505c3a`, `c6a997a9b`, `88b2074b2`, `0f9a9fd0f`, `4848457d6`, `c4d555c63`, `609182d94`, `6b55f2464`, `26b74cd17`, `e49a51d47`, `88073b79b`, `5a4ea60fa` | The audit, the adjudications, the register, the citation re-anchoring ([80](80-citation-drift-and-reanchoring-20260913.md)), and six corrections. **Do not trust this enumeration — it is a hand-kept list and hand-kept lists are what rotted the citations.** Derive it: `git log --oneline 4345b86cf..HEAD -- docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/` | see each |

## The five-instance root cause — read this before touching any role check

`'user'` is the **default role minted by public self-registration**
(`backend/models/User.mjs:135`) and is client-equivalent per
`backend/utils/clientAccess.mjs:23`. Five places hand-roll `role === 'client'` and
therefore silently exclude the most common account:

1. `clientPhotoRoutes.mjs:75` — photo visibility fail-open (**fixed**, CA-1).
2. `profileController.mjs:598` — profile update fail-closed (**fixed**, CA-2).
3. `clientDataOverviewQueryService.mjs:26` — trainer-note metadata disclosed to the
   default role (**fix in flight**, F1). Worse: `clientDataOverviewPrivacy.test.mjs`
   asserts the *source text* of the broken predicate, so a green test pins the bug.
4. `painEntryRoutes.mjs:35,38,39,40` — `authorize([...'client'])` disagreeing with the
   ownership guard on the same line (**fix in flight**, F2).
5. `coachProactiveNudgeCron.mjs:220,183` — delivery never reaches the default role
   (**fix in flight**, F5).

`aiChatRoutes.mjs:372` is the same class with a different symptom: the default role
gets a **500** creating a conversation (**fix in flight**, F3).

**The durable fix is the shared helper, not six one-line patches.** A repo-wide
guard that fails when a requester-side `role === 'client'` appears would close the
class; two per-route guards already exist for notes and pain entries, which is
precisely why those were fixed and the others were not — the guard was never
generalised.

## What is NOT proven — do not let a later summary imply otherwise

- **C4 and C1 are DORMANT.** `CoachCommandCenter.controller.ts:173-177` passes no
  binding, and nothing registers a selection interceptor or calls
  `commitClientReference`. Neither slice reaches users. **C2 and C3 are NOT
  STARTED**, and C3 is what makes them live. The test that would have caught this
  dormancy cannot exist until C3 does.
- **G10 consent has no frontend consumer** — reachable by authenticated API call,
  not by any button.
- **G09's routes have no UI**; the S9 drawer does not exist. `purgeDueFacts` is never
  called in production, so forgotten rows are never destroyed.
- **No slice ran against real PostgreSQL** except where a slice's own report says so.
  Most verification is mocked-model or in-memory.
- **G11's release gates are all NOT RUN**: all-role/scenario/provider evaluation,
  privacy and provider-boundary evaluation, Redis/restart at integration level,
  migration/restore/rollback, performance budgets, real authenticated role journeys.
- **The production build was never exercised** for the HR16 fix. StrictMode's
  double-invoke is dev-only; the latch defect it exposes is environment-independent,
  but do not call HR16 a production incident without that evidence.
- **Whole-repo baselines are not clean** for reasons predating this session, and
  `known-failing-baseline.json` is stale with five files of **unknown** status.

## Next steps, in the order I would take them

1. **Finish the two in-flight slices** (F1–F5 authorization fixes; C1's Rule-4
   extraction), verify each yourself, and commit.
2. **C2 then C3.** This is the highest-value remaining work: it converts C4 and C1
   from dormant plumbing into a working selection path. When you do C3, the
   acceptance bar is that the binding actually reaches the four C4 hooks, and
   ideally that a test fails if it stops doing so — that is the test that would have
   caught the dormancy.
3. **Generalise the role guard.** One test that fails on a requester-side
   `role === 'client'` in any route or controller closes the class permanently.
   Prefer it as a behavioural sweep over the source-text style; three of this
   session's findings were tests pinning source text, and one of them was pinning a
   bug.
4. **Split the five Rule-4 overflows** (list in the register). Note that the
   frontend pre-commit guard checks the cap on frontend files only, so backend test
   files pass commit-time checks while exceeding it — fixing that gap is worth more
   than the five splits.
5. **Reconcile `known-failing-baseline.json` on a QUIET tree.** Do not grow it. The
   register explains why.
6. **HR13** — gated: it needs an exclusive `useCoachCommand.ts` window, must land
   after C1-C4, and plan 59 marks it "plan only, no implementation enqueue".
7. **G07's residual** (mounted substitution/share integration; exercise-matching
   quality) and **G09's residual** (purge scheduler, T37 conflict writer, memory UI).
8. **G11's release gates.** Then, and only then, talk about release readiness.

## Working rules that earned their place today

- **Re-run the tests yourself.** Every slice this session was verified by root
  executing the suite, not by citing a report. That caught a false regression I
  raised against my own work (a file read mid-edit) and confirmed eleven others.
- **A test that cannot fail is worthless.** Twice, a "verified" guard turned out to
  be untested — including one in root's own committed HR16 work, where deleting the
  retry cap left the suite green.
- **Check the specific claim against its source.** Four of this session's
  corrections were settled in under a minute by reading the packet, the plan, or the
  line the claim pointed at.
- **In a worktree with live writers, one failing run is not evidence.** Re-run before
  attributing. Both Vite failures recorded in the register (INF-1, INF-2) make a
  browser gate fail for reasons unrelated to the change under test.
- **Annotate, do not rewrite** dated records. Every correction in this session left
  the original claim visible next to its correction.
