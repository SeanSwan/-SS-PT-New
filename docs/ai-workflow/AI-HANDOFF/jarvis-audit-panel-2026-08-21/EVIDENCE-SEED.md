# Grounded Evidence Seed — verified by Claude Opus 5 against origin/main @ 66ffde607

Every line below was read from source in a clean worktree at the exact commit the
audit names. Use it to hostile-review the audit that follows. Where the audit
contradicts this seed, the seed wins — it is file-read evidence.

## E1 — Confirmation IS server-issued and HMAC-signed (audit P0 #1 is WRONG)

`backend/routes/aiCommandRoutes.mjs:365-378`
```
router.post('/confirm', protect, aiCommandLaneKillSwitch, aiCommandRateLimiter, async (req,res)=>{
  const { operationId } = req.body;
  if (!operationId) return res.status(400)...
  const result = await executeConfirmedOperation(operationId, req.user, sequelize);
```
The route accepts ONLY an `operationId`. There is no `confirmation.confirmed`
boolean, no client-supplied params at confirm time.

Repo-wide grep for a client-authored confirmation boolean:
`grep -rn "confirmed === true|confirmation\.confirmed|req.body.confirmed" backend --include=*.mjs`
→ exactly ONE hit, and it is unrelated (`session.service.mjs:651`, a list filter
query param). **No such path exists in the command lane.**

`backend/services/ai/destructiveOperations.mjs` implements two-phase commit:
- `signOperation()` HMACs `{id,type,endpoint,commandType,params,createdBy}` (sha256)
- `verifySignature()` uses `crypto.timingSafeEqual`
- `OPERATION_TTL_SECONDS = 120` (expiry present)
- `retrievePendingConfirmation(operationId, userId)` is **actor-bound**
- one-time consumption: `pendingOps.delete(operationId)` on every retrieve path
  (lines 150, 171, 180, 251, 265, 281) → replay protected
- `MAX_AI_BULK_DELETE = 50`, `MAX_PENDING_PER_USER = 5`
- unscoped DELETE throws: requires id|clientId|userId|dateRange
- params are stored server-side at mint and cannot change after approval
- `executeConfirmedOperation` re-checks the write kill switch, so an op minted
  before the switch flipped will NOT execute after.

**Therefore the audit's headline P0 ("an authenticated caller could skip the
confirmation ceremony by posting confirmed:true") describes a vulnerability that
does not exist at this commit.**

## E2 — The REAL P0 the audit MISSED: ephemeral signing key + in-process store

`backend/services/ai/destructiveOperations.mjs:12`
```
const OPERATION_SECRET = process.env.OPERATION_SIGNING_KEY || crypto.randomBytes(32).toString('hex');
```
`:18` `const pendingOps = new Map();  // In-memory store (fallback when Redis is disabled — which it currently is in production)`

Consequences (all unaddressed by the audit):
- If `OPERATION_SIGNING_KEY` is unset in production, the HMAC secret is random
  **per process**. Every deploy/restart silently invalidates in-flight approvals.
- `pendingOps` is per-process. On >1 instance, mint-on-A / confirm-on-B fails.
  The failure is a confusing "Operation not found or already expired," not a
  security breach — but it makes the whole destructive-confirm lane
  non-deterministic under horizontal scale.
- The repo's OWN design doc requires the strict form:
  `AI-Village-Documentation/GOD-LEVEL-AI-UPGRADE-PROMPT-V3.md:599` declares
  `const OPERATION_SECRET = process.env.OPERATION_SIGNING_KEY;` (no fallback) and
  `:806` lists it in `REQUIRED_ENV`. The shipped code silently degrades instead.
- The audit flagged in-memory Maps ONLY for the transcription rate counter (P1).
  It missed that the same defect sits in the **security-critical approval store**.

## E3 — usePremiumTTS does NOT simulate (audit P1 is WRONG / stale)

`frontend/src/components/DashBoard/Pages/coach-assistant/hooks/usePremiumTTS.ts`
lines 130,133,141,154,170,171 use real `window.speechSynthesis` —
`getVoices()`, `speak(utterance)`, `cancel()`. Grep for
`simulat|setTimeout|disabled` in that file returns **no matches**.
The "premium TTS is disabled and simulates speaking duration with a timer" claim
is not true at 66ffde607.

## E4 — Capability truth report is PARTIALLY built already

`backend/services/ai/commandExecutionLane.mjs` classifies every command into
`server_dispatch | debate_async | manual_only | frontend_event | chat_fallback |
not_wired` — deterministic, dispatcher-driven.

`backend/tests/unit/commandRegistryCoverage.test.mjs` already **locks** it:
- test 1 asserts NO command falls into raw `not_wired`
- test 2 pins the exact lane membership and fails when a new undispatched
  command appears (its inline comment shows the lock has already caught drift)

So the audit's P1 "generate a capability truth report" should be re-scoped from
"build one" to "**promote the existing lane lock into a generated, versioned,
UI-consumed manifest**". Do not propose greenfield here.

## E5 — Registry count 134 is corroborated, and the drift is self-documented

`backend/services/ai/commandRegistry/index.mjs:6-12` states the per-category
counts "sum to 119 while the registries actually define 134 commands... two
commit messages cited the stale 119 before anyone counted."
The audit's 134 is right; the repo already knows its own doc drifts.

## E6 — CI claims CONFIRMED (both are real P0/P1)

`.github/workflows/ai-eval-gate.yml` — on push+PR to main, runs ONLY:
`npm run eval > ../ai-eval-report.json`. No tsc, no vitest, no frontend build,
no E2E, no secret scan. Four workflows total exist:
ai-eval-gate.yml, bodymap-validation.yml, docs-check.yml, swan-lens-guards.yml.

`gh api repos/SeanSwan/-SS-PT-New/branches/main` →
`{"protected": false, "required_checks":{"checks":[],"contexts":[],"enforcement_level":"off"}}`
**Branch protection is genuinely off. Nothing blocks a direct push to main.**
This is the audit's strongest and most actionable finding.

## E7 — Frontend dispatch allowlist is real

`coachFrontendDispatchClassifier.mjs` + `coachDispatchEligibilityService.mjs` +
`aiChatService.mjs` + `workoutCommands.mjs` carry the four events
(AI_ADD_EXERCISE, AI_LOAD_TEMPLATE, AI_UPDATE_SET, AI_TOGGLE_NASM_ITEM).
The audit's characterisation of narrow, workout-only UI authority is accurate.

## Your remit
Hostile-review the audit BELOW against this seed. Specifically:
1. Which audit findings are FALSE or stale (like E1/E3)? Name them.
2. Which are REAL and correctly severity-ranked?
3. What did the audit MISS that the seed exposes (E2) or that you can infer?
4. Is the proposed architecture (SwanRuntime / UI intent bus / event engine /
   memory tiers) right, over-engineered, or does it discard working code?
5. Give a corrected, dependency-ordered fix list with severity. Be concrete.
Do not restate the audit. Attack it.
