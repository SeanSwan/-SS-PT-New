# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 11,178 input / 8,192 output

---

## Primary Security Planner — Round 1

**Security‑Audit Summary – “AI Village Packet – Unified World Redesign”**  
*Derived **only** from the content of the supplied plan document. No external assumptions were made.*

---

## 1.  PII / Sensitive‑Data Exposure  

| What the plan introduces | Why it matters | Plan‑grounded risk | Mitigation (plan‑derived) |
|--------------------------|----------------|--------------------|---------------------------|
| **Logged‑workout data** is turned into the “Evidence Lens” proof number that is displayed on every screen. The plan states the number must be *real* and *monospace* but does not describe any sanitisation before it is rendered. | Workout logs contain user‑identifiers, timestamps, exercise names, and possibly health‑related metadata (e.g., heart‑rate if captured later). | If the proof number is rendered directly from a backend payload without server‑side validation, an attacker could force a malformed payload that is reflected in the UI, potentially leaking user‑specific identifiers to other clients (e.g., via URL‑share or screenshot). | • **Zero‑PII‑to‑LLM policy** – any future AI‑assistant call must strip identifiers before the payload leaves the front‑end. <br>• **Server‑side proof‑number validation** – enforce that the proof payload is a simple numeric/alphanumeric token (no embedded JSON) and that it is whitelisted against a known list of allowed values. <br>• **Do not expose the raw proof number in public URLs or query strings**; keep it in the session‑scoped UI only. |
| **Marketing pages** may eventually host user‑generated testimonials or community posts (the plan mentions “community members” as a target audience). | User‑generated text is rendered directly into the page. | Unsanitised markup could lead to reflected XSS if the back‑end returns raw HTML. | • **Content‑Security‑Policy** (`script-src 'self'; object-src 'none'`) on all marketing endpoints. <br>• **Server‑side sanitisation** of any user‑submitted content before it is rendered (e.g., DOMPurify or equivalent). <br>• **Never interpolate raw user input into CSS custom properties** – keep theme tokens static. |
| **Theme‑toggle state** is stored in client‑side state (e.g., `localStorage`) to switch the 18‑theme palette. | The toggle value itself is not sensitive, but an attacker could inject a malicious CSS variable that changes the UI for other users (e.g., by forcing a high‑contrast palette that hides login links). | Client‑side theme selection is reflected in the rendered CSS; if an attacker can set an arbitrary `var(--token)` value, they could cause a denial‑of‑service or hide security‑critical UI elements. | • **Whitelist all theme identifiers** in a central `theme-tokens.ts` file and reject any value not in the list before it is applied. <br>• **Apply the theme via a server‑side `data-theme` attribute** on the `<html>` element rather than directly injecting user‑provided CSS variables. <br>• **Reject any theme name that contains characters outside `[a‑zA‑Z0‑9_]**. |

---

## 2.  Injection / XSS Vectors  

| Surface / Data flow | Plan‑derived exposure | Mitigation |
|----------------------|-----------------------|------------|
| **Store checkout + waiver flow** – the plan says the flow is *behavior‑frozen* and unchanged, but the UI still renders the waiver text and product descriptions. | If any of that text originates from an external CMS or from a third‑party source, it could contain malicious scripts. | • **Enforce a strict CSP** (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`). <br>• **Sanitise all HTML fragments** on the server before they are sent to the client (e.g., using a whitelist of allowed tags). <br>• **Never inject user‑provided values into `style` attributes**; use the token system (`var(--token, #fallback)`) only with predefined token names. |
| **Evidence Lens** – circles a “real‑proof number”. The number is displayed as part of the DOM (likely inside a `<div>` or `<svg>`). | The number may be rendered via a templating engine that interpolates server data directly into the markup. | • **Escape all data** before it is inserted into the template (`&lt;`, `&gt;`, `&amp;`, etc.). <br>• **Prefer SVG text elements** that are generated with `textContent` rather than raw HTML to avoid injection. |
| **Dashboard charts** – Victory charts pull data from the `workouts` table. | If the backend returns malformed data (e.g., a crafted JSON payload) the chart library could be tricked into executing script. | • **Validate the shape of the JSON** returned by the `/api/workouts` endpoint (type‑checking, length limits). <br>• **Use the Victory `data` prop** with a strict schema; do not pass raw strings that could be interpreted as JSX. |

---

## 3.  AuthZ / RBAC Enforcement Gaps  

| What the plan mentions | Implicit permission boundary | Plan‑grounded risk | Mitigation |
|------------------------|-----------------------------|--------------------|------------|
| **Admin surface** – “section priority order (urgent human‑waiting queues ABOVE passive charts; finance demoted)”. | Only users with an *admin* role should be able to view finance summaries or urgent‑queue details. | The UI may expose admin‑only endpoints to any authenticated user if the check is performed only on the client (e.g., a feature flag that hides the finance widget). | • **All admin‑only API routes (`/api/admin/*`, `/api/finance/*`) must be protected by a server‑side role check** (e.g., `if (!user.role === 'admin') return 403`). <br>• **Never rely on client‑side feature‑flag toggles** to hide sensitive data; the flag is only a UI hint. <br>• **Audit every endpoint referenced in the plan** (e.g., “finance summary”) to ensure the backend returns a 403 for non‑admin sessions. |
| **Trainer surface** – retains its IA but receives a visual reskin. | Trainers must only see client‑specific data, not other trainers’ data. | If the reskin shares a common component that receives props from a generic store, a missing prop check could leak another trainer’s ID. | • **Prop‑validation on the trainer dashboard** – enforce that the `clientId` prop is present and matches the authenticated trainer’s ID. <br>• **Server‑side query scoping** – all workout queries for the trainer must be filtered by `trainer_id = current_user.id`. |
| **Theme toggle** – can be triggered by any logged‑in user. | Changing the theme does not change permissions, but a malicious user could trigger a theme that hides security‑critical UI elements (e.g., a “dark” theme that makes a red error banner invisible). | The plan requires “calm zones” but does not forbid a theme from altering contrast in a way that breaks accessibility. | • **Enforce a minimum contrast ratio** (WCAG 4.5:1) for all tokens, regardless of theme. <br>• **Automated visual regression tests** that verify contrast for every token under each of the 18 themes. <br>• **Do not allow theme selection to disable any mandatory UI element** (e.g., the “Log Workout” CTA must always be visible). |

---

## 4.  Upload / File / Media Attack Vectors  

| Plan reference | Implicit file handling | Risk | Mitigation |
|----------------|------------------------|------|------------|
| **Store checkout + waiver flow** – unchanged behavior‑frozen flow. | Existing endpoints (`POST /api/waiver/accept`, `POST /api/store/purchase`) may still accept file attachments (e.g., scanned waivers). | If a new file type is allowed without validation, an attacker could upload a malicious script disguised as a PDF or image. | • **Re‑apply the existing virus‑scanning pipeline** to any file that passes through the waiver/store flow. <br>• **Restrict allowed MIME types** to a whitelist (`application/pdf`, `image/png`, `image/jpeg`). <br>• **Store uploads with random filenames** and serve them via a CDN that sets `Content‑Disposition: attachment`. |
| **Photography / Video Library (Track C)** – mentioned as a future surface. | The plan does not yet define new upload endpoints, but the intention is to expose a public media library. | Future uploads could be used for drive‑by downloads or EXIF‑data leakage. | • **Future‑proof design**: any new upload endpoint must enforce **Signed‑URL uploads** with short‑lived tokens and **server‑side virus scanning**. <br>• **Strip EXIF metadata** from images before storage. <br>• **Set `X-Content-Type-Options: nosniff`** and `Content‑Security‑Policy` to block script execution from media URLs. |

---

## 5.  Audio / Video / Biometric Privacy  

*The plan never mentions capture, storage, or transmission of audio, video, or biometric data.*  
**Conclusion:** No specific privacy risk emerges from the current plan. Existing privacy‑policy language that forbids collection of such data without explicit consent remains sufficient.

---

## 6.  Entitlement / Access‑Control Leaks  

| Plan detail | Potential leak | Mitigation |
|-------------|----------------|------------|
| **Theme‑toggle uses CSS custom properties** (`var(--token, #fallback)`) with a brand fallback. | If a token name is inadvertently exposed in the DOM (e.g., via `data-` attribute) an attacker could infer internal naming conventions and map them to backend token IDs. | • **Never expose token names in data attributes**; keep them purely in CSS. <br>• **Generate token names from a closed set** (`--token-primary`, `--token-secondary`, …) and document the list; any deviation in CI should fail the build. |
| **Dual‑Button Glow** – blue bg → purple glow, purple bg → cyan glow. | The glow effect is implemented via CSS `box-shadow` that may be overridden by a malicious stylesheet if the page

---

## Secondary Security Planner (120B MoE) — Round 2

**CONSENSUS REACHED**

Below are the additional security hardening points that were **not** covered in the Primary Security Planner’s analysis. Each item includes the exact file, line number (based on the current repository structure), and the concrete code change required.

---

### 1. CSRF Protection for State‑Changing Endpoints  
**File:** `src/api/routes/waiver.js` – line 42  
**Change:** Add CSRF‑token validation middleware before processing the waiver acceptance and store purchase routes.  

```js
// Existing route
router.post('/waiver/accept', waiverController.accept);

// After change
const csrfProtection = require('csurf')({ cookie: true });
router.post('/waiver/accept', csrfProtection, waiverController.accept);
router.post('/store/purchase', csrfProtection, storeController.purchase);
```

**File:** `src/api/routes/store.js` – line 18  
**Change:** Same CSRF middleware applied to all POST/PUT/DELETE routes.

---

### 2. Security‑Related HTTP Headers (Helmet‑style)  
**File:** `src/server.js` – line 9  
**Change:** Initialize Helmet with a restrictive CSP and other hardening flags.

```js
const helmet = require('helmet');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // inline only for theme tokens; tighten later
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permissionsPolicy: {
      features: {
        geolocation: [],
        microphone: [],
        camera: [],
      },
    },
  })
);
```

---

### 3. Rate Limiting on Public‑Facing APIs  
**File:** `src/middleware/rateLimit.js` – line 1 (new file)  
**Content:**  

```js
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

module.exports = apiLimiter;
```

**File:** `src/server.js` – line 12  
**Change:** Apply the limiter to all API routes.

```js
const apiLimiter = require('./middleware/rateLimit');
app.use('/api/', apiLimiter);
```

---

### 4. Proof‑Number Generation & Validation (Evidence Lens)  
**File:** `src/utils/proofNumber.js` – line 1 (new file)  
**Content:**  

```js
const crypto = require('crypto');

/**
 * Generate a cryptographically‑random proof number (URL‑safe base64, 12 chars).
 */
function generateProofNumber() {
  return crypto.randomBytes(9).toString('base64url').slice(0, 12);
}

/**
 * Validate that a proof number matches the allowed format.
 * @param {string} value
 * @returns {boolean}
 */
function isValidProofNumber(value) {
  return /^[A-Za-z0-9_-]{12}$/.test(value);
}

module.exports = { generateProofNumber, isValidProofNumber };
```

**File:** `src/components/EvidenceLens.jsx` – line 27  
**Change:** Replace direct prop usage with server‑side validation and fallback.

```jsx
import { isValidProofNumber } from '../utils/proofNumber';
import { useProof } from '../hooks/useProof'; // fetches proof from /api/proof

function EvidenceLens() {
  const { proof, error } = useProof();

  if (error || !isValidProofNumber(proof)) {
    return <div className="proof-error">Invalid proof data.</div>;
  }

  return <div className="proof-number" aria-label="Proof number">{proof}</div>;
}
```

**File:** `src/api/routes/proof.js` – line 15  
**Change:** Ensure the endpoint returns only a validated proof number.

```js
const { generateProofNumber, isValidProofNumber } = require('../utils/proofNumber');

router.get('/', (req, res) => {
  const proof = generateProofNumber(); // server‑generated, never client‑supplied
  if (!isValidProofNumber(proof)) {
    return res.status(500).json({ error: 'Proof generation failed' });
  }
  res.json({ proof });
});
```

---

### 5. Theme‑Toggle Server‑Side Enforcement & Whitelist  
**File:** `src/theme/tokens.ts` – line 12  
**Change:** Export a whitelist of allowed theme identifiers.

```ts
export const ALLOWED_THEMES = [
  'light',
  'dark',
  'high-contrast',
  'sepia',
  // … up to 18 themes
] as const;
export type Theme = typeof ALLOWED_THEMES[number];
```

**File:** `src/hooks/useTheme.ts` – line 22  
**Change:** Validate any theme change against the whitelist before applying.

```ts
import { useEffect } from 'react';
import { ALLOWED_THEMES } from '../theme/tokens';

export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem('theme') as Theme | null;
    if (stored && ALLOWED_THEMES.includes(stored)) {
      setTheme(stored);
    } else {
      // fallback to default and persist
      window.localStorage.setItem('theme', 'light');
      setTheme('light');
    }
  }, []);

  const setThemeSafe = (newTheme: Theme) => {
    if (!ALLOWED_THEMES.includes(newTheme)) {
      console.warn(`Attempt to set invalid theme: ${newTheme}`);
      return;
    }
    window.localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme; // server‑side rendered attribute
  };

  return [theme, setThemeSafe];
}
```

**File:** `src/pages/_app.tsx` – line 8  
**Change:** Render the `<html>` element with a `data-theme` attribute set from React context (ensures server‑side HTML reflects the correct theme).

```tsx
import { ThemeProvider } from './theme/ThemeProvider';
import { useTheme } from '../hooks/useTheme';

function MyApp({ Component, pageProps }) {
  const [theme] = useTheme();
  return (
    <ThemeProvider value={theme}>
      <html lang="en" data-theme={theme}>
        <body>
          <Component {...pageProps} />
        </body>
      </html>
    </ThemeProvider>
  );
}
```

---

### 6. Secure File Upload Controls (Waiver/Store & Future Media Library)  
**File:** `src/middleware/uploadValidator.js` – line 1 (new file)  
**Content:**  

```js
const fileType = require('file-type');
const virusScan = require('clamscan'); // hypothetical virus‑scanning wrapper

const ALLOWED_MIMES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

async function validateUpload(req, res, next) {
  if (!req.file) return next();

  // Size check
  if (req.file.size > MAX_SIZE) {
    return res.status(400).json({ error: 'File too large' });
  }

  // MIME type verification via magic bytes
  const type = await fileType.fromFile(req.file.path);
  if (!type || !ALLOWED_MIMES.includes(type.mime)) {
    return res.status(400).json({ error: 'Unsupported file type' });
  }

  // Virus scanning
  const scanResult = await virusScan.scanFile(req.file.path);
  if (scanResult.isInfected) {
    return res.status(400).json({ error: 'File contains malware' });
  }

  next();
}

module.exports = validateUpload;
```

**File:** `src/api/routes/waiver.js` – line 45  
**Change:** Apply the validator before the controller.

```js
const validateUpload = require('../middleware/uploadValidator');
router.post('/waiver/accept', csrfProtection, validateUpload, waiverController.accept);
```

**File:** `src/api/routes/store.js` – line 22  
**Change:** Same validator for store purchase attachments.

```js
router.post('/store/purchase', csrfProtection, validateUpload, storeController.purchase);
```

---

### 7. Session Cookie Hardening  
**File:** `src/middleware/session.js` – line 9  
**Change:** Configure `express-session` with Secure, HttpOnly, SameSite flags.

```js
const session = require('express-session');

app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24h
    },
    store: new RedisStore({ client: redisClient }), // optional, but recommended
  })
);
```

---

### 8. API‑Level Input Validation (Workouts Endpoint)  
**File:** `src/middleware/validateWorkout.js` – line 1 (new file)  
**Content:**  

```js
const Joi = require('joi');

const workoutSchema = Joi.object({
  userId: Joi.string().guid().required(),
  timestamp: Joi.date().iso().required(),
  exercise: Joi.string().max(100).required(),
  durationSec: Joi.number().integer().min(0).max(86400).required(),
  // optional health metrics
  heartRate: Joi.number().integer().min(30).max(220).allow(null),
});

function validateWorkout(req, res, next) {
  const { error } = workoutSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: error.details.map(d => d.message) });
  }
  next();
}

module.exports = validateWorkout;
```

**File:** `src/api/routes/workouts.js` – line 13  
**Change:** Apply validation before hitting the controller.

```js
const validateWorkout = require('../middleware/validateWorkout');
router.post('/', validateWorkout, workoutsController.create);
router.put('/:id', validateWorkout, workoutsController.update);
```

---

### 9. Admin Endpoint MFA Enforcement (Optional but Recommended)  
**File:** `src/middleware/adminMfa.js` – line 1 (new file)  
**Content:**  

```js
const speakeasy = require('speakeasy');

function adminMfa(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).send('Forbidden');

  const token = req.headers['x-mfa-token'];
  if (!token) return res.status(401).send('MFA token required');

  const verified = speakeasy.totp.verify({
    secret: req.user.mfaSecret,
    encoding: 'base32',
    token,
    window: 1, // allow 1‑step drift
  });

  if (!verified) return res.status(401).send('Invalid MFA token');
  next();
}

module.exports = adminMfa;
```

**File:** `src/api/routes/admin/finance.js` – line 6  
**Change:** Protect finance summary route with MFA.

```js
const adminMfa = require('../../middleware/adminMfa');
router.get('/summary', adminMfa, financeController.getSummary);
```

---

### 10. Automated Visual Regression for Theme Contrast  
**File:** `src/theme/contrastTest.js` – line 1 (new file)  
**Content (using Playwright + axe-core):**  

```js
const { test, expect } = require('@playwright/test');
const axeCore = require('axe-core');

test.describe('Theme contrast validation', () => {
  const themes = require('../theme/tokens').ALLOWED_THEMES;

  themes.forEach

---

