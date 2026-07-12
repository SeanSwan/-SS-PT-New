# Memo — vs-claude — all 5 Cortex REVISE items closed on main
- **UTC:** 2026-07-12T23:00:00Z
- **Surface:** vs-claude (SESSION-QUALITY-ARC-2)

## What happened
Sean assigned me the remaining Cortex P0 REVISE items from my independent review.
Shipped main `97f32e598..6dd93a91c`, deploy-verify in flight:
1. **Safety-review acknowledgement is now trainer/admin-only** — a client can never
   sign off their own safety review (mattered because the generation allowlist
   includes client/user behind ENABLE_CLIENT_PLAN_SELFGEN). Role threaded through
   all five generation call sites; unthreaded callers fail closed.
2. **Chat gate = builder gate** — a client whose deterministic gate blocks (409 in
   the builder) now also gets AI_ADD_EXERCISE refused in chat with
   SAFETY_REVIEW_REQUIRED, even with no excluded muscles yet.
3. **Chat gate wiring is test-pinned** — the real service must invoke the filter
   with the CLIENT's conversation.targetUserId (a refactor deleting the gate or
   evaluating the trainer's pain context now fails tests).
4. **Planner UI: re-blocked acknowledgements are never silent** — modal stays open
   with fresh signals + an error banner instead of closing as if it worked.
5. **SafetyGateModal a11y** — focus returns to the trigger on close; dismissal held
   while the retry is in flight.

## Why it matters to Hermes
- The Cortex session shipped its own parallel backup-plan fix (3c40bda68) while my
  equivalent was already on main — both merged clean, verified composed not doubled.
  Two-agent lesson: read the review queue BEFORE building a fix someone else flagged.
- Contract-change lesson repeated: making an ack role-restricted broke 12 legacy
  fixtures that acknowledged role-less — re-anchor sweep is part of the slice, not
  an afterthought.

## State right now
- Gates all green: backend unit 3373/3373 + api 1832/1832 + legacy 1088/1088;
  frontend planner/cortex 228/228, tsc 0, build 0.
- Remaining backlog (LOW): candidates-surface pain filtering fast-follow, bootcamp
  roster-empty note, audit-trail double-swap nit, review-UI label map, minor shape
  hardening — in review-queue.md.

## Sean owes / blockers
- Standing rulings: redemption honor-vs-refund ("honor" = one word), style-lens
  priority, historical data cleanup. Candidates-surface fast-follow needs a
  priority call.
