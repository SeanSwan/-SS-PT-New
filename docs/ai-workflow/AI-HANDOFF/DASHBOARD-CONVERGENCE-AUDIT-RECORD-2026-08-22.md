# AUDIT RECORD — Dashboard Convergence + Swan Coach Capability

Date: 2026-08-22 · Audited ref: `origin/main` @ 79f66de41 · Auditor: Opus 5
Panel: Kimi K3 ($0.0965) · Grok 4.6 ($0.0562) · DeepSeek V4 Pro ($0.0215) · Ox Alpha ($0.0000) · GLM 5.3 (sub)
Total spend: ~$0.174. Raw verdicts: `AI-Village-Documentation/audit-2026-08-22/`

## HEADLINE

Sean's fear — "we built different components for the same thing" — is **mostly already solved** on main and he does not know it. 19 of 25 trainer route components are the SAME component as admin. The pain is real but its cause is different: **dead code that looks alive**, and **one un-converged sidebar renderer**.

## VERIFIED FINDINGS

All `[VERIFIED]` against origin/main this session unless tagged otherwise.

### F1 — Client hub is ALREADY unified. No consolidation needed.
`workspaces/TrainerClientsWorkspace.tsx` is 16 lines: `<ClientsWorkspace audience="trainer" />`.
`clients-team/clientHubAudience.ts` carries the audience config. `dashboardSupersetInvariant.test.ts` DECLARED_ROLE_EXCLUSIVE already documents this as the intended pattern.
ACTION: none. This is the template to reuse everywhere else.

### F2 — 19/25 trainer components are literally shared with admin.
Shared: AvatarHomePage, BodyMapPage, BootcampBuilderPage, ChallengeCommandWorkspace, CoachCommandCenterPage, CreatorEconomyPage, EnhancedClientProgressView, EquipmentManagerPage, LiveStreamingPage, MessagingPageLazy, NutritionPlanBuilder, NutritionWorkspaceLazy, SprintPlannerPage, TrainerAssessmentsPage, UniversalSchedule, VideoCallPage, VideoLibraryPage, VirtualOlympicsPage, WorkoutPlannerPage.
Genuine trainer-only: EnhancedWorkoutLogger, PlaudIntelligenceWorkspacePage, TrainerEarningsPage, TrainerHomeTab (+ the TrainerClientsWorkspace wrapper and TrainerBuildPlanToPlannerRedirect alias).

### F3 — DEAD CODE that reads as canonical. P1.
`components/TrainerDashboard/ClientManagement/` = 15 non-test files. `MyClientsView` is exported at `UniversalDashboardLayout.routeComponents.tsx:53` but appears ZERO times in `routes.tsx`. Every non-test consumer of routeComponents is routes.tsx itself (Ox Alpha's B1 challenge → REFUTED).
It still holds live-looking `navigate('/dashboard/trainer/log-workout?...')` at MyClientsView.tsx:110 and MyClientsViewWithFallback.tsx:200.
ACTION: delete the directory + the lazy export. Unanimous panel ruling; DeepSeek's "one day" pick.

### F4 — ~120 of 241 lines of `config/dashboard-tabs.ts` are dead. P2.
COMMON_/TRAINER_/CLIENT_DASHBOARD_TABS have zero consumers outside their defining file. They look authoritative and drive nothing. ACTION: delete.

### F5 — TWO SIDEBAR RENDERERS is the real divergence. P1.
Admin: `WORKSPACE_CONFIG` (data-driven, 9 consumers, contract-tested by sidebarRouteParity + dashboardSupersetInvariant). Trainer: `trainerNavConfig` hardcoded at TrainerStellarSidebar.tsx:56, covered by NO parity contract test.
PANEL RULING (Kimi, adopted): do NOT unify the configs — the vocabularies legitimately differ (HOME/CLIENTS/BUILD vs command/clients/training). Converge the RENDERER; keep two config documents. A forked renderer is where tokens, focus rings, active-state and 44px targets silently drift.

### F6 — Canonical naming law violated x2. P2.
`canonical-surface-names.ts` LAW: "never fork a local string."
(a) Same meal-planner surface = "Nutrition" (admin) vs "Nutrition Intelligence" (trainer).
(b) `CANONICAL_SURFACES.logClientWorkout.routes.trainer` = `/dashboard/trainer/log-workout`, but trainerNavConfig ships `/dashboard/trainer/clients?intent=log_workout`.
NOTE: admin DOES mount `/log-workout` (AdminLogWorkoutRedirect → Client Hub logger), so the canonical file is NOT stale (Ox Alpha's B2 alternative reading → REFUTED). The nav is the fork. Query-intent nav also breaks active-nav highlighting and is invisible to canonical-name tests.

### F7 — Line-cap exposure. P2.
`backend/services/ai/commandDispatcher.mjs` = 391 lines, over the 300-line rule (Kimi's catch).
`workspaces/ClientsWorkspace.tsx` = 288/300 — the consolidation flagship has 12 lines of headroom, so adding audience branches breaches the cap immediately (Ox Alpha's catch).

### F8 — Swan Coach is ~7x bigger than CLAUDE.md claims. P2 (doc drift).
~139 commands / 22 registry files / dispatcher 391 lines. CLAUDE.md still says "20 commands live, commandDispatcher.mjs 214 lines" (dated 2026-04-11). Under Rule 75 (trailhead-truth) this is a P1-class doc lie: the next agent will "complete" a system that is already four months further along.

### F9 — Swan Coach UI-driving is FULLY WIRED. My brief was WRONG. [CORRECTION]
I initially reported the `frontendEvent` lane as possibly inert. That was an over-inference from a single camelCase grep. Verified truth: the backend declares 18 distinct frontendEvent names; ALL 18 have frontend consumers (2–5 files each). The bridge is `window` CustomEvent based with acknowledgement AND Undo receipts (`useBootcampAiEvents.ts`, `CoachCommandCenter.commandLane.ts:51-102`). Well-built mechanism, not a gap.
THE REAL GAP IS BREADTH, NOT WIRING: those 18 events cover only workout-planner, bootcamp, pain-chart and workout-logging. There is NO navigation/dashboard-manipulation event lane — which is precisely Sean's stated #1 ask ("tell it to go somewhere / do stuff and it does").

### F10 — Security posture is STRONG. Panel's "disqualifying omission" was about my brief.
`backend/routes/aiCommandRoutes.mjs` composes: `protect` (auth), `aiCommandLaneKillSwitch`, `aiCommandRateLimiter` (Grok + Ox Alpha "no rate limit" → REFUTED), `assertAssignmentOrAdmin` from `verifyClientAccess.mjs` (IDOR → REFUTED), `recordCommandAudit` (audit trail), `accessibleClientIdentityPrivacy.mjs` (PII sanitizer → PII claim REFUTED), `destructiveOperations.mjs`.
Plus `commandExecutor.mjs:369` enforces `roleRequired` server-side at execution, `voiceConfirmationTier.mjs` gates destructive/confirm tiers, and `resolveClient` scopes by `trainerId` when the caller is a trainer.

### F11 — REAL SECURITY GAP: no idempotency on the voice command path. P1.
Probe validated case-insensitively. Idempotency keys exist ONLY in `dispatchers/gamificationCommandDispatchers.mjs:182` and `dispatchers/sessionDispatchers.mjs:32`. The general command execute/confirm path has NO idempotency key, nonce, dedupe or replay guard.
IMPACT: voice is misrecognition- and retry-prone. "Log workout" heard twice = two logged sessions = two session-credit deductions = a BILLING error against a paying client.
This is the one panel security finding that survives verification.

## RANKED ACTIONS

- **P1-a** Delete `TrainerDashboard/ClientManagement/` + its lazy export (F3). Cheap, unanimous.
- **P1-b** Add an idempotency key to the AI command execute/confirm path (F11). Billing-protective.
- **P1-c** Converge the sidebar renderer, keep both configs (F5). Kills the drift engine.
- **P2-a** Fix CLAUDE.md Swan Coach numbers (F8). One-line doc truth.
- **P2-b** Kill the `?intent=log_workout` fork; use the canonical route (F6b).
- **P2-c** Resolve "Nutrition" vs "Nutrition Intelligence" in canonical-surface-names.ts (F6a).
- **P2-d** Delete dead tab constants (F4). Split commandDispatcher.mjs under 300 (F7).
- **P3** Design the NAVIGATION event lane for Swan Coach (F9) — the actual unlock for Sean's ambition. Must ship behind the existing confirmation/audit machinery, and after F11 idempotency.

## PANEL CALIBRATION

| Seat | Cost | Value |
|---|---|---|
| Kimi K3 | $0.0965 | BEST ruling quality. Caught the 391-line cap breach; "converge renderer, fork config" beat my answer. Correctly flagged my finding I as over-inferred. |
| Ox Alpha | $0.0000 | BEST value. Deepest security imagination (indirect prompt injection via client-authored pain-chart notes; view-as × voice confused-deputy). Caught the 288/300 headroom problem. Several correctness attacks refuted. FREE. |
| Grok 4.6 | $0.0562 | Best schema-drift table; security overlapped Ox Alpha. |
| DeepSeek V4 Pro | $0.0215 | Sharpest single prioritization — its "one day" pick matched P1-a independently. |
| GLM 5.3 | sub | Competent, least unique signal. |

LESSON: the free seat (Ox Alpha) outperformed two paid ones. Panel security claims were largely inferred from silence in MY brief and did not survive code verification — 4 of 5 refuted.

## MISTAKES I MADE

- Over-inferred F9 ("UI-driving may be inert") from a single camelCase grep for `frontendEvent`. Caught by my own hostile pass AND by Kimi/Ox Alpha. All 18 events actually have consumers.
- Claimed no rate limiting on aiCommandRoutes. My grep `rateLimit|rateLimiter` was case-sensitive and missed `aiCommandRateLimiter`. **REPEAT OFFENCE** — I hold a standing memory "validate the probe before believing a negative" and violated it TWICE in this one session. The durable fix is procedural, not resolutional: for any "X is missing" claim, first run the same probe against a token KNOWN to be present. I did that once (the 104-file sanity check) and was right; the two times I skipped it I was wrong both times.
- Fired the panel before creating the output directory. DeepSeek's paid call succeeded and its response was DISCARDED by an ENOENT on write. One paid call wasted (~$0.02). Create the sink before spending money into it.
- Wrote only 7 of 17 registry counts into the brief, letting DeepSeek and Ox Alpha correctly observe that 40% of commands were unaudited in the document.
