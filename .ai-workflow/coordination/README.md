# Live Pair-Coding Coordination Ledger (LCL)

> **Created:** 2026-06-13 by Sean (CEO Orchestrator).
> **Purpose:** Let **every seat** — Claude, Codex, OpenCode, WorkBuddy, GLM and any future harness — code the SAME working tree at the SAME time without stepping on each other, and hand each other work for **hostile review**. This is the active coding process while we run multiple agents in parallel.
> **Full spec:** `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md`
>
> **Amended 2026-09-21 (S3 of `BLUEPRINT-coordination-discovery-2026-09-20`).** This file previously
> named `claude.lane.md` and `codex.lane.md` as *the* seats, told agents a stale claim "may be
> abandoned", and put `coordination-prune.mjs` on the session-start path. All three are wrong now:
> seats are per-session, nothing ever releases a stale claim, and a session-start read must not
> write. Astra hostile review F02/F09, 2026-09-20.

## Why this exists (and why it's gitignored)

Agents run in the **same working tree on Sean's machine**. They share a filesystem, so they can see each other's live state **instantly** through plain local files — no git, no network. These runtime files are **gitignored on purpose**: committing a constantly-rewritten "what I'm editing right now" file would create commit churn and merge conflicts — i.e. it would *cause* the very collision we're preventing.

- **Real-time, same-machine collision avoidance** → this directory (gitignored, live).
- **Cross-session / cross-machine memory** → the committed continuity bridge (`.ai-workflow/continuity/`) + `docs/ai-workflow/AI-HANDOFF/`. Different jobs; both stay.

## Files

**Do not enumerate lane files by name.** Lane files are named per **session**, not per agent:
`<agent>--<worktree-slug>[-s<session-hash>].lane.md`. Measured 2026-09-21: the ledger held
**91 lane files across 5+ agent names**, so any hardcoded list is stale the moment a second
session of the same agent opens. The table below shows the **row shape**, not the set —
discover the real set with the command, never with this table. Concrete names that happen to
appear anywhere below are illustrations of the scheme, never the way to find seats.

| File | Tracked? | Purpose |
|---|---|---|
| `README.md` | ✅ tracked | This file. Schema + rules. |
| `*.lane.md` | ❌ gitignored | One LIVE claim **per session** — status, task, files locked NOW, last commit, next intent, timestamp. Overwritten each claim. Named `<agent>` + worktree slug; never a fixed seat list. |
| `review-queue.md` | ❌ gitignored | Append log: "X → Y: please hostile-review slice Z" + verdicts (APPROVE/REVISE/REJECT + findings). The mutual-review channel. |
| `activity.log.md` | ❌ gitignored | Append log of claims/releases for collision forensics. Pruned. |

An agent **only ever writes its own** `*.lane.md`. It **reads the others'**. No agent edits another's lane file.

## The protocol (every agent, every slice)

**Before editing ANY file:**

1. Run **`node scripts/lane-at-root.mjs orientation`** — the complete, uncapped discovery command.
   Its exit code says whether the answer can be trusted as clearance (`0` complete · `2` valid but
   INCOMPLETE · `1` unproducible). If it is not `0`, a target you cannot see may be claimed: do not
   read that as free. If a file you're about to touch is in any lane's **🔒 EDITING NOW** list →
   **do not edit it.** Pick another file, append a request in `review-queue.md`, or ask Sean.
2. **Staleness is a warning, never a release.** If a lane's `Updated:` is **more than 30 minutes**
   old while its status is still `in-progress`, treat its claims as **suspect and say so**. That is
   the entire automatic behaviour: **nothing releases a stale claim, ever.** A stale claim is still
   a claim. Do **not** take the files — flag to Sean, because only Sean knows whether that session
   died or is merely mid-think.

> **`digest` is NOT clearance.** `digest` is a deliberately **capped** startup summary — lock paths
> per seat are capped at 5 and live lanes at 6. An agent asking "is my file locked?" via `digest`
> can be shown a **truncated** list and conclude it is free. `digest` also prints `agent@slug` on
> its `me:` line, **not a filepath** — the own-lane path comes from `whoami`, or from
> `self.laneFile` in complete discovery. Use `digest` to orient, `orientation` to decide.

**When you START a slice / claim files:**

3. Overwrite your own lane file (template below). List the exact files in **🔒 EDITING NOW**. Stamp `Updated:`.
4. Append one line to `activity.log.md`.

**When you FINISH a slice:**

5. Update your lane file: status → `idle` or `awaiting-review`, clear **🔒 EDITING NOW**, record what changed + commit SHA (if any).
6. Append one line to `activity.log.md`.

**Commits (coordinated):**

7. Before `git add`, read every lane. **Never stage/commit a file in another seat's 🔒 EDITING NOW list.** `git add -A` is forbidden while any seat has a file locked — stage explicit paths.

**Hostile review (Sean's #1 ask — catch each other's work):**

8. Finishing a substantial slice → append a review request to `review-queue.md`.
9. Another seat picks it up, runs a hostile review (rule 17 dual-pass + rule 41 closeout gate + the Business-Logic Audit in `HANDOFF-PROTOCOL.md`), and writes back `APPROVE | REVISE | REJECT` + findings.

> **This is cooperative collision avoidance, not mutual exclusion.** Claiming is a broadcast, not a
> lock: `claim()` writes its own file and reads no other lane, so two seats can both inspect an
> apparently clear target before either claim becomes visible. Nothing here makes concurrent claims
> atomic — it only makes them **visible**. Re-check discovery after claiming and before editing;
> the race window is real and is not closed by this protocol. (Astra F11.)

## Lane file template

```markdown
# <Agent> — Live Lane (session: <worktree-slug>)
Updated: <ISO-8601 UTC>
Status: in-progress | idle | awaiting-review | blocked
Task: <one line>
🔒 EDITING NOW:
- path/to/file.tsx
- path/to/other.mjs
Lane (owned area): <e.g. admin product/catalog UI + money-path safety tests>
Last commit: <sha or "none this session">
Next intent: <files/areas I plan to touch next>
Notes for other agents: <anything>
```

## Read at session start

Every seat, after its instruction file (`CLAUDE.md` / `AGENTS.md` / `CODEBUDDY.md` / `GEMINI.md` /
`.opencode/SEAT.md`, whichever your harness loads) plus the continuity bridge:

1. `node scripts/lane.mjs digest` — the cheap summary: you, the seats holding locks right now, and
   the stale count. **Capped; not clearance.**
2. Read `.ai-workflow/coordination/review-queue.md` (any open review requests for me?).
3. **Before your first edit**, `node scripts/lane-at-root.mjs orientation` — complete, uncapped, and
   it tells you whether it is trustworthy. Do not rely on step 1 for this.

**Do NOT prune at session start.** `scripts/coordination-prune.mjs` still exists and is still the
retention mechanism (below), but it is a **write**, and a session-start hook is a **read** path. The
SessionStart hook used to invoke it; that was removed on 2026-09-21 because a read-only orientation
step must not mutate the ledger. Run pruning deliberately, by hand, when you intend to.

## Retention (Sean's call: 30 days)

**Session-file accumulation and append-log retention are two different problems — do not conflate them.**

- **Lane files** are overwritten in place → a *single* lane never grows → no retention needed *for
  size*. That says nothing about **accumulation**: 91 files have collected, one per session, and the
  count only grows because a finished session's file is never removed. That is a separate cleanup
  decision for Sean, and **this change introduces no automatic lane deletion.**
- **`review-queue.md` + `activity.log.md`** are append logs → pruned by `scripts/coordination-prune.mjs`: drop entries older than **30 days**, with a **256 KB** size backstop (whichever hits first). These are gitignored + local, so pruning loses no git history; durable outcomes get promoted to committed handoff/debate/closeout docs anyway. Bump `RETENTION_DAYS` in the script to 60 if Sean wants a longer window.
