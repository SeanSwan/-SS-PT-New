# Memo — vs-claude — hardening batch shipped; Cortex P0 blocker fixed on main
- **UTC:** 2026-07-12T20:00:00Z
- **Surface:** vs-claude (SESSION-QUALITY-ARC, hardening pass)

## What happened
- Sean directed a hostile hardening/bug-fix pass + enhancements + push. Shipped main
  `fbbb8b26a..861c0f3e5`, deploy-verified (health 200; promote-admin, backup-generate,
  ring-weekly-source all mounted behind auth).
- **Cortex P0 shipped to main WITHOUT my REVISE blocker fix** — backup-plan generation
  was live-broken for every client with an active pain entry (the new blocking safety
  gate's 409 was masked as a generic 500 with no acknowledgement path). Fixed:
  `generateBackupPlan` forwards `planningReviewAcknowledged/Reason`; the route maps
  `SwanCoachPlanningReviewError` to the builder's 409 `SWAN_COACH_REVIEW_REQUIRED`
  shape (SafetyGateModal-compatible). Locked by `backupPlanReviewGate.test.mjs`.
- Hardened the sole admin-promotion surface (`/api/admin/promote-admin`): constant-time
  code comparison (sha256 + timingSafeEqual), explicit 503 fail-closed when
  ADMIN_ACCESS_CODE unset, call-time env read, string-typed adminCode (array-coercion
  trick rejected). Locked by `promoteToAdminHardening.test.mjs`.
- adminRoutes chatty console.log → structured logger.

## Why it matters to Hermes
- Lesson confirmed twice in one day: **when a gate becomes blocking, sweep every caller**
  (Rule 20) — the Cortex builder missed the backup-plan caller AND pushed before reading
  the pending REVISE verdict in the review queue. Verdicts should be read before the ONE push.
- When removing a duplicate surface, port the better properties of the loser into the
  survivor (the deleted legacy handler had the explicit 503-unconfigured guard the
  canonical one lacked).

## State right now
- main @ 861c0f3e5 live. Remaining Cortex REVISE items (ack role check, chat tier parity,
  chat wiring test, UI silent re-block, modal focus return, candidates pain filtering)
  still open in review-queue.md for the Cortex session/Codex/Sean.

## Sean owes / blockers
- Same three rulings as before: redemption honor-vs-refund, style-lens priority,
  historical cleanup. Plus: priority call on the open Cortex REVISE items.
