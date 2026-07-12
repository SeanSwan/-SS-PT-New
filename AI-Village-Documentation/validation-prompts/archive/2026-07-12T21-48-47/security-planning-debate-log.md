# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 16,198 input / 7,721 output

---

## Primary Security Planner — Round 1

## Security‑Focused Review of the **Jarvis Swan OS** Plan  
*(All findings, ratings and mitigations are derived **only** from the content of the supplied plan document – no external assumptions are made.)*  

---  

### 1.  PII / Sensitive‑Data Exposure – External LLM Interaction  

| Surface (plan‑derived) | Why it matters (plan reference) | Rating | Plan‑grounded Mitigation |
|------------------------|--------------------------------|--------|--------------------------|
| **Swan Coach chat endpoint** – `POST /coach/chat` (Workstream C, §5) – forwards the **full user‑generated message** to an external LLM for “conversational assistance”. The plan explicitly states a **ZERO‑PII‑TO‑LLMS** policy but does **not** describe the de‑identification step. | The endpoint is the *only* place where raw user text can leave the platform. If any PII slips through, it would be processed by a third‑party model, violating the “no‑PII” rule and exposing the company to GDPR/CCPA liability. | **HIGH** | 1. **Pre‑processing pipeline** – before the request is sent, run a **server‑side sanitizer** that strips, hashes or replaces any personally identifiable tokens (names, email prefixes, health metrics, trainer IDs). <br>2. **Payload whitelisting** – only allow a **minimal intent payload** (e.g., `{intent: "greeting", contextHash: "<hash>"}`) to be transmitted; **never** send the raw message body. <br>3. **Audit‑log only metadata** – store request ID, timestamp, and the *sanitized* hash; **never** persist the original user text. <br>4. **Automated regression test** – inject known PII strings into the UI and assert that the outbound HTTP body contains **zero** of those strings. |
| **Custom‑Chart Builder** – when a user creates a chart, the UI may send **metadata** (e.g., chart title, description) to the backend for storage. | The plan mentions “conversational input to generate charts” and “save to dashboard”. If the description field is forwarded unchanged to an LLM for “style suggestions”, it could leak PII. | **MEDIUM** | Same sanitisation pipeline as above; treat every free‑form field as “potentially sensitive” and run the same stripping/hashed‑output step before any external call. |

---  

### 2.  Injection / XSS Vectors in Rendered Content  

| Surface | Plan reference | Risk | Mitigation (plan‑compatible) |
|---------|----------------|------|------------------------------|
| **Chat bubbles** that render **user‑generated messages** and **AI‑generated responses** (SafeChart images may be embedded). | §5 – “Coach can render live charts inline in the transcript (SafeChart inside chat bubbles)”. | If a malicious user injects HTML/JS into a message, it could be executed when rendered by React. | • **Strict escaping** – all inbound message text is escaped before insertion into the DOM (React’s JSX automatically escapes, but ensure no `dangerouslySetInnerHTML` is used). <br>• **Content‑Security‑Policy** – enforce `script-src 'self'` and `style-src 'self' 'unsafe-inline'` only for the theme CSS variables; disallow inline scripts. <br>• **Sanitisation library** – run user messages through **DOMPurify** (or equivalent) before inserting into the chat container. |
| **Custom‑Chart export** – images are generated from user‑supplied data and then rendered on the page. | §5 – “Export chart images (`/chart/export`)”. | If an attacker can influence the SVG/Canvas generation to embed malicious payloads, it could be reflected back to the viewer. | • **MIME‑type whitelist** – only `image/svg+xml` and `image/png` are accepted; reject any other types. <br>• **Server‑side rendering** – generate the chart on the backend, store the **binary blob** in a private bucket, and serve a **signed URL** that cannot be tampered with. <br>• **No script URLs** – never expose a `data:` URL that contains executable code; only static image data. |
| **Theme toggle / style injection** – styles are applied via CSS custom properties (`var(--token)`). | Global design system requires **every colour to be a CSS custom property** with a fallback. | If an attacker can inject a custom property with a malicious value that triggers a CSS‑based attack (e.g., `url(../evil.svg)`), it could cause an XSS‑like resource load. | • **Allow‑list of token names** – only the 18 brand tokens defined in the palette are permitted. <br>• **Runtime validation** – when a new theme is loaded, verify that each `var(--token)` resolves to a **hex colour** that matches the approved palette; reject any out‑of‑range values. |

---  

### 3.  AuthZ / RBAC Enforcement Gaps  

| Surface | Plan reference | Potential Gap | Mitigation (plan‑compatible) |
|---------|----------------|---------------|------------------------------|
| **Workout Logger / Planner** – read/write of a trainer’s or client’s workout data. | §4 P0 list (Workout Logger, Planner, Schedule, Client progress). | The plan does **not** describe server‑side permission checks for “who can read/write which client’s data”. If a client‑side store is used without backend validation, an attacker could forge a request and modify another user’s workout. | • **Enforce ownership on every API** – every mutation (`POST /workouts`, `PUT /plans`) must verify that the **authenticated user’s ID** matches the **ownerId** of the resource. <br>• **Role‑based ACL tables** – define a `permissions` table that maps `role` (admin, trainer, trainee) to allowed actions per resource type. <br>• **Idempotent write‑paths** – use optimistic concurrency (`ETag`/`version`) to detect stale updates. |
| **Client progress / charts** – charts are “entitlement‑gated” and “data scoped to THEIR data only”. | §5 – “entitlement‑gated, data scoped to THEIR data only (Rule 8)”. | If the **entitlement check** is performed only on the client, a malicious user could bypass it and view another user’s charts. | • **Server‑enforced entitlement endpoint** – before serving a chart image or data, the backend must query the **feature‑grant** store and confirm the requesting user has the `chart:read` grant for that client. <br>• **Audit trail** – log every chart request with `userId`, `clientId`, `timestamp`; reject any request lacking a valid grant. |
| **Agent Gateway API keys** – per‑user scoped API keys with rate limits and audit trails (Workstream D, §6). | “Per‑user agent API keys, scoped grants, rate limits, audit trail.” | If API‑key creation is exposed via a public endpoint without **rate‑limit** or **scope validation**, an attacker could generate unlimited keys or request keys for another user. | • **Key‑generation endpoint** must require a **valid OAuth token** and a **scope declaration** (`read:workouts`, `write:plans`). <br>• **Rate‑limit per token** (e.g., 60 req/min) enforced at the gateway layer. <br>• **Audit log** – store key ID, creator user ID, scopes, creation timestamp, and revocation events. |
| **Wearable OAuth consent** – “Fitbit first (OAuth consent posture, Rule 8)”. | §6 – “Fitbit first (OAuth consent posture, Rule 8 data minimization)”. | If the consent flow returns an **access token** that is stored client‑side and used to call the backend without server‑side verification, an attacker could reuse the token. | • **OAuth flow must be server‑initiated** – the backend exchanges the auth code for an access token and **validates the token’s `aud` claim** before using it. <br>• **Token binding** – associate the token with the specific user ID in the server session; reject any token that does not match the current session. |

---  

### 4.  Upload / File / Media Attack Vectors  

| Surface | Plan reference | Risk | Mitigation (plan‑compatible) |
|---------|----------------|------|------------------------------|
| **Custom‑Chart export** – user can download an image (`/chart/export`). | §5 – “Export chart images”. | If the endpoint accepts arbitrary file uploads (e.g., a malicious SVG) it could be stored and later served as a static asset, leading to **Server‑Side Request Forgery (SSRF)** or **Remote Code Execution** if the file is processed by an external tool. | • **Strict MIME‑type whitelist** – only `image/svg+xml` and `image/png` are accepted. <br>• **Size limit** – enforce a maximum payload (e.g., 5 MB) at the API gateway. <br>• **Isolated storage** – write uploads to a **private, randomly‑named bucket**; never expose the original filename to the client. <br>• **Virus‑scan / sanitizer** – run the file through an anti‑virus engine or an SVG sanitizer before storing. |
| **Future “style asset” uploads** (mentioned in “Add‑Style pipeline” §3) – designers may upload visual assets for new themes. | §3 – “new style in minutes” recipe includes a visuals entry. | Same risks as above; an attacker could upload a crafted SVG that contains embedded scripts or references to internal services. | • **Content‑Security‑Policy** on the upload endpoint – disallow `script-src` and `object-src`. <br>• **Sanitisation pipeline** – strip `<script>` tags, `onload` attributes, and external URLs from SVG before persisting. |
| **Media attachments in chat** – the plan mentions “voice‑first” and “TTS replies”, but does **not** explicitly allow file uploads. However, a future extension could permit users to attach audio clips. | §5 – “voice‑first (dictate by default, type second)”. | If audio files are stored without validation, they could be used for **speech‑injection attacks** or to fill storage. | • **Accept only `.wav` / `.opus`** with MIME type `audio/webm` or `audio/ogg`. <br>• **Store in a dedicated media bucket** with **pre‑signed URLs** that expire after a short TTL (e.g., 5 min). <br>• **Delete after processing** – once the audio is transcribed for the LLM, discard the raw file. |

---  

### 5.  Privacy of Audio/Video/Biometric Data  

| Surface | Plan reference | Sensitivity | Mitigation (plan‑compatible) |
|---------|----------------|-------------|------------------------------|
| **Voice‑first interaction** – “dictate by default, type second”, “TTS replies (Aurora presence states already exist)”. | §5 – “voice‑first (dictate by default, type second)”, “TTS replies”. | Audio recordings are **biometric** under many privacy regimes (e.g., GDPR Art. 9). The plan does **not** state any retention policy for raw voice data. | 1. **Transient handling** – capture audio **only** for the duration of the session; **do not persist** the raw waveform on disk. <br>2. **Immediate transcription** – stream the audio to a transcription service, discard the audio immediately after the transcript is obtained. <br>3. **Store only the transcript** (text) with a **hash of the session ID**; never store the audio file. <br>4. **User‑level consent** – require an explicit opt‑in before any voice capture; provide a clear “Delete recording” button that triggers server‑side deletion of any cached transcript. |
| **Fitbit / wearable data** – “Fitbit first (OAuth consent posture, Rule 8 data minimization)”. | §6 – “Fitbit first (OAuth consent posture, Rule 8 data minimization)”. | Wearable data may include **heart‑rate, sleep, location** – considered sensitive health data. | • **Scope‑limited API calls** – request only the fields needed for the current feature (e.g., `activity.summary`). <br>• **Retention limit** – store wearable data for **no longer than 90 days** unless the user explicitly opts‑in to longer storage. <br>• **Encryption at rest** – encrypt the data in the PostgreSQL table using column‑level encryption (e.g., `pgcrypto`). |
| **Custom‑Chart data** – may include **body‑measurement** or **nutrition** fields. | §5 – “custom chart builder” can ingest “body‑measurements”. | If a chart includes health metrics, those fields are **protected health information (PHI)** in many jurisdictions. | • **Data‑minimisation** – only transmit the **minimum set of fields** required for the chart. <br>• **Separate storage** – keep health‑metric tables in a **different schema** with stricter access controls. <br>• **Audit logs** – record every read/write of health‑metric tables. |

---  

### 6.  Entitlement / Access‑Control Leaks  

| Surface | Plan reference | Leak risk | Mitigation (plan‑compatible) |
|---------|----------------|-----------|------------------------------|
| **Subscription / feature‑grant flow** – “Coach subscription option ($9.99/mo)”, “grant, instant access”. | §5 – “Monetization + cost guardrails”, “Reuse the existing feature‑access grant system”. | If the **grant check** is performed only on the client (e.g., a boolean flag stored in local state), a user could bypass it and gain premium features. | • **All grant checks must be performed server‑side** before any premium‑only API is called. <br>• **Feature‑grant table** must contain `user_id`, `grant_type`, `expiry`, `scope`; the backend validates this table for every request. <br>• **Kill‑switch** – expose an admin endpoint that can instantly revoke a grant; log every revocation. |
| **Dual‑Button Glow** – visual cue for “blue bg → purple glow, purple bg → cyan glow”. | Global design system description. | If the glow state is toggled via a **client‑only CSS class** without a server‑side flag, an attacker could manipulate the class via the URL fragment and expose hidden UI states. | • **Render the glow state based on a server‑provided CSS variable** (e.g., `data-theme="purple"` set by the backend after entitlement check). <br>• **Do not expose the state in the URL**; keep it purely in the session context. |
| **Theme toggle** – 18 swappable themes, each mapped to CSS custom properties. | Global design system. | If the **theme selection** is stored only in a client cookie, a malicious site could set a cookie for another user and force a different theme, potentially leaking information via visual differences. | • **Theme selection must be stored in the server session** and sent to the client as part of the initial payload. <br>• **Validate the theme name** against the whitelist of 18 allowed tokens before applying it. |
| **Agent‑g

---

## Secondary Security Planner (120B MoE) — Round 2

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

---

