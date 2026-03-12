# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 96.6s
> **Files:** backend/routes/galleryRoutes.mjs, backend/services/formAnalysisService.mjs
> **Generated:** 3/12/2026, 11:48:35 AM

---

# Deep Code Review: SwanStudios Gallery Backend

**Reviewer:** Principal Software Engineer (AI)  
**Target:** `backend/routes/galleryRoutes.mjs`, `backend/services/formAnalysisService.mjs`  
**Theme:** Enchanted Apex (Active) — Galaxy-Swan (Retired)

This review identifies critical production blockers, architectural weaknesses, and integration risks. The payment logic in particular requires immediate intervention.

---

## 1. Bug Detection

### 1.1. CRITICAL: Fraud Risk in Credit Purchase
**File:** `backend/routes/galleryRoutes.mjs`  
**Line:** ~440 (inside `purchase-credits`)

**What's Wrong:**
The system applies enhancement credits **immediately** upon creating the Stripe Checkout session, rather than waiting for payment confirmation (webhook). This allows a malicious user to open the checkout, cancel it, and retain the credits. The code explicitly acknowledges this with a TODO comment, but it is currently active in production logic.

```javascript
// Apply credits immediately (Stripe webhook can reconcile later if payment fails)
// For production, move this to a webhook handler for checkout.session.completed
const visitor = await GalleryVisitor.findByPk(visitorId);
if (visitor) {
  // ... adds credits here ...
}
```

**Fix:**
Remove the credit application logic from this handler. Implement a Stripe Webhook handler (e.g., `checkout.session.completed`) in a separate route (e.g., `webhooks/stripe.mjs`) and move the credit addition logic there.

---

### 1.2. HIGH: Race Condition in Credit Deduction
**File:** `backend/routes/galleryRoutes.mjs`  
**Line:** ~330 (inside `enhancement-request`)

**What's Wrong:**
The code performs a non-atomic read-modify-write on `visitor.enhancementCredits`. If two requests arrive simultaneously, both can read the same balance (e.g., 5 credits), both determine they can afford the request, and both deduct from the balance, resulting in the user spending more credits than they have.

```javascript
// Request 1 reads credits: 5
// Request 2 reads credits: 5
// Request 1 writes credits: 5 - 3 = 2
// Request 2 writes credits: 5 - 3 = 2 (Overdraft!)
```

**Fix:**
Use database-level atomic operations. Instead of reading, calculating in JS, and writing back:
```javascript
// Use Sequelize's decrement to atomically reduce credits
await visitor.decrement('enhancementCredits', { by: creditsToUse });
```
*Note: You must handle the case where `enhancementCredits` goes below zero (check balance before decrement or use a database constraint).*

---

### 1.3. HIGH: N+1 Query Performance
**File:** `backend/routes/galleryRoutes.mjs`  
**Line:** ~95 (inside `GET /events`)

**What's Wrong:**
The code fetches all events, then iterates over them to fetch cover photos one by one (or via `Promise.all` which still executes N queries). This creates massive latency under load.

```javascript
const eventsWithCovers = await Promise.all(events.map(async (event) => {
  // ... await GalleryPhoto.findByPk ... (N+1 Problem)
}));
```

**Fix:**
Use a single query with a JOIN or a `WHERE IN` clause.
```javascript
const events = await GalleryEvent.findAll({ /* ... */ });
const coverPhotoIds = events.map(e => e.coverPhotoId).filter(Boolean);
// Fetch all cover photos in one go
const coverPhotos = await GalleryPhoto.findAll({ 
  where: { id: coverPhotoIds },
  attributes: ['id', 'thumbnailUrl', 'url'] 
});
// Map manually in memory
```

---

### 1.4. MEDIUM: Hardcoded Fallback JWT Secret
**File:** `backend/routes/galleryRoutes.mjs`  
**Line:** ~30

**What's Wrong:**
Using a fallback secret (`'gallery-fallback-secret'`) in production weakens security. If the environment variable is accidentally unset, the system falls back to a known string, compromising all gallery tokens.

**Fix:**
Fail fast if the secret is missing:
```javascript
const GALLERY_JWT_SECRET = process.env.JWT_SECRET;
if (!GALLERY_JWT_SECRET) throw new Error('FATAL: JWT_SECRET not set');
```

---

## 2. Architecture Flaws

### 2.1. MEDIUM: Synchronous Dynamic Import in Hot Path
**File:** `backend/routes/galleryRoutes.mjs`  
**Line:** ~447, ~530, ~600 (Multiple locations)

**What's Wrong:**
The code uses `await import('stripe')` inside route handlers. While this ensures the import happens after the env var is loaded (if env loads asynchronously), it adds overhead to every request as the module loader caches the import. It is better to import Stripe at the top level or initialize it once at startup.

**Fix:**
Move Stripe initialization to a service file (e.g., `backend/services/stripe.mjs`) that exports a singleton instance, and import that instance at the top of `galleryRoutes.mjs`.

---

### 2.2. LOW: Unused Constants in Service
**File:** `backend/services/formAnalysisService.mjs`  
**Line:** ~10, ~15

**What's Wrong:**
`JOINT_NAMES` and `BONES` are defined at the top of the file but do not appear to be used in the visible logic of `analyzeForm` or `assessForm` (which uses string literals). If these are intended for the frontend (skeleton rendering), they should be documented or moved to a shared types file. If unused, they are dead code.

---

## 3. Integration Issues

### 3.1. CRITICAL: Incomplete Code Review (Truncation)
**File:** `backend/services/formAnalysisService.mjs`  
**Line:** ~75



---

*Part of SwanStudios 7-Brain Validation System*
