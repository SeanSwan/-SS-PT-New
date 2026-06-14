# Live Pair-Coding Coordination Ledger (LCL)

> **Created:** 2026-06-13 by Sean (CEO Orchestrator).
> **Purpose:** Let **Claude** and **Codex** code the SAME working tree at the SAME time without stepping on each other — and hand each other work for **hostile review**. This is the active coding process while we run two agents in parallel (through ~mid-July 2026, until Fable 5 returns).
> **Full spec:** `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md`

## Why this exists (and why it's gitignored)

Claude (VS Code) and Codex run in the **same working tree on Sean's machine**. They share a filesystem, so they can see each other's live state **instantly** through plain local files — no git, no network. These runtime files are **gitignored on purpose**: committing a constantly-rewritten "what I'm editing right now" file would create commit churn and merge conflicts — i.e. it would *cause* the very collision we're preventing.

- **Real-time, same-machine collision avoidance** → this directory (gitignored, live).
- **Cross-session / cross-machine memory** → the committed continuity bridge (`.ai-workflow/continuity/`) + `docs/ai-workflow/AI-HANDOFF/`. Different jobs; both stay.

## Files

| File | Tracked? | Purpose |
|---|---|---|
| `README.md` | ✅ tracked | This file. Schema + rules. |
| `claude.lane.md` | ❌ gitignored | Claude's LIVE claim: status, task, files locked NOW, last commit, next intent, timestamp. Overwritten each claim. |
| `codex.lane.md` | ❌ gitignored | Codex's LIVE claim, same shape. Overwritten each claim. |
| `review-queue.md` | ❌ gitignored | Append log: "X → Y: please hostile-review slice Z" + verdicts (APPROVE/REVISE/REJECT + findings). The mutual-review channel. |
| `activity.log.md` | ❌ gitignored | Append log of claims/releases for collision forensics. Pruned. |

An agent **only ever writes its own** `*.lane.md`. It **reads the other's**. Neither edits the other's lane file.

## The protocol (every agent, every slice)

**Before editing ANY file:**
1. Read the OTHER agent's lane file. If a file you're about to touch is in their **🔒 EDITING NOW** list → **do not edit it.** Pick another file, or append a request in `review-queue.md`, or ask Sean.
2. **Staleness:** if their lane `Updated:` timestamp is > 30 min old and status is still `in-progress`, the claim may be abandoned (agent stopped). Don't assume it's locked forever — flag to Sean before taking over their files.

**When you START a slice / claim files:**
3. Overwrite your own lane file (template below). List the exact files in **🔒 EDITING NOW**. Stamp `Updated:`.

**When you FINISH a slice:**
4. Update your lane file: status → `idle` or `awaiting-review`, clear **🔒 EDITING NOW**, record what changed + commit SHA (if any).
5. Append one line to `activity.log.md`.

**Commits (per existing reality — coordinated):**
6. Before `git add`, read the other lane. **Never stage/commit a file in the other agent's 🔒 EDITING NOW list.** Codex coordinates commit timing on shared slices.

**Hostile review (Sean's #1 ask — catch each other's work):**
7. Finishing a substantial slice → append a review request to `review-queue.md`.
8. The other agent picks it up, runs a hostile review (rule 17 dual-pass + rule 41 closeout gate + the Business-Logic Audit in `HANDOFF-PROTOCOL.md`), and writes back `APPROVE | REVISE | REJECT` + findings.

## Lane file template

```markdown
# Claude — Live Lane
Updated: 2026-06-13T17:55:00Z
Status: in-progress | idle | awaiting-review | blocked
Task: <one line>
🔒 EDITING NOW:
- path/to/file.tsx
- path/to/other.mjs
Lane (owned area): <e.g. admin product/catalog UI + money-path safety tests>
Last commit: <sha or "none this session (Codex coordinates)">
Next intent: <files/areas I plan to touch next>
Notes for the other agent: <anything>
```

## Read at session start

Both agents, after CLAUDE.md/AGENTS.md + the continuity bridge:
1. Read `.ai-workflow/coordination/claude.lane.md` AND `codex.lane.md` (know what the other is doing).
2. Read `.ai-workflow/coordination/review-queue.md` (any open review requests for me?).
3. Run `node scripts/coordination-prune.mjs` (trims the append logs; safe + local-only).

## Retention (Sean's call: 30 days)

- **Lane files** are overwritten in place → single current state, never grow → **no retention needed.**
- **`review-queue.md` + `activity.log.md`** are append logs → pruned by `scripts/coordination-prune.mjs`: drop entries older than **30 days**, with a **256 KB** size backstop (whichever hits first). These are gitignored + local, so pruning loses no git history; durable outcomes get promoted to committed handoff/debate/closeout docs anyway. Bump `RETENTION_DAYS` in the script to 60 if Sean wants a longer window.
