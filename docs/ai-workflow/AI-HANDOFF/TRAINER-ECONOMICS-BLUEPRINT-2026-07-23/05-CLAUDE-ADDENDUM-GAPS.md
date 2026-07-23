# Claude Addendum — gaps found reviewing Kimi's blueprint (2026-07-23)

Kimi's `01-KIMI-BLUEPRINT.md` is the authoritative build plan. This addendum records the 4 gaps Claude's hostile check found. The builder MUST apply these on top of the blueprint.

## G1 — Blueprint output truncated mid-§12 (low impact, know about it)
Kimi hit its token limit inside "Assumptions I made" (§12 ends after the USD/rounding bullet). Everything through §12's four open questions is complete and authoritative. Treat missing assumptions as "builder uses the blueprint's own precedents"; if an ambiguity has no precedent, stop and ask Sean.

## G2 — MISSING SLICE: trainer-owned package creation (real gap — insert as S2.5)
The trainer pricing UI (§8.3/8.5) and the whole independent-pricing model assume trainers HAVE packages to price — but no slice creates trainer-owned `StorefrontItem`s, and Kimi's ERD dropped `StorefrontItem.createdByTrainerId` (it was in the prior design's data model). Insert:

**S2.5 — Trainer package CRUD (independent trainers only)**
- Migration: `StorefrontItem` + `createdByTrainerId` (nullable FK → "Users"), `visibilityScope` ('platform' | 'trainer_clients') — additive.
- `backend/routes/economics/trainerPackageRoutes.mjs` — CRUD, owner-checked (`createdByTrainerId === req.user.id`), independent-type-only guard, floor validation at write (reuses S2 governance), pricePerSession required.
- Purchase scoping: a trainer-owned package is purchasable ONLY by clients with an active `ClientTrainerAssignment` to that trainer (enforce in cartRoutes add-to-cart, same place the price resolver plugs in).
- Trainer UI: "My Packages" section on the S3 TrainerPricingPage (create/edit; delete = soft-deactivate only).
- Brain: `econ.create_trainer_package` (signed), `econ.list_my_packages` (read).
- Do NOT: let admin packages gain createdByTrainerId retroactively; let affiliated trainers create packages (SS sets their pricing); allow price below floor.
- ⚑ HIGH-STAKES (new money surface) — security review. Ships after S2 (needs floor), before S3 (requests reference trainer packages).

## G3 — Usage-cap seed values swapped in S10 (fix at build time)
Sean's locked decision #5: **1GB STORAGE / 5GB BANDWIDTH** per month. Blueprint S10 seeds "1GB bw/mo, 5GB storage" — reversed. Correct seed: user(100k tokens/mo, 5GB bandwidth/mo, 1GB storage, 2k req/day). Kimi's trainer 2× AI tier (200k) stands, pending Sean's confirmation (blueprint open question 4).

## G4 — Onboarding v1 must be committed BEFORE S5 builds on it
The v1 trainer-onboarding files exist only uncommitted in the working tree (`TrainerOnboardingPage.tsx`, `TrainerOnboardingForm.tsx`, `TrainerOnboardingStyles.tsx`, `trainerOnboardingService.ts`, `TrainerApplication.mjs`, migration, `trainerContract.mjs`, controller, routes + `main-routes.tsx`/`core/routes.mjs`/`associations.mjs`/`index.mjs` edits). The handoff agent commits these FIRST (explicit paths — the shared tree has other agents' work; NEVER `git add -A`), then S5 branches from them.

## Also carried forward (not gaps, reminders)
- Full vitest suite (incl. `commissionCalculator.matrix.test.mjs`) must run green in CI before S0's commission changes affect production payouts — local env had empty node_modules.
- Kimi blueprint open questions 1–4 (§12) go to Sean before S3/S9/S6/S10 respectively.
- Affiliated onboarding stays feature-flagged OFF until `docs/legal/affiliated-signoff.md` exists ([LAWYER REVIEW]).
