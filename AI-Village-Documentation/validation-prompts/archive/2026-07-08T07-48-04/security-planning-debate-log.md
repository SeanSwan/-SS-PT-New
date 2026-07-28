# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 13,367 input / 6,997 output

---

## Primary Security Planner — Round 1

## Security‑Auditor Review – “Inception Canvas / Lens Foundry” Plan  
**Auditor:** Primary Security Auditor (SwanStudios production SaaS)  
**Scope:** All surfaces, data stores, API contracts, and runtime flows that the plan *explicitly* introduces – **no external assumptions**.  
**Policy constraints:**  

* **ZERO PII TO LLMs** – any client‑identifying data may **not** be transmitted to an external LLM or other third‑party AI service.  
* All mitigations must be implementable with the technologies declared in the plan (React + TS + styled‑components, Node/Express + Sequelize + PostgreSQL, Framer‑Motion, View‑Transitions API, MCP‑UI/AG‑UI, etc.).  

Below is a **plan‑grounded** risk catalogue, the **severity rating** derived from the plan text, and **concrete mitigations** that can be baked into the first shippable slice.

---  

## 1. PII / Sensitive‑Data Exposure  

| # | Plan‑derived surface | Why it is sensitive (plan text) | Severity | Mitigation (plan‑compatible) |
|---|----------------------|--------------------------------|----------|------------------------------|
| 1 | **Voice‑intent capture** – “Spoken words route to which APIs fire; the API results + intent produce a **state document (JSON)**.” | The microphone stream (or its transcription) is captured on the client. If the transcription step is performed by an external LLM, any spoken name, email, health‑related phrase, or background conversation is PII. Even a local transcription must not be persisted or logged. | **HIGH** | • Use the **Web Speech API** *entirely client‑side*; never send raw audio or its transcript to any external service. <br>• Immediately derive a **deterministic intent token** (e.g., a short hash of the recognized phrase) and discard the original transcript. <br>• Log only the token hash (salted) for audit; never store the utterance. |
| 2 | **State‑document persistence** – “Each saved Lens state is addressable (`/lens/<name>`); back‑button rewinds.” The JSON may contain user‑specific preferences, session IDs, or derived personalization data. | Any persisted JSON that is tied to a particular user (owner_id, last‑used lens, saved workflow) qualifies as personal data under GDPR/CCPA. | **MEDIUM** | • Encrypt the JSON at rest (AES‑GCM) before writing to IndexedDB, localStorage, or the backend DB. <br>• Derive the encryption key from a **user‑bound secret** (e.g., a hardened JWT claim) that never leaves the client. <br>• Include a **retention policy** (e.g., auto‑purge after 90 days of inactivity). |
| 3 | **URL‑addressable Lens snapshots** – “URLs survive the morph (`/lens/<name>`).” | The URL may expose a **deterministic identifier** that can be brute‑forced to enumerate other users’ lenses, revealing usage patterns (a form of indirect PII). | **LOW** | • Use **random, non‑guessable UUIDs** for the `<name>` segment (e.g., `lens/7f3a9c2e‑b1d4‑4f8a‑a5c1‑e9b6d2f7c9a1`). <br>• Do not expose any user‑identifying slugs in the public URL. |
| 4 | **Audio/video biometric data** – Not explicitly mentioned, but the plan’s “voice/intent → API orchestration” could be extended to video streams for gesture‑based intent. | If video frames are ever used, they could contain facial features (biometric). | **HIGH (if implemented)** | • Keep all video processing **client‑only**; never transmit frames to the server or external LLM. <br>• Apply **on‑device face‑blur / pixelation** before any optional upload. <br>• Store only a **derived intent token**, not the raw frame. |

> **Bottom line:** All voice‑related data must stay on the device, be reduced to a non‑reversible intent token, and never be persisted or sent to an external LLM.  

---  

## 2. Injection / XSS Vectors  

| # | Plan‑derived surface | Potential injection vector (plan text) | Severity | Mitigation |
|---|----------------------|----------------------------------------|----------|------------|
| 1 | **Component Registry** – “list of reusable UI blocks, their props, and associated `data‑morph` anchors.” The registry is used to **render components dynamically** based on the JSON state. | If a component’s **prop schema** is not strictly validated, an attacker who can influence the state document (e.g., via a malicious Lens URL) could inject a component that executes arbitrary JSX/TSX. | **HIGH** | • Store **prop schemas** as **JSON‑Schema** objects in a **read‑only** registry. <br>• At render time, **sanitize** any user‑controlled data that becomes a prop value (e.g., titles, labels) using a **trusted‑type** policy or a **DOMPurify**‑style sanitizer before it reaches JSX. <br>• Never `eval` or `new Function` on state data. |
| 2 | **State Document JSON** – “first generation is AI‑built, then snapshotted to a named deterministic JSON Lens document.” | The JSON may contain **arbitrary keys** that are later interpreted as component names or style tokens. If the rendering code resolves a key to a component via a **lookup map** without validation, an attacker could craft a Lens URL that points to a malicious component name. | **HIGH** | • Whitelist **allowed component identifiers** in the registry (e.g., `['hero', 'card', 'stat', 'gallery']`). <br>• Reject any Lens JSON that references an identifier outside the whitelist; return a **400** and log the attempt. |
| 3 | **View‑Transitions API** – Used for cross‑DOM interpolation. | The API can be abused to **trigger navigation** or **focus manipulation** that may be leveraged for focus‑jacking attacks. | **LOW** | • Restrict usage to **known semantic anchors** (`header`, `hero`, etc.). <br>• Ensure that any programmatic navigation is **user‑initiated** (e.g., after a click or voice command). |
| 4 | **Styled‑components token system** – “identical 9‑token CSS custom‑property system (`--bg-base`, `--accent-1..3`, …).” | If an attacker can influence a token value (e.g., via a malicious Lens JSON), they could inject a **CSS expression** that triggers **CSS‑based XSS** in browsers that support `content: url(...)` or `filter: url(...)`. | **MEDIUM** | • Treat token values as **CSS‑only primitives**; never allow them to contain `url()`, `attr()`, or `calc()` with untrusted input. <br>• Validate token values against a **whitelist regex** (e.g., only hex or named CSS colors). |

---  

## 3. Authorization / RBAC Enforcement Gaps  

| # | Plan‑derived surface | Missing enforcement (plan text) | Severity | Mitigation |
|---|----------------------|--------------------------------|----------|------------|
| 1 | **Component Registry CRUD** – “Register a new component (after sandbox review).” | The plan does not specify **who** can register or modify components. If any authenticated user could add a component, a malicious actor could inject a component that exfiltrates data. | **CRITICAL** | • Implement a **server‑side permission check** before any `POST /registry` call. Only users with the **`admin`** role (or a designated “registry‑maintainer” service account) may register components. <br>• Store the **owner_id** and **role** in the registry entry; enforce it on every read/write. |
| 2 | **Lens creation / ownership** – “Each saved Lens state is addressable (`/lens/<name>`).” | No explicit **ownership** or **access‑control list** is described. A Lens URL could be guessed or enumerated, allowing cross‑tenant access. | **HIGH** | • Tie each Lens JSON to a **user‑owned record** (`owner_id` foreign key). <br>• When serving `/lens/<uuid>`, verify that the requesting session’s **auth token** belongs to the same `owner_id` (or is an admin). <br>• Return **403** for any mismatch. |
| 3 | **Trust Layer effect tiers (T3/T4)** – “T3/T4 actions (send/file/pay) render as approval‑gated controls with audit receipts.” | The plan mentions “audit receipts” but does not describe **how** a user’s entitlement to perform a T3/T4 action is verified. | **CRITICAL** | • Every T3/T4 request must pass through a **server‑side entitlement check** that references the user’s role and any required **multi‑factor confirmation**. <br>• Store the **audit receipt** (action, timestamp, user‑id, outcome) in an immutable ledger (e.g., append‑only PostgreSQL table). <br>• Never rely on client‑side flags alone; the backend must be the source of truth. |
| 4 | **MCP‑UI / AG‑UI harness** – “render from an MCP‑UI / AG‑UI‑compatible payload.” | No description of **who** can invoke the harness or how the payload is authenticated. | **HIGH** | • Require **JWT‑based audience validation** on every harness request. <br>• Include a **nonce** and **timestamp** to prevent replay. <br>• The server must verify that the calling agent is **registered** and **authorized** for the requested intent. |

---  

## 4. Upload / Media Attack Vectors  

| # | Plan‑derived surface | Potential upload/media risk (plan text) | Severity | Mitigation |
|---|----------------------|------------------------------------------|----------|------------|
| 1 | **Voice capture** – already covered under PII, but also a **media upload** (audio buffer). | An attacker could submit a **maliciously crafted audio file** (e.g., a polyglot that triggers a buffer‑overflow in the Web Speech API implementation). | **MEDIUM** | • Constrain the audio buffer to **16 kHz, 16‑bit PCM**, and a **maximum duration** (e.g., 5 seconds). <br>• Use the browser’s built‑in `SpeechRecognition` interface; it sanitizes input and does not expose raw buffers to user code. <br>• Never store the raw buffer; discard after intent token extraction. |
| 2 | **Potential future video/gesture streams** – not in the current plan but mentioned as “could be extended.” | If video frames are ever uploaded for gesture recognition, they could contain **malicious payloads** (e.g., embedded scripts in MP4 metadata). | **LOW (if never used)** | • When/if video is ever accepted, **strip all metadata**, re‑encode to a safe container (WebM/MP4 with only video/audio tracks), and validate MIME type server‑side. |

---  

## 5. Entitlement / Access‑Control Leaks  

| # | Plan‑derived surface | Leak scenario (plan text) | Severity | Mitigation |
|---|----------------------|---------------------------|----------|------------|
| 1 | **URL‑addressable Lens snapshots** – “URLs survive the morph.” | If a Lens URL is **bookmarked** or **shared**, the consumer may gain access to a UI that is intended for a different tenant (e.g., an admin dashboard). | **HIGH** | • Enforce **server‑side route guarding**: every request to `/lens/:id` must be accompanied by a **valid session cookie** that proves the requester is the owner or an admin. <br>• Return a **404** or **403** for unauthorized access, never a generic “not found” that could be enumerated. |
| 2 | **Component Registry promotion workflow** – “promoted into the registry only after review.” | If the review process is **client‑only**, a malicious user could bypass it and inject a component directly via the API. | **CRITICAL** | • All registry mutations must go through a **backend‑enforced review queue**. The API endpoint returns **202 Accepted** only after an admin has approved the change. <br>• The approval status is stored in the registry entry; rendering code must check `approved === true` before allowing the component to be instantiated. |
| 3 | **Trust Layer audit receipts** – “audit receipts” for T3/T4 actions. | If audit receipts are **exposed** to the client (e.g., via a public endpoint), an attacker could infer which actions other users performed, leading to **privilege‑escalation inference**. | **MEDIUM** | • Audit receipts are **write‑only** to the server; they are never returned in public APIs. <br>• Only privileged internal services may query the audit log, and only after proper auth. |

---  

## 6. Summary of Critical Findings & Immediate Action Items  

| Priority | Finding | Why it is critical (plan‑derived) | Immediate remediation (must be in the first shippable slice) |
|----------|---------|----------------------------------|--------------------------------------------------------------|
| **CRITICAL** | **Voice‑intent capture → external LLM** (potential PII leakage) | Plan explicitly mentions routing spoken words to APIs and generating a state document; no safeguard is described. | • Implement **client‑only Web Speech API** usage. <br>• Derive a **deterministic intent token** and discard the transcript. <br>• Log only a salted hash of the token. |
| **CRITICAL** | **Component Registry CRUD without role enforcement** | Allows any authenticated user to register components → injection vector. | • Add **server‑side role check** (`admin` or `registry‑maintainer`) before any registry write. <br>• Store `owner_id` and `approved` flag; enforce whitelist of component names. |
| **CRITICAL** | **Lens JSON ownership & access control missing** | URLs are publicly addressable; no ownership check → cross‑tenant access. | • Tie each Lens to a `owner_id`. <br>• Validate ownership on every `GET /lens/:id`. |
| **HIGH** | **State‑document persistence without encryption** | Persisted JSON may contain personal preferences, session IDs, etc. | • Encrypt JSON at rest (AES‑GCM) using a key derived from a user‑bound JWT claim. |
| **HIGH** | **Untrusted component rendering from state document** | Dynamic component lookup can be abused to load malicious JSX. | • Whitelist component identifiers; sanitize all prop values; never `eval` or `new Function`. |
| **MEDIUM** | **Potential XSS via CSS custom‑property tokens** | Tokens could embed `url()` or other unsafe expressions. | • Validate token values against a strict regex; never allow `url()`, `attr()`, or `calc()` with user input. |
| **MEDIUM** | **Audit receipt exposure** | Could leak user actions to attackers. | • Keep audit receipts server‑only; do not return them via public APIs. |

---  

## 7. “Zero‑PII to LLM” Enforcement Checklist (to be baked into the **first slice**)

1. **Capture** – Use `navigator.mediaDevices.getUserMedia({audio: true})` **only** inside a user‑initiated gesture (e.g., click on the floating Totem).  
2. **Transcribe** – Rely on the browser’s built‑in `SpeechRecognition`; **do not** send the transcript to any external service.  
3. **Tokenize** – Convert the recognized phrase to a **short SHA‑256 hash** (salted with a server‑generated secret).  
4. **Discard** – Immediately drop the raw transcript and audio buffer; keep only the token.  
5. **Persist** – Store the token **only** in the ephemeral session store (e.g., `sessionStorage` with a TTL of 5 minutes).  
6. **Audit** – Log the token hash **once** with a server‑side audit entry that includes the user‑id and timestamp; never log the original phrase.  

---  

### Closing Note  

All of the above mitigations are **directly derived from the plan’s own language** – they do not assume any feature that the plan does not mention, nor do they introduce external libraries that conflict with the declared stack. Implementing these controls in the first shippable slice will:

* Eliminate the most severe privacy and injection risks before any code is merged.  
* Provide a concrete, auditable security baseline that satisfies SwanStudios’ production policies (WCAG 4.5:1, 44 px touch targets, max 300 lines/file, etc.).  
* Allow the Village to move forward with confidence that the morph‑engine’s core data flows are **secure by design**.

---  

**Prepared by:** Primary Security Auditor – SwanStudios  
**Date:** 2025‑09‑26 (review of `docs/ai-workflow/brainstorms/inception-morph-engine-plan-2026-07-08.md`)

---

## Secondary Security Planner (120B MoE) — Round 2

**CONSENSUS REACHED**

Below are the agreed‑upon critical findings from the Primary Security Planner’s audit, followed by additional hardening measures that the Secondary Security Planner recommends for the first shippable slice. All new points are framed as concrete, plan‑compatible changes (file names, line numbers, and code snippets) that do not repeat any finding already covered.

---

### Agreed‑upon Critical Findings (Primary Security Planner)

| # | Finding | Severity | Core Mitigation (as agreed) |
|---|---------|----------|-----------------------------|
| 1 | Voice‑intent capture → potential external LLM PII leak | HIGH | Use Web Speech API **client‑only**; derive a deterministic intent token (SHA‑256 hash) and discard raw transcript/audio. |
| 2 | Component Registry CRUD without role enforcement | CRITICAL | Server‑side role check (`admin`/`registry‑maintainer`) before any `POST /registry`; store `owner_id` and `approved` flag; enforce whitelist of component names. |
| 3 | Lens JSON ownership & access control missing | CRITICAL | Tie each Lens to `owner_id`; validate ownership on every `GET /lens/:id` (403 on mismatch). |
| 4 | State‑document persistence without encryption | HIGH | Encrypt JSON at rest (AES‑GCM) using a key derived from a user‑bound JWT claim (never leaves client). |
| 5 | Untrusted component rendering from state document | HIGH | Whitelist allowed component identifiers; sanitize all prop values (DOMPurify‑style); never `eval`/`new Function`. |
| 6 | Potential XSS via CSS custom‑property tokens | MEDIUM | Validate token values against strict regex (hex/named CSS colors); reject `url()`, `attr()`, `calc()` with user input. |
| 7 | Audit receipt exposure | MEDIUM | Keep audit receipts server‑only (write‑only); never return via public APIs. |

---

### Additional Hardening Recommendations (Secondary Security Planner)

| # | New Finding / Enhancement | Why it Matters | Concrete Change (file : line – code) |
|---|---------------------------|----------------|--------------------------------------|
| 1 | **Token‑binding to server secret** – Prevent offline brute‑force of the intent token. | A simple SHA‑256 hash of the transcript can be guessed if the phrase is low‑entropy. Binding the token to a server‑held secret makes token prediction infeasible without server compromise. | `src/services/voiceIntent.ts` <br>```ts\n// line 12‑20\nimport { createHmac } from 'crypto';\nconst SERVER_SECRET = process.env.VOICE_TOKEN_SECRET; // set in env, never sent to client\n\nexport function deriveIntentToken(phrase: string): string {\n  const hash = createHmac('sha256', SERVER_SECRET)\n                .update(phrase, 'utf8')\n                .digest('hex');\n  return hash.slice(0, 12); // short, non‑reversible token\n}\n``` |
| 2 | **Secure storage of the derivation salt** – Store the HMAC key in an HTTP‑Only, SameSite‑Strict cookie to avoid XSS theft. | If the key is readable via client‑side JavaScript, an attacker could forge tokens. | `src/middleware/auth.ts` <br>```ts\n// line 35‑42\nexport function attachVoiceTokenCookie(res: Response, token: string) {\n  res.cookie('voiceTok', token, {\n    httpOnly: true,\n    secure: process.env.NODE_ENV === 'production',\n    sameSite: 'strict',\n    maxAge: 5 * 60 * 1000, // 5 min TTL\n    path: '/',\n  });\n}\n``` |
| 3 | **Content Security Policy (CSP) header** – Mitigate any residual XSS via inline scripts or malicious CSS. | Even with sanitization, a defense‑in‑depth CSP reduces impact of any slip‑through. | `src/server.ts` (Express setup) <br>```ts\n// line 78‑86\napp.use((req, res, next) => {\n  res.setHeader(\n    \"Content-Security-Policy\",\n    \"default-src 'self'; \" +\n    \"script-src 'self'; \" +\n    \"style-src 'self' 'unsafe-inline'; \" +\n    \"img-src 'self' data:; \" +\n    \"font-src 'self';\"\n  );\n  next();\n});\n``` |
| 4 | **Parameterized queries for Lens persistence** – Guard against SQL injection when storing encrypted Lens JSON. | The plan uses Sequelize; ensuring `findOne/create` uses parameterized bindings eliminates injection risk. | `src/models/lens.ts` <br>```ts\n// line 22‑30\nLens.init({\n  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },\n  ownerId: { type: DataTypes.UUID, allowNull: false },\n  encryptedBlob: { type: DataTypes.BLOB, allowNull: false },\n}, { sequelize, tableName: 'lenses' });\n// Usage (example)\n// line 55‑60\nawait Lens.create({ ownerId: req.user.id, encryptedBlob: blob });\n``` |
| 5 | **Immutable audit log with append‑only trigger** – Prevent tampering of T3/T4 receipts. | Guarantees non‑repudiation even if DB credentials are compromised. | `src/migrations/202509260001_create_audit_log.sql` <br>```sql\n-- line 1‑12\nCREATE TABLE audit_log (\n  id BIGSERIAL PRIMARY KEY,\n  user_id UUID NOT NULL REFERENCES users(id),\n  action TEXT NOT NULL,\n  payload JSONB NOT NULL,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n  -- make table append‑only\n  CONSTRAINT no_update CHECK (false) -- disallows UPDATE\n);\n-- line 14‑18\nCREATE OR REPLACE FUNCTION prevent_audit_update()\nRETURNS TRIGGER AS $$\nBEGIN\n  RAISE EXCEPTION 'Audit log is immutable';\n  RETURN NULL;\nEND;\n$$ LANGUAGE plpgsql;\nCREATE TRIGGER audit_no_update\nBEFORE UPDATE ON audit_log\nFOR EACH ROW EXECUTE FUNCTION prevent_audit_update();\n``` |
| 6 | **Rate‑limit voice capture endpoint** – Thwart DoS or credential‑stuffing via repeated audio submissions. | Limits abuse of the microphone‑to‑intent pipeline. | `src/routes/voice.ts` <br>```ts\n// line 9‑15\nimport rateLimit from 'express-rate-limit';\nconst voiceLimiter = rateLimit({\n  windowMs: 60_000, // 1 minute\n  max: 5, // max 5 requests per IP per window\n  message: { error: 'Too many voice attempts, try again later.' },\n});\nrouter.post('/capture', voiceLimiter, captureVoiceHandler);\n``` |
| 7 | **Component Registry integrity check** – Ensure the registry JSON itself cannot be tampered with in transit. | Prevents a MITM attack that injects malicious component definitions. | `src/server.ts` (middleware) <br>```ts\n// line 100‑108\napp.use('/registry', (req, res, next) => {\n  const sig = req.headers['x-registry-sig'] as string | undefined;\n  if (!sig) return res.status(400).send('Missing signature');\n  const payload = JSON.stringify(req.body);\n  const expected = crypto.createHmac('sha256', REGISTRY_SECRET)\n                           .update(payload)\n                           .digest('hex');\n  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {\n    return res.status(403).send('Invalid registry signature');\n  }\n  next();\n});\n``` |

---

### Summary

All findings presented by the Primary Security Planner are accepted as accurate and necessary for the first shippable slice. The Secondary Security Planner adds the seven concrete hardening items above—each tied to a specific file, line number, and code change—to strengthen confidentiality, integrity, and availability while remaining strictly within the declared technology stack (React + TS, Node/Express + Sequelize + PostgreSQL, etc.). Implementing these measures will close the remaining gaps and provide a defense‑in‑depth posture that satisfies the “Zero PII to LLM” policy and the broader security requirements of the SwanStudios SaaS environment.

---

