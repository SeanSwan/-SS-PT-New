# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/COORDINATION-LEDGER-HOSTILE-REVIEW-PACKET-2026-08-11.md
**Seed:** (none)
**Tokens:** 3595 in / 14097 out | **Cost:** ~$0.0080 | **Wall:** 116.3s | **finish_reason:** stop

---

# Hostile Review — LCL / Rule 67 Upgrade

No praise. The system is a Markdown file with aspirations of being a distributed lock service, and §4 mostly automates the wrong parts while leaving the catastrophic gap (push-to-main) only half-closed.

---

## Q1 — Break §4 (attack hardest)

### 4.1 — "One canonical ledger via `git-common-dir`" converts silent isolation into active misinformation
- **Resolution is underspecified and likely still broken.** `git rev-parse --git-common-dir` returns a *relative* path in many git versions and for linked worktrees (e.g. `../..` relative to the worktree's own `.git`). Naively concatenating `<git-common-dir>/../.ai-workflow/coordination/` without `realpath`/`--path-format=absolute` resolves relative to `cwd` — which is the worktree. For a deeply nested worktree (`/repo/worktrees/wt`) the relative path lands in the wrong place. You have not proven the path is absolute. Until you do, 4.1 is F1 with extra steps.
- **The clobbering trap (the real regression).** The schema uses **one lane file per agent name** (`claude.lane.md`). F1 already shows parallel sessions: `ss-build-swan-lens`, `ss-launch-audit`, `sspt-recursive-audit`, etc. If all Claude sessions write `claude.lane.md`, **last writer wins and every other session's locks vanish**. Today the fork at least isolates each session's (wrong) view. 4.1 merges 184 sessions into a handful of name-keyed files that *actively overwrite each other*. The lock list becomes a lie: it shows one session's locks, not the union. An agent reads `claude.lane.md`, sees file A free, edits it — while another Claude session in a different worktree has A locked. **You have engineered a false-negative collision detector.** This is worse than F1.
- **"Merge orphaned content forward" is a phantom task.** By whom? An agent, manually, mid-session, with no owner of the 184-worktree cleanup. It will never happen. You've added 9+ dead files to the noise floor and called it remediation.

### 4.2 — The `agent-lane` skill is prose wearing a hook's clothes
- A skill is **model-executed**. F2's own doctrine: *"a duty enforced only by the model remembering is a duty that will eventually be dropped."* 4.2 piles on more vocabulary (delivery states, push checklist) for the model to forget. Without 4.3 it does nothing; with 4.3 it is redundant.
- **Ergonomics:** "read all lanes + locks + sentinel digest, then publish an opening claim before the first edit." At session start with 10 lanes + 225 dirty + 176 untracked, this is a ~400-line context dump *before any work*. Agents will skim it. The opening claim degrades into a ritual checkbox — compliance theater.

### 4.3 — Gates: one is a firehose, one is an after-the-fact nag with a bypass, one is bypassable
- **SessionStart digest "never blocks" + prints everything = pure noise.** When a gate never blocks, the agent learns to treat it as boilerplate. The one signal that matters — *"Agent X is editing the file you're about to touch"* — drowns in 400 lines of dirty-file inventory. Firehose fatigue guarantees the real warning is missed.
- **Stop hook `lane-freshness-gate` is the worst component in §4.** Threshold *"≥2 non-emission files"* is arbitrary: fixing two typos, writing a test+config, creating two new files → **block**. False positives are guaranteed on routine work. The *"escape hatch: `LANE: N/A — <reason>`"* is fatal: any annoyed agent types `LANE: N/A — routine` and the gate passes. Worse, it fires at **Stop — after the files are already written**. It cannot prevent the edit; it nags post-hoc. A gate that nags after the fact, blocks on a wrong threshold, and ships its own bypass **will be disabled within a week**, and its removal will be celebrated. You will then believe "coordination is enforced" when it is not.
- **PreToolUse push gate is bypassable and unimplementable as written.** *"Block a push to main carrying migrations unless the owner has explicitly approved in-session."* A PreToolUse hook **cannot read the conversation** to know the owner approved. No flag file, env var, or state mechanism is specified — so it either always blocks (every legit deploy fails → disabled) or never blocks (useless). And it only watches the Bash `git push` string. Bypass is trivial: `git -c core.hooksPath=/dev/null push`, `gh repo sync`, the GitHub MCP, or a Node script that shells `child_process.exec('git push')`. The gate is blind to all of them.

### 4.4 — Schema v2: computed fields that are stale by construction
- *"Delivery: … computed, not asserted"* but the lane is **written by the agent**. The SessionStart digest computes delivery at start; the agent commits mid-session; the lane's `Delivery` field is wrong until next session. If the agent copies the computed value into the lane, it is now asserted again — defeating the design.
- *"Blast radius: … IRREVERSIBLE"* is **agent-asserted**, not computed. The agent writes `reversible` on a migration; does the push gate trust the lane or recompute? Unspecified. You have a field that *looks* machine-checked but is human-asserted — the most dangerous kind of false confidence.

### 4.5 — Tracked append-only `DELIVERY-LOG.md` will conflict constantly
- *"Append-only one-liners rarely conflict"* is false at this scale. 184 worktrees, frequent deliveries, all appending one **tracked** file = routine merge conflicts on every pull/push. You have moved the F1 fork problem into git history. And it is tracked, so off-machine agents see delivery but **not live locks** — F7 (live invisibility) is not solved, only post-hoc visibility is.

### 4.6 — Sentinel glob is fine; the report volume is the problem
- Globbing `*.lane.md` fixes F5. But with 184 worktrees and centralized lanes (4.1), the sentinel will emit dozens of stale/orphan warnings. Report-only = more noise on the firehose. No action follows, so the signal decays.

---

## Q2 — What §3 missed (silent failures)

- **Semantic / cross-file collision.** Locks are file-grained. Agent A migrates `backend/migrations/123.js` (adds column); Agent B edits `frontend/App.tsx` consumer expecting the old shape. Neither file is locked by the other. Locks and git both miss this. This is exactly the class that bit you in §2 (praised a deleted service) — and §4 does nothing for it.
- **TOCTOU on the lock file itself.** Markdown has no mutex. Agent reads lane (file A free) → before it writes, another agent locks A. Two agents can both decide "A is free" in the same second. Advisory locks have no time-of-check/time-of-use safety.
- **Stale lock from a killed session.** Agent claims `🔒 A`, then crashes before R3 release. Lock persists. R5 says "flag owner, never silently seize" → A is blocked 30 min minimum, then needs human intervention. Across 184 worktrees this is constant progress loss.
- **Human-as-unnamed-agent.** The owner edits files too. If the human publishes no lane, every agent lock calculation is missing one writer. Silent human/agent collision.
- **Branch base drift.** Agent branches from `main@X`; another force-pushes `main` to `Y`. Agent's branch is now on stale base. Ledger tracks no "base SHA." Silent divergence until a nasty merge.
- **Committed-but-wrong-branch celebrated as delivery.** §2's lesson was *committed ≠ delivered*. But if 4.5 logs "delivered" on a local commit, the system will congratulate work that never reaches its reader. The delivery log can itself become the §2 failure.
- **Review-queue starvation.** R7 requires the *other* agent to return a verdict. If they're busy/offline, the slice sits "complete" but unreviewed. No SLA, no escalation. Silent quality gap that ships.
- **Hook fail-open vs fail-closed ambiguity.** If `lane-freshness-gate` throws (missing dep, syntax), does it block or pass? Unspecified. Fail-open = silent bypass; fail-closed = spurious block → disabled. Either way, silent.
- **Identity collision.** `claude.lane.md` assumes one Claude. Two Claude sessions both believe they own it. 4.1 makes this a write-war, not a fork.

---

## Q3 — Is a lock-based model even right here? (strongest case against)

**No. Advisory locks are the wrong primitive for this workload, and §4 doubles down on them.**

1. **A lock system is only as safe as its least-compliant participant — and you can never prove compliance.** In a non-deterministic multi-agent setup, R1 (read-before-edit) cannot be guaranteed. One skipped read = collision. The lock system provides safety *only when everyone obeys* — which is exactly when you don't need it. It manufactures confidence, not safety.
2. **Pessimistic locks kill throughput; the failure mode is worse than the disease.** With 184 worktrees, file-grained locks mean constant waiting or routing-around. The "never silently seize" rule means a stale lock blocks a file for 30 min + owner ping. Agents will either (a) ignore locks when "sure," or (b) spam the owner. A **false lock** (stale, blocks progress, needs human) is more expensive than a **false collision** (git merge conflict — local, recoverable, cheap). The lock model's failure mode is worse than the problem it solves.
3. **Locks solve neither of the two real problems.** (a) Edit collision is already solved by git/worktrees + merge conflicts. (b) Semantic awareness (§2's deleted-service blindspot) is a *communication* failure, not a lock failure — locks don't catch it. §4's upgrade is solving the wrong problem with more locks.
4. **Optimistic detection beats pessimistic locking here.** Work is already isolated in branches/worktrees. Invest in merge-time conflict detection, semantic-diff review, and **deployment gating independent of agent coordination**. Detect-and-reconcile is cheaper than prevent-and-block when collisions are rare but false-locks are constant.
5. **Hard partitioning already exists.** 184 worktrees *is* per-agent isolation. The actual risk is shared *deployment* and *repo state*, not shared *tree*. Fix that with branch protection + deploy gates, not lane files.

---

## Q4 — Gate design: which hooks produce false-positive fatigue and get disabled?

**The Stop hook (`lane-freshness-gate`, §4.3) is the prime offender, followed by the SessionStart firehose.**

- **Stop hook — wrong threshold, wrong timing, ships its own bypass.**
  - Threshold *"≥2 non-emission files"* false-positives on: two-typo fixes, test+config pairs, two new boilerplate files. Agents will hit it constantly on legitimate work.
  - It blocks at **Stop**, after the edit is done. Prevention = 0.
  - `LANE: N/A — <reason>` is a model-written bypass. The gate trains the agent to write `LANE: N/A — routine`. Within days every session ends with that line. Then someone disables the hook "because it's noise." **A gate that annoys is a gate that gets removed** — and you'll have lost the only enforcement layer you built.
  - Fix-if-you-must: trigger on **commit/push**, not file count; put the check in **PreToolUse on Write/Edit** (prevent, not nag); **delete the escape hatch**; or tie the lane claim to the git branch so it's structurally correct.

- **SessionStart digest — firehose fatigue.** Printing 225 dirty + 176 untracked + 10 lanes + stale warnings every session, *never blocking*, guarantees the agent scrolls past. The real warning is buried. Either make it **actionable and filtered** (only show locks on files I'm likely to touch, only show lanes updated in last 30 min) or accept it will be ignored.

- **PreToolUse push gate — false-positive on legit deploys.** If the repo's normal flow *is* migration+main, blocking all such pushes breaks deployment cadence → owner approves everything → theater, or agent bypasses via `gh` → useless. (See Q5 for the correct predicate.)

---

## Q5 — The push gate: is "migration + main = block" right?

**No. It is both too narrow and too broad, and the approval mechanism is undefined.**

*Too narrow — misses other irreversible side effects:*
- **Force-push to main** (history rewrite) — worse than a migration, not caught.
- **Push to a branch that CI auto-deploys** (if `render.yaml` is on the branch, the build runs `migrate:production`). Blocking only `main` misses branch deploys.
- **Push of a tag** triggering a release workflow.
- **Seeders, raw SQL, `**/*.sql`, and boot-time code that writes external state** (Stripe/email/R2) — the diff touches none of `backend/migrations/**` but still mutates production on deploy.
- **`git push --force-with-lease`** to main — not a "migration" string, not caught.

*Too broad — blocks legitimate deploys:*
- The repo *needs* migrations to ship. A reviewed, owner-approved migration push to main is the **correct** path. Blocking all `main`+migration breaks the normal release flow. So the predicate as written either halts deployments or gets disabled.

*Better predicate:*
1. **Agents cannot push to protected branches at all.** Block `git push` to `main`/`master`/`production`/`staging` unconditionally for agent identities (enforce via repo branch protection + the hook as defense-in-depth). Deploy via PR/CI, not agent push. This alone would have prevented §2.
2. **For any push (any branch), compute blast radius from the diff, not from the agent's lane assertion:** does the pushed range touch `backend/migrations/**`, `**/*.sql`, `seeders/**`, `render.yaml`, or code paths that run on boot and write external state? If yes **and** no `MIGRATIONS_APPROVED` flag file (written by owner in-session, not by the agent) is present → block.
3. **Don't block no-ops:** if the range is already in `origin/<branch>` (fast-forward / already-pushed), pass.
4. **Catch bypasses:** watch `gh`, `git -c core.hooksPath`, and the GitHub MCP, not just Bash `git push`.

---

## Q6 — Rank findings by cost-of-failure × likelihood

Ordered highest first. C = cost (1–5), L = likelihood (1–5), score ≈ C×L.

| # | Finding | C | L | Why |
|---|---------|---|---|-----|
| 1 | **Unguarded push-to-main w/ migrations (F4; §4.3 fix incomplete per Q5)** | 5 | 4 | Prod DB schema change / data loss. Already near-missed (§2). §4's gate is bypassable + wrong predicate. |
| 2 | **Ledger fork + 4.1 clobbering (F1 + §4.1 regression)** | 4 | 5 | 184 worktrees, multi-session per agent name → locks become lies → silent collisions. Certain. |
| 3 | **Semantic / cross-file collision (Q2)** | 4 | 4 | API/schema churn common; locks + git miss it; §4 ignores it. High cost, high likelihood. |
| 4 | **Stop-hook fatigue → gate disabled (§4.3)** | 3 | 5 | Wrong threshold + escape hatch → disabled within days → false belief of enforcement. |
| 5 | **Off-machine invisibility (F7; §4.5 partial)** | 4 | 3 | Cloud/Codex agents collide with local; §4.5 only post-hoc, not live locks. |
| 6 | **TOCTOU race on lock file (Q2)** | 3 | 3 | Simultaneous claims; no mutex in Markdown. |
| 7 | **F6 hygiene rot (184 worktrees, 225 dirty)** | 3 | 4 | Noise buries signal; no reaper invoked. Lower stakes than collisions. |
| 8 | **Branch base drift (Q2)** | 3 | 3 | Force-push main under a stale branch. |
| 9 | **Review-queue starvation (Q2)** | 3 | 3 | Unreviewed slices ship; no SLA. |
| 10 | **Human-as-unnamed-agent (Q2)** | 3 | 2 | Owner edits untracked by lanes. |
| 11 | **F5 sentinel blind (fixed by §4.6)** | 2 | 3 | Cosmetic once globbed. |
| 12 | **F3 delivery schema stale (§4.4 flawed)** | 2 | 3 | Computed-at-start field is wrong mid-session. |

**Single highest-value change to make first:**
**Fix the ledger to be (a) resolved via `realpath(git rev-parse --absolute-git-dir)/..` so it is truly shared, AND (b) namespaced per session/worktree ID (e.g. `<worktree-id>.lane.md`), not per agent name.** Without truthful shared locks, the push gate's "is this file locked" check, the sentinel, and R1 are all meaningless — they operate on clobbered data. This is the prerequisite for every other control. **In parallel, enforce branch protection so agents cannot push to `main` at all** — the cheapest catastrophic-risk reducer, independent of ledger quality.

**Single thing in §4 you should NOT build:**
**The Stop hook `lane-freshness-gate` (§4.3).** Wrong threshold (≥2 files), fires after the fact, and ships a model-written `LANE: N/A` bypass. It will produce false-positive fatigue, get disabled, and leave you believing coordination is enforced when it is not. If you need enforcement, put the check in **PreToolUse on Write/Edit** (prevent, not nag) with **no escape hatch**, or bind lane state to the git branch structurally. Do not build the post-hoc nag.
