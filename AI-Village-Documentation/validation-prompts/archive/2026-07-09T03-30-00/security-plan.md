# Security Planning Consensus

> Phase 2A: Nemotron 3 Nano ↔ Nemotron 3 Super (FREE)
> Consensus: YES

---

CONSENSUS REACHED

## Security‑Focused Review of the **Nutrition Decision Logger** Plan  
*All findings are derived **only** from the supplied plan (`docs\ai-workflow\AI-HANDOFF\NUTRITION-DECISION-LOGGER-AI-VILLAGE-INPUT-2026-07-09.md`). No external assumptions are made.*

---  

### 1. PII / Sensitive‑Data Exposure (Zero‑PII‑to‑LLM Policy)

| Risk | Plan Evidence | Why it matters | Mitigation (plan‑grounded) |
|------|---------------|----------------|---------------------------|
| **User‑entered free‑form text may contain PII** (e.g., `description`, `brandName`, free‑form notes, allergens, medical‑condition remarks) and could be forwarded to an external LLM during the “Truth” validation step. | The plan states that the `NutritionEntryDraft` will be **POSTed to `/api/macros`** and that “AI‑driven Truth validation may be forwarded to an external model.” The Zero‑PII‑to‑LLMS policy is explicitly declared. | If any field contains personally identifying information, the policy is violated and the data could be leaked to a third‑party model. | 1. **Sanitise before outbound calls** – strip or hash any free‑form string that could contain PII *before* the request reaches the backend. <br>2. **Server‑side only AI processing** – keep any LLM interaction inside the backend; never forward raw user strings to an external endpoint. <br>3. **Audit‑log redaction** – tag any field that may contain PHI and ensure they are never written in clear text to logs. <br>4. **Retention & purge** – automatically delete or anonymise draft payloads older than the mandated retention window. |

---  

### 2. Injection / XSS Vectors in Rendered Content  

| Risk | Plan Evidence | Why it matters | Mitigation |
|------|---------------|----------------|------------|
| **User‑generated text (e.g., `description`, search queries, barcode‑scan notes) is rendered directly into the DOM** (e.g., in the Draft/Review panel, source‑truth chips, trainer notes). | The Draft/Review panel displays the `NutritionEntryDraft` fields verbatim; the plan shows the panel will be **editable** and **saved** via `/api/macros`. No sanitisation is mentioned. | Unsanitised input can be injected as HTML/JS, leading to XSS when the data is later displayed (e.g., in the diary timeline or trainer review queue). | 1. **Server‑side HTML‑escaping** on every write to the database (Sequelize `escape`/`quote` or a templating engine that auto‑escapes). <br>2. **Client‑side sanitisation** before insertion – use `DOMPurify` or React’s JSX interpolation (never `innerHTML`). <br>3. **Content‑Security‑Policy** header that disallows `unsafe-inline` scripts. <br>4. **Whitelist allowed characters** for free‑form fields (e.g., reject `<`, `>`, `script` tags). |
| **Dynamic colour tokens (`var(--token, #fallback)`) could be abused** if an attacker can inject a CSS variable with malicious content. | The theme system uses CSS custom properties for every colour; the plan mandates *never* hard‑code hex values. | An attacker who can influence a token (e.g., via a crafted URL fragment) could affect styling but not script execution; however, combined with other XSS vectors it could be leveraged for **CSS‑based injection** that modifies UI to hide UI elements. | 1. **Validate token values server‑side** before they are emitted into CSS (reject `url()`, `data()`, or `javascript:` schemes). <br>2. **Scope token names** to a known set (`--bg-primary`, `--glow-primary`, etc.) and enforce via a TypeScript enum. |

---  

### 3. AuthZ / RBAC Enforcement Gaps  

| Risk | Plan Evidence | Why it matters | Mitigation |
|------|---------------|----------------|------------|
| **Client‑side only role checks** – the plan shows `UserDashboardTabsV3` renders the nutrition tab for any authenticated user, but **admin‑only routes** (`/nutrition/:clientId?`, `/meal-planner` for trainers) are mounted via `UniversalDashboardLayout.routes.tsx`. No explicit server‑side guard is described for the *draft* write path. | `POST /api/macros` is used by **all** capture modes (manual, search, barcode, etc.). The plan does **not** mention checking `req.user.role` before accepting the payload. | If a regular user could POST a draft that is later **verified** by an admin, they could potentially manipulate verification state or flood the review queue. | 1. **Enforce role‑based middleware** on every write endpoint (`/api/macros`, `/api/macros/review-queue`, `/api/macros/client-timeline/:entryId/verify`). <br>2. **Require `targetUserId`** (when logging on behalf of another user) and verify that the caller has `trainer` or `admin` permission *before* allowing `verified` flag changes. <br>3. **Never trust the client** for role decisions – all RBAC checks must be performed server‑side, not just in React components. |
| **IDOR exposure** – endpoints accept an `:id` param (e.g., `client-timeline/:entryId/verify`). | `PATCH /api/macros/client-timeline/:entryId/verify` is mentioned but no validation that the caller owns the `entryId`. | An attacker could guess another user’s entry ID and mark it as verified, bypassing the review workflow. | 1. **Server‑side ownership check** – verify `entry.userId === req.user.id` (or that the caller has admin rights) before allowing `PATCH`. <br>2. **Use UUIDs or opaque tokens** instead of raw numeric IDs where possible. |
| **Cross‑tenant data leakage** – shared `DailyMacroLog` table stores rows for many users. | The model `DailyMacroLog` includes `userId` but the plan does not explicitly state that **all queries** filter on it. | A bug that omits the `WHERE userId = ?` clause could expose another tenant’s diary entries. | 1. **Add a global scope** in Sequelize models that automatically adds `WHERE userId = :currentUser`. <br>2. **Write unit tests** that assert every read/write query includes the user filter. |

---  

### 4. Upload / File / Media Attack Vectors  

| Risk | Plan Evidence | Why it matters | Mitigation |
|------|---------------|----------------|------------|
| **Barcode / label‑photo scanner accepts arbitrary image uploads** (`POST /api/food-scanner/log-scan`). No MIME‑type or size limits are mentioned. | `FoodScannerPage.tsx` posts a scanned image to `POST /api/food-scanner/log-scan`. The backend route (`foodScannerRoutes.mjs`) simply stores the file. | Malicious images (SVG with embedded script, polyglot files) could be stored and later served, leading to **SSRF**, **XSS**, or **RCE** when the image is rendered. | 1. **Validate MIME type** – accept only `image/jpeg`, `image/png`, `image/webp`. <br>2. **Enforce size limits** (e.g., ≤5 MB). <br>3. **Store files outside the web‑root** and serve them via a protected endpoint that sets `Content‑Disposition: attachment`. <br>4. **Run a virus scanner** (ClamAV) or an image‑sanitisation library (e.g., `sharp`) before persisting. |
| **Audio capture for voice logging** (`VoiceCaptureCard.tsx`). | The plan mentions a “Voice capture” mode that will be part of the capture rail. | Audio streams could be used for **eavesdropping** or **speech‑based injection** (e.g., hidden commands). | 1. **Require explicit user consent** before starting a media stream (browser permission prompt). <br>2. **Transcode and store only the minimal necessary data** (e.g., hash of the transcript) – never persist raw audio beyond the session. <br>3. **Run server‑side speech‑to‑text** in a sandboxed environment; discard the audio file immediately after transcription. |
| **Potential SSRF via external API proxy** (USDA / Open Food Facts). | The plan states that external food APIs are **proxied** through the backend to hide API keys. | If the proxy does not validate URLs, an attacker could force the server to make requests to internal services (e.g., `http://localhost:3000`). | 1. **Whitelist allowed hostnames** (e.g., `usda.gov`, `openfoodfacts.org`). <br>2. **Reject any URL that resolves to a private IP** or internal hostname. <br>3. **Set a short timeout** and disable redirects. |

---  

### 5. Privacy of Audio/Video / Biometric Data  

| Risk | Plan Evidence | Why it matters | Mitigation |
|------|---------------|----------------|------------|
| **Voice logging may capture speech that contains personally identifying information** (e.g., user’s name, location). | The plan includes a “Voice capture” mode that will be integrated into the capture rail. | Audio is considered **biometric data** under many privacy regulations (e.g., GDPR Art. 9). Storing or processing it without consent can be illegal. | 1. **Obtain explicit opt‑in consent** before recording (checkbox + clear purpose statement). <br>2. **Transcribe on the server** and **discard the raw audio** immediately after the transcript is stored. <br>3. **Do not retain raw audio** beyond the session; store only the textual draft. <br>4. **Provide a deletion UI** that lets the user erase the voice entry and any associated transcript. |
| **Potential recording of background conversation** (if the microphone is left open). | No explicit guard is mentioned. | Background audio could capture private conversations, violating privacy expectations. | 1. **Limit recording to a fixed duration** (e.g., 30 seconds) and require the user to hold a “Record” button. <br>2. **Mute the microphone
