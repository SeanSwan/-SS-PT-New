# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 49.5s
> **Files:** backend/routes/galleryRoutes.mjs, backend/services/formAnalysisService.mjs
> **Generated:** 3/12/2026, 11:48:35 AM

---

# Code Review: SwanStudios Gallery Routes & Form Analysis Service

## CRITICAL Issues

### 1. **Hardcoded Secrets & Missing Environment Variable Validation**
**File:** `backend/routes/galleryRoutes.mjs` (Line 30)  
**Severity:** CRITICAL

```javascript
const GALLERY_JWT_SECRET = process.env.JWT_SECRET || 'gallery-fallback-secret';
```

**Issue:** Fallback to hardcoded secret in production is a **critical security vulnerability**. If `JWT_SECRET` is missing, all gallery tokens can be forged.

**Fix:**
```javascript
const GALLERY_JWT_SECRET = process.env.JWT_SECRET;
if (!GALLERY_JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}
```

---

### 2. **Race Condition in Credit Deduction**
**File:** `backend/routes/galleryRoutes.mjs` (Lines 329-345)  
**Severity:** CRITICAL

```javascript
// Process the enhancements
const created = [];
for (const photoId of newPhotoIds) {
  const [request, wasCreated] = await EnhancementRequest.findOrCreate({...});
  if (wasCreated) {
    created.push(request);
    await GalleryPhoto.increment('enhancementRequestCount', { where: { id: photoId } });
  }
}

// Deduct credits
if (freeToUse > 0) {
  const updatedFreeUsed = { ...(visitor.freeEnhancementsUsed || {}), [eventKey]: freeUsed + freeToUse };
  await visitor.update({ freeEnhancementsUsed: updatedFreeUsed });
}
```

**Issue:** Credits are deducted **after** creating enhancement requests. If the process crashes between creation and deduction, users get free enhancements. No database transaction wrapping.

**Fix:**
```javascript
const transaction = await sequelize.transaction();
try {
  // 1. Deduct credits first
  if (freeToUse > 0) {
    await visitor.update({ freeEnhancementsUsed: updatedFreeUsed }, { transaction });
  }
  if (creditsToUse > 0) {
    await visitor.update({ 
      enhancementCredits: visitor.enhancementCredits - creditsToUse 
    }, { transaction });
  }

  // 2. Create requests
  for (const photoId of newPhotoIds) {
    await EnhancementRequest.create({...}, { transaction });
    await GalleryPhoto.increment('enhancementRequestCount', { 
      where: { id: photoId }, 
      transaction 
    });
  }

  await transaction.commit();
} catch (err) {
  await transaction.rollback();
  throw err;
}
```

---

### 3. **Stripe Payment Applied Before Confirmation**
**File:** `backend/routes/galleryRoutes.mjs` (Lines 426-440)  
**Severity:** CRITICAL

```javascript
// Apply credits immediately (Stripe webhook can reconcile later if payment fails)
// For production, move this to a webhook handler for checkout.session.completed
const visitor = await GalleryVisitor.findByPk(visitorId);
if (visitor) {
  if (pkg === 'vip') {
    await visitor.update({ isVip: true });
  } else {
    await visitor.update({ enhancementCredits: visitor.enhancementCredits + pricing.credits });
  }
}
```

**Issue:** Credits/VIP status granted **before payment confirmation**. Comment acknowledges this but code is in production. Users can cancel payment and keep benefits.

**Fix:**
```javascript
// DO NOT apply credits here — only create a pending record
await CreditPurchase.create({
  visitorId,
  package: pkg,
  credits: pricing.credits,
  stripeSessionId: session.id,
  status: 'pending',
});

// Credits applied in webhook handler on checkout.session.completed
```

---

### 4. **SQL Injection via Sequelize `literal()`**
**File:** `backend/routes/galleryRoutes.mjs` (Lines 663-664)  
**Severity:** CRITICAL

```javascript
[fn('SUM', literal("CASE WHEN vote_type = 1 THEN 1 ELSE 0 END")), 'thumbsUp'],
[fn('SUM', literal("CASE WHEN vote_type = -1 THEN 1 ELSE 0 END")), 'thumbsDown'],
```

**Issue:** While this specific case is safe (no user input), using `literal()` sets a dangerous pattern. If copied elsewhere with user input, it's an injection vector.

**Fix:**
```javascript
// Use Sequelize's built-in operators instead
attributes: [
  'photoId',
  [fn('COUNT', col('id')), 'totalVotes'],
  [fn('SUM', fn('IF', { voteType: 1 }, 1, 0)), 'thumbsUp'],
  [fn('SUM', fn('IF', { voteType: -1 }, 1, 0)), 'thumbsDown'],
],
```

Or use raw query with parameterization:
```javascript
const [results] = await sequelize.query(
  `SELECT photo_id, 
          SUM(CASE WHEN vote_type = 1 THEN 1 ELSE 0 END) as thumbsUp,
          SUM(CASE WHEN vote_type = -1 THEN 1 ELSE 0 END) as thumbsDown
   FROM photo_votes 
   WHERE photo_id IN (:photoIds)
   GROUP BY photo_id`,
  { replacements: { photoIds }, type: QueryTypes.SELECT }
);
```

---

## HIGH Issues

### 5. **Missing TypeScript Types (JavaScript File)**
**File:** Both files  
**Severity:** HIGH

**Issue:** Files use `.mjs` extension but project is TypeScript. No type safety, no IDE autocomplete, no compile-time checks.

**Fix:** Convert to `.ts`:
```typescript
// backend/routes/galleryRoutes.ts
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';

interface GalleryAccessPayload extends JwtPayload {
  type: 'gallery_access';
  visitorId: number;
  eventId: number;
  email: string;
  slug: string;
}

interface AuthenticatedRequest extends Request {
  galleryAccess?: GalleryAccessPayload;
}

function requireGalleryAccess(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): void {
  // ... typed implementation
}
```

---

### 6. **Async Error Handling Anti-Pattern**
**File:** `backend/routes/galleryRoutes.mjs` (All routes)  
**Severity:** HIGH

**Issue:** Every route manually wraps in `try/catch`. DRY violation + easy to forget in new routes.

**Fix:**
```javascript
// utils/asyncHandler.mjs
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Use in routes
router.get('/events', asyncHandler(async (req, res) => {
  const events = await GalleryEvent.findAll({...});
  return res.json({ success: true, events });
}));

// Global error handler in app.mjs
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
});
```

---

### 7. **N+1 Query Problem in Event Listing**
**File:** `backend/routes/galleryRoutes.mjs` (Lines 84-103)  
**Severity:** HIGH

```javascript
const eventsWithCovers = await Promise.all(events.map(async (event) => {
  const plain = event.toJSON();
  if (plain.coverPhotoId) {
    const coverPhoto = await GalleryPhoto.findByPk(plain.coverPhotoId, {...});
    plain.coverPhotoUrl = coverPhoto?.thumbnailUrl || coverPhoto?.url || null;
  } else {
    const firstPhoto = await GalleryPhoto.findOne({...});
    plain.coverPhotoUrl = firstPhoto?.thumbnailUrl || firstPhoto?.url || null;
  }
  return plain;
}));
```

**Issue:** If 50 events exist, this makes 50+ additional queries. Performance degrades linearly with event count.

**Fix:**
```javascript
const events = await GalleryEvent.findAll({
  where: { isPublished: true },
  include: [{
    model: GalleryPhoto,
    as: 'coverPhoto',
    attributes: ['thumbnailUrl', 'url'],
    required: false,
  }],
  order: [['eventDate', 'DESC']],
});

const eventsWithCovers = events.map(event => {
  const plain = event.toJSON();
  plain.coverPhotoUrl = plain.coverPhoto?.thumbnailUrl 
    || plain.coverPhoto?.url 
    || null;
  delete plain.coverPhoto;
  return plain;
});
```

---

### 8. **Unvalidated User Input in VIP Signup**
**File:** `backend/routes/galleryRoutes.mjs` (Lines 747-750)  
**Severity:** HIGH

```javascript
const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
```

**Issue:** No validation that `email` contains `@`. If malformed, `split('@')[0]` could be entire string. Also no length validation (username could be 200+ chars).

**Fix:**
```javascript
// Already validated email format earlier, but add defensive check
if (!email.includes('@')) {
  return res.status(400).json({ success: false, error: 'Invalid email format' });
}

const baseUsername = email.split('@')[0]
  .replace(/[^a-zA-Z0-9_]/g, '_')
  .slice(0, 30); // Enforce max length

if (baseUsername.length < 3) {
  baseUsername = `user_${uuidv4().slice(0, 8)}`;
}
```

---

### 9. **Missing Rate Limiting on Critical Endpoints**
**File:** `backend/routes/galleryRoutes.mjs`  
**Severity:** HIGH

**Issue:** Only `/access`, `/download`, `/vip-signup`, and `/message` have rate limiting. Missing on:
- `/enhancement-request` (could spam enhancement queue)
- `/purchase-credits` (could spam Stripe API)
- `/vip-checkout` (could spam Stripe API)
- `/referral` (could spam referral credits)

**Fix:**
```javascript
const enhancementLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 enhancement requests per hour
  keyGenerator: (req) => req.galleryAccess?.visitorId || req.ip,
});

router.post('/enhancement-request', requireGalleryAccess, enhancementLimiter, async (req, res) => {
  // ...
});
```

---

## MEDIUM Issues

### 10. **Inconsistent Error Response Format**
**File:** `backend/routes/galleryRoutes.mjs` (Throughout)  
**Severity:** MEDIUM

**Issue:** Some errors return `{ success: false, error: 'message' }`, others return `{ success: false, error: 'code', ... }`. Frontend can't reliably parse.

**Fix:**
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Usage
return res.status(402).json({
  success: false,
  error: {
    code: 'CREDITS_REQUIRED',
    message: 'Not enough enhancement credits',
    details: {
      freeRemaining,
      creditsAvailable: visitor.enhancementCredits,
      creditsNeeded: remaining - visitor.enhancementCredits,
      pricing: CREDIT_PRICING,
    },
  },
});
```

---

### 11. **Magic Numbers Without Constants**
**File:** `backend/routes/galleryRoutes.mjs`  
**Severity:** MEDIUM

```javascript
if (photoIds.length > 50) { // Line 267
if (message.trim().length > 5000) { // Line 925
const scoreBoost = created.length * 5; // Line 363
```

**Issue:** Business rules scattered throughout code. Hard to maintain consistency.

**Fix:**
```javascript
const LIMITS = {
  MAX_PHOTOS_PER_ENHANCEMENT: 50,
  MAX_MESSAGE_LENGTH: 5000,
  MAX_PRINT_QUANTITY: 10,
  SCORE_BOOST_PER_ENHANCEMENT: 5,
  SCORE_BOOST_REFERRAL: 15,
  SCORE_BOOST_DONATION: 20,
  SCORE_BOOST_VIP: 25,
  SCORE_BOOST_MESSAGE: 10,
  SCORE_BOOST_VOTE: 2,
  SCORE_BOOST_PRINT: 10,
} as const;
```

---

### 12. **Non-Atomic Lead Score Updates**
**File:** `backend/routes/galleryRoutes.mjs` (Lines 363-377, 552-565, etc.)  
**Severity:** MEDIUM

**Issue:** Lead score updates are "best-effort" with `try/catch` that swallows errors. If two requests update score simultaneously, last-write-wins (race condition).

**Fix:**
```javascript
// Use atomic increment instead of read-modify-write
await Lead.increment('score', { 
  by: scoreBoost, 
  where: { 
    id: lead.id,
    score: { [Op.lt]: 100 } // Cap at 100
  } 
});

// Or use optimistic locking
const [updated] = await Lead.update(
  { score: sequelize.literal(`LEAST(score + ${scoreBoost}, 100)`) },
  { where: { id: lead.id } }
);
```

---

### 13. **Missing Input Sanitization**
**File:** `backend/routes/galleryRoutes.mjs` (Lines 923-927)  
**Severity:** MEDIUM

```javascript
message: message.trim(),
firstName: firstName?.trim() || null,
phone: phone?.trim() || null,
```

**Issue:** Only trims whitespace. No HTML escaping, no XSS protection if displayed in admin panel.

**Fix:**
```javascript
import DOMPurify from 'isomorphic-dompurify';

message: DOMPurify.sanitize(message.trim()),
firstName: firstName ? DOMPurify.sanitize(firstName.trim()) : null,
```

Or use a validation library:
```javascript
import { body, validationResult } from 'express-validator';

router.post('/message', 
  requireGalleryAccess,
  messageLimiter,
  body('message').trim().isLength({ min: 1, max: 5000 }).escape(),
  body('firstName').optional().trim().isLength({ max: 100 }).escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    // ...
  }
);
```

---

### 14. **Incomplete Form Analysis Service**
**File:** `backend/services/formAnalysisService.mjs` (Line 67)  
**Severity:** MEDIUM

```javascript
const base64Image = imageBuffer.toString('base64');
// ... truncated ...
```

**Issue:** Service is incomplete (truncated). Can't review Gemini API integration, error handling, or response parsing.

**Required for Full Review:**
- Gemini API call implementation
- Response parsing/validation
- Error handling for API failures
-

---

*Part of SwanStudios 7-Brain Validation System*
