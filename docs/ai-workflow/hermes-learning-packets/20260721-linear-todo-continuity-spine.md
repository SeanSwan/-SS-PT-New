---
originating_model: claude-fable-5
date: 2026-07-21
topic: Linear as the cross-conversation to-do spine (capture / verify / sentinel)
provenance: Fable-tier session output (verified — this packet authored directly by claude-fable-5)
title: task continuity across parallel agents and interrupted conversations
tier_basis: Fable-tier session output (verified — this packet authored directly by claude-fable-5)
decision: unknown
status: draft
migrated: 2026-08-16 — required keys back-filled mechanically (title<-H1; tier_basis<-provenance; decision=unknown [CORRECTED 2026-08-16 — topic left in place; a subject is not a rule]; status=draft (never reviewed against a contract)); originating_model untouched
---

# Learning Packet — task continuity across parallel agents and interrupted conversations

**The permanent lesson:** when one human orchestrates many agents across many concurrent
conversations, work is lost at three seams — (1) decisions stated in a conversation that
ends, (2) WIP branches/worktrees nobody remembers, (3) two agents rebuilding the same
thing. The fix is one durable queue with three enforced behaviors, not more folders:

1. **Capture with an anchor commit.** Every to-do filed from a conversation records the
   `origin/main` short-sha at capture time. Staleness later becomes a *diffable question*
   (`git log <anchor>..origin/main -- <paths>`), not a memory question. Dedup-search the
   board BEFORE creating — duplicate issues are the board-level form of duplicate code.
2. **Verify with evidence verdicts.** An agent asked "is this still relevant?" must answer
   one of STILL-RELEVANT / DONE-BY \<sha\> / SUPERSEDED-BY \<ref\> / STALE-CONTEXT, each
   citing commit or file:line evidence, posted where the to-do lives. Never silently close.
3. **Sentinel the tree read-only.** A deterministic digest (dirty files by dir, every
   worktree classified MERGED-CLEAN/UNMERGED/etc., agent lane locks) runs at session start
   and pre-push. UNMERGED = resume-don't-rebuild; MERGED-CLEAN feeds a human-gated cleanup
   decision; the sentinel itself never deletes.

**Layer separation that made it work:** real-time collision (lane files, same machine) ≠
cross-session queue (Linear) ≠ narrative courier (Hermes inbox). Each seam gets exactly one
owner; memos name their board issue so the layers never diverge.

**SwanStudios instantiation:** `.claude/skills/linear-todo/SKILL.md` +
`scripts/tree-sentinel.mjs` (branch `claude/dry-loop-fixes-20260720` @ `8baae14bb`; merge =
SWA-26). Baseline that motivated it: 1,114 dirty files, 115 worktrees, 21 carrying
unmerged WIP. First captures: SWA-24 (palette-truth decision), SWA-25 (Evidence Lens gap).

Privacy: IDs/roles/paths only; no PII, secrets, or env values.
