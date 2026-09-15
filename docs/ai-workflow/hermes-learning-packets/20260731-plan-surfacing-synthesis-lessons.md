---
originating_model: claude-fable-5
provenance: Fable-tier synthesis (Final Decider), Session Shell live-fix loop 2026-07-31
privacy: IDs/roles only — no client data, no secrets
date: 2026-07-31
title: Plan Surfacing synthesis (2026-07-31)
tier_basis: Fable-tier synthesis (Final Decider), Session Shell live-fix loop 2026-07-31
decision: Plan Surfacing synthesis (2026-07-31)
status: draft
migrated: 2026-08-16 — required keys back-filled mechanically (date<-filename; title<-H1; tier_basis<-provenance; decision<-title; status=draft (never reviewed against a contract)); originating_model untouched
---

# Learning packet — Plan Surfacing synthesis (2026-07-31)

Durable lessons from the day the workout-plan spine got its master plan (SWA-100; plan doc
`PLAN-SURFACING-MASTER-PLAN-2026-07-31.md`, commit 06804ca7d).

1. **Billing authority belongs to the lifecycle aggregate, not the save path.** The plan-cursor freeze
   existed because credit deduction lived on the workout-log save path, which forced assignment-type
   guards to double as billing controls. Once deduction moves to the Session lifecycle (completed/no-show),
   the guards stop protecting money and can be loosened safely. General form: when a guard seems to block
   an obviously-right feature, ask what SECOND responsibility got welded onto the path it guards — unweld
   that first.
2. **Absence of a join is not intent.** "Bill only when a session is linked" makes billing a function of a
   MISSING association — silent revenue leak by construction. Any rule keyed on absence needs a required
   reason enum + an exceptions queue + a detector shipped atomically with the rule.
3. **One concept, one resolver, N consumers.** Two date→plan-day mappers (basis chain vs weekday-name
   match) coexisted and would disagree on live surfaces. With five consumers incoming (logger, schedule,
   /current, Coach, native app), the only safe shape is one server-side definition exposing
   cursor ("what's next") and calendar ("what's on date D") as two functions — never a client-side port,
   never a second endpoint for the same truth.
4. **Decorate objects, don't add parallel surfaces.** A shipped plan-projection layer went unrecognized by
   its own owner because it rendered as a separate card grid beside the calendar instead of on the
   sessions/days users actually click. Feature discoverability = decorating the object of attention.
5. **"Element ignores the theme" = token defined nowhere.** The logger's hero panel stayed blue under
   every palette because its var() token had no definition site — the fallback always won. Detection:
   grep the token's DEFINITION sites, not its usages; prevention: a static law banning palette-dead
   tokens on themed surfaces (shipped as `shell.world-seam.test.ts`).
6. **Immutable records need versioned semantics.** Emitting the same receipt shape for a new meaning
   (unbilled advancement) silently rewrites history's meaning. Version the record and make the new
   linkage field non-nullable instead.
7. **Consult economics:** Kimi at ~$0.04 for a design gate and Opus 5 at ~$0.82 for structural
   architecture both paid for themselves; the orchestrator's job is fusing them and recording deviations
   — advisors advise, the Final Decider owns the verdict and its reasons.
