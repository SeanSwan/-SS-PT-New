# Keep, discard, or already-superseded? The comms lane, with evidence

**For hostile review.** Sean's question, verbatim: *"see if we were able to keep anything or
if it's worth keeping anything or if we've already upgraded over this, etcetera, or if
there's another agent working on this lane."*

Everything below is measured this session, commands shown. **Attack the reasoning, not the
formatting.** I have been wrong twice today in ways an external reviewer caught, so assume
the same rate here.

---

## 0. What "this work" actually turned out to be

I started assuming this was one archive of 212 files (the open "Decision 2"). It is not. It
is **three overlapping things** that I had been conflating:

| # | Thing | Where | Size |
|---|---|---|---|
| 1 | Branch `wip/comms-notifications-2026-07-05` | this working tree | **97 commits** not on `main`, **74 unpushed** |
| 2 | Codex's recovery worktree | `C:/tmp/sspt-comms-recovery-20260715` | **212 uncommitted entries** (144 untracked + 68 modified) |
| 3 | Uncommitted work in *this* tree | here | **1,146 entries** |

`git rev-list --left-right --count origin/main...HEAD` → `1838  97`.
This branch is **1,838 commits behind main** and 97 ahead.

---

## 1. Is any of it already on main? (cherry-equivalence, not guesswork)

```
git cherry origin/main HEAD
  already upstream (-): 25
  unique to branch (+): 72
```

The 25 that landed are the recent ones — swan-scout, swan-collect, marketing/social
publishing fixes, the SWA-92 migration, backup verification. **That work is safe; it is on
main.**

The 72 that did not land, by added-file supersession
(`git cat-file -e origin/main:<path>` for every file the 72 commits add, `MSYS_NO_PATHCONV=1`
so the Git-Bash path-translation false-negative cannot lie):

```
files added by the 72 branch-only commits: 1,187
  already on main : 437
  absent from main: 750
```

Absent-from-main by category:

| Count | Category | Verdict |
|---|---|---|
| 462 | docs | mostly historical ledgers; low loss |
| 89 | frontend components | unassessed |
| 91 | backend services/jobs/other | **real** |
| 36 | `.codex-*.patch`, `.tmp_world_*.py`, `apex-branch.diff` | **scratch — discard** |
| 33 | scripts | audit family |
| 9 | migrations | **schema — real** |
| 9 | backend routes/controllers | **real** |
| 5 | backend models | **real** |
| 1 | skills | `drift-check` etc. |

**Note: nine migrations, not the six I have been telling Sean.** Three more
(`trainer-applications`, `price-change-logs`, `locations`) belong to other lanes that got
committed onto this same branch.

---

## 2. "Have we already upgraded over this?" — the only question that needed real work

Path-existence cannot answer this; main could solve the same problem under a different name.
So I searched main's tree by concept.

**Notifications — YES, superseded, and by a NEWER, DIFFERENT design.**

Main has:
```
backend/models/Notification.mjs
backend/models/NotificationReadState.mjs
backend/migrations/20260804234500-create-notification-read-state.cjs   <- 2026-08-04
backend/migrations/20260804040000-notifications-type-enum-add-missing-labels.cjs
```
The branch has `NotificationDelivery.mjs` + `20260630060000-create-notification-deliveries.cjs`
— **2026-06-30, five weeks older.** Main chose a read-state model; the branch chose a
delivery-ledger model. These are not the same design and I do not think they merge cleanly.

**Everything else — NO, not superseded. Genuinely absent from main:**
- Gym-ops SWA-74: `Location.mjs`, `gymPolicy.mjs`, `locationController.mjs`, DST-safe zoned
  time, `20260728100000-create-locations.cjs`. Main has **zero** location concept
  (grep for `location` on main returns only pip vendor files and session-allocation).
- Trainer economics SWA-62: `TrainerApplication.mjs`, `PriceChangeLog.mjs`,
  `trainerContract.mjs`, `economicsFlags.mjs`. Main has **none** of these.
- `CommunicationAuditLog.mjs`, message-saves. Absent.
- Audit-script family (`audit-model-health`, `audit-named-exports`, `audit-write-paths`).
  Absent — only `check-main-parity.mjs` landed.
- Skills `drift-check`, `fable-blueprint-forge`, `align`, `fab-sol`, `story`. Absent from
  main, **but demonstrably live here — the drift-check hook fired at this session's start.**

---

## 3. "Is another agent working on this lane?" — yes, and it stalled

`.ai-workflow/coordination/codex-comms-recovery.lane.md`:

```
Status: IN PROGRESS
Updated: 2026-07-15T22:00:00Z          <- 28 days ago
Task: Recover the June 30-July 1 communications system onto current origin/main;
      stop before main push
Worktree: C:/tmp/sspt-comms-recovery-20260715
Branch:   codex/comms-recovery-20260715
```

So the 212 files are not an orphan pile — they are **Codex's half-finished port of the comms
system onto main**, abandoned mid-flight and still flagged IN PROGRESS.

**Is Codex there now? No.** Current live locks (session-start hook, ≤40m old):
- `codex` → `cost-gate.mjs`, `recursive-consensus.mjs`, `validation-orchestrator.mjs`
- `vs-claude--main-s548462c3` → `WorkoutLogger`, `aiChatRoutes.mjs` (Swan Coach V3)

Neither touches comms. **No live conflict.** The lane file is a 28-day-stale ghost that per
Rule 67 R5 must not be silently seized.

---

## 4. Where I corrected myself mid-analysis

I formed the hypothesis: *"the 212 files are uncommitted, so no bundle or push can carry
them — they exist only in a volatile C:/tmp directory."* That would have been a five-alarm
finding.

**It is wrong, and I tested it instead of shipping it.**

```
144 untracked (??) + 68 modified ( M) = 212
probe of the ?? files → IN-HISTORY (all sampled)
```
The untracked files are untracked *in that worktree* because the worktree is based on
`origin/main`, where they do not exist. They are **committed on the wip branch.** Recoverable.

The genuinely unique, commit-less content is the **68 modified files** — Codex's integration
deltas, the work of adapting June-30 code to current main. That is `326 KB` in
`C:/tmp/ARCHIVE-comms-recovery-20260813/tracked-modifications.patch`.

**So the at-risk set is 68 files of integration work, not 212 files of features.** Much
smaller, and already archived.

---

## 5. My recommendation (attack this)

| Lane | Call | Why |
|---|---|---|
| Comms/notifications port | **DISCARD the port, keep the archive** | Main moved to a different, newer design (read-state vs delivery-ledger). Landing a 5-week-old competing design onto a tree 1,838 commits ahead is a merge-conflict generator with a schema migration attached. |
| Gym-ops SWA-74 | **KEEP — cherry-pick to main** | Not superseded. Self-contained: model + migration + config + controller. |
| Trainer economics SWA-62 | **KEEP — but re-verify** | Not superseded, touches the money path; commission drift fix must be re-tested against current main. |
| Audit scripts + `drift-check` | **KEEP — highest value/lowest risk** | Pure tooling, no schema, no runtime. `drift-check` is proving itself every session. |
| 462 docs | **KEEP cheaply** (they cost nothing) | |
| 36 scratch files | **DISCARD** | `.codex-*.patch`, `.tmp_world_*.py` should never have been committed. |

**Ordering:** tooling first (zero risk), gym-ops second (self-contained), economics third
(money path, needs tests), comms never.

**Standing risk regardless of the above: 74 unpushed commits.** They are in the Z: bundles,
so not unbacked — but a bundle is a cold archive, not a remote.

---

## 6. Questions I want attacked

1. **Is "discard the comms port" right, or am I discarding five weeks of work because
   merging is unpleasant?** The counter-case: main's `NotificationReadState` may be a *thinner*
   feature than the branch's delivery ledger + audit log + retry worker, in which case main
   has not "upgraded over" it — it has solved a *smaller* problem, and I would be throwing
   away the bigger one.
2. **I only checked supersession by file existence and one concept grep.** Both are weak
   instruments. What would actually prove supersession?
3. **Does "not superseded" imply "should land"?** Gym-ops and trainer-economics have sat
   unlanded for two weeks. Absence from main might be a *decision* someone made, not an
   accident, and I have no evidence either way.
4. **Am I under-weighting the 1,838-commit gap?** Every "cherry-pick to main" above assumes
   these patches still apply. I have not tested a single one.
5. The stale `codex-comms-recovery` lane says IN PROGRESS. **Who is allowed to close it?**

---

## 7. POST-REVIEW CORRECTIONS — Kimi K3 was right; section 5 is retracted

Kimi's review (`KIMI-COMMS-LANE-REVIEW-2026-08-13.md`, $0.0828) found the third
weak-evidence-as-proof citation, and it was the load-bearing one. Every check below was run
after the review. **Section 5's table is superseded by this section.**

### 7.1 "Notifications are superseded" — FALSE. Retracted.

Kimi demanded a schema-expressiveness test instead of filename/date proxies. Run:

| | main `NotificationReadState` | branch `NotificationDelivery` |
|---|---|---|
| scope | `adminId` — admin alert triage | `userId` + `notificationId` — end-user delivery |
| fields | refType, refId, readAt, archivedAt, claimedAt, snapshot | channel, status, attemptCount, lastAttemptAt, providerMessageId, errorCode, errorMessage, metadata |

Main's `Notification.mjs` is `title, message, type, read(bool), persistent, link, image,
userId, senderId`. **In-app only, with a boolean read flag.**

```
providerMessageId -> 0 files on main
deliveryStatus    -> 0 files on main
retryWorker       -> 0 files on main
DELIVERY_CHANNELS -> 0 files on main
```

These are **not competing designs — they are disjoint**. Main tracks *which admin read which
alert*. The branch tracks *whether a notification actually reached a user, over which channel,
and why it failed*. Main's schema cannot express a delivery attempt at all. There is no subset
relation, so "superseded" is false. **Main solved a smaller, different problem.** My Q1
counter-case was the correct reading and I recommended DISCARD against it anyway.

### 7.2 Was the work deliberately rejected? NO — it was never seen.

```
git log origin/main --diff-filter=D -- <each model>   -> never-existed (all 6)
git log origin/main -i --grep='NotificationDelivery|delivery.ledger'  -> empty
```
No deletion, no decision record. **Absence from main is not a decision.** This removes the
Q3/Finding-4 concern for gym-ops and economics: nobody rejected them.

### 7.3 Do the patches still apply? MOSTLY NO — and this kills "cherry-pick to main"

Kimi's Finding 2 said this was untested. It was, in a throwaway worktree at `origin/main`.
My first attempt cherry-picked each commit **in isolation**, which is an invalid test —
a round-11 fix conflicts without its base. Re-run **cumulatively, in commit order**:

| Lane | Result |
|---|---|
| `drift-check` hook | **CLEAN — applies** |
| gym-ops SWA-74 | 1/5, stops at `0faad283a` |
| trainer-econ SWA-62 | **0/4**, stops at the very first commit |
| audit scripts | **0/5**, stops at the first commit |
| schema SWA-87 | **0/1** |

**"Tooling first, zero risk" was asserted and is false.** Across a 1,838-commit gap only the
single self-contained hook survives a clean pick. Everything else needs re-implementation
against current main, not a cherry-pick.

### 7.4 Backup claim — now with the command Kimi demanded

```
git bundle verify Z:/SwanStudios-Backups/SS-PT-full-20260813T100002Z.bundle  -> okay
git bundle list-heads <same>  -> 5caa8ea51... refs/heads/wip/comms-notifications-2026-07-05
```
Branch tip **is** in the newest nightly bundle as a head. The 74 unpushed commits are backed
up. (The bundle also shows `origin/wip/...` at `409b90d41`, confirming the 74-commit gap.)

### 7.5 Corrected verdicts

| Lane | OLD (wrong) | CORRECTED |
|---|---|---|
| Comms/notifications | DISCARD | **KEEP — not superseded; main has no delivery/retry at all. Escalate to the lane owner (Rule 67 R5), do not unilaterally kill.** |
| Gym-ops SWA-74 | KEEP, cherry-pick | **KEEP — but re-implement; only 1/5 picks apply** |
| Trainer econ SWA-62 | KEEP, cherry-pick | **KEEP — 0/4 apply; money path; full re-verify against main** |
| Audit scripts | KEEP, "zero risk" | **KEEP — 0/5 apply; the "zero risk" label was wrong** |
| `drift-check` hook | KEEP | **KEEP — the one thing that is genuinely cheap to land** |
| 462 docs | "cost nothing" | **Keep on branch.** Kimi is right that landing stale ledgers poisons future greps. |
| 36 scratch files | DISCARD | **DISCARD — unchanged, the one call that survives** |

**Bottom line: nothing here is safe to discard, and nothing except the drift-check hook is
cheap to land.** The honest state is not keep-vs-discard — it is *this work needs
re-integration, and the only question is whether it is worth the hours.*

Kimi's remaining open item, not run: the blob-hash recount of section 1's 437 "already on
main" files (path equality is not content equality). It affects the accounting narrative,
not any lane verdict.
