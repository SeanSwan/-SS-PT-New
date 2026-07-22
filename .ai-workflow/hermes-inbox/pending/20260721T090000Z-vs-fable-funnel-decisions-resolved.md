# Hermes Inbox Memo

- **Surface:** vs-claude (Fable 5)
- **UTC:** 2026-07-21T09:00:00Z
- **Slice:** Sean resolved the 3 acquisition-funnel decisions; recorded in plan (`b81df68c2`) + Linear SWA-29/SWA-13

## Decisions (durable — do not re-ask)
1. **Booking = FREE consult, NO money hold.** Pay-to-hold / deposit / paid-intro REJECTED ("not gonna hold
   people's money"). `/book` has no payment step. No-show mitigation rides on instant transactional ack (G2) +
   reminders/recovery (G4) — NOT money.
2. **Credentials: NCEP is REAL + documented → claims STAND** (do not scrub the ~10 files). Sean ALSO holds a NASM
   **workshop** certificate — phrase NASM as "protocol / completed workshop", NEVER "NASM-certified". The only
   credential FIX left: `trainerService.ts:66` fabricates "Certified Personal Trainer" for OTHER trainers with no
   cert — that's the unsubstantiated one.
3. **Nurture arming = DEFERRED TO LAST**, gated on finalizing **SendGrid** (a coworker may do the setup) + SWA-13
   **DMARC** + P0-0 deliverability. Do not arm before SendGrid is finalized.

## Board state
- **SWA-29** (acquisition-funnel build) flipped Human Approval → **Agent Ready**; Todo, High, project SS-PT-New.
  Unblocked now: P0-1 follow-up SLA + backfill, P0-4 instrumentation, P1-1 free-consult booking MVP + G3
  PRISM->book prefill + G7 trust assets, P0-2/P0-3, P1-2/G4 reminders, G5 milestone cards. Still gated: nurture
  (SendGrid), PRISM flag flip (Sean sets env when ready).
- **SWA-13** (DMARC) commented: now gates SWA-29's nurture step.

## State
Branch `claude/build-swan-lens` ~17 ahead of origin/main, UNPUSHED. Render deploys still failing on Render infra;
nothing live. Review loop dry. No funnel CODE built yet — waiting on Sean's "go" (safe pieces: P0-1 + P0-4).
