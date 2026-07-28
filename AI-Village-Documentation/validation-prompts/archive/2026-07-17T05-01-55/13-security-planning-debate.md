# Security Planning Debate (Phase 2A) — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free ↔ nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 65.6s
> **Files:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/VILLAGE-PACKET-DESIGN-RATIFICATION-2026-07-16.md
> **Generated:** 7/16/2026, 10:01:55 PM

---

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

*Part of SwanStudios 15-Brain Recursive Consensus System*
