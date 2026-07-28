# Security Planning Consensus

> Phase 2A: Nemotron 3 Nano ↔ Nemotron 3 Super (FREE)
> Consensus: YES

---

CONSENSUS REACHED

**Merged Security‑Planning Findings (Primary + Secondary)**  

---

### 1. PII / Sensitive‑Data Exposure  
- **clientId / role concepts** flowing through `coachActionProposalClassifier.mjs → coachActionProposalApprovalService.mjs → aiWorkoutDailyFormService.mjs`  
  - *Mitigation*:  
    1. **Sanitisation contract** – before any outbound request, strip fields matching PII regexes (email: `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/`, phone: `\b\d{3}-\d{2}-\d{4}\b`).  
    2. **Allow‑list only non‑PII keys** (`plan_id`, `generated_at`, `source_flag`); reject additional keys.  
    3. **Server‑side audit** – log full payload, assert `PII_COUNT == 0`, reject if not.  
- **`plannedAssignment`** and **`historical source`** flags in the AI daily‑form write path  
  - *Mitigation*: Apply same allow‑list/sanitisation; additionally hash any opaque identifier with a per‑tenant secret before transmission.  
- **`sessionStorage` draft payloads** (History Preview → Logger Prefill)  
  - *Mitigation*: Store only a client‑generated UUID; mark storage as HTTP‑only/SameSite=Strict when persisted via cookie; delete draft after successful prefill or after a 5‑minute timeout.  

---

### 2. Injection / XSS Vectors  
- **Dynamic data in React components** (`WorkoutLogger`, `HistoricalWorkoutImportPanel`, `TrainingCommandShell`)  
  - *Mitigation*:  
    - Never use `dangerouslySetInnerHTML` unless content passes through DOMPurify.  
    - Escape all interpolated values (`{exercise.name}` is safe; fallback `{exercise.name.replace(/</g,'&lt;')}`).  
    - Enforce CSP header disallowing `'unsafe-inline'` scripts.  
- **Victory charts** rendering user‑provided data  
  - *Mitigation*: Pass only primitive values (numbers, strings) to `labels`/`data` props; if complex objects are needed, JSON‑stringify and sanitize before passing.  
- **`sessionStorage` drafts rendered in logger UI**  
  - *Mitigation*: Same sanitisation as above; strip any `<script>` tags before storing or rendering.  

---

### 3. Authorization / RBAC Enforcement Gaps  
- **`GET /api/workout-plans/client/:userId`**  
  - *Mitigation*: Server‑side ownership check – compare `req.user.id` with `:userId`; return 403 on mismatch.  
- **`POST /api/workout-plans`** (plan creation)  
  - *Mitigation*: Require authenticated session; role check (`trainer`/`coach`); validate payload `clientId` matches authenticated user.  
- **`POST /api/workout-logs/history-preview`** (draft preview)  
  - *Mitigation*: Ownership check as above; rate‑limit per user/session.  
- **`submitAiWorkoutLogAsDailyForm`** (canonical write path)  
  - *Mitigation*: Introduce server‑side enum `{SOURCE_WORKOUT_LOG, SOURCE_HISTORICAL_IMPORT, SOURCE_MOVE_FITNESS}` set only by backend after verifying request origin; reject any inbound flag not in whitelist.  
- **`PATCH /api/workout-plans/:planId/advance`** (plan advancement)  
  - *Mitigation*: Allow advancement only from canonical approval path where `suppressEngagementSideEffects` flag is set; add server‑side guard verifying `source` is `'historical_import'` or `'move_fitness_historical_import'` before permitting cursor move.  

---

### 4. Upload / Media Attack Vectors  
- **`HistoricalWorkoutImportPanel`** → `/api/workout-logs/history-preview`  
  - *Mitigation*:  
    - Whitelist MIME types (`application/json`, `text/csv`).  
    - Enforce size limit (≤ 5 MB).  
    - Store uploads in a temporary, non‑executable directory.  
    - Scan with AV/file‑type detector before processing.  
- **Future audio/video uploads** (voice dictation)  
  - *Mitigation*: Do not persist raw audio; stream directly to OpenAI Realtime API and discard after transcription; use one‑time tokens per session, delete after use.  

---

### 5. Privacy of Audio / Biometric Data  
- **Voice‑first entry**  
  - *Mitigation*: Never persist raw audio; perform on‑device speech recognition when possible (Chrome 139 local mode) and send only sanitized transcript; if server‑side transcription required, delete audio immediately after request completes.  
- **Generated‑plan picker via voice**  
  - *Mitigation*: Require explicit user gesture (click‑to‑activate mic) before recording; show visible indicator (red dot) while recording active.  

---

### 6. Entitlement / Access‑Control Leaks  
- **`historical source` flag** (suppresses paid‑session deduction & engagement side‑effects)  
  - *Mitigation*: Server‑side enforcement – flag set only by backend after verifying request originated from Coach‑approved historical import flow; reject any inbound flag not part of whitelisted enum.  
- **Plan cursor advancement**  
  - *Mitigation*: Lock cursor mutation to canonical approval path where `source` verified as `historical_import` or `move_fitness_historical_import`; add backend state machine permitting advancement only when `currentPlanStatus === 'active'`.  
- **`sessionStorage` drafts**  
  - *Mitigation*: Namespace keys by `clientId` (e.g., `sessionStorage['draft_' + clientId]`); clear draft immediately after successful prefill or after timeout.  

---

### Consolidated Mitigation Checklist (All items explicitly derived from the plan)  

1. **Zero‑PII outbound contract** – whitelist only `plan_id`, `generated_at`, `source_flag`; strip/hash any other fields before sending to external LLMs.  
2. **Sanitisation layer** – server‑side validation that removes PII, strips HTML, and sanitises any user‑generated strings before rendering or storing.  
3. **Strict ownership checks** on every endpoint referencing `:userId` (plan catalog, plan save, preview upload, draft storage).  
4. **Whitelisted source enum** (`historical_import`, `move_fitness_historical_import`, `coach_approval`) – only backend may set it; reject client‑supplied values.  
5. **File‑upload hardening** – MIME whitelist, size limit, temporary storage without execute permission, virus scan before processing.  
6. **Audio handling policy** – no persistent storage of raw audio; delete immediately after transcription; use one‑time tokens.  
7. **Session‑storage namespace & TTL** – prefix keys with `clientId`, auto‑expire after short window (e.g., 5 min).  
8. **Rate‑limit & quota enforcement** on preview and draft endpoints to prevent DoS or storage exhaustion.  
9. **CSP & XSS hardening** – default‑deny script sources, use `dangerouslySetInnerHTML` only after DOMPurify sanitisation.  
10. **Audit logging** – log every request containing `source_flag` or `clientId`; alert on deviations from whitelist.  

All mitigations are directly traceable to the plan’s own sections (Historical HTTP Logging Safeguard, Coach Proposal And Approval Flow, History Import Flow, Generated Plan And Today Assignment Flow, Existing Generation Engines). No external feature assumptions were introduced. Implementing these controls before any slice ships will close the critical security gaps identified in the plan.
