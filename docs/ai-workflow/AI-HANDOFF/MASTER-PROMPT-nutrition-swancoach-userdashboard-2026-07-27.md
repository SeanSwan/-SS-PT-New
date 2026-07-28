# MASTER PROMPT — Swan Nutrition Intelligence + User Dashboard Gap Audit + Swan Coach PhD Upgrade

**Created:** 2026-07-27 · **Author:** Claude (Opus 5) at Sean's direction
**Recipients:** Fable 5 (Final Decider) · Kimi (design/world authority + hostile) · Claude (repo-truth + receipts)
**Status:** READY TO DISPATCH — paste §0–§13 to each brain, with the per-brain remit in §9.
**§12 external-reference receipt (Mobbin, 30 refs) is already complete — design from it, do not re-research.**

---

## §0 — MISSION (read this first)

SwanStudios is a production trainer-led B2B2C personal-training SaaS at sswanstudios.com. It already has a large, partially-built nutrition system and a Swan Coach AI. **This is not a greenfield build.** Your job is:

1. **Audit** the User Dashboard against the product vision and name the **missing features** — absence-first: what SHOULD exist and does not, ranked by value/money left on the table.
2. **Audit Swan Coach** — what it can and cannot do today, where it is shallow, where it is wrong, where it is unsafe.
3. **Design the vicious, comprehensive upgrade of the Nutrition component** — which is the SAME app rendered in the client, trainer, and admin dashboards. Both the **intelligence** (Swan Coach must reason about nutrition at genuine expert level) and the **UX/UI** (currently rated by the owner as ugly; must become enterprise-grade / "$100k site").
4. **Design the legal/safety rails** so that Swan Coach's nutrition guidance is defensible: it is general wellness/health information, **not** medical nutrition therapy, **not** a substitute for a physician or a licensed dietitian.
5. **Hunt bugs and errors** in every surface you touch. The bar is a site that runs with zero errors.

Deliver a plan so complete that a **cheaper worker-bot builds it verbatim with zero further questions.**

---

## §1 — NON-NEGOTIABLE CONSTRAINTS (violating any of these invalidates your output)

**Stack & style**
- React 18 + TypeScript + **styled-components ONLY**. **NO Material-UI.** Ever.
- Node.js + Express + Sequelize + PostgreSQL backend. ESM (`.mjs`).
- Charts: **Victory only.** No Recharts for new work.
- No hardcoded colors — `var(--token, #fallback)` pattern, always with a fallback.
- **Max 300 lines per file.** Extract hooks/utils/styles/types when approaching the cap.
- 44px minimum touch targets. WCAG 4.5:1 contrast minimum.
- Dark-first. Default theme `crystalline-dark`.

**Active palette — Enchanted Apex: Crystalline Swan**
Midnight Sapphire `#002060` · Royal Depth `#003080` · Ice Wing `#60C0F0` (glow/accent) · Arctic Cyan `#50A0F0` (**data/charts only, never buttons**) · Gilded Fern `#C6A84B` (luxury gold) · Frost White `#E0ECF4` · Swan Lavender `#4070C0` · Wing Purple `#8B5CF6` (glow accent) · Obsidian Black `#0A0A0F` · Carbon `#141419` · Graphite `#1A1A24`.
**Dual-Button Glow rule:** blue background → purple glow; purple background → cyan glow.
Type: Plus Jakarta Sans (headings) · Cormorant Garamond Italic (drama) · Fira Code (data) · Sora (UI/gaming).
**RETIRED — never use:** Galaxy-Swan (`#0a0a1a`, `#00FFFF`, `#7851A9`).

**Language bans**
- Never "yoga" or "meditation" → say "stretching" / "flexibility".
- Sean's credentials are **"26+ years experience, NASM-protocol"** — **NEVER** "NASM-certified".
- Swan Coach is never called "AI" in user-facing copy.
- No Grok / X-AI models anywhere, permanently.

**Privacy**
- **Zero PII to LLMs.** Client IDs and roles only; names mapped client-side. Nutrition + biometric + pain data is the highest-sensitivity path in the product — treat every LLM call on this path as a privacy review surface.

**Card standard**
Store/showcase cards may use full animated SheenCard/GlowButton treatment. **Client/trainer/admin data cards must be low-motion:** same geometry, sapphire gradient surface, chrome edge, pill/metric/button language — but no pointer tracking, no heavy animation loops, no hover-only actions, no hidden controls.

**Responsive matrix — every layout must be verified at:**
`320` · `375` · `414` · `768` · `1024` · `1280` · `1440` · `1920` · `2560×1440` · `3840×2160` · `3440` ultrawide.

**Anti-goals (do NOT propose these)**
- No vector DB / embeddings / RAG infrastructure. The recall layer is a generated markdown catalog. This is a standing decision.
- No rebuild of things that already work. Extend, don't restart.
- No new npm dependencies without a written justification + bundle-size cost + a named alternative you rejected.
- No scope drift into the RPG/Swanverse game, the marketing command center, or Hermes.
- No "phase 2 will handle it" hand-waving on safety items.

---

## §2 — GROUNDING: WHAT ALREADY EXISTS (verified in-repo 2026-07-27)

Do not hallucinate a greenfield. These are real files. Read them before proposing anything.

### 2.1 Nutrition — frontend
The nutrition app is one workspace rendered across all three dashboards.

| Path | Note |
|---|---|
| `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx` | 286 lines — the shell |
| `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tabs.tsx` | **13 tabs** (see below) |
| `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.capture.tsx` | capture flow |
| `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.styles.ts` | extracted styles |
| `frontend/src/components/DashBoard/workspaces/NutritionTodayPanel.tsx` | 298 lines — **at the 300-line cap** |
| `NutritionTodayPanel.{logic,viewModel,styles,trainingDay,repeatMeal,latestMeal}.ts` | already decomposed |
| `frontend/src/components/DashBoard/workspaces/NutritionHydrationTab.tsx` | hydration |
| `frontend/src/components/DashBoard/workspaces/NutritionLearnTab.tsx` | education |
| `frontend/src/components/DashBoard/workspaces/nutritionGentleModePreference.ts` | **"gentle mode"** — existing ED-sensitivity affordance. Study it; it is the seed of the safety layer. |
| `frontend/src/components/FoodTracker/*` | 25 files — `FoodSearchPanel`, `BarcodeScanner`, `QuickAddFood`, `FoodIntakeForm`, `MealPhotoReview`, `VoiceNutritionPanel`, `useNutritionDictation`, `IngredientSafetyPanel`, `IngredientDetailModal`, `MealPlanTab` (+`.sections`/`.types`/`.styles`), `MealPlanApproveSavePanel`, `RestaurantTab`, `GardeningTab`, `FarmFinderTab`, `SupplementsTab`, `FoodIntelligenceDashboard` (285 lines) |
| `frontend/src/components/Admin/NutritionPlanBuilder.*` | admin-side builder, already split into `.logic/.types/.styles/.sections` |
| `frontend/src/components/DashBoard/workspaces/clients-team/ClientNutritionEstimateReviewPanel.*` | trainer review of estimates |
| `frontend/src/components/DashBoard/workspaces/clients-team/ClientNutritionRosterTriagePanel.*` | trainer roster triage |
| `frontend/src/components/DashBoard/workspaces/clients-team/tabs/NutritionTabContent.*` / `NutritionTriageCard.*` | trainer client-tab nutrition |
| `frontend/src/components/DashBoard/Pages/admin-clients/components/NutritionSummaryWidget.tsx` | admin widget |
| `frontend/src/hooks/{useNutritionCoach,useNutritionPlan,useMacroSummary}.ts` | data hooks |
| `frontend/src/components/UserDashboard/components/useHomeNutritionAction.ts` | user-dashboard entry point |
| `frontend/src/components/Charts/charts/bullet/NutritionGoalBullet.tsx` · `radar/NutritionBalanceRadar.tsx` | existing Victory charts |
| `frontend/src/components/FoodScanner/ProductAnalysis.tsx` | product/label analysis |

**Current tab IA — this is the #1 UX problem to solve.**
Primary: `Today · Log Meal · Speak a Meal · Food Search · Hydration · My Macros · Swan Coach Meal Plan · Intelligence · Learn`
"More": `Restaurant · Garden · Farm Finder · Supplements`
→ **13 tabs is a filing cabinet, not a product.** Sean's standing mandate is fewest clicks, least time.

### 2.2 Nutrition — backend
| Path | Note |
|---|---|
| `backend/models/ClientNutritionPlan.mjs` | the plan model |
| `backend/migrations/20260112000002-create-client-nutrition-plans.cjs` · `20260310000001-add-fda-nutrition-fields.cjs` | schema history — **read both before touching fields (Rule 58 schema drift)** |
| `backend/routes/clientNutritionRoutes.mjs` · `mealPlanRoutes.mjs` · `foodScannerRoutes.mjs` · `supplementRoutes.mjs` | API surface |
| `backend/services/nutrition/nutritionCareCopy.mjs` (72 lines) | **existing care-copy layer — the seed of the disclaimer system** |
| `backend/services/nutrition/nutritionTranscriptParserService.mjs` | voice → structured meal |
| `backend/services/nutrition/productNutritionValidation.mjs` | validation |
| `backend/services/{mealPlanService,foodPhotoService}.mjs` | plan gen + photo |
| `backend/services/ai/commandRegistry/nutritionCommands.mjs` | Swan Coach nutrition command schemas |
| `backend/services/ai/dispatchers/nutritionDispatchers.mjs` · `clientSelfServiceNutritionDispatchers.mjs` | execution |
| `backend/services/ai/contextEngine/coachNutritionContext.mjs` (63 lines) | **the context Swan Coach gets — currently thin. This is the core upgrade target.** |
| `backend/services/ai/coachNutritionProposal{ApprovalService,CareCopy,Classifier}.mjs` | proposal → approval flow |
| `backend/services/ai/debate/nutritionDebatePrompts.mjs` | multi-model nutrition debate |

**Existing test coverage** (do not break these; extend them):
`clientNutritionRoutesSecurity.test.mjs` · `mealPlanRoutesSecurity.test.mjs` · `nutritionCommandSourceContract.test.mjs` · `nutritionCommandDispatcherContract.test.mjs` · `nutritionCommandMealTypeSchema.test.mjs` · `nutritionLogProposalType.test.mjs` · `coachNutritionContext.test.mjs` · `nutritionTranscriptParserService.test.mjs` · plus the frontend `*.test.tsx` beside nearly every component, and `frontend/e2e/nutrition-workspace-smoke.spec.ts`.

### 2.3 Swan Coach
`backend/services/ai/` is ~149 files. Key surfaces: `commandRegistry/` (workout, client, schedule, goal, social, health, plaud, onboarding, coach-intake, trainer, system, nutrition), `dispatchers/` (~40), `contextEngine/`, `promptBuilder.mjs`, `aiChatService.mjs`, `modelSelector.mjs`, `adapters/{anthropic,openai,venice}Adapter.mjs`, `providerCostTracker.mjs`, `costConfig.mjs`, `rateLimiter.mjs`, `circuitBreaker.mjs`, `deIdentifier.mjs`, `phiScanner.mjs`, `outputValidator.mjs`, `EthicalAIReview.mjs`, `pipeline/EthicalAIPipeline.mjs`, `degradedResponse.mjs`, `destructiveOperations.mjs`, `commandExecutionLane.mjs`, `commandFallbackPolicy.mjs`.
Frontend: `frontend/src/components/DashBoard/Pages/coach-assistant/*` (~40 files — proposal cards, gate rail, intake trail, voice, context chips, suggested prompts), `frontend/src/components/UserDashboard/components/{SwanCoachDock,SwanCoachActionLauncher}.tsx`.

### 2.4 User Dashboard
`frontend/src/components/UserDashboard/` — 112 files. Shell: `UserDashboardTabsV3.tsx` (235 lines), `UserDashboardTabBarV3.tsx`, `UserDashboardSidebarV3.tsx`, `UserDashboardProfileHeaderV3.tsx`, `ObservatoryShell.tsx` + left/right rails + `ObservatoryCoverHero.tsx`.
Home: `HomeTabHeroHeader` · `HomeTabNextBestAction` · `HomeTabTrainingProof` · `HomeTrainingCommandStrip` · `HomeTabVisionScenes` + left/right vision rails · `HomeCommunityFeed` · `HomeTabTrendingPanel` · `HomeTabFactionPanel` · `HomeDashboardSearchPanel` · `HomePhotoLibraryPreview` · `DailyHealthLoop` · `useHomeNutritionAction`.
Other tabs: `WorkoutsTab` (+charts/summary/empty) · `CommunityTab` · `DashboardFeedTab` · `AboutSection` (+achievements/profile/skill-trees/rank-titles) · `ProfileChartsGrid` · `PhotoGallery` · `CreativeGallery` · `TransformationPhotoShowcase` · `SocialProgressAnalyticsPreview` · `DashboardChallengesParty` · `UserDashboardQuickStatsTicker` · banner composition system · `UserDashboardStudioLenses`.

### 2.5 Existing planning docs — READ BEFORE PROPOSING
- `docs/ai-workflow/blueprints/NUTRITION-ECOSYSTEM-MASTER-PLAN.md`
- `docs/ai-workflow/AI-HANDOFF/NUTRITION-DECISION-LOGGER-FABLE-FINAL-BUILD-PACKET-2026-07-09.md` (+ the `FABLE-READY-BRIEF` and `AI-VILLAGE-INPUT` siblings)
- `AI-Village-Documentation/validation-prompts/latest/opus-ceo-ruling-nutrition-ecosystem.md`
- `docs/ai-workflow/references/BEST-IN-CLASS-TRAINING-APP-STRATEGY.md`
- `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` + `SWAN-ASSET-STORYBOARDING.md`
- `docs/ai-workflow/references/NASM-OPT-PROTOCOL.md`
- `docs/ai-workflow/references/SWANSTUDIOS-DASHBOARD-VISION-BRIEF.md`

**If your proposal duplicates or contradicts one of these, say so explicitly and justify the override.**

---

## §3 — THE PRODUCT LOOP YOU ARE OPTIMIZING

SwanStudios is **workout-progress-first**: log the workout → save it → turn it into charts/progress proof → decide the next training action → make milestones shareable.

Nutrition must **plug into that loop**, not sit beside it as a separate calorie app. The north-star questions:
- What is the trainee's **next best action** right now?
- Which client needs **coach intervention** today?
- What **progress can be shown** (proof of value)?
- What reason **brings the group back** this week?

Role priorities:
- **Client/user:** log fast, see progress, feel rewarded, share milestones.
- **Trainer:** fast client logging, reviewable history, real-data charts, low-friction plan adjustment.
- **Admin:** who trained, what changed, what's stale, who needs intervention, what can be celebrated.

**Data truth rule:** charts come from real logged data. Mock data is a gap to close, not a feature.

---

## §4 — WORK PACKAGE A: USER DASHBOARD GAP AUDIT (absence-first)

Produce a ranked table of **features that should exist and do not**. For each row:
`gap | which role | why it matters (tie to the core loop or to revenue/retention/trust) | evidence it's missing (file:line or "no such file") | effort S/M/L | value 1–5 | risk if skipped`

Explicitly consider — and rule in or out with a reason — at minimum:
- **Next-best-action truth:** is `HomeTabNextBestAction` driven by real signals or is it decorative?
- **Nutrition↔training coupling:** does today's fuel target change with today's session type/OPT phase? (Almost no competitor does this. It is the wedge.)
- **Adherence & streaks:** logging streaks, weekly compliance %, "you've logged 5/7 days" — with an ED-safe framing.
- **Weekly review ritual:** a Sunday/Monday recap that closes the loop (this is the retention engine most apps lack).
- **Progress proof surfaces:** before/after, PR timeline, measurement trend, photo compare — and one-tap share to community.
- **Coach responsiveness:** can the user see that a human saw their week? Time-to-coach-response as a visible promise.
- **Reminders/notifications:** the loop that brings them back. Push/email/in-app. Quiet hours. Opt-out.
- **Offline / PWA / poor-signal logging** — people log meals in restaurants and gyms with bad reception.
- **Wearables + calendar** as enrichment, never source of truth.
- **Household/family & shared meals**, grocery list, meal prep batching, recipes, leftovers.
- **Dietary identity:** allergies, intolerances, religious/cultural (halal, kosher), vegetarian/vegan, budget constraints, food access.
- **Supplement stack safety** (interactions, upper limits).
- **"Share with my doctor / dietitian" export** — this is simultaneously a safety feature, a trust feature, and a differentiator.
- **Onboarding→first-value time:** how many taps from signup to first logged meal and first visible chart?
- **Empty / loading / error / stale states** on every surface.
- **Accessibility:** keyboard path, screen-reader labels, focus order, reduced-motion.
- **Monetization surfaces:** what is free (Starter), what is Guardian, what is Crystalline — and where the upgrade moment naturally lands.

Also: **name what should be REMOVED or merged.** A $100k site is edited, not accumulated. Say what to kill.

---

## §5 — WORK PACKAGE B: SWAN COACH NUTRITION INTELLIGENCE CORE

The owner's requirement: Swan Coach must reason about nutrition like someone with a doctorate from the best nutrition program in the world — and it must **analyze the user's actual data correctly.**

That means concrete, testable capability — not a longer system prompt.

### B1 — Audit first
Read `coachNutritionContext.mjs` (63 lines), `nutritionCommands.mjs`, `nutritionDispatchers.mjs`, `promptBuilder.mjs`, `aiChatService.mjs`. Report:
- What context does the model actually receive today? Enumerate every field.
- What can it read? What can it write? What requires approval?
- Where does it guess? Where does it silently fail? Where does it return confident nonsense?
- What is the token cost per call and where is it wasted?
- Is any PII reaching the model? (`deIdentifier.mjs`, `phiScanner.mjs` — verify they actually run on the nutrition path.)

### B2 — The knowledge core (specify it, don't hand-wave "make it smarter")
Design a **deterministic computation layer** that runs in code, plus a **reasoning layer** that runs in the model. Nutrition math must NOT be done by an LLM.

Deterministic layer must specify formulas and cite the standard:
- **BMR/RMR:** Mifflin-St Jeor (default), Katch-McArdle / Cunningham when body-fat % is known. State which is chosen when and why.
- **TDEE:** activity factor + real logged session load, not a static multiplier.
- **Energy targets:** deficit/surplus rate bounded (e.g. 0.5–1.0% bodyweight/week), with hard floors below which the system refuses and escalates.
- **Protein:** g/kg ranges per goal, per ISSN position stand. Higher during deficit to protect lean mass.
- **Carbs:** periodized to training load and OPT phase. **This is the integration nobody else ships.**
- **Fat:** minimum for hormonal health; never below floor.
- **Micronutrients:** DRI/RDA/AI/**UL** from NASEM. Gap analysis against logged intake. Flag both deficiency risk AND upper-limit exceedance (supplements make UL breaches real).
- **Fiber, sodium, potassium, omega-3, vitamin D, iron, calcium, B12** — with special attention to female athletes, older adults, and plant-based eaters.
- **Hydration:** baseline + sweat-rate estimate from session duration/intensity/environment.
- **Nutrient timing:** peri-workout, protein distribution across the day, pre-sleep.
- **Refeeds / diet breaks / reverse dieting** — scheduled, not improvised.
- **Low Energy Availability / RED-S screening** — a computed risk flag, not a vibe.

Reasoning layer requirements:
- **Every claim carries an evidence tier** (A: position stand/meta-analysis · B: RCT · C: observational · D: mechanistic/expert opinion). The UI surfaces the tier. No unsourced confident assertions.
- **Citations to real position stands** (ISSN, ACSM, Academy of Nutrition and Dietetics, NASEM DRI) — the model may NOT invent citations. Citations come from a curated in-repo reference table, not from model memory.
- **The model explains its reasoning in plain language** and always states the uncertainty of estimates.

### B3 — Data honesty
- Food data provenance must be visible: USDA FoodData Central vs Open Food Facts vs barcode vs user-entered vs **AI photo estimate**. Each carries a different confidence.
- **Portion estimates get error bars.** "≈520 kcal (±20%)" — never "520 kcal" for a photo guess. Presenting an estimate as a fact is both a UX lie and a legal exposure.
- Missing data must be visibly missing. Never zero-fill.

### B4 — Analysis capabilities to add
Specify each as a command with a schema, dispatcher, and acceptance test:
- Analyze a day / week / month against targets, with trend + variance, not just averages.
- Diagnose *why* a goal is stalling (energy? protein? consistency? sleep? training volume? measurement error?) with ranked hypotheses.
- Detect logging drop-off and adherence patterns (weekday vs weekend, meal-of-day).
- Cross-reference nutrition against workout performance and body-composition trend.
- Meal-plan generation that respects allergies, dislikes, budget, cooking skill, time, culture/religion, and the training calendar.
- Grocery list + prep plan from the meal plan.
- Restaurant/menu guidance.
- Supplement stack review with interaction + UL checks.
- Trainer-facing: roster triage — who's off-track and why, ranked by intervention value.

---

## §6 — WORK PACKAGE C: NUTRITION UX/UI — ENTERPRISE REDESIGN

The owner's words: it looks ugly, and it must become enterprise-grade / "$100k site."

### C1 — Fix the information architecture FIRST
13 tabs is the core failure. Before any pixel, propose a new IA. Constraints:
- **One primary surface** that answers "what do I eat next and am I on track" without a tab change.
- **Logging is one tap from anywhere** in the workspace — and voice/photo/barcode/search are entry modes on one capture surface, not four separate tabs.
- Secondary surfaces (Garden, Farms, Restaurant, Supplements, Learn) move to progressive disclosure — they are not peers of "Today."
- **Role-adaptive shell:** one component, three lenses (client = do; trainer = coach the roster; admin = see the truth across clients). Do NOT fork into three components.
- State the before→after **tap count** for the top 5 tasks. This is a hard deliverable, not a nicety.

### C2 — Visual direction
- Follow `SWAN-CINEMATIC-DESIGN-SYSTEM.md`. Dark-first, sapphire depth, chrome edges, Ice Wing / Wing Purple glow discipline, gold reserved for genuine achievement.
- **One signature visual moment** for the nutrition surface — something memorable that is not a donut chart. Propose 2–3 concept directions with ASCII/HTML wireframes before committing to one.
- Data cards stay **low-motion** (per §1). Motion is GPU-safe and respects `prefers-reduced-motion`.
- Charts: Victory only. Arctic Cyan for data series. Semantic color must never be the only signal (colorblind safety).
- Provide desktop **and** mobile wireframes for every screen. Mobile is where meals get logged.

### C3 — Hostile design pass (mandatory before you submit)
Try to prove your own design is generic, template-y, crowded, flat, or unreadable. Fix the weakest area. Report what you found and fixed. Name the viewport widths you actually reasoned about.

---

## §7 — WORK PACKAGE D: SAFETY, LEGAL & LIABILITY (blocking — no ship without this)

The requirement: helpful expert-grade guidance that is clearly **general health/wellness information**, not medical nutrition therapy — worded so it holds up.

**A footer disclaimer is not a safety system.** Design a layered one:

### D1 — Hard-coded refusal & escalation rails (in code, before the model)
These must be deterministic gates, not prompt instructions the model might ignore:
- **Allergen guard:** the system must never surface a food containing a declared allergen. Fail-closed on unknown ingredients. This is an injury vector, not a UX preference.
- **Eating-disorder safety:** screening signals + a "gentle mode" that hides calories/weight (`nutritionGentleModePreference.ts` already exists — build on it). Hard refusal on requests for extreme restriction, purging, or sub-floor intake, with a supportive escalation message and resources. Never shame.
- **Energy floors:** absolute kcal and macro floors below which the system refuses to generate a target and recommends professional care.
- **Clinical conditions:** diabetes, CKD, cardiovascular disease, GI disease, pregnancy/lactation, post-bariatric, cancer care, and any diagnosed condition → the system provides general information and **routes to a physician/RD**. It does not prescribe medical nutrition therapy.
- **Drug–nutrient interactions:** if medications are known, screen the supplement/food guidance (e.g. vitamin K × anticoagulants, grapefruit × certain statins, iron/calcium timing). If meds are unknown, say the check was not performed rather than implying safety.
- **Minors:** age-gated behavior; no restriction-oriented guidance for under-18 without guardian/professional involvement.
- **Supplement upper limits:** flag UL exceedance across stack + food + fortification.

### D2 — Scope-of-practice language
- Position Swan Coach as **general nutrition education and habit coaching**, not "nutrition counseling," "medical nutrition therapy," "diagnosis," "treatment," or "prescription" — those terms are regulated in many states and the license belongs to RDs/RDNs and physicians.
- Trainer-side copy must reinforce the same boundary: trainers coach habits and general nutrition; they don't prescribe therapeutic diets.
- Copy must be short and human — legal safety that reads like care, not like a EULA. Draft the exact strings.

### D3 — Consent, records, and the paper trail
- Explicit consent at first nutrition use, versioned, timestamped, revocable, exportable. (`backend/migrations/...create-user-consents-table.mjs` exists — extend it.)
- Log every AI-generated nutrition recommendation with model, prompt version, inputs, evidence tiers, and the safety gates that ran. If a claim is ever disputed, the record exists.
- Data rights: export, deletion, access rationale. Nutrition + biometric data is sensitive under CCPA/CPRA (Sean is California-based) and functions like health data under most frameworks even where HIPAA doesn't apply.
- Terms of Service + limitation of liability + arbitration language to review with counsel. **Flag explicitly that the final legal wording requires a licensed attorney — you are drafting for review, not certifying.**

### D4 — Where disclaimers actually appear
Specify placement: first-use consent modal · persistent-but-quiet inline note on any generated plan/analysis · on export/PDF · in the shareable artifact · in the trainer's view. Draft each string. Ban language that over-claims ("optimal," "will," "guaranteed," "cures," "treats," "prescribed").

---

## §8 — WORK PACKAGE E: BUG, ERROR & QUALITY HUNT

Sean's requirement: the site runs 100%, no errors.

For every surface you touch, hunt and report with `file:line` evidence:
1. **Type/build/test truth:** `cd frontend && npx tsc --noEmit`, `npx vitest run`, `npm run build`; `cd backend && npm test`. Report **slice-clean vs baseline-clean separately** — if the repo baseline is not clean, say so and confirm your work adds zero new errors.
2. **Schema drift** (recurring root-cause class here): column-name case drift, table-name PascalCase vs snake_case, FK targeting `users` vs `"Users"`, field-existence drift, type drift, wrong field name in caller, frontend response-shape drift (`data.data.x` vs `data.x`). Check the nutrition models/routes/normalizers specifically.
3. **Auth/IDOR:** can a client read/write another client's nutrition data? Can a trainer reach an unassigned client? Verify against `clientNutritionRoutesSecurity.test.mjs` / `mealPlanRoutesSecurity.test.mjs` and extend them.
4. **Route shadowing:** enumerate every `app.use` / `router.*` that could match the nutrition paths, in mount order.
5. **Runtime:** console errors/warnings, unhandled promise rejections, React key/nesting warnings, `styled-components` error #12 (any shared style chunk with `${}` interpolation composed into a styled component **must** use the `css` helper, never a plain template string — this has taken down a dashboard before).
6. **States:** loading, empty, error, stale-after-failure, refetch, filter-change — on every panel.
7. **Mobile:** overflow, clipping, hover-only controls, sub-44px targets, keyboard/focus traps.
8. **Performance:** bundle impact, lazy-loading of charts, list virtualization, N+1 queries, unindexed nutrition queries.
9. **Rule 4:** flag every nutrition file at/over 300 lines (`NutritionTodayPanel.tsx` is at 298).
10. **Dead code:** unused exports, orphaned components, duplicated logic across the client/trainer/admin nutrition surfaces.

Report as: `severity (P0/P1/P2) | file:line | what breaks | reproduction | fix`.

---

## §9 — PER-BRAIN REMIT (do not all do the same thing)

**FABLE — Final Decider & Architect.**
Owns the final integrated plan. Produces the worker-bot build package per §10. Arbitrates every disagreement between Kimi and Claude and records the ruling with a reason. Owns Work Package B (intelligence core architecture) and D (safety architecture). Fable's output is the plan of record.

**KIMI — Design authority & hostile reviewer.**
Owns Work Package C (UX/IA/visual direction, concept directions, wireframes desktop+mobile) and the hostile pass on everything. Kimi's second job is to try to break Fable's plan: where does it over-scope, where does it under-specify, where will a worker-bot get stuck, where is the safety rail theater rather than a real gate? Kimi also runs the absence-first half of Work Package A.

**CLAUDE — Repo truth & receipts.**
Owns Work Package E (bugs/errors/quality) and the grounding half of Work Package A. Every claim about what exists carries `file:line`. Claude verifies that Fable's and Kimi's proposals match the real codebase — flags anything that assumes a file, field, route, or capability that does not exist. Claude produces the Canonical Surface Receipt for every surface the plan touches (which route mounts it, which JSX actually renders it, which hook consumes it, exact API path string, backend route match, authoritative model fields).

**Merge protocol:** Claude grounds → Kimi designs and attacks → Fable arbitrates and issues the final package. Disagreements are recorded, not smoothed over. CLAUDE.md rules win over any brain's suggestion; if a brain proposes something that violates §1, the violation is logged and the proposal rejected.

---

## §10 — OUTPUT CONTRACT (a worker-bot must build this with ZERO further questions)

Your deliverable is not an essay. It is a build package containing:

1. **Executive summary** — plain English first, then technical. What we're building and why it matters commercially.
2. **Current-state truth table** — what exists, what works, what's broken, what's scaffolding. `file:line` evidence.
3. **Ranked gap register** — every missing feature, scored value/effort/risk, with the cut line marked.
4. **Target architecture** — Mermaid diagrams: system flow, nutrition data flow, Swan Coach nutrition reasoning pipeline (including where every safety gate fires), and an ERD for new/changed tables.
5. **Wireframes** — ASCII or self-contained HTML, **desktop AND mobile**, for every screen that changes. Annotated with tokens and tap counts.
6. **Per-field data & API contract** — every endpoint: method, path, auth/role rules, request schema, response schema, error codes, rate limits. Every model change: exact column names, types, nullability, indexes, migration file name.
7. **The safety rail specification** — every gate, its trigger condition, its refusal/escalation behavior, its test, and its failure mode if implemented wrong.
8. **Exact copy strings** — every disclaimer, consent, refusal, escalation, empty state, and error message, written out verbatim, brand-voice compliant.
9. **Numbered, independently-shippable slices** — each with: files touched, build order, acceptance criteria that are *executable* (the exact test command and expected result), rollback step, and an explicit "do NOT do this in this slice" list.
10. **Test plan** — new unit/integration/e2e tests per slice, plus the regression tests that must keep passing.
11. **Risk register + rollback plan** — kill switches, feature flags, revert ranges.
12. **What we are deliberately NOT doing** and why — so a future reviewer doesn't re-litigate it.

**Detail bar:** if a worker-bot would have to ask you a question to build a slice, the slice is incomplete. Rewrite it.

---

## §11 — HOW TO REPORT (discipline)

- **Confidence tags on every non-trivial factual claim:** `[VERIFIED]` (you read the file / ran the command this session) · `[LIKELY]` · `[HYPOTHESIS]` · `[UNKNOWN]`. Burying uncertainty inside confident prose is a failure.
- **No completion claims without proof.** Never write "done," "fixed," "works," or "clean" unless the same message contains current-session evidence (command + output, or file:line) **and** states that a hostile review pass ran and found nothing new.
- **Blockers first**, then what was verified, then residual risk.
- Forbidden: "should be fixed," "looks good," "safe to delete," "guaranteed."
- If you cannot verify something in-session, say exactly what you could not verify and why.

---

## §12 — EXTERNAL REFERENCE RECEIPT (Mobbin, run 2026-07-27 — READ BEFORE DESIGNING)

This research is already done. **Design from these extracted principles, not from model taste.** Per `design-brain/external-reference-mcp.md` §3, external references are input #4 in the authority order — Swan doctrine still wins every conflict. Anti-clone rule applies: reference X taught principle Y; Swan applies Y through pattern Z with Swan tokens. Do not clone layouts.

```text
EXTERNAL REFERENCE RECEIPT — Nutrition workspace (client/trainer/admin)
Status:        Mobbin used — connector callable, 30 references studied
Surface:       frontend/src/components/DashBoard/workspaces/Nutrition* + FoodTracker/*
User job:      "Am I on track today, and what do I eat next?" (client) ·
               "Which client is off-track on nutrition and why?" (trainer/admin)
Primary action: Log a meal in one tap from anywhere in the workspace
Tools/queries: search_screens ×4 —
  1. iOS  · daily food log w/ calories remaining + macro rings + meals by type (8)
  2. iOS  · capture screen w/ camera + barcode + voice + search in one place (8)
  3. iOS  · AI health-coach insight giving written analysis + recommendations (8)
  4. web  · coach dashboard w/ client adherence status + who-needs-attention flags (6)
References:    Fitbit ·2, MacroFactor ·4, Lifesum ·4, Life Reset ·2, Noom, Alma ·3,
               Bevel ·4, Zero, Ultrahuman, BitePal ·2, Kajabi, 15Five,
               Employment Hero, Charma, Dialpad, Deel
```

### Reference report — grouped by design question

**Q1 · What belongs on the daily surface? — 4/4 consumer apps converge**
Fitbit, MacroFactor, Life Reset, Lifesum all ship the identical spine: **one hero number = *remaining*, not consumed** (forward-looking, action-oriented) → three macro bars/rings immediately beneath, always visible, never behind a tab → meal list grouped by meal type → micronutrients behind progressive disclosure ("Show" / "Learn More") → persistent date stepper.
→ **Swan translation: delete the "My Macros" tab.** Macros belong on Today. That tab exists only because the data was homeless. Same logic kills "Hydration" as a peer tab — it's a row on Today.

**Q2 · What does the empty state do?**
- Lifesum pre-populates `Add breakfast / Add lunch / Add dinner`, each with a **recommended kcal range** ("Recommended: 440–615 kcal"). The empty state *is* the plan.
- Alma opens cold-start honestly: *"Since you just joined, I don't have any food log data yet — but based on your profile and goals, here's what I'd suggest focusing on."*
- Life Reset publishes its own sample size on the weekly chart: *"Avg 1365 cal/day · **1 days logged**."*
→ **Swan translation:** the empty state is the day's plan derived from the training calendar + OPT phase. Never a void, never zero-filled, and every aggregate states how many days it's built from.

**Q3 · How is capture consolidated? — this is the direct answer to the 13-tab problem**
- **MacroFactor:** ONE sheet with segmented modes `Scan | Search | Quick Add | Library`, the running daily total pinned in the header (`0 / 1220`), and the meal slot/time editable inline (`Thu, 22 Aug · 8 AM`).
- **Alma:** a `Track | Ask` toggle above **the same input box** — one field either logs the meal or asks the coach, with camera/mic/bookmark icons inline in the field.
- **Zero:** portion chips (Small/Medium/Large) + pattern chips (Ketogenic/Low-Carb/Balanced) *before* typing — pre-filter to cut keystrokes.
- **MacroFactor / Lifesum:** time-aware and behavioural suggestion rails — "8am Go-Tos", "Common", recency/favourites/filter tri-toggle.
→ **Swan translation:** collapse **Log Meal + Speak a Meal + Food Search + Restaurant** — 4 of the 13 tabs — into ONE capture sheet with modes. And Alma's `Track | Ask` is the Swan Coach integration pattern: **the same input logs a meal or asks the coach.** That is the least-clicks answer and it removes a whole navigational layer.

**Q4 · Decision support at the moment of logging — the differentiator nobody else does well**
MacroFactor's food-detail sheet shows **"Impact on Targets"**: four mini-rings for what *this item* does to today's remaining (18% cal · 20% protein · 43% fat · 1% carbs) **before you commit it**, with unit-selector chips (`egg / medium egg / small / lb`) and a numeric pad.
→ **Swan translation:** never log blind. Show the consequence pre-commit. Cheap to build, genuinely differentiating, and it converts logging from bookkeeping into coaching.

**Q5 · How is analysis presented honestly?**
- **BitePal:** every stat card = chart **+ plain-language verdict + action**: *"Low-protein diet — Protein intake is low; may hinder muscle maintenance – add lean sources."* Target band drawn as a shaded zone, average as a dotted line, ⚠ icons on out-of-range macros.
- **Bevel "Nutrition Score":** publishes its **scale** (Low <34% / Fair 34–67% / Optimal >67%), its **window** (*"Based on 7-day rolling averages"*), and a multi-period trend table (3/7/14/30/90-day) that renders **—** for periods without enough data.
→ **Swan translation:** this is the shipped answer to §B3 data honesty. A composite score is only honest if it publishes its scale, its window, and its gaps. Every C11 chart environment gets a **mandatory verdict line** — a chart without a plain-language "so what" is an unfinished chart.

**Q6 · Where does the disclaimer actually live? — directly answers §7/D4**
- **Ultrahuman**, immediately beneath the AI output, small and grey: *"…based on machine learning and may not be entirely accurate or reliable. **Consult a healthcare professional before changing your lifestyle, diet or treatment.** We don't endorse any specific foods, products and assume no liability for any loss or damage caused by relying on [it]."*
- **Alma**, beneath every response: *"Alma is not a medical professional and can make mistakes. Please double check responses."* — paired with **"Was Alma helpful? 👍 👎"**.
→ **Swan translation: per-output disclaimer at the point of consumption, not a per-app footer.** Every generated analysis, plan, and recommendation carries it inline. The 👍/👎 pair is not decoration — it is the evidence trail that the user was told and had a channel to flag, and it feeds quality review. Adopt both.

**Q7 · Trainer / admin roster triage — no consumer nutrition app covers this**
- **Deel:** list + detail split — roster left with status pills (`NOT STARTED` / `ONBOARDING`), filter chips above (type/status/region/team), detail panel right. Selecting a row never leaves the page.
- **Charma:** person × cadence **matrix** with coloured status dots — "who's off track" scannable in one glance, no drilling.
- **Dialpad** framing: *"Coaching hub — quickly find the most **coachable moments** in your team."*
→ **Swan translation:** the trainer nutrition surface is a **ranked triage list, not a client directory.** Rank by intervention value (who is off-track × how much it matters × how long it's been). List+detail split so the trainer never loses roster context. This maps onto the existing `ClientNutritionRosterTriagePanel` — the pattern is right, the ranking and the split-view are the upgrade.

### Common convergence (adopt)
1. Hero number = **remaining**, never consumed.
2. Macros are permanent furniture, never a destination tab.
3. Capture is **one surface with modes**, never one tab per mode.
4. Show target impact **before** commit.
5. Every chart carries a plain-language verdict.
6. Every AI output carries an inline disclaimer + feedback control.
7. Aggregates publish their window and their sample size.
8. Empty states are plans, not voids.

### Anti-patterns rejected (with reason)
| Rejected | Why |
|---|---|
| Bright multi-colour macro palettes (Life Reset blue/orange/pink, Lifesum green gradient) | Violates Crystalline Swan; Arctic Cyan is data-only. **Colour must never be the sole signal** — pair with shape/label for colourblind users |
| Light-mode-first gradient washes (Lifesum, Noom, Alma) | Swan is dark-first, `crystalline-dark` |
| The giant calorie ring as unconditional emotional centrepiece | Keep the hero number, but **gentle mode must be able to suppress it entirely.** None of these 30 references handle ED-safety well — **this is where Swan beats the category** |
| Conversational-only insight with no persisted record (Bevel, Ultrahuman) | Swan's analysis must be an auditable artifact (§D3), not an ephemeral chat message |
| Streak/gamification pressure attached to calorie restriction | Rejected on eating-disorder-safety grounds — gamify *logging consistency* and *training*, never restriction |
| Noom's tab-per-meal navigation | That is the 13-tab disease we are curing |
| "AI"-branded surfaces ("Food Optimisation AI", "Powered by ChatGPT") | Swan Coach is never called "AI" in user-facing copy |

### Swan translation — direction seed for Work Package C
- **B2 arc (dashboard 4-phase):** orientation (where am I today) → current state (macros + fuel vs. today's session) → progress-insight (verdict-bearing charts) → next-best-action (log it / adjust it / ask Coach).
- **C-patterns:** C12 glass-panel system as the base surface · C9 media-first KPI block for the day header · **C11 premium chart environment upgraded to require a verdict line** · C6 flippable detail for the pre-commit "impact on targets" reveal · C10 narrative dividers between phases. **No C13** — this is a working surface, not an awe surface.
- **Tokens/motion:** Midnight Sapphire / Royal Depth surfaces, Ice Wing for glow + on-track state, Gilded Fern reserved for genuine achievement, Arctic Cyan for chart series only, `#E5484D` for danger. **Motion tier 2/3 (low-motion data cards)** — this is a client-data surface, not a storefront.
- **QA risks:** macro ring legibility at 320px · verdict-line length blowing card height at long labels · triage list at 200+ clients · the capture sheet's mode switcher colliding on mobile · reduced-motion path for every ring animation.

**Kimi owns the 2–3 concept directions** (router ideation gate) seeded by this receipt. Each direction must name which reference principle it applies and which it rejects.

**Design impact:** the 13-tab IA collapses to a defensible **3-surface shell** — `Today` (state + verdicts + next action) · `Capture` (one sheet, all modes, Track|Ask) · `Plan` (meal plan + grocery + learn) — with Garden / Farms / Supplements / Restaurant demoted to progressive disclosure inside those three. Trainer and admin get the same shell with a roster-triage lens in front of it.

---

## §14 — KIMI ROUND 1 + CLAUDE VERIFICATION (2026-07-27) — READ BEFORE FABLE

Kimi's full output: `docs/ai-workflow/AI-HANDOFF/KIMI-NUTRITION-DESIGN-REVIEW-2026-07-27.md` (392 lines, $0.2675).
Kimi committed **Direction B "Orbit"** (session-anchored day) with A's fuel band and C's Track|Ask omnibox absorbed. Wireframes desktop+mobile for 4 screens, tap-count table, 17-row gap register with a cut line.

### 14.1 — Claude filesystem verification of Kimi's safety findings

Kimi had no repo access and tagged ~15 items `[UNKNOWN]`. Verified the three safety-blocking ones:

| Kimi's claim | Verdict | Evidence |
|---|---|---|
| "The minor gate has no age field — a copy string, not a gate" | **WRONG** | `backend/models/User.mjs:131` declares `dateOfBirth`. Also on `WaiverRecord.mjs:29` and `MovementAnalysis.mjs:48`. The gate has data. `[VERIFIED]` |
| "The allergen guard has no data — no dietary-identity model exists" | **WRONG on existence, RIGHT on conclusion** | `backend/models/ClientNutritionPlan.mjs:84-93` declares `dietaryRestrictions` and `allergies`. See 14.2 — the real defect is worse than absence. `[VERIFIED]` |
| "The UL gate has no dose data — no supplement model" | **CORRECT** | Glob over `backend/models/**/*upplement*` returns nothing. `supplementRoutes.mjs` exists with no backing model. UL checking is unbuildable as specified. `[VERIFIED]` |

### 14.2 — P0 FINDING: the allergies field is fail-OPEN by default

`backend/models/ClientNutritionPlan.mjs:84-93`:
```js
dietaryRestrictions: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
allergies:           { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
```

Four compounding defects, all `[VERIFIED]`:
1. **`defaultValue: []` means "no allergies" — and is indistinguishable from "never asked."** In a safety-critical path an empty array must mean UNKNOWN, not SAFE. This is a fail-open default on the one gate whose failure mode is anaphylaxis.
2. **Allergies live on the PLAN, not the PERSON.** `backend/models/User.mjs` has no allergy field (grep: no matches). A client with no nutrition plan has no allergy record anywhere. Allergy is a property of a human being, not of a document.
3. **Unstructured JSONB free text.** "peanut" / "peanuts" / "tree nuts" / "nuts" will not match a structured allergen check against ingredient data. There is no allergen taxonomy.
4. **No provenance or review date.** Nothing records who entered it, when, or when it was last confirmed.

**Consequence for the plan:** the §7-D1 allergen guard cannot be built on this field as it stands. Gap #1 in Kimi's register is therefore correctly ranked #1, but the work is *migrate + restructure + re-consent*, not *create from nothing* — a materially different slice with a data-migration dependency and existing rows to backfill.

**Required fix (hand to Fable as a blocking pre-slice):** promote allergy/intolerance/dietary-identity to a first-class user-scoped model with a structured allergen taxonomy, a tri-state per entry (`declared-present` / `declared-absent` / `never-asked`), provenance + last-confirmed timestamp, and an explicit onboarding capture step. `[]` must become unrepresentable.

### 14.3 — Kimi hostile findings ACCEPTED (fix before Fable dispatch)

- **The canon is referenced but never included** — *accepted, largest defect.* §1 distills CLAUDE.md but `swan-design-router`, the C1–C13 pattern definitions, the B2 arc, and Rules 4/58 live in repo files the receiving brains do not have. **Fix: Fable's dispatch must attach `SWAN-CINEMATIC-DESIGN-SYSTEM.md` + `SWAN-ASSET-STORYBOARDING.md` alongside this prompt, not cite them.**
- **👍/👎 is not an evidence trail as drafted** — *accepted.* It is a feedback channel. It becomes proof-of-notice only when wired to the §D3 audit log with output ID, prompt version, and timestamp. §7-D4 is amended: the disclaimer *render event* is what gets logged, not the thumbs click.
- **No test specified for disclaimer presence** — *accepted, sharp.* Added to §10.7: a regression test asserting the inline disclaimer renders visibly at 320px, in gentle mode, on every generated artifact. A rail without a regression test is a rail that survives until the next slice.
- **Selective verification of the safety stack** — *accepted.* §B1 named only `deIdentifier.mjs` / `phiScanner.mjs`. Extend to `EthicalAIPipeline.mjs`, `outputValidator.mjs`, `circuitBreaker.mjs`, `commandExecutionLane.mjs` — prove each actually executes on the nutrition path rather than merely existing.
- **Five work packages is five projects; the prompt demands a cut line but authorizes none for itself** — *accepted.* **Cut line for the program: WP-D (safety) and the 14.2 allergen restructure ship FIRST and alone.** WP-C (UX) follows. WP-B's deterministic computation layer is phased — energy/protein/hydration first, micronutrient/RED-S/citation-table later. WP-E is scoped to touched surfaces only, not the repo.
- **"Zero errors" is unbounded** — *accepted.* Rescoped: zero *new* errors introduced by each slice, plus a named baseline disclosure per Rule 56. "100% no errors" across a 112-file dashboard is unenforceable and would be claimed rather than demonstrated.
- **Fable is judge and party** — *accepted as a real process defect.* Fable owns WP-B and WP-D and arbitrates disputes involving them. Escalation past Fable goes to Sean. Recorded, not resolved.
- **Gentle mode under-specified** — *accepted.* It is a separately rendered state with its own layout and its own wireframe, never `display:none` on numerals. Kimi did not deliver that wireframe and correctly declined to claim it done — it is a blocking item for the build package.

### 14.4 — Kimi findings NOT accepted

- **"The prompt is unbuildable as dispatched"** — overstated. It is under-specified for a brain without repo access; Claude and any in-repo worker-bot resolve the canon by reading it. The fix is attachment, not redesign.
- **"The ideation gate is half-pre-empted by the receipt"** — the §12 receipt derived the 3-surface shell from 30 shipped references; that is research, not pre-emption. Kimi's own resolution (shell locked, directions compete on organizing metaphor) is the correct reading and produced a better outcome than an open shell would have.
- **3840×2160 needs no distinct layout** — agreed on substance, but it stays on the verification matrix per Rule 24. Max-width containment IS the answer; it still has to be checked, not assumed.

### 14.5 — TRANSPORT DEFECT (affects every future Kimi/Fable consult)

`scripts/consult-kimi.mjs:78` redacts with:
```js
.replace(/\+?1?[\s.(-]*\d{3}[\s.)-]*\d{3}[\s.-]*\d{4}/g, '<REDACTED_PHONE>')
```
This matches **any 10-digit run**, so Sequelize migration timestamps (`20260112000002`), commit SHAs with digit runs, and long numeric IDs are mangled before the model sees them. Kimi received `<REDACTED_PHONE>` where §2.2 named migration files and correctly flagged them as unresolvable.

**Impact:** any consult doc citing migrations, SHAs, or numeric identifiers silently loses that precision — in a prompt that demands `file:line` accuracy. **Fix before the Fable dispatch** (tighten to a phone-shaped pattern with separators/boundaries, or skip fenced code and backticked paths). Not yet fixed. Tracked on SWA-71.

---

## §13 — THE ONE-LINE STANDARD

Every decision gets tested against this: **does it make a trainer's client more likely to eat well, train well, see proof of progress, and stay?** If it doesn't, cut it — no matter how impressive it looks.

And every screen gets tested against this: **would someone believe this app cost $100,000 to build?** If not, it isn't finished.
