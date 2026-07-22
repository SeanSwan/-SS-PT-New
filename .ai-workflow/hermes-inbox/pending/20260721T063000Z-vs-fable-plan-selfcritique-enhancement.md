# Hermes Inbox Memo

- **Surface:** vs-claude (model: Fable 5)
- **UTC:** 2026-07-21T06:30:00Z
- **Slice:** Self-critique enhancement pass on the acquisition-funnel build prompt (`97e3b12bd`) + re-verification loop (in progress)

## What happened
On Fable, ran a hostile critique of MY OWN earlier build prompt (893e2c375) and applied 7 fixes (97e3b12bd).
Launched an adversarial re-verification of the 20 review fixes (448a20f2e) whose pass-2 was interrupted last
session — result pending at time of writing.

## Transferable PLANNING lessons (the durable part — apply to future build prompts)
1. **Deliverability is a PREREQUISITE, not a step.** Any plan whose tasks send email/SMS must verify SPF/DKIM/
   DMARC + sender env FIRST — otherwise every downstream "sent" is silent failure, worse than nothing. Promote it
   to P0-0 and gate the rest on it.
2. **Guard against over-scoping the flagship task.** The `/book` page was drafted as a live-availability calendar
   (couples to trainer scheduling + auth). The MVP is "capture intent to book + alert owner"; the calendar is a
   separate deferred slice. Ship the smallest thing that removes the dead-end.
3. **Rank by realized value, not effort.** Referral ATTRIBUTION is data with zero user-visible effect until a
   reward is attached — it ranked above booking (the actual conversion path) in the draft. Reordered.
4. **A dashboard fix that only makes a widget non-zero isn't done.** `nextFollowUpAt` at capture needs a TIERED
   SLA (hot score>=70 -> 2h, else 24h) AND a one-time backfill for the null historicals, or the metric still lies.
5. **"Attribution/referral" tasks need the query spelled out.** JSONB `@>` containment + a GIN index + collision/
   self-referral/unknown handling — or it's a table scan and a guessing bug waiting to happen.
6. **A marketing DRIP is not transactional email.** Nurture (day 0/1/3/7) needs lawful basis + one-click
   unsubscribe + suppression check per send (CAN-SPAM/GDPR), separate from raw deliverability.
7. **If you can't measure the lift, the funnel isn't done.** Add funnel instrumentation + a stated North-Star
   metric to any acquisition plan, or arming/booking success is unfalsifiable.

## Verified state changes this session
- Merged origin/main: **Lane-A activation** (worldDefaults.ts + SurfaceLensGate wrap) and **Launch Control**
  (publicConfigRoutes -> env baseline + flag_overrides overlay + POST /flag-health telemetry; preview-as) are now
  on the branch. Surface flags now actually re-skin when flipped.
- Branch `claude/build-swan-lens` is ~11 ahead of origin/main, UNPUSHED. Render deploys STILL failing on Render
  infra; nothing live.

## Owed / blockers
- Re-verification result of 448a20f2e (running) — fix anything it finds, loop to dry.
- Sean: NCEP credential real? arm nurture? flip PRISM? retry Render deploy.
