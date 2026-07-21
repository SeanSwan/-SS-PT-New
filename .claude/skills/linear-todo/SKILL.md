---
name: linear-todo
description: The Linear-backed to-do workflow — capture conversation summaries as board issues ("add this to the todo in Linear"), verify captured work is still relevant against current commits, and run the read-only tree sentinel so parallel agents don't step on each other or duplicate work. Triggers - "add this to the todo", "put this in Linear", "todo this", "/linear-todo", "is SWA-N still relevant", "check the board", "run the sentinel", "audit the tree".
---

# linear-todo — capture · verify · sentinel

The continuity spine for multi-conversation, multi-agent work. Linear is the durable
cross-session queue; the Rule-67 lane files stay the real-time collision layer; the
Hermes inbox stays the narrative courier. This skill is the operating contract for all
three so nothing said in a conversation is lost when Sean gets pulled into another one.

**Workspace truth (verified 2026-07-21):** team `SwanStudios` (key `SWA`).
Projects: `SS-PT-New — SwanStudios Main` (product work) · `AI Operations — Human +
Agent Workflow` (agent/workflow/tooling) · `Swan Guard — Family Intelligence Command
Center` (separate repo) · `AI Agent Tuning` (separate repo). Labels in use: effect
tiers (`T0 Read`…), owners (`Human`/`Codex`/`Hermes`), readiness (`Agent Ready`,
`Human Approval`). Sean's user = `me`.

## Mode 1 — CAPTURE ("add this summary to the todo in Linear")

1. **Dedup FIRST (mandatory):** `list_issues` with a `query` on the key nouns before
   creating anything. If a matching issue exists, UPDATE/comment it — never create a
   twin. Duplicated issues are the board-level version of the duplicated-code problem
   this workflow exists to kill.
2. **Route to the right project:** product/feature/bug → `SS-PT-New — SwanStudios
   Main`; workflow/agent/tooling/process → `AI Operations — Human + Agent Workflow`;
   other repos → their project. Never dump product work into AI Operations (project
   description forbids it).
3. **Write the issue agent-ready** (`save_issue`, team `SwanStudios`, assignee `me`
   unless told otherwise): outcome · context (1-para summary of the conversation
   decision, with repo paths + doc pointers) · acceptance criteria · **anchor commit**
   (`git rev-parse --short origin/main` at capture time — this is what the verify pass
   diffs against) · branch/worktree if WIP exists · blockers. Decisions Sean must make
   get title prefix `DECISION:` and label `Human Approval`.
4. **Priority:** default 3 (Medium); 1–2 only for revenue/production/security or when
   Sean says so.
5. **Privacy (Rules 8/44/59):** Linear is an external service — IDs/roles only, no
   client PII, no secrets, no `.env` values, no raw transcripts.
6. Reply to Sean with the issue identifier + URL, one line.
7. **Branch naming = free auto-linking:** when starting work on an issue, name the
   branch with the issue's `gitBranchName` or embed `swa-N` (agent prefix fine:
   `claude/swa-N-slug`). Once GitHub↔Linear integration lands (SWA-7), commits/PRs
   auto-attach to the issue — zero-click traceability.

## Mode 2 — VERIFY ("is this todo still relevant?")

For a given issue (or the whole Todo column when asked), an agent must produce an
**evidence-based verdict**, not an opinion:

1. Read the issue (`get_issue`) — extract its anchor commit, named files, and claims.
2. Diff reality: `git log --oneline <anchor>..origin/main -- <named paths>` +
   `rg`/catalog grep (`docs/ai-workflow/CATALOG.md`, Rule 72) for the topic — did a
   later commit already ship it, supersede it, or move the surface?
3. Verdict as an issue comment (`save_comment`), one of:
   - `STILL-RELEVANT` — nothing on main addresses it; anchor updated to current tip.
   - `DONE-BY <sha>` — shipped; move state → Done, cite the commit.
   - `SUPERSEDED-BY <doc/issue>` — direction changed; state → Canceled with pointer.
   - `STALE-CONTEXT` — files moved/renamed; rewrite the issue body, keep it open.
   Every verdict cites file:line or sha evidence (Rule 51 — no "looks done").
4. Never silently close: `DONE-BY`/`SUPERSEDED` on issues Sean authored get the
   comment + state change; anything ambiguous gets `DECISION:` back to Sean.

## Mode 3 — SENTINEL ("check the tree", periodic hygiene)

`node scripts/tree-sentinel.mjs [--json] [--fast]` — **read-only** digest: main-tree
dirty files grouped by dir, all worktrees classified (MERGED-CLEAN / MERGED-DIRTY /
MERGED (dirty-unknown, `--fast`) / UNMERGED / UNMERGED-DIRTY / DETACHED), Rule-67
lane locks. `--fast` for session-start orientation; full mode before pushes/cleanup
decisions. Recurring digests post as comments on standing issue **SWA-27**.
Interpretation contract:

- **UNMERGED\*** = real WIP. Before starting ANY new slice, check this list + lanes:
  if a branch already carries the work, resume it — do not re-build (anti-duplication
  law). Post material WIP that has no board record as a capture (Mode 1).
- **MERGED-CLEAN** = removal candidates → they feed the standing cleanup decision
  (SWA-11), never auto-deleted (Rule 34).
- **Dirty main tree** before a push = run the digest, stage explicit paths only,
  never `git add -A` (Rule 67 R6).
- Cadence: run at session start of any build session, before any push from a shared
  tree, and whenever Sean says the repo feels messy. Recurring automation belongs in
  **Hermes native cron** (the automation home) posting the digest to Telegram/Linear —
  that wiring is a Sean-gated config on the Hermes desktop (tracked on the board).

## Boundaries (what this skill does NOT change)

- Rule-67 lane files remain the real-time same-machine collision authority; Linear is
  the cross-session/cross-conversation queue. When they disagree, lanes win for "right
  now", Linear wins for "still to do".
- Hermes inbox memos (Rule 69) still fire at closeout; a memo that contains open work
  should NAME its SWA issue so Hermes and the board never diverge.
- Closeout integration: substantial workstreams reference a SWA issue at closeout
  (SWA-23's ask). Until the Stop-hook wiring lands, this skill's capture step at
  closeout IS the interim implementation.
- Cleanup/deletion of anything the sentinel finds stays Sean-gated (Rule 34).
