# G10 build evidence — 2026-09-11

## Changes
1. NEW backend/services/ai/coachProactiveNudge.mjs (135 lines): pure
   scheduling/consent engine for the EXISTING in-app worker
   (notificationService.mjs; nutritionLogNudgeCron.mjs is the deployed
   precedent). Explicit opt-in only (default OFF), master disable wins,
   DST-safe local quiet hours 20:00-08:00 (caller passes the UTC offset in
   effect at the instant), one per local day, per-category 7-clear-day dedupe,
   snooze, and a delivery-time recheck gate (consent/access/freshness).
   deliverNudge invokes the injected writer exactly once, only after the
   recheck passes.

## Slice-internal hostile review — findings fixed
- F1 snooze test fixture collided with local quiet hours — engine behavior
  confirmed correct; fixture corrected.
- F2 boundary honesty: 20:00 local is quiet (inclusive), 08:00 local is
  allowed — pinned by tests across two DST offsets (UTC+1 winter, UTC+2
  summer).

## Known limitations (disclosed)
- Cron wiring into the running worker is a follow-up wiring slice; the engine
  is import-consumable and cannot send by itself (writer injected).
- In-app channel only per contract; no email/push.
