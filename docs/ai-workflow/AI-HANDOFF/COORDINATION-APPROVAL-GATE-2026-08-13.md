# One approval gate — everything the coordination cleanup needs from Sean

**Date:** 2026-08-13 · **Author:** vs-claude (Opus 5) · **Status:** awaiting decisions
**Purpose:** Kimi's round-7 plan says items 1–8 stall if run in numeric order, because four
of them are decisions. This is the single document that collects every decision so they can
be made in one sitting. **Nothing in here has been executed.** Everything below is either
read-only evidence or a reversible protective action already taken.

---

## DECISION 0 — 383 commits exist only on this laptop

This was not on anyone's list. It surfaced only because the round-8 review prompt asked me
what class of at-risk data the worktree survey had missed, and I went looking.

```
$ git log --oneline --branches --not --remotes | wc -l
383                                    # commits on local branches that are on NO remote
$ git for-each-ref refs/heads --no-merged origin/main | wc -l
99                                     # local branches not merged into origin/main
$ git log --branches --not --remotes --format=%cs | sort | sed -n '1p;$p'
2025-02-18                             # oldest
2026-08-12                             # newest — yesterday
```

Plus **5 stashes** (oldest 2025-08-02) and **3 local tags** with no remote.

Eighteen months of work whose only copy is this machine's disk. The worktree survey could not
see any of it, because it only walks branches that *have* a worktree — and the most at-risk
branches are precisely the ones nothing surfaces.

**This dwarfs everything else on this page.** 4,822 uncommitted files in worktrees are at
least visible on disk and mostly scratch; 383 commits with no remote are finished work that a
disk failure erases.

### I ran the secret scan first, and the answer is NO — do not push

I was about to recommend `git push origin --all`. I scanned first because this repo had a
credential incident, and the scan **found credential shapes at ~13 locations across 9 files**
in that unpushed history:

```
STOREFRONT_DEBUG_GUIDE.md                             backend/routes/api.http
TESTING_GUIDE.md                                      backend/scripts/deprecated/reset-db-manual.mjs
backend/database.mjs                                  backend/scripts/dev-tool-connection.mjs
backend/mcp_server/gamification_mcp_server/utils/config.py
backend/mcp_server/workout_mcp_server/utils/config.py
frontend/src/utils/dev-auth-helper.ts
```

Shapes matched: `postgres-url`, `jwt-token`, `rotated-password-shape`. Values deliberately not
reproduced anywhere in this document. Dates cluster around **May 2025** — *before* the
2026-04-19 remediation in which every credential was rotated and 2,179 commits of history
were rewritten specifically to purge this content.

**So a blanket backup push would re-publish to GitHub the exact class of content that a full
history rewrite was performed to remove.** The credentials are very likely already rotated,
which lowers the severity — but it does not make republishing them a good idea.

**Corrected recommendation: do NOT `push --all`. Use a git bundle — and it is already built
and verified.**

A bundle is exactly what a push would transfer, written to a file instead of a server. Full
git objects, full fidelity, self-verifying, publishes nothing.

`C:/tmp/SWANSTUDIOS-FULL-BACKUP-20260813-v3.bundle` · 552 MB · `git bundle verify` → *"records
a complete history … is okay"*

| Verified by cloning it and checking membership | Result |
|---|---|
| Machine-only commits | **387 checked, 0 missing** |
| Stashes | **5 of 5** |
| Worktree HEADs (incl. one reachable from no ref at all) | **105 of 105** |
| Tags | **4 of 4** |
| Real `git clone` from it | working tree, 395 branches |

**`--all` alone was not enough, and I only know that because I tested it:** the first bundle
silently dropped a detached commit reachable from no ref (`2b1a03fd0` — the class that dies on
`gc` after reflog expiry), and the second dropped **4 of 5 stashes**, because only the current
`refs/stash` is a ref. The working command names worktree HEADs and stash commits explicitly.
Full procedure and limits: [`BACKUP-383-COMMITS-RUNBOOK-2026-08-13.md`](./BACKUP-383-COMMITS-RUNBOOK-2026-08-13.md)

**What you do — 3 minutes:** copy that file somewhere that is not this disk. Until then the
backup and the thing it protects share a failure mode, which is not a backup. Treat it as
sensitive: it contains the same old credentials that make pushing unsafe.

Alternatives considered and rejected: `push --all` (republishes credentials); selective push
after per-branch triage (real work — I confirmed that excluding the obvious branch does *not*
clear the scan); copying `.git` (works, but 105 live worktrees make it awkward and it is not
self-verifying); doing nothing (383 commits one disk failure from gone).

*(Correction worth recording: mid-investigation I concluded all three initial hits sat on one
branch called `test` and that excluding it would make the rest safe. That was wrong — `test`
is already on the remote, and the wider set still trips the scanner at ten more locations. I
verified the exclusion instead of assuming it, which is the only reason the error lasted
minutes rather than reaching you as advice.)*

---

## THE HEADLINE OF THE ORIGINAL LIST: item 1 is impossible as specified

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

Every one of the **thirty most recent** workflow runs failed at startup (older history not checked). Thirty consecutive `BuildFailed` is also consistent with a single malformed workflow file, which would make option B far cheaper than it looks — I did not diagnose the cause. `ai-eval-gate.yml` and
`docs-check.yml` exist on `main` and have never successfully started. So even with Pro,
there is currently no passing status check worth requiring.

### Decision 1 — how do you want the real gate?

| Option | Cost | What it buys |
|---|---|---|
| **D. Turn off Render auto-deploy on `main`** | **free** | **Severs push → production.** `render.yaml` never sets `autoDeploy`, so it defaults to **on**: every push to `main` deploys *and* runs `npm run migrate:production`. Setting `autoDeploy: false` means a push can no longer migrate your database — you press deploy in Render instead. It does not stop pushes; it stops them from mattering. |
| **A. GitHub Pro** | ~$4/month | Unlocks protection + rulesets. Stops the push itself, and reaches `gh pr merge`, the API, and off-machine agents. |
| **B. Fix CI** | time | 30 consecutive `startup_failure` runs is its own bug. Without it, protection has nothing to require — but it may be one malformed YAML file. |
| **C. Accept the gap** | free | Advisory hooks only, and we stop calling branch protection "the plan". |

**My recommendation: D first, then A, then B.** D is free, in-repo, and closes the *actual*
catastrophic path — an unreviewed push running migrations against production — which is the
specific scenario that started this entire workstream. A is the broader gate and worth $4.
D and A are complementary, not alternatives, and D is the one I would not have found without
the reviewer pushing me to ask "can we gate the deploy?" rather than "can we gate the push?"

**Not done:** flipping `autoDeploy` changes how you ship. Today you deploy by pushing to
`main`; afterwards you press a button. That is your workflow, so it is your call.

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
- `README.md` with restore instructions. Secret scan (`scripts/scan-secrets.sh`) CLEAN. 1.3 MB.
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
| **B** merged, DIRTY | **44** | **4,822 uncommitted files** |
| **C** unmerged | **35** | **177 commits** not on `origin/main` |
| **D** detached | **31** | not computable without inspection |
| | **115 total** | |

Kimi's "target under 20" would mean destroying 4,822 uncommitted files and 177 unmerged
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

Five lanes point at the main tree. **Three sessions were recently active** — mine and
two others:

| Lane | Age | Status | Locks | Verdict |
|---|---:|---|---:|---|
| `…-s68fe80dc` | 17m | in-progress | 1 | recently active — `SocialPostGenerator.tsx` |
| `…-se67686fa` | 1m | in-progress | 1 | recently active — plan-PDF handoff doc |
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
