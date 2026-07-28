# Smart Escalation (Nemotron Super) — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 31.4s
> **Files:** docs/ai-workflow/brainstorms/training-command-unification-village-brief-2026-06-28.md
> **Generated:** 6/28/2026, 3:44:46 PM

---

**TL;DR** – All three items are genuine, non‑over‑classified risks.  
- **Historical backfill safety** is a *blocking* P0 that must be in place before any write‑capable UI (logger, Coach‑approved backfill, or any AI‑daily‑form path) ships.  
- **AI provenance / regulatory liability** is also a *blocking* P0 (compliance‑critical) – it must be enforced before any AI‑generated workout log is persisted.  
- **sessionStorage prefill** is a *high* risk that can be worked on in parallel **after** the two blocking contracts are locked, but the unsafe sessionStorage mechanism must be replaced **before** any UI that relies on it for pre‑fill goes to production.

Below is a deep‑dive for each finding, answering the four prompts you asked for.

---

## 1️⃣ Historical backfill safety contract must ship first (P0/Critical)

| Question | Answer |
|----------|--------|
| **Is this truly CRITICAL or over‑classified?** | **Critical.** The analysis shows a concrete write path (`aiWorkoutDailyFormService → submitAiWorkoutLogAsDailyForm`) that lacks the historical/source flag (`historical_import`, `move_fitness_historical_import`, `suppressEngagementSideEffects`). Without it, a Coach‑approved backfill will: <br>• deduct paid‑session credits, <br>• fire XP/social side‑effects, <br>• potentially advance the plan cursor (Analyst 8 traces the exact write). This violates product requirements 5‑7 and creates a direct financial‑truth risk. |
| **Specific mitigation strategy** | 1. **Add a first‑class `source` enum** to the AI daily‑form payload (e.g., `{ source: 'historical_import' | 'move_fitness_historical_import' | 'regular' }`). <br>2. **Propagate the flag** from `adminWorkoutLoggerController` (where it already exists) into `submitAiWorkoutLogAsDailyForm`. <br>3. **Guard the three side‑effects** inside `aiWorkoutDailyFormService`: <br> - If `source` is historical → set `suppressEngagementSideEffects = true` (skip XP/social). <br> - Bypass paid‑session deduction logic (do not call the credit‑debit branch). <br> - Do **not** call plan‑advance logic; treat the write as a “read‑only” log for progression tracking only. <br>4. **Add unit‑ and integration‑tests** that assert: <br> - A historical proposal results in `paidCreditsDeducted === false`, `engagementSideEffectsSuppressed === true`, and `planAdvanced === false`. <br> - A regular proposal behaves as today’s the existing behavior. <br>5. **Document the contract** in the service’s JSDoc/OpenAPI so future callers cannot omit the flag. |
| **Should this block implementation or be addressed in parallel?** | **Block.** Any slice that enables the logger to accept a Coach‑approved historical draft (or any AI‑daily‑form write) must first have this contract in place. Shipping the logger picker or the prefill UI before the safety contract would make unsafe writes *easier* to trigger. |
| **Priority order** | **P0 – must be the very first thing shipped** (before any UI that can trigger a write). |

---

## 2️⃣ sessionStorage prefill is dangerous (High/Critical)

| Question | Answer |
|----------|--------|
| **Is this truly CRITICAL or over‑classified?** | **High (but still critical enough to block unsafe UI).** The failure modes are real and have been reproduced in staging: <br>• **Stale client mismatch** – Tab A’s prefill gets logged against Tab B’s `clientId` when the user switches contexts. <br>• **No TTL/invalidation** – Old drafts linger indefinitely, causing accidental backfills days later. <br>• **Race on lazy‑loaded tab re‑mount** – If the logger mounts before the storage is cleared, stale data is reapplied. <br>• **XSS exposure** – Raw JSON stored in `sessionStorage` can be injected via a malicious payload if any part of the UI ever writes unsanitized user input into it. <br>These violate the “no accidental billing/data‑truth risk” principle and could surface as a compliance issue if a backfill is incorrectly billed. |
| **Specific mitigation strategy** | 1. **Replace `sessionStorage` with typed React Router `location.state`** (Analyst 2’s recommendation). When the preview panel wants to hand a draft to the logger, it does: <br> `navigate('/training?tab=logger', { state: { draftId, clientId, version, source: 'historical_import', previewAt: Date.now() } })` <br> The logger reads `useLocation().state` and validates it. <br>2. **Add a TTL‑bound validation layer** (Analyst 8): <br> - Require `clientId` to match the currently‑selected client in the URL/context. <br> - Require a `version` that matches the schema version of the draft service. <br> - Reject if `previewAt` is older than, e.g., 15 minutes (configurable). <br>3. **Server‑side draft table for audit** (Analyst 8): <br> - On preview generation, insert a row into `historical_workout_drafts` with `clientId`, `generatedAt`, `expiresAt`. <br> - The logger, before accepting the prefill, calls `GET /api/workout-logs/history-preview/:draftId/validate` which checks existence, ownership, and TTL. <br> - On successful validation, the draft is marked `used = true` (or moved to a “consumed” state) to prevent replay. <br>4. **Strip any raw user‑generated text** from the draft before storing it in state; rely on the server‑side draft for the authoritative payload. <br>5. **Add automated UI tests** that simulate tab switches, lazy reloads, and expired drafts to confirm no stale prefill survives. |
| **Should this block implementation or be addressed in parallel?** | **Address in parallel *after* the two blocking contracts are locked, but **must be fixed before any UI that uses the prefill mechanism ships**. In practice: <br>1. Lock historical‑backfill safety & AI provenance. <br>2. Implement the safe prefill contract (Router state + server validation). <br>3. Then ship the logger picker / unified UI. |
| **Priority order** | **P1 – high‑risk, but can be done in P0‑parallel workstream**; must be completed before the first “write‑enabled” slice (logger picker or history‑to‑logger flow) goes to prod. |

---

## 3️⃣ AI provenance / regulatory liability (Analyst 12)

| Question | Answer |
|----------|--------|
| **Is this truly CRITICAL or over‑classified?** | **Critical (compliance‑level).** Analyst 12 points out that a “believable progression story” that hallucinates a 20 lb squat jump could be construed as a false claim under the 2026 FTC guidance and California AB 489 (AI‑generated health/fitness claims). If the system presents an AI‑estimated log as if it were a real trainer‑generated session without clear disclosure, the company opens itself to injury‑liability, deceptive‑advertising claims, and potential fines. The fix is straightforward: add an `is_ai_estimated` flag (or equivalent) and a UI badge that must be shown until a human reviewer approves the log. |
| **Specific mitigation strategy** | 1. **DB schema change** – Add column `is_ai_estimated BOOLEAN NOT NULL DEFAULT FALSE` to `workout_logs` (or a supertype `activity_logs`). <br>2. **Backend enforcement** – In `aiWorkoutDailyFormService` (and any other AI‑write path), before persisting, set `is_ai_estimated = true` when the source is AI‑generated (i.e., not a manual entry). <br>3. **Read‑side guard** – Any API that returns a workout log for display must include this flag; the frontend must render a **gold‑badge** (or similar) next to the log entry when `is_ai_estimated === true`. <br>4. **Human‑review requirement** – The Coach Approval flow must require an explicit “Review & Approve” action that flips `is_ai_estimated` to `false` (or moves the log to a “verified” state). Until then, the log is considered *draft* and cannot be used for billing, plan‑advancement, or side‑effects. <br>5. **Audit & tests** – <br> - Unit test: AI‑generated write → `is_ai_estimated === true`. <br> - Integration test: Coach approval → flag cleared. <br> - End‑to‑end test: UI shows badge, badge disappears after approval. <br>6. **Documentation** – Update API spec and internal runbooks to note that any log with `is_ai_estimated === true` is *not* billable and must not trigger engagement side‑effects. |
| **Should this block implementation or be addressed in parallel?** | **Block.** Any slice that allows an AI‑generated workout log to be written to the DB (including the historical backfill path, the Coach‑approved flow, or even the “today assignment” auto‑load if it ever writes) must first have the `is_ai_estimated` guard in place. Otherwise you risk persisting non‑verified AI data that could later be exposed to users or used for billing. |
| **Priority order** | **P0 – must ship before any AI write path is enabled** (i.e., before the historical backfill safety contract is exercised, because that contract relies on the same AI daily‑form service). In practice, the two P0 items can be developed in tandem, but neither can be considered “done” until both are in place and tested. |

---

## 📦 Overall Priority Order (what to ship first)

| Rank | Item | Reason |
|------|------|--------|
| **1** | **Historical backfill safety contract** (source flag + suppression logic) | Prevents immediate financial‑truth and data‑integrity violations; is a prerequisite for any write‑capable UI. |
| **2** | **AI provenance / regulatory liability** (`is_ai_estimated` column + badge + review gate) | Compliance‑critical; must be in place before any AI‑generated log (including the backfill path) is persisted. |
| **3** | **Safe prefill mechanism** (Router `location.state` + TTL + server‑side draft table) | High risk but can be built in parallel with the two P0 items; must be finished before the UI that uses prefill (history‑to‑logger or logger picker) goes to prod. |
| **4** | **In‑logger generated‑plan/day picker** (Option A) | Depends on the safe write contract (P0) and safe prefill (P1) – can be shipped after those are locked. |
| **5** | **Unified Training Command shell** (Option D) | Long‑term UX; only after all data/write contracts are stable. |

---

**.:️‍💡 Quick “cheat‑sheet” for the team**

- **Do NOT** ship any UI that lets a Coach approve a historical backfill **until** you see the `source` field and the three suppression guards in `aiWorkoutDailyFormService`.  
- **Do NOT** persist an AI‑generated log **without** the `is_ai_estimated = true` flag and the mandatory gold‑badge UI.  
- **Do NOT** rely on `sessionStorage` for cross‑tab pre‑fill; replace it with Router state + server‑side validation **before** the first pre‑fill UI hits prod.  
- **Write tests** for each guard *first* (TDD style) – they are the safety net that lets you move fast afterward.  

Following this order will close the critical security gaps, satisfy the FTC/AB 489 compliance requirements, and give Sean the fast, voice‑first backfill workflow he wants **without** exposing the system to accidental billing, erroneous financial or liability risk. 🚀

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
