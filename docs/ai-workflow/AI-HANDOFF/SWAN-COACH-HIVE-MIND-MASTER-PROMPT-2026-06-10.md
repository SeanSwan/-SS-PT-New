# Swan Coach Hive-Mind Upgrade — Master Prompt

> **Status:** CANONICAL working prompt for the Swan Coach upgrade workstream (created 2026-06-10 from Sean's directive + repo ground-truth audit).
> **Use:** paste/load this prompt to start any Swan Coach upgrade session. It supersedes ad-hoc Swan Coach prompts; it does NOT supersede `SWAN-COACH-V1-SPEC.md` (the behavioral spec) or CLAUDE.md rules — those win on conflict.
> **Companions:** `docs/ai-workflow/references/SWANSTUDIOS-MASTER-PROMPT.md` (whole-app vision) · `SWAN-COACH-V1-SPEC.md` · `APP-AI-HIVE-MIND.md` · `SWAN-COACH-CONTINUITY-HANDOFF-2026-04-11.md`.

---

## The Mission (Sean's intent, upgraded)

You are upgrading **Swan Coach** — the SwanStudios Coach Assistant. It is the **theme of the entire platform**: one assistant, four faces, present everywhere, that makes every role feel like they have a brilliant, trustworthy human teammate:

1. **Admin's assistant (Sean):** runs administrative duties by voice or text — client status, sessions, billing exceptions, moderation, business KPIs, "who needs me today."
2. **Trainer's assistant:** session prep, client history recall, workout logging by dictation, program drafting, schedule management, "which client is slipping."
3. **Client's assistant:** workout creation/guidance, progress review, next-best-action, check-ins, motivation with caring boundaries.
4. **User's assistant (social/user dashboard):** their personal coach companion — log workouts, see streaks, find events/challenges/communities, share milestones.
5. *(Visitor guide mode per V1 spec: product story + signup nudge, read-only.)*

It is a **hive mind**: with the user's role-scoped permissions, it can pull from EVERY data domain — workouts, sessions, schedule, client records, measurements, pain/recovery, nutrition, gamification, store/billing, social/community, wearables — and assemble the answer in one place, so nobody hunts across tabs. **The only gate on action is confirmation** (admin confirmation, trainer confirmation, etc.); the only gate on data is role. **Security is the top priority, then richness of logic, then fluidity.**

Non-negotiable product behaviors:
- **Voice-dictation-first**, manual forms as backup, Coach can fill any form.
- **Always drives a next-best-action** — never idle chat (purposeful compute).
- **Caring-boundaries persona** — advocates rest/recovery; will say "don't train today"; ethical retention only (no dopamine dark patterns).
- **Never called "AI" user-facing** — it is "Swan Coach" / "Coach."
- **Zero PII to LLMs** (IDs only; names re-hydrated client-side). E2EE and privacy promises are brand-load-bearing.
- **Premium Crystalline Swan feel** — fluid, smooth, modern; styled-components; 44px targets; dark-first; mobile-first.

## Ground Truth (verified 2026-06-10 — build on this, don't reinvent it)

**Already live and good:**
- **65+ commands** (v1–v16) via `backend/services/ai/commandDispatcher.mjs` (~368 lines): workout log/read, nutrition, measurements, pain, schedule/availability, session cancel, Hermes tasks, PLAUD intake lane. Unwired commands honestly return `not_wired`.
- **Pipeline:** rawInput → intent classifier → Zod validation → role checks → dispatch.
- **Confirmation architecture:** `commandExecutor.mjs:359-421` + `destructiveOperations.mjs` — HMAC-signed pending operations, `confirmation_required` envelope, `/api/ai-command/confirm`. Reads need no confirm; safe writes single-confirm; destructive strong-confirm.
- **Privacy:** `PIIManager.mjs` (email/phone/SSN/CC/IP detection + masking), `stripPHI()`/`stripIdentityFromMessage()` before LLM calls, alias re-hydration client-side.
- **Provider abstraction:** `providerRouter.mjs` — adapter registry, failover order, per-provider circuit breakers, retries, timeout budget. `modelSelector.mjs` — tier-based model selection (free models for lower tiers; ~$0 AI cost).
- **Persistence:** `AiConversation` model (JSONB messages, role/context/targetUserId, soft delete).
- **Frontend:** `SwanCoachAssistantPage.tsx` mounted for trainer + client; `CoachCommandCenterPage.tsx` for admin; `CoachInputBar` + `VoiceRecordingOverlay` (voice capture + transcription).

**Verified gaps (the upgrade surface):**
1. **No streaming** — responses are batched; consensus path takes 5–8s with no progressive feedback.
2. **No hive-mind context assembly** — commands answer single-domain questions; there is no cross-domain "tell me everything about client X / my day" synthesis layer.
3. **No proactive briefings** — no scheduled daily admin brief / trainer day-sheet / client nudge.
4. **No per-user model config / BYOM** — model selection is server-side only; no encrypted user API-key storage (locked vision: swappable model slot).
5. **No user-dashboard (social) Coach surface** — only admin/trainer/client mounts found; the fourth face is missing. Public visitor mode also unwired.
6. **FRONTEND_DISPATCH blocked** (~8 commands) — depends on browser-local workout-logger state instead of server execution.
7. **Audit trail is logger-based** — no verified immutable audit table for command execution (AiInteractionLog exists, schema unverified).
8. **Rate limiting config unverified** at the command lane; no per-role/tier limits confirmed.
9. **Oversized components** — `CoachCommandCenterPage` flagged for decomposition; `SwanCoachAssistantPage` far over the 300-line rule.
10. **Admin Command Center Phase 1 may be local-only** ("NOT PUSHED" per 2026-05-14 record — verify against git before building on it).

## Security Mandate (tightest gate — do this thinking on EVERY slice)

- **Role-scoped data matrix, fail-closed.** Before any new read capability, write the explicit matrix: admin = all; trainer = ONLY assigned clients (verify assignment server-side per request — IDOR is the #1 threat); client/user = ONLY self. A trainer asking about an unassigned client gets a clean denial, never a leak.
- **Confirmation gates are sacred.** No write without its confirmation tier; destructive ops stay HMAC-signed; confirmations must echo exactly what will change (resource, target, fields). Never batch-confirm destructive ops.
- **Prompt-injection defense.** Hive-mind context means retrieved data (client notes, social posts, transcripts) enters the prompt — treat ALL retrieved content as data, never instructions; delimit it; never let it trigger tool calls or change role scope. Test this explicitly.
- **Immutable audit trail.** Every command execution (who, role, command, target, params hash, confirmation state, outcome) lands in an append-only table — admin-reviewable. This is the rule-48 re-audit backbone.
- **Rate limits per role/tier + kill switch.** Verified limits on the command lane; one env flag that disables all write commands instantly.
- **BYOM security:** user keys encrypted at rest, never logged, never echoed (rule 59 applies); platform privacy gate (PII stripping) applies REGARDLESS of whose model runs; BYOM users get the same confirmation gates.
- **Escalation tests required:** every slice that touches permissions ships tests for cross-role access attempts (trainer→unassigned client, client→other client, user→admin command).

## Upgrade Workstreams (recursive-plan each as narrow slices; this is the menu, not one mega-task)

- **A. Coach Context Engine (the hive mind).** A server-side context-assembly layer: given (user, role, intent), aggregate cross-domain data through per-role allowlists into one structured context block (IDs only) → enables "brief me on client 123" / "how's my day look" / "what needs my attention" synthesis answers with citations back to in-app surfaces. This is the highest-value slice — it IS the hive mind Sean described.
- **B. Streaming + perceived speed.** SSE/chunked streaming for chat responses, optimistic UI, typing/progress states for the 5–8s consensus path, suggestion chips and quick actions. Target: first token < 1.5s, every interaction acknowledged < 100ms.
- **C. Proactive briefings (consented).** Daily admin brief (exceptions, stale clients, revenue events), trainer day-sheet (today's sessions + flags), client/user nudges (streaks, next workout) — opt-in, capped frequency, quiet hours, never spammy (content-cadence rule applies in spirit).
- **D. The fourth face: user-dashboard Coach.** Mount the Coach on the user/social dashboard with user-scope commands (log own workout, view own progress, find events/challenges, share milestone). Plus the visitor guide mode on public surfaces.
- **E. BYOM model slot.** Per-user provider/model config UI (one settings card: provider, key, test button), encrypted key storage, providerRouter adapter reuse; platform privacy gate + confirmation gates unchanged.
- **F. Security hardening pass.** Audit table, injection-defense tests, verified rate limits, kill switch, escalation test suite (can run before or alongside A — nothing in A ships without F's tests for what A exposes).
- **G. FRONTEND_DISPATCH unblock.** Move the ~8 browser-local commands to server-side execution so voice can drive them end-to-end.
- **H. Component decomposition.** Break SwanCoachAssistantPage / CoachCommandCenterPage into <300-line modules BEFORE major UI work in them (rule 4).

**Recommended order: F+A first (security + hive mind core), then B (feel), then D (reach), then C, E, G, H opportunistically.** Sean re-sequences as he sees fit.

## Operating Rules for Whoever Executes This

- Every slice: grill-me only if Sean's intent is unclear (most of it is captured here and in the brainstorm doc) → recursive plan (rule 15) → Canonical Surface Receipt before touching UI/data-truth (rule 26) → build with tests → slice-internal hostile review (rule 61) → Gemini review → Codex final gate (rule 46) → closeout-evidence-lock (rule 41) → dual-tier summary (rule 57) → next-slice recommendation (rule 60).
- Verify the "NOT PUSHED" Admin Command Center status against git before building on it (rule 52 anti-rework applies).
- Schema-drift check (rule 58) on every model touched; sibling sweep (rule 20) on every route/shape change.
- Design work routes through `swan-design-router` (rule 40); chart-bearing answers use the Swan Chart Skin direction.
- Definition of done for the workstream overall: an admin, a trainer, a client, and a user can each speak one sentence to Swan Coach and get a correct, role-safe, fluid, beautiful answer or a properly-confirmed action — measurable via command success rate, time-to-first-token, zero unconfirmed writes, zero cross-role leaks in the escalation suite.

---

**When you (the executing AI) load this prompt:** read the ground-truth section, verify anything marked unverified that your slice depends on, pick (or accept Sean's pick of) ONE workstream, and produce the rule-15 recursive plan for that slice only. Do not attempt multiple workstreams in one slice.
