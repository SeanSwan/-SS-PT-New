# Swan Coach Slice A1 — Coach Context Engine Core (Recursive Plan, Phase A)

> **Status:** PLAN — awaiting Sean's rule-15 gate. No code written.
> **Parent prompt:** `SWAN-COACH-HIVE-MIND-MASTER-PROMPT-2026-06-10.md` (workstream A, first slice)
> **Depends on:** Slice F1 (shipped `a090de2af`) — every new command this slice adds is automatically audited + kill-switchable.

## What this is (plain English)

The hive mind's read layer. One server-side engine that, given WHO is asking (role) and WHAT about (a client, or "my day"), pulls from every relevant data domain — workouts, schedule, measurements, pain, nutrition, gamification, session credits — through role-scoped permission gates, de-identifies it, and returns one structured context block. First consumer: a new `brief_client` Coach command ("brief me on client 123") for admin/trainer.

## Ground truth (recon 2026-06-10, file:line verified by agent)

- **An assembly pattern already exists:** `debate/debateClientContextService.mjs:18-102` builds cross-domain client context (profile, pain, last-5 workouts, 7-day macros, goals) via `Promise.allSettled` with per-domain graceful failure, then de-identifies. The engine generalizes THIS proven pattern — not a from-scratch invention.
- **De-identification API is complete:** `deIdentifier.mjs:42-87` — `deIdentifyClient(client, enrichment)` → `{ deIdentified, aliasMap }`; names→`Client-{id}`; `rehydrateResponse(text, aliasMap)` server-side only.
- **8+ per-domain read dispatchers exist** (workoutReadDispatchers, sessionDispatchers, measurementDispatchers, painDispatchers, nutritionDispatchers, gamificationCommandDispatchers, clientProfileReadDispatcher, availabilityDispatchers) — the engine composes them, it does not reimplement reads.
- **⚠️ SECURITY FINDING:** trainer→client authorization is inconsistent. `trainingSessionRoutes.mjs:290,364` checks `session.trainerId !== req.user.id` (implicit). `aiChatRoutes.mjs:530-546` does a SOFT check — logs a warning when no trainer↔client relationship is found but **does NOT reject** (comment says "allows for newly assigned trainers"). `ClientTrainerAssignment` model exists with status tracking but is not consulted on the read-critical path. `[VERIFIED via recon agent; re-verify lines before coding]`

## Design

### D1 — `backend/services/ai/contextEngine/coachContextEngine.mjs`
`buildCoachContext({ user, targetClientId, domains, sequelize })` →
`{ ok, context, aliasMap, dataQuality: [{domain, status}], deniedReason? }`

- **Fail-closed authorization FIRST**, before any data loads (D2).
- Domain loaders run `Promise.allSettled`; a failing domain yields `dataQuality: degraded`, never a thrown error.
- Output is de-identified (IDs/aliases only) — safe to hand to any model, including future BYOM.
- Domain set v1: profile+credits, workouts (last 5 + streak), today/week schedule, latest measurements + trend, active pain, 7-day macros, gamification (XP/streak). Each domain ≤ a bounded N rows (token discipline).

### D2 — Canonical authorization helper `assertClientAccess(user, targetClientId, sequelize)`
- admin → allow any client.
- trainer → allow ONLY when an active `ClientTrainerAssignment` exists (status `active`; `pending` configurable, see Q2) OR the trainer owns a session with that client (the existing implicit pattern, kept as fallback for legacy assignments).
- client/user → allow only `targetClientId === user.id`.
- Everything else → deny with a clean reason. **No data loads before this passes.**
- Exported for reuse — future slices migrate other surfaces onto it.

### D3 — First consumer: `brief_client` command
- Registry entry: read-only (`destructive: false`, `requiresConfirmation: false`), `roleRequired: ['admin','trainer']`, `requiresClientRef: true`.
- Dispatcher calls the engine, formats a structured brief (sections: status, recent training, schedule, flags: pain/stale/credits-low) — next-best-action oriented, not a data dump.
- Rides F1 rails for free: audited in `ai_command_audit_logs`, kill-switchable, rate-limited.

### D4 — Chat-lane soft-RBAC hardening (the recon finding)
- Replace the warn-and-continue block at `aiChatRoutes.mjs:530-546` with `assertClientAccess` (fail-closed).
- Mitigation for the "newly assigned trainer" case it was protecting: `assertClientAccess` accepts `active` assignments — a new assignment row exists by the time a trainer legitimately works a client. Escape hatch env flag `AI_CHAT_CLIENT_ACCESS_SOFT=true` restores old behavior if a real workflow breaks (default: hard).

## Files (estimate)
- NEW `backend/services/ai/contextEngine/coachContextEngine.mjs` (~250 lines)
- NEW `backend/services/ai/contextEngine/clientAccess.mjs` (~80 lines — D2 helper)
- NEW registry entry + dispatcher for `brief_client` (~120 lines, follows existing dispatcher house style)
- EDIT `aiChatRoutes.mjs` (~15 lines — D4 swap)
- NEW tests: `coachContextEngine.test.mjs`, `clientAccess.test.mjs`, `briefClientCommand.test.mjs`

## Test plan (vitest; authorization matrix is the heart)
1. clientAccess: admin→any ✓; trainer→assigned ✓; trainer→unassigned ✗; trainer→session-fallback ✓; client→self ✓; client→other ✗; user→other ✗.
2. Engine: denied access loads ZERO domains (spy on loaders); failing domain → degraded not fatal; output contains no names/emails (feed a fake client with PII, assert absent).
3. brief_client: end-to-end through the pipeline mocks (role gate, audit row written with `commandType: 'brief_client'`).
4. Chat-lane hardening: unassigned trainer now 403s; soft-flag env restores legacy; existing aiChat tests still pass.
5. Regression: F1 suites + existing command/chat suites.

## Rollback
- Code: single revert commit. No migration in this slice (no new tables). `AI_CHAT_CLIENT_ACCESS_SOFT=true` instantly restores legacy chat behavior without a deploy revert.

## Open questions (rule-15 gate)
1. **Q1 scope:** D1+D2+D3 (engine + brief_client) AND D4 (chat hardening) in one slice, or split D4 out? **Recommended: include D4** — shipping a hive-mind read layer while the chat lane has a known soft gate would be backwards.
2. **Q2 assignments:** should `pending` ClientTrainerAssignment status grant read access? **Recommended: no** — `active` only; pending grants nothing until accepted.
3. **Q3 review:** same chain as F1 (build → tests → hostile review → Gemini → your call on Codex)?
