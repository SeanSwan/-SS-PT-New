# 🦢 START HERE — Trainer Economics Build Handoff (2026-07-23)

**You are the builder agent.** This folder is your complete work order. Sean's directive: build the trainer-economics system **exactly as Kimi K3 (the lead architect) designed it** — Kimi's vision, Kimi's decisions, not yours. Where Kimi's blueprint decides something, you follow it. Where it's silent, use its precedents. Where it's genuinely ambiguous on behavior/money/security, STOP and ask Sean.

- **Tracking:** Linear **SWA-62** (update it as you ship slices — unprompted, per house rules).
- **Branch state:** work landed so far is on `wip/comms-notifications-2026-07-05` (NOT main — no prod deploy until merge).
- **decision:** build Kimi blueprint | **status:** open | **supersedes:** scratchpad-only design docs

---

## 1. READ ORDER (this folder)
1. **`01-KIMI-BLUEPRINT.md`** — THE build plan. Exec vision, hostile-review rationale, 5 mermaid diagrams (architecture, conversational flow, fraud pipeline, comp+throttle, ERD), wireframes (desktop+375px), 12 brain commands + 3 proposal types with exact JSON contracts, slices S1→S12 with files/acceptance/do-NOTs.
2. **`05-CLAUDE-ADDENDUM-GAPS.md`** — 4 gaps you MUST apply on top (G2 = insert slice S2.5 trainer package CRUD; G3 = fix swapped usage-cap seeds; G4 = commit onboarding v1 first; G1 = blueprint §12 truncation note).
3. **`02-ABUSE-ANALYSIS-A1-A13.md`** — the threat model the design defends against (A10 under-report/over-deliver = priority; A13 dark-sessions = why the two-sided sensor exists).
4. `03-PRIOR-KIMI-DESIGN-superseded.md` — the earlier 6-part design (context only; blueprint supersedes it).
5. `04-ONBOARDING-V1-RECEIPT.md` — canonical-surface receipt for the already-built onboarding page.

## 2. WHERE WE WERE (history you inherit)
- **S0 SHIPPED** (commit `0b60de7db` on the wip branch): the trainerType commission drift fix. `utils/commissionRates.mjs` is now the SINGLE SOURCE OF TRUTH (independent 15/85, affiliated 35/65, DEFAULT_TRAINER_TYPE='affiliated', throwing `baseRatesForType`). `CommissionService` loud-alerts on NULL type. Regression-wall test + read-only reconciliation script exist. Kimi hostile-reviewed it (REVISE → 7 findings fixed). ⚠ Full vitest must run green in CI before this affects prod payouts.
- **Trainer onboarding v1 BUILT, UNCOMMITTED** (G4 — commit it first, explicit paths only): `/become-a-trainer` page → e-sign draft contract (watermarked pending-legal) → COI/cert upload → fail-closed `pending_review`. Files: `frontend/src/pages/TrainerOnboarding/*` (3 files), `frontend/src/services/trainerOnboardingService.ts`, `backend/models/TrainerApplication.mjs`, `backend/migrations/20260723090000-create-trainer-applications.cjs`, `backend/config/trainerContract.mjs`, `backend/controllers/trainerOnboardingController.mjs`, `backend/routes/trainerOnboardingRoutes.mjs`, + edits in `frontend/src/routes/main-routes.tsx`, `backend/core/routes.mjs`, `backend/models/associations.mjs`, `backend/models/index.mjs`. Already hostile-hardened (IDOR-safe file keys, XSS-escaped contract render, race-proof partial-unique index, consent-key allowlist, proxy-aware IP only).
- **Reconciliation launcher** for Sean: `c:/tmp/reconcile-commissions.ps1` (read-only historical commission check; may not have run yet — ask Sean if the result matters to your slice).
- **Home-page redesign track is PAUSED, separate:** Row-1 hero has a final Kimi plan (keep the SWANS VIDEO, upgrade treatment around it); Rows 2+ pending. Do not mix into this build.

## 3. SEAN'S 7 LOCKED DECISIONS (build to these exactly)
1. Price floor **$40/session** (post-discount).
2. Affiliated/staff pay **35/65**; independent **15/85** (S0 constants).
3. Base-price cooldown **30 days OR admin-approval request flow** (trainer sends request → admin dashboard approves; full feature = blueprint S3).
4. Free access = **ONE unified admin comp switch across trainers + clients + users**: membership-waiver OR **100% FULL-COMP** (full-comp auto-adds a FraudExclusion so it never trips the detector) OR custom. All grants audited, reversible at will. (= blueprint `CompGrant`, S6.)
5. Usage caps: balanced defaults — 100k AI tokens/mo, **5GB bandwidth/mo, 1GB storage** (⚠ addendum G3 — blueprint has these two swapped), 2k req/day; admin-tunable via `UsageCapPolicy`.
6. **Auto-throttle AI + bandwidth** at 100% cap (alert Sean); **storage manual-only**.
7. Historical reconciliation = read-only script (exists; stays read-only forever).

## 4. THE JARVIS PRINCIPLE (non-negotiable architecture)
The unified Swan brain is **talk → propose → tap-approve → deterministic-execute**. Autonomy for money/comp actions is withheld BY DESIGN — that's the feature, not a gap. Every economics feature ships WITH its brain commands (blueprint §9): reads execute instantly; standard writes = HMAC-signed confirmation; high-stakes (comp grants, payout holds) = encrypted proposal + review-token approval. Doctrine verbatim: *"The model prepares drafts; deterministic services own final writes."* Zero PII to LLMs — aliases (Trainer-12/Client-61) only, names re-hydrate client-side.

## 5. BUILD ORDER (blueprint + addendum merged)
Commit onboarding v1 (G4) → **S1** auditWriter + shadow price instrumentation → **S2** floor+cooldown enforcement ⚑ → **S2.5** trainer package CRUD (addendum G2) ⚑ → **S3** price-change request flow ⚑ → **S4** TrainerSpecial + AdminSpecial lift ⚑ → **S5** onboarding v2 type-branch (affiliated FLAGGED OFF, ⚖ lawyer-gated) → **S6** unified CompGrant + exclusions + fee waiver ⚑ → **S7** two-sided session attestation (A13 sensor) → **S8** fraud detector SHADOW mode → **S9** response ladder ⚖ → **S10** usage metering (G3 seed fix) → **S11** auto-throttle + hardening pass ⚑ → **S12** payout report PDF ⚑.
⚑ = high-stakes, security-review before merge. ⚖ = [LAWYER REVIEW] gate.

## 6. HOUSE RULES THAT BITE (do not skip)
- **Shared tree (Rule 67):** Codex works this same machine. Read `.ai-workflow/coordination/*.lane.md` before editing; stage EXPLICIT PATHS ONLY — never `git add -A` (the tree carries others' uncommitted work). A stale 0-byte `.git/index.lock` was safely removed once already — verify age+size before ever touching a lock.
- **Batch-push cadence (Rule 70):** commit per slice locally, push once per batch. Branch = `wip/comms-notifications-2026-07-05` (or a new branch off it — ask Sean).
- Per slice: hostile-review until dry (DRY-LOOP CLEAN×2), `PROOF:` line with real executed evidence, no "done" without proof (Rule 73/74). Sean also wants **Kimi hostile reviews on substantial slices before push** (`node scripts/consult-kimi.mjs --document <packet> --effort high`, ~$0.15/run — batch-authorized pattern; ask Sean if unsure it still stands).
- Stack: styled-components only, Crystalline Swan palette + Dual-Button Glow, 44px targets, Victory charts, 300-line cap, FKs → `"Users"`, migrations reversible, zero PII to LLMs.
- Closeout: update SWA-62 + drop a Hermes inbox memo (`.ai-workflow/hermes-inbox/pending/`) at substantial closes; secret-scan everything you write.

## 7. OPEN ITEMS SEAN OWES (surface these, don't guess)
- Kimi blueprint §12 open questions: (1) cooldown per-package vs global — assumed per-package; (2) client-denial visibility — assumed aggregate-only; (3) comped-client package consumption — assumed fee-0 rows against package if one exists; (4) trainer AI cap 200k — confirm. Ask before S3/S9/S6/S10 respectively.
- Lawyer: affiliated classification (W-2 risk) + final trainer contract text (v1 is a watermarked draft) + client waiver/ToS gap.
- CI: get the backend vitest suite running green (S0's matrix test) before any payout-affecting merge to main.
- Stripe Connect payout wiring: **explicitly deferred** — payouts stay manual/read-only in v1 (blueprint S12 "Do NOT execute payouts").

## 8. FIRST ACTIONS (your literal checklist)
1. Read `01` + `05` fully. 2. Read the coordination lane files. 3. Commit onboarding v1 (G4, explicit paths). 4. Build S1 exactly per blueprint. 5. Hostile-review → Kimi review → fix → PROOF → commit. 6. Update SWA-62. 7. Continue the slice order; stop at ⚖ gates and §7 unanswered questions.

*Handoff authored by VS-Claude (Opus 4.8) 2026-07-23 after: 3 grounded-reality audits (money, onboarding, brain), S0 ship, 4 Kimi consults (~$0.70 total), and Sean's 7 locked decisions. The blueprint is Kimi's vision — build it faithfully.*
