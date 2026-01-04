# 🔍 Implementation Analysis: Credits Purchase + Tax + Commission System

**Date:** 2026-01-01
**Analyst:** Claude Code
**Status:** ✅ ANALYSIS COMPLETE - Ready for Implementation Command

---

## 📊 CURRENT STATE VERIFICATION

### ✅ Storefront Packages Confirmed

**Query Results:**
```
ID: 50 | Silver Swan Wing | 1 session @ $175 = $175 ✅ EXISTS
ID: 57 | Rhodium Swan Royalty | 4/wk × 12mo (208 sessions) @ $140 = $29,120 ✅ EXISTS
```

**Details:**
- **Single Session (ID 50):** `packageType: 'fixed'`, `sessions: 1`, `pricePerSession: $175`, `totalCost: $175`
- **Rhodium (ID 57):** `packageType: 'monthly'`, `sessionsPerWeek: 4`, `months: 12`, `pricePerSession: $140`, `totalCost: $29,120`

**Status:** ✅ **NO SEEDING NEEDED** - Both packages exist with correct IDs and pricing.

---

## 🏗️ INFRASTRUCTURE GAPS IDENTIFIED

### ❌ Missing: Commission Tracking System

**What Exists:**
- `Order` model (basic order tracking)
- `OrderItem` model (order line items)
- `ClientTrainerAssignment` model (trainer-client relationships)

**What's Missing:**
- ❌ Commission split tracking (55/45, 50/50, 20/80)
- ❌ Lead source tracking (platform vs trainer-brought vs resign)
- ❌ Trainer attribution per sale
- ❌ Loyalty bump tracking (>100 sessions)
- ❌ Financial reports for commission payouts

**Impact:** Backend can't calculate or track trainer commissions per your protocol.

---

### ❌ Missing: Tax Configuration System

**What Exists:**
- Basic pricing in `storefront_items` (pricePerSession, totalCost)

**What's Missing:**
- ❌ Per-state tax rate configuration
- ❌ Tax-inclusive vs tax-exclusive pricing toggle
- ❌ Tax liability tracking (even when not charged to client)
- ❌ Reverse calculation for "absorb tax" mode ($175 final → calculate pre-tax)

**Impact:** Can't handle tax scenarios or provide accurate totals.

---

### ❌ Missing: Pending Payment Flow

**What Exists:**
- Order status enum: `'pending' | 'processing' | 'completed' | 'refunded' | 'failed'`

**What's Missing:**
- ❌ `pending_payment` status (instant credit grant, payment deferred)
- ❌ Payment warning message system
- ❌ Post-grant payment reconciliation
- ❌ Notification system for "payment processed"

**Impact:** Can't grant credits instantly while deferring Stripe payment.

---

### ❌ Missing: Purchase-to-Book Modal

**What Exists:**
- Admin Client Credits panel (view/edit credits)
- Trainer Client Credits panel (view credits - to be built by Gemini)
- ClientSessionHistory modal
- Booking modal (UnifiedCalendar)

**What's Missing:**
- ❌ Shared "Purchase Credits to Book" modal component
- ❌ Package selection UI (Rhodium, Single Session, "More options")
- ❌ Tax calculation display
- ❌ Quantity selector for single sessions
- ❌ "Best Value" badge on Rhodium
- ❌ Integration with credit grant endpoint

**Impact:** No UI for admin/trainer to purchase credits for clients.

---

## 🎯 REQUIRED IMPLEMENTATIONS

### 1. Database Schema Extensions

#### New Table: `trainer_commissions`
```sql
CREATE TABLE trainer_commissions (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  trainer_id INTEGER REFERENCES users(id),
  client_id INTEGER REFERENCES users(id),
  package_id INTEGER REFERENCES storefront_items(id),

  -- Lead source tracking
  lead_source VARCHAR(20) NOT NULL CHECK (lead_source IN ('platform', 'trainer_brought', 'resign')),
  is_loyalty_bump BOOLEAN DEFAULT FALSE,

  -- Session tracking
  sessions_granted INTEGER NOT NULL,
  sessions_consumed INTEGER DEFAULT 0,

  -- Financial breakdown
  gross_amount DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  net_after_tax DECIMAL(10, 2) NOT NULL,

  -- Commission split
  commission_rate_business DECIMAL(5, 2) NOT NULL, -- e.g., 55.00 for 55%
  commission_rate_trainer DECIMAL(5, 2) NOT NULL,  -- e.g., 45.00 for 45%
  business_cut DECIMAL(10, 2) NOT NULL,
  trainer_cut DECIMAL(10, 2) NOT NULL,

  -- Payment tracking
  paid_to_trainer_at TIMESTAMP,
  payout_method VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### New Table: `tax_config`
```sql
CREATE TABLE tax_config (
  id SERIAL PRIMARY KEY,
  state_code VARCHAR(2) NOT NULL UNIQUE, -- e.g., 'CA', 'NY', 'TX'
  state_name VARCHAR(100) NOT NULL,
  tax_rate DECIMAL(5, 4) NOT NULL, -- e.g., 0.0825 for 8.25%
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Extend `orders` Table
```sql
ALTER TABLE orders
  ADD COLUMN trainer_id INTEGER REFERENCES users(id),
  ADD COLUMN lead_source VARCHAR(20) CHECK (lead_source IN ('platform', 'trainer_brought', 'resign')),
  ADD COLUMN tax_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN tax_rate_applied DECIMAL(5, 4),
  ADD COLUMN tax_charged_to_client BOOLEAN DEFAULT TRUE,
  ADD COLUMN business_cut DECIMAL(10, 2),
  ADD COLUMN trainer_cut DECIMAL(10, 2),
  ADD COLUMN grant_reason VARCHAR(50), -- 'purchase_pending', 'admin_grant', 'package_purchase'
  ADD COLUMN sessions_granted INTEGER;
```

---

### 2. Backend Endpoints

#### **POST /api/admin/credits/purchase-and-grant**
**Access:** `protect`, `adminOnly`

**Request Body:**
```typescript
{
  clientId: number;
  storefrontItemId: number; // 50 or 57 or other
  quantity: number; // for single sessions
  trainerId?: number; // for attribution (admin can select)
  leadSource: 'platform' | 'trainer_brought' | 'resign';
  grantReason: 'purchase_pending' | 'admin_grant';
  clientState?: string; // for tax calc (e.g., 'CA')
  absorbTax?: boolean; // if true, adjust price so final = advertised
}
```

**Response:**
```typescript
{
  success: true;
  order: Order;
  commission: TrainerCommission;
  creditsGranted: number;
  newCreditBalance: number;
  taxDetails: {
    grossAmount: number;
    taxRate: number;
    taxAmount: number;
    netAfterTax: number;
    chargedToClient: boolean;
  };
  message: string; // "Credits granted. Payment pending - client notified."
}
```

**Logic:**
1. Calculate sessions:
   - If `packageType === 'fixed'`: `sessions * quantity`
   - If `packageType === 'monthly'`: `sessionsPerWeek * 4.33 * months`
2. Calculate tax:
   - Lookup `clientState` in `tax_config`
   - If `absorbTax === true`: `preTax = totalCost / (1 + taxRate)`
   - If `absorbTax === false`: `taxAmount = totalCost * taxRate`
3. Calculate commission split:
   - If `leadSource === 'platform'`: 55/45
   - If `leadSource === 'resign'`: 50/50
   - If `leadSource === 'trainer_brought'`: 20/80
4. Create order with `status: 'pending_payment'`
5. Create commission record
6. Increment `User.sessionsRemaining += sessions`
7. Return response

---

#### **POST /api/trainer/credits/purchase-and-grant**
**Access:** `protect`, `trainerOrAdminOnly`

**Same as admin endpoint, but with these differences:**
- Trainers can ONLY purchase for assigned clients (check `ClientTrainerAssignment`)
- `trainerId` is auto-set to `req.user.id` (can't be overridden)
- If user is admin, bypass assignment check and allow `trainerId` override

---

#### **GET /api/tax-config**
**Access:** `protect`, `adminOnly`

Returns all tax configurations.

---

#### **POST /api/tax-config**
**Access:** `protect`, `adminOnly`

Create/update tax config for a state.

---

#### **GET /api/admin/commissions**
**Access:** `protect`, `adminOnly`

**Query Params:**
- `trainerId?` - filter by trainer
- `leadSource?` - filter by source
- `startDate?`, `endDate?` - date range
- `paid?` - boolean (paid out or not)

Returns commission records with totals.

---

### 3. Frontend Components

#### **New Component: PurchaseCreditsModal.tsx**

**Location:** `frontend/src/components/DashBoard/Pages/admin-dashboard/schedule/PurchaseCreditsModal.tsx`

**Props:**
```typescript
interface PurchaseCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: { id: string; name: string; credits: number; state?: string };
  onPurchased: (creditsGranted: number) => void;
  userRole: 'admin' | 'trainer';
  trainerId?: string; // for admin to override attribution
}
```

**Features:**
- ✅ Rhodium package (id 57) with "Best Value" badge
- ✅ Single Session (id 50) with quantity selector (1-10)
- ✅ "More options" collapsible toggle (show other packages)
- ✅ Tax calculation display (based on client state)
- ✅ Total calculation (gross + tax or absorb tax)
- ✅ Warning message: "Payment not completed; we'll process and notify you. You can schedule now while we finalize payment."
- ✅ Trainer attribution selector (admin only)
- ✅ Lead source selector (platform/trainer_brought/resign) - admin only
- ✅ Commission preview (shows split before purchase)

**Actions:**
- Primary button: "Grant Credits & Continue to Booking"
- Secondary button: "Cancel"

**Flow:**
1. User selects package + quantity
2. Modal shows tax breakdown and total
3. User clicks "Grant Credits & Continue to Booking"
4. Call `POST /api/admin/credits/purchase-and-grant` (or trainer endpoint)
5. On success:
   - Show toast: "Credits granted successfully!"
   - Refetch clients to update balance
   - Close modal
   - Open booking modal with `clientId`
6. On error:
   - Show error toast
   - Keep modal open

---

#### **Update: AdminScheduleTab.tsx**

**Changes:**
1. Import `PurchaseCreditsModal`
2. Add state: `isPurchaseModalOpen`, `selectedClientForPurchase`
3. Replace "Book" button when `credits === 0`:
   ```tsx
   {client.credits === 0 ? (
     <PurchaseButton onClick={() => handlePurchaseClick(client)}>
       <ShoppingCart /> Purchase to Book
     </PurchaseButton>
   ) : (
     <BookButton onClick={() => handleBookClick(client)}>
       <Book /> Book
     </BookButton>
   )}
   ```
4. Add modal rendering:
   ```tsx
   {isPurchaseModalOpen && selectedClientForPurchase && (
     <PurchaseCreditsModal
       isOpen={isPurchaseModalOpen}
       onClose={() => setIsPurchaseModalOpen(false)}
       client={selectedClientForPurchase}
       onPurchased={(credits) => {
         fetchClients(); // Refetch to update balance
         handleBookClick(selectedClientForPurchase); // Open booking modal
       }}
       userRole="admin"
     />
   )}
   ```

---

#### **Update: TrainerScheduleTab.tsx**

**Same changes as AdminScheduleTab, but:**
- `userRole="trainer"`
- No trainer attribution selector (auto-set to logged-in trainer)
- No lead source selector (defaults to `'platform'` unless admin overrides)

---

### 4. Commission Split Logic

**Function:** `calculateCommissionSplit(leadSource, grossAmount, sessionsGranted)`

```typescript
function calculateCommissionSplit(
  leadSource: 'platform' | 'trainer_brought' | 'resign',
  grossAmount: number,
  sessionsGranted: number
): {
  businessRate: number;
  trainerRate: number;
  businessCut: number;
  trainerCut: number;
  loyaltyBump: boolean;
} {
  let businessRate: number;
  let trainerRate: number;
  let loyaltyBump = false;

  // Base split
  if (leadSource === 'platform') {
    businessRate = 55;
    trainerRate = 45;
  } else if (leadSource === 'resign') {
    businessRate = 50;
    trainerRate = 50;
  } else if (leadSource === 'trainer_brought') {
    businessRate = 20;
    trainerRate = 80;
  } else {
    throw new Error('Invalid lead source');
  }

  // Loyalty bump for packages >100 sessions
  if (sessionsGranted > 100) {
    trainerRate += 5; // +5% bump
    businessRate -= 5;
    loyaltyBump = true;
  }

  const businessCut = (grossAmount * businessRate) / 100;
  const trainerCut = (grossAmount * trainerRate) / 100;

  return {
    businessRate,
    trainerRate,
    businessCut,
    trainerCut,
    loyaltyBump
  };
}
```

---

### 5. Tax Calculation Logic

**Function:** `calculateTax(totalCost, clientState, absorbTax)`

```typescript
async function calculateTax(
  totalCost: number,
  clientState: string | null,
  absorbTax: boolean = false
): Promise<{
  grossAmount: number;
  taxRate: number;
  taxAmount: number;
  netAfterTax: number;
  chargedToClient: boolean;
}> {
  // Lookup tax rate
  let taxRate = 0;
  if (clientState) {
    const taxConfig = await TaxConfig.findOne({ where: { state_code: clientState, is_active: true } });
    if (taxConfig) {
      taxRate = parseFloat(taxConfig.tax_rate);
    }
  }

  if (absorbTax) {
    // Reverse calculate: final price = totalCost, so preTax = totalCost / (1 + rate)
    const preTax = totalCost / (1 + taxRate);
    const taxAmount = totalCost - preTax;
    return {
      grossAmount: preTax,
      taxRate,
      taxAmount,
      netAfterTax: totalCost,
      chargedToClient: false
    };
  } else {
    // Forward calculate: tax added on top
    const taxAmount = totalCost * taxRate;
    const netAfterTax = totalCost + taxAmount;
    return {
      grossAmount: totalCost,
      taxRate,
      taxAmount,
      netAfterTax,
      chargedToClient: true
    };
  }
}
```

---

### 6. Migration Files Needed

**File 1:** `backend/migrations/20260101000001-add-trainer-commissions-table.cjs`

**File 2:** `backend/migrations/20260101000002-add-tax-config-table.cjs`

**File 3:** `backend/migrations/20260101000003-extend-orders-table.cjs`

**File 4:** `backend/seeders/20260101000004-seed-tax-config.cjs`

**Tax Rates to Seed (Top 10 States):**
```javascript
[
  { state_code: 'CA', state_name: 'California', tax_rate: 0.0725 },
  { state_code: 'TX', state_name: 'Texas', tax_rate: 0.0625 },
  { state_code: 'FL', state_name: 'Florida', tax_rate: 0.06 },
  { state_code: 'NY', state_name: 'New York', tax_rate: 0.04 },
  { state_code: 'PA', state_name: 'Pennsylvania', tax_rate: 0.06 },
  { state_code: 'IL', state_name: 'Illinois', tax_rate: 0.0625 },
  { state_code: 'OH', state_name: 'Ohio', tax_rate: 0.0575 },
  { state_code: 'GA', state_name: 'Georgia', tax_rate: 0.04 },
  { state_code: 'NC', state_name: 'North Carolina', tax_rate: 0.0475 },
  { state_code: 'MI', state_name: 'Michigan', tax_rate: 0.06 }
]
```

---

## 🎨 UI/UX ENHANCEMENTS

### PurchaseCreditsModal Design

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Purchase Credits for [Client Name]                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                     │
│  ⭐ BEST VALUE                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Rhodium Swan Royalty                        │   │
│  │ 12 months • 4/week • 208 sessions           │   │
│  │ $140/session • Total: $29,120               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ Single Session @ $175                       │   │
│  │ Quantity: [1] [2] [3] [4] [5] ... [10]     │   │
│  │ Total: $175                                 │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ▼ More options (click to expand)                  │
│                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Selected: Rhodium Swan Royalty                    │
│  Subtotal: $29,120.00                              │
│  Tax (CA 7.25%): $2,111.20                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Total: $31,231.20                                 │
│                                                     │
│  ⚠ Payment not completed; we'll process and       │
│     notify you. You can schedule now while we      │
│     finalize payment.                              │
│                                                     │
│  [Cancel]  [Grant Credits & Continue to Booking]   │
└─────────────────────────────────────────────────────┘
```

**Styling:**
- Primary color: Cyan (#00FFFF) for admin, Purple (#7851A9) for trainer
- "Best Value" badge: Gold gradient with sparkle effect
- Tax line: Muted gray
- Warning: Yellow background with alert icon
- Buttons: 44px min-height, full-width on mobile

---

## 🧪 TESTING REQUIREMENTS

### Unit Tests

**File:** `backend/__tests__/commission-calculator.test.mjs`
```javascript
describe('calculateCommissionSplit', () => {
  test('platform lead: 55/45 split', () => {
    const result = calculateCommissionSplit('platform', 1000, 50);
    expect(result.businessRate).toBe(55);
    expect(result.trainerRate).toBe(45);
    expect(result.businessCut).toBe(550);
    expect(result.trainerCut).toBe(450);
    expect(result.loyaltyBump).toBe(false);
  });

  test('resign lead: 50/50 split', () => {
    const result = calculateCommissionSplit('resign', 1000, 50);
    expect(result.businessRate).toBe(50);
    expect(result.trainerRate).toBe(50);
  });

  test('trainer_brought lead: 20/80 split', () => {
    const result = calculateCommissionSplit('trainer_brought', 1000, 50);
    expect(result.businessRate).toBe(20);
    expect(result.trainerRate).toBe(80);
  });

  test('loyalty bump for >100 sessions', () => {
    const result = calculateCommissionSplit('platform', 29120, 208);
    expect(result.trainerRate).toBe(50); // 45 + 5
    expect(result.businessRate).toBe(50); // 55 - 5
    expect(result.loyaltyBump).toBe(true);
  });
});
```

**File:** `backend/__tests__/tax-calculator.test.mjs`
```javascript
describe('calculateTax', () => {
  test('CA tax: 7.25% added on top', async () => {
    const result = await calculateTax(175, 'CA', false);
    expect(result.grossAmount).toBe(175);
    expect(result.taxRate).toBe(0.0725);
    expect(result.taxAmount).toBeCloseTo(12.69, 2);
    expect(result.netAfterTax).toBeCloseTo(187.69, 2);
    expect(result.chargedToClient).toBe(true);
  });

  test('CA tax absorbed: final = $175', async () => {
    const result = await calculateTax(175, 'CA', true);
    expect(result.grossAmount).toBeCloseTo(163.19, 2);
    expect(result.taxAmount).toBeCloseTo(11.81, 2);
    expect(result.netAfterTax).toBe(175);
    expect(result.chargedToClient).toBe(false);
  });
});
```

### Integration Tests

**File:** `backend/__tests__/purchase-and-grant.test.mjs`

**Test Cases:**
1. ✅ Admin purchases Rhodium for client → credits +208, order created, commission recorded
2. ✅ Admin purchases 2 single sessions → credits +2
3. ✅ Trainer purchases for assigned client → credits granted, commission uses trainer ID
4. ✅ Trainer attempts purchase for unassigned client → 403 error
5. ✅ Tax calculated correctly for CA, TX, FL
6. ✅ Absorb tax mode: final = advertised price
7. ✅ Loyalty bump applied for Rhodium (208 sessions > 100)
8. ✅ Resign lead uses 50/50 split
9. ✅ Trainer-brought lead uses 20/80 split

### E2E Tests

**Frontend Flow:**
1. ✅ Admin: Client with 0 credits → click "Purchase to Book" → modal opens
2. ✅ Select Rhodium → shows $29,120 + tax = $31,231.20
3. ✅ Click "Grant Credits & Continue" → credits update to 208
4. ✅ Booking modal opens automatically
5. ✅ Trainer: Same flow, but only sees assigned clients

---

## 🚨 CRITICAL DECISIONS NEEDED

### 1. Lead Source Default

**Question:** When admin/trainer purchases credits via modal, what should default `leadSource` be?

**Options:**
- **Option A:** Always default to `'platform'` (admin brought the client)
- **Option B:** Let admin select via dropdown in modal
- **Option C:** Infer from `ClientTrainerAssignment.createdBy`

**Recommendation:** **Option B** - Admin selects (platform/trainer_brought/resign) in modal. Defaults to 'platform'.

---

### 2. Tax Absorption Strategy

**Question:** Should "absorb tax" mode be:
- A) System-wide setting (all or nothing)
- B) Per-purchase toggle in modal
- C) Per-package configuration

**Recommendation:** **Option B** - Checkbox in modal: "Absorb tax (final price = advertised price)"

---

### 3. Trainer Attribution for Admin Purchases

**Question:** When admin purchases credits, which trainer gets commission?

**Options:**
- **Option A:** Admin selects trainer from dropdown (flexible)
- **Option B:** Auto-assign to client's assigned trainer
- **Option C:** No trainer attribution (100% business)

**Recommendation:** **Option A** - Admin selects from dropdown of all trainers + "No trainer" option.

---

### 4. Session Consumption Tracking

**Question:** How to track when `sessionsConsumed` hits 101 for loyalty bump?

**Options:**
- **Option A:** Update on every session booking/completion
- **Option B:** Retroactive payout when threshold hit
- **Option C:** Ignore until future feature

**Recommendation:** **Option A** - Track in real-time, update `trainer_commissions.sessions_consumed` on session completion.

---

### 5. Payment Reconciliation

**Question:** After credits granted with `status: 'pending_payment'`, how to finalize payment?

**Options:**
- **Option A:** Manual admin action (mark as paid)
- **Option B:** Stripe webhook updates order to 'completed'
- **Option C:** Scheduled job checks payment status

**Recommendation:** **Option B** + **Option A** - Webhook for Stripe, manual fallback for cash/check.

---

## 📝 IMPLEMENTATION CHECKLIST

### Phase 1: Database & Models (Day 1)
- [ ] Create migration: `trainer_commissions` table
- [ ] Create migration: `tax_config` table
- [ ] Create migration: extend `orders` table
- [ ] Create model: `TrainerCommission.mjs`
- [ ] Create model: `TaxConfig.mjs`
- [ ] Update model: `Order.mjs` (add new fields)
- [ ] Create seeder: seed tax config (all 50 states)
- [ ] Run migrations + seeders

### Phase 2: Backend Logic (Day 2)
- [ ] Create utility: `calculateCommissionSplit()`
- [ ] Create utility: `calculateTax()`
- [ ] Create controller: `creditsPurchaseController.mjs`
- [ ] Create endpoint: `POST /api/admin/credits/purchase-and-grant`
- [ ] Create endpoint: `POST /api/trainer/credits/purchase-and-grant`
- [ ] Create endpoint: `GET /api/tax-config` (admin)
- [ ] Create endpoint: `POST /api/tax-config` (admin)
- [ ] Create endpoint: `GET /api/admin/commissions`
- [ ] Write unit tests (commission + tax calculators)
- [ ] Write integration tests (purchase flow)

### Phase 3: Frontend Components (Day 3)
- [ ] Create component: `PurchaseCreditsModal.tsx`
- [ ] Create component: `PackageOption.tsx` (individual package card)
- [ ] Create component: `TaxBreakdown.tsx` (summary strip)
- [ ] Update component: `AdminScheduleTab.tsx` (add purchase button + modal)
- [ ] Update component: `TrainerScheduleTab.tsx` (add purchase button + modal)
- [ ] Create styled components (modal, buttons, package cards)
- [ ] Add toast notifications (success/error)

### Phase 4: UI Polish (Day 4)
- [ ] Add "Best Value" badge to Rhodium
- [ ] Add quantity selector for single sessions
- [ ] Add "More options" collapsible toggle
- [ ] Add trainer attribution dropdown (admin only)
- [ ] Add lead source selector (admin only)
- [ ] Add tax absorption checkbox
- [ ] Add commission preview (shows split before purchase)
- [ ] Add payment warning message
- [ ] Add loading states
- [ ] Add error states

### Phase 5: Integration & Testing (Day 5)
- [ ] Test admin purchase flow (Rhodium + single session)
- [ ] Test trainer purchase flow (assigned clients only)
- [ ] Test tax calculation (CA, TX, FL)
- [ ] Test commission splits (55/45, 50/50, 20/80)
- [ ] Test loyalty bump (Rhodium > 100 sessions)
- [ ] Test absorb tax mode
- [ ] Test booking handoff (modal closes, booking opens)
- [ ] Test refetch (credits update immediately)
- [ ] E2E test: 0 credits → purchase → book → session created
- [ ] Build verification (`npm run build`)

---

## 🎯 SUCCESS CRITERIA

### Functional Requirements
- ✅ Admin can purchase credits for any client (Rhodium or single sessions)
- ✅ Trainer can purchase credits for assigned clients only
- ✅ Credits granted instantly with `status: 'pending_payment'`
- ✅ Client sees warning: "Payment pending, can schedule now"
- ✅ Tax calculated correctly per state
- ✅ Tax can be absorbed (final = advertised price)
- ✅ Commission split calculated per protocol (55/45, 50/50, 20/80)
- ✅ Loyalty bump applied for packages >100 sessions
- ✅ After purchase, booking modal opens automatically
- ✅ Credits balance updates immediately
- ✅ Order + commission records created in database

### Non-Functional Requirements
- ✅ Build succeeds with 0 errors
- ✅ All tests pass (unit + integration + E2E)
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Accessibility (WCAG AA, 44px touch targets)
- ✅ Performance (modal opens <300ms, purchase API <1s)
- ✅ Error handling (network failures, invalid inputs)

---

## 🔮 FUTURE ENHANCEMENTS (Post-MVP)

### Phase 2 Features:
- [ ] Bulk purchase (select multiple clients)
- [ ] Payment plans (split $29k into installments)
- [ ] Promo codes/discounts
- [ ] Gift credits (one client buys for another)
- [ ] Credit expiration tracking
- [ ] Auto-renew subscriptions
- [ ] Trainer commission dashboard
- [ ] Financial reports (revenue, tax liability, payouts)
- [ ] Stripe integration (finalize pending payments)
- [ ] Email notifications (purchase confirmation, payment processed)

---

## 📊 ESTIMATED EFFORT

**Total Time:** 5-7 days (40-56 hours)

**Breakdown:**
- Database/Models: 8 hours
- Backend Logic: 12 hours
- Frontend Components: 16 hours
- UI Polish: 8 hours
- Testing: 12 hours

**Team:**
- 1 Backend Developer (20 hours)
- 1 Frontend Developer (24 hours)
- 1 QA Tester (12 hours)

**Or Solo (Gemini AI):**
- 5-7 days at 8 hours/day

---

## ✅ READY FOR IMPLEMENTATION

**Status:** ✅ All requirements analyzed and documented.

**Blockers:** None - Storefront packages exist, infrastructure gaps identified with solutions provided.

**Next Step:** Await your final implementation command to begin building.

---

**Analysis Complete - Standing By for Command** 🚀
