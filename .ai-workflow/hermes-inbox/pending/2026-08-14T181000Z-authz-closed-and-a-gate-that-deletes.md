# Hermes memo — authz question closed, Rule 67 rewritten, and a gate whose remedy deletes doctrine

**Surface:** vs-claude (Opus 5) · **Session:** main-s2e2f8326 · **UTC:** 2026-08-14T18:10Z
**Branch:** `claude/qa-harness-slice0-20260811` — **local-commit, NOT pushed.** Invisible to
off-machine agents and to you until someone pushes it.

---

## What happened

Picked up a parallel session's ranked handoff instead of starting my own plan. Its
evidence-backed conclusion — *do not build the cross-role authz matrix, the existing audit
script already answered the question* — **overrode the recommendation I had given the owner
an hour earlier.** Adopted it and worked its list.

1. **The three unverified handlers are all GUARDED.** Traced by hand, file:line:
   - `badgeRoutes:206` -> `setUserBadgeDisplay`: `role === 'admin' || isOwnProfile`, else 403.
   - `messagingRoutes:56` -> `updateParticipantRole`: `requireGroupManager` (non-member 404)
     then `canManageParticipantRole` = owner-only, else 403.
   - `messagingRoutes:63` -> `removeConversationParticipant`: membership lookup 404s a
     non-member; `canRemoveParticipant` refuses owner targets, allows self-leave, and permits
     admins to remove members only.
   So: **user A cannot remove user B from a conversation A does not belong to** — 404 at the
   membership lookup. **199/199 user-scoped handlers now have a traced authz path.**

2. **Fixed three defects in the standing IDOR audit instrument** (`audit-idor-surface.mjs`):
   - `router.use()` matched a hardcoded list of six names, so a file-local `requireStaff`
     (admin-or-trainer, else 403) gating a whole router read as unguarded. Now it reads the
     function body. `protect`/`authenticateToken` still never count — authn is not authz.
   - **`req.user?.id` did not match.** The regex required the dot. Optional chaining appears
     in **89 files** against 143 for the dot form — the reader was blind to roughly as many
     ownership checks as it could see, and degraded quietly because most of those routes
     carried other matching middleware.
   - Guards living in controllers were invisible. Added ONE hop route->controller, plus
     `export {} from` barrel resolution (the messaging facade is 23 lines of pure re-export).
     A controller that delegates to a *service* is still reported unguarded — deliberate.
   - Every clearance now records WHY, split direct vs INDIRECT, so the tool's own reasoning
     is falsifiable. A boolean made it unauditable — the same defect it hunts.

   7 flagged -> 0. **That number is only worth anything because of two negative controls:**
   a probe route with `router.use(protect)` and a bare `req.params.userId` read, and a
   guardless controller reached through a barrel. Both still flagged SENSITIVE. Probes deleted.

3. **Rule 67 rewritten.** It said "while Claude + Codex run in parallel", called itself a
   "2-agent layer", and named two lane files that are now stale relics — while the real state
   is 4-8 live sessions across ~184 worktrees and the commonest collision is Claude-to-Claude.
   Added **R1b talk-to-them-first** (the ledger is a channel; the owner is the last resort)
   and **R1c read their work before forming your plan.** Deleted the hardcoded June lane split
   rather than updating it: perishable state does not belong in a doc that reads as authoritative.

## ⚠ A gate whose suggested remedy destroys doctrine

The `SessionStart` drift-check prints *"AGENTS.md mirror body != CLAUDE.md. Fix: run
`sync-agents-mirror.mjs`"*. I ran it. **It deleted 216 lines.** The mirror is drifted in the
**ahead** direction: `AGENTS.md` holds Rules 74-78, "ADW Discipline", and the Rule 46 Kimi
Hostile-Review Gate amendment, which exist in `CLAUDE.md` **neither on this branch nor on
`origin/main`**. The script can only regenerate AGENTS.md *from* CLAUDE.md; it cannot express
"the mirror is newer", so obeying the hook silently destroys the only copy. Caught by reading
the diff before committing; reverted. Broadcast to all agents in `review-queue.md`.

**Generalisable:** a gate that names a fix has authority it did not earn. Check the direction
of a drift before applying the remedy the tool suggests.

## Mistakes I made

- **I recommended building something a peer had already proven unnecessary.** I gave the owner
  "next slice: Revision 2 of the authz matrix" without reading the parallel session's committed
  handoff, which said *do NOT build it* and showed why. The file was committed and sitting
  unread. Caught only because the owner told me to go talk to the other agent. Fix: Rule 67 R1c.
- **I relayed a coordination problem to the owner instead of using the channel built for it.**
  The session-start digest named the peer session and its exact task. I reported that to the
  owner as a caution rather than writing to `review-queue.md`. His response: *"we're supposed
  to have a system set up so you can talk to the other agents, so that shouldn't even be our
  issue."* Correct. Fix: Rule 67 R1b.
- **REPEAT — wrong-instrument reach, and this one was already written up.** I ran
  `git merge-base --is-ancestor <sha> HEAD` from a worktree on a *different branch* and
  reported the owner's commits as orphaned. They were intact on their own branch; my baseline
  was wrong. **The identical lesson — validate the instrument before believing a negative —
  is already in the corpus and was repeated within 24h of being written.** The correction that
  works is procedural, not resolutional: *name the baseline in the same breath as the verdict*
  ("not an ancestor **of wip/comms-notifications**"), because a verdict without its baseline
  stated is unfalsifiable.
- **I nearly shipped the AGENTS.md deletion.** I ran the sync because a trusted hook told me
  to, and only checked the diff afterwards. The 216-line delete would have been in a commit if
  `--stat` had looked ordinary. Fix: read the diff of any generated-file regeneration before
  staging it, especially when a hook proposed it.
- **I retried a failing edit three times before validating the tool.** The Edit tool reported
  "String not found" for a string that `grep`, `ripgrep`, AND `node` all found exactly once.
  I assumed my string was wrong twice more before testing the instrument. Three instruments
  against one is a decided question; I should have reached that after the first disagreement,
  not the third. Worked around it with a node replacement, verified by re-grep.

## Error -> fix -> repeat ledger

| Error class | Times this session | Already written up before recurring? | What actually stopped it |
|---|---|---|---|
| Wrong instrument / baseline-free verdict | 2 (SHA ancestry; Edit-vs-grep) | **Yes** — corpus packet, <24h old | Stating the baseline inside the claim; requiring a 2nd instrument of different shape before an absence claim |
| Acting on a stale branch | 1 (AGENTS.md sync) | Yes — "stale state" is the corpus's #1 class at 31% | Reading the diff before staging; checking drift *direction* |
| Escalating instead of coordinating | 1 | No — the rule permitted it | Rule 67 R1b/R1c, now explicit |
| Duplicating a peer's finished work | 1 (nearly) | No | Rule 67 R1c |

## External-model calibration

**No paid calls this session — deliberately.** The owner asked for a Kimi hostile review; I
found Kimi had already reviewed both targets earlier the same day (harness: 14 findings, 9
fixed / 4 refuted; authz design: 14 findings, 4 Critical, verdict NOT ready to build). Buying
a third opinion on documents reviewed 30 minutes earlier would have spent money to re-learn a
known answer. Reported that to the owner instead and named the one call worth buying later —
re-review of a revision that does not exist yet. **Cost avoided: ~$0.25. The standing rule
(one review, ask before a second on the same topic) did its job.**

## Owner-gated, unchanged

1. **Push `claude/qa-harness-slice0-20260811`** — still local only. Its upstream is
   misconfigured to `refs/heads/main`, so a bare `git push` from that worktree targets the
   deploy branch. Safe form:
   `git push origin claude/qa-harness-slice0-20260811:claude/qa-harness-slice0-20260811`
   then `git branch --unset-upstream`.
2. **Reconcile AGENTS.md -> CLAUDE.md** (Rules 74-78 + Rule 46 amendment). Needs an owner and
   a branch that is current with `origin/main`. Until then the drift warning must be ignored.
3. Carried: rotate the Render API key; add the DMARC record.
