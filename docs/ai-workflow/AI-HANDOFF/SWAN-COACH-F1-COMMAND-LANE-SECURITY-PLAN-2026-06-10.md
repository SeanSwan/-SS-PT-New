# Swan Coach Slice F1 — Command-Lane Security Foundation (Recursive Plan, Phase A)

> **Status:** PLAN — awaiting Sean's approval gate (rule 15). No code written.
> **Parent prompt:** `SWAN-COACH-HIVE-MIND-MASTER-PROMPT-2026-06-10.md` (workstream F, first slice)
> **Planning tier:** Tier 1 (internal) complete. Security-critical → Tier 3 Village run is **Sean's call** (protocol table + rule 16).

## Scope (one slice, three cohesive pieces)

1. **Immutable command audit trail** — every Swan Coach command execution lands in an append-only DB table.
2. **Kill switch** — one env flag instantly blocks all write/destructive commands; a second blocks the whole command lane.
3. **Rate limiting on the command lane** — `/api/ai-command/*` currently has NO rate limiter (verified gap); apply one.

Explicitly NOT in F1 (deferred to F2+): escalation test suite expansion beyond the baseline, DB-level append-only triggers, admin audit-viewer UI, IDOR matrix re-verification of existing dispatchers.

## Ground truth this plan stands on (recon 2026-06-10)

- Pipeline: `backend/services/ai/commandExecutor.mjs` — 9 steps; RBAC at step 5 (line ~248); HMAC confirmation minting at step 8 (line ~360, `destructiveOperations.mjs`); execution step 9 (line ~441); existing `[CommandAudit]` logger lines at 588-593 (logger-only, no DB).
- Registry metadata: every command declares `destructive`, `requiresConfirmation`, `roleRequired` (e.g. `workoutCommands.mjs:48-50`). **Write-command classification = `destructive || requiresConfirmation`** (per V1 spec: reads never need confirm).
- `AiInteractionLog` (`ai_interaction_logs`) exists but is an LLM-call log (provider/model/hashes) — different purpose; no command-lane writes found. We add a NEW table rather than overloading it.
- Routes: `core/routes.mjs:614` mounts `/api/ai-command`; endpoints `/execute` (:115), `/confirm` (:292), `/cancel` (:316), `/commands` (:339), `/health` (:367) — middleware is `protect` only, **no rate limiter** (aiRateLimiter is applied to aiChatRoutes only; per-user 3/min, 60/hr, global 60/min, userId-keyed, 35s lock timeout).
- Env-flag house pattern: `process.env.ENABLE_X === 'true'` (default OFF). A kill switch needs inverse semantics (default ON) — see decision D3.
- Migration house style: `.cjs`, `queryInterface.createTable`, snake_case table names. ⚠️ Recent examples FK to `'users'` (lowercase) — the **stale duplicate table** per the dual `users`/`"Users"` production gotcha. Our migration references `"Users"`.
- Backend tests: vitest, `backend/__tests__/*.test.mjs`.
- ⚠️ Local dev uses the production DB — the migration is real the moment it runs.

## Design decisions

### D1 — New model `AiCommandAuditLog` → table `ai_command_audit_logs`

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK autoincrement | |
| userId | INTEGER NOT NULL, FK → `"Users"`.id | the actor |
| userRole | VARCHAR(20) NOT NULL | role at execution time (don't rely on join later) |
| commandType | VARCHAR(100) NOT NULL | registry key |
| targetClientId | INTEGER NULL | resolvedClient.id when present |
| destructive | BOOLEAN NOT NULL DEFAULT false | from registry |
| requiresConfirmation | BOOLEAN NOT NULL DEFAULT false | from registry |
| confirmationState | VARCHAR(20) NOT NULL DEFAULT 'none' | none / pending / confirmed / cancelled |
| operationId | VARCHAR(64) NULL | HMAC pending-op id |
| outcome | VARCHAR(30) NOT NULL | success / failed / denied / not_wired / confirmation_required / cancelled / blocked_killswitch |
| errorCode | VARCHAR(100) NULL | |
| paramsHash | VARCHAR(64) NULL | SHA-256 of canonicalized params JSON |
| paramsRedacted | JSONB NULL | params AFTER PIIManager masking — see D2 |
| durationMs | INTEGER NULL | |
| createdAt | TIMESTAMPTZ NOT NULL | **no updatedAt — append-only** |

Indexes: (userId, createdAt), commandType, outcome, targetClientId.
Append-only enforcement (code level): model defines `beforeUpdate`/`beforeDestroy`/`beforeBulkUpdate`/`beforeBulkDestroy` hooks that THROW; `timestamps: { updatedAt: false }`. DB-level trigger deferred to F2 (documented limitation).

### D2 — What gets stored from params (privacy tradeoff — Sean may override)
- **Chosen:** `paramsHash` (integrity/forensic matching) + `paramsRedacted` = params run through the existing `PIIManager` masking (emails/phones/SSN/CC/IP) **plus** removal of free-text fields over 200 chars (transcript-class content stays out of the audit table).
- Rejected alternative A (raw params): forensic gold but guarantees PII-in-audit-table eventually — violates the privacy posture.
- Rejected alternative B (hash only): maximally safe but an audit row you can't interpret is a weak audit.
- Residual risk (flagged): client first names inside structured params may survive PIIManager pattern masking. Mitigation: audit table is admin-only, server-side, never sent to any LLM. Revisit in F2 with field-allowlist redaction per command schema.

### D3 — Kill switches (two levels, fail-safe semantics)
- `AI_COMMAND_WRITES_DISABLED === 'true'` → at a new step 4.5 in commandExecutor (after validate, before RBAC), any command with `destructive || requiresConfirmation` returns `{ type: 'blocked', message: 'Coach actions are temporarily paused by the administrator. Read-only questions still work.' }` + audit row `blocked_killswitch`. Reads continue.
- `AI_COMMANDS_DISABLED === 'true'` → `/execute` and `/confirm` return 503 envelope before the pipeline runs (route-level guard).
- Deliberate divergence from the `ENABLE_X === 'true'` house pattern (default-OFF would dark-launch a production outage). `_DISABLED === 'true'` means: absent/typo'd env = commands stay ON; setting the flag is the explicit emergency action. Both flags documented in `.env.example` + BUILD-HARDENING note.
- `/confirm` honors the write kill switch too (a pending op minted before the switch flips must NOT execute after).

### D4 — Audit write points + failure policy
One helper `recordCommandAudit(ctx, outcome, extras)` called at: step-5 RBAC denial; step-8 confirmation minting (`confirmation_required`, `confirmationState: 'pending'`); step-9 success/failed/not_wired; confirmed-op execution success/failure (`confirmationState: 'confirmed'`); `/cancel` (`cancelled`); kill-switch block.
**Failure policy:** best-effort — an audit INSERT failure never blocks or rolls back the user's command; it logs `logger.error('[CommandAudit] AUDIT WRITE FAILED', …)`. Tradeoff documented: fail-closed auditing (block command if audit fails) is stronger but turns a DB blip into a full Coach outage; revisit for destructive ops in F2.

### D5 — Rate limiting the command lane
- Apply a dedicated limiter to POST `/execute` and POST `/confirm`: per-user **10/min**, **120/hr** (chat's 3/min would choke voice-driven rapid logging), env-overridable (`AI_COMMAND_RATE_PER_MINUTE`, `AI_COMMAND_RATE_PER_HOUR`). Reuse `aiRateLimiter`'s mechanism — parameterize if its shape allows, else a sibling `aiCommandRateLimiter.mjs` following the same in-memory pattern. 429 + clean envelope on trip; rate-limited requests get an audit row only if cheap to add (optional, not a gate).
- `/commands` + `/health` reads stay unlimited (auth-gated already).

### D6 — Migration
`.cjs`, additive `createTable('ai_command_audit_logs', …)`, FK `references: { model: 'Users', key: 'id' }` (NOT lowercase `users`), indexes as D1, full `down()` dropping the table. Pre-flight (rule 58): `information_schema` check that `"Users"` exists as expected and the new table name is free.

## Files touched (estimate)
- NEW `backend/models/AiCommandAuditLog.mjs` (~90 lines) + registration in models index/associations
- NEW `backend/migrations/2026061X-create-ai-command-audit-logs.cjs` (~80 lines)
- NEW `backend/services/ai/commandAudit.mjs` (~80 lines — helper + redaction)
- EDIT `backend/services/ai/commandExecutor.mjs` (+~40 lines: step 4.5 kill switch, audit calls)
- EDIT `backend/routes/aiCommandRoutes.mjs` (+~15 lines: lane kill switch, rate limiter on execute/confirm)
- NEW/EDIT rate limiter (`backend/middleware/aiCommandRateLimiter.mjs` ~60 lines OR parameterized reuse)
- NEW `backend/__tests__/commandAudit.test.mjs`, `commandKillSwitch.test.mjs`, `aiCommandRateLimiter.test.mjs`
- EDIT `.env.example` (3 flags + 2 rate vars, no values that look like secrets)

## Test plan (vitest, written first where feasible per the bugfix/TDD standard)
1. Audit rows: success, failure, RBAC denial, confirmation_required→confirmed chain (same operationId across two rows), not_wired.
2. Append-only: `update()`/`destroy()`/bulk variants on the model throw.
3. Redaction: params containing an email/phone/long transcript field → masked/stripped in `paramsRedacted`; `paramsHash` stable.
4. Kill switch: writes blocked + read command passes + `/confirm` blocked while flag set; flag unset → normal; route-level switch returns 503.
5. Rate limiter: request N+1 within window → 429; window reset works; `/commands` unaffected.
6. Escalation baseline: trainer calling an admin-only command → denied AND audited with outcome `denied`.
7. Regression: existing command-lane tests still pass (`cd backend && npx vitest run __tests__/<command-lane files>`).

## Rollback plan
- Code: single revert commit (slice is one commit).
- DB: `down()` migration drops `ai_command_audit_logs` (additive table, no other writers).
- Behavior: both kill-switch flags simply unset; rate-limit envs revert to defaults.

## Verification before "done" (rule 61 hostile pass targets)
- Race: confirm-after-kill-switch-flip is blocked (test 4).
- Audit helper never throws into the pipeline (wrap + test).
- No PII reaches logs/audit beyond D2's documented residual.
- Migration FK actually points at `"Users"` (inspect after run, rule 58 step 3).
- Rule 42 pre-push backend audit (untracked + modified-uncommitted) before any push.

## Open questions for Sean (the rule-15 gate)
1. **D2 params storage** — OK with redacted-params + hash (recommended), or hash-only (stricter)?
2. **D4 failure policy** — best-effort audit (recommended) vs fail-closed for destructive ops?
3. **D5 numbers** — 10/min + 120/hr per user OK?
4. **Village run?** — protocol marks security-critical changes as Tier-3 candidates (~$0.33, needs your explicit OK). My take: this slice is well-bounded and the 3-brain review (Gemini → Codex) at build time covers it; Village is justifiable but optional here.
5. Anything you can think of to add? (If nothing — plan locks and build starts.)
