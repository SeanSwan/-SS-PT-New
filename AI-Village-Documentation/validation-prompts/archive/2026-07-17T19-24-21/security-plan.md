# Security Planning Consensus

> Phase 2A: Nemotron 3 Nano ↔ Nemotron 3 Super (FREE)
> Consensus: YES

---

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
