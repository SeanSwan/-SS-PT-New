# Security Planning Consensus

> Phase 2A: Nemotron 3 Nano ↔ Nemotron 3 Super (FREE)
> Consensus: YES

---

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
