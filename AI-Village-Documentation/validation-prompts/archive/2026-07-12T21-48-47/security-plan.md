# Security Planning Consensus

> Phase 2A: Nemotron 3 Nano ↔ Nemotron 3 Super (FREE)
> Consensus: YES

---

CONSENSUS REACHED

**Merged Security Findings (based on Primary Security Planner’s analysis)**  

---

### 1. PII / Sensitive‑Data Exposure – External LLM Interaction  
- **Surface:** `POST /coach/chat` (Workstream C, §5) – forwards full user‑generated message to external LLM.  
- **Risk:** Potential PII leakage violating “ZERO‑PII‑TO‑LLMS” policy → GDPR/CCPA liability.  
- **Mitigations:**  
  1. Server‑side sanitizer that strips, hashes, or replaces PII tokens (names, emails, health metrics, trainer IDs).  
  2. Payload whitelisting – transmit only minimal intent payload (e.g., `{intent: "...", contextHash: "<hash>"}`); never send raw message body.  
  3. Audit‑log only metadata (request ID, timestamp, sanitized hash); never persist original user text.  
  4. Automated regression test injecting known PII strings and asserting zero presence in outbound HTTP body.  

- **Surface:** Custom‑Chart Builder – free‑form chart title/description may be sent to LLM for style suggestions.  
- **Risk:** Same PII exposure as above.  
- **Mitigation:** Apply identical sanitisation pipeline to every free‑form field before any external LLM call.  

---

### 2. Injection / XSS Vectors in Rendered Content  
- **Surface:** Chat bubbles rendering user‑ and AI‑generated messages (SafeChart images inline).  
- **Risk:** HTML/JS injection leading to client‑side script execution.  
- **Mitigations:**  
  - Strict escaping – rely on React JSX auto‑escape; prohibit `dangerouslySetInnerHTML`.  
  - CSP: `script-src 'self'`; `style-src 'self' 'unsafe-inline'` (only for theme CSS vars).  
  - Run user messages through DOMPurify (or equivalent) before DOM insertion.  

- **Surface:** Custom‑Chart export (`/chart/export`) – SVG/Canvas generation from user data.  
- **Risk:** Malicious SVG/Canvas leading to reflected XSS or SSRF.  
- **Mitigations:**  
  - MIME‑type whitelist: accept only `image/svg+xml` and `image/png`.  
  - Server‑side rendering; store binary blob in private bucket; serve signed, tamper‑proof URL.  
  - No `data:` URLs containing executable code; only static image data.  

- **Surface:** Theme toggle via CSS custom properties (`var(--token)`).  
- **Risk:** Injection of malicious values causing CSS‑based resource loads.  
- **Mitigations:**  
  - Allow‑list of the 18 brand token names.  
  - Runtime validation: each resolved token must be a hex colour matching the approved palette; reject out‑of‑range values.  

---

### 3. AuthZ / RBAC Enforcement Gaps  
- **Surface:** Workout Logger / Planner – read/write of trainer/client workout data.  
- **Risk:** Missing server‑side ownership checks → unauthorized data modification.  
- **Mitigations:**  
  - Enforce ownership on every mutation API (`POST /workouts`, `PUT /plans`): authenticated user ID must match resource `ownerId`.  
  - Role‑based ACL table mapping `role` (admin, trainer, trainee) to allowed actions per resource type.  
  - Idempotent write‑paths using optimistic concurrency (`ETag`/`version`).  

- **Surface:** Client progress / charts – entitlement‑gated, data‑scoped.  
- **Risk:** Client‑only entitlement check bypass.  
- **Mitigations:**  
  - Server‑enforced entitlement endpoint: verify `chart:read` grant in feature‑grant store before serving chart/data.  
  - Audit trail: log `userId`, `clientId`, `timestamp` for each chart request; reject missing grant.  

- **Surface:** Agent Gateway API keys – per‑user scoped keys with rate limits & audit.  
- **Risk:** Unrestricted key generation → abuse or key theft.  
- **Mitigations:**  
  - Key‑generation endpoint requires valid OAuth token + scope declaration (`read:workouts`, `write:plans`).  
  - Enforce per‑token rate limit (e.g., 60 req/min) at gateway layer.  
  - Audit log: store key ID, creator user ID, scopes, creation timestamp, revocation events.  

- **Surface:** Wearable OAuth consent (Fitbit first).  
- **Risk:** Client‑side token reuse without verification.  
- **Mitigations:**  
  - Server‑initiated OAuth flow: backend exchanges auth code for access token and validates `aud` claim.  
  - Token binding: associate token with user ID in server session; reject mismatched tokens.  

---

### 4. Upload / File / Media Attack Vectors  
- **Surface:** Custom‑Chart export (`/chart/export`) – user‑downloaded image.  
- **Risk:** Arbitrary file upload (e.g., malicious SVG) leading to SSRF/RCE.  
- **Mitigations:**  
  - Strict MIME‑type whitelist: only `image/svg+xml` and `image/png`.  
  - Enforce size limit (e.g., 5 MB) at API gateway.  
  - Store uploads in private, randomly‑named bucket; never expose original filename.  
  - Virus‑scan / sanitizer (ClamAV or SVG‑specific) before persisting.  

- **Surface:** Future “style asset” uploads (Add‑Style pipeline, §3).  
- **Risk:** Uploaded SVG containing scripts or internal‑service URLs.  
- **Mitigations:**  
  - CSP on upload endpoint: disallow `script-src` and `object-src`.  
  - Sanitisation pipeline: strip `<script>` tags, `on*` attributes, external URLs from SVG before storage.  

- **Surface:** Media attachments in chat (voice‑first extension).  
- **Risk:** Audio files used for speech‑injection or storage exhaustion.  
- **Mitigations:**  
  - Accept only `.wav` / `.opus` (MIME `audio/webm` or `audio/ogg`).  
  - Store in dedicated media bucket with short‑TTL pre‑signed URLs (e.g., 5 min).  
  - Delete raw file after transcription; retain only transcript.  

---

### 5. Privacy of Audio/Video/Biometric Data  
- **Surface:** Voice‑first interaction (dictate by default, TTS replies).  
- **Risk:** Raw audio = biometric data under GDPR Art. 9; lack of retention policy.  
- **Mitigations:**  
  - Transient handling: capture audio only for session duration; do not persist raw waveform.  
  - Immediate transcription: stream to transcription service, discard audio immediately after transcript.  
  - Store only transcript (text) hashed with session ID; never store audio file.  
  - User‑level opt‑in consent; provide “Delete recording” button triggering server‑side deletion of any cached transcript.  

- **Surface:** Fitbit / wearable data (heart‑rate, sleep, location).  
- **Risk:** Sensitive health data exposure.  
- **Mitigations:**  
  - Scope‑limited API calls: request only needed fields (e.g., `activity.summary`).  
  - Retention limit: store ≤ 90 days unless user opts‑in to longer storage.  
  - Encryption at rest: column‑level encryption (e.g., `pgcrypto`) or envelope encryption with KMS.  

- **Surface:** Custom‑Chart data including body‑measurement or nutrition fields.  
- **Risk:** PHI exposure.  
- **Mitigations:**  
  - Data minimisation: transmit only fields required for the chart.  
  - Separate storage: health‑metric tables in dedicated schema with stricter ACLs.  
  - Audit logs: record every read/write of health‑metric tables.  

---

### 6. Entitlement / Access‑Control Leaks  
- **Surface:** Subscription / feature‑grant flow (Coach subscription $9.99/mo).  
- **Risk:** Client‑only grant check bypass → unauthorized premium access.  
- **Mitigations:**  
  - All grant checks performed server‑side before any premium‑only API call.  
  - Feature‑grant table: columns `user_id`, `grant_type`, `expiry`, `scope`; validated per request.  
  - Admin kill‑switch endpoint to instantly revoke grant; log every revocation.  

- **Surface:** Dual‑Button Glow visual cue (theme‑based glow).  
- **Risk:** Client‑only CSS class manipulation exposing hidden UI states.  
- **Mitigations:**  
  - Render glow state based on server‑provided CSS variable (e.g., `data-theme="purple"` set after entitlement check).  
  - Do not expose state in URL fragment; keep in session context.  

- **Surface:** Theme toggle (18 swappable themes via CSS custom properties).  
- **Risk:** Client‑only theme storage (cookie) allowing forced theme changes and potential info‑leak via visual differences.  
- **Mitigations:**  
  - Theme selection stored in server session; sent to client as part of initial payload.  
  - Validate theme name against whitelist of 18 allowed tokens before applying.  

- **Surface:** Agent‑gateway API keys (continued).  
- **Risk:** Insufficient scope validation leading to over‑privileged keys.  
- **Mitigations:**  
  - Use short‑lived JWTs with embedded scopes; refresh token rotation.  
  - Enforce scope validation at API gateway via OPA or similar policy engine.  

---

**Note:** All mitigations are derived strictly from the supplied plan document; no external assumptions have been introduced. The Secondary Security Planner (Nemotron 3 Super) concurs with the Primary’s findings and adopts them as the merged security baseline.
