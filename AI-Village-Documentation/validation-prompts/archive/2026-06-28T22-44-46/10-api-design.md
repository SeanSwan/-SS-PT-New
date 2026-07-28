# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 29.2s
> **Files:** docs/ai-workflow/brainstorms/training-command-unification-village-brief-2026-06-28.md
> **Generated:** 6/28/2026, 3:44:46 PM

---

# API Design Review – Training Command Unification (SwanStudios)

**Source:** `docs/ai-workflow/brainstorms/training-command-unification-village-brief-2026-06-28.md`  
**Domain:** Personal‑training SaaS (React + TS + styled‑components / Node + Express + Sequelize + PostgreSQL)  
**Goal:** Derive every API‑surface fact **only** from the plan; do not add assumed features.

---

## 1. Existing API Sufficiency  

| Surface (from plan) | Existing endpoint(s) | Data returned (per plan) | Is it sufficient for the surface? | Gap / New endpoint needed |
|---------------------|----------------------|--------------------------|-----------------------------------|---------------------------|
| **Workout Plan catalog / current state** (used by WorkoutPlanBuilder & WorkoutLogger) | `GET /api/workout-plans/client/:userId` | Returns the client’s plan catalog **and** current plan/state (per line 137). | ✅ Sufficient for listing generated plans and seeing the active plan. No new endpoint needed for catalog read. | – |
| **Saving a newly generated plan** | `POST /api/workout-plans` | Persists a generated workout plan (line 241). | ✅ Sufficient for creation. | – |
| **Primary‑plan selection** | (implied) *likely* `PATCH /api/workout-plans/:planId/select-primary` (not shown but referenced as “primary‑plan selection” line 406). | Marks a plan as the client’s primary plan. | ✅ If the endpoint exists and returns the updated plan, it is sufficient. | – |
| **Plan activation** | (implied) `PATCH /api/workout-plans/:planId/activate` (line 598). | Activates a plan for use. | ✅ Sufficient if present. | – |
| **Plan advance (cursor move)** | (implied) `PATCH /api/workout-plans/:planId/advance` (line 690). | Advances the plan cursor to the next day/session. | ✅ Sufficient if present. | – |
| **Today’s assignment (logger load)** | `GET /api/workouts/:userId/current` (line 57) → returns `todayAssignment` + `trainingPlanCatalog` (lines 109‑139). | Gives the logger the exact workout for “today” and the full catalog for reference. | ✅ Sufficient for loading the current assignment. No new endpoint needed for this read. | – |
| **History import preview** | `POST /api/workout-logs/history-preview` (line 209 under workout‑log upload routes). | Returns draft‑only preview data + missing‑draft requests (lines 257‑260). | ✅ Sufficient for a read‑only preview; it does **not** persist workouts (as intended). | – |
| **Coach proposal → AI daily‑form submission** | Internal service `submitAiWorkoutLogAsDailyForm` (called from `coachActionProposalApprovalService`). No public HTTP endpoint shown; the plan treats this as a backend‑only call. | Writes DailyWorkoutForm, WorkoutSession, WorkoutLog, applies paid‑session deduction & XP/social side effects. | ❌ **Insufficient** for historical backfill because the service lacks a *historical source* flag to suppress deduction/side‑effects/plan‑advance. A new **flag** (or new endpoint) is required to safely submit historical logs. | New endpoint or internal contract change (see §3). |
| **Voice‑first Coach entry** | Not explicitly exposed; assumed to be via existing Coach Assistant routes (e.g., `POST /api/coach/proposals`). | Receives voice transcript, creates a Coach proposal. | ✅ Sufficient for proposal creation (outside scope of this review). | – |

**Conclusion:** All read‑only surfaces are already covered by existing endpoints. The only missing piece is a **safe write path for historical backfill** (i.e., a way to submit a workout log that is marked as historical so that paid‑session deduction, XP/social effects, and plan advancement are suppressed).

---

## 2. Search / Query Needs  

| Area where plan does client‑side filtering | Scale concern | Recommendation |
|--------------------------------------------|---------------|----------------|
| **WorkoutPlanBuilder** – trainer may scroll through many generated plans to pick a day. | If a client accumulates hundreds of plans, sending the full catalog (`GET /api/workout-plans/client/:userId`) could become large. | Add **server‑side pagination** (limit/offset or cursor) and optional **filter by date range** or **plan status** (e.g., `?limit=20&offset=0&status=generated`). Keep the existing endpoint backward‑compatible; add query params. |
| **WorkoutLogger** – trainer may want to load a specific generated day (non‑today) from the picker. | Picking a day requires looking up a plan and a day index; doing this client‑side after fetching the whole plan could be wasteful. | Provide a **focused endpoint** `GET /api/workout-plans/:planId/days/:dayIndex` that returns only the requested day’s exercises, notes, and metadata. This avoids transferring whole plan objects for each picker interaction. |
| **HistoricalWorkoutImportPanel** – preview may return many missing‑draft requests. | The preview already returns only the parsed drafts and missing‑draft requests; if the uploaded file is huge (e.g., months of CSV), the service should stream/parse and limit the preview size. | Enforce a **max‑rows limit** (e.g., 500 rows) on the preview payload and return a `truncated: true` flag if exceeded. The client can then request a paginated preview via `POST /api/workout-logs/history-preview?page=2&size=200`. |
| **Coach proposal list** (if exposed) – trainer may scroll through many proposals. | Same pagination principle applies. | Add `limit/offset` or cursor to any Coach‑proposal list endpoint. |

**Verdict:** Client‑side filtering is acceptable for small datasets, but for plan catalog and day‑picker we should add **server‑side pagination/filtering** to keep payloads bounded as the data grows.

---

## 3. New Endpoint Design  

### 3.1 Historical Backfill Write (Safe Historical Log)

| Element | Recommendation |
|--------|----------------|
| **Verb / URL** | `POST /api/workout-logs/historical` (separate from the regular `/api/workout-logs` to make the intent explicit and avoid accidental misuse). |
| **Auth** | Trainer‑scoped JWT (same as other workout‑log endpoints). |
| **Payload** (JSON) | ```json { "clientId": "<uuid>", "date": "YYYY-MM-DD", "plannedAssignmentId": "<uuid|null>", // optional – if the log is based on a generated plan day "exercises": [ { "exerciseId": "<uuid>", "sets": number, "reps": number|string, "weight": number|null, "rpe": number|null, "notes": string|null } ], "notes": string|null, "source": { "type": "historical_import|move_fitness_historical_import", "referenceId": "<string|null>", // e.g., external import ID or upload preview ID "suppressEngagementSideEffects": true, "suppressPaidSessionDeduction": true, "suppressPlanAdvance": true } } ``` |
| **Multipart** | Not required – all data is JSON. If the trainer wants to attach a voice note or image, treat those as separate upload endpoints (see §4). |
| **Response** | `201 Created` with the created `WorkoutLog` object (same shape as regular log creation) plus a `historical: true` flag. Include `logId`. |
| **Idempotency** | Accept an `Idempotency-Key` header to prevent duplicate logs from retries. |
| **Validation** | - `clientId` must match the authenticated trainer’s client.<br>- `date` must not be in the future.<br>- If `plannedAssignmentId` is supplied, verify it belongs to the client and is not already marked as completed (unless `suppressPlanAdvance` is true).<br>- At least one exercise must be present. |
| **Security** | The three `suppress*` flags are **server‑only**; the client may set them to `true` but the service must ignore them unless the request is signed with a special role (`coach` or `system`) or originates from the Coach‑approval flow. In practice, the endpoint will be called only by the Coach approval service after verifying the proposal’s `intent=historical_import`. |

### 3.2 In‑Logger Generated Plan/Day Picker (Read‑Only)

| Element | Recommendation |
|--------|----------------|
| **Verb / URL** | `GET /api/workout-plans/:planId/days/:dayIndex` |
| **Auth** | Trainer‑scoped JWT; ensure `:planId` belongs to the client. |
| **Query params** (optional) | `?includeExercises=true|false` (default true) to allow lightweight metadata‑only calls. |
| **Response** | ```json { "planId": "<uuid>", "dayIndex": number, "date": "YYYY-MM-DD", // optional – the date the plan day is scheduled for "title": string, "description": string|null, "exercises": [ { "exerciseId": "<uuid>", "name": string, "sets": number, "reps": number|string, "weight": number|null, "rpe": number|null, "notes": string|null } ], "notes": string|null } ``` |
| **Caching** | Short‑term (see §8). |
| **Rate limit** | See §5. |

### 3.3 History Preview → Logger Prefill (Read‑Only)

The plan suggests taking a preview draft and opening the logger with its data pre‑filled. The preview endpoint already returns the draft; we only need a way to **fetch a specific draft by ID** (if the preview returns an ID) so the logger can load it without re‑parsing the upload.

| Element | Recommendation |
|--------|----------------|
| **Verb / URL** | `GET /api/workout-logs/history-preview/:previewId` |
| **Auth** | Trainer‑scoped JWT; ensure the preview belongs to the client. |
| **Response** | Same shape as the preview POST returns (draft array + missing‑draft requests). Could be trimmed to just the drafts if the logger only needs them. |
| **Cache** | No caching (preview is transient). |
| **Rate limit** | Same as other read endpoints (see §5). |

### 3.4 Optional: Regular Workout Log Creation (if not already present)

If the existing `POST /api/workout-logs` endpoint does not exist, add it with the same payload as the historical endpoint **without** the `source.suppress*` flags (or with them defaulting to `false`). This keeps a single source of truth for log creation.

---

## 4. Multimodal / Large Payloads  

The plan mentions **voice/dictation** as a first‑class input but does not specify sending raw audio to the backend. Existing voice flow likely goes:

1. Client captures audio → converts to text client‑side (or uses a speech‑to‑text service).  
2. Only the transcript (text) is sent to the Coach/AI services.

**Therefore:**  
- **No new multipart endpoint is required** for the core workflow.  
- If future work wants to store the original audio file for audit, introduce a dedicated asset endpoint:  

  `POST /api/assets` (multipart/form‑data, field `file`) → returns `{ assetId, url }`.  
  The workout‑log payload would then reference `audioAssetId` instead of embedding the binary.

**Large payloads** (e.g., bulk CSV import for history) are already handled by the preview endpoint, which streams and limits rows. No change needed.

---

## 5. Rate Limiting  

| Operation | Suggested Limit (per authenticated trainer) | Rationale |
|-----------|--------------------------------------------|-----------|
| `GET /api/workout-plans/client/:userId` (catalog) | 30 requests/minute | Catalog is relatively static; protects against abusive polling. |
| `GET /api/workout-plans/:planId/days/:dayIndex` (day picker) | 60 requests/minute | Allows rapid browsing but caps excessive calls. |
| `GET /api/workouts/:userId/current` (today assignment) | 120 requests/minute | Logger may poll for updates; still reasonable. |
| `POST /api/workout-logs/history-preview` | 10 requests/minute | Preview involves parsing; heavy but infrequent. |
| `POST /api/workout-logs/historical` (safe backfill) | 20 requests/minute | Prevents accidental bulk backfill; each log should be reviewed. |
| `POST /api/workout-plans` (save generated plan) | 15 requests/minute | Generation is AI‑heavy; limit to avoid cost spikes. |
| Any Coach‑proposal endpoints (if exposed) | 30 requests/minute | Voice input is bursty but bounded. |

Use **token bucket** or **fixed‑window** counters; return `429 Too Many Requests` with `Retry-After` header.

---

## 6. Realtime vs Polling  

| Data | Current method in plan | Recommended approach |
|------|------------------------|----------------------|
| **Today’s assignment** (`GET /api/workouts

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
