# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 49.3s
> **Files:** backend/routes/galleryRoutes.mjs, backend/services/formAnalysisService.mjs
> **Generated:** 3/12/2026, 12:00:35 PM

---

# Code Review: SwanStudios Gallery Routes & Form Analysis Service

## CRITICAL Issues

### 1. **Hardcoded Secrets & Missing Environment Variables**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 28, 1004  
**Issue:** Fallback secrets expose the application to security vulnerabilities.

```mjs
const GALLERY_JWT_SECRET = process.env.JWT_SECRET || 'gallery-fallback-secret';
```

**Problem:** If `JWT_SECRET` is not set, tokens are signed with a predictable value, allowing attackers to forge gallery access tokens.

**Fix:**
```mjs
const GALLERY_JWT_SECRET = process.env.JWT_SECRET;
if (!GALLERY_JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

---

### 2. **SQL Injection via Raw Queries**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 654-657, 683-684  
**Issue:** Using `literal()` with unvalidated input creates SQL injection risk.

```mjs
[fn('SUM', literal("CASE WHEN vote_type = 1 THEN 1 ELSE 0 END")), 'thumbsUp'],
```

**Problem:** While this specific case uses hardcoded strings, the pattern is dangerous. If `voteType` were ever interpolated, it would be injectable.

**Fix:** Use Sequelize's built-in aggregation:
```mjs
attributes: [
  'photoId',
  [fn('COUNT', col('id')), 'totalVotes'],
  [fn('SUM', fn('IF', col('voteType'), 1, 0)), 'thumbsUp'],
]
```

---

### 3. **Race Condition in Credit Deduction**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 342-367  
**Issue:** Non-atomic read-modify-write on `enhancementCredits` allows double-spending.

```mjs
const visitor = await GalleryVisitor.findByPk(visitorId);
// ... calculations ...
await visitor.update({ enhancementCredits: visitor.enhancementCredits - creditsToUse });
```

**Problem:** Two concurrent requests can read the same balance, both pass validation, and both deduct credits.

**Fix:** Use atomic decrement with validation:
```mjs
const [updatedRows] = await GalleryVisitor.update(
  { enhancementCredits: literal(`enhancement_credits - ${creditsToUse}`) },
  { 
    where: { 
      id: visitorId, 
      enhancementCredits: { [Op.gte]: creditsToUse } 
    } 
  }
);
if (updatedRows === 0) {
  return res.status(402).json({ success: false, error: 'Insufficient credits' });
}
```

---

### 4. **Incomplete Form Analysis Service**
**File:** `backend/services/formAnalysisService.mjs`  
**Lines:** 66-67  
**Issue:** Function is truncated and incomplete — will crash at runtime.

```mjs
const base64Image = imageBuffer.toString('base64');
// ... truncated ...
```

**Problem:** Missing Gemini API call, error handling, and return statement.

**Fix:** Complete the implementation or mark as TODO:
```mjs
export async function analyzeForm(imageBuffer, exerciseType = 'general') {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return { success: false, error: 'Form analysis requires GEMINI_API_KEY' };
  }

  try {
    const base64Image = imageBuffer.toString('base64');
    
    // TODO: Implement Gemini Vision API call
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Extract COCO-17 keypoints from this ${exerciseType} exercise photo. Return JSON: {keypoints: [{name, x, y, confidence}]}` },
            { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
          ]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const keypoints = JSON.parse(data.candidates[0].content.parts[0].text).keypoints;
    const corrections = assessForm(keypoints);
    const score = Math.max(0, 100 - corrections.length * 10);

    return {
      success: true,
      keypoints,
      bones: BONES,
      corrections,
      score,
      exerciseType
    };
  } catch (err) {
    logger.error('[FormAnalysis] Error:', err.message);
    return { success: false, error: 'Form analysis failed' };
  }
}
```

---

## HIGH Issues

### 5. **Missing Transaction Rollback on Partial Failures**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 342-380  
**Issue:** Enhancement request creates records but doesn't rollback on credit deduction failure.

```mjs
for (const photoId of newPhotoIds) {
  const [request, wasCreated] = await EnhancementRequest.findOrCreate({...});
  if (wasCreated) {
    created.push(request);
    await GalleryPhoto.increment('enhancementRequestCount', { where: { id: photoId } });
  }
}
// Later: credit deduction fails → orphaned records
```

**Fix:** Wrap in transaction:
```mjs
const t = await sequelize.transaction();
try {
  // ... all DB operations ...
  await t.commit();
} catch (err) {
  await t.rollback();
  throw err;
}
```

---

### 6. **Unvalidated User Input in Stripe Metadata**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 440, 802, 1014  
**Issue:** User-controlled IDs passed to Stripe without validation.

```mjs
metadata: {
  userId: String(userId), // Could be malicious payload
  visitorId: String(visitorId),
}
```

**Fix:** Validate and sanitize:
```mjs
const sanitizedUserId = parseInt(userId, 10);
if (!sanitizedUserId || sanitizedUserId < 1) {
  return res.status(400).json({ success: false, error: 'Invalid userId' });
}
metadata: { userId: String(sanitizedUserId) }
```

---

### 7. **Excessive Database Queries in Loop (N+1 Problem)**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 94-113  
**Issue:** Fetching cover photos one-by-one for each event.

```mjs
const eventsWithCovers = await Promise.all(events.map(async (event) => {
  const coverPhoto = await GalleryPhoto.findByPk(plain.coverPhotoId, {...});
  // ...
}));
```

**Fix:** Batch fetch with `include`:
```mjs
const events = await GalleryEvent.findAll({
  where: { isPublished: true },
  include: [{
    model: GalleryPhoto,
    as: 'coverPhoto',
    attributes: ['thumbnailUrl', 'url'],
    required: false
  }],
  order: [['eventDate', 'DESC']],
});
```

---

### 8. **Missing Input Validation on Email**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 143-146  
**Issue:** Weak email regex allows invalid formats.

```mjs
if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
```

**Problem:** Accepts `a@b.c` (too short) and doesn't prevent SQL injection in raw queries elsewhere.

**Fix:** Use a robust validator:
```mjs
import validator from 'validator';

if (!email || !validator.isEmail(email.trim())) {
  return res.status(400).json({ success: false, error: 'Valid email required' });
}
const cleanEmail = validator.normalizeEmail(email.trim());
```

---

### 9. **Insecure Direct Object Reference (IDOR)**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 268-278  
**Issue:** Photo download only checks `eventId` match, not visitor permissions.

```mjs
if (!photo || photo.eventId !== req.galleryAccess.eventId) {
  return res.status(404).json({ success: false, error: 'Photo not found' });
}
```

**Problem:** Any visitor with access to event A can download photos from event A, even if they shouldn't have access to specific photos (e.g., private athlete photos).

**Fix:** Add photo-level access control:
```mjs
const photo = await GalleryPhoto.findOne({
  where: { 
    id: photoId, 
    eventId: req.galleryAccess.eventId,
    isPublic: true // Or check visitor-specific permissions
  }
});
```

---

## MEDIUM Issues

### 10. **DRY Violation: Stripe Session Creation**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 428-453, 487-520, 543-560, 791-821, 996-1024  
**Issue:** Stripe checkout logic duplicated 5 times with minor variations.

**Fix:** Extract helper:
```mjs
async function createStripeCheckout({ 
  productName, 
  description, 
  amount, 
  metadata, 
  successUrl, 
  cancelUrl 
}) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error('Stripe not configured');
  }
  
  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(stripeKey);
  
  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: productName, description },
        unit_amount: Math.round(amount * 100),
      },
      quantity: 1,
    }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  });
}
```

---

### 11. **Missing Error Boundaries for Lead Score Updates**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 381-395, 577-591, 1086-1100  
**Issue:** Lead score updates are non-blocking but failures are only logged, not monitored.

**Fix:** Add error tracking:
```mjs
try {
  // ... lead score update ...
} catch (scoreErr) {
  logger.error('[Gallery:CRM] Lead score update failed', { 
    error: scoreErr.message, 
    email: req.galleryAccess.email,
    action: 'enhancement_request'
  });
  // Send to error monitoring service (Sentry, etc.)
}
```

---

### 12. **Inconsistent Response Formats**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** Various  
**Issue:** Some endpoints return `{ success, data }`, others `{ success, ...fields }`.

**Example:**
```mjs
// Line 115: { success: true, events: [...] }
// Line 136: { success: true, event: {...} }
// Line 398: { success: true, message: '...', requestCount: 0, ... }
```

**Fix:** Standardize:
```mjs
return res.json({ 
  success: true, 
  data: { events: [...] },
  meta: { count: events.length }
});
```

---

### 13. **Magic Numbers Without Constants**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 289, 382, 578, 1087  
**Issue:** Lead score increments hardcoded throughout.

```mjs
const scoreBoost = created.length * 5; // +5 per enhancement
```

**Fix:** Define scoring constants:
```mjs
const LEAD_SCORING = {
  GALLERY_ACCESS: 10,
  ENHANCEMENT_REQUEST: 5,
  REFERRAL: 15,
  DONATION: 20,
  VIP_CONVERSION: 25,
  MESSAGE_SENT: 10,
  PHOTO_VOTE: 2,
  PRINT_ORDER: 10,
};
```

---

### 14. **Unhandled Promise Rejections in Parallel Operations**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 94-113, 1127-1132  
**Issue:** `Promise.all()` fails fast — one error aborts all operations.

```mjs
const eventsWithCovers = await Promise.all(events.map(async (event) => {
  // If one photo fetch fails, entire request fails
}));
```

**Fix:** Use `Promise.allSettled()`:
```mjs
const results = await Promise.allSettled(events.map(async (event) => {
  // ... fetch cover photo ...
}));
const eventsWithCovers = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);
```

---

### 15. **Missing Pagination on List Endpoints**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 86-115, 1109-1116  
**Issue:** `/events` and `/print-orders` return unbounded result sets.

**Fix:** Add pagination:
```mjs
const page = Math.max(1, parseInt(req.query.page) || 1);
const limit = Math.min(100, parseInt(req.query.limit) || 20);
const offset = (page - 1) * limit;

const { count, rows: events } = await GalleryEvent.findAndCountAll({
  where: { isPublished: true },
  limit,
  offset,
  order: [['eventDate', 'DESC']],
});

return res.json({ 
  success: true, 
  events, 
  pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
});
```

---

## LOW Issues

### 16. **Inconsistent Logging Levels**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** Various  
**Issue:** Mix of `logger.info()`, `logger.warn()`, `logger.error()` without clear criteria.

**Fix:** Establish logging standards:
- `error`: User-facing failures (500 errors)
- `warn`: Recoverable issues (lead score update failures)
- `info`: Business events (VIP conversion, orders)
- `debug`: Development-only details

---

### 17. **Unused Imports**
**File:** `backend/routes/galleryRoutes.mjs`  
**Lines:** 18, 19  
**Issue:** `fn`, `col`, `literal` imported but `col` never used.

**Fix:** Remove or use:
```mjs
import { Op, fn, literal } from 'sequelize';
```

---

### 18. **Missing JSDoc for Complex Functions**
**File:** `backend/services/formAnalysisService.mjs`  
**Lines:** 33-49  
**Issue:** `assessForm()` has complex NASM logic but no documentation.

**Fix:**
```mjs
/**
 * Assess exercise form using NASM Corrective Exercise principles.
 * 
 * @param {Array<{name: string, x: number, y: number}>} keypoints - COCO-17

---

*Part of SwanStudios 7-Brain Validation System*
