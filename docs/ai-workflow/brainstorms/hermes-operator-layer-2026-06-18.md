# Brainstorm: In-App Hermes MCP / Operator Tool Layer

**Date:** 2026-06-18  ·  **Status:** COMPLETE (grill-me Phase 1+2 done; Q1-Q5 + closeout resolved)  ·  **For:** Hermes in-app Operator Console → feeds chromie → triangle fusion → swan-orchestrator → build

## Summary
The in-app layer that makes SwanStudios **driveable by operators** (not just clickable in the UI). Scope decided by Sean 2026-06-18: **admin operator + per-trainer operators, role-scoped** — multi-tenant auth, because attracting trainers to the platform is the wedge (rule 62). This is the in-app driveable surface, DISTINCT from the Sean-only Hermes Operator Bridge (Pi+Telegram). High-stakes (auth/authz + multi-tenant scoping) → gated path: grill-me → chromie → triangle fusion before any code.

## Key Decisions
- Operator scope = admin + per-trainer (role-scoped), NOT Sean-only — Sean 2026-06-18 (memory: project_hermes_operator_scope). Wedge = trainers operating the platform.
- Gated path before code: grill-me (intent) → chromie (will-it-win) → triangle fusion → swan-orchestrator → build. No code until cleared.
- **v1 surface = In-app Operator Console** (Shape A), wrapping the existing AI Command Engine; MCP export deferred to fast-follow — Sean 2026-06-18 (Q1).
- **v1 magic workflow = Plaud/voice → parse → reviewable draft → confirm → log → progress chart** — Sean 2026-06-18 (Q2). Defines the v1 command subset + success metric.
- **AUDIENCE EXPANDED to 4 (Sean 2026-06-18):** the operator capability is also a **paying-end-user self-service feature + a selling point**, not only admin/trainer. Roles & scope: **admin** = full · **trainer** = operate on *assigned clients* (cross-tenant scope guard — the hard case) · **paying user** = operate on *self* (self-scoped by own JWT userId — LOWEST auth risk, no cross-tenant logic) · **free user** = pay-gated → upsell behind the existing paywall (Starter free / Guardian donation / Crystalline $24.99/mo). The paid-user-self voice-log is a monetization hook (rule 62) and the cleanest scoping case.
- **Standing design principle (Sean 2026-06-18):** build this as an extensible, hardened, future-proof shell — "keep building on top of it to make it stronger." → favors a clean scope-BASED authorization model (extensible to new roles/tiers) over one-off role checks, with hardening (Rule-8 redaction, audit, per-operator kill-switch) as first-class, not bolt-on.
- **v1 audience order (Q3):** admin + paid-user(self) ship first (self/full-scope, zero cross-tenant risk); trainer→assigned-clients = v1.1, designed-forward in every contract/audit/gate, ships only after the scope guard is hardened + hostile-reviewed.
- **Rule-8 privacy (Q4):** full hardening in v1, smallest shippable — `redactTranscriptPII()` before the parser LLM + consent gate + required ZDR + draft-purge. Not deferred.
- **Monetization (Q5):** Crystalline unlocks self-service voice-log; Guardian = capped taste-quota; Starter = locked value-preview (no AI cost); admin/trainer bypass; + per-user usage caps + AI-cost telemetry.
- **Mount points:** v1 = **user dashboard** (self, Crystalline-gated) + **admin dashboard** (full). Trainer-dashboard mount = v1.1 (with the hardened scope guard). Surface reuses the durable `PlaudMergeReview` draft pattern, NOT the ephemeral Coach `sessionStorage` path.

## Q&A Log
_(appended after every exchange. Planned grill order below — vision-tier first per Rule 64; recommended answers grounded in the terrain map.)_

**Question bank (pending answers):**
- **Q1 [vision] ASKED:** What IS this layer for v1 — (a) in-app Operator Console UI, (b) MCP tool-server, (c) both? — *rec: (a) Console first (mostly wiring over the existing engine, fastest trainer value), MCP as fast-follow.*
- Q2 [vision]: The single v1 "magic" workflow that drives trainer adoption? — *rec: log-a-client's-workout in fewest taps (`dispatchLogWorkout` already exists end-to-end).*
- Q3 [scope]: Exact per-trainer resource boundary? — *rec: strictly active `ClientTrainerAssignment` only; pending/inactive → 403; no gym-wide read.*
- Q4 [scope]: Which command categories in-scope for trainer vs admin-only? — *rec: trainers get workout/schedule/health(read)/nutrition/goals/intake/dashboard + create_hermes_task; admin keeps system/trainer-mgmt/billing/moderation/cross-trainer.*
- Q5 [scope]: Admin act-as/impersonate a trainer (write), or only on clients directly? — *rec: admin read-write on any client; read-only `viewAs` for debugging; no write-impersonation v1.*
- Q6 [scope]: Sync-only v1, or async Hermes task-queue too? — *rec: sync-only via command engine; defer async queue until it has Sequelize persistence.*
- Q7 [data]: Where does operator authz live — extend TrainerPermissions / new table / JWT scope claims? — *rec: extend TrainerPermissions + reuse ClientTrainerAssignment; no JWT change v1.*
- Q8 [data]: Time-boxed/expiring grants, or permanent-while-assigned? — *rec: permanent-while-assigned v1; leave `expiresAt` dormant.*
- Q9 [security]: Dedicated operator kill-switch + rate-limit separate from global? — *rec: yes (`OPERATOR_COMMANDS_ENABLED`).*
- Q10 [security]: Existing text-confirm enough for destructive ops, or rich preview? — *rec: reuse HMAC two-phase + render rich preview (affected count, client, credit/$ impact).*
- Q11 [ux]: Client target via UI selector (clientId) or natural-language? — *rec: UI selector passes clientId directly (avoids silent validation failures).*
- Q12 [ux]: Console as a tab in trainer/admin dashboards, or full-screen mode? — *rec: panel inside existing dashboards, next to client list + charts.*
- A1 [security]: Patch the verified Hermes IDOR now (read/list/cancel → requestedBy-self / admin-all)? — *rec: yes, independent cheap fix.*
- A6 [vision]: v1 human-initiated only, or also autonomous agentic Swan-Coach-driven? — *rec: human-initiated only v1.*

---
### Q1 [vision]: What is this operator layer, for v1?
- **Recommended:** (a) In-app Operator Console first — it's mostly wiring over the already-built command engine (`/api/ai-command/execute`, `getCommandsForRole`, confirm, audit), delivers trainer-wedge value fastest; MCP export as a fast-follow once scoping is proven.
- **Sean's answer:** **(a) In-app Operator Console.** [DECIDED 2026-06-18]
- **Implication:** v1 = a structured console wrapping the existing AI Command Engine; MCP export deferred to fast-follow. Net-new = resource-scope guard + dashboard surface (NOT MCP codegen).

### Q2 [vision]: The single v1 "magic" workflow that drives trainer adoption?
- **Recommended:** Log-a-client's-workout in the fewest taps (find client → dictate/confirm → save → it lands on their progress chart). Product Core Loop's first beat; `dispatchLogWorkout` already exists end-to-end.
- **Sean's answer:** **Plaud/voice-powered workout logging** (a specialization of "log a client's workout"). Flow: trainer finds client → **drops/dictates a Plaud/voice note** → Swan Coach/Hermes **parses sets/reps/exercises into a reviewable workout DRAFT** → trainer **quick-confirms** → approved log **updates progress charts + client-facing proof.** [DECIDED 2026-06-18]
- **Implication:** v1 core path = **voice/Plaud in → parse → reviewable draft → confirm → log → chart.** v1 command subset = `log_workout` (`dispatchLogWorkout`) + the existing Plaud/transcript parse pipeline + a review/confirm gate (no auto-write). ⚠️ This hits the **free-text-PII risk (#4) hardest** — a transcript carries client names + possibly health detail → Rule 8 name-context redaction before any LLM is MANDATORY on this path (or parse locally). Success metric: drop voice note → reviewable draft → 1-tap confirm → logged + on the chart.

### Q3 [vision/scope]: v1 audience sequencing (now 3 operator audiences: admin, trainer→clients, paid-user→self)?
- **Recommended:** Ship **admin + paid-user(self)** first — both are full/self-scope (ZERO cross-tenant risk), the paid-user path is directly monetizable, delivers the magic workflow fast; **trainer→assigned-clients is the immediate next slice** carrying the cross-tenant scope guard. Pay-gate the self-service voice-log at Crystalline (AI/compute-cost feature; Guardian quota optional).
- **Sean's answer:** **Admin + paid-user(self) first** — but DESIGN every command contract, audit log, approval gate, and data shape as if **trainer→assigned-clients is the immediate v1.1**. Trainer access ships ONLY after the resource-scope guard is hardened + hostile-reviewed. [DECIDED 2026-06-18]
- **Implication:** v1 enforcement = self/full-scope only (`req.user.id`), but the scope-guard seam, audit schema, and command contracts are built forward so v1.1 trainer scoping drops in without rework. No cross-tenant enforcement ships until hardened.

### Q4 [security]: Rule-8 privacy depth for v1 (the transcript→LLM path)?
- **Recommended:** Full v1 privacy hardening — build `redactTranscriptPII()` (mask names/ages/DOB/procedures before the parser LLM), add an explicit consent gate, enforce provider ZDR, confirm a draft-purge job. Non-negotiable for a NEW user-facing feature touching health/minors-adjacent data; ALSO fixes the existing live violation. (L2 redaction is the cheap, high-value core; the transcription leg L1 is consent + ZDR, since you can't redact audio before transcribing it.)
- **Sean's answer:** **Full hardening, smallest shippable.** `redactTranscriptPII()` at the parse boundary masking names/ages/DOBs/contact/injury/free-text identifiers **before the parser LLM (Gemini or any cloud model) sees the text**; explicit consent gate for Plaud/voice; provider ZDR **required** for this workflow; draft-purge policy so unapproved drafts don't linger. NOT deferred. Goal = a hardened parse path that proves the magic without a known privacy gap — lean, not bureaucratic. [DECIDED 2026-06-18]
- **Implication:** v1 must ship the redaction + consent + ZDR + purge. NUANCE: L1 transcription sends *audio* to Gemini (can't be pre-redacted) → covered by consent + required ZDR + audio-delete; L2 is *text* redaction before the parser. L2 also hardens the existing Plaud pipeline (independent win).

### Q5 [scope/monetization]: Which subscription tier unlocks the self-service (paid-user-on-self) voice-log?
- **Recommended:** **Crystalline ($24.99/mo)** unlocks it; free Starter = locked → `CrystallineLockOverlay` upsell. Optionally a small **Guardian** monthly quota (e.g. N free voice-logs) as a taste-then-upgrade hook. Rationale: each voice-log has real per-use AI cost (Gemini transcribe + parse), so gating at the paid tier is both monetization AND cost-control (aligns with the AI-cost-scaling strategy). Admin/trainers bypass gating (they already do).
- **Sean's answer:** **Crystalline = full self-service voice-log.** Guardian = a tightly-capped monthly taste quota (a few free self voice-logs → upgrade hook). Starter = locked Crystalline overlay + value preview, **no AI cost incurred.** Admin/trainers bypass the gate. Add per-user usage caps + cost telemetry + clear upgrade messaging so it monetizes without uncontrolled AI spend. [DECIDED 2026-06-18]
- **Implication:** paywall wiring reuses FrostedPaywall/CrystallineLockOverlay; need a per-user voice-log quota counter + AI-cost telemetry; free tier never hits the AI (value-preview only).

## Key Highlights
- Distinct from Sean-only Pi+Telegram Hermes (HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md). Public in-app Swan Coach vs Sean-only Hermes boundary must stay intact.
- App is described as "API-first already" — the operator/MCP layer is plausibly a wrapper over existing REST, scoped per role.

## Architecture Notes (parent / children / whole)
Source: 8-agent terrain-map workflow 2026-06-18 (`w7eyscb64`), VERIFIED against repo.

**Headline: the operator capability is ~70% already built.** It just isn't *scoped, packaged, or surfaced* as an "operator layer." The substrate is a production **AI Command Engine**: `POST /api/ai-command/execute` → 9-10 step pipeline (sanitize → PHI-scan → AI intent-classify → Zod validate → write-kill-switch → RBAC → client-resolve → debate-route → confirm → execute → audit) in `backend/services/ai/commandExecutor.mjs`, dispatching ~100+ commands across 14 registries via ~49 dispatchers. Already has: per-command RBAC (`cmd.roleRequired` + `getCommandsForRole`), HMAC two-phase commit for destructive ops (`destructiveOperations.mjs`, 120s TTL), audit log (`AiCommandAuditLog`), global kill-switch (`AI_COMMANDS_ENABLED`) + rate limiter (10/min,120/hr), zero-PII-to-LLM de-identification (`deIdentificationService.mjs`). Plus an in-memory Hermes task queue (`/api/hermes/tasks`, admin/trainer-gated). API-first surface: 192 route files, ~500+ endpoints.

- **Parent surface:** the existing **AI Command Engine** (`commandExecutor` + `commandRegistry` + `commandDispatcher` + `/api/ai-command/execute`). The operator layer is NOT a new engine — it's a **scoping + surfacing shell** over it. The 192-route REST API is the grandparent.
- **Children the layer adds:** (1) a resource-scope authorization model (extend `TrainerPermissions` / reuse `ClientTrainerAssignment`); (2) an `operatorScopeGuard` middleware (today's gap — fires after `protect`, 403s unassigned client access); (3) a surface — Operator Console UI **or** MCP tool-schema exporter **or** a lean `/api/operator-command/*` facade; (4) operator-specific kill-switch + rate-limit (separate from global); (5) a durable Sequelize `HermesTask` model (today's queue is in-memory → dies every Render deploy).
- **Fit with Product Core Loop / dashboards:** makes the app **driveable** (by intent) not just clickable. Serves the rule-62 wedge — trainers who can operate fast (find client → log/adjust/book in a few taps or one sentence) are stickier. Mounts inside the trainer/admin dashboards, one tap from the client + progress data it operates on.
- **Relationship to Swan Coach:** SIBLINGS over one engine. Swan Coach = the natural-language front door (text → classify → execute); the operator layer = a structured front door (pick tool + params → execute, skip classify). Not competitors.
- **Relationship to Sean-only Pi+Telegram Hermes:** deliberately DISTINCT. That bridge is Sean-private (Telegram allowlist, dedicated PC, has shell/coding tools, planned-not-deployed). This in-app layer is multi-tenant, in-production-app, **NO shell/file/process tools** (dispatcher-allowlist-only), reachable by admin + assigned trainers. Share a name + privacy philosophy, separate codebases. The in-app `/api/hermes` queue is the ONLY "Hermes" thing in production code today.

## v1 Flow Architecture (pipeline map `w1ncs4mkp`, 5-agent, VERIFIED)
**The v1 magic workflow is ~90% existing infrastructure — a new ORCHESTRATION SURFACE, not a new write stack.** End-to-end path, all real components:
0. **Intake** — Plaud NotePin → Applaud webhook (`/api/plaud/webhook/applaud`, HMAC+nonce+SSRF-hardened) OR manual upload (`/api/workout-logs/upload`) → `PlaudClip` row.
1. **Transcribe** — audio → Gemini Flash multimodal (`voiceTranscriptionService.mjs`); raw transcript in memory only, never persisted plaintext.
2. **Parse to draft** — `parseWorkoutTranscript()` (`workoutLogParserService.mjs`, Gemini 2.5-flash, **LLM not regex**, frozen-since-Phase-9 JSON schema: exercises/sets/reps/painFlags/notes; confidence 0.50-0.99).
3. **Stage as reviewable draft** — `{transcript, parsedWorkout}` AES-256-GCM encrypted into `PlaudMergeRequest.payloadCipher` (durable; NOT the ephemeral Coach `sessionStorage` path).
4. **Operator review + quick-confirm** — `PlaudIntelligenceWorkspacePage` → `PlaudMergeReview` (transcript + parsed exercises + blockers ribbon + multi-day split guard) → "Confirm and log".
5. **Commit (atomic)** — `submitAiWorkoutLogAsDailyForm` (`aiWorkoutDailyFormService.mjs`): ONE transaction writes WorkoutSession + WorkoutLog + DailyWorkoutForm, billing decision, session deduction, plan-progress advance, returns a proof receipt; then merge-request cipher purged. **Both the merge-UI path and the NL/voice `log_workout` command path terminate at this SAME canonical writer.**
6. **Chart + proof** — WorkoutLog/WorkoutSession are the real data source; client charts via `clientAnalyticsRoutes` (paramless, JWT-derived userId, IDOR-safe) → `chartDataController` (regression-locked).

**REUSE AS-IS (do not rebuild):** the parser, transcription, the entire Applaud SSRF/HMAC security stack, the encrypted `PlaudMergeRequest` draft store, the full review/confirm UI cluster, the canonical writer, the chart endpoints, the ai-command confirmation gate.

**BUILD NEW (operator-console deltas):** (1) dual-role trainer+client picker (no surface lets admin pick trainer→client today); (2) operator-scoped pending queue w/ filter; (3) confidence-driven review routing (flag <~0.75 for mandatory manual review — confidence computed but unsurfaced); (4) **defense-in-depth assignment re-check inside the writer** (`submitAiWorkoutLogAsDailyForm` does NOT re-verify active `client_trainer_assignment` before writing); (5) fine-grained approval audit (actor + before/after + billing impact); (6) real-time draft-ready/logged notify — **gated on the pending B1b SSE spike**, else poll; (7) inline edit-before-confirm of parsed sets/reps; (8) billing-impact in the confirm copy (credits deducted / remaining); (9) DEFERRED: multi-client group-class split (parser is single-client).

**Risk correction [VERIFIED]:** the earlier "client-ID bypass" worry is OVERSTATED — trainer scoping IS enforced on the ai-command path (`resolveClient` applies the active-assignment SQL even to direct IDs). Real residual gap = the canonical writer itself doesn't re-verify the (trainerId, clientId) assignment → add a defense-in-depth check in the writer transaction (delta #4).

## ⚠️ Verified live security/privacy issues (independent of the operator-layer decision)
- **🔴 Rule-8 LIVE VIOLATION (transcript leg) [VERIFIED]:** the raw Plaud transcript — full PII (client names, age, surgery history, pain complaints) — is sent to Gemini at BOTH transcription (`voiceTranscriptionService.mjs:118`) and parse, **with NO redaction.** The pipeline's `stripPHI` only sanitizes structured ai-command text, never the transcript (it's a separate upstream service). So "zero PII to LLMs" is NOT satisfied today on the existing Plaud pipeline. Three-layer fix: (L1 transcription) consent + enforced ZDR + audio-delete — currently documented-not-enforced; (L2 parse) build `redactTranscriptPII()` to mask names/ages/DOB/procedures before the parser LLM (parser only needs movement/performance language — name-stripping doesn't hurt parse quality) — **highest-priority privacy build**; (L3 storage/egress) encrypted-at-rest ✓, confirm a purge job for abandoned drafts.
These are real, repo-verified IDOR/data-isolation bugs in the EXISTING in-app Hermes queue — fixable now as a small standalone patch, regardless of where the operator layer lands:
- **List leak** — `hermesRoutes.mjs:90-93` calls `listTasks({agentType,status})` with no `requestedBy`/`ownOnly`, so **every trainer sees every other trainer's entire task queue**.
- **Read leak (worse)** — `GET /api/hermes/tasks/:id` (`hermesRoutes.mjs:121-127` → `hermesService.mjs:163-167`) returns ANY task by UUID with **zero ownership check**, including the full free-text `taskDescription` (≤2000 chars) — a trainer can read any other trainer's task body by guessing IDs.
- **Inconsistent scope predicates** — read=none, list=none, cancel=`requestedBy`-scoped. The operator model needs ONE consistent scope predicate across read/list/cancel.
- Fix shape: gate all three on `requestedBy===self` (trainer) / all (admin) + wire `ownOnly` into the list call. Cheap, independent of the bigger build.

## High-Stakes Risks (for chromie + triangle fusion to scrutinize)
1. **Multi-tenant scoping (core net-new work):** RBAC is role-based, not resource-based — answers "can a trainer run this command type?" but NOT "may THIS trainer touch THIS client?". `checkTrainerClientRelationship` (`authMiddleware.mjs:610-703`) exists but is NOT wired to Hermes or the command lane. Turning role-gating into resource-scoped gating IS the build.
2. **Half-enforced auth window:** editing `cmd.roleRequired` grants the command but not the resource boundary; scope must be a hard fail-closed gate BEFORE dispatch, with a failing→passing test for the unassigned-client 403.
3. **clientId-source mismatch:** `checkTrainerClientRelationship` reads `req.params/body.clientId`, but the command lane uses `selectedClientId` → reusing the middleware verbatim silently NaN-fails (deny-all) or fail-opens. A NEW scope guard reading the operator's actual client-ref is required.
4. **Free-text PII (Rule 8 non-negotiable):** `deIdentifyService` only strips KNOWN structured paths + email/phone/SSN regex — it does NOT catch names in free-text (a `taskDescription`/`notes` field). Any operator free-text reaching an LLM needs `piiSanitizationMiddleware` (name-context redaction), which is NOT mounted on hermesRoutes.
5. **Hermes tasks have no `clientId`:** can't scope-by-assigned-client until a clientId field is added (schema change) — so "tasks I created" is the only viable v1 Hermes scope.
6. **Kill-switch granularity:** global `AI_COMMANDS_ENABLED` is all-or-nothing → can't pause a misbehaving operator without killing public Swan Coach chat. Needs a separate operator kill-switch + per-operator revoke.
7. **Audit + persistence:** manual REST operator writes only hit ephemeral logger; Hermes queue isn't persisted (lost on deploy). Multi-operator B2B2C needs a durable queryable who-did-what-to-which-client trail.
8. **Money/outbound side-effects:** operator actions can deduct credits, trigger Stripe refunds, send client SMS/email — must reuse canonical transactional services, never re-implement; enumerate side-effecting dispatchers before granting categories.
9. **Boundary confusion:** must NOT pull the Pi-bridge's shell/file/coding tools into the multi-tenant in-app layer.

## Suggestions & Enhancements (Phase 2 — grill-me's recommendations)
_Advisory — Sean accepts/modifies/rejects each._

**v1 build deltas to confirm (from the pipeline-map BUILD-NEW list, filtered for admin+self v1):**
1. **Edit-before-confirm of parsed sets/reps** — STRONG yes (data-truth: fix a misparse before it becomes a logged chart point). Edits must flow through `parsedWorkoutToLogPayload` to the writer, not be silently dropped (risk #8).
2. **Surface parser confidence** (computed but hidden) — show it on the draft; flag <~0.75 for "please double-check." Builds trust for self-users new to voice-logging. Yes.
3. **Billing clarity in confirm** — for the **self path, logging your own workout does NOT deduct training-session credits** (credits = trainer-led package sessions) → show "this won't use a session." For admin/trainer logging a CLIENT, show credit/session impact pre-confirm (risk #9).
4. **Per-user voice-log quota counter + AI-cost telemetry** (Q5) — required for the paid gate; reuse the storage/cost-meter UI pattern just shipped for the Content Studio (an "AI usage this month" meter).
5. **Append-only operator audit row** (actor + before/after + outcome + confidence) — build now even for admin+self; it's the seam trainer v1.1 needs (risk #5).
6. **Defense-in-depth assignment re-check inside `submitAiWorkoutLogAsDailyForm`** — build the seam now (no-op for self/admin), load-bearing for trainer v1.1 (delta #4 / risk #1).
7. **Notify = POLL for v1** — real-time "draft ready / logged" SSE is gated on the still-pending B1b SSE Render flag; don't design assuming SSE is live.
8. **redactTranscriptPII() + consent gate + ZDR + draft-purge** (Q4) — non-negotiable, lands in v1.

**Features needed but not yet planned (tied to the loop/strategy, rule 62):**
- **The self path IS a retention wedge for the user dashboard**, not a side feature: "tap mic → say what you did → it's logged + on your chart" makes the Product Core Loop (log→chart→next-action) frictionless. This is the strongest argument for the user-dashboard mount + the Crystalline upsell.
- **Consent + privacy as a product surface** (rule 62): one-time consent + a visible "voice is processed by AI" indicator + an easy data-delete. Trust is a feature.
- **The locked-overlay value preview** (free tier) should show a *demo* of a sample clip parsing into a draft — sell the magic without incurring AI cost.
- **Review-draft shows transcript + parsed result side by side** — trust surface, especially for first-time self-users.

## Minimal-Click Opportunities
- **Self-user workout log:** today ≈ open logger → manually add each exercise/set/reps (~10-20+ taps for a full session). After: **tap mic → speak → review → confirm ≈ 2-3 taps.** The headline win.
- **Admin/trainer client log:** today = navigate to client → open logger → manual entry. After: **pick client → drop Plaud clip → confirm.**
- **Reuse already-selected context:** if the operator is already on a client's (or their own) page, inherit that as the target — zero extra "pick who" clicks.
- **One-tap confirm** when confidence is high; only force a review step when confidence is low.

## Open Flags
- [x] Terrain-map workflow results folded into Architecture Notes (8-agent map `w7eyscb64`).
- [ ] Q1 (what "MCP/tool layer" means concretely) — ASKED, awaiting Sean.
- [ ] Are independent platform trainers real users NOW, or near-term it's admin-Sean + Move-Fitness onboarding? (changes whether multi-tenant isolation is today-need vs 6-month-need) — repo can't answer.
- [ ] Free-text-PII rule (Rule 8): non-negotiable constraint on any chosen design — flag for chromie/fusion.
- [ ] Greenlight on patching the verified live Hermes IDOR independently (see Verified live security issues) — awaiting Sean.
- [ ] Operator-action audit retention/query dimensions (compliance/minors-data sensitivity) — legal/business input.
