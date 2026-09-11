# G10 — opt-in proactive nudges (S10)

Artifact `SCU-G10-44`. Version 1. Date: 2026-09-11. Owner: Sean.
Route: packet [31](31-gwen-execution-handoff.md) G10/S10 row, contract
[32](32-gwen-domain-and-verification-contract.md) T38–T39.

## Scope

NEW `backend/services/ai/coachProactiveNudge.mjs` — the deterministic
scheduling/consent engine for proactive nudges, composed for the EXISTING
in-app worker (`services/notificationService.mjs`, with the
`nutritionLogNudgeCron.mjs` as the deployed worker precedent):

- explicit opt-in only (default OFF) + master disable;
- local quiet hours 20:00–08:00, DST-safe (the caller passes the UTC offset
  in effect AT the candidate instant; the engine never guesses DST);
- one-nudge-per-local-day cap;
- per-category weekly dedupe (7 clear days between same-category nudges);
- snooze (until) support;
- delivery-time recheck: consent, target access and evidence freshness are
  re-verified AT the delivery instant — a queued nudge whose owner opted out
  mid-queue delivers NOTHING (T38), and the writer is invoked only after the
  recheck passes.

Pure module: the notification writer is dependency-injected, so the engine
stays unit-testable and cannot send by itself.

## Out of scope

Cron registration/wiring into the running worker (a follow-up wiring slice can
mount planNudgeDelivery + deliverNudge inside the existing cron pattern);
email/push channels (in-app only per contract); briefing content generation.

## Verification

Vitest unit suite covering T38 (opt-out during queued briefing -> zero
delivered; consent rechecked at delivery) and T39 (DST quiet hours, duplicate
same-day trigger, snooze, weekly dedupe, one/day cap). Contract tests written
first; new-module green-lock per plan 42's disclosure pattern.
