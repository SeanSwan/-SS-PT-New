# Hostile-review packet — the cross-agent Coordination Ledger (Rule 67 / LCL)

**Date:** 2026-08-11 · **Author:** vs-claude (Opus 5) · **Reviewers requested:** Kimi K3, Tencent HY3
**Remit:** attack the system below AND attack my proposed upgrade. One pass each. Rank by cost-of-failure.

---

## 0. Why this review exists

SwanStudios runs **many AI coding agents in parallel on one machine** (Claude sessions, Codex,
sometimes Fable, sometimes a cloud agent), against **one git repository**. They collide: two agents
edit the same file, one commit sweeps another's half-finished work (this happened — 63 WIP files),
one agent deletes a service another is still praising in a review.

The mitigation is the **Live Coordination Ledger (LCL)**: plain local Markdown files where each
agent publishes what it is doing and which files it has locked. It is codified as CLAUDE.md **Rule
67** and specced in `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md`.

**It just demonstrably saved a session** (incident below). The owner wants it hardened, made
mandatory, and turned into a skill that fires at every session start so no agent can silently skip it.

---

## 1. The system as it exists today (verified this session)

### 1.1 Files — `.ai-workflow/coordination/` (gitignored except README)

| File | Tracked | Purpose |
|---|---|---|
| `README.md` | yes | schema + rules |
| `<agent>.lane.md` | no | that agent's LIVE claim: status, task, `🔒 EDITING NOW` file list, last commit, next intent, timestamp. Overwritten each claim. |
| `review-queue.md` | no | append log: "X → Y: hostile-review slice Z" + verdicts (APPROVE/REVISE/REJECT) |
| `activity.log.md` | no | append log of claims/releases |

Rationale for gitignore (from the spec): a constantly-rewritten "what I'm editing now" file, if
committed, would itself generate merge conflicts — it would *cause* the collision it prevents.

### 1.2 Lane schema

```markdown
# <Agent> — Live Lane
Updated: <ISO-8601 UTC>
Status: in-progress | idle | awaiting-review | blocked
Task: <one line>
🔒 EDITING NOW:
- <exact paths I am editing right now>
Lane (owned area): <standing ownership>
Last commit: <sha | none>
Next intent: <...>
Notes for the other agent: <...>
```

### 1.3 Rules R1–R8 (prose, in CLAUDE.md Rule 67 + the protocol doc)

- **R1 read-before-edit** — read the other agent's lane before touching any file; if it's in their
  `🔒 EDITING NOW`, don't edit it.
- **R2 claim on start** / **R3 release on finish** (overwrite own lane, stamp `Updated:`).
- **R4** never write another agent's lane file.
- **R5 staleness** — lane `Updated:` >30 min old + still `in-progress` may be abandoned; flag to the
  owner, never silently seize.
- **R6 commit safety** — never stage a file in another agent's lock list; `git add -A` forbidden while
  any other lane holds a lock; stage explicit paths.
- **R7 mutual hostile review** — finishing a substantial slice → append a request to `review-queue.md`;
  the other agent returns APPROVE/REVISE/REJECT + findings.
- **R8 standing lanes** — each agent keeps a declared owned area.

### 1.4 Supporting tooling that exists

- `scripts/tree-sentinel.mjs` — read-only digest: main-tree dirty files grouped by dir; worktree
  inventory with ahead/behind + MERGED/UNMERGED/STALE classification; Rule-67 lane locks.
- `scripts/coordination-prune.mjs` — 30-day / 256 KB retention on the append logs.
- Hook inventory in `.claude/settings.json`:
  - `SessionStart` → `drift-check-gate.mjs` **only**
  - `PreToolUse` (Write|Edit|Bash) → `db-blast-radius-gate.mjs`
  - `Stop` → `hermes-closeout-gate`, `dry-loop-gate`, `linear-sync-gate`, `dual-tier-gate`, `backup-after-work`
  - **There is no coordination hook of any kind.**

---

## 2. The incident that proved the system's value (2026-08-11)

An agent (me) finished a slice in an isolated worktree and reported it complete. Three things happened:

1. **Committed ≠ delivered.** I authored a "learning packet" document whose central rule was *"a
   feature can be structurally incapable of working while every test passes."* I committed it and
   announced it was delivered. It sat on an **unpushed branch**. Its consumer reads `origin/main`.
   The lesson about undelivered work was itself undelivered, within three hours of writing it.

2. **The near-miss.** To fix that, I was about to push all 9 commits. `render.yaml` line 20:
   `buildCommand: cd backend && npm install && npm run migrate:production`. **A push to main executes
   pending migrations against the production database.** My unreviewed migration was in those commits.
   I would have performed an unreviewed production schema change as a side effect of publishing a
   document. I split the batch by blast radius instead: pushed the 7 zero-schema commits, held 9.

3. **The ledger paid for itself.** The parallel agent read my published lane and returned 9 numbered
   findings; self-corrected an error (it praised a service I had just deleted) before the owner asked;
   and flagged four schema columns as *"cheap now, impossible to retrofit."* Because my migration was
   still unexecuted, adopting them cost minutes instead of an impossible backfill. I also changed a
   decision because of them. **My deletion was invisible to them for hours purely because I had not
   pushed.**

**Extracted rules:** *Committed is not delivered — an artifact is delivered only when it exists where
its reader looks.* *Before pushing, ask what else the push does.* *When a batch mixes reversible and
irreversible work, split it.* *Publish your lane early — they cannot correct what they cannot see.*

---

## 3. Verified defects I found in the system itself (evidence-backed, this session)

**F1 — THE LEDGER HAS SILENTLY FORKED. [VERIFIED]**
`tree-sentinel.mjs:116` resolves the ledger as `${ROOT}/.ai-workflow/coordination/` where `ROOT =
process.cwd()`. Agents now work in **isolated git worktrees** (`git worktree list` → **184 worktrees**).
A worktree has its own working directory, so an agent that writes its lane from a worktree writes to a
*different, gitignored, invisible* ledger that no other agent ever reads.
Orphaned lane files found sitting in worktree-local ledgers, never read by anyone:
`ss-build-swan-lens/…/claude.lane.md` (2026-07-29), `ss-nutrition-safety-20260728/…/claude.lane.md`
(2026-07-29) + its own `review-queue.md`, `ss-world-engine-20260712/…/codex.lane.md` (2026-07-14),
`ss-world-engine-release-20260714/…/codex.lane.md`, `sspt-five-day-hostile-review-20260712/…/codex.lane.md`,
`sspt-recursive-audit-slice1-20260629/…/codex.lane.md`, `ss-launch-audit-20260727/…/claude-launch-audit.lane.md`,
`ss-launch-audit-lane1-20260803/…/launch-audit-lane-1-user.md`.
**Nine published claims that were structurally unreadable.** The coordination system suffered the exact
failure mode the incident is about: finished work placed where its reader does not look.

**F2 — RULE 67 HAS NO ENFORCEMENT LAYER. [VERIFIED]**
Every other closeout duty in this repo has a deterministic hook (Hermes memo, dry-loop, Linear sync,
dual-tier summary). Coordination has none — `SessionStart` runs only `drift-check-gate.mjs`. The repo's
own doctrine says: *"a duty enforced only by the model remembering is a duty that will eventually be
dropped."* Rule 67 is currently that duty.

**F3 — THE SCHEMA CANNOT EXPRESS DELIVERY STATE. [VERIFIED]**
The lane schema has `Last commit: <sha>`. There is no field distinguishing **local commit** /
**pushed to a remote branch** / **merged into origin/main**. The exact confusion that caused the
incident is unrepresentable in the data model, so it cannot be checked.

**F4 — `git push` IS UNGUARDED, AND ON THIS REPO A PUSH IS A MIGRATION RUN. [VERIFIED]**
`db-blast-radius-gate.mjs` matches migration *runner commands* (`sequelize-cli db:migrate`, `knex
migrate`) — grep for `push` in that file returns nothing relevant. But `render.yaml:20` runs
`migrate:production` in the build. So the highest-blast-radius action available to an agent — push to
main — passes through zero gates. The near-miss in §2 was caught by one agent voluntarily reading
`render.yaml`.

**F5 — THE SENTINEL IS BLIND TO MOST LANES. [VERIFIED]**
`tree-sentinel.mjs:115` iterates a hardcoded `['claude', 'codex']`. The live ledger currently holds
**ten** lane files: `claude`, `codex`, `fable`, `claude-designbrain`, `claude-hostile40`,
`claude-launch-audit`, `claude-social-distribution`, `codex-comms-recovery`, plus five
`launch-audit-lane-*.md`. Six agents' locks are invisible to the tool that reports locks.

**F6 — NO REAPER, AND THE HYGIENE IS VISIBLY ROTTING. [VERIFIED]**
184 worktrees. Main tree: **225 dirty files, 176 untracked**. `review-queue.md.orig` — a 225 KB merge
artifact — has sat in the ledger since 2026-07-19. `coordination-prune.mjs` exists but nothing invokes it.
(Repo doctrine forbids auto-deletion; this must be *reported*, not cleaned, without owner approval.)

**F7 — THE LEDGER IS INVISIBLE TO ANY AGENT NOT ON THIS FILESYSTEM. [VERIFIED]**
Live files are gitignored by design (`.gitignore:461`). Correct for local churn — but the owner runs
agents that are *not* on this machine (Codex in another app, cloud agents). They cannot read a
gitignored local file, so for them the ledger does not exist. There is currently no cross-machine
coordination surface at all.

---

## 4. My proposed upgrade — ATTACK THIS

### 4.1 One canonical ledger, resolvable from any worktree
Replace `process.cwd()` resolution with the **git common dir**: `git rev-parse --git-common-dir`
returns the *main* repository's `.git` even when called from a worktree. The ledger becomes
`<git-common-dir>/../.ai-workflow/coordination/`. Every agent in every one of the 184 worktrees then
reads and writes **the same files**. Orphaned worktree-local ledgers get reported (not deleted) and
their live content merged forward.

### 4.2 A skill: `agent-lane` (fires at session start, every session)
Carries the read-before-edit / claim / release / review-queue procedure, the delivery-state
vocabulary, and the push-blast-radius checklist. Session start = read all lanes + locks + sentinel
digest, then publish an opening claim **before the first edit**.

### 4.3 Deterministic gates (the layer that makes it not-optional)
- **SessionStart hook** — prints the orientation digest: every agent's lane, every lock, my branch's
  delivery state, dirty/untracked counts, stale-lane warnings, orphaned-ledger warnings. Never blocks.
- **Stop hook (`lane-freshness-gate`)** — if the turn wrote ≥2 non-emission files or committed, and my
  lane file was not updated this session, **BLOCK** with the exact write command. Escape hatch:
  `LANE: N/A — <reason>`. (Mirrors the existing dual-tier/dry-loop gate pattern.)
- **PreToolUse hook on `git push`** — compute and print the blast radius before the push runs:
  target branch; whether the pushed range touches `backend/migrations/**`, `render.yaml`, seeders, or
  raw SQL; whether it includes any file another lane has locked; whether it mixes reversible and
  irreversible work. **Block** a push to `main` carrying migrations unless the owner has explicitly
  approved in-session. This is the gate that would have caught §2's near-miss mechanically.

### 4.4 Schema v2 — delivery state becomes a first-class field
```
Delivery: local-commit | pushed-branch | merged-to-main   ← computed, not asserted
Blast radius: none | reversible | IRREVERSIBLE (migration/Stripe/R2/email)
```
The SessionStart digest computes `Delivery` from git (branch on origin? merged into origin/main?)
rather than trusting the agent's own claim.

### 4.5 A committed, append-only delivery log (for F7)
Keep live locks local/gitignored (churn), but add a **tracked, append-only** `DELIVERY-LOG.md`: one
line per delivered slice (date · agent · branch · SHA range · delivery state · blast radius). Append-only
one-liners rarely conflict, and off-machine agents can finally see what shipped.

### 4.6 Sentinel fixes
Glob `*.lane.md` instead of the hardcoded two-agent list; report stale lanes, orphaned worktree
ledgers, and prune-overdue logs. Report only — never delete.

---

## 5. Your remit (hostile)

1. **Break §4.** Where does this design fail, create false confidence, or make things worse? Be specific.
2. **What did I miss in §3?** Failure modes of multi-agent coordination on one repo that this system
   still cannot detect — especially *silent* ones.
3. **Is a lock-based model even right here?** Advisory locks with no enforcement vs. optimistic
   detection (detect collisions after the fact and reconcile) vs. hard partitioning (worktree per agent,
   never share a tree). Argue the strongest case against locks.
4. **Gate design.** Which of my three hooks will produce false-positive fatigue and get disabled? A gate
   that annoys is a gate that gets removed. Where exactly is the threshold wrong?
5. **The push gate.** Is blocking on "migration + main" the right predicate, or is it both too narrow
   (other irreversible side effects) and too broad (legitimate migration deploys)? Propose a better one.
6. **Rank every finding — yours and mine — by cost of failure × likelihood.** Name the single highest-value
   change to make first, and the single thing in §4 I should NOT build.

Answer in Markdown. Concrete over general. Cite the section you are attacking. No praise sections.
