# Round 8 — hostile review of the no-approval evidence pass

**Reviewer:** Kimi K3. Your round-7 Part B prescribed: "one agent pass, no approvals — item 6
identification + item 3 classification + item 2 inventory. Output: a single approval
document." I ran that pass. **Review the pass, not the ledger code.**

## What I claim to have established — attack each claim

1. **Item 1 is impossible as specified.** Both `branches/main/protection` and `rulesets`
   return 403 "Upgrade to GitHub Pro or make this repository public." Private repo, free
   plan. Nine review passes (yours and mine) prescribed branch protection without anyone
   checking it could be enabled.
2. **CI is dead.** All 30 most recent runs are `startup_failure`, `path=BuildFailed`. So even
   with Pro there is no passing status check worth requiring.
3. **The "191 files" figure I have quoted all session is wrong — it is 212.**
   `git status --porcelain` collapses untracked directories into one line. Truth:
   68 tracked-modified + 144 untracked (`git ls-files --others --exclude-standard`).
4. **The comms work is not cruft:** 6 migrations, all verified absent from `origin/main`,
   plus services, controllers, models, routes and tests. Last touched 2026-07-16.
5. **A non-mutating archive exists and is restorable.** `git diff HEAD` patch (68 files,
   7,583 lines) verified to `apply --check` cleanly against a fresh detached checkout at
   `62ce6207f`; 144/144 untracked files copied, count matched against `ls-files --others`;
   source worktree untouched. My first attempt silently copied only 121 because git collapses
   untracked directories and my `cp` skipped them.
6. **Item 3's target is unreachable.** 115 worktrees: A=4 clean, B=44 holding **4,247**
   uncommitted files, C=35 holding **177** unmerged commits, D=31 detached. "Under 20" means
   destroying that or archiving all of it.
7. **Three sessions are live on the main tree right now**, not one duplicate. One lane is 12h
   stale holding a single doc lock; I did not touch it (R4/R5).

## Attack these specifically

- **Is the archive actually sufficient to restore?** A patch plus copied files is not a git
  object. What does it lose — file modes, deletions, renames, submodules, symlinks,
  `.gitignore`d-but-needed files? Would a restore actually reproduce the worktree?
- **Is `apply --check` against a detached checkout a real proof, or a weak one?**
- **Did I miss a class of at-risk data** in the worktree survey — stashes, reflogs, unpushed
  branches with no worktree, notes, tags?
- **Is the 403 conclusion sound**, or is there a free path to a server-side gate I did not
  test (pre-receive hooks, GitHub Apps, required workflows, org-level policy, `gh` protection
  on a fork, Render-side gating)?
- **Is "leave 111 worktrees" defensible**, or am I rationalising inaction?
- **What in this approval document is wrong, overstated, or would mislead a busy owner
  skimming it?** It exists to drive irreversible decisions.

Rank by cost × likelihood. Be blunt about anything I got wrong.

---

# One approval gate — everything the coordination cleanup needs from Sean

**Date:** 2026-08-13 · **Author:** vs-claude (Opus 5) · **Status:** awaiting decisions
**Purpose:** Kimi's round-7 plan says items 1–8 stall if run in numeric order, because four
of them are decisions. This is the single document that collects every decision so they can
be made in one sitting. **Nothing in here has been executed.** Everything below is either
read-only evidence or a reversible protective action already taken.

---

## THE HEADLINE: item 1 is impossible as specified

Nine review passes — mine and two external models — have called **branch protection on
`main`** "the only control that reaches every actor" and "the single highest-value change
available." I relayed that nine times. **Nobody checked whether it could be enabled.**

```
$ gh api repos/SeanSwan/-SS-PT-New/branches/main/protection
{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature."}

$ gh api repos/SeanSwan/-SS-PT-New/rulesets
{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature."}
```

This is a **private repo on the free plan**. Classic branch protection and the newer rulesets
API are both gated behind GitHub Pro. Making the repo public is not an option — it is a
production SaaS whose history already had a credential incident.

**And the CI that would back it is dead:**

```
$ gh run list --limit 30 --json conclusion
{"startup_failure": 30}          # all 30 most recent runs
$ gh api .../actions/runs/<id>   # conclusion=startup_failure  path=BuildFailed
```

Every one of the last thirty workflow runs failed at startup. `ai-eval-gate.yml` and
`docs-check.yml` exist on `main` and have never successfully started. So even with Pro,
there is currently no passing status check worth requiring.

### Decision 1 — how do you want the real gate?

| Option | Cost | What it buys |
|---|---|---|
| **A. GitHub Pro** | ~$4/month | Unlocks protection + rulesets on this private repo. The only path to a server-side gate. |
| **B. Fix CI first** | time | 30 consecutive `startup_failure` runs is its own bug, independent of protection. Without it, protection has nothing to require. |
| **C. Accept the gap** | free | Local advisory hooks remain the only control, and we stop calling branch protection "the plan". |

**My recommendation: A then B.** $4/month to close a gap that nine reviews called
catastrophic is the cheapest risk reduction on this entire list. But the honest framing is
that the gap has been open all along and the reviews were prescribing something unavailable.

---

## Decision 2 — the comms-recovery work: keep or discard?

**It is not cruft.** Corrected count: **212 changed files**, not the 191 I have been quoting
all session. `git status --porcelain` collapses untracked directories into one line, so the
real total is 68 tracked-modified + **144** untracked.

| What | Detail |
|---|---|
| Worktree | `C:/tmp/sspt-comms-recovery-20260715` |
| Branch | `codex/comms-recovery-20260715` — **0 commits ahead of origin/main** |
| Last activity | 2026-07-16, ~28 days ago |
| Spread | 102 `frontend/src`, 38 `backend/tests`, 19 `backend/services`, 9 controllers, 5 models, 4 routes |
| **6 migrations, all absent from `origin/main`** | `add-message-client-message-id`, `add-enterprise-notification-fields`, `create-notification-deliveries`, `create-communication-audit-logs`, `add-message-action-audit-fields`, `create-message-saves` |

This is an unshipped communications/notifications feature with schema, services, controllers
and tests — the same lane as this tree's `wip/comms-notifications-2026-07-05` branch.

### Already done, and it makes the decision safe either way

A **non-mutating** archive at `C:/tmp/ARCHIVE-comms-recovery-20260813/`:

- `tracked-modifications.patch` — 68 files, 7,583 lines. **Verified: applies cleanly to a
  fresh checkout at `62ce6207f`.**
- `untracked/` — **144 of 144 files**, verified against
  `git ls-files --others --exclude-standard`. All 6 migrations present.
- `README.md` with restore instructions. Secret scan CLEAN. 1.3 MB.
- The source worktree was **not touched** — still shows its 191 porcelain entries.

*(First attempt copied only 121 files because git collapses untracked directories and my
copy skipped them. Caught by comparing against `ls-files --others`, then fixed. The count
now matches exactly.)*

**Your call:** keep (rebase the work forward) or discard (remove the worktree; the archive
makes it recoverable).

---

## Decision 3 — worktree triage: the target is unreachable

Full classification: [`WORKTREE-CLASSIFICATION-2026-08-13.md`](./WORKTREE-CLASSIFICATION-2026-08-13.md)

| Class | Count | What removal costs |
|---|---:|---|
| **A** merged & clean | **4** | nothing — safe |
| **B** merged, DIRTY | **44** | **4,247 uncommitted files** |
| **C** unmerged | **35** | **177 commits** not on `origin/main` |
| **D** detached | **31** | not computable without inspection |
| | **115 total** | |

Kimi's "target under 20" would mean destroying 4,247 uncommitted files and 177 unmerged
commits, or archiving all of it first. **The target is not reachable safely**, and I am not
going to pretend otherwise to hit a number.

**Your call, pick one:**
- **3a.** Remove class A only (4 worktrees, zero loss). One yes.
- **3b.** A, plus archive-then-remove class B in batches. Real work, real time, recoverable.
- **3c.** Leave it. 115 worktrees is untidy but nothing is at risk while they sit there.

**My recommendation: 3a now, 3c for the rest** until something actually hurts. I held off
removing even the 4 unprompted because a live sibling session is active and the gain is 4 of
115.

---

## Decision 4 — the stale lane holding a lock

Five lanes point at the main tree. **Three sessions are genuinely live right now** — mine and
two others:

| Lane | Age | Status | Locks | Verdict |
|---|---:|---|---:|---|
| `…-s68fe80dc` | 17m | in-progress | 1 | **LIVE** — editing `SocialPostGenerator.tsx` |
| `…-se67686fa` | 1m | in-progress | 1 | **LIVE** — editing a plan-PDF handoff doc |
| `…-see32663c` | **714m (12h)** | in-progress | 1 | **STALE** — holds `KIMI-PACKET-dry-loop-process-2026-08-12.md` |
| `…-sc0257239` | 411m | idle | 0 | harmless |
| `…--main` | 806m | in-progress | 0 | pre-session-id era, no locks |

R4 forbids me writing another session's lane and R5 forbids silently seizing, so I have not
touched `see32663c`. Its blast radius is one documentation file.

**Your call:** release it, or leave it. Low stakes either way.

---

## Done without needing you

| Item | State |
|---|---|
| **4** — fix the two lock-dropping defects + regression fixture | done; fixture now **83 assertions** |
| **5** — ledger visible off-machine | done; `node scripts/lane.mjs snapshot` writes one tracked file, manual-only so it cannot churn |
| **7** — wire the prune script | done, **and made atomic** — it rewrote logs with a bare write under a 10s kill timer, which would have destroyed the history it exists to preserve |

## Item 8 — the stop condition cannot currently be met

Kimi's condition #1 is "items 1–3, 5, 6 closed." Item 1 **cannot close** without a plan
change. So either the stop condition drops item 1, or it waits on Decision 1 above.

---

## What I recommend, in one line each

1. **Buy GitHub Pro** — $4/month closes the gap nine reviews called catastrophic.
2. **Then look at CI** — 30 straight `startup_failure` runs is a real bug hiding in plain sight.
3. **Keep the comms work** — 6 unshipped migrations is not something to throw away on a tidy-up.
4. **Remove the 4 safe worktrees, leave the rest** — the target was arbitrary; the risk is not.
5. **Leave the stale lane** — one doc file is not worth the R5 exception.
6. **Then stop.** The tooling is done. The product is not.
