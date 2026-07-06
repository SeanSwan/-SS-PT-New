# Client Billing / Account-Control Audit — Handoff & Remaining-Slice Roadmap

**Date:** 2026-07-05
**Status of this slice:** ✅ SHIPPED to `main` → Render (backend account-control audit trail).
**Origin audit:** `docs/ai-workflow/AI-HANDOFF/CLIENTS-TEAM-COMMAND-CENTER-FABLE-AUDIT-2026-07-05.md` (§0 re-baseline, §8 turnkey recipes) — read that for the full Client Command Center picture.
**Reviewers:** Claude 15-round self-hostile-review loop + a parallel 10-lens pass (`9c005190b`) + Gemini design consult. Codex intentionally skipped per Sean.
**Purpose of this file:** a future AI (or Sean) opens THIS file and can (a) see exactly what shipped, (b) pick up every remaining feature slice needed to *finish* the Client Command Center audit hardening, and (c) re-review the shipped code.

---

## 1. ✅ What shipped in this slice (backend, live)

An **append-only forensics trail** (`AdminAccountAuditLog`, existing live table, migration `20260623000100`) now records every admin change to a client's sensitive account fields. Before this, the only thing audited in that table was `manual_session_grant` — admin billing/account changes had **zero** trail.

**Covered (all in `backend/controllers/adminClientController.mjs`):**
| Path | Action string | Semantics |
|---|---|---|
| `updateClient` | `admin_client_account_update` | **fail-closed** (audit inside txn; failure rolls back the change) + `lock: true` (FOR UPDATE, race-safe snapshot). Only writes when a sensitive field actually changed. |
| `createClient` | `admin_client_create` | fail-closed, guarded by `req.user?.id`, records initial billing posture. |
| `createExternalClient` | `admin_client_create_external` | fail-closed, guarded, reads persisted `newClient.*` (drift-proof). |

**Audited fields:** `sessionBillingMode`, `clientSource`, `accountStatus`, `isLocked`, `canGenerateWorkoutPlans`. Each row: `actorUserId`, `targetUserId`, `action`, `reason`, `previousState`, `nextState` (JSONB), `metadata`.

**Deliberately NOT audited (documented rationale):** the 5 fulfillment paths that set `sessionBillingMode → 'paid_sessions'` (`creditsController`, `SessionGrantService`, `galleryVipFulfillmentService`, `sessionPackageCheckoutFulfillmentService`, `session.service`). They move clients *to paid* (revenue gain) and are each backed by an order/payment record; cramming them into an *admin* log (no admin actor) is semantically wrong. See §3 residual for the alternative.

**Verification:** vitest runs in the worktree via `npm install --force` (bypasses a win32 platform-check dep). **318 tests pass** across all controller-touching + admin + session/client suites. Source-contract test + 2 runtime tests (`adminClientLifecycleRuntime.test.mjs`) assert the audit fires with the correct payload and the guard suppresses it on profile-only edits. Rule 42 clean, secret scans CLEAN.

**Security posture:** fail-closed (no silent money-path mutation without a record); admin-gated server-side (`protect` + `authorize(['admin'])`, trainer → 403); FK targets `"Users"` (canonical, verified); no PII in audit rows (IDs + enum values only, Rule 8).

---

## 2. 🔨 Remaining feature slices to FINISH the workstream (ranked)

> These complete the Client Command Center audit (`CLIENTS-TEAM-COMMAND-CENTER-FABLE-AUDIT-2026-07-05.md`). Slices S1–S4 are the **frontend half** owned by the `fable/client-command-center` arc (they touch `frontend/.../workspaces/**`); S5–S6 extend the backend audit this slice started.

### S1 — Billing-toggle frontend safety *(P0, money-path UX — pairs with what shipped)*
`SettingsTabContent.tsx:191-201` still flips billing with **no confirm**, **zeroes `availableSessions` client-side** (`:69`), and `ClientsWorkspaceTabs.tsx` never threads `onClientUpdated` (change doesn't propagate). Fix: inline confirm (reuse `ClientLifecycleConfirmDialog`), stop the client-side session-zeroing (server is source of truth), thread `onClientUpdated`. **Bonus:** send an optional `reason` in the PUT body so the backend audit's `reason` is meaningful (the backend already reads `updates.reason`).

### S2 — FormAnalysis client-context drift *(P0, data-truth)*
`BiometricsTabContent.tsx:212` renders `<FormAnalysisPage />` with **zero props** while 4 sibling cards pass client context; `FormAnalysisPage` self-sources nothing → shows the wrong subject. Fix: pass `clientId` + plumb it into `FormAnalysisPage`. (Recipe B.)

### S3 — Progress charts eager-load *(HIGH, perf/stability)*
`AdminProgressChartsGrid.primaryCards/detailCards` mount 7+ Victory panels with **no `SafeChart`/lazy/`Suspense`** (violates the CLAUDE.md gotcha — one bad datapoint can white-screen the tab). Fix: wrap each card in `Charts/SafeChart.tsx` like `ProfileChartsGrid`; lazy/gate detail cards. (Recipe C.)

### S4 — Overview placeholder metrics *(MED, data-truth)*
`OverviewTabContent.tsx:92` renders `optPhase || 1` ("Phase 1" always), revenue "$0", achievements 0, no error state (fetch-fail → permanent "Loading…"). Fix: compute real values (live `WorkoutSession.count` at `adminClientController.mjs`) or explicit "not assessed" states + an error branch. (Recipe D.)

### S5 — Account LIFECYCLE audit gap *(the hostile loop's biggest residual — extends this slice)*
`restoreClient` (reactivation) and the `clientDeactivationService.mjs` deactivation flow write **NO audit row** — an admin deactivating/reactivating a client account (an "owner-gated account-control action," exactly what `AdminAccountAuditLog` is for) leaves no trail. Fix: add `AdminAccountAuditLog.create` to both, same fail-closed pattern (`admin_client_reactivate` / `admin_client_deactivate`), capturing actor + prev/next `isActive`/`accountStatus`. Different *risk domain* (account access vs money) — that's why it was scoped out of this slice, but it's the natural next backend slice.

### S6 — Fulfillment-path forensics decision *(LOW, decide)*
Confirm the 5 `→ paid_sessions` fulfillment paths (§1) are genuinely reconstructable via order/Stripe records, OR add a lightweight commerce-audit hook. Decision-only unless a gap is found.

---

## 3. 🧪 How to run / verify (for the next AI)

- Branch: `claude/admin-client-audit-log-20260705` (merged to `main` — this slice is live).
- vitest in a fresh worktree needs deps: `cd backend && npm install --force --no-audit --no-fund` (the `--force` bypasses a pre-existing win32 platform-check dep; without it `node_modules` silently doesn't populate).
- Money-path regression suite: `npx vitest run tests/api/adminClient*.test.mjs tests/api/admin*.test.mjs --reporter dot`.
- Audit contract: `tests/api/adminClientAccountAuditContract.test.mjs` (source-contract) + `adminClientLifecycleRuntime.test.mjs` (runtime behavior).

## 4. 🔁 Future review hooks (re-examine these later)

- Re-check the **fail-closed** tradeoff (§1): if `admin_account_audit_logs` is ever unavailable, ALL sensitive admin edits 500. Accepted (table is live + reliable); monitor for contention/deadlocks under concurrent admin edits.
- Verify `reason` is being sent by the frontend once S1 lands (today it defaults to a generic string when omitted).
- When S5 lands, confirm the lifecycle audit uses the same fail-closed + FK-to-`"Users"` pattern.
- Re-verify no fulfillment path ever sets `no_session_required` (the risk direction) — only the two admin paths do today (grep-verified 2026-07-05).

---

## 5. 📋 Paste-ready prompt for the next AI

```
Read CLAUDE.md first. You're finishing the SwanStudios Client Command Center audit.
Context docs:
  - docs/ai-workflow/AI-HANDOFF/CLIENT-BILLING-ACCOUNT-AUDIT-HANDOFF-2026-07-05.md (this file — shipped state + remaining slices S1-S6)
  - docs/ai-workflow/AI-HANDOFF/CLIENTS-TEAM-COMMAND-CENTER-FABLE-AUDIT-2026-07-05.md (§0 status, §8 recipes)

SHIPPED (live): backend append-only audit on all 3 admin account-control paths
(updateClient/createClient/createExternalClient), fail-closed, verified (318 tests).

DO NEXT (pick per Sean's priority):
  S1 (P0) frontend billing safety — SettingsTabContent confirm + stop client-side
     availableSessions zeroing + thread onClientUpdated + send `reason` in the PUT.
  S2 (P0) FormAnalysis client prop (BiometricsTabContent.tsx:212).
  S3 (HIGH) Progress charts SafeChart/lazy (AdminProgressChartsGrid cards).
  S4 (MED) Overview data-truth + error state (OverviewTabContent.tsx).
  S5 (backend) audit restoreClient + clientDeactivationService (account lifecycle) —
     same fail-closed AdminAccountAuditLog pattern.

RULES: S1-S4 touch frontend/.../workspaces/** = the fable arc's lane (Rule 67 — read
.ai-workflow/coordination/claude.lane.md before editing). Money-path = hostile-review
before ship (Rule 61) + Rule 42 pre-push. vitest needs `npm install --force`.
```

---
*Filed for hostile review. Linked from `ACTIVE-INDEX.md` and `.ai-workflow/coordination/review-queue.md`. This is the rule-48 phase artifact for the billing/account-audit slice.*
