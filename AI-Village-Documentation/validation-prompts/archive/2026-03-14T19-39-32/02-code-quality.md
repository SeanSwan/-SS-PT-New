# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 41.5s
> **Files:** AI-Village-Documentation/validation-prompts/archive/2026-03-14T18-13-28/01-ux-accessibility.md, AI-Village-Documentation/validation-prompts/archive/2026-03-14T18-13-28/02-code-quality.md, AI-Village-Documentation/validation-prompts/archive/2026-03-14T18-13-28/03-security.md, AI-Village-Documentation/validation-prompts/archive/2026-03-14T18-13-28/04-performance.md, AI-Village-Documentation/validation-prompts/archive/2026-03-14T18-13-28/05-competitive-intel.md, AI-Village-Documentation/validation-prompts/archive/2026-03-14T18-13-28/06-user-research.md, AI-Village-Documentation/validation-prompts/archive/2026-03-14T18-13-28/07-architecture-bugs.md, AI-Village-Documentation/validation-prompts/archive/2026-03-14T18-13-28/08-code-quality-debate.md
> **Generated:** 3/14/2026, 12:39:32 PM

---

# Code Quality Review: SwanStudios Backend Validation Reports

## Overview
These are **validation reports** (markdown documentation), not executable code. However, they contain critical findings about backend code that require immediate attention.

---

## CRITICAL FINDINGS

### 1. Webhook Security Vulnerability ⚠️
**Rating:** CRITICAL  
**File Referenced:** `backend/webhooks/stripeWebhook.mjs`

```javascript
// CURRENT (VULNERABLE):
if (!webhookSecret) {
  logger.warn('Stripe webhook secret not configured');
  event = req.body; // ❌ Accepts unverified webhooks
}
```

**Issues:**
- **No TypeScript types** - `event` is implicitly `any`
- **Fail-open security** - Processes unverified webhooks
- **Missing error boundary** - No try/catch around webhook processing

**Recommended Fix:**
```typescript
interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Stripe.Checkout.Session | Stripe.PaymentIntent;
  };
}

const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  if (!webhookSecret) {
    logger.error('CRITICAL: Stripe webhook secret not configured', {
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({ error: 'Webhook configuration error' });
  }

  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      throw new Error('Missing signature');
    }
    
    const event = stripeClient.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    ) as StripeWebhookEvent;
    
    await processWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook verification failed', { 
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
    res.status(400).json({ error: 'Invalid signature' });
  }
};
```

---

### 2. Race Condition in Order Creation ⚠️
**Rating:** CRITICAL  
**File Referenced:** `backend/routes/achPaymentRoutes.mjs`

```javascript
// CURRENT (RACE CONDITION):
const order = await Order.create({ /* ... */ });
const paymentIntent = await stripe.paymentIntents.create({ /* ... */ });
await order.update({ paymentId: paymentIntent.id });
// ❌ If Stripe fails, orphaned order exists
```

**Issues:**
- **No transaction wrapper** - Partial state possible
- **Missing TypeScript types** - Order and PaymentIntent are untyped
- **No error recovery** - Orphaned orders accumulate

**Recommended Fix:**
```typescript
interface OrderData {
  userId: number;
  orderNumber: string;
  totalAmount: number;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: 'ach' | 'card';
  paymentId?: string;
}

const createACHOrder = async (
  orderData: Omit<OrderData, 'paymentId'>,
  stripeMetadata: Record<string, string>
): Promise<{ order: Order; paymentIntent: Stripe.PaymentIntent }> => {
  const transaction = await sequelize.transaction();
  
  try {
    // Create PaymentIntent FIRST (can be cancelled if order fails)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(orderData.totalAmount * 100),
      currency: 'usd',
      payment_method_types: ['us_bank_account'],
      metadata: stripeMetadata,
    });

    // Then create order with paymentId
    const order = await Order.create(
      {
        ...orderData,
        paymentId: paymentIntent.id,
      },
      { transaction }
    );

    await transaction.commit();
    return { order, paymentIntent };
    
  } catch (err) {
    await transaction.rollback();
    
    // Cleanup: Cancel PaymentIntent if it was created
    if (paymentIntent) {
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(cancelErr => {
        logger.error('Failed to cancel orphaned PaymentIntent', { 
          paymentIntentId: paymentIntent.id,
          error: cancelErr 
        });
      });
    }
    
    throw err;
  }
};
```

---

### 3. Missing Idempotency Implementation ⚠️
**Rating:** CRITICAL  
**File Referenced:** `backend/routes/achPaymentRoutes.mjs`

```javascript
// CURRENT (NO IDEMPOTENCY):
const { idempotencyKey } = req.body;
// ❌ Key extracted but never used
```

**Issues:**
- **Duplicate charge risk** - Network retries create multiple orders
- **No TypeScript validation** - `idempotencyKey` could be any type
- **Missing database constraint** - No unique index on idempotency key

**Recommended Fix:**
```typescript
interface CreateIntentRequest {
  items: Array<{ storefrontItemId: number; quantity: number }>;
  customerInfo: Record<string, unknown>;
  total: number;
  idempotencyKey: string; // Required, validated as UUID
}

router.post('/create-intent', protect, async (req: Request, res: Response) => {
  const { idempotencyKey, ...orderData } = req.body as CreateIntentRequest;

  // Validate idempotency key format
  if (!isValidUUID(idempotencyKey)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid idempotency key format' 
    });
  }

  // Check for existing order
  const existingOrder = await Order.findOne({
    where: {
      userId: req.user.id,
      idempotencyKey, // Add this column to Order model
    },
  });

  if (existingOrder?.paymentId) {
    const existingPI = await stripe.paymentIntents.retrieve(existingOrder.paymentId);
    return res.json({
      success: true,
      clientSecret: existingPI.client_secret,
      orderNumber: existingOrder.orderNumber,
      orderId: existingOrder.id,
    });
  }

  // Create new order with idempotency key
  const { order, paymentIntent } = await createACHOrder(
    { ...orderData, userId: req.user.id, idempotencyKey },
    { idempotencyKey }
  );

  res.json({
    success: true,
    clientSecret: paymentIntent.client_secret,
    orderNumber: order.orderNumber,
    orderId: order.id,
  });
});
```

**Required Migration:**
```sql
ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(36);
CREATE UNIQUE INDEX idx_orders_idempotency ON orders(user_id, idempotency_key);
```

---

## HIGH PRIORITY FINDINGS

### 4. Path Traversal Vulnerability
**Rating:** HIGH  
**File Referenced:** `backend/core/routes.mjs`

```javascript
// CURRENT (VULNERABLE):
const { filename } = req.params;
if (!/^[\w-]+\.\w+$/.test(filename)) { /* ... */ }
// ❌ Allows: ../../etc/passwd.jpg
```

**Recommended Fix:**
```typescript
import path from 'path';

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4']);
const ALLOWED_CATEGORIES = new Set(['profiles', 'banners', 'measurements']);

app.get('/api/serve-photo/photos/:category/:userId/:yearMonth/:filename', 
  async (req: Request, res: Response) => {
    const { category, userId, yearMonth, filename } = req.params;

    // Validate category
    if (!ALLOWED_CATEGORIES.has(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Validate userId is numeric
    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    // Validate yearMonth format
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ error: 'Invalid yearMonth' });
    }

    // Prevent path traversal
    const sanitizedFilename = path.basename(filename);
    if (sanitizedFilename !== filename || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Validate file extension
    const ext = path.extname(sanitizedFilename).slice(1).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const objectKey = `photos/${category}/${userId}/${yearMonth}/${sanitizedFilename}`;
    // ... rest of logic
  }
);
```

---

### 5. Hardcoded Payment Fee Logic
**Rating:** HIGH  
**File Referenced:** `backend/routes/achPaymentRoutes.mjs`

```javascript
// CURRENT (HARDCODED):
const fee = Decimal.min(serverTotal.times(0.008), new Decimal(5));
// ❌ Requires code deployment to change fees
```

**Recommended Fix:**
```typescript
// config/paymentConfig.ts
export interface ACHFeeConfig {
  percentage: number;
  maxFee: number;
  minFee: number;
}

export const getACHFeeConfig = async (): Promise<ACHFeeConfig> => {
  // Fetch from database or config service
  return {
    percentage: 0.008, // 0.8%
    maxFee: 5.00,
    minFee: 0.00,
  };
};

// routes/achPaymentRoutes.ts
const calculateACHFee = (subtotal: Decimal, config: ACHFeeConfig): Decimal => {
  const percentageFee = subtotal.times(config.percentage);
  return Decimal.max(
    Decimal.min(percentageFee, new Decimal(config.maxFee)),
    new Decimal(config.minFee)
  );
};

router.post('/create-intent', protect, async (req, res) => {
  const feeConfig = await getACHFeeConfig();
  const fee = calculateACHFee(serverTotal, feeConfig);
  // ...
});
```

---

## MEDIUM PRIORITY FINDINGS

### 6. Missing Rate Limiting
**Rating:** MEDIUM  
**File Referenced:** `backend/core/routes.mjs`

```typescript
import rateLimit from 'express-rate-limit';

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests',
  standardHeaders: true,
});

app.get('/', publicLimiter, (req, res) => {
  res.json({ message: 'SwanStudios API Server is running' });
});
```

---

### 7. Inconsistent Error Handling
**Rating:** MEDIUM  
**Multiple Files**

**Create centralized error handler:**
```typescript
// middleware/errorHandler.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  logger.error('Unhandled error', { error: err });
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

// Usage:
throw new AppError(400, 'Invalid idempotency key');
```

---

## PERFORMANCE ANTI-PATTERNS

### 8. N+1 Query in Webhook Processing
**Rating:** MEDIUM  
**File Referenced:** `backend/webhooks/stripeWebhook.mjs`

```typescript
// CURRENT (N+1):
for (const item of cart.cartItems) {
  await addSessionsToUserAccount(item);
  await triggerPurchaseAchievements(item);
}

// OPTIMIZED:
const totalSessions = cart.cartItems.reduce((sum, item) => sum + item.sessions, 0);
await User.increment('availableSessions', { 
  by: totalSessions, 
  where: { id: userId } 
});

await Promise.all([
  ...cart.cartItems.map(item => triggerPurchaseAchievements(item)),
  notifyMCPServers(cart),
]);
```

---

## STYLED-COMPONENTS CONCERNS

### 9. Theme Token Validation
**Rating:** LOW  
**Note:** Backend files don't use styled-components, but frontend should enforce:

```typescript
// theme.ts
export const theme = {
  colors: {
    primary: '#002060', // Midnight Sapphire
    surface: '#003080', // Royal Depth
    accent: '#60C0F0', // Ice Wing
    // ❌ NEVER use retired colors:
    // galaxyDark: '#0a0a1a', 
    // cyan: '#00FFFF',
  },
} as const;

// Enforce in styled-components:
const Button = styled.button<{ variant: keyof typeof theme.colors }>`
  background: ${props => theme.colors[props.variant]};
  /* ❌ Never: background: #0a0a1a; */
`;
```

---

## SUMMARY

| Priority | Count | Must Fix Before Production |
|----------|-------|---------------------------|
| CRITICAL | 3 | ✅ YES |
| HIGH | 2 | ✅ YES |
| MEDIUM | 4 | ⚠️ Recommended |
| LOW | 1 | ❌ No |

### Immediate Actions Required:
1. **Fix webhook security** (2 hours)
2. **Implement idempotency** (4 hours)
3. **Add transaction wrapper to order creation** (3 hours)
4. **Path traversal fix** (1 hour)

**Estimated Total:** 10 hours of critical fixes before next production deployment.

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
