# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 46.8s
> **Files:** backend/core/routes.mjs, backend/routes/achPaymentRoutes.mjs, backend/webhooks/stripeWebhook.mjs
> **Generated:** 3/14/2026, 11:13:28 AM

---

# Code Review: SwanStudios Backend Routes & Payment System

## Executive Summary
This review covers three critical backend files managing routing, ACH payments, and Stripe webhooks. The code demonstrates solid architecture but has several critical issues around error handling, type safety (for future TypeScript migration), and potential race conditions.

---

## 1️⃣ backend/core/routes.mjs

### CRITICAL Issues

#### C1: Missing Error Handling in Route Setup
**Severity:** CRITICAL  
**Location:** `setupRoutes()` function (entire file)

```mjs
export const setupRoutes = async (app) => {
  // No try-catch wrapper around route registration
  app.use('/api/auth', authRoutes);
  // ... 100+ route registrations
}
```

**Problem:** If any route module fails to import or throws during registration, the entire server crashes with no graceful degradation.

**Fix:**
```mjs
export const setupRoutes = async (app) => {
  try {
    // Wrap critical route groups in individual try-catch
    try {
      app.use('/api/auth', authRoutes);
      app.use('/api/profile', profileRoutes);
    } catch (err) {
      logger.error('Failed to register core routes:', err);
      throw err; // Core routes are critical
    }

    try {
      app.use('/api/v2/payments', v2PaymentRoutes);
    } catch (err) {
      logger.error('Failed to register payment routes:', err);
      // Continue without payments in dev, fail in prod
      if (process.env.NODE_ENV === 'production') throw err;
    }
    
    // ... repeat for route groups
  } catch (err) {
    logger.error('Critical route setup failure:', err);
    throw err;
  }
};
```

---

#### C2: Photo Proxy Route Injection Vulnerability
**Severity:** CRITICAL  
**Location:** Lines 530-570 (photo proxy routes)

```mjs
app.get('/api/serve-photo/photos/:category/:userId/:yearMonth/:filename', async (req, res) => {
  const { category, userId, yearMonth, filename } = req.params;
  const objectKey = `photos/${category}/${userId}/${yearMonth}/${filename}`;
  
  // Validation exists but insufficient
  if (!/^[\w-]+\.\w+$/.test(filename)) { /* ... */ }
```

**Problems:**
1. Regex `[\w-]+\.\w+` allows `../../etc/passwd.jpg`
2. No path traversal protection in `objectKey` construction
3. Missing file extension whitelist

**Fix:**
```mjs
// Add at top of file
const ALLOWED_PHOTO_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov']);
const ALLOWED_CATEGORIES = new Set(['profiles', 'banners', 'measurements', 'social-photos', 'social-videos']);

app.get('/api/serve-photo/photos/:category/:userId/:yearMonth/:filename', async (req, res) => {
  const { category, userId, yearMonth, filename } = req.params;
  
  // Strict validation
  if (!ALLOWED_CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  
  if (!/^\d+$/.test(userId)) {
    return res.status(400).json({ error: 'Invalid userId' });
  }
  
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return res.status(400).json({ error: 'Invalid yearMonth' });
  }
  
  // Prevent path traversal
  const sanitizedFilename = path.basename(filename);
  if (sanitizedFilename !== filename || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  const ext = path.extname(sanitizedFilename).slice(1).toLowerCase();
  if (!ALLOWED_PHOTO_EXTENSIONS.has(ext)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }
  
  // Safe to construct path now
  const objectKey = `photos/${category}/${userId}/${yearMonth}/${sanitizedFilename}`;
  // ... rest of logic
});
```

---

### HIGH Issues

#### H1: Duplicate Route Registration Risk
**Severity:** HIGH  
**Location:** Lines 200-220 (video routes)

```mjs
// V2 routes
app.use('/api/v2/videos', videoCatalogPublicRoutes);
app.use('/api/v2/videos', videoCatalogMemberRoutes);
app.use('/api/v2/admin/videos', videoCatalogAdminRoutes);

// Legacy routes
app.use('/api/videos', publicVideoRoutes);
app.use('/api/admin/videos', videoLibraryRoutes); // CONFLICT RISK
```

**Problem:** Multiple routers on same base path can cause route shadowing. Express matches first-registered route.

**Fix:**
```mjs
// Document route precedence explicitly
// ===================== VIDEO ROUTES (PRECEDENCE ORDER) =====================
// 1. V2 Admin routes (most specific)
app.use('/api/v2/admin/videos', videoCatalogAdminRoutes);
app.use('/api/v2/admin/youtube', youtubeImportRoutes);

// 2. V2 Public/Member routes
app.use('/api/v2/videos', videoCatalogMemberRoutes); // Protected routes first
app.use('/api/v2/videos', videoCatalogPublicRoutes); // Public fallback

// 3. Legacy routes (deprecated, maintain for backward compat)
app.use('/api/admin/videos', videoLibraryRoutes);
app.use('/api/videos', publicVideoRoutes);

// Add route conflict detection in dev
if (process.env.NODE_ENV !== 'production') {
  const registeredRoutes = new Set();
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      const path = middleware.route.path;
      if (registeredRoutes.has(path)) {
        logger.warn(`⚠️ Duplicate route detected: ${path}`);
      }
      registeredRoutes.add(path);
    }
  });
}
```

---

#### H2: Missing Rate Limiting on Public Endpoints
**Severity:** HIGH  
**Location:** Lines 150-160 (basic endpoints)

```mjs
app.get('/', (req, res) => {
  res.json({ message: 'SwanStudios API Server is running' });
});

app.get('/test', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

**Problem:** No rate limiting on public endpoints allows DoS attacks.

**Fix:**
```mjs
import rateLimit from 'express-rate-limit';

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/', publicLimiter, (req, res) => {
  res.json({ message: 'SwanStudios API Server is running' });
});
```

---

### MEDIUM Issues

#### M1: Hardcoded Environment Check Pattern
**Severity:** MEDIUM  
**Location:** Multiple locations

```mjs
const isProduction = process.env.NODE_ENV === 'production';
// ... later
if (process.env.NODE_ENV !== 'production') { /* ... */ }
```

**Problem:** Inconsistent environment checking (strict equality vs inequality).

**Fix:**
```mjs
// Add at top of file
const ENV = {
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
};

// Use consistently
if (ENV.isDevelopment) {
  app.use('/api/debug', debugRoutes);
}
```

---

#### M2: Inline Route Handlers in Core Config
**Severity:** MEDIUM  
**Location:** Lines 530-650 (photo proxy handlers)

**Problem:** 120+ lines of business logic in routing config violates separation of concerns.

**Fix:**
```mjs
// Extract to backend/routes/photoProxyRoutes.mjs
import { createPhotoProxyRouter } from '../routes/photoProxyRoutes.mjs';

export const setupRoutes = async (app) => {
  // ...
  app.use('/api/serve-photo', createPhotoProxyRouter());
  app.use('/photos', createPhotoProxyRouter({ legacyMode: true }));
};
```

---

### LOW Issues

#### L1: Commented-Out Code Clutter
**Severity:** LOW  
**Location:** Lines 30-35, 50-55, etc.

```mjs
// ARCHIVED: Legacy payment routes (moved to _ARCHIVED)
// import checkoutRoutes from '../routes/checkoutRoutes.mjs';
// import paymentRoutes from '../routes/paymentRoutes.mjs';
```

**Fix:** Remove commented imports. Use git history for archaeology.

---

#### L2: Inconsistent Route Grouping Comments
**Severity:** LOW  
**Location:** Throughout file

**Problem:** Some sections use `=====`, others use `─────`, inconsistent capitalization.

**Fix:**
```mjs
// Standardize to:
// ═══════════════════════════════════════════════════════════
// SECTION NAME
// ═══════════════════════════════════════════════════════════
```

---

## 2️⃣ backend/routes/achPaymentRoutes.mjs

### CRITICAL Issues

#### C3: Race Condition in Order Creation
**Severity:** CRITICAL  
**Location:** Lines 60-95 (`/create-intent` endpoint)

```mjs
const order = await Order.create({
  userId,
  orderNumber,
  totalAmount: totalWithFee.toNumber(),
  status: 'pending',
  paymentMethod: 'ach',
  // ...
});

const paymentIntent = await stripe.paymentIntents.create({ /* ... */ });

await order.update({ paymentId: paymentIntent.id });
```

**Problem:** If Stripe call fails after order creation, orphaned order exists with no `paymentId`.

**Fix:**
```mjs
let order;
let paymentIntent;

try {
  // Create PaymentIntent FIRST
  paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalWithFee.times(100).toNumber()),
    currency: 'usd',
    payment_method_types: ['us_bank_account'],
    metadata: {
      orderNumber, // Use temporary order number
      userId: userId.toString(),
      source: 'swanstudios_ach',
    },
  });

  // Then create order with paymentId
  order = await Order.create({
    userId,
    orderNumber,
    totalAmount: totalWithFee.toNumber(),
    status: 'pending',
    paymentMethod: 'ach',
    paymentId: paymentIntent.id, // Set immediately
    notes: JSON.stringify({ items, customerInfo, subtotal: serverTotal.toNumber(), fee: fee.toNumber() }),
  });

  // Update PaymentIntent with orderId
  await stripe.paymentIntents.update(paymentIntent.id, {
    metadata: { orderId: order.id.toString() },
  });

} catch (err) {
  // Cleanup: cancel PaymentIntent if order creation failed
  if (paymentIntent && !order) {
    await stripe.paymentIntents.cancel(paymentIntent.id).catch(cancelErr => {
      logger.error('[ACH] Failed to cancel orphaned PaymentIntent:', cancelErr);
    });
  }
  throw err;
}
```

---

#### C4: Missing Idempotency Key Handling
**Severity:** CRITICAL  
**Location:** Line 45 (`/create-intent`)

```mjs
const { items, customerInfo, total, idempotencyKey } = req.body;
// idempotencyKey is extracted but NEVER USED
```

**Problem:** Duplicate requests (network retry, user double-click) create multiple orders and charges.

**Fix:**
```mjs
router.post('/create-intent', protect, async (req, res) => {
  const { items, customerInfo, total, idempotencyKey } = req.body;

  if (!idempotencyKey) {
    return res.status(400).json({ 
      success: false, 
      message: 'Idempotency key required' 
    });
  }

  // Check for existing order with this idempotency key
  const existingOrder = await Order.findOne({
    where: {
      userId: req.user.id,
      notes: { [Op.like]: `%"idempotencyKey":"${idempotencyKey}"%` }
    }
  });

  if (existingOrder && existingOrder.paymentId) {
    // Return existing PaymentIntent
    const existingPI = await stripe.paymentIntents.retrieve(existingOrder.paymentId);
    return res.json({
      success: true,
      clientSecret: existingPI.client_secret,
      orderNumber: existingOrder.orderNumber,
      orderId: existingOrder.id,
      // ... existing totals
    });
  }

  // Proceed with new order creation...
  const paymentIntent = await stripe.paymentIntents.create({
    // ... existing config
    idempotency_key: idempotencyKey, // Pass to Stripe
  });
});
```

---

### HIGH Issues

#### H3: Insufficient Price Validation Tolerance
**Severity:** HIGH  
**Location:** Lines 65-75

```mjs
// Allow small rounding tolerance ($0.02)
if (clientTotal.minus(serverTotal).abs().greaterThan(0.02)) {
  return res.status(409).json({
    success: false,
    code: 'PRICE_MISMATCH',
    message: 'Prices have been updated. Please refresh and try again.',
    updatedTotal: serverTotal.toNumber(),
  });
}
```

**Problem:** 
1. $0.02 tolerance is arbitrary and undocumented
2. Doesn't account for ACH fee in comparison
3. No logging of mismatches for fraud detection

**Fix:**
```mjs
const PRICE_TOLERANCE = new Decimal(0.01); // 1 cent tolerance (document why)

// Compare total INCLUDING fee
const serverTotalWithFee = serverTotal.plus(fee);
const priceDiff = clientTotal.minus(serverTotalWithFee).abs();

if (priceDiff.greaterThan(PRICE_TOLERANCE)) {
  logger.warn('[ACH] Price mismatch detected', {
    userId: req.user.id,
    clientTotal: clientTotal.toNumber(),
    serverTotal: serverTotalWithFee.toNumber(),
    difference: priceDiff.toNumber(),
    items: items.map(i => ({ id: i.storefrontItemId, qty: i.quantity })),
  });

  return res.status(409).json({
    success: false,
    code: 'PRICE_MISMATCH',
    message: 'Prices have been updated. Please refresh and try again.',
    updatedSubtotal: serverTotal.toNumber(),
    updatedFee: fee.toNumber(),
    updatedTotal: serverTotalWithFee.toNumber(),
  });
}
```

---

#### H4: Hardcoded ACH Fee Calculation
**Severity:** HIGH  
**Location:** Line 62

```mjs
// ACH fee: min(total * 0.008, $5)
const fee = Decimal.min(serverTotal.times(0.008), new Decimal(5));
```

**Problem:** Fee structure hardcoded. Changing requires code deployment.

**Fix:**
```mjs
// backend/config/paymentConfig.mjs
export const ACH_FEE_CONFIG = {
  percentage: 0.008, // 0.8%
  maxFee: 5.

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
