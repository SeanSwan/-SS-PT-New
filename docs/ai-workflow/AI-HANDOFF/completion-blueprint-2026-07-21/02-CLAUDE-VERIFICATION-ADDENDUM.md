# Fable verification addendum — completion blueprint (2026-07-21)

Hostile pass on Kimi's blueprint (`01-BLUEPRINT.md`). The architecture ruling is ACCEPTED; one seam
premise is CORRECTED by repo evidence, and it surfaces a product-surface question the blueprint couldn't see.

## ✅ Architecture ruling ACCEPTED (new sibling, orchestrated, flag-gated)
- 321/300 line cap makes fold-in a Rule-4 violation on arrival → (b) is the only compliant option. `[VERIFIED]`
- Zero lines changed in the live component; feature flag → byte-identical prod when off; blast radius zero.
- S5 stop condition ("existing `XPCounter.test.tsx` passes UNMODIFIED") is the correct did-not-break-it gate.

## ⚠ CORRECTION — the seam's "existing call site" DOES NOT EXIST
Kimi's §2 seam assumes "wherever `PostWorkoutCelebration` is currently rendered on save-success." **It is
rendered NOWHERE.** `[VERIFIED]`
- `grep <PostWorkoutCelebration` across `frontend/src` → **0 JSX mount sites.** Only hits: the component
  file itself + a doc-comment in `XPCounter.tsx`.
- Classification (Rule 27): **DORMANT** — built, tested, but never wired to any consumer.
- **Impact on the build order:** slice 9 ("~5-line call-site swap") is WRONG. There is no existing call
  site to swap. The correct slice is **net-new integration**: mount `WorkoutCompletionFlow` at the real
  workout-save success path — which also finally wires the dormant XP celebration that has never fired in
  production. This is bigger than "5 lines" but still bounded.

## ⚠ PRODUCT-SURFACE QUESTION the blueprint couldn't see (Rule 26)
The 6 principles are about the **CLIENT's** completion moment (a proof card THEY share). But the workout-
logging surfaces in the repo are **trainer/admin-facing**: `WorkoutLoggerModal.tsx` lives under
`DashBoard/Pages/admin-clients/` — a trainer logging a client's session, not a client finishing their own.
`CelebrationPortal.tsx` exists as a portal/mount mechanism. `[VERIFIED paths]`

**The load-bearing question for Sean:** where does a CLIENT complete their OWN workout today?
- If a client self-logging surface exists → that's the integration point; the proof card is client-facing.
- If only the trainer-logs-for-client path exists → the "proof card the client shares" has no client-facing
  trigger yet, and this becomes a two-part build (client logging surface + completion flow) OR the proof
  card fires for the trainer as a "here's what your client just did" artifact (different product intent).

This is a **canonical-surface question (Rule 26)** that must be answered before building — it determines
WHO sees the proof card and WHERE it mounts. A full `canonical-surface-audit` of the client workout-logging
path is the right pre-build step.

## Disposition
- Blueprint architecture + component design + wireframes + tokens table: **build-ready.**
- Before building: answer Kimi's §14 (5 open questions) + resolve the client-vs-trainer completion-surface
  question above via a canonical-surface receipt.
- Building is production UI → routes through `swan-design-router` (Rule 40) and needs Sean's explicit go.
