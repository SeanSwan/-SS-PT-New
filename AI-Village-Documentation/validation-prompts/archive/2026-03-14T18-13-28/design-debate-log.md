# UX/UI Design Quality — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 4
> **Tokens:** 32,835 input / 7,142 output

---

## Creative Director (Lead Design Authority) — Round 1

As the Creative Director of SwanStudios, I look at backend code differently than a standard engineer. You see endpoints, middleware, and database queries. **I see the invisible scaffolding of a premium user experience.** 

A flawless, high-ticket UI (our Crystalline Swan theme) is instantly shattered if the backend returns lazy error messages, drops order histories, or risks double-charging a client. Our clients pay premium prices; they expect zero friction. The backend must serve the frontend's need for elegance, speed, and absolute reliability.

Here is my authoritative design and UX mandate for these backend files.

---

### 1. The "Refresh and Try Again" Insult (UX Friction)
**Severity:** HIGH
**File & Location:** `backend/routes/achPaymentRoutes.mjs` (Lines 68-75)
**Design Problem:** 
Returning `"Prices have been updated. Please refresh and try again."` is unacceptable for a luxury platform. We do not tell high-ticket clients to "refresh" when they are trying to hand us money. This is lazy backend design forcing a jarring, broken UX on the frontend. 
**Design Solution & UI Expectation:**
The backend must return a highly structured payload so the frontend can seamlessly slide up a **Price Adjustment Modal** (Surface: `Royal Depth #003080`, Glow: `Wing Purple #8B5CF6`). The user should just click a `Gilded Fern #C6A84B` "Accept New Total" button.
**Implementation Notes:**
Update the `PRICE_MISMATCH` response to include the exact delta so the UI can animate the price change using `Fira Code` typography.
```javascript
// CHANGE FROM:
return res.status(409).json({
  success: false,
  code: 'PRICE_MISMATCH',
  message: 'Prices have been updated. Please refresh and try again.',
  updatedTotal: serverTotal.toNumber(),
});

// CHANGE TO:
return res.status(409).json({
  success: false,
  code: 'PRICE_MISMATCH',
  message: 'Cart total has been recalculated based on real-time pricing.',
  actionRequired: 'CONFIRM_NEW_TOTAL',
  pricingData: {
    previousTotal: clientTotal.toNumber(),
    updatedTotal: serverTotal.toNumber(),
    delta: serverTotal.minus(clientTotal).toNumber(),
    currency: 'USD'
  }
});
```

### 2. The Ghost Town Order History (Missing Data = Broken UI)
**Severity:** CRITICAL
**File & Location:** `backend/webhooks/stripeWebhook.mjs` (Lines 340-360)
**Design Problem:** 
The `createOrderRecord` function is *commented out*. This means when a user navigates to their "Billing History" tab on the frontend, the UI will be an empty state. A client who just dropped $2,500 on a coaching package needs immediate, beautiful visual confirmation of their receipt. 
**Design Solution & UI Expectation:**
The frontend Billing UI relies on this data to render a sleek, data-dense table (Headers in `Plus Jakarta Sans`, Data in `Fira Code`, Status badges in `Ice Wing #60C0F0`). If the backend doesn't write it, the frontend can't paint it.
**Implementation Notes:**
Uncomment and implement the database write immediately. 
```javascript
// REQUIRED IMPLEMENTATION:
async function createOrderRecord(cart) {
  try {
    const { default: Order } = await import('../models/Order.mjs');
    const newOrder = await Order.create({
      userId: cart.userId,
      cartId: cart.id,
      orderNumber: `SWAN-${Date.now().toString().slice(-6)}`, // Required for UI display
      orderStatus: 'completed',
      paymentStatus: 'paid',
      totalAmount: cart.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      // Store JSON snapshot for immutable receipt rendering
      receiptData: cart.cartItems.map(item => ({
        itemId: item.storefrontItemId,
        quantity: item.quantity,
        price: item.price,
        name: item.storefrontItem?.name || 'Premium Package'
      })),
      completedAt: new Date()
    });
    logger.info(`Created order record for cart ${cart.id}`);
  } catch (error) {
    logger.error(`Error creating order record: ${error.message}`);
  }
}
```

### 3. Brand Discipline in Internal Tools (Debug UI)
**Severity:** LOW (But mandatory for brand consistency)
**File & Location:** `backend/core/routes.mjs` (Lines 330-360)
**Design Problem:** 
The `/debug` endpoint serves a raw HTML page with default browser styling (`background: #f1f1f1`, `font-family: Arial`). Even our internal developer tools should reflect the Crystalline Swan aesthetic. We do not use default gray and green (`#4CAF50`) anywhere in this company.
**Design Solution:**
Inject our core design tokens into the inline CSS. 
- Background: `Midnight Sapphire #002060`
- Surface: `Royal Depth #003080`
- Text: `Frost White #E0ECF4`
- Buttons: `Ice Wing #60C0F0` with `Wing Purple #8B5CF6` hover glow.
- Font: `Sora` (fallback to sans-serif).
**Implementation Notes:**
Replace the `debugHtml` string with this branded version:
```html
<style>
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600&family=Fira+Code&display=swap');
    body { 
        font-family: 'Sora', sans-serif; 
        background-color: #002060; /* Midnight Sapphire */
        color: #E0ECF4; /* Frost White */
        max-width: 800px; 
        margin: 0 auto; 
        padding: 40px 20px; 
    }
    h1, h2 { font-weight: 600; letter-spacing: -0.02em; }
    .button { 
        background: #60C0F0; /* Ice Wing */
        color: #002060; 
        font-family: 'Sora', sans-serif;
        font-weight: 600;
        padding: 12px 24px; 
        border: none; 
        border-radius: 8px; 
        cursor: pointer; 
        margin: 5px; 
        transition: all 0.2s ease;
    }
    .button:hover {
        box-shadow: 0 0 15px #8B5CF6; /* Wing Purple Glow */
        transform: translateY(-1px);
    }
    .result { 
        background: #003080; /* Royal Depth */
        border: 1px solid #50A0F0; /* Arctic Cyan */
        border-radius: 8px;
        padding: 20px; 
        margin-top: 20px; 
        font-family: 'Fira Code', monospace; /* Data font */
        font-size: 14px;
        white-space: pre-wrap; 
        word-wrap: break-word; 
    }
</style>
```

### 4. The Unforgivable Double Charge Risk (Idempotency)
**Severity:** CRITICAL
**File & Location:** `backend/routes/achPaymentRoutes.mjs` (Lines 77-93)
**Design Problem:** 
The frontend passes an `idempotencyKey` in the request body, but the backend `Order.create` completely ignores it. If a user has a slow connection and double-clicks the "Submit Payment" button (which should be disabled via UI state, but we must protect at the API level), we will create two pending orders and two Stripe intents. A double charge is the fastest way to lose a premium client.
**Design Solution & UI Expectation:**
The backend must guarantee that a single user action results in a single transaction. 
**Implementation Notes:**
Modify the order creation to use the idempotency key to prevent duplicate database entries.
```javascript
// CHANGE FROM:
const order = await Order.create({ ... });

// CHANGE TO:
// Ensure we don't create duplicate orders for the same checkout attempt
const [order, created] = await Order.findOrCreate({
  where: { 
    // Assuming you add an idempotencyKey column to the Order model
    idempotencyKey: idempotencyKey || `fallback-${Date.now()}` 
  },
  defaults: {
    userId,
    orderNumber,
    totalAmount: totalWithFee.toNumber(),
    status: 'pending',
    paymentMethod: 'ach',
    notes: JSON.stringify({ items, customerInfo, subtotal: serverTotal.toNumber(), fee: fee.toNumber() }),
  }
});

if (!created && order.paymentId) {
  // If order exists and already has a payment intent, return the existing one
  // This allows the frontend UI to seamlessly resume a dropped connection
  const existingIntent = await stripe.paymentIntents.retrieve(order.paymentId);
  return res.json({
    success: true,
    clientSecret: existingIntent.client_secret,
    orderNumber: order.orderNumber,
    orderId: order.id,
    resumed: true // Flag for the UI to know it's a resumed session
  });
}
```

### Summary from the Director's Desk
Do not treat backend code as isolated from the user experience. Every missing database record is a blank screen on the frontend. Every unhandled edge case is a loading spinner that never resolves. Implement these changes immediately so the engineering foundation matches the Crystalline Swan visual standard.

---

## Design Collaborator — Round 2

## Design Collaborator Response — Round 1

I appreciate the Creative Director's holistic view of backend-as-UX-foundation. The framing is correct: **backend responses directly shape frontend experience quality**. However, I must dispute implementation specifics on several points while agreeing with the core design principles.

---

## AGREEMENTS

### ✓ Issue #2: Ghost Town Order History
**FULLY AGREE** — This is indeed CRITICAL. The commented-out `createOrderRecord` function breaks the entire billing history feature. The proposed implementation is sound, though I'd suggest one enhancement:

```javascript
// ADD to the proposed solution:
orderNumber: `SWAN-${Date.now().toString(36).toUpperCase().slice(-8)}`, // More readable format
```

### ✓ Issue #3: Brand Discipline in Debug UI
**AGREE IN PRINCIPLE** — Internal tools should reflect brand standards. The proposed CSS is production-ready. Minor suggestion: add a `prefers-reduced-motion` media query for accessibility:

```css
@media (prefers-reduced-motion: reduce) {
    .button { transition: none; }
    .button:hover { transform: none; }
}
```

---

## DISAGREEMENTS

### ⚠️ Issue #1: Price Mismatch Response — PARTIAL DISPUTE

**AGREE:** The UX problem is real. "Refresh and try again" is poor experience.

**DISAGREE:** The proposed solution is **incomplete and potentially dangerous**.

**Problems with the proposed implementation:**

1. **Race Condition Risk**: Returning `previousTotal` from the client request creates a trust issue. If prices changed between cart load and checkout, the `previousTotal` the client *thinks* they saw may not match what the server *actually* calculated at cart load time.

2. **Missing Cart State**: The frontend needs the **updated cart items** with new prices, not just totals. The modal must show *which items* changed price.

3. **Security Gap**: The `delta` calculation uses client-provided data (`clientTotal`) which could be manipulated.

**COUNTER-PROPOSAL:**
```javascript
// BETTER IMPLEMENTATION:
return res.status(409).json({
  success: false,
  code: 'PRICE_MISMATCH',
  message: 'Cart total has been recalculated based on real-time pricing.',
  actionRequired: 'CONFIRM_NEW_TOTAL',
  pricingData: {
    // Don't trust client's previousTotal - recalculate from cart snapshot
    previousTotal: cart.snapshotTotal || clientTotal.toNumber(), // Use server-side snapshot if available
    updatedTotal: serverTotal.toNumber(),
    delta: serverTotal.minus(cart.snapshotTotal || clientTotal).toNumber(),
    currency: 'USD',
    // CRITICAL: Include updated cart items so UI can show what changed
    updatedItems: items.map(item => ({
      id: item.storefrontItemId,
      name: item.storefrontItem?.name,
      previousPrice: item.snapshotPrice, // Requires storing price at cart-add time
      currentPrice: item.price,
      quantity: item.quantity
    }))
  }
});
```

**Required Backend Changes:**
- Add `snapshotPrice` column to `CartItem` model (store price at add-to-cart time)
- Add `snapshotTotal` column to `Cart` model (store total at cart creation)
- Update cart creation logic to capture these snapshots

---

### ⚠️ Issue #4: Double Charge Risk — STRONG DISPUTE

**AGREE:** Idempotency is critical. Double charges are unacceptable.

**DISAGREE:** The proposed `findOrCreate` solution is **architecturally flawed** and creates worse problems than it solves.

**Problems with the proposed implementation:**

1. **Wrong Layer**: Idempotency should be handled at the **Stripe API call**, not the database layer. Stripe already has built-in idempotency key support.

2. **Database Pollution**: Using `findOrCreate` on the Order table means failed payment attempts leave orphaned "pending" orders forever.

3. **State Confusion**: The `resumed: true` flag assumes the existing payment intent is still valid. Payment intents expire after 24 hours.

4. **Missing Cleanup**: No mechanism to clean up abandoned orders from network failures.

**COUNTER-PROPOSAL:**
```javascript
// CORRECT IMPLEMENTATION:

// 1. Use Stripe's native idempotency (already in code at line 95-99)
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(totalWithFee.toNumber() * 100),
  currency: 'usd',
  payment_method_types: ['us_bank_account'],
  metadata: {
    orderNumber,
    userId: userId.toString(),
  },
}, {
  idempotencyKey // Stripe handles deduplication automatically
});

// 2. ONLY create order AFTER successful payment intent creation
const order = await Order.create({
  userId,
  orderNumber,
  totalAmount: totalWithFee.toNumber(),
  status: 'pending',
  paymentMethod: 'ach',
  paymentId: paymentIntent.id, // Link to Stripe intent
  idempotencyKey, // Store for audit trail only
  notes: JSON.stringify({ 
    items, 
    customerInfo, 
    subtotal: serverTotal.toNumber(), 
    fee: fee.toNumber() 
  }),
});

// 3. Frontend should disable button on click (UI layer protection)
// 4. Add database unique constraint on idempotencyKey for safety net
```

**Required Schema Change:**
```javascript
// In Order model:
idempotencyKey: {
  type: DataTypes.STRING,
  unique: true, // Database-level protection
  allowNull: true,
  index: true
}
```

---

## NEW ISSUE IDENTIFIED

### 🔴 Issue #5: Missing Error Context for Frontend Error Boundaries
**Severity:** MEDIUM  
**File:** `backend/routes/achPaymentRoutes.mjs` (Lines 150-160, catch blocks)

**Design Problem:**  
Generic error responses like `"Failed to create payment intent"` give the frontend no context for user-friendly error messages. The UI can't distinguish between "Your bank account was declined" vs. "Our payment processor is down" vs. "Invalid routing number format."

**Design Solution:**  
Return structured error codes that map to specific UI error states:

```javascript
// CHANGE catch blocks FROM:
return res.status(500).json({
  success: false,
  message: 'Failed to create payment intent',
  error: error.message,
});

// CHANGE TO:
return res.status(500).json({
  success: false,
  code: 'PAYMENT_INTENT_FAILED',
  userMessage: 'We couldn't process your payment information.',
  technicalMessage: error.message,
  errorType: error.type || 'unknown', // Stripe error types
  retryable: ['rate_limit_error', 'api_connection_error'].includes(error.type),
  supportReference: `ERR-${Date.now().toString(36).toUpperCase()}`
});
```

This allows the frontend to:
- Show appropriate error modals (styled in brand colors)
- Display retry buttons only when appropriate
- Provide support reference numbers for customer service

---

## SUMMARY

**Consensus on:** Issues #2 (Order History), #3 (Debug UI Branding)  
**Dispute on:** Issues #1 (incomplete solution), #4 (wrong architectural layer)  
**New Issue:** #5 (Error context for frontend)

**Rounds Remaining:** 3

Awaiting Creative Director's response on the disputed implementations.

---

## Creative Director (Lead Design Authority) — Round 3

As the Creative Director, I appreciate a collaborator who pushes back when the technical architecture doesn't fully support the UX vision. Your insights on Stripe's native capabilities and frontend error boundaries are exactly why we have these debates. 

Let's finalize the remaining items so engineering can begin implementation. We are aligned on Issues #2 and #3. Here is my ruling on the disputes and the new issue.

---

### ⚖️ Issue #1: Price Mismatch Response — RESOLVED WITH MODIFICATION
**File:** `backend/routes/achPaymentRoutes.mjs`

**Your Point:** The UI needs line-item details to show *what* changed, not just the total. You proposed adding `snapshotPrice` and `snapshotTotal` to the database schema.
**My Ruling:** I completely agree with your UX premise—a luxury client deserves to know exactly which item increased in price. However, **I reject the database schema changes as unnecessary backend bloat.** 

We do not need to permanently store "snapshot" prices in the database just to handle a transient cart mismatch. The frontend already sends the `items` array containing the prices the client *expects* to pay. We can calculate the diff in-memory during the request by comparing the client's payload against the live database prices.

**Final Implementation:**
```javascript
// In backend/routes/achPaymentRoutes.mjs (Lines 68-75)
// Calculate line-item diffs in-memory without altering DB schema
const updatedItems = items.reduce((acc, clientItem) => {
  const serverItem = dbItems.find(i => i.id === clientItem.storefrontItemId);
  if (serverItem && serverItem.price !== clientItem.price) {
    acc.push({
      id: serverItem.id,
      name: serverItem.name,
      expectedPrice: clientItem.price, // What the client sent
      actualPrice: serverItem.price,   // The real-time DB price
      delta: serverItem.price - clientItem.price
    });
  }
  return acc;
}, []);

return res.status(409).json({
  success: false,
  code: 'PRICE_MISMATCH',
  message: 'Cart total has been recalculated based on real-time pricing.',
  actionRequired: 'CONFIRM_NEW_TOTAL',
  pricingData: {
    expectedTotal: clientTotal.toNumber(),
    updatedTotal: serverTotal.toNumber(),
    delta: serverTotal.minus(clientTotal).toNumber(),
    currency: 'USD',
    changedItems: updatedItems // UI will map this to a sleek list in the modal
  }
});
```

### ⚖️ Issue #4: Double Charge Risk — CONCESSION TO COLLABORATOR
**File:** `backend/routes/achPaymentRoutes.mjs` & `backend/models/Order.mjs`

**Your Point:** `findOrCreate` is the wrong layer. Stripe handles idempotency natively, and we should create the Stripe intent *before* the database order, using a unique DB constraint as a safety net.
**My Ruling:** **You are absolutely correct.** My proposed `findOrCreate` logic risked polluting the database with orphaned pending orders and mishandling expired Stripe intents. Your architectural flow (Stripe Intent first -> Order creation second) perfectly supports my UX mandate of zero double-charges while maintaining a pristine database state.

**Final Implementation:**
I am fully adopting your Counter-Proposal for Issue #4. Engineering must implement the `idempotencyKey` unique constraint in the `Order` model and restructure the route to pass the key directly to Stripe first. 

### 🟢 Issue #5: Missing Error Context for Frontend Error Boundaries — FULLY APPROVED
**File:** `backend/routes/achPaymentRoutes.mjs` (Lines 150-160)

**Your Point:** Generic 500 errors prevent the frontend from rendering contextual, user-friendly error states.
**My Ruling:** This is exceptional UX thinking. A premium brand never says "Error 500: Internal Server Error." It says, "We couldn't process your payment," accompanied by a sleek `Ice Wing #60C0F0` retry button if applicable, and a support reference number. 

**Design Extension to your Implementation:**
I am approving your exact JSON structure, but I am adding a strict UI directive for the frontend team on how to consume the `retryable` boolean you introduced:

```javascript
// backend/routes/achPaymentRoutes.mjs (Catch block)
return res.status(500).json({
  success: false,
  code: 'PAYMENT_INTENT_FAILED',
  userMessage: 'We were unable to process your payment information.',
  technicalMessage: error.message,
  errorType: error.type || 'unknown',
  retryable: ['rate_limit_error', 'api_connection_error'].includes(error.type),
  supportReference: `ERR-${Date.now().toString(36).toUpperCase()}`
});
```
*Frontend Directive:* If `retryable: true`, the UI will render a "Try Again" button. If `retryable: false` (e.g., a hard decline or fraud block), the UI must **hide** the retry button and instead render a "Contact Concierge" button that pre-fills an email with the `supportReference`.

---

### Summary of Round 2
We have successfully aligned the backend architecture with the Crystalline Swan UX standards. 
- **Issue #1:** Resolved. In-memory diffing provides the UI with line-item changes without DB bloat.
- **Issue #4:** Resolved. Stripe-first idempotency adopted.
- **Issue #5:** Resolved. Structured error context approved.

**Rounds Remaining:** 2

Unless you see any critical flaws in the in-memory diffing logic for Issue #1, I believe we are ready to finalize this blueprint.

---

## Design Collaborator — Round 4

## Design Collaborator Response — Round 2

Excellent progress. The Creative Director's willingness to adopt the Stripe-first architecture and structured error handling demonstrates strong alignment on core UX principles. I have **one remaining technical dispute** on Issue #1, and then we can finalize.

---

## AGREEMENTS

### ✓ Issue #4: Double Charge Risk — FULLY RESOLVED
**CONSENSUS ACHIEVED.** The Stripe-first approach with database-level unique constraint is the correct architectural pattern. This protects users while maintaining clean database state.

### ✓ Issue #5: Error Context — FULLY RESOLVED WITH ENHANCEMENT
**CONSENSUS ACHIEVED.** The frontend directive for conditional retry/concierge buttons is excellent UX design. The `supportReference` format provides clean audit trails.

**One minor implementation note for engineering:**
```javascript
// Add to the error response for consistency:
supportContact: {
  email: 'concierge@swanstudios.com',
  reference: `ERR-${Date.now().toString(36).toUpperCase()}`
}
```
This allows the frontend to pre-populate the contact form without hardcoding the email address.

---

## REMAINING DISPUTE

### ⚠️ Issue #1: Price Mismatch Response — IMPLEMENTATION FLAW

**AGREE:** In-memory diffing avoids unnecessary schema changes. This is architecturally cleaner.

**DISAGREE:** The proposed implementation has a **critical data availability bug** that will cause runtime errors.

**The Problem:**
```javascript
// From the Creative Director's code:
const updatedItems = items.reduce((acc, clientItem) => {
  const serverItem = dbItems.find(i => i.id === clientItem.storefrontItemId);
  //                 ^^^^^^^ WHERE DOES THIS COME FROM?
```

**Issue:** The variable `dbItems` does not exist in the current code context. Looking at `achPaymentRoutes.mjs` lines 40-67, the cart validation logic only loads:
- `cart` (the cart record)
- `cart.cartItems` (the join table records)
- `cart.cartItems[].storefrontItem` (the nested item data)

There is no standalone `dbItems` array. The code would throw `ReferenceError: dbItems is not defined`.

**CORRECTED IMPLEMENTATION:**
```javascript
// In backend/routes/achPaymentRoutes.mjs (Lines 68-75)
// Use the existing cart.cartItems structure that's already loaded
const changedItems = items.reduce((acc, clientItem) => {
  // Find the corresponding cart item (which includes the nested storefrontItem)
  const cartItem = cart.cartItems.find(
    ci => ci.storefrontItemId === clientItem.storefrontItemId
  );
  
  if (!cartItem || !cartItem.storefrontItem) {
    // Item was removed from storefront - handle gracefully
    acc.push({
      id: clientItem.storefrontItemId,
      name: clientItem.name || 'Unavailable Item',
      expectedPrice: clientItem.price,
      actualPrice: 0,
      delta: -clientItem.price,
      status: 'REMOVED'
    });
    return acc;
  }

  const serverPrice = cartItem.storefrontItem.price;
  if (serverPrice !== clientItem.price) {
    acc.push({
      id: cartItem.storefrontItemId,
      name: cartItem.storefrontItem.name,
      expectedPrice: clientItem.price,
      actualPrice: serverPrice,
      delta: serverPrice - clientItem.price,
      status: 'PRICE_CHANGED'
    });
  }
  return acc;
}, []);

// Only return PRICE_MISMATCH if there are actual changes
if (changedItems.length > 0) {
  return res.status(409).json({
    success: false,
    code: 'PRICE_MISMATCH',
    message: 'Cart total has been recalculated based on real-time pricing.',
    actionRequired: 'CONFIRM_NEW_TOTAL',
    pricingData: {
      expectedTotal: clientTotal.toNumber(),
      updatedTotal: serverTotal.toNumber(),
      delta: serverTotal.minus(clientTotal).toNumber(),
      currency: 'USD',
      changedItems // UI maps this to the modal's item list
    }
  });
}
```

**Why This Matters for UX:**
1. **Handles Removed Items:** If a storefront item was deleted between cart-add and checkout, the UI needs to know (status: 'REMOVED') to display "This item is no longer available" instead of crashing.

2. **Accurate Data Source:** Uses the already-loaded `cart.cartItems` data, avoiding an additional database query and ensuring consistency with the total calculation logic above it.

3. **Conditional Response:** Only returns the 409 error if items actually changed, preventing false positives from floating-point rounding differences.

---

## FRONTEND UX SPECIFICATION (For Engineering Handoff)

Since we're finalizing the backend contract, here's the exact frontend behavior this enables:

### Price Adjustment Modal (Triggered by `PRICE_MISMATCH` response)
**Visual Design:**
- Surface: `Royal Depth #003080` with `Wing Purple #8B5CF6` border glow
- Header: "Price Update" in `Sora 600`, `Frost White #E0ECF4`
- Changed items list:
  - Item name in `Plus Jakarta Sans`
  - Prices in `Fira Code` with strikethrough on old price
  - Delta in `Gilded Fern #C6A84B` (positive) or `Ice Wing #60C0F0` (negative)
  - Status badge: "Price Changed" or "No Longer Available"

**Interaction:**
- Primary button: "Accept New Total" (`Gilded Fern #C6A84B`)
- Secondary button: "Cancel Order" (`Frost White #E0ECF4` outline)
- On accept: Re-submit checkout with `updatedTotal` as new `clientTotal`
- On cancel: Return to cart page with items highlighted

---

## FINAL STATUS

**Fully Resolved:**
- ✅ Issue #2: Order History (Implemented)
- ✅ Issue #3: Debug UI Branding (Implemented)
- ✅ Issue #4: Idempotency (Stripe-first architecture)
- ✅ Issue #5: Error Context (Structured responses)

**Pending Creative Director Approval:**
- ⏳ Issue #1: Price Mismatch (Awaiting approval of corrected implementation using `cart.cartItems`)

**Rounds Remaining:** 2

If the Creative Director approves the corrected `cart.cartItems` implementation for Issue #1, we have **FULL CONSENSUS** and can proceed to engineering implementation.

---

