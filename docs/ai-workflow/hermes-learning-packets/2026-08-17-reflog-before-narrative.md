---
title: "Reflog before narrative — surviving a shared-worktree hard reset"
packet: reflog-before-narrative
date: 2026-08-17
originating_model: claude-fable-5
tier: fable-tier
tier_basis: "claude-fable-5 is the running session model (Fable 5, Final Decider); provenance is first-hand, not relayed"
surface: multi-agent git operations (shared worktree)
decision: "On any shared-tree surprise: git reflog first, rescue-branch pin second, wait-and-watch before large recovery; commit per slice and re-pin rescue after each commit during multi-agent churn"
privacy: "IDs/roles only; no PII, no secrets, no client data; artifacts named are repo files, commit SHAs, and branch names"
status: draft
models_used:
  - model: claude-fable-5
    role: builder, incident responder
    did: ran the freestyle dry-loop; detected and survived two hard resets of the shared branch by parallel sessions; pinned rescue branches; re-applied wiped fixes twice
    cost: subscription (flat rate)
  - model: glm-5.3
    role: hostile reviewer (rounds 1-4)
    did: found the late-permission-grant mic hole and the flight-ref inheritance defect in round 4 — both real, both at the root layer earlier rounds had fenced as "internals"
    cost: ZAI subscription
  - model: openai/gpt-5.5 (Codex)
    role: hostile reviewer (rounds 1-4)
    did: found the discard-arm hot-mic and Resume-gesture defects; round-4 LOWs both real
    cost: OpenRouter (~$0.05-0.15/round observed)
skills_touched:
  - id: agent-lane / Rule 67
    change: reinforced with a gap named
    failure: lane files govern EDITS, but nothing governs branch-pointer operations — a `git reset --hard` in a shared worktree bypasses every lane lock at once
  - id: rule-70 batch-push
    change: clarified
    failure: "batch-PUSH" was silently practiced as "batch-COMMIT" between gates; uncommitted fixes were wiped twice by resets in one session
---

# On a shared tree, `git reflog` is the first move on ANY surprise — and a rescue branch is a two-second insurance policy that saved a day's work twice

## The lesson

Mid-review, files in my lane reverted to months-old content. My first narrative — another agent
clobbered my files from a stale copy — fit my priors about lane violations and was **wrong**. One
`git reflog` call gave the truth: a parallel session had run `git reset --hard origin/main` on the
shared branch, orphaning ~148 commits from four different agents' workstreams at once. Twenty
minutes later, another reset restored the orphaned line. Neither event was visible in any lane
file, because **lane files govern edits; nothing governs branch-pointer operations.**

Three durable rules came out of surviving it:

1. **Reflog before narrative.** On any tree surprise (files reverted, commits "missing", history
   looks wrong), `git reflog` is move one. It is the only log that records resets, and it converts
   "who attacked my files?" into "HEAD@{0}: reset: moving to origin/main" in one command.
2. **Pin a rescue branch the moment orphaning is discovered** — `git branch rescue/<name> <sha>`
   costs two seconds, makes GC irrelevant, and turns a crisis into an inconvenience. Pin the
   LATEST orphaned tip you can find, not just your own commits: ancestry protects everyone below it.
3. **Wait-and-watch before large recovery.** I began a 30-file transplant onto the new line; the
   second reset made it moot. The agent who broke a shared resource is often already fixing it —
   a destructive-looking event by a peer deserves a short pause (or a lane-file query) before an
   expensive recovery effort.

And the one that has now cost me twice in one session: **uncommitted work in a shared tree during
active multi-agent churn has a half-life of minutes.** Batch-PUSH (Rule 70) was never batch-COMMIT;
commit per slice and re-pin the rescue branch after each. My round-4 fixes were wiped by both
resets and re-applied from context both times — recoverable only because the fix contents lived in
my conversation context, which is not a durable store.

## Who did what

- **claude-fable-5 (me):** detected the anomaly via a file-content mismatch, mis-read it once,
  corrected via reflog, pinned two rescue branches within minutes, verified the transplant surface
  file-by-file (NEW / CLEAN-BASE / DIVERGED classification), and absorbed the second reset without
  losing committed work.
- **The resetting session(s):** unknown identity (reflog records no author). The reset-to-main
  looked like an attempt to escape the stale-branch problem; the reset-back suggests its author
  discovered the orphaning. No lane entry announced either operation.
- **GLM-5.3 / Codex:** unaffected bystanders whose round-4 reviews spanned the incident — both
  reviewed the pre-reset packet and their findings remained valid because the content returned.

## Skills created or changed

- **Gap named in the lane protocol:** lane locks are per-FILE; branch-pointer operations
  (`reset`, `branch -f`, `checkout` of another branch in a shared worktree) have no claim
  mechanism and defeat every file lock simultaneously. Proposed (not built): branch-pointer
  operations in a shared worktree require a lane-file announcement first, and any agent
  discovering an unannounced pointer move pins a rescue branch before anything else.
- **Rescue-pin habit:** after every commit in a shared tree, `git branch -f rescue/<workstream>
  HEAD`. Two seconds; converts every future reset from data loss into noise.

## Mistakes I made

- Built the wrong narrative first (hostile clobber) from partial evidence; reflog falsified it in
  one command. Priors about lane violations made the wrong story feel verified.
- Started expensive recovery (30-file transplant) without a wait-and-watch pause.
- Held fixes uncommitted through a window I already knew was hostile — after having written up the
  same lesson class an hour earlier in this very session.

## Error → fix → repeat ledger

| Error class | Times | Already written up? | What actually stopped it |
|---|---|---|---|
| Uncommitted work wiped by external tree mutation | 2 in one session | Yes (Rule 70, and my own memo an hour prior) | Only committing + rescue-pinning. The write-up alone did not change behavior — the second wipe happened AFTER the memo |
| Narrative before evidence on a git anomaly | 1 | Adjacent (validate-instrument memory) | `git reflog` — mechanical step, not disposition |

The repeat in row 1 is the signal: a lesson written mid-session did not survive thirty minutes of
work pressure. The correction that sticks is procedural-at-the-moment-of-action (commit-then-pin as
one motion), not documentary.

## External-model calibration

- **GLM-5.3 (ZAI subscription):** unaffected by the incident; its round-4 findings (late-grant mic
  hole, flight-ref inheritance) were verified real against source and both were root-layer defects
  earlier rounds had fenced. High hit-rate holds across 4 rounds; zero disproven findings this span.
- **Codex / gpt-5.5 (OpenRouter, ~$0.05–0.15 per round):** round-4 LOWs both verified real on
  inspection. Across rounds 1–4: no finding disproven after verification; one severity understated
  (its round-2 "MED" start-from-error destruction was arguably HIGH).
- **No paid model was consulted about the incident itself** — the diagnosis and recovery were
  in-session; the reflog, not a reviewer, was the instrument that mattered.

## How to apply next time

1. Tree surprise → `git reflog` before any theory, any edit, any recovery.
2. Orphaned commits → pin the deepest orphan tip to a rescue branch immediately.
3. Parallel-agent breakage → pause before large recovery; the breaker may be mid-repair.
4. Shared tree + churn → commit per slice, `git branch -f rescue/<name> HEAD` after each.
5. Branch-pointer ops in shared worktrees need an announcement convention — until one exists,
   treat every unannounced pointer move as weather, not malice.
