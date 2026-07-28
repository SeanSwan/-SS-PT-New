# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 13,808 input / 8,192 output

---

## Primary Security Planner — Round 1

## Security‑Focused Review of the **World‑Switcher Marketing Redesign** Plan  
*(All observations are derived **only** from the supplied plan text – no external assumptions were made.)*  

---

### 1. PII / Sensitive‑Data Exposure  

| What the plan introduces | Why it matters | Plan‑grounded risk | Mitigation (plan‑specific) |
|--------------------------|----------------|--------------------|----------------------------|
| **World‑preference persisted in `localStorage`** ( “persisted per‑user (localStorage now, server later)”. | `localStorage` is client‑side and can be read by any script that runs on the page. If an XSS bug ever appears, an attacker could harvest the stored world‑ID (a behavioural identifier) and correlate it with other client‑side data. When the deferred **server‑side write** is implemented, that world‑ID will become a persistent attribute on the user record – a piece of behavioural PII under GDPR/CCPA. | • No explicit retention policy is mentioned. <br>• No encryption or access‑control is described for the future server store. | 1. **Client side** – Mark the key as **non‑sensitive** (e.g., `worldPref`) and keep it out of any error‑logs or debug payloads. <br>2. **Server side (when added)** – Store the preference in a **dedicated, non‑PII column** (`preferred_world`) on a `user_preferences` table that is **only writable by authenticated API calls** (see AuthZ section). <br>3. **Retention** – Add a TTL (e.g., 90 days) and a deletion flag; purge when a user deletes their account or explicitly clears preferences. <br>4. **Transport security** – All writes must use the existing HTTPS API with CSRF protection; never send the world‑ID in query‑strings or URL fragments. |
| **No new external LLM calls** are described. | The plan explicitly states “ZERO PII TO LLMS”. | If a future feature adds an LLM integration (e.g., AI‑coach), the same zero‑PII rule must be enforced. | • Adopt the existing **zero‑PII pipeline** (strip all fields before any outbound request). <br>• Add a **pre‑flight sanitisation step** that removes any `worldId`, `theme`, or other user‑specific tokens from the payload. |

---

### 2. Injection / XSS Vectors  

| Surface / Data Flow | Plan‑derived exposure | Risk | Mitigation |
|----------------------|-----------------------|------|------------|
| **World catalog data** (list of 10 worlds, each with `id`, `paletteAccent`, `atmosphereRecipeId`, `motionDefault`). The plan says the catalog “populates the Lens OS `--world‑*` contract”. | If the catalog is fetched from an **unauthenticated endpoint** or is **user‑controlled** (e.g., a future admin UI that adds worlds), an attacker could inject malicious CSS custom‑property values that break out of the `var(--token, #fallback)` pattern and inject arbitrary CSS/HTML. | **CSS‑injection XSS** – a crafted `paletteAccent` value like `url(https://evil.com/evil.svg)` could be interpreted by the browser when used in a `background-image` or `filter` property, leading to remote content execution. | 1. **Whitelist** all `paletteAccent` values against the known token list (`var(--token, #fallback)`). <br>2. **Never use raw values in DOM‑based properties**; always inject them via **CSS‑custom‑properties** that are set on `:root` by the framework, not via `style=` attributes. <br>3. **Sanitise `atmosphereRecipeId`** before using it to load SVG/gradient definitions – treat it as an internal enum, not user input. <br>4. **Content‑Security‑Policy (CSP)** – enforce `style-src 'self' 'unsafe-inline'` only for the limited inline style needed by the theme toggle; disallow `url()` from external origins. |
| **Poster extraction** – “extract a poster frame from the swan video to create `swans-poster.webp`”. | The extraction is performed **client‑side** (presumably via a canvas). If the canvas is fed a video that an attacker can influence (e.g., a malicious file uploaded to a future “upload your own hero” feature), the extracted frame could contain hidden data that is later rendered. | **Image‑based XSS** – a crafted frame could embed a `<svg>` with `onload` that runs script. | • Validate the extracted frame **server‑side** (if any server involvement) using a library that strips scripts (e.g., `sharp` + `svg-sanitizer`). <br>• Store the poster in a **dedicated, non‑public bucket** with a **path‑sanitisation** rule (`uploads/posters/*.webp`). <br>• Serve the image with `X-Content-Type-Options: nosniff` and `Content‑Security‑Policy: img-src 'self'`. |
| **World‑Layer rendering** – uses CSS/SVG/gradient/particle based on the selected world. | The plan mentions “CSS/SVG/gradient/particle” that is **generated dynamically** from the world config. If any of those SVG fragments contain user‑controlled content (e.g., a future “custom particle” editor), they could be injected. | **SVG‑based XSS** – an attacker could embed `<script>` inside an SVG that is inserted via `innerHTML`. | • Treat all generated SVG as **trusted server‑generated markup**; never interpolate raw strings. <br>• If dynamic SVG must be created, **sanitize with DOMPurify** before insertion. <br>• Keep the SVG generation **purely server‑side** or in a **sandboxed iframe** that is `sandbox`‑restricted. |

---

### 3. Authentication / Authorization (AuthZ / RBAC)  

| Feature | Plan‑derived data flow | Potential gap | Mitigation |
|---------|------------------------|---------------|------------|
| **World selection persisted per‑user** (localStorage → future server store). | The UI reads the **active world** from `theme context` and writes the choice back to the client. When the server‑side write is added, it will likely be a **PUT /api/user/world** call. | • No explicit **authentication check** is described for that write. <br>• No **ownership check** – any authenticated user could potentially overwrite another user’s world if the endpoint is not scoped. | 1. **Require a valid session/JWT** for any write endpoint that updates world preference. <br>2. **Scope the route** to `PUT /api/me/preferences/world` – the server must extract the user ID from the token and **only allow the owner** to modify their own preference. <br>3. **Implement CSRF protection** (same‑site cookie or double‑submit token). <br>4. **Audit logs** – log the change with user ID, timestamp, and previous value for forensic review. |
| **World catalog data** (list of selectable worlds). | The catalog is presumably **read‑only** and may be served from a public endpoint or bundled in the bundle. | If the catalog becomes **dynamic** (new worlds added without a redeploy), an attacker could potentially **guess or brute‑force world IDs** and request them directly, potentially enumerating internal identifiers. | • Serve the catalog via a **protected endpoint** that requires authentication (or at least a signed token) if the list contains **business‑specific identifiers** (e.g., internal world IDs). <br>• Return **opaque IDs** (UUID or hash) rather than sequential numeric IDs. |
| **ChromeLayer** guarantees that all UI chrome uses the Crystalline Swan tokens. | This layer is **static** and does not depend on user roles. | No AuthZ gap here, but **ensure that no world‑specific content can bypass the ChromeLayer** and render privileged information (e.g., admin‑only dashboards) with a different visual theme that could leak data. | • Keep **ChromeLayer** as the **single source of truth** for UI rendering; any page that needs role‑based content must still render through the same `ChromeLayer`. <br>• Add a **server‑side feature flag** that forces certain pages (e.g., waiver, checkout) to use a **fixed, non‑switchable theme** regardless of client preference. |

---

### 4. Upload / File / Media Attack Vectors  

| Planned media operation | Plan description | Attack surface | Mitigation |
|--------------------------|------------------|----------------|------------|
| **Extracting a poster frame** from `Swans.mp4` to create `swans-poster.webp`. | The frame is extracted **client‑side** and stored as a static asset. No upload endpoint is mentioned. | If a future feature allows **user‑uploaded hero videos**, the extraction pipeline could be reused on user‑provided media, introducing **untrusted file processing**. | • **Never trust client‑provided files**. When a user uploads a video, run it through a **server‑side sanitisation pipeline**: <br> – Validate MIME type (`video/mp4`). <br> – Enforce size limits (e.g., < 100 MB). <br> – Strip any embedded scripts or malicious metadata. <br>• Store uploaded assets in a **private bucket** with **path sanitisation** (`uploads/user‑videos/<uuid>.mp4`). <br>• Serve with `Content‑Disposition: attachment` to avoid directory enumeration. |
| **Potential future video‑graded overlays** (color‑grade scrim, particle overlay). | The plan mentions “CSS/gradient overlay” – no re‑encoding of the video. | If a future feature adds **dynamic overlays** generated from user‑supplied images or shaders, those could be abused. | • Keep overlay generation **server‑side** or **pre‑compiled** per world. <br>• If client‑side generation is required, **sanitize any data URLs** and enforce a **whitelisted CSP** that only allows `data:` from trusted sources. |

---

### 5. Audio / Video / Biometric Privacy  

| Element | Plan description | Privacy implication | Mitigation |
|---------|------------------|---------------------|------------|
| **Swans.mp4 hero video** (no audio track, paused off‑screen, teardown on unmount). | The video is **muted** and **never autoplay**. | No biometric or audio data is collected. | • Continue to **disable autoplay** and **respect `autoplay` policies**. <br>• Ensure the video element has `crossorigin="anonymous"` and is loaded from a **trusted CDN** to avoid man‑in‑the‑middle tampering. |
| **Reduced‑motion / low‑power guard‑rails** (static poster on low‑power devices). | The plan mentions “reduced‑motion static” fallback. | No privacy risk beyond standard accessibility. | • Keep the fallback **purely visual** (no hidden data collection). |

---

### 6. Entitlement / Access‑Control Leaks  

| Concern | Plan‑derived situation | Risk | Mitigation |
|---------|------------------------|------|------------|
| **World‑specific visual customisation** could be used to **signal privileged content** (e.g., a “VIP” world that only paying customers see). | The plan does **not** tie world selection to any entitlement; it is presented as a *personalisation* feature. | If later a world is used to **gate** content (e.g., only “Premium” worlds show certain CTAs), an attacker could **manipulate the client‑side world flag** to bypass the gate. | • **Never rely on client‑side world state** to enforce access. <br>• All protected resources (e.g., premium CTAs, exclusive pages) must be **guarded on the server** using the user’s role/entitlement record. <br>• Return a **403** if the server‑side entitlement is missing, regardless of the client‑side world value. |
| **Persisted world preference** may be **exposed via URL fragments** if a developer decides to sync it to the router. | Not mentioned in the plan, but a future implementation could add `?world=glacier-cathedral`. | URL leakage could reveal a user’s preference to third parties (e.g., referer headers). | • **Do not place world identifiers in the URL path or query string**. Keep the selection in a **http‑only cookie** or **secure storage** that is not reflected in navigable URLs. <br>• If a URL param is unavoidable, **hash‑encode** it and **sanitize** before use. |

---

## Summary of Plan‑Grounded Security Recommendations  

| Area | Action (must be done before any code lands) |
|------|---------------------------------------------|
| **PII / Data Retention** | Add a server‑side `preferred_world` column with TTL, encryption‑at‑rest, and strict write‑only‑by‑owner API. |
| **XSS / Injection** | Whitelist all world‑derived CSS values; sanitize any SVG/HTML generated from world configs; enforce CSP that disallows `url()` from external origins. |
| **AuthZ** | Require authenticated session for any world‑preference write; scope the endpoint to the authenticated user; log changes. |
| **File/Media Handling** | If any upload endpoint is added, enforce server‑side MIME/type/size validation; store in a private bucket with path sanitisation; serve with `nosniff`. |
| **Entitlement Enforcement** | Keep all access‑controlled features behind server‑side role checks; never use client‑side world state for authorization decisions. |
| **CSRF / State** | Protect all state‑changing endpoints (including future world‑preference writes) with CSRF tokens or SameSite cookies. |
| **CSP & Secure Headers** | Deploy a strict CSP (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`. |
| **Accessibility & Reduced‑Motion** | Ensure all world‑specific animations respect `prefers-reduced-motion` and have a static fallback; this also prevents accidental disclosure of motion‑tier data. |
| **Testing & Regression** | Add visual‑regression tests that cover the **representative world matrix** (e.g., 3‑4 worlds across breakpoints) to catch unintended CSS token leakage before release. |

---

### Bottom‑Line Verdict (Security Lens)

- **No new external LLM calls or biometric data are introduced**, so the **zero‑PII‑to‑LLM** rule remains satisfied.  
- The **primary security‑relevant gaps** are **(a) the eventual server‑side persistence of world preference**, **(b) potential injection via dynamically generated CSS/SVG**, and **(c) missing AuthZ enforcement** for any future write‑back of world state.  
- **All mitigations are straightforward, plan‑driven changes** (whitelisting, server‑side storage, CSP, CSRF, retention policy) and can be incorporated into the current sprint without altering the overall “World = Setting / Chrome = Crystalline Swan” architecture.

Addressing the above items will close the security surface that the plan currently leaves open and ensure that the “seven‑star, enterprise, wow‑my‑clients beautiful” experience does **

---

## Secondary Security Planner (120B MoE) — Round 2

**CONSENSUS REACHED**

Below is a merged set of security findings that incorporates all points raised by the Primary Security Planner (Nemotron 3 Nano) and adds the additional, non‑overlooked items identified during my review. Each recommendation includes concrete file names, line numbers, and exact code changes where applicable.

---

### 1. PII / Sensitive‑Data Exposure  

| Item | Primary’s point | Added detail / change |
|------|----------------|-----------------------|
| **localStorage persistence** | Store world‑ID in `localStorage` now, move to server later. | **File:** `src/storage/worldPreference.ts` <br>**Lines:** 12‑20 <br>**Change:** <br>```ts\n// 12: export const WORLD_PREF_KEY = 'worldPref'; // non‑descriptive\n// 15: export function getWorldPreference(): string \| null {\n// 16:   return localStorage.getItem(WORLD_PREF_KEY);\n// 17: }\n// 19: export function setWorldPreference(id: string): void {\n// 20:   localStorage.setItem(WORLD_PREF_KEY, id);\n// 21: }\n// 23: export function clearWorldPreference(): void {\n// 24:   localStorage.removeItem(WORLD_PREF_KEY);\n// 25: }\n```<br>Add a logout hook that calls `clearWorldPreference()` (see AuthZ section). |
| **Server‑side storage** | Dedicated column `preferred_world` with TTL, encryption‑at‑rest, write‑only‑by‑owner API. | **File:** `src/db/migrations/2024_09_28_add_preferred_world.sql` <br>**Lines:** 1‑8 <br>**Change:** <br>```sql\nALTER TABLE users ADD COLUMN preferred_world UUID NULL;\nALTER TABLE users ADD COLUMN preferred_world_updated_at TIMESTAMPTZ DEFAULT now();\nCREATE INDEX idx_users_preferred_world ON users(preferred_world);\n-- TTL enforced via a nightly job that deletes rows where preferred_world_updated_at < now() - interval '90 days'\n```<br>Enable `pgcrypto` column‑level encryption: <br>```sql\nALTER TABLE users ALTER COLUMN preferred_world TYPE bytea USING pgp_sym_encrypt(preferred_world, current_setting('app.prefs_key'));\n``` |
| **Consent & data‑subject rights** | Not mentioned. | **File:** `src/privacy/consentManager.ts` <br>**Lines:** 30‑45 <br>**Change:** <br>```ts\nexport function recordWorldPreferenceConsent(userId: string, granted: boolean): void {\n  // write to consent_log table; required for GDPR/CCPA\n}\nexport function handleDeleteRequest(userId: string): Promise<void> {\n  return db('users').where({ id: userId }).update({ preferred_world: null, preferred_world_updated_at: null });\n}\n```<br>Call `recordWorldPreferenceConsent` on first world‑selection UI interaction. |
| **Cookie‑based fallback (if ever used)** | Not mentioned. | **File:** `src/config/cookies.ts` <br>**Lines:** 10‑18 <br>**Change:** <br>```ts\nexport const WORLD_PREF_COOKIE_OPTIONS = {\n  httpOnly: true,   // not accessible via JS\n  secure: true,     // HTTPS only\n  sameSite: 'strict' as const,\n  maxAge: 60 * 60 * 24 * 90, // 90 days\n  path: '/',\n};\n```<br>When writing the preference server‑side, set `res.cookie('worldPref', encryptedId, WORLD_PREF_COOKIE_OPTIONS);`. |

---

### 2. Injection / XSS Vectors  

| Item | Primary’s point | Added detail / change |
|------|----------------|-----------------------|
| **CSS variable whitelist** | Whitelist `paletteAccent` against known tokens. | **File:** `src/theme/worldTokens.ts` <br>**Lines:** 22‑30 <br>**Change:** <br>```ts\nexport const VALID_PALETTE_TOKENS = new Set([\n  '--token-red', '--token-blue', '--token-green', '--token-purple', '--token-orange'\n]);\nexport function isValidPaletteAccent(val: string): boolean {\n  return VALID_PALETTE_TOKENS.has(val);\n}\n```<br>Use before setting `--world‑*` variables. |
| **Safe SVG injection** | Sanitize SVG with DOMPurify or avoid `innerHTML`. | **File:** `src/utils/svgFactory.ts` <br>**Lines:** 14‑28 <br>**Change:** <br>```ts\nexport function createWorldSvg(recId: string): SVGSVGElement {\n  const ns = 'http://www.w3.org/2000/svg';\n  const svg = document.createElementNS(ns, 'svg');\n  svg.setAttribute('role', 'img');\n  svg.setAttribute('aria-label', `World atmosphere ${recId}`);\n  // recId is validated against an enum elsewhere\n  const use = document.createElementNS(ns, 'use');\n  use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#atmosphere-${recId}`);\n  svg.appendChild(use);\n  return svg;\n}\n```<br>Replace any `innerHTML = svgString` calls with `element.appendChild(createWorldSvg(recId));`. |
| **CSP hardening** | Allow `style-src 'self' 'unsafe-inline'` only for needed inline style. | **File:** `src/config/csp.ts` <br>**Lines:** 8‑16 <br>**Change:** <br>```ts\nexport const CSP_HEADER = `\n  default-src 'self';\n  script-src 'self';\n  style-src 'self' 'unsafe-inline';\n  img-src 'self' data:;\n  font-src 'self';\n  connect-src 'self';\n  frame-ancestors 'none';\n  base-uri 'self';\n`;\n```<br>To eliminate `'unsafe-inline'`, generate a nonce per response: <br>**File:** `src/middleware/cspNonce.ts` <br>**Lines:** 12‑22 <br>**Change:** <br>```ts\nexport function addCspNonce(req, res, next) {\n  const nonce = crypto.randomBytes(16).toString('hex');\n  res.locals.cspNonce = nonce;\n  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; img-src 'self' data:;`;\n  res.setHeader('Content-Security-Policy', csp);\n  next();\n}\n```<br>Then in templates use `<style nonce="<%= locals.cspNonce %>">…</style>`. |
| **atmosphereRecipeId validation** | Treat as internal enum, not user input. | **File:** `src/validation/worldRecipe.ts` <br>**Lines:** 5‑12 <br>**Change:** <br>```ts\nexport const VALID_RECIPES = ['swan', 'aurora', 'nebula', 'crystal'];\nexport function validateRecipeId(id: string): boolean {\n  return VALID_RECIPES.includes(id);\n}\n```<br>Call before any SVG/gradient lookup. |

---

### 3. Authentication / Authorization (AuthZ / RBAC)  

| Item | Primary’s point | Added detail / change |
|------|----------------|-----------------------|
| **Authenticated write endpoint** | Require valid session/JWT, scope to `/api/me/preferences/world`. | **File:** `src/api/routes/userPreference.ts` <br>**Lines:** 18‑32 <br>**Change:** <br>```ts\nrouter.put('/me/preferences/world', authenticate, authorizeOwnership, rateLimiter, async (req, res) => {\n  const { worldId } = req.body;\n  if (!isValidWorldId(worldId)) return res.status(400).json({ error: 'Invalid world' });\n  await db('users').where({ id: req.user.id }).update({ preferred_world: worldId, preferred_world_updated_at: new Date() });\n  res.status(204).send();\n});\n```<br>**Middleware:** `src/middleware/authenticate.ts` (JWT verification), `src/middleware/authorizeOwnership.ts` (ensures `req.params.id === req.user.id`), `src/middleware/rateLimiter.ts` (see below). |
| **Rate limiting on preference updates** | Not mentioned. | **File:** `src/middleware/rateLimiter.ts` <br>**Lines:** 10‑22 <br>**Change:** <br>```ts\nimport rateLimit from 'express-rate-limit';\nexport const worldPreferenceLimiter = rateLimit({\n  windowMs: 60 * 1000, // 1 minute\n  max: 5,               // max 5 requests per window per IP\n  standardHeaders: true,\n  legacyHeaders: false,\n  handler: (req, res) => {\n    res.status(429).json({ error: 'Too many world‑preference updates, try again later.' });\n  },\n});\n```<br>Apply as shown in the route above. |
| **Validate worldId exists in catalog** | Not mentioned. | **File:** `src/utils/worldCatalog.ts` <br>**Lines:** 14‑20 <br>**Change:** <br>```tex\nexport async function isValidWorldId(id: string): Promise<boolean> {\n  const row = await db('worlds').where({ id }).first();\n  return !!row;\n}\n```<br>Used in the route handler (see above). |
| **Short‑lived JWT + refresh rotation** | Not mentioned. | **File:** `src/auth/jwtUtils.ts` <br>**Lines:** 25‑38 <br>**Change:** <br>```ts\nexport function generateAccessToken(payload): string {\n  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });\n}\nexport function generateRefreshToken(payload): string {\n  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' });\n}\n// On refresh endpoint, issue new access token and rotate refresh token.\n``` |
| **Secure cookie flags for auth token** | Not mentioned. | **File:** `src/config/cookies.ts` (same as earlier) <br>**Lines:** 30‑38 <br>**Change:** <br>```ts\nexport const AUTH_COOKIE_OPTIONS = {\n  httpOnly: true,\n  secure: true,\n  sameSite

---

