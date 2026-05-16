# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 17.9s
> **Files:** docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-PLAUD-UNIFIED-WORKFLOW-AI-VILLAGE-PROMPT-2026-05-14.md
> **Generated:** 5/14/2026, 12:24:06 PM

---

## 1️⃣ Security & Privacy Findings

| # | Finding (as described in the brief) | Rating | Why it’s that rating | Concrete Mitigations |
|---|------------------------------------|--------|----------------------|----------------------|
| 1 | **PII exposure in conversation titles / previews** – titles may contain client names, emails, phone numbers, or other identifiers. | **CRITICAL** | Titles are stored in `AiConversation.title` (JSONB) and can be displayed in the UI and in search results. If a malicious actor can view another user’s conversation list, they could harvest PII. | • **Sanitise / redact** any PII before persisting a title. <br>• Enforce a **policy‑engine** that strips or hashes personal fields when the conversation is created. <br>• Store only a **non‑identifying hash** of the client name/ID for UI display; keep the raw value only in the encrypted client record. <br>• Add a **backend validation hook** (`beforeCreate`/`beforeUpdate`) that runs a regex‑based PII detector and aborts if any match is found. |
| 2 | **File‑attachment risks** – images uploaded to R2 for AI analysis; possible SSRF, malicious file types, path traversal. | **HIGH** | Uploaded files are fetched by the backend (e.g., `applaudAudioFetcher`) and stored in R2. An attacker could upload a crafted image that triggers SSRF or exploits image‑processing libraries. | • **Whitelist** MIME types (`image/jpeg`, `image/png`) and enforce size limits (< 5 MB). <br>• Store uploads **directly** to R2 via a signed URL; never accept a raw URL from the client. <br>• Validate the **Content‑Type** and **magic bytes** server‑side. <br>• Run a **sandboxed virus scanner** (ClamAV) before moving the file. <br>• Disable any **external URL fetching** inside the processing pipeline; only accept files that have been streamed from the client. |
| 3 | **Voice data privacy** – audio recordings sent to Gemini for transcription; storage duration, policy implications. | **HIGH** | Audio is transmitted to an external LLM (Gemini) for transcription. If recordings are persisted on Swan’s servers, they become PII‑laden data at rest. | • **Transient processing only**: stream audio directly to Gemini, receive the transcript, then **discard** the raw audio immediately. <br>• Do **not** store the audio file or its metadata longer than the transcription request. <br>• If any audit‑log of the request is needed, store only a **hash of the request ID** and the resulting transcript (no raw audio). <br>• Update the privacy policy to explicitly state that **audio is not retained** beyond the transcription step. |
| 4 | **Conversation data at rest** – JSONB messages in PostgreSQL; encryption, access controls. | **MEDIUM** | JSONB may contain user‑generated text that includes PII even after sanitisation. Current DB is not encrypted at rest (default PostgreSQL on most cloud providers). | • Enable **Transparent Data Encryption (TDE)** or use **AWS RDS encryption** / **Azure Database Encryption** for the `ai_conversations` table. <br>• Apply **row‑level security (RLS)**: each conversation has a `owner_id` column; policies restrict SELECT/UPDATE to the owning trainer/admin. <br>• Audit the **role‑based permissions** in the API layer (`/api/admin/coach-assistant/*`). |
| 5 | **RBAC enforcement** – admin sees all, trainer sees only assigned clients, client sees only own. | **MEDIUM** | The plan mentions “Admin sees all conversations” but does not detail how the UI enforces per‑client boundaries. If a trainer can guess another client’s ID via URL parameters, they could view unrelated conversations. | • Implement **client‑scoped URL parameters** (`/coach-assistant?clientId=…`) and enforce on the backend that any query for a conversation includes `WHERE target_user_id = current_user_id OR role = 'admin'`. <br>• Add **frontend guard** that disables the “Copy title” / “Share” actions for conversations not owned by the user. |
| 6 | **MediaRecorder API risks** – microphone access, stream cleanup, data leak prevention. | **HIGH** | The browser can capture audio that is streamed directly to the backend. If the stream isn’t fully torn down, residual data could linger in memory or be cached. | • Request **`deviceId`** and **`streamConstraints`** that limit capture to **audio only** and **no video**. <br>• Use `mediaStreamTrack.stop()` in a `finally` block to guarantee cleanup. <br>• Disable **autoplay** and require an explicit user gesture before starting recording. <br>• Store only the **transcript** on the server; never store the raw Blob. |
| 7 | **Markdown rendering XSS** – `react-markdown` with user‑generated content. | **MEDIUM** | User‑written markdown can embed HTML/JS (e.g., `<script>` tags, event handlers). If rendered unsanitised, it could execute in the admin console. | • Use a **sanitiser** like `DOMPurify` before passing markdown to `react-markdown`. <br>• Enable the **`components={{ code: () => <pre>{code}</pre> }}`** option to escape raw HTML. <br>• Consider **disallowing raw HTML** in the intake UI; only allow plain text or whitelisted formatting. |

---

## 2️⃣ Sequencing Recommendation

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| **APPROVE / REVISE / REJECT** | **REVISE** (majority of the plan is solid, but the sequencing around Phase 1‑2 integration and stub‑client handling needs tightening). |
| **Why REVISE?** | • Phase 1 must **wire real conversations** *and* expose the **PLAUD merge state** so that the staging inbox can reference it. <br>• Stub‑client creation must be **isolated** from production data until explicit approval; otherwise you risk fake contact records. <br>• The approval workflow should be **locked down** before any write‑path is opened to avoid accidental writes. |

---

## 3️⃣ Missing Context & Files to Inspect

| Area | Files / Docs to Review | What to Look For |
|------|------------------------|------------------|
| **Conversation model** | `backend/models/AiConversation.mjs`; `frontend/src/hooks/useAIChat.ts`; `backend/routes/aiChatRoutes.mjs` | Presence of `title`, `target_user_id`, `created_at`; any PII fields; encryption flags. |
| **PLAUD webhook flow** | `backend/controllers/plaud/plaudApplaudWebhookController.mjs`; `backend/services/applaudAudioFetcher.mjs`; `docs/ai-workflow/references/PLAUD-APPLAUD-RUNBOOK.md` | How audio is fetched, stored, deduplicated, and linked to a merge request. |
| **Coach intake queue** | `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx`; `backend/routes/coachIntakeRoutes.mjs`; `backend/services/coachIntakeItemService.mjs` | Source‑type enumeration, queue ordering, retention policy, purge‑plan. |
| **RBAC implementation** | `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx`; any `useAuth` / `usePermissions` hooks; `backend/middleware/authorize.mjs` | How `target_user_id` is enforced; admin‑only routes; trainer‑scoped filters. |
| **File upload handling** | `frontend/src/components/PlaudClipMerge/*` (if any upload UI); `backend/controllers/plaud/plaudWebhookRoutes.mjs` | Validation of MIME type, size, virus scan, storage path. |
| **Markdown rendering** | `frontend/src/components/MarkdownRenderer.tsx` (or wherever `react-markdown` is used) | Sanitisation pipeline, allowed components, CSP headers. |
| **Mobile dock layout** | `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx`; styled‑components token files | Touch‑target sizes, breakpoints at 300/332/390/430 px, bottom dock height. |
| **Privacy policy / data‑retention** | `docs/privacy.md` (or equivalent) | Current statements about audio storage, external LLM usage, data‑retention periods. |

---

## 4️⃣ Specific Security / Privacy Blockers

| Blocker | Description | Immediate Action |
|---------|-------------|------------------|
| **PII leakage via conversation titles** | Titles are stored unfiltered; they appear in the UI list and can be exported. | Add a **title‑sanitisation middleware** that redacts any detected personal identifiers before persisting. |
| **Audio persistence** | If the transcription service stores the raw audio for “quality control”, it violates the “no PII to external LLMs” rule. | Enforce a **TTL** of 0 seconds for raw audio; only keep the transcript. |
| **External LLM call without redaction** | Gemini receives the full audio payload; if the request includes client‑specific metadata, that metadata may be exposed to the provider. | Strip all **client‑specific fields** from the request payload; send only the raw audio bytes. |
| **Unrestricted file type handling** | Accepting arbitrary files from the PLAUD device could lead to SSRF or malicious payloads. | Implement a **strict allow‑list** and **server‑side virus scan** before any processing. |
| **RLS not yet enforced** | Current DB schema lacks `owner_id` on `ai_conversations`. | Add a migration to add `owner_id` and back‑fill it; then create PostgreSQL policies. |
| **Markdown XSS** | User‑generated markdown could embed scripts. | Integrate `DOMPurify` and configure `react-markdown` to escape HTML. |

---

## 5️⃣ Front‑End / Mobile UX Changes

| Change | Reason | Implementation Hint |
|--------|--------|----------------------|
| **Fixed bottom command dock** – enforce 44 px touch target, no horizontal overflow at 300/332/390/430 px. | Guarantees one‑handed use on mobile. | Use `styled-components` to lock `height: 44px` and `min-width: 300px` with `overflow-x: hidden` on the dock container. |
| **Sanitised conversation titles** – display only a hashed or truncated version in the sidebar. | Prevents PII leakage in UI lists. | Render `title.slice(0, 20) + '…'` or `hashTitle(title)`; keep full title only in a modal. |
| **Markdown preview sanitisation** – wrap `react-markdown` output with `DOMPurify.sanitize`. | Stops XSS from malicious markdown. | Create a custom `SafeMarkdown` component that applies `DOMPurify` before rendering. |
| **Audio‑recording UI flow** – show a clear “Recording… (tap to stop)” indicator; auto‑stop after 2 min. | Reduces accidental long recordings and memory leaks. | Use `MediaRecorder` with `maxDuration` and clean up `stream` in `finally`. |
| **Client‑creation modal** – require explicit “Create stub” button, disable auto‑fill of email/phone fields. | Prevents fake contact data. | Show a confirmation dialog: “This client will have no contact info until you add it manually.” |
| **Mobile‑first queue view** – collapse the PLAUD merge workspace into an accordion that expands on tap, keeping the dock always visible. | Keeps the primary action (approve) always reachable. | Use `styled-components` to animate height; keep the dock sticky. |

---

## 6️⃣ Backend / Data‑Model Changes

| Change | Why Needed | Example Migration / Code |
|--------|------------|--------------------------|
| **Add `owner_id` (or `client_id`) to `ai_conversations`** | Enables RLS and per‑user scoping. | `ALTER TABLE ai_conversations ADD COLUMN owner_id UUID NOT NULL REFERENCES users(id);` |
| **Add `title_sanitized` column** | Store a PII‑free title for UI display. | `ALTER TABLE ai_conversations ADD COLUMN title_sanitized TEXT;` |
| **Add `audio_ttl` timestamp & cleanup job** | Guarantees raw audio is not persisted. | Create a nightly cron (`DELETE FROM audio_clips WHERE created_at < now() - interval '1 hour';`). |
| **Introduce `conversation_source` enum** (`voice_note`, `transcript_upload`, `chat`, `merge_review`) | Tracks provenance for audit & RBAC. | Add column and populate via service layer. |
| **Enforce strict MIME/type validation on file uploads** | Prevents malicious files. | In `applaudAudioFetcher`, check `file.mimetype` against whitelist; reject otherwise. |
| **Add `is_stub` flag to `clients`** | Distinguish minimal stubs from fully‑created accounts. | `ALTER TABLE clients ADD COLUMN is_stub BOOLEAN DEFAULT FALSE;` |
| **Create a dedicated `coach_action_proposals` approval service** that **requires explicit trainer approval** before any write to `workout_logs` or `clients`. | Guarantees the “no automatic writes” rule. | Wrap existing `workoutLogService.create` in a guard that checks `await proposalService.canWrite(user, proposal)`. |
| **Enable PostgreSQL Row‑Level Security** on `ai_conversations` and `coach_intake_items`. | Enforces RBAC at DB level. | `ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;` then define policies. |

---

## 7️⃣ Recommended First Implementation Slice

**Goal:** Build a **minimal, auditable, and privacy‑safe** version that can be tested end‑to‑end on a single admin workstation.

| Slice | Scope | Files to Touch | Acceptance Criteria |
|-------|-------|----------------|----------------------|
| **1️⃣ Real conversation wiring** | Replace static `COMMAND_THREADS` with `useAIChat` calls; expose the conversation list in the Command Center UI. | - `CoachCommandCenterPage.tsx` <br> - `useAIChat.ts` <br> - `aiChatRoutes.mjs` <br> - `AiConversation` model (add `owner_id`, `title_sanitized`) | • Admin can see a live list of conversations (titles sanitized). <br>• Selecting a conversation loads its message history. <br>• No PII appears in titles. |
| **2️⃣ PII‑safe title generation** | Add sanitisation middleware before persisting titles. | - `AiConversation.beforeCreate` hook (or equivalent) <br> - `titleSanitizer.js` utility | • Any title containing a name/email/phone is either redacted or hashed. <br>• UI shows the sanitized version. |
| **3️⃣ Audio‑only ingestion stub** | Wire the PLAUD webhook to **receive** a base64‑encoded audio blob, **transcribe** via Gemini, and **store only the transcript**. | - `plaudWebhookRoutes.mjs` (add validation) <br> - `applaudAudioFetcher.mjs` (refactor to reject URLs) <br> - `services/ai/transcribeService.mjs` (stream‑only, no persistence) | • Audio is never written to disk. <br>• Transcript appears in the staging inbox. <br>• No external LLM receives client identifiers. |
| **4️⃣ RBAC guard for conversation view** | Enforce that a trainer can only see conversations belonging to their assigned clients. | - `aiChatRoutes.mjs` (add `WHERE target_user_id = ? OR role='admin'`) <br> - Front‑end `ConversationSidebar.tsx` (disable actions for unauthorized users) | • Trainer sees only conversations for clients they are assigned to. <br>• Admin can see all. |
| **5️⃣ Unit / integration tests** | Verify that the above changes respect privacy constraints. | - `tests/unit/useAIChat.test.ts` <br> - `tests/integration/plaudWebhook.test.mjs` | • All tests pass with coverage > 80 % for the new paths. <br>• No PII leaks in generated titles or stored audio. |

**Why this slice?**
- It touches **only the core data‑flow** (conversations + audio ingestion) without yet exposing the full approval workflow.
- It introduces **security primitives** (title sanitisation, RLS, audio‑only processing) early, making later phases easier to lock down.  - It yields a **verifiable UI** that can be demoed to stakeholders while still being small enough to iterate quickly.

---

### TL;DR Checklist for the Team

- [ ] Sanitise / hash conversation titles before persisting.
- [ ] Never store raw audio; discard after transcription.
- [ ] Whitelist file types, scan for viruses, reject external URLs.
- [ ] Add `owner_id` + RLS to `ai_conversations`.
- [ ] Enforce per‑client RBAC on all UI surfaces.
- [

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
