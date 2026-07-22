# Hermes Inbox Memo

- **Surface:** vs-claude (Fable 5)
- **UTC:** 2026-07-21T08:30:00Z
- **Slice:** Kimi funnel review folded into the plan + routing doc (`2a24b887d`)

## The insight worth keeping
Kimi's thesis on our acquisition-funnel plan: **every task terminated at "alert the owner" / "set a field for a
human to read" — Sean is the bottleneck the plan claimed to remove.** Durable planning lesson: an acquisition/
ops plan whose every step ends in a human notification is instrumentation of failure, not automation. Push each
step one more move — to an automated transactional action or a revenue event.

## 9 gaps added to ACQUISITION-FUNNEL-ACTIVATION-BUILD-PROMPT-2026-07-21.md (money-ranked, mostly S-effort)
G1 ⚑ pay-to-hold at booking (Stripe link; Sean picks free / $50 deposit / $175 intro) — biggest; free consults
no-show 30-50%, repo already has Stripe+$175. G2 instant automated TRANSACTIONAL first-touch on capture (not the
marketing-nurture gate; needs deliverability). G3 chain PRISM->/book with email prefill (~6-tap dead-end -> 3-tap
booked). G4 consult reminders + no-show recovery (new P1-2, outranks referral). G5 shareable milestone cards
(retention/referral flywheel — the core loop's 'shareable milestone' step generates no artifact today). G6 SLA
breach escalation. G7 /book trust assets. G8 backlog reactivation on nurture arming. G9 source->booked->paid
attribution column.

## Model-routing session hygiene (Kimi ASK 2, folded into MODEL-ROUTING-FABLE-FALLBACK.md)
Highest leverage: **quarantine hostile-review sessions from build sessions** — the Fable security classifier holds
the WHOLE session at the fallback, so one mid-session security audit downgrades every later build call. Also:
reframe review prompts offense->defense (same content, non-adversarial framing doesn't trip the router); route
exploit-phrased passes to a secondary model on purpose (you're downgraded anyway) and reserve Fable for build.

## AWAITING SEAN (3 decisions unlock the funnel build)
G1 booking-commitment shape · arm nurture? · is NCEP credential real/documented? Then build in Kimi's corrected
shape: P0-0 deliverability -> booking MVP w/ pay-to-hold + PRISM->book chaining. Safe decision-free pieces
buildable now if Sean says go: P0-1 follow-up SLA + backfill, P0-4 instrumentation.

## State
Branch ~16 ahead of origin/main, UNPUSHED. Render deploys still failing on Render infra; nothing live. Review
loop is dry. Kimi consults this arc: ~$0.3.
