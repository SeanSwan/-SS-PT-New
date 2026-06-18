# SwanStudios — Beta-Readiness Hostile Audit + Codex Fix Handoff (2026-06-16)

**Producer:** Claude (Opus 4.8, VS Code session) · **For:** Codex (hostile reviewer + fixer) · **Owner:** Sean
**Baseline:** `origin/main` @ `44c37d47f` · prod smoke today `npm run qa:smoke:prod` = 61 pass / 3 skip vs https://sswanstudios.com
**Status:** AUDIT COMPLETE. No code changed by this audit (read-only). This doc is the handoff so Codex can make the recommended fixes.

---

## 0. READ THIS FIRST — live-coordination warnings (Rule 67 + Rule 42)

- **The working tree is shared and was actively churning during this audit.** Codex was editing Coach files; another Claude session ("Claude-A") was editing backend automation files *while the audit ran*. Re-read `.ai-workflow/coordination/claude.lane.md` + `codex.lane.md` before touching anything.
- **P0-2 below is Claude-A's ACTIVE in-flight WIP** (`automationArmState.mjs` + `automationService.mjs`). **Do NOT seize `automationService.mjs` without coordinating** (Rule 67 R1 read-before-edit / R5 staleness). Either let Claude-A finish and hostile-review it, or claim it via `review-queue.md` first. The fix spec is included so whoever finishes it does it right.
- **Never `git add -A`** (Rule 67 R6) — the tree has multi-lane WIP + an untracked backend module that crashes Render if partially committed (see P0-2). Stage explicit paths only.
- **Rule 42 (mandatory before ANY backend push):** run both
  `git ls-files --others --exclude-standard backend/` and `git diff --name-only HEAD backend/`
  and commit/verify everything they surface. An untracked module imported by committed code = `ERR_MODULE_NOT_FOUND` boot crash on Render.
- **Privacy (Rule 8):** IDs/roles only in any doc/commit. No client names/PII.

## 1. How this audit was produced (evidence base)

6 parallel independent deep auditors (each its own agent/context — real cross-checking) + live `git` reconciliation:
1. Auth / RBAC / Coach-write-safety / PII-to-LLM
2. Payments / checkout / session-credit / Stripe Tax / fulfillment / stock
3. Marketing automation outward-sends (cron / SMS / suppression / opt-out / nurture)
4. Onboarding / signup→role→waiver / Move Fitness import readiness
5. Data-truth: charts-from-real-logs + Progress-Proof share loop
6. Production QA coverage + dirty-tree / Rule-42 hygiene

Fusion cross-check: Tier-3 Village aborted on cost cap (no spend, Sean's call); Tier-2 triangle CLIs failed to synthesize this run (`claude -p` timeout, Gemini Pro throttled, Codex busy). Ratification was a Claude cross-lens self-review. **All findings below carry file:line.** Confidence tags: `[VERIFIED]` = confirmed by file read; `[GAP]` = feature absent; `[HYPOTHESIS]` = needs probe.

---

## 2. FINDINGS + FIX SPECS (severity order)

### 🔴 P0-1 · Admin SMS paths bypass the `SWAN_AUTOMATION_CRON_ENABLED` kill switch — `[VERIFIED, SHIPPED]`
The env flag gates only the cron *scheduler*. These live admin endpoints send real Twilio SMS regardless:
- `backend/routes/automationSafetyRoutes.mjs:98-100` → `automationService.processScheduledMessages()` (runs the queue through suppression, but still sends).
- `backend/routes/smsRoutes.mjs:44-51` `POST /api/sms/send` and `:90-97` `/send-template` → **raw Twilio, NO suppression, NO opt-out, NO frequency cap.**
Admin-gated (not lead-exploitable), but the documented "kill switch" is not a true kill switch.
**FIX:** route every send through a single armed-gate (see P0-2's `isAutomationArmed()`), or gate each endpoint: return early/4xx when disarmed. The raw `/api/sms/send*` routes must also pass `resolveMarketingSuppression` + frequency cap before any send (or be removed if they're dev-only). **Invariant to enforce: "disarmed ⇒ zero outward delivery on every path."** TDD red-first: a test per path asserting zero Twilio calls when disarmed and when recipient is suppressed.

### 🔴 P0-2 · In-flight arm-guard is half-wired + a Rule-42 push hazard — `[VERIFIED, UNCOMMITTED WIP — Claude-A's lane]`
- `backend/services/automationArmState.mjs` (UNTRACKED) defines `isAutomationArmed(env) => env.SWAN_AUTOMATION_CRON_ENABLED === 'true'` — correct, default-OFF.
- `backend/services/automationService.mjs:13` imports it, **but `processScheduledMessages` (lines 204-269) does NOT call it** at the send chokepoint. The module's own docstring promises that guard; it isn't wired yet.
- Because `automationService.mjs` now imports the **untracked** `./automationArmState.mjs`, a partial commit (service without the new module) → Render boot crash.
**FIX (coordinate with Claude-A first):** (1) add `if (!isAutomationArmed()) return { skipped: 'disarmed', sent: 0 };` at the top of `processScheduledMessages`; (2) `git add` `automationArmState.mjs` together with the service in the SAME commit; (3) unit-test `automationArmState` (`'true'`→armed; `'1'`/`'TRUE'`/unset→disarmed) + a "disarmed ⇒ no send" test. This closes P0-1 and P0-2 together. **Do not push until Rule-42 checks are clean.**

### 🟠 P1-1 · Waiver gate is cosmetic — `[VERIFIED]` — **re-graded P0 for the "invite a real human" action (legal)**
`frontend/src/routes/protected-route.tsx:183-274` and `backend/middleware/authMiddleware.mjs` `protect()` (~273-407) check JWT + role + `isActive` ONLY. Waiver status lives unread in `backend/models/WaiverRecord.mjs` (`status` enum); `backend/models/User.mjs:304` `isOnboardingComplete` is never enforced. A real client can train/log/use AI with **no signed liability/AI/media waiver** → legal exposure (in-person, possibly minors).
**FIX:** add a server-side gate (new middleware or extend `protect`) that blocks training-write + AI + dashboard routes until the user's `WaiverRecord.status === 'signed'` (verify the exact signed-enum value in the model). Mirror in `protected-route.tsx`. **Decision for Sean:** gate ALL authed routes, or just training-write + AI routes (lighter). TDD red-first: unsigned user → 403 on a gated route.

### 🟠 P1-2 · `ADMIN_ACCESS_CODE` is the only thing gating self-registration as **admin** — `[VERIFIED]`
`backend/controllers/authController.mjs:265` `PUBLIC_SELF_REGISTRATION_ROLES` includes `'admin'` (code-gated at `:536-557`). No startup guard asserts the code; example `admin-access-code-123` ships in `scripts/deployment/RENDER-ENV-VARIABLES-CHECKLIST.txt:19`. If prod uses the example, anyone reading the public repo can self-register as admin.
**FIX:** (a) **Sean ops:** verify the live Render `ADMIN_ACCESS_CODE` is high-entropy + rotated (not the example). (b) **Codex code:** add a startup assertion (fail-closed) that `ADMIN_ACCESS_CODE` is set, ≥ N chars, and not equal to the example string — in `backend/core/startup.mjs` next to the existing JWT/DB guards.

### 🟠 P1-3 · Suppression is email-keyed only; phone STOP not honored at send time — `[VERIFIED]`
`backend/services/marketingSuppressionService.mjs:22-32` matches `Subscriber.email` only. A contact/checkout lead with a phone but no `Subscriber` row has no working app-level opt-out.
**FIX:** add phone-keyed suppression (Subscriber-by-phone or a `Lead` opt-out flag) and honor Twilio inbound STOP (webhook → persist opt-out). Check at SEND time inside `evaluateScheduledMessage`. Build fresh (do not assume a `checkFrequencyCap`-style helper exists — Gemini hallucinated one before).

### 🟠 P1-4 · No past-workout-history importer exists — `[GAP]` (feature, larger scope)
Only single-session upload (`backend/routes/workoutLogUploadRoutes.mjs`) + a planning panel (`frontend/.../HistoricalWorkoutImportPanel.tsx` writes a sessionStorage prompt, persists nothing). Sean's "add client → upload history → AI-fill missing as DRAFT → review → save" loop is not built.
**FIX:** separate build slice (not a quick patch). Reuse the existing **draft-only contract** (AI output never becomes a real logged session without explicit human approve — that plumbing is sound). Flag to Sean as its own phase before mass MF migration.

### 🟠 P1-5 · Hardcoded flat 8% product tax — `[VERIFIED]`
`backend/routes/v2PaymentRoutes.mjs:79` `PRODUCT_TAX_RATE = 0.08`; `automatic_tax.enabled: false` (~`:488-490`). Test-pinned, documented. Blocks BROAD physical sales (CA 7.25-10.25% by district). Does NOT block training (correctly untaxed) or a tiny supervised physical test.
**FIX:** switch to Stripe Tax (`automatic_tax.enabled: true`) — requires Stripe dashboard Tax config + CA nexus registration (**Sean ops**). Update the money-path test that pins 8%.

### 🟡 P2 (hardening before public)
- **P2-1** One-click critical permission grant, no confirm — `frontend/src/components/Admin/TrainerPermissionsManager.controller.ts:131-165`. Add a confirm step on `critical:true` permissions. Admin-only, not escalation.
- **P2-2** Client names in free-text chat reach the cloud LLM — `backend/middleware/piiSanitizationMiddleware.mjs:30-39` redacts SSN/email/phone but not general names; dictation/onboarding sends raw names to LLMs. Stored context IS de-identified. Add name redaction OR disclose in privacy policy before public.
- **P2-3** Dormant duplicate checkout route, NO guards — `backend/routes/cartRoutes.mjs:769` `POST /api/cart/checkout` (no tax/fulfillment/stock guard, no frontend caller). Remove or gate before broad physical sales (Rule 34: confirm with Sean before deleting).
- **P2-4** `createExternalClient` emails plaintext temp password AND issues a claim token — `backend/controllers/adminClientController.mjs:1826-1827`. Consolidate on the claim flow.
- **P2-5** Charts refresh on mount/nav only — `frontend/.../CanonicalProgressChartsGrid.tsx:47` has no `refetch`/`swan:workout-logged` listener. Staleness UX; data is always real, never fabricated. Add an event-driven refetch.
- **P2-6** QA smoke is public-surface-lean — `scripts/qa/playwright-smoke.mjs` (13 canonical specs, only 3 auth-aware; 1 of 3 skips conditionally drops client-dashboard Lens coverage). An untracked authenticated crawl exists: `frontend/e2e/mission/production-dashboard-crawl.mission.spec.ts` + a new `qa:dashboard-crawl:prod` script in `package.json` — wire it into the canonical run.

---

## 3. VERIFIED-SOLID — do NOT re-litigate (passed hostile review)
- RBAC fail-closed; IDOR closed on analytics/notes/workout (real assignment checks, 403+log on violation).
- **Coach "no hidden writes" TRUE:** writes are `roleRequired` (server-side) + `requiresConfirmation`; client mode blocks writes at the SERVER, not just UI; write kill-switch covers first-pass + confirm lanes.
- **Session-credit grant** idempotent (`SELECT ... FOR UPDATE` + `sessionsGranted` flag), atomic `increment`, server-authoritative; `verify-session` re-checks Stripe `payment_status==='paid'`. **Stripe webhook signature-verified** (raw body, env secret, fail-closed).
- **Price authority server-side** (DB-resolved, client price ignored). `/api/cart/add` mounted (historical 404 stale).
- **All charts query real DB tables** (`workout_sessions`/`workout_logs`/`body_measurements`); **Victory only, zero Recharts**; honest empty states for zero-workout clients; share-proof refuses empty/fabricated data + duplicate-share guard + waits for created post.
- Two-tier MF/SS clients + Crystalline Link claim flow exist + real; trainer-assignment data gating real; `ClientTrainerAssignment` schema-drift resolved.
- Cron scheduler genuinely fail-closed (`=== 'true'`); `test-send` well-gated (confirm + E.164 + known-template + owner allowlist); email channel inert/stubbed; `lead_nurture` seeded `isActive:false`; secrets env-sourced.

## 4. RECOMMENDED FIX ORDER (implementation sequence)
1. **Finish + freeze the arm-guard slice (P0-2 → P0-1)** — coordinate with Claude-A. Closes both P0s. Wire `isAutomationArmed()` into `processScheduledMessages` + the two admin send routes; stage `automationArmState.mjs`; TDD "disarmed ⇒ zero delivery"; Rule-42 clean before push.
2. **Verify `ADMIN_ACCESS_CODE` on Render (P1-2)** — Sean ops, 5 min. Codex adds the startup assertion.
3. **Waiver = real server gate (P1-1)** — block training/AI/dashboard until signed.
4. **Phone/STOP suppression (P1-3)** before arming any automation.
5. **MF history importer (P1-4)** — separate build slice, draft-only.
6. **Stripe Tax + remove dormant route (P1-5, P2-3)** — gate before broad physical sale.
7. **Wire authenticated transaction smoke (P2-6)**; then P2 polish (P2-1/2/4/5).

## 5. EXECUTIVE VERDICT MATRIX (ratified)
| Surface | Verdict |
|---|---|
| Sean tests alone | 🟢 GO now |
| Invite trusted / MF clients | 🟡 CONDITIONAL — gated on P0-1, P1-1 (waiver), P1-2 (admin code), P0-2 frozen |
| Paid **session-package** sales (supervised) | 🟢 GO after 1 live test-checkout — packages only |
| **Subscription** billing | 🔴 NOT READY — UN-AUDITED (`subscriptionRoutes`/`/api/subscriptions/checkout` not reviewed) |
| Public promotion | 🔴 NOT READY |
| Physical product sales (broad) | 🔴 NOT READY — 8% tax + dormant route |

## 6. FILE INDEX (everything referenced)
**Backend — automation/SMS:** `backend/routes/automationSafetyRoutes.mjs`, `backend/routes/smsRoutes.mjs`, `backend/services/automationService.mjs`, `backend/services/automationArmState.mjs` (untracked), `backend/services/automationCron.mjs`, `backend/services/marketingSuppressionService.mjs`, `backend/services/automationDecisionService.mjs`
**Backend — auth/onboarding:** `backend/controllers/authController.mjs`, `backend/middleware/authMiddleware.mjs`, `backend/models/User.mjs`, `backend/models/WaiverRecord.mjs`, `backend/core/startup.mjs`, `backend/controllers/adminClientController.mjs`, `scripts/deployment/RENDER-ENV-VARIABLES-CHECKLIST.txt`
**Backend — payments:** `backend/routes/v2PaymentRoutes.mjs`, `backend/routes/cartRoutes.mjs`
**Backend — PII:** `backend/middleware/piiSanitizationMiddleware.mjs`
**Backend — import:** `backend/routes/workoutLogUploadRoutes.mjs`
**Frontend:** `frontend/src/routes/protected-route.tsx`, `frontend/src/components/Admin/TrainerPermissionsManager.controller.ts`, `frontend/.../HistoricalWorkoutImportPanel.tsx`, `frontend/.../CanonicalProgressChartsGrid.tsx`
**QA:** `scripts/qa/playwright-smoke.mjs`, `frontend/e2e/mission/production-dashboard-crawl.mission.spec.ts` (untracked), `package.json` (qa:dashboard-crawl:prod)
**Audit artifacts (gitignored / local):** `.ai-workflow/fusion/swan-readiness-findings.md`, `c:/tmp/village-readiness.out.txt`, `c:/tmp/triangle-ratify.out.txt`

## 7. DEFINITION OF DONE (per CLAUDE.md)
For each fix: TDD red-first regression test where feasible (Bugfix standard); verify the real caller path (dual-pass, Rule 17); Rule-42 pre-push checks; slice-internal hostile review before reporting (Rule 61); stage explicit paths only (Rule 67 R6); request mutual hostile review in `review-queue.md` (Rule 67 R7). Do NOT push without Sean's go. Coach files in the dirty tree belong to Codex's own Coach slice — keep them separate from these fixes.
