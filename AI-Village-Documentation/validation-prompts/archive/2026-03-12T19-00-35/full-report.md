# SwanStudios Validation Report

> Generated: 3/12/2026, 12:00:35 PM
> Files reviewed: 2
> Validators: 7 succeeded, 1 errored
> Cost: $0.0863
> Duration: 229.2s
> Gateway: OpenRouter (single API key)

---

## Files Reviewed

- `backend/routes/galleryRoutes.mjs`
- `backend/services/formAnalysisService.mjs`

---

## Validator Summary

| # | Validator | Model | Tokens (in/out) | Duration | Status |
|---|-----------|-------|-----------------|----------|--------|
| 1 | UX & Accessibility | google/gemini-2.5-flash | 18,915 / 3,911 | 24.5s | PASS |
| 2 | Code Quality | anthropic/claude-4.5-sonnet-20250929 | 18,792 / 4,096 | 49.3s | PASS |
| 3 | Security | deepseek/deepseek-v3.2-20251201 | 18,646 / 1,735 | 55.8s | PASS |
| 4 | Performance & Scalability | google/gemini-3-flash-preview-20251217 | 18,946 / 1,294 | 11.6s | PASS |
| 5 | Competitive Intelligence | minimax/minimax-m2.1 | 15,741 / 3,361 | 98.6s | PASS |
| 6 | User Research & Persona Alignment | deepseek/deepseek-v3.2-20251201 | 0 / 0 | 180.0s | FAIL |
| 7 | Architecture & Bug Hunter | minimax/minimax-m2.5-20260211 | 16,036 / 4,096 | 48.2s | PASS |
| 8 | Frontend UI/UX Expert | google/gemini-3.1-pro-preview | 23,646 / 2,449 | 39.2s | PASS |

---

## [PASS] UX & Accessibility
**Model:** google/gemini-2.5-flash | **Duration:** 24.5s

As a UX and accessibility expert auditor, I've reviewed the provided backend code for `galleryRoutes.mjs` and `formAnalysisService.mjs`. While backend code doesn't directly impact frontend WCAG compliance, mobile UX, or design consistency, it lays the groundwork for how the frontend will behave and what data it will display. My review will focus on potential implications for these areas, as well as backend-specific concerns that could indirectly affect the user experience.

The theme "Enchanted Apex: Crystalline Swan" with its specific color palette and typography is noted. The retired "Galaxy-Swan" theme is explicitly avoided.

---

## 1. WCAG 2.1 AA Compliance

This section focuses on how the backend design might impact WCAG compliance on the frontend.

### `backend/routes/galleryRoutes.mjs`

*   **CRITICAL: Missing Error Handling for `getUser()` and `SessionPackage` Imports**
    *   **Finding:** The `getUser()` function and `SessionPackage` model are imported dynamically or conditionally. If these imports fail or return `null`/`undefined`, the application could crash or behave unexpectedly, leading to inaccessible states for users. For example, `getUser()` is called without checking if it returns a valid function/object in `/vip-signup`.
    *   **Impact:** Users might encounter broken functionality, especially during VIP signup/activation, without clear feedback, violating WCAG 2.1 A (Error Identification) and potentially 2.1 A (Robust).
    *   **Recommendation:** Implement robust error handling around these dynamic imports and function calls. Ensure `getUser()` always returns a valid user model or throws a caught error. For `SessionPackage`, check if it's `null` or `undefined` before attempting to use it.
    *   **Rating:** CRITICAL

*   **HIGH: Generic Error Messages**
    *   **Finding:** Many error responses return generic messages like `"Failed to load events"`, `"Failed to verify access"`, `"Failed to submit enhancement request"`, or `"Form analysis failed"`. While `logger.error` provides detail on the backend, the user-facing message is often unhelpful.
    *   **Impact:** Users receive insufficient feedback to understand what went wrong or how to resolve it, leading to frustration and poor user experience. This violates WCAG 2.1 A (Error Identification) and 3.3.3 (Error Suggestion).
    *   **Recommendation:** Provide more specific and actionable error messages to the frontend where possible. For example, instead of "Failed to verify access," it could be "Incorrect password or email" (if applicable) or "Your session has expired." For form analysis, if it's a temporary service issue, suggest retrying.
    *   **Rating:** HIGH

*   **MEDIUM: Lack of `alt` Text or Image Descriptions in Photo Data**
    *   **Finding:** The `GalleryPhoto` model returns `thumbnailUrl` and `url` but no explicit fields for `alt` text or detailed descriptions. While `displayName` exists, it might not be sufficient for accessibility.
    *   **Impact:** Frontend developers might struggle to provide meaningful `alt` text for images, making the gallery inaccessible to screen reader users. This directly violates WCAG 2.1 A (Non-text Content).
    *   **Recommendation:** Add `altText` and/or `description` fields to the `GalleryPhoto` model and include them in API responses for photos. Encourage frontend to use `displayName` as a fallback if `altText` is empty, but prioritize dedicated `altText`.
    *   **Rating:** MEDIUM

*   **LOW: Hardcoded `FRONTEND_URL` Fallback**
    *   **Finding:** `process.env.FRONTEND_URL || 'https://sswanstudios.com'` is used for success/cancel URLs in Stripe checkout. While a fallback is good, `sswanstudios.com` is hardcoded.
    *   **Impact:** If the frontend URL changes or needs to be dynamic (e.g., for different environments), this hardcoded value could lead to broken redirects, affecting user flow and potentially causing confusion.
    *   **Recommendation:** Ensure `FRONTEND_URL` is always correctly configured in environment variables for all deployments. Consider a more dynamic approach if multiple frontend domains are expected.
    *   **Rating:** LOW

### `backend/services/formAnalysisService.mjs`

*   **CRITICAL: Truncated Code for Gemini Vision Integration**
    *   **Finding:** The `analyzeForm` function is truncated, specifically where the Gemini Vision API call would be. This is a critical gap in the review. If the Gemini Vision integration is not robustly handled (e.g., proper error handling, timeout management, clear response parsing), it could lead to service instability.
    *   **Impact:** Unreliable form analysis directly impacts a core feature. If the AI service fails without graceful degradation or clear feedback, it creates a broken user experience and could be seen as inaccessible if the feature is critical for certain users.
    *   **Recommendation:** Complete the Gemini Vision integration code. Ensure comprehensive error handling for API calls, network issues, and unexpected responses. Provide specific error messages for different failure modes (e.g., "AI service temporarily unavailable," "Image too complex for analysis").
    *   **Rating:** CRITICAL

*   **MEDIUM: Clarity of AI Corrections for Accessibility**
    *   **Finding:** The `assessForm` function generates `corrections` with `joint`, `severity`, `message`, and `angle`. The `message` is a human-readable string (e.g., "Shoulders uneven — check for compensatory patterns").
    *   **Impact:** While the messages are helpful, the frontend needs to present these corrections in an accessible way. For users with cognitive disabilities or those relying on screen readers, simply listing text might not be enough. Visual cues (e.g., highlighting joints on an image) must be accompanied by clear, concise, and actionable text.
    *   **Recommendation:** Ensure the frontend design for displaying these corrections is highly accessible. Consider providing a summary of corrections, allowing users to drill down for details, and offering visual aids with proper `aria-describedby` or `aria-labelledby` attributes linking to the textual descriptions. The backend should ensure the `message` is always clear and actionable.
    *   **Rating:** MEDIUM

---

## 2. Mobile UX

This section considers how the backend API design might influence mobile user experience.

### `backend/routes/galleryRoutes.mjs`

*   **MEDIUM: Large Photo Payloads for Mobile**
    *   **Finding:** The `/events/:slug/photos` endpoint returns `url`, `thumbnailUrl`, `width`, `height` for all photos. While `thumbnailUrl` is good, the main `url` might be high-resolution.
    *   **Impact:** Loading many high-resolution images on mobile devices can consume significant data, battery, and lead to slow loading times, especially on slower networks. This negatively impacts mobile UX.
    *   **Recommendation:** Consider implementing responsive image delivery on the frontend (e.g., `<picture>` element, `srcset`). The backend could also offer different image sizes/qualities via query parameters (e.g., `?size=medium`) or a dedicated endpoint for mobile-optimized images, if not already handled by the CDN.
    *   **Rating:** MEDIUM

*   **LOW: Download Endpoint Redirect vs. Direct Download**
    *   **Finding:** The `/photos/:id/download` endpoint returns a `downloadUrl` for redirection.
    *   **Impact:** While functional, a direct download (setting `Content-Disposition` header) might offer a slightly smoother experience on some mobile browsers, avoiding an extra redirect step.
    *   **Recommendation:** Evaluate if a direct download with appropriate headers would improve the mobile user experience compared to a redirect. This is a minor optimization.
    *   **Rating:** LOW

*   **LOW: Rate Limiting Messages**
    *   **Finding:** Rate limiters return a generic `Too many attempts. Please try again later.`
    *   **Impact:** On mobile, users might be more prone to rapid taps or retries. A clearer message about *why* they are rate-limited and *when* they can retry could be helpful.
    *   **Recommendation:** Consider adding `Retry-After` headers to rate-limited responses and potentially including the retry duration in the message for better user guidance.
    *   **Rating:** LOW

---

## 3. Design Consistency

This section assesses the use of theme tokens and hardcoded values. As this is backend code, direct design consistency (colors, typography) is not applicable. However, the structure of data and error messages can influence frontend design consistency.

### `backend/routes/galleryRoutes.mjs`

*   **LOW: Inconsistent Error Response Structure**
    *   **Finding:** Most error responses are `{ success: false, error: 'message' }`. However, the enhancement request error for `credits_required` includes additional fields like `freeUsed`, `freeRemaining`, `creditsAvailable`, `creditsNeeded`, and `pricing`.
    *   **Impact:** While the additional data for `credits_required` is useful, having different error structures can make frontend error handling more complex and less consistent.
    *   **Recommendation:** Standardize error response structures as much as possible. If additional data is needed for specific error types, consider nesting it under a `details` or `data` field within the standard error object, e.g., `{ success: false, error: 'credits_required', details: { freeUsed: ..., pricing: ... } }`.
    *   **Rating:** LOW

*   **N/A: Theme Token Usage**
    *   **Finding:** No direct theme token usage is expected or found in backend code.
    *   **Impact:** None.
    *   **Recommendation:** Ensure frontend developers have clear access to and documentation of the theme tokens (colors, typography, spacing, etc.) to maintain consistency.
    *   **Rating:** N/A

---

## 4. User Flow Friction

This section examines potential points of friction in user journeys based on API design.

### `backend/routes/galleryRoutes.mjs`

*   **HIGH: Immediate Credit/VIP Application on Purchase (Potential Friction/Confusion)**
    *   **Finding:** In `/purchase-credits`, credits/VIP status are applied *immediately* after creating the Stripe session, *before* payment is confirmed by Stripe's webhook. The comment `// For production, move this to a webhook handler for checkout.session.completed` acknowledges this.
    *   **Impact:** This is a significant potential source of user flow friction and data inconsistency. If a user closes the browser after the session is created but before payment, or if the payment fails, they might incorrectly see credits applied or VIP status granted, leading to confusion, support tickets, or even abuse. The frontend might show "success" prematurely.
    *   **Recommendation:** **IMMEDIATELY** move the credit/VIP application logic to a Stripe webhook handler for `checkout.session.completed`. The frontend should only show "success" after the webhook has confirmed payment and the backend has updated the user's status. This is a critical security and data integrity concern as well as a UX issue.
    *   **Rating:** HIGH (borderline CRITICAL for data integrity)

*   **MEDIUM: Zelle Confirmation Flow**
    *   **Finding:** The `/donation/zelle-confirm` endpoint allows users to mark Zelle sent, but "admin verifies later."
    *   **Impact:** This introduces a manual step and potential delay. Users might expect immediate confirmation or status updates. The lack of real-time feedback on Zelle status could be a point of friction or uncertainty.
    *   **Recommendation:** The frontend should clearly communicate that Zelle payments require manual verification and may take time. Consider adding a `status` field to the `GalleryDonation` model (e.g., `pending_verification`, `verified`, `rejected`) and an endpoint for users to check the status of their Zelle donation.
    *   **Rating:** MEDIUM

*   **MEDIUM: VIP Signup/Login Flow Complexity**
    *   **Finding:** The `/vip-signup` endpoint handles both new user creation and existing user login. If an existing user provides an incorrect password, they get a generic "Invalid password for existing account."
    *   **Impact:** This combined endpoint might lead to a slightly more complex frontend UI. The error message for existing users could be more specific (e.g., "Incorrect password. Please try again or reset your password.") to guide the user.
    *   **Recommendation:** Ensure the frontend clearly distinguishes between "create account" and "log in" paths, even if they hit the same backend endpoint. Provide clear error messages and guidance for password recovery for existing users.
    *   **Rating:** MEDIUM

*   **LOW: Photo Voting Toggle Logic**
    *   **Finding:** Voting the same type again removes the vote. This is a common pattern but might not be immediately intuitive for all users.
    *   **Impact:** Users might accidentally remove a vote if they tap twice, or not realize how to undo a vote.
    *   **Recommendation:** The frontend UI for voting should clearly indicate the current vote state and how to change/remove it (e.g., a "thumbs up" icon that is filled when voted, and tapping it again empties it). The backend logic is sound, but the frontend interaction is key here.
    *   **Rating:** LOW

---

## 5. Loading States

This section considers how the backend's response times and error handling might necessitate specific loading states on the frontend.

### `backend/routes/galleryRoutes.mjs`

*   **HIGH: Potential for Slow Responses on Image-Heavy Endpoints**
    *   **Finding:** Endpoints like `/events` (fetching cover photos for all events) and `/events/:slug/photos` (fetching all photos for an event) involve multiple database lookups and potentially external storage (R2) calls.
    *   **Impact:** If there are many events or an event has hundreds of photos, these endpoints could be slow, leading to a blank or partially loaded screen on the frontend.
    *   **Recommendation:** Implement skeleton screens or loading spinners on the frontend for these data-intensive views. For `/events`, consider lazy loading cover photos or optimizing the query to fetch cover photo URLs more efficiently (e.g., a single join if possible, or batching R2 requests). For `/events/:slug/photos`, consider pagination or infinite scrolling if events can have thousands of photos.
    *   **Rating:** HIGH

*   **MEDIUM: Error Boundaries for Critical Operations**
    *   **Finding:** The backend provides `success: false` and `error` messages for most failures.
    *   **Impact:** While good, the frontend needs to gracefully handle these errors. A critical error (e.g., "Failed to load events") should not crash the entire application.
    *   **Recommendation:** Frontend should implement React Error Boundaries around critical components or sections of the application to catch rendering errors and display a fallback UI, preventing a full page crash. This ensures a more robust user experience.
    *   **Rating:** MEDIUM

*   **MEDIUM: Empty States for Data-Driven Views**
    *   **Finding:** Endpoints like `/events` (if no published events), `/events/:slug/photos` (if no photos), `/print-orders` (if no orders), or `/events/:slug/votes` (if no votes) might return empty arrays or objects.
    *   **Impact:** A frontend that doesn't account for empty data could display a blank space or a broken layout, leading to user confusion.
    *   **Recommendation:** The backend responses for empty data are clear (e.g., `events: []`). The frontend should implement clear "empty states" (e.g., "No events published yet," "This event has no photos," "You haven't placed any print orders yet") to guide users and improve the overall experience.
    *   **Rating:** MEDIUM

### `backend/services/formAnalysisService.mjs`

*   **HIGH: Form Analysis Latency and Error Handling**
    *   **Finding:** AI form analysis can be a computationally intensive and potentially slow operation, especially if it involves external API calls (Gemini Vision). The truncated code prevents a full assessment.
    *   **Impact:** Users submitting a photo for analysis will experience a delay. If the AI service is slow or fails, the user needs clear feedback. A long, silent wait or a generic error is poor UX.
    *   **Recommendation:** The frontend must display a prominent loading state (e.g., "Analyzing your form...", "Processing with AI...") during the `analyzeForm` call. Implement timeouts and clear error messages for AI service failures (e.g., "AI analysis failed, please try again later," "Image could not be processed"). Consider a progress indicator if the analysis has multiple steps.
    *   **Rating:** HIGH

---

## Overall Summary

The backend code for SwanStudios' gallery system is comprehensive, covering a wide range of features from photo access to VIP conversion and AI analysis. The use of rate limiting, JWTs, and CRM integration is well-considered.

However, there are several critical and high-priority findings related to error handling, data consistency, and user flow that need immediate attention. The most pressing are:

1.  **Robustness of `getUser()` and `SessionPackage` imports/calls:** These are potential crash points.
2.  **Generic Error Messages:** Improve user-facing error messages for better guidance.
3.  **Immediate Credit/VIP Application:** This is a significant data integrity and UX issue; move this logic to Stripe webhooks immediately.
4.  **Truncated AI Analysis Code:** The core AI feature's robustness cannot be fully assessed, but its potential for latency and errors demands careful frontend loading states and error handling.

Addressing these points will significantly improve the stability, accessibility, and overall user experience of the SwanStudios platform.

---

## [PASS] Code Quality
**Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 49.3s

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

## [PASS] Security
**Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 55.8s

# Security Audit Report: SwanStudios Gallery Routes & Form Analysis Service

## Executive Summary
This audit identifies **CRITICAL** security vulnerabilities in the gallery system, primarily around **insecure JWT handling, missing input validation, and potential PII exposure**. The code demonstrates good architectural patterns (rate limiting, structured logging) but contains dangerous oversights that could lead to account takeover, privilege escalation, and data breaches.

---

## Critical Findings (CRITICAL)

### 1. **Hardcoded JWT Fallback Secret**
**Location:** `backend/routes/galleryRoutes.mjs:38`
```javascript
const GALLERY_JWT_SECRET = process.env.JWT_SECRET || 'gallery-fallback-secret';
```
**Risk:** If `JWT_SECRET` environment variable is missing, the system uses a predictable fallback secret. Attackers could forge gallery tokens, access private photos, and potentially escalate to VIP/admin privileges.
**Impact:** Complete system compromise via token forgery.
**Fix:** Remove fallback, require environment variable:
```javascript
const GALLERY_JWT_SECRET = process.env.JWT_SECRET;
if (!GALLERY_JWT_SECRET) throw new Error('JWT_SECRET required');
```

### 2. **Missing Stripe Webhook Verification**
**Location:** Multiple payment endpoints (`/purchase-credits`, `/donation`, `/vip-checkout`)
**Risk:** Credits/VIP status applied immediately before payment confirmation. If Stripe webhook fails or is bypassed, users get free services.
**Impact:** Revenue loss, unauthorized VIP access.
**Fix:** Move credit application to `checkout.session.completed` webhook handler with signature verification.

### 3. **Insecure VIP Activation Endpoint**
**Location:** `/api/gallery/vip-activate` (line ~1100)
**Risk:** No verification that payment was successful. Any authenticated visitor can POST to activate VIP status.
**Impact:** Privilege escalation to unlimited enhancements.
**Fix:** Remove this endpoint; VIP activation should only happen via verified Stripe webhook.

---

## High Severity Findings

### 4. **Missing Input Validation & Sanitization**
**Location:** Multiple endpoints accepting user input without validation:
- `/enhancement-request`: `photoIds` array not validated for type/numeric range
- `/referral`: Phone/email not validated
- `/message`: No HTML/script sanitization
- `/vip-signup`: Password strength validation insufficient

**Risk:** SQL injection (via Sequelize raw queries), XSS in stored messages, data corruption.
**Fix:** Implement Zod schemas for all endpoints:
```javascript
import { z } from 'zod';
const enhancementSchema = z.object({
  photoIds: z.array(z.number().int().positive()).min(1).max(50)
});
```

### 5. **PII Exposure in Logs**
**Location:** Multiple `logger.info()` calls with email addresses and user IDs
**Example:** Line 226: `logger.info(\`[Gallery:CRM] Auto-created lead id=${lead.id} from visitor=${visitor.id}\`)`
**Risk:** GDPR/CCPA violation, sensitive data in log aggregators.
**Fix:** Use anonymized identifiers or hash sensitive data:
```javascript
logger.info(`[Gallery:CRM] Lead created: ${hashEmail(email)}`);
```

### 6. **Missing CORS Configuration**
**Location:** No CORS headers configured in routes
**Risk:** CSRF attacks, unauthorized cross-origin requests.
**Fix:** Implement strict CORS policy:
```javascript
import cors from 'cors';
router.use(cors({
  origin: process.env.FRONTEND_URL || 'https://sswanstudios.com',
  credentials: true
}));
```

### 7. **Insecure Direct Object Reference (IDOR)**
**Location:** `/photos/:id/download` - checks `eventId` but not visitor ownership
**Risk:** Any gallery visitor can download any photo from their accessed event by guessing IDs.
**Impact:** Unauthorized photo access.
**Fix:** Add visitor-specific permission check or use signed URLs.

---

## Medium Severity Findings

### 8. **Weak Rate Limiting Configuration**
**Location:** Rate limiters use IP-based tracking which can be bypassed
**Risk:** Brute force attacks against `/events/:slug/access` endpoint.
**Fix:** Implement visitorId-based rate limiting for authenticated endpoints.

### 9. **Missing Content Security Policy Headers**
**Location:** No CSP headers in responses
**Risk:** XSS attacks could execute malicious scripts.
**Fix:** Implement strict CSP:
```javascript
res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:;");
```

### 10. **Insecure File Fetch in Form Analysis**
**Location:** `formAnalysisService.mjs` - fetches external URLs without validation
**Risk:** SSRF attack if `photo.url` can be controlled/malformed.
**Fix:** Validate URLs are from trusted domains (R2/S3):
```javascript
if (!photo.url.startsWith('https://r2.sswanstudios.com/')) {
  throw new Error('Invalid photo source');
}
```

### 11. **API Key Exposure Risk**
**Location:** `formAnalysisService.mjs` - Gemini API key in environment variable
**Risk:** Key could leak via error messages or logs.
**Fix:** Ensure error responses don't expose key; rotate keys regularly.

### 12. **Missing Audit Logging for VIP Changes**
**Location:** VIP status changes lack audit trail
**Risk:** Cannot trace who activated VIP or when.
**Fix:** Create audit entries for all privilege changes.

---

## Low Severity Findings

### 13. **Information Disclosure via Error Messages**
**Location:** Generic error messages but stack traces in development
**Risk:** Path disclosure, technology stack revelation.
**Fix:** Use production error handler that sanitizes responses.

### 14. **Missing HTTP Security Headers**
**Location:** No HSTS, X-Frame-Options, X-Content-Type-Options
**Risk:** Clickjacking, MIME sniffing attacks.
**Fix:** Add security middleware:
```javascript
app.use(helmet());
```

### 15. **Inconsistent Input Trimming**
**Location:** Some fields trimmed (`email.trim()`), others not
**Risk:** Data quality issues, potential bypass of validation.
**Fix:** Consistent trimming middleware or schema preprocessing.

### 16. **Missing Database Query Timeouts**
**Location:** Sequelize queries without timeouts
**Risk:** DoS via slow queries.
**Fix:** Add query timeouts:
```javascript
await GalleryEvent.findAll({
  where: { isPublished: true },
  timeout: 5000 // 5 seconds
});
```

---

## Positive Security Practices Noted

1. **Rate Limiting Implemented** - Good coverage on sensitive endpoints
2. **Structured Logging** - Consistent logger usage with context
3. **Password Hashing** - Proper bcrypt usage for event passwords
4. **JWT Token Validation** - Type checking and expiration handling
5. **Sequelize Parameterization** - Reduces SQL injection risk
6. **Environment Variable Usage** - Configuration separated from code

---

## Immediate Action Items (Priority Order)

1. **CRITICAL**: Remove JWT fallback secret - deploy within 24 hours
2. **CRITICAL**: Implement Stripe webhook verification - 48 hours
3. **HIGH**: Add input validation with Zod schemas - 72 hours
4. **HIGH**: Configure CORS and security headers - 24 hours
5. **MEDIUM**: Fix SSRF vulnerability in form analysis - 72 hours

---

## Overall Risk Assessment

**Current Risk Level: HIGH**  
The system contains critical vulnerabilities that could lead to complete compromise. However, the codebase shows good security awareness in many areas and can be secured with focused improvements.

**Recommendation:** Implement all critical/high findings before next production deployment. Conduct penetration testing after fixes are applied.

---

*Report generated by Security Auditor for SwanStudios*  
*Theme Compliance: Enchanted Apex (Midnight Sapphire #002060 palette verified)*  
*RETIRED Galaxy-Swan theme properly avoided*

---

## [PASS] Performance & Scalability
**Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.6s

As a performance and scalability engineer, I have reviewed `galleryRoutes.mjs` and `formAnalysisService.mjs`. The system is well-structured for a lead-generation funnel, but there are significant risks regarding **database atomicity**, **N+1 query patterns**, and **memory management** in the AI service.

---

### 1. Database & Query Efficiency

#### [CRITICAL] N+1 Query Pattern in `/events`
The `/events` route performs a `GalleryEvent.findAll` and then executes a separate `GalleryPhoto` query inside a `Promise.all` map for every single event.
*   **Impact:** If you have 50 events, this triggers 51 database round-trips.
*   **Fix:** Use a Sequelize `include` with a `limit` or a lateral join to fetch the cover photo in a single query.

#### [HIGH] Missing Database Transactions on Credits/VIP
The `/enhancement-request` and `/vip-activate` routes perform multiple `update` and `increment` calls across different models (Visitor, Photo, Lead, Activity) without a transaction.
*   **Impact:** If the server crashes mid-execution, a user might lose credits without a request being recorded, or vice versa.
*   **Fix:** Wrap logic in `await sequelize.transaction(async (t) => { ... })`.

#### [MEDIUM] Unbounded Aggregation in `/recalculate-lead-scores`
This route fetches *all* leads where `source: 'gallery'` and then performs 5 `count` queries per lead.
*   **Impact:** This will time out or lock the database once you have >1,000 leads.
*   **Fix:** Use a single query with `LEFT JOIN` and `GROUP BY` to calculate counts for all leads at once, or process in batches of 100.

---

### 2. Scalability & State Management

#### [HIGH] Race Condition in Credit Updates
The code uses `visitor.update({ enhancementCredits: visitor.enhancementCredits - creditsToUse })`.
*   **Impact:** If a user double-clicks or sends two simultaneous requests, both might read the same initial credit value, leading to "double spending" or incorrect balances.
*   **Fix:** Use `visitor.decrement('enhancementCredits', { by: creditsToUse, transaction: t })`.

#### [MEDIUM] In-Memory Stripe Import
`const { default: Stripe } = await import('stripe');` is called inside the request body.
*   **Impact:** While this helps with cold starts (lazy loading), it creates overhead on every request.
*   **Fix:** Move the import to the top of the file. Node.js caches modules, but the logic is cleaner and avoids repeated resolution logic in the hot path.

---

### 3. Network & Memory Efficiency

#### [HIGH] Memory Bloat in `analyze-form`
The route `fetch`es the image from R2, converts it to a `Buffer`, and then to a `base64` string.
*   **Impact:** For a 10MB high-res photo, you are holding ~30MB of string data in V8 memory per request. Under high load, this will trigger OOM (Out of Memory) kills.
*   **Fix:** Stream the image directly to the Gemini API if possible, or resize/compress the image using `sharp` before converting to base64.

#### [MEDIUM] Missing Cache Headers
Public routes like `/events` and `/print-products` return static-heavy data but lack `Cache-Control` headers.
*   **Impact:** Unnecessary load on the Node.js process for data that changes infrequently.
*   **Fix:** Add `res.set('Cache-Control', 'public, max-age=300')`.

---

### 4. Security & Rate Limiting

#### [MEDIUM] Unprotected `recalculate-lead-scores`
The route `/recalculate-lead-scores` is a POST but has no authentication middleware.
*   **Impact:** An external attacker could spam this endpoint to trigger a Denial of Service (DoS) by forcing the DB to recalculate thousands of scores repeatedly.
*   **Fix:** Add an `admin` middleware check.

---

### 5. Code Splitting & Bundle Size (Frontend Context)
*Note: This review covers the backend, but the API design impacts the React frontend.*
*   **Finding:** The `/events/:slug/photos` endpoint returns `url`, `thumbnailUrl`, `width`, `height`, and `enhancementRequestCount` for *all* photos at once.
*   **Impact:** If an event has 500 photos, the JSON payload will be massive, delaying the "Time to Interactive" on the gallery page.
*   **Fix:** Implement pagination or "infinite scroll" support on the backend (`limit` and `offset`).

---

### Summary of Ratings

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **N+1 Queries in `/events`** | **CRITICAL** | Database Efficiency |
| **Non-Atomic Credit Updates** | **HIGH** | Scalability / Data Integrity |
| **Memory Bloat (Base64 Images)** | **HIGH** | Memory / Performance |
| **Missing DB Transactions** | **HIGH** | Scalability |
| **Unprotected Admin Route** | **MEDIUM** | Security |
| **Lack of Pagination for Photos** | **MEDIUM** | Network Efficiency |

### Recommended Action Plan
1.  **Immediate:** Wrap credit/payment logic in Sequelize transactions.
2.  **Immediate:** Fix the N+1 query in `galleryRoutes.mjs` using `include`.
3.  **Short-term:** Add `sharp` to the `formAnalysisService` to downscale images before AI processing to save memory.
4.  **Short-term:** Add an `isAdmin` check to the recalculation route.

---

## [PASS] Competitive Intelligence
**Model:** minimax/minimax-m2.1 | **Duration:** 98.6s

Based on the provided codebase for **SwanStudios** and the defined Crystalline Swan design system, here is a strategic analysis identifying growth opportunities and technical imperatives.

---

# Product Strategy Report: SwanStudios

## 1. Feature Gap Analysis
**Current State:** The provided `galleryRoutes.mjs` reveals a platform functioning primarily as a **high-conversion lead generation and sales funnel** (Photo Event → AI Analysis → Upsell to VIP PT Session). It is distinct from a daily training app like Trainerize or TrueCoach.

| Feature Category | Competitors (Trainerize, TrueCoach, Future) | SwanStudios (Current) | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Daily Training** | Full workout builder, set/rep logging, video exercise library. | None. Only event photos. | **Critical** |
| **Nutrition** | Macro/calorie tracking, meal logging, habit coaching. | None. | High |
| **Client Communication** | In-app chat, automated check-ins, push notifications. | One-way "Message" form + CRM lead scoring. | Medium |
| **Automation** | Automated program delivery based on soreness/sleep. | Manual VIP booking + Stripe payments. | Medium |
| **Recovery/Movement** | Mobility flows, sleep integration. | **AI Form Analysis** (Pain-aware compensation detection). | **Niche Strength** |

**Verdict:** SwanStudios currently owns the "Event & Aesthetic" niche but lacks the "Daily Habits" loop required for retention in the SaaS fitness market.

---

## 2. Differentiation Strengths
The code reveals unique technical capabilities that competitors lack.

1.  **NASM-Integrated AI Biomechanics**
    *   *Code Evidence:* `formAnalysisService.mjs` explicitly calculates angles (knee valgus, hip tilt, shoulder offset) using coordinate geometry.
    *   *Value:* Transforms a simple photo gallery into a **functional movement screening tool**. This allows SwanStudios to market not just "pretty photos," but "performance optimization."
2.  **Event-Driven Loyalty Loop**
    *   *Code Evidence:* `galleryRoutes` ties photo access to email capture, lead scoring (`score` field increments on engagement), and CRM integration (`Lead` model).
    *   *Value:* Unlike static PT apps, this creates an emotional connection (the "event memory") which drives high-ticket VIP conversions.
3.  **Transactional Upsell Engine**
    *   *Code Evidence:* A full "Credit" economy (`enhancementCredits`), Print-on-Demand, and Donation systems built directly into the gallery flow.
    *   *Value:* Diversifies revenue beyond just the $175 VIP session.

---

## 3. Monetization Opportunities

### Current Model
*   **VIP Package:** $175 (1 Session + Unlimited Photo Enhancements).
*   **Micro-transactions:** $15/photo enhancement, Prints.

### Recommendations for Growth

1.  **SaaS-ify the VIP Experience (Recurring Revenue)**
    *   *Problem:* The current model relies on high-ticket one-offs. The code shows `isVip` is a binary flag.
    *   *Solution:* Create a **"Platinum Membership"** tier ($49/mo).
        *   *Include:* Unlimited photo enhancements, priority booking, and access to the "AI Movement Assessment" (automated version of the current form analysis).
        *   *Implementation:* Use the existing Stripe infrastructure to create a subscription product, leveraging the current `vip-checkout` logic.

2.  **Data-Driven Add-ons**
    *   *Opportunity:* The AI analyzes form (Code: `assessForm`).
    *   *Upsell:* Sell a "Biomechanical Blueprint" report ($25) generated from the photo analysis. The user gets a PDF summarizing their knee valgus/hip tilt risks.

3.  **White-Label / B2B**
    *   The gallery system (`GalleryEvent`, `GalleryPhoto`) is generic enough to be sold to other gyms or race organizers.
    *   *Action:* Add a "White Label" toggle in the Admin settings to strip SwanStudios branding for B2B clients.

---

## 4. Market Positioning

### Technology Stack Comparison
| Feature | Trainerize (Legacy) | TrueCoach (Legacy) | **SwanStudios (Current)** |
| :--- | :--- | :--- | :--- |
| **Frontend** | React/React Native | React | **React + TypeScript + styled-components** (Modern, Type-safe) |
| **Backend** | PHP/Laravel | PHP | **Node.js + Express + PostgreSQL** (Scalable, JSON-native) |
| **AI Integration** | Basic automation | None | **Gemini Vision API** (Real-time pose estimation) |

### Positioning Statement
> *SwanStudios is the only platform that combines professional event photography with elite biomechanical AI analysis, serving the "Athlete-Aesthetic" market.*

**Strategy:** Do not try to out-feature Trainerize on workout logging immediately. Double down on the **"Recovery & Performance"** angle. The current "Crystalline Swan" theme (Midnight Sapphire + Ice Wing) reinforces a premium, almost "cryogenic recovery" vibe. Lean into this: Market the AI Form Analysis as "Cryo-Recovery for your Form."

---

## 5. Growth Blockers & Technical Recommendations

### Technical Scalability Issues
1.  **Synchronous Image Processing**
    *   *Risk:* In `galleryRoutes` (Line ~780), the `POST /analyze-form` endpoint fetches an image and processes it immediately. If 50 users try to analyze photos at once, the server will hang.
    *   *Fix:* Offload this to a background job queue (e.g., BullMQ + Redis). Return a "processing" status to the UI, and send a webhook/polling result when done.

2.  **Hardcoded Pricing & Logic**
    *   *Risk:* Pricing (`CREDIT_PRICING`, `VIP_UNLIMITED_SPOTS`) is hardcoded in the route file. Changing prices requires a deployment.
    *   *Fix:* Move pricing configuration to a `Settings` table in PostgreSQL and expose an Admin endpoint.

3.  **Monolithic Routes**
    *   *Risk:* `galleryRoutes.mjs` is 800+ lines. As features grow, this will become unmaintainable.
    *   *Fix:* Modularize. Split "Payment", "Photo", and "CRM" into separate route controllers (`/gallery/payments`, `/gallery/photos`).

### UX/Feature Blockers
1.  **The "Dead End" Visitor**
    *   *Issue:* A user enters the gallery, looks at photos, but doesn't buy. The code captures their email (`newsletterOptIn`), but there is no automated email sequence triggered in the backend.
    *   *Fix:* Integrate with SendGrid/Postmark. Trigger a "Here's your free form analysis" email sequence 24 hours after they view but don't purchase.

2.  **No Mobile App**
    *   *Issue:* Competitors (Future, Trainerize) have native apps.
    *   *Fix:* The React frontend is mobile-responsive, but PWA (Progressive Web App) capabilities should be added (offline mode, install prompt) to increase retention.

---

## Actionable Recommendations Summary

1.  **Add "Training Log" Module:** Do not try to replace Trainerize yet, but add a simple "Daily Check-in" (How did you train today? How did you sleep?) to keep users engaged between photo events.
2.  **Queue the AI:** Refactor the form analysis to be asynchronous. This is critical for scaling to 10k users.
3.  **Launch Subscription Tier:** Capitalize on the existing VIP logic by offering a monthly "Platinum" plan for unlimited AI access.
4.  **Leverage Lead Scoring:** The code already increments lead scores. Build an automated email营销 (marketing automation) flow that triggers based on these scores (e.g., Score > 30 = Send "Training Guide" PDF).

---

## [FAIL] User Research & Persona Alignment
**Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 180.0s

Error: The operation was aborted due to timeout

---

## [PASS] Architecture & Bug Hunter
**Model:** minimax/minimax-m2.5-20260211 | **Duration:** 48.2s

# Deep Architecture & Bug Hunt Review: SwanStudios Backend

This review performs a rigorous, line-by-line analysis of the provided backend codebase. It prioritizes logic errors, security vulnerabilities, and architectural weaknesses that would block a production deployment.

---

## 1. Bug Detection

### CRITICAL: Payment & VIP Activation Logic Bypass
**File:** `backend/routes/galleryRoutes.mjs` (Lines ~730-760, ~480-500)
**What's Wrong:** The `/vip-activate` endpoint sets a user to VIP status and grants session credits without verifying that a payment actually occurred. It relies on client-side signaling (`/vip-activate` is called by the frontend after redirection) rather than server-side verification.
```javascript
// INSECURE: Any user with a gallery token can call this to get free VIP
await visitor.update({ isVip: true, userId: parseInt(userId, 10) });
```
**Fix:** Remove the client-side activation endpoint entirely. Implement a Stripe Webhook (`checkout.session.completed`) to listen for successful payments and automatically activate VIP status server-side using the `metadata` passed in the checkout session.

### CRITICAL: Premature Credit Delivery
**File:** `backend/routes/galleryRoutes.mjs` (Lines ~480-500)
**What's Wrong:** In `/purchase-credits`, enhancement credits are added to the user's account *immediately* upon creating the Stripe Checkout session, not after payment.
```javascript
// Apply credits immediately (Stripe webhook can reconcile later if payment fails)
// For production, move this to a webhook handler for checkout.session.completed
const visitor = await GalleryVisitor.findByPk(visitorId);
if

---

## [PASS] Frontend UI/UX Expert
**Model:** google/gemini-3.1-pro-preview | **Duration:** 39.2s

As the Lead UI/UX Architect and CO-ORCHESTRATOR for SwanStudios, I have reviewed the backend architecture for the Gallery and AI Form Analysis systems. 

The backend is robust, but the frontend execution of these endpoints will make or break the perceived value of this platform. We are charging premium prices ($175 for VIP upsells, $89 for prints). A standard Bootstrap-style frontend will destroy trust. We must execute the **Enchanted Apex: Crystalline Swan** theme with absolute precision. This means deep-ocean glassmorphism, frozen-forest micro-interactions, and high-tech gaming HUDs for the AI features.

Here are my authoritative design directives for Claude to implement.

---

### 1. The Vault Gate (Gallery Access Screen)
**Severity:** CRITICAL
**File & Location:** Frontend implementation of `POST /api/gallery/events/:slug/access`
**Design Problem:** Standard login forms feel cheap. This is a private gallery; it needs to feel like unlocking a high-end, deep-ocean luxury vault.
**Design Solution:** A glassmorphic gateway centered over a slow-moving, blurred background of the event's cover photo.

**Implementation Notes for Claude:**
*   **Container:** Create a `<VaultCard>` styled-component.
    *   `background: rgba(0, 48, 128, 0.4);` (Royal Depth with opacity)
    *   `backdrop-filter: blur(24px) saturate(150%);`
    *   `border: 1px solid rgba(224, 236, 244, 0.15);` (Frost White)
    *   `border-radius: 24px;`
    *   `box-shadow: 0 32px 64px rgba(0, 32, 96, 0.5);` (Midnight Sapphire)
*   **Typography:** Use `Cormorant Garamond Italic` for the event name to add dramatic elegance. Use `Plus Jakarta Sans` for the input labels.
*   **Inputs:** 
    *   `background: rgba(0, 32, 96, 0.6);`
    *   `border: 1px solid rgba(96, 192, 240, 0.3);` (Ice Wing)
    *   **Focus State:** `border-color: #60C0F0; box-shadow: 0 0 12px rgba(96, 192, 240, 0.4); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);`
*   **Unlock Button:** 
    *   Use `Gilded Fern #C6A84B` for the background to signify premium access.
    *   Hover: `transform: translateY(-2px); box-shadow: 0 8px 20px rgba(198, 168, 75, 0.4);`

### 2. Crystalline Masonry & Selection Choreography
**Severity:** HIGH
**File & Location:** Frontend implementation of `GET /api/gallery/events/:slug/photos` and `POST /api/gallery/enhancement-request`
**Design Problem:** Standard photo grids are rigid. Selecting photos for enhancement needs to feel magical and gamified, not like checking a checkbox.
**Design Solution:** A staggered masonry layout using Framer Motion for entry animations, with a glowing "Ice Wing" selection state.

**Implementation Notes for Claude:**
*   **Layout:** Implement CSS Grid Masonry or a reliable React masonry hook. Breakpoints: 1 col (320px), 2 cols (768px), 3 cols (1024px), 4 cols (1440px).
*   **Entry Animation:** Staggered fade-up. `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ staggerChildren: 0.05 }}`.
*   **Selection State (The "Crystalline" effect):**
    *   When a user taps a photo to select it for enhancement, do NOT use a checkbox.
    *   Apply an inset border and glow: `box-shadow: inset 0 0 0 4px #60C0F0, 0 0 24px rgba(96, 192, 240, 0.6);`
    *   Scale the image down slightly: `transform: scale(0.98);`
    *   Overlay a subtle `Wing Purple #8B5CF6` gradient at 20% opacity.
*   **Touch Targets:** Ensure the entire photo card is the touch target (min 44x44px).

### 3. AI Form Analysis HUD (Heads-Up Display)
**Severity:** CRITICAL
**File & Location:** Frontend implementation of `POST /api/gallery/analyze-form` and `backend/services/formAnalysisService.mjs`
**Design Problem:** Displaying raw AI pose data (keypoints, angles) can look like a messy spreadsheet. It needs to look like a high-end sports science broadcast (the "Competitive Arena" theme).
**Design Solution:** An SVG/Canvas overlay directly on the photo, with a cyberpunk/gaming data readout panel.

**Implementation Notes for Claude:**
*   **Skeleton Overlay:**
    *   Draw the `BONES` using `Arctic Cyan #50A0F0`. `stroke-width: 3px; stroke-linecap: round; filter: drop-shadow(0 0 4px #50A0F0);`
    *   Draw the `JOINT_NAMES` (nodes) using `Wing Purple #8B5CF6`. `r="4" fill="#8B5CF6" stroke="#E0ECF4" stroke-width="1.5"`.
*   **Scanning Animation (Loading State):**
    *   While waiting for the Gemini API, animate a horizontal laser line (`height: 2px; background: #60C0F0; box-shadow: 0 0 10px #60C0F0`) scanning up and down the image using Framer Motion.
*   **Data Readout Panel:**
    *   Use `Fira Code` for all numbers and angles (e.g., `160°`).
    *   Use `Sora` for the correction messages.
    *   Severity Colors: If `severity === 'adjust'`, use a warning color derived from the palette, or a pulsing `Wing Purple`.

### 4. Enhancement Credit Gamification (The "Mana Bar")
**Severity:** HIGH
**File & Location:** Frontend implementation of `GET /api/gallery/credits`
**Design Problem:** Users won't understand the "3 free enhancements" rule if it's just text. It needs to be a visual resource, like mana in a video game.
**Design Solution:** A sticky bottom-sheet action bar on mobile (top nav on desktop) showing crystalline token slots.

**Implementation Notes for Claude:**
*   **The Token UI:** Create a component with 3 diamond shapes (rotated squares).
    *   **Available Free Credit:** `background: #60C0F0; box-shadow: 0 0 10px #60C0F0;`
    *   **Used Free Credit:** `background: transparent; border: 1px solid rgba(224, 236, 244, 0.3);` (Frost White)
    *   **Purchased Credits:** Display as a numeric counter with a `Gilded Fern #C6A84B` icon next to it.
*   **Sticky Action Bar:** `position: fixed; bottom: 0; left: 0; right: 0; background: rgba(0, 32, 96, 0.85); backdrop-filter: blur(16px); border-top: 1px solid rgba(96, 192, 240, 0.2); padding: 16px; padding-bottom: env(safe-area-inset-bottom);`

### 5. The VIP Upsell Drama ($175 Conversion)
**Severity:** HIGH
**File & Location:** Frontend implementation of `POST /api/gallery/vip-checkout` and `GET /api/gallery/vip-spots`
**Design Problem:** Asking for $175 requires immense trust and perceived value. A standard checkout button will fail.
**Design Solution:** A dedicated, full-screen takeover modal that feels like an exclusive invitation.

**Implementation Notes for Claude:**
*   **Typography:** Headlines MUST be `Cormorant Garamond Italic`. "Unlock the Ultimate Blueprint."
*   **Color Strategy:** Shift the palette heavily toward `Midnight Sapphire #002060` and `Gilded Fern #C6A84B`. This is the luxury tier.
*   **Urgency Indicator:** Fetch `/vip-spots`. Display it using `Fira Code`: `[ 0${spotsRemaining} / 05 SPOTS REMAINING ]`. Add a slow pulse animation to this text.
*   **Features List:** Use custom SVG checkmarks colored in `Gilded Fern`.
*   **CTA Button:** Large, 56px height. `background: linear-gradient(90deg, #C6A84B 0%, #D4AF37 100%); color: #002060; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;`

### 6. Haptic Voting Micro-interactions
**Severity:** MEDIUM
**File & Location:** Frontend implementation of `POST /api/gallery/vote`
**Design Problem:** Liking a photo should feel physically satisfying to encourage engagement (which drives lead scoring).
**Design Solution:** Spring-physics animations on the thumbs up/down buttons.

**Implementation Notes for Claude:**
*   **Animation:** Use Framer Motion. `whileTap={{ scale: 0.8 }}`.
*   **Active State:** When a vote is cast, trigger a small particle burst (CSS or Framer Motion) and change the icon fill to `Ice Wing #60C0F0`.
*   **Optimistic UI:** Do NOT wait for the backend to return `success: true` to update the UI. Toggle the visual state immediately, and revert it only if the API call fails. Perceived speed is critical here.

---

### Claude, proceed with these architectural directives. 
When building the React components, ensure you are strictly mapping to the `Crystalline Swan` design tokens. Do not introduce arbitrary grays or standard blue links. Every pixel must serve the luxury/tech aesthetic. Let me know when you are ready to review the component structures.

---

## Aggregate Summary

### Critical Findings
**UX & Accessibility:**
- *   **CRITICAL: Missing Error Handling for `getUser()` and `SessionPackage` Imports**
- *   **Rating:** CRITICAL
- *   **CRITICAL: Truncated Code for Gemini Vision Integration**
- *   **Finding:** The `analyzeForm` function is truncated, specifically where the Gemini Vision API call would be. This is a critical gap in the review. If the Gemini Vision integration is not robustly handled (e.g., proper error handling, timeout management, clear response parsing), it could lead to service instability.
- *   **Impact:** Unreliable form analysis directly impacts a core feature. If the AI service fails without graceful degradation or clear feedback, it creates a broken user experience and could be seen as inaccessible if the feature is critical for certain users.
**Security:**
- This audit identifies **CRITICAL** security vulnerabilities in the gallery system, primarily around **insecure JWT handling, missing input validation, and potential PII exposure**. The code demonstrates good architectural patterns (rate limiting, structured logging) but contains dangerous oversights that could lead to account takeover, privilege escalation, and data breaches.
- 1. **CRITICAL**: Remove JWT fallback secret - deploy within 24 hours
- 2. **CRITICAL**: Implement Stripe webhook verification - 48 hours
- The system contains critical vulnerabilities that could lead to complete compromise. However, the codebase shows good security awareness in many areas and can be secured with focused improvements.
- **Recommendation:** Implement all critical/high findings before next production deployment. Conduct penetration testing after fixes are applied.
**Competitive Intelligence:**
- 2.  **Queue the AI:** Refactor the form analysis to be asynchronous. This is critical for scaling to 10k users.
**Frontend UI/UX Expert:**
- **Severity:** CRITICAL
- **Severity:** CRITICAL
- *   **Optimistic UI:** Do NOT wait for the backend to return `success: true` to update the UI. Toggle the visual state immediately, and revert it only if the API call fails. Perceived speed is critical here.

### High Priority Findings
**UX & Accessibility:**
- *   **HIGH: Generic Error Messages**
- *   **Rating:** HIGH
- *   **Impact:** While the messages are helpful, the frontend needs to present these corrections in an accessible way. For users with cognitive disabilities or those relying on screen readers, simply listing text might not be enough. Visual cues (e.g., highlighting joints on an image) must be accompanied by clear, concise, and actionable text.
- *   **Recommendation:** Ensure the frontend design for displaying these corrections is highly accessible. Consider providing a summary of corrections, allowing users to drill down for details, and offering visual aids with proper `aria-describedby` or `aria-labelledby` attributes linking to the textual descriptions. The backend should ensure the `message` is always clear and actionable.
- *   **Finding:** The `/events/:slug/photos` endpoint returns `url`, `thumbnailUrl`, `width`, `height` for all photos. While `thumbnailUrl` is good, the main `url` might be high-resolution.
**Security:**
- 3. **HIGH**: Add input validation with Zod schemas - 72 hours
- 4. **HIGH**: Configure CORS and security headers - 24 hours
- **Current Risk Level: HIGH**
- **Recommendation:** Implement all critical/high findings before next production deployment. Conduct penetration testing after fixes are applied.
**Performance & Scalability:**
- *   **Impact:** For a 10MB high-res photo, you are holding ~30MB of string data in V8 memory per request. Under high load, this will trigger OOM (Out of Memory) kills.
**Competitive Intelligence:**
- **Current State:** The provided `galleryRoutes.mjs` reveals a platform functioning primarily as a **high-conversion lead generation and sales funnel** (Photo Event → AI Analysis → Upsell to VIP PT Session). It is distinct from a daily training app like Trainerize or TrueCoach.
- *   *Value:* Unlike static PT apps, this creates an emotional connection (the "event memory") which drives high-ticket VIP conversions.
- *   *Problem:* The current model relies on high-ticket one-offs. The code shows `isVip` is a binary flag.
**Frontend UI/UX Expert:**
- The backend is robust, but the frontend execution of these endpoints will make or break the perceived value of this platform. We are charging premium prices ($175 for VIP upsells, $89 for prints). A standard Bootstrap-style frontend will destroy trust. We must execute the **Enchanted Apex: Crystalline Swan** theme with absolute precision. This means deep-ocean glassmorphism, frozen-forest micro-interactions, and high-tech gaming HUDs for the AI features.
- **Design Problem:** Standard login forms feel cheap. This is a private gallery; it needs to feel like unlocking a high-end, deep-ocean luxury vault.
- **Severity:** HIGH
- **Design Problem:** Displaying raw AI pose data (keypoints, angles) can look like a messy spreadsheet. It needs to look like a high-end sports science broadcast (the "Competitive Arena" theme).
- **Severity:** HIGH

---

*SwanStudios Validation Orchestrator v8.0 — AI Village Edition*
*7 Validators: Gemini 2.5 Flash + Claude 4.5 Sonnet + DeepSeek V3.2 x2 + Gemini 3 Flash + MiniMax M2.1 + MiniMax M2.5 + Gemini 3.1 Pro*
