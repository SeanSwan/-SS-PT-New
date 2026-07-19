# Hermes inbox memo

- **Surface:** vs-claude
- **UTC:** 20260719T065142Z
- **Topic:** Design-overhaul CROSS-CUTTING REVIEW + hardening of all 7 shipped surfaces (main ab84f94fc)

## What I did / learned
- Ran an "awesome review" across all 7 shipped design-overhaul surfaces: deterministic sweep (full tsc 0, eslint 0, de-Galaxy CLEAN, 13/13 money/credential/auth truth tests, build) + 3 parallel adversarial subagents + 2 Codex rounds. Fixed everything to dry. main `ab84f94fc`.
- **Money/data-path audit = PASS, 0 violations** (strongest result): vs the pre-program baseline, 118 files ADDED, only 7 MODIFIED (5 lens-keystone + 2 additive seams: routes.mjs, main-routes.tsx). Every pre-existing money/cart/checkout/catalog/auth/section file has a byte-for-byte EMPTY diff. The credential fix was 4 lines inside a comment. vNext hooks read-only. Seams purely additive; auth guard preserved.
- **Hardening fixes (all 6 gates + 6 flag hooks now consistent):** gates got the rAF-retry ContractCheck (Store+Dashboards were fail-OPEN on the lazy race) + onFail() on retry exhaustion (shell-less V-next → fail CLOSED). Flag hooks: runtime-present WINS (kill switch truly absolute — explicit false always closes, no longer beaten by QA override); non-200 throws → catch → env; fetch failure → env only (override can NEVER bypass an unreachable kill). a11y: store-v4 <main> restored; video grid gained a visually-hidden <h2>.
- CLEAN dimensions across all 7: reduced-motion (framer entrance disabled in JS), canvas loops (IO+visibility pause, no leaks), focus/targets/no-nested-interactives, inline-style (zero style={{}}). The Dashboards fallback hexes are Rule-6-compliant var(--token,#fallback), not defects.

## Why it matters to Hermes
- The 7-surface program is now independently verified money-path-safe + fail-closed-consistent. All still flag-OFF in prod.
- **Merged another lane's work:** origin/main had advanced with the "Post-Save Handoff logger" feature (WorkoutLogger/handoff/ + backend services + a clientRequestId migration). Merged cleanly (shared file publicConfigRoutes.mjs kept both), verified the combined tree builds. Design-overhaul + logger-handoff coexist on main.
- **Reusable lesson:** per-surface reviews miss CROSS-CUTTING drift — the 2 oldest gates (Store/Dashboards) had an earlier weaker ContractCheck that the later surfaces' reviews couldn't see. A batch cross-cutting review after N surfaces catches this class.

## State right now
- Branch `claude/build-swan-lens`; main == `ab84f94fc`; Render deploying. Sean gated the push. Starting surface #9 Photography (non-billing 2219L decompose) next; #8 Gallery (billing-critical) deferred to a fresh session per the handoff.

## Sean owes / blockers
- Env flags to activate any shipped surface. #8 Gallery billing-critical decision (fresh session recommended).
