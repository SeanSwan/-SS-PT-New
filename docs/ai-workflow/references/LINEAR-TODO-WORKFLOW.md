# LINEAR-TODO-WORKFLOW — the cross-agent to-do spine (tool-agnostic contract)

- **Established:** 2026-07-21 · **Applies to:** ALL agents (Claude Code, Codex, KiloCode, Hermes-read-only, future) · **Claude-side skill:** `.claude/skills/linear-todo/SKILL.md` (same contract; this doc is the canonical tool-agnostic copy — if they drift, THIS doc wins)
- **One law:** there is no to-do folder. **Linear (team `SwanStudios`, key `SWA`) is the to-do system.** All agents are connected via the official Linear MCP (SWA-5). Hermes gets read-only access (SWA-6).

## Routing

| Work | Project |
|---|---|
| SwanStudios product/feature/bug (this repo) | `SS-PT-New — SwanStudios Main` |
| Agent/workflow/MCP/automation/process | `AI Operations — Human + Agent Workflow` |
| Swan Guard (separate repo) | `Swan Guard — Family Intelligence Command Center` |
| AI tuning (separate repo) | `AI Agent Tuning` |

Never file product work in AI Operations (its description forbids it).

## Mode 1 — CAPTURE (trigger: "add this to the todo in Linear", "todo this")

1. **Dedup first:** search issues by key nouns. Match found → update/comment, never create a twin.
2. **Agent-ready body:** outcome · 1-para context with repo paths/doc pointers · acceptance criteria · **anchor commit** (`git rev-parse --short origin/main` at capture) · branch/worktree if WIP exists · blockers.
3. `DECISION:` title prefix + `Human Approval` label for anything only Sean can rule on. Priority default Medium; High only for revenue/production/security.
4. **Privacy (Rules 8/44/59):** Linear is external — IDs/roles only, no PII, no secrets, no transcripts.
5. Reply with identifier + URL, one line.

## Mode 2 — VERIFY (trigger: "is SWA-N still relevant?", "verify the todo column")

Evidence verdicts only (Rule 51): read the issue → diff its anchor (`git log <anchor>..origin/main -- <paths>` + catalog grep per Rule 72) → comment ONE of:
`STILL-RELEVANT` (re-anchor to tip) · `DONE-BY <sha>` (→ Done) · `SUPERSEDED-BY <ref>` (→ Canceled) · `STALE-CONTEXT` (rewrite body, keep open).
Every verdict cites sha or file:line. Sean-authored issues never silently closed; ambiguity → `DECISION:` back to Sean.

## Mode 3 — SENTINEL (trigger: "check the tree", session start, pre-push)

`node scripts/tree-sentinel.mjs [--json] [--fast]` — READ-ONLY digest: main-tree dirty files by dir, all worktrees classified, Rule-67 lane locks.
- `--fast` at session start (skips per-worktree dirty checks; ambiguous trees report `MERGED`, never `MERGED-CLEAN`); full mode before pushes/cleanup decisions.
- **UNMERGED\* = real WIP → resume, never rebuild.** Material WIP without a board record → capture it (Mode 1).
- MERGED-CLEAN → feeds the standing Sean-gated cleanup decision (SWA-11). The sentinel never deletes (Rule 34).
- Recurring digests post as comments on the standing issue **SWA-27 (Tree Sentinel — rolling digest)**; the scheduled runner belongs in Hermes native cron (Sean-gated wiring).

## Branch naming = free auto-linking

Every Linear issue exposes a `gitBranchName` (e.g. `ogpswan/swa-26-merge-claudedry-loop-fixes…`). **When starting work on an issue, name your branch with that value** (or at minimum embed `swa-N` in the branch name / PR title). Once the GitHub↔Linear integration is configured (SWA-7), commits/PRs then auto-attach to the issue and state can auto-advance — zero-click traceability. Agent-prefix conventions (`claude/…`, `codex/…`) may be kept by appending: `claude/swa-N-slug`.

## Layer boundaries (do not blur)

| Layer | Owner | Question it answers |
|---|---|---|
| `.ai-workflow/coordination/*.lane.md` (Rule 67) | real-time, same-machine | "who is editing RIGHT NOW" |
| Linear (SWA) | cross-session, cross-agent | "what is still to do, is it still relevant" |
| Hermes inbox memos (Rule 69) | narrative courier | "what happened + why" — memos NAME their SWA issue |

Closeout: substantial workstreams reference a SWA issue at closeout (SWA-23). Lanes win for "now"; Linear wins for "still to do".
