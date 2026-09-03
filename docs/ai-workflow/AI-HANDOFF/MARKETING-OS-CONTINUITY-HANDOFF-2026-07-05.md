# Marketing OS — Continuity Handoff (2026-07-05)

> **For the next AI (Claude/Codex/Fable) picking this up.** Read this top-to-bottom, then `ACTIVE-INDEX.md` + `.ai-workflow/continuity/rolling-last-done.md`. This file exists because a **hardware failure** (failing `D:` drive) forced a hard stop mid-batch. A copy also lives in `docs/ai-workflow/AI-HANDOFF/` if the push succeeded.

## 0. STOP-THE-PRESSES: environment is broken (hardware)
The repo was on drive `D:\@Projects\SS-PT-New` — a `"New Volume"` external/newly-connected disk that is **failing or badly connected**. Symptoms: `vite`/`vitest`/`esbuild` throw intermittent `EISDIR`; `mkdir` returned `Invalid request code` (hardware error); a bulk file copy **hung for 2 min**. This is NOT a code problem. Fix hardware FIRST:
- Reseat the drive cable / use a **powered** USB port or hub (matches Sean's known SSD power issue). Try a different port/cable.
- **Best:** move the whole repo to a healthy internal drive (`C:`), work from there.
- `chkdsk D: /f` (admin) if it stays connected. If it keeps dropping, treat as dying — get data off it.
- After healthy: `npm ci` in `backend/` and `frontend/`, then verify.
- **Backup:** an incomplete copy of uncommitted files (163 files, but NOT all critical ones) is at `<HOME>\AppData\Local\Temp\claude\d---Projects-SS-PT-New\022c3b0f-9307-4db8-a9ac-06a93fdd3687\scratchpad\uncommitted-backup-2026-07-05\`.

## 1. THE FULL GOAL (the vision we're executing)
Turn the **admin Marketing tab** into a real **marketing operating system** (per the GPT Pro deep-research plan + `docs/ai-workflow/references/BEST-IN-CLASS-TRAINING-APP-STRATEGY.md`). Not more widgets — a spine:
**Campaigns → Assets → Approval Queue → Calendar → Publish/Send → Leads → Follow-up → Bookings → Revenue Attribution.**

Verified reality (recon workflow, evidence-backed) before we started: the tab was a real 5-tab shell over genuinely-wired leads/newsletter/calendar/native-Bluesky subsystems with strong default-OFF safety gates, BUT had **no central `MarketingCampaign` spine**, no email/SMS broadcast path, an "Approval Queue" that is really a direct-publish composer, and 5 demo-only content panels (SEO/keyword/blog/competitor/email-digest). GPT Pro's audit was essentially accurate (its one miss: it claimed a lead-route RBAC supertest was missing — `leadRoutes.rbac.test.mjs` exists).

The slice roadmap (GPT Pro Phases 0–9, re-sequenced safety-first):
1. **Slice 1 — Readiness Cockpit** (read-only truth surface) ✅ SHIPPED
2. **Slice 2 — Campaign spine** (MarketingCampaign model + CRUD) ✅ built
3. **Slice 3a — Campaign Management UI** ✅ built
4. **Slice 3b — Campaign↔Calendar link** (FK + associations + cockpit card) ✅ built
5. **LCC-1 — Lead Command Center step 1** (server-side hot/follow-up filters) ✅ built
6. Slice 4 — Real persisted Approval Queue (replace the composer-as-queue)
7. Slice 5 — Lead Command Center full (drawer/timeline/notes/log-call/send)
8. Slice 6 — Newsletter campaign send (gated, deliverability-isolated)
9. Slice 7 — Automation arming cockpit (preview/suppression/arm checklist)
10. Slice 8 — Social realism (Meta OAuth first; others readiness-gated)
11. Slice 9 — SEO/local real persistence; then Revenue Attribution; then AI-drafts (approval-gated)

## 2. WHAT SHIPPED / WHAT'S PENDING
- ✅ **Slice 1 LIVE on Render:** commit `cec1d21d6` (`feat(marketing): read-only Marketing Readiness Cockpit …`). Readiness endpoint `/api/admin/marketing-readiness` + cockpit embedded in Overview.
- ⏳ **Slices 2 + 3a + 3b + LCC-1: BUILT, uncommitted** (at hard-stop). 23 files. Unit-verified GREEN in a prior session; `node --check` clean on all backend files THIS session. Local full-suite re-run blocked ONLY by the drive failure (not code).

## 3. THE 23 FILES (batch)
**Slice 2 (spine):** `backend/models/MarketingCampaign.mjs`(new), `backend/migrations/20260704120000-create-marketing-campaigns.cjs`(new), `backend/routes/adminMarketingCampaignRoutes.mjs`(new), `backend/__tests__/marketingCampaign.model.test.mjs`(new), `backend/__tests__/adminMarketingCampaignRoutes.rbac.test.mjs`(new), `backend/core/routes.mjs`(+2 mount)
**Slice 3a (UI):** `frontend/src/components/DashBoard/workspaces/marketing/{CampaignManager.tsx, CampaignManager.styles.ts, CampaignForm.tsx, CampaignForm.styles.ts, CampaignManager.contract.test.ts}`(new), `marketing.types.ts`(+campaign types), `MarketingCommandOverview.tsx`(+embed)
**Slice 3b (link):** `backend/migrations/20260705000000-add-campaign-id-to-marketing-calendar-items.cjs`(new), `backend/models/MarketingCalendarItem.mjs`(+`campaignId`), `backend/models/associations.mjs`(5 edits — P0), `backend/services/marketingReadinessService.mjs`(+campaigns subsystem), `backend/__tests__/marketingReadinessService.test.mjs`(+test), `frontend/.../MarketingReadinessCockpit.tsx`(+card), `frontend/.../MarketingReadinessCockpit.contract.test.ts`(6→7 subsystems)
**LCC-1:** `backend/routes/leadRoutes.mjs`(GET filters), `backend/__tests__/leadRoutes.filters.test.mjs`(new), `frontend/.../marketing/LeadPipelinePanel.tsx`(server-side refetch)

## 4. VERIFICATION + REVIEW STATUS
- Backend unit tests (prior session): campaign model 6 + campaign routes RBAC 8 + readiness service 12 + readiness route RBAC 3 + lead filters 5 + lead RBAC 3. Frontend: cockpit contract 5 (7 subsystems) + campaign contract 5 + command-center 13 + auth-pipeline 2. **tsc `--noEmit` EXIT 0, 0 errors.**
- THIS session: `node --check` clean on all 13 backend batch files. My source hostile-review of the P0 `associations.mjs` change = CORRECT (MarketingCampaign present on BOTH return paths 532 + 1516; no third list; no alias collision — `as:creator` is per-source-model; no circular import/DB-at-load). Both migrations additive/idempotent/transaction-wrapped/correctly-ordered (create-campaigns 20260704120000 before add-campaignId 20260705000000); FK casing correct (`Users` PascalCase for user FKs, `marketing_campaigns` lowercase for the campaign FK); schema cross-check zero drift.
- **Review GATE (Rule 46):** `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-MARKETING-OS-BATCH-2026-07-05.md` is written and **AWAITING CODEX ROUND 1**. Migrations auto-run on Render deploy (`render-start.mjs`→`safe-migrate.mjs`, non-fatal on failure).

## 5. CODEX'S PARALLEL WIP (do NOT deploy blindly)
Codex has separate **uncommitted** special-pricing/bonus-session work on the MONEY PATH: `backend/services/specialOfferService.mjs`, `backend/migrations/20260704000000-add-special-offer-fields.cjs`, changes to `CustomPackage.mjs`/`StorefrontItem.mjs`/`cartRoutes.mjs`/`customPackageRoutes.mjs`/`storeFrontRoutes.mjs`/`v2PaymentRoutes.mjs`/`SessionGrantService.mjs`, + docs (`SPECIAL-PRICING-*`, brainstorm). This is Codex's lane (Rule 67). **It must NOT be swept into the marketing deploy** — it touches checkout/pricing and is Codex's to finish + review + push. Its migration (`20260704000000`) will only run if committed to main.

## 6. HOW TO CONTINUE (exact next steps)
1. **Fix the drive / move repo to `C:`** (see §0). Nothing else works until storage is healthy.
2. `npm ci` in `backend/` + `frontend/`; re-run the full suite → confirm the §4 green.
3. Run the hostile review: free triangle fusion `node scripts/fusion-triangle.mjs --task "<§4a/§4b/§5 focus>" --context "<debate file>"`, OR paste the Codex prompt from the debate file. Apply any REVISE findings.
4. **Push the batch** (explicit paths, noreply author `25750267+SeanSwan@users.noreply.github.com`). Suggested 4 commits: Slice 2, Slice 3a, Slice 3b, LCC-1. Migrations auto-run on deploy.
5. Post-deploy: hit `/dashboard/admin/marketing`, create a campaign, verify the cockpit's Campaigns card + lead hot/follow-up filters.
6. Then Slice 4 (real Approval Queue). Continue the §1 roadmap.

## 7. GUARDRAILS THAT APPLY
Gated pushes (Sean's choice), Rule 42 pre-push backend audit, Rule 67 (don't sweep Codex's WIP), Rule 46 (money-path + substantial = review gate), Rule 8/59 (IDs/roles, presence-only secrets — the readiness service already honors this). Author commits as the GitHub noreply (Sean's email-privacy is on — GH007 blocks the real email).
