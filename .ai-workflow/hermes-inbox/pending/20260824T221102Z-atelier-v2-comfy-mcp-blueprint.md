# Atelier v2 — the ComfyUI-MCP blueprint, and a panel that reviewed my stale numbers

**From:** vs-claude (Opus 5) · terminal · 2026-08-24T22:11Z
**Surface:** content-studio / shared providers / render-agent
**Type:** plan + panel review. No product code changed.

## What happened

Sean asked to take the Content Studio to the next level by integrating the ComfyUI **local MCP**
(the capability from the transcript he pasted), and — the part that widens the scope — to make it
serve **the other websites he builds**, not only SwanStudios. He wanted a blueprint, mermaid and
wireframes precise enough for a worker-bot, reviewed by GLM-5.3, me, and Ox.

Delivered: a review packet, a 3-seat panel at **$0.00**, a panel-reconciled blueprint, and a
published artifact. Nothing committed — see BLOCKED below.

## The decisions worth carrying

- **The MCP is a control plane, not the product.** It never enters the render path. It authors and
  diagnoses; the catalogue is truth; `validateGraph()` is the only door between the two.
- **MCP ships read-only first.** Write ops (install, start/stop) stay dark until they acquire the
  existing render-job lease.
- **`atelier_workspaces` is a new root table with a hard FK.** Not an overload of `project_id`
  (which means an editorial content project), and never a polymorphic owner.
- **Slice order was reversed on the panel's argument:** Compose first, Doctor second.

## Live-state facts Hermes should hold

- `VideoRenderJob` and `MediaAsset` already carry `projectId` as a **nullable, unconstrained UUID**.
  The only hard tenancy FK is `user_id`. Multi-project is additive, not a rewrite.
- `contentStudioRoutes.mjs` is **659 lines** against the 300 cap — a standing violation, and the
  file the first slice would otherwise extend.
- `comfyuiLocal.mjs` is **227** lines, not the 296 the August handoffs say.
- The render agent is **serial** — one lease at a time, heartbeat-extended, server-side sweeper.
- Confirmed unfixed risk: the MCP's start/stop can kill a live render; the retry handler treats it
  as retryable; on a hosted route that is a second charge.

## BLOCKED — needs Sean

A **zero-byte `.git/index.lock`** has been present since 14:57 PDT with **no commit behind it**
(last commit 14:46). Codex's lane is idle and holds no locks, so it is most likely an orphan from a
crashed process in another Claude session. I did not clear it — removing another agent's git lock is
the unilateral move Rule 67 exists to prevent. **Three files are written and unstaged**: the packet,
the blueprint, and the panel directory. Sean or the owning session should clear it, then commit.

## Mistakes I made

- **Quoted a line count from an August handoff instead of measuring it** (296 vs the real 227). Two
  independent senior seats built a "split it before you breach the 300-line cap" blocker on my bad
  input. **MECHANISM:** every number in a review packet comes from a command run in that session.
- **Described the schema in prose rather than pasting the column list.** That single omission caused
  a REJECT and a "blank cheque" verdict about a migration that is additive. **MECHANISM:** data-model
  questions ship the actual columns.
- **Attributed `videoJobQueue.mjs` to the render path.** It is the BullMQ YouTube-library queue.
  **MECHANISM:** read the docblock of every file cited in an inventory table.
- **Ordered the slice plan wrong** — put the diagnostic tool ahead of the creation surface, which is
  the exact failure this project already recorded. The panel caught it, not me.
- **Tried to commit into another agent's lock** before checking the lock's age against the last
  commit. **MECHANISM:** compare mtimes before staging; report, never remove.

## External-model calibration

| Seat | Real | Disproven | Cost |
|---|---|---|---|
| Ox Alpha | 3 of 5 blockers — incl. two nobody else had (partner-node licence bypass; retry × paid-provider double-spend) | 1, from my stale number | $0.00 |
| GLM-5.3 | 5 of 9 — matched Ox on the top finding, beat it on prescription | 2, both self-flagged conditional | subscription |
| Qwen 3.8 local | 1 of 3 — but the **only** seat to see Comfy Cloud credentials must stay on the local box | 2, both from assuming a multi-tenant SaaS | $0.00 |

Routing note: Ox finds what will bite, GLM says what to do about it — run both for architecture.
Qwen's failure mode is frame-assumption; state the frame explicitly in the packet and it improves.

## Artifacts

- `docs/ai-workflow/AI-HANDOFF/ATELIER-V2-COMFY-MCP-BLUEPRINT-2026-08-24.md`
- `docs/ai-workflow/AI-HANDOFF/ATELIER-V2-COMFY-MCP-REVIEW-PACKET-2026-08-24.md` (correction appended, not edited)
- `docs/ai-workflow/AI-HANDOFF/panel-atelier-v2-2026-08-24/`
- `docs/ai-workflow/hermes-learning-packets/2026-08-24-a-stale-number-you-supply-comes-back-as-a-finding.md`
