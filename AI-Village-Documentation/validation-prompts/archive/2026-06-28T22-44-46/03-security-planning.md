# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 22.1s
> **Files:** docs/ai-workflow/brainstorms/training-command-unification-village-brief-2026-06-28.md
> **Generated:** 6/28/2026, 3:44:46 PM

---

## Security Review – Training Command Unification Plan  
*Derived exclusively from the supplied brief (docs/ai‑workflow/brainstorms/training‑command‑unification‑village‑brief‑2026‑06‑28.md). No external assumptions made.*

---  

### 1. PII / Sensitive‑Data Exposure  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| The plan references **client IDs** and **role concepts** when calling AI services (`plannedAssignment`, `historical source` flags). If any of these values contain personally‑identifiable information (e.g., client name, email) they could be transmitted to an external LLM or downstream AI endpoint, violating the **ZERO PII TO LLMs** policy. | **HIGH** | Even a single identifier sent to an external model can be considered a breach of the zero‑PII rule. | • Strip all client‑specific fields before any outbound request. <br>• Use opaque, salted tokens (e.g., `client_token`) that cannot be reversed to a name/email. <br>• Log and audit every request that includes a client identifier; reject if any PII is present. |
| The **AI daily‑form service** receives `plannedAssignment` and `historical source` metadata that may embed client‑level data. | **HIGH** | Same exposure as above; the service could be a proxy to an external model. | • Enforce a **data‑contract** that only permits non‑PII keys (`plan_id`, `generated_at`, `source_flag`). <br>• Add a server‑side sanitisation layer that removes any field matching a PII regex (email, name, phone). <br>• Unit‑test that no PII leaks in request payloads. |

---  

### 2. Upload / File / Media Risks  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| `HistoricalWorkoutImportPanel` **POSTs** draft data to `/api/workout-logs/history-preview`. The payload can contain file‑like blobs (e.g., CSV, JSON) that may be later persisted. | **MEDIUM** | If the endpoint ever moves from “preview‑only” to “store”, an attacker could upload malicious files (executable scripts, zip bombs) or trigger **SSRF** by referencing internal URLs. | • Validate **MIME type**, **file size**, and **signature** (e.g., virus‑scan, hash check). <br>• Reject any URLs or external references in the upload; enforce **local‑only** storage. <br>• Store uploads in an **isolated, private bucket** with strict IAM policies. <br>• Add a **content‑type whitelist** and **anti‑virus** scanning step before any persistence. |
| No explicit path sanitisation is mentioned for the **preview** endpoint. | **MEDIUM** | Path traversal or directory‑leak attacks could be possible if the backend writes to a filesystem. | • Use **parameterised paths** and **whitelisted directories**. <br>• Run the service under a **restricted OS user** with write access only to a dedicated upload folder. |

---  

### 3. Audio/Video/Biometric Privacy  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| The brief mentions **voice‑first conversational entry** but does **not** describe any new capture of audio, video, or biometric data. | **NONE** | No new privacy surface is introduced. | • If voice capture is later added, treat it as a **new permission** (see section 6). <br>• Ensure any recorded snippet is **ephemeral**, never persisted, and deleted immediately after processing. |

---  

### 4. Data at Rest  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| New persisted structures: `draftOnly` flag, `historical source` metadata, `plannedAssignment` objects, and session‑level suppression flags. These may contain **client identifiers** and **training intent** data. | **HIGH** | Improper protection could allow cross‑tenant reads or backup leakage. | • Enable **Transparent Data Encryption (TDE)** or **column‑level encryption** for fields that contain client‑specific data. <br>• Apply **Row‑Level Security (RLS)** so a user can only read rows belonging to their `userId`. <br>• Rotate encryption keys regularly and audit key‑access logs. |
| Existing API routes use URL parameter `:userId` (e.g., `GET /api/workout-plans/client/:userId`). | **HIGH** | Potential **IDOR** if the parameter is not bound to the authenticated session’s tenant. | • Add **server‑side ownership checks** (`if (req.user.id !== targetUserId) → 403`). <br>• Consider using **session‑scoped tokens** instead of raw IDs in URLs. |

---  

### 5. AuthZ / RBAC Enforcement  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| New flows (in‑logger picker, historical backfill flag, unified workspace) cross component boundaries (Architect, Coach, Logger, ImportPanel). The brief does **not** detail explicit role checks for these paths. | **HIGH** | Without proper scoping, a trainer could access another client’s plan, or a client could trigger paid‑session deductions on another user’s data. | • Introduce a **centralised permission service** (`canAccessPlan(userId, requesterId)`) used by every new endpoint. <br>• Enforce **role‑based policies** (admin → all, trainer → clients‑they‑own, client → self). <br>• Add **automated integration tests** that attempt IDOR attacks on each new route. |
| Historical import routes route through `CoachCommandCenter.routeContext` which may bypass some checks. | **HIGH** | The historical path is meant to be **draft‑only** and **review‑gated**, but if authorisation is missing, a user could write directly to the logger. | • Make the **historical source flag** part of the request body and validate it server‑side before allowing any write. <br>• Log every write that originates from a historical source and ensure it passes through the **canonical AI daily‑form approval path**. |

---  

### 6. Browser‑API / Permission Risks  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| The plan envisions **voice‑first entry** but does not specify which browser APIs will be used. If `navigator.mediaDevices.getUserMedia` (or similar) is employed, it introduces **microphone permission** handling. | **MEDIUM** | Improper stream handling could leak recordings or keep references after the session ends. | • Request microphone permission **only as a direct user gesture** (e.g., click “Record”). <br>• Release the media stream immediately after processing; do **not** store the raw audio. <br>• If any snippet must be cached temporarily, encrypt it and delete after the logging session. |
| Potential use of **Web Speech API** for dictation may expose transcribed text to the UI. | **MEDIUM** | Transcribed text could contain accidental PII if not sanitised before storage. | • Sanitize transcribed text using the same PII‑filtering logic as in section 1 before persisting. <br>• Treat the transcription as **client‑side only** until an explicit “save” action is performed. |

---  

### 7. Injection / XSS  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| New UI components will render **generated workout plans**, **historical drafts**, and **user‑provided notes**. If any of this data originates from untrusted sources (AI generation, uploaded drafts), it could contain malicious scripts. | **MEDIUM** | React’s JSX escaping protects against XSS, but **HTML‑rich** fields (e.g., markdown, rich‑text notes) may be rendered without sanitisation. | • Use **DOMPurify** or similar library to sanitise any HTML/markdown before insertion. <br>• Enforce a **whitelist** of allowed tags/attributes (e.g., only `<b>`, `<i>`, `<ul>`). <br>• Treat all interpolated data as **plain text** unless explicitly marked safe. |
| The **HistoricalWorkoutImportPanel** posts preview data that may be rendered in the coach UI. | **MEDIUM** | If the preview contains user‑supplied identifiers or script‑like strings, they could be reflected back to the trainer. | • Escape all dynamic values in the preview panel. <br>• Validate that the preview payload contains only **structured JSON** (no raw HTML). |

---  

## Summary of Ratings  

| Category | Rating |
|----------|--------|
| PII / Sensitive‑Data Exposure | **HIGH** |
| Upload / File / Media Risks | **MEDIUM** |
| Audio/Video/Biometric Privacy | **NONE** |
| Data at Rest | **HIGH** |
| AuthZ / RBAC Enforcement | **HIGH** |
| Browser‑API / Permission Risks | **MEDIUM** |
| Injection / XSS | **MEDIUM** |

---  

### Immediate Action Items  

1. **Zero‑PII Gate** – Insert a server‑side sanitiser that strips any PII from payloads before they leave the backend. Add unit tests covering all new API contracts.  
2. **Secure Upload Pipeline** – Harden the `/history-preview` endpoint with MIME‑type validation, size limits, and virus scanning; store files in a private, access‑controlled bucket.  
3. **Authorization Hardening** – Add explicit `userId` ownership checks on every new route (`/workout-plans`, `/workouts/:userId/current`, etc.). Write integration tests that simulate IDOR attempts.  
4. **Encryption & RLS** – Enable column‑level encryption for any field that may hold client identifiers; enforce row‑level security at the database level.  
5. **Voice Capture Safeguards** – If voice dictation is added, restrict permission requests to user gestures, terminate streams immediately, and never persist raw audio.  
6. **Content Sanitisation** – Apply DOMPurify (or equivalent) to any HTML/markdown rendered from generated or imported data; whitelist allowed tags.  
7. **Audit Logging** – Log every write that originates from a historical source, includes suppression flags, or bypasses normal session deduction; ensure logs are immutable and reviewed weekly.  

---  

*All findings are derived strictly from the content of the provided plan document; no external feature assumptions were made.*

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
