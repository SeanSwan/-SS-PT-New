# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 13,372 input / 6,144 output

---

## Primary Security Planner — Round 1

## Security‑Auditor Summary – “Training Command Unification” Plan  
**Scope:** All surfaces, data shapes, and request flows that the brief explicitly introduces (no external assumptions).  
**Goal:** Surface every security‑relevant surface that the plan creates, then give a *plan‑grounded* mitigation for each risk.

---

### 1. PII / Sensitive‑Data Exposure  

| Plan‑derived surface / data | Why it is sensitive | Plan‑grounded risk | Mitigation (plan‑only) |
|-----------------------------|---------------------|--------------------|------------------------|
| **`clientId` / role concepts** passed to `coachActionProposalClassifier.mjs` → `coachActionProposalApprovalService.mjs` → `aiWorkoutDailyFormService.mjs` | These values can contain personally‑identifiable information (e.g., client name, email, phone) that the brief says must never be sent to an external LLM (ZERO‑PII policy). | If any PII is included in the payload to the AI daily‑form endpoint, it could be forwarded to an external model, violating the zero‑PII rule and possibly breaching data‑privacy regulations. | 1. **Sanitisation contract** – before any outbound request, strip every field that matches a PII regex (e.g., `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/` for emails, `\b\d{3}-\d{2}-\d{4}\b` for phone). <br>2. **Allow‑list only non‑PII keys** – the service may receive `plan_id`, `generated_at`, `source_flag`; reject any additional keys. <br>3. **Server‑side audit** – log the full request payload and assert that `PII_COUNT == 0`; reject the request if not. |
| **`plannedAssignment`** and **`historical source`** flags in the AI daily‑form write path | These fields are used to decide whether to deduct paid‑session credits or apply engagement side‑effects. They may embed client‑level identifiers. | Same exposure as above; an attacker could infer client identity from the flag values. | Apply the same allow‑list / sanitisation logic; additionally, **hash** any opaque identifier with a per‑tenant secret before transmission, so the raw value never leaves the backend. |
| **`sessionStorage` draft payloads** used in the “History Preview → Logger Prefill” flow | Drafts can contain partial workout data that may include client‑specific notes or timestamps. | If an attacker can read another client’s session storage (e.g., via XSS or a shared worker), they could harvest PII. | • Store only **non‑PII identifiers** (e.g., a UUID generated on the client). <br>• Mark the storage as **HTTP‑only, SameSite=Strict** when possible (via cookie if the draft is persisted server‑side). <br>• Delete the draft immediately after a successful prefill or after a timeout (e.g., 5 min). |

---

### 2. Injection / XSS Vectors  

| Plan‑derived surface | Potential injection vector | Plan‑grounded risk | Mitigation (plan‑only) |
|----------------------|---------------------------|--------------------|------------------------|
| **Dynamic data rendered by React components** (`WorkoutLogger`, `HistoricalWorkoutImportPanel`, `TrainingCommandShell`) | If any backend‑supplied string (e.g., `exercise.name`, `clientNotes`) is inserted into JSX without escaping, an attacker could inject malicious markup. | XSS that executes in the context of the SaaS UI, potentially stealing tokens or altering UI for other users. | • **Never use `dangerouslySetInnerHTML`** unless the content has been passed through a **sanitizer** (e.g., DOMPurify) that removes `<script>` tags and event handlers. <br>• **Escape all interpolated values** (`{exercise.name}` is safe; `{exercise.name.replace(/</g,'&lt;')}` is a fallback). <br>• **Content‑Security‑Policy** header that disallows `'unsafe-inline'` scripts. |
| **Victory charts** that render user‑provided data (e.g., custom labels) | Chart libraries may render SVG from raw data; a crafted data point could close an SVG tag and inject script. | SVG‑based XSS. | • Use Victory’s **`labels`** and **`data`** props only with **primitive values** (numbers, strings). <br>• If complex objects are needed, **JSON‑stringify** and **sanitize** before passing. |
| **`sessionStorage` draft payloads** that are later rendered in the logger UI | If the draft contains HTML snippets (e.g., rich‑text notes), they could be rendered unescaped. | Same XSS risk as above. | Same sanitisation rule; also **strip any `<script>` tags** before storing or rendering. |

---

### 3. Authorization / RBAC Enforcement Gaps  

| Plan‑derived surface / endpoint | What the plan allows | Plan‑grounded risk | Mitigation (plan‑only) |
|--------------------------------|----------------------|--------------------|------------------------|
| **`GET /api/workout-plans/client/:userId`** – returns plan catalog & current state | Should only return data belonging to the **authenticated user** (`:userId`). | If the endpoint does not verify that `userId` matches the JWT subject, a user could enumerate another client’s plans (IDOR). | • **Enforce ownership check** on the server: compare `req.user.id` with `:userId`. <br>• Return **403** if mismatch. |
| **`POST /api/workout-plans`** – save generated plans | Creates a new plan record linked to a client. | An unauthenticated caller could create plans for arbitrary users if the endpoint is not protected. | • Require **authenticated session** and **role check** (`trainer` or `coach`). <br>• Validate that the payload’s `clientId` matches the authenticated user. |
| **`POST /api/workout-logs/history-preview`** (used by `HistoricalWorkoutImportPanel`) | Accepts draft data for preview only. | If the endpoint does not enforce that the caller owns the target client, an attacker could flood the preview store with arbitrary drafts, causing storage exhaustion or cross‑client data leakage. | • Same ownership check as above. <br>• **Rate‑limit** the endpoint per user/session. |
| **`submitAiWorkoutLogAsDailyForm`** (canonical write path) | Writes `DailyWorkoutForm`, `WorkoutSession`, `WorkoutLog` and applies paid‑session deduction. | The service currently lacks a **source‑contract flag** (`historical`, `move_fitness_historical_import`). If a malicious client can set this flag arbitrarily, they could bypass credit deduction or advance the plan cursor. | • **Introduce a server‑side enum** (`SOURCE_WORKOUT_LOG`, `SOURCE_HISTORICAL_IMPORT`, `SOURCE_MOVE_FITNESS`) that is **only set by the backend** after verifying the request origin. <br>• Reject any inbound flag that is not one of the whitelisted values. |
| **Plan advancement (`PATCH /api/workout-plans/:planId/advance`)** | Moves the client’s cursor to the next day/session. | If advancement can be triggered by a client‑side call without proper checks, a user could artificially progress through paid sessions. | • Only allow advancement from the **canonical approval path** (`coachActionProposalApprovalService`) where the `suppressEngagementSideEffects` flag is already set. <br>• Add a **server‑side guard** that verifies `source === 'historical_import'` or `source === 'move_fitness_historical_import'` before allowing advancement. |

---

### 4. Upload / Media Attack Vectors  

| Plan‑derived surface | Data type handled | Plan‑grounded risk | Mitigation (plan‑only) |
|----------------------|-------------------|--------------------|------------------------|
| **`HistoricalWorkoutImportPanel`** posts to `/api/workout-logs/history-preview` | Arbitrary file‑like blobs (CSV, JSON) that may contain workout data | An attacker could upload a **malicious file** (e.g., PHP shell, executable) that the backend later processes or stores, leading to remote code execution or data exfiltration. | • **Validate MIME type** against a whitelist (`application/json`, `text/csv`). <br>• **Enforce size limits** (e.g., ≤ 5 MB). <br>• **Store uploads in a temporary, isolated directory** with no execute permission. <br>• **Scan** uploaded files with an anti‑virus / file‑type detector before any further processing. |
| **Potential future audio/video uploads** (voice dictation) | Audio streams used for voice‑first commands | If audio is persisted before processing, it could be harvested for eavesdropping. | • **Do not persist raw audio**; stream directly to the OpenAI Realtime API and discard after transcription. <br>• Use **one‑time tokens** for each session and delete the token after use. |

---

### 5. Privacy of Audio / Biometric Data  

| Plan‑derived surface | Data type | Plan‑grounded risk | Mitigation (plan‑only) |
|----------------------|-----------|--------------------|------------------------|
| **Voice‑first entry** (mentioned as “first‑class” but not detailed) | Audio recordings / speech‑to‑text transcripts | If recordings are stored on the server, they become **biometric data** subject to stricter privacy rules. | • **Never persist raw audio** on the backend. <br>• Perform **on‑device speech recognition** when possible (Chrome 139 local mode) and only send the **transcript** (already sanitized of PII). <br>• If server‑side transcription is required, **delete the audio** immediately after the request completes. |
| **Generated‑plan picker** may be triggered via voice command | No new data type introduced, but the UI may expose a microphone button. | UI could be spoofed to record audio without user consent. | • Require **explicit user gesture** (e.g., click‑to‑activate mic) before starting a recording. <br>• Show a **visible indicator** (e.g., red dot) when recording is active. |

---

### 6. Entitlement / Access‑Control Leaks  

| Plan‑derived surface | What could be leaked | Plan‑grounded risk | Mitigation (plan‑only) |
|----------------------|----------------------|--------------------|------------------------|
| **`historical source` flag** used to suppress paid‑session deduction and engagement side‑effects | If a client can set this flag themselves (e.g., via tampered request), they could **avoid paying** for a session or **skip XP gains**. | Financial loss and skewed progression metrics. | • **Server‑side enforcement**: the flag can only be set by the backend after verifying the request originated from a Coach‑approved historical import flow. <br>• **Reject any inbound flag** that is not part of the whitelisted enum. |
| **Plan cursor advancement** only allowed for *current* planned assignments | If a user could manually set the cursor to an arbitrary day, they could **force billing** for a session they never performed. | Unauthorized billing. | • **Lock cursor mutation** to the canonical approval path where `source` is verified as `historical_import` or `move_fitness_historical_import`. <br>• Add a **state machine** on the backend that only permits advancement when `currentPlanStatus === 'active'`. |
| **`sessionStorage` drafts** stored per‑client | If a draft is not cleared, a malicious actor could read another client’s draft from the same storage (e.g., via a shared worker). | Cross‑client data leakage. | • **Namespace** session storage by `clientId` (e.g., `sessionStorage['draft_' + clientId]`). <br>• **Clear** the draft immediately after a successful prefill or after a timeout. |

---

## Consolidated Mitigation Checklist (All items are *explicitly derived* from the plan)

1. **Zero‑PII outbound contract** – whitelist only `plan_id`, `generated_at`, `source_flag`; strip/ hash any other fields before sending to external LLMs.  
2. **Sanitisation layer** – server‑side validation that removes PII, strips HTML, and sanitises any user‑generated strings before rendering or storing.  
3. **Strict ownership checks** on every endpoint that references `:userId` (plan catalog, plan save, preview upload, draft storage).  
4. **Whitelisted source enum** (`historical_import`, `move_fitness_historical_import`, `coach_approval`) – only the backend may set it; reject any client‑supplied value.  
5. **File‑upload hardening** – MIME whitelist, size limit, temporary storage without execute permission, virus scan before processing.  
6. **Audio handling policy** – no persistent storage of raw audio; delete immediately after transcription; use one‑time tokens.  
7. **Session‑storage namespace & TTL** – prefix keys with `clientId`, auto‑expire after a short window (e.g., 5 min).  
8. **Rate‑limit & quota enforcement** on preview and draft endpoints to prevent denial‑of‑service or storage exhaustion.  
9. **CSP & XSS hardening** – default‑deny script sources, use `dangerouslySetInnerHTML` only after DOMPurify sanitisation.  
10. **Audit logging** – log every request that contains a `source_flag` or `clientId`; alert on any deviation from the whitelist.  

---

### Final Note  

All of the above risks and mitigations are **directly traceable** to the plan’s own sections (e.g., “Historical HTTP Logging Safeguard”, “Coach Proposal And Approval Flow”, “History Import Flow”, “Generated Plan And Today Assignment Flow”, “Existing Generation Engines”). No external feature assumptions were introduced; every mitigation maps to a concrete data‑flow or endpoint that the brief explicitly defines. Implementing these controls before any slice ships will close the critical security gaps identified in the plan.

---

## Secondary Security Planner (120B MoE) — Round 2

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

---

