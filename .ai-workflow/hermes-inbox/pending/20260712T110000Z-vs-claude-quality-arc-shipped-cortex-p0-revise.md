# Memo — vs-claude — quality-arc batch shipped + Cortex P0 independent review = REVISE
- **UTC:** 2026-07-12T11:00:00Z
- **Surface:** vs-claude (SESSION-QUALITY-ARC)

## What happened
- Shipped + deploy-verified on main `a903d4912..aa71fcc82`:
  1. **Legacy duplicate admin-promotion handlers REMOVED** — `/api/auth/promote-admin` +
     `/promote-client` inline handlers deleted. They validated a drifted env var
     (`ADMIN_PROMOTION_CODE`) that the boot-time secret guard never covered; zero live
     consumers. Canonical surface = `/api/admin/promote-*` via userManagementController.
     Prod probe: legacy URL 401→404 across the deploy flip. Locked by
     `backend/tests/api/promoteRoleCanonicalSurface.test.mjs`.
  2. **Weekly workout aggregates now EXIST** — new `GET ring-weekly-source` on both analytics
     routers (per-session raw ts + volume/duration/sets, 28-day window, LEFT JOIN so log-less
     completed sessions count). Server ships raw timestamps only — client buckets the USER-LOCAL
     week (same principle as Sean's heatmap ruling). Same tier gates as chart-weekly-volume.
     This unblocks the Apex dashboard workouts/volume rings with real data.
- **Independent quality review of Cortex P0 branch** (3 parallel reviewers, HIGH findings
  hand-verified): **verdict REVISE**, full detail in `.ai-workflow/coordination/review-queue.md`.

## Why it matters to Hermes
- All 7 Cortex P0 safety claims are REAL (verified enforcement, fail-closed, server-derived
  identity), BUT one **undisclosed regression**: `backupPlanService.mjs:111` calls generatePlan
  without the new acknowledgement and the route maps the 409 safety block to a generic 500 —
  backup-plan generation bricks for every client with active pain. Must be fixed before the
  ONE push.
- Transferable lesson: when a gate becomes blocking, sweep EVERY caller of the gated function
  (Rule 20) — the builder swept its 3 known callers but missed the backup-plan path.

## State right now
- Quality-arc batch LIVE in prod (health 200, both behavior probes pass).
- Cortex P0 branch still unpushed (Sean-gated); my REVISE verdict + 4 small revise items +
  LOW sweep list are in review-queue.md for the Cortex session/Codex/Final Decider.

## Sean owes / blockers
- Ruling on redemption boundary (rec: honor + alert), style-lens priority (rec: below
  marketing), historical cleanup (plan-gated).
- Cortex P0 push decision AFTER the backup-plan blocker fix.
