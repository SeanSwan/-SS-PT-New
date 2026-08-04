# NUTRITION ENTERPRISE BLUEPRINT — 2026-08-04

**Status:** ratified build plan (Fable Final Decider) · **Branch:** `claude/nutrition-overhaul-20260804` off origin/main
**Inputs:** 3-agent repo audit of origin/main @ b17e13d90 (re-validated vs 45726f8ca — zero nutrition-file drift), Fable hostile pass, Kimi K3 system hostile review (`KIMI-K3-NUTRITION-REVIEW-2026-08-04.md`), HY3 UX/UI hostile review (`HY3-NUTRITION-UXUI-REVIEW-2026-08-04.md`). Full current-state evidence: `NUTRITION-HOSTILE-AUDIT-PACKET-2026-08-04.md`.
**Panel spend:** $0.1252 actual (Kimi $0.1193 + HY3 $0.0059), Sean-approved.

## 0. Panel verdict integration (what changed vs the draft plan)

Accepted from Kimi (all repo-verified where checkable):
1. **Timezone model is a load-bearing prerequisite** — `users.timezone` does not exist [VERIFIED]. All adherence/streak/quiet-hour date math must be user-local. Added as Slice 1.0, blocks Phases 1 & 3.
2. **Encryption fix is three deploys, not one** — dual-read shim → background backfill → shim removal. Phase 0 ships only the shim + config truth.
3. **LLM-generated plans need a bounds validator + human activation gate** — the model proposes (`draft`), only a human activates. Validator ships BEFORE persistence (Phase 2 ordering inverted).
4. **ENUM expansion = separate no-transaction migration deployed before any writer** — house pattern already exists (`20260804040000-...-enum-add-missing-labels.cjs`) [VERIFIED]; copy it.
5. **Nudge cooldown = atomic dispatch ledger** (`INSERT ... ON CONFLICT DO NOTHING` on `(userId, nudgeType, localDate)`), not lookback queries. Socket.IO has no Redis adapter [VERIFIED] → nudges are DB-row/bell-first; live toast is best-effort only.
6. **Mass-assignment IDOR on `POST /api/nutrition/:userId` promoted to P0** — body allowlist + strip `id/userId/clientId/createdBy/source/status`, set `createdBy` server-side.
7. **Evaluator idempotency granularity** — per `(userId, achievementId, localDate)` claim + nightly idempotent sweep as correctness backstop; inline fire is optimization only.
8. **ED-safe gamification is a Phase 3 launch blocker** — streak-freeze (no penalty), zero streak-loss push copy, "hide streaks" setting, ED-safe mode disabling quantified-food gamification.
9. **Prompt-injection hardening on third-party food strings** (OFF/USDA/FatSecret names are hostile input) — sanitize before prompt inclusion AND before confirmation-UI render.
10. **Coach-inferred entries** must carry `source='coach_inferred'`, low confidence cap, `reviewStatus='needs_review'`; adherence output must expose inferred-entry counts.
11. **Forward-only corrective migrations** — never edit applied migrations. (users→"Users" FK repair already shipped on main in `20260730120000`; remaining `food_scan_history` baseline lie is a DR-only P1 → backlog with explicit note.)
12. **NutritionTarget = NEW entity** (ClientNutritionPlan is a contaminated substrate). Requires: single-writer service, PG `EXCLUDE` overlap constraint on effective ranges, ClientNutritionPlan demoted to document container; Plan Builder + debate lane both route through the service.

Rejected/adjusted:
- Kimi's "migration lies = P0" downgrade to P1 accepted (DR-only blast radius).
- PG-version caveat on ENUM transactions: repo pattern already handles all versions; no extra work.

Adopted from HY3 (design contract): segmented IA (Capture/Insights/Fuel/Explore) + SubPillRow + mobile BottomNav replacing the `<select>`; coach-tab 30-second hierarchy (Header → AdherenceHero → ActualVsTargetGrid → DateStepper → TrendPanel → verifiable Diary); QuickAddFab/RepeatYesterday/StreakRing/CelebrationToast; 4-pool rotating nudge copy with quiet hours, 1-per-24h cap, 3-ignore backoff; gated tabs rendered as locked pills (never hidden); scanner tokenization + `FoodQualityTab` resurrection of the 727-line dormant safety UI; roster "Show all N" fix; empty/loading/error specs (no raw err.message; Swan-branded states). All within Crystalline Swan tokens, 44px targets, reduced-motion guards, Victory-only charts, dual-button glow.

## 1. Build order (slices; commit per slice; batch push at end — Rule 70)

### PHASE 0 — Security & truth (this branch, first)
- **S0.1 scanner lockdown**: rate-limit public scanner reads (scan/search/product/ingredient); auth `/stats`; auth + rate-limit the explain router; validate `limit/offset`. Keep barcode/product reads public (marketing utility) but throttled.
- **S0.2 nutrition-plan write hardening**: strict body allowlist + type validation on `POST /api/nutrition/:userId`; server-set `createdBy`; strip attribute collisions. Regression test: body `userId/clientId` cannot override param.
- **S0.3 encryption truth (deploy 1 of 3)**: fix `healthDataEncryption.mjs` field map to real columns (`allergies`, `dietaryRestrictions`, `notes`); dual-read shim (try-decrypt → plaintext fallback); new writes encrypt. Backfill + shim-removal are ops-gated follow-ups (documented, not this branch).
- **S0.4 macro write idempotency**: optional `clientRequestId` on `POST /api/macros` + partial unique index `(userId, clientRequestId)`; replay returns the original row.
- **S0.5 macro audit trail**: append-only `nutrition_log_revisions` (before-state + actor + action on PATCH/DELETE/verify).
- **S0.6 LLM egress hygiene**: consent gate + no-retention note on `/analyze-photo`; health conditions → coded tags (de-identifier mapping) on `/generate`; sanitize third-party food strings entering prompts/confirmation UI (S0.6b).
- **S0.7 single write path**: raw-SQL `insertMacroLog` in `aiDataWriteService` routed through `macroLogService.createMacroEntries` (provenance restored on AI writes).

### PHASE 1 — Targets & adherence spine
- **S1.0 timezone prerequisite**: `users.timezone` (IANA string, default UTC, settable from frontend at login) + `userLocalDate()` helper; all new date math user-local.
- **S1.1 `nutrition_targets` table**: per-client kcal/P/C/F/fiber/sodium-cap, `effectiveFrom/effectiveTo`, `createdBy`, `status(draft|active|superseded)`, PG `EXCLUDE` overlap constraint (btree_gist) on active rows; single-writer `nutritionTargetService`.
- **S1.2 summary/weekly upgrade**: `/summary` + `/weekly` return active target + % of goal + streak; adherence service (loggedDays, currentLogStreak, proteinTargetHitRate, consistencyScore, inferredEntryCount) — one service consumed by dashboards, triage, coach context.
- **S1.3 client-timeline date range**: `?date/?start/?end` (≤90d cap) on client-timeline + reviewer surfaces — kills the today-only lock server-side.
- **S1.4 Plan Builder re-point**: writes targets via `nutritionTargetService`; ClientNutritionPlan demoted to document container.

### PHASE 2 — Coach mind deepening
- **S2.1 bounds validator FIRST**: server-side plan/target sanity (kcal floor/ceiling, macro-sum, sodium-vs-conditions) → any LLM output lands as `draft` requiring human activation.
- **S2.2 wire `create_nutrition_plan`** through the debate lane → persist as draft target+plan document → trainer approval activates.
- **S2.3 wire `nutrition_advice`** conversational route; add validated `date` param (≤14d lookback) to `view_nutrition_log`; widen chat nutrition window 2→14 days.
- **S2.4 context enrichment**: extend `summarizeNutritionLogs` with adherence-derived fields (flows to every coach surface, zero new queries).
- **S2.5 smart intake**: coach-inferred entries carry `coach_inferred` source + `needs_review`; progressive data asks (fiber/sodium/hydration/meal timing); meal templates + repeat-yesterday + favorites (recipe entity deferred to Phase 5 backlog with Kimi's serving-math note).

### PHASE 3 — Reward & reminder loop (ED-safe by design)
- **S3.0 ENUM migrations** (house pattern, no transaction, deployed before writers): `PointTransaction.source + 'nutrition_log'`, `Streak.streakType + 'nutrition'`, `Notification.type + 'nutrition'`. ⚠ Check badge-forge lane before touching model files (Rule 67).
- **S3.1 `nutritionLogAchievementEvaluator`**: clone workoutAchievementEvaluator shape; claim per `(userId, achievementId, localDate)`; nightly idempotent sweep = correctness; inline fire = latency.
- **S3.2 `challengeNutritionLoggingBridge`**: dedupe `(challengeId, userId, localDate)`; makes the shipping Nutrition Check-In challenge completable.
- **S3.3 `nutritionLogNudgeCron`**: clone staleClientNudgeCron; kill switch default-OFF; `nutritionReminders` consent key; **atomic `nudge_dispatches` ledger** as the gate; quiet hours 21:00–08:00 user-local; 1/24h cap; 3-ignore → 2-day backoff; in-app only (bell/DB row first, socket toast best-effort).
- **S3.4 ED-safe guardrails (launch blocker)**: streak-freeze, no streak-loss copy anywhere, hide-streaks setting, ED-safe mode killing quantified-food gamification; cleared against ethicalGamification modules.
- **S3.5 copy variety engine**: 4 pools (celebration/gentle-restart/curiosity/recipe-tease), per-user server-side rotation state.

### PHASE 4 — UX rebuild (HY3 slices, swan-design-router gated)
- **4A** coach tab rebuild (Header/AdherenceHero/ActualVsTargetGrid/DateStepper/TrendPanel/verifiable diary; triage card moves here) + trainer roster triage enablement + roster "Show all N".
- **4B** workspace IA: SegmentedTabBar + SubPillRow + mobile BottomNav; `<select>` deleted; gated tabs = locked pills.
- **4C** logging delight: QuickAddFab, RepeatYesterday, StreakRing, CelebrationToast, EmptyState/Skeleton/SwanErrorCard.
- **4D** NutritionNudgeCard (home) + bell items + copy pools (wires to S3.3); Home mission no longer vanishes silently.
- **4E** scanner tokenization (51 literals → tokens), FoodQualityTab (resurrect 727-line safety UI), Plan Builder gets ClientSelectorDropdown + sidebar entry + house styling; mobile media-query pass (TodayPanel/Diary/Supplements).

### PHASE 5 — Enterprise depth (backlog, explicitly deferred)
Recipes with serving math; offline logging outbox; food-data governance (dedupe/versioning/quality flags); swap engine + grocery lists; roster-level analytics + SOAP-style documentation; micronutrients; supplement intake logging; CSV/subject-access export + MFP/Cronometer import; retention/erasure with crypto-shredding; `food_scan_history` fresh-migrate reconciliation; hydration coach visibility; supplement affiliate links (Sean-owned).

## 2. Standing constraints
Zero PII to LLMs (IDs/aliases only) · no MUI · styled-components tokens with fallbacks · Victory charts only · 44px targets · reduced-motion guards · dark-first Crystalline Swan · all schedulers DB-level idempotent (multi-instance) · migrations forward-only · never edit applied migrations · batch push, one deploy, §4.9 verification · Rule 67: gamification model files require badge-forge lane check first.
