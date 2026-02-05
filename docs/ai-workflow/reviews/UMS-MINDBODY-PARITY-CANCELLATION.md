# Universal Master Schedule - MindBody Parity: Admin Cancellation Features

> **Feature:** Admin Cancelled Sessions Review + Charge/Waive + Silent Cancel
> **Date Started:** 2026-02-05
> **Developer:** Claude Opus 4.5
> **Branch:** `main`
> **Status:** COMPLETE
> **Commit:** (pending)

---

## Feature Overview

### User Story
```
As a SwanStudios admin,
I want to review cancelled sessions, charge or waive late fees with documented reasons,
and optionally cancel sessions silently without notifications,
So that I have MindBody-level control over cancellation handling.
```

### Acceptance Criteria
- [x] Admins can see pending cancelled sessions requiring review
- [x] Admins can charge (late_fee/full/custom) or waive with required reason
- [x] Decision status tracked: pending, charged, waived
- [x] Full audit trail: reviewedBy, reviewedAt, reviewReason
- [x] Silent cancel mode suppresses ALL notifications
- [x] Dynamic pricing from client's package (no hardcoded fees!)
- [x] Filter cancelled sessions by decision status
- [x] UI shows decision badges and admin notes

---

## Business Rules

### 1. Dynamic Pricing (NO HARDCODED FEES!)
- Session price derived from client's most recent package order
- Fallback prices (only when no package found):
  - 60+ minute sessions: $175/session
  - 30 minute sessions: $110/session
- Late fee = 50% of session price
- Special/promotional packages require admin final say

### 2. Decision Workflow
```
Late Cancellation → Status: 'pending'
                        ↓
    Admin Reviews → Charge OR Waive (with reason)
                        ↓
                  Status: 'charged' OR 'waived'
```

### 3. Silent Cancel Mode
- When `silent=true`, suppresses ALL notifications:
  - Client email
  - Client SMS
  - Trainer email
- Useful for: data corrections, admin adjustments, bulk operations

---

## Backend Implementation

### Database Migration

**File:** `backend/migrations/20260205000001-add-cancellation-decision-fields.cjs`

**New Columns Added to `sessions` Table:**
| Column | Type | Description |
|--------|------|-------------|
| `cancellationDecision` | STRING(20) | 'pending', 'charged', 'waived', or null |
| `cancellationReviewedBy` | INTEGER (FK) | Admin user who made decision |
| `cancellationReviewedAt` | DATE | Timestamp of decision |
| `cancellationReviewReason` | TEXT | Required justification for decision |

### Model Update

**File:** `backend/models/Session.mjs`

Added fields with validation:
```javascript
cancellationDecision: {
  type: DataTypes.STRING(20),
  allowNull: true,
  defaultValue: null,
  validate: {
    isIn: {
      args: [['pending', 'charged', 'waived', null]],
      msg: 'Cancellation decision must be one of: pending, charged, waived'
    }
  }
},
cancellationReviewedBy: { type: DataTypes.INTEGER, allowNull: true },
cancellationReviewedAt: { type: DataTypes.DATE, allowNull: true },
cancellationReviewReason: { type: DataTypes.TEXT, allowNull: true }
```

### Unified Pricing Helper

**File:** `backend/utils/cancellationPricing.mjs`

Key functions:
```javascript
// Fetch client's package pricing from their most recent order
export async function getClientPackagePricing(clientId, models)

// Calculate cancellation charge based on session and policy
export function computeCancellationCharge(session, packageInfo, options)

// Get cancellation policy for a session
export function getCancellationPolicy(session)
```

**Special Package Detection:**
- Promotional prices (< $100/session) → requiresAdminReview = true
- Package names containing: bonus, promo, special, free, complimentary

### Updated API Endpoints

#### 1. POST /api/sessions/:sessionId/charge-cancellation
**Updated to include decision/reason/audit**

**Request Body:**
```javascript
{
  chargeType: 'late_fee' | 'full' | 'custom' | 'none',
  chargeAmount: 50.00,  // for custom amounts
  decision: 'charged' | 'waived',  // NEW
  reason: 'Emergency situation, first cancellation'  // NEW (required for waived)
}
```

**Response:**
```javascript
{
  success: true,
  message: 'Cancellation charge processed',
  data: {
    sessionId: 123,
    chargeType: 'waived',
    chargeAmount: 0,
    decision: 'waived',
    reviewReason: 'Emergency situation, first cancellation',
    sessionCreditRestored: true
  }
}
```

#### 2. GET /api/sessions/admin/cancelled
**Updated with decisionStatus filter**

**Query Parameters:**
- `decisionStatus`: 'pending' | 'charged' | 'waived' | 'all' (default: 'all')
- `limit`: number of results
- `startDate`, `endDate`: date range

**Response (enhanced):**
```javascript
{
  success: true,
  data: [...sessions],
  stats: {
    pending: 5,
    charged: 12,
    waived: 3
  }
}
```

#### 3. PATCH /api/sessions/:sessionId/cancel
**Updated with silent flag and dynamic pricing**

**Request Body:**
```javascript
{
  reason: 'Client requested',
  chargeType: 'none',
  restoreCredit: true,
  notifyClient: true,
  notifyTrainer: true,
  silent: false  // NEW: when true, suppresses ALL notifications
}
```

**Response (enhanced):**
```javascript
{
  success: true,
  data: {
    sessionId: 123,
    status: 'cancelled',
    cancellationDecision: 'pending',  // for late cancellations
    requiresAdminReview: true,
    pricing: {
      sessionRate: 175,
      lateFeeAmount: 87.50,
      packageName: 'Premium 20-Pack',
      isFallbackPricing: false
    },
    notificationsSent: {
      client: false,
      trainer: false,
      silentMode: true
    }
  }
}
```

---

## Frontend Implementation

### CancelledSessionsWidget Updates

**File:** `frontend/src/components/DashBoard/Pages/admin-dashboard/components/CancelledSessionsWidget.tsx`

#### Interface Extensions
```typescript
interface CancelledSession {
  // ... existing fields
  cancellationDecision: 'pending' | 'charged' | 'waived' | null;
  cancellationReviewReason: string | null;
  reviewerInfo?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
}
```

#### New State
```typescript
const [waiveReasons, setWaiveReasons] = useState<Record<number, string>>({});
const [decisionFilter, setDecisionFilter] = useState<'all' | 'pending' | 'charged' | 'waived'>('all');
```

#### UI Elements Added
1. **Filter Buttons** - All / Pending (yellow) / Charged (green) / Waived (blue)
2. **Decision Badge** - Color-coded badge showing decision status
3. **Waive Reason Input** - Required textarea for waive justification
4. **Review Reason Display** - Shows admin note and reviewer info

#### Styled Components
```typescript
const DecisionBadge = styled.span<{ $decision: 'pending' | 'charged' | 'waived' }>`
  // Yellow for pending, green for charged, blue for waived
`;

const FilterButton = styled.button<{ $active: boolean; $variant?: string }>`
  // Active state styling by variant
`;

const WaiveReasonInput = styled.textarea`
  // Textarea for admin justification
`;

const ReviewReasonDisplay = styled.div`
  // Shows recorded reason with admin info
`;
```

---

## Test Results

### Backend Tests
```
=== TESTING MINDBODY PARITY: ADMIN CANCELLATION FEATURES ===

[TEST 1] Checking Session model decision fields...
  [PASS] cancellationDecision field exists
  [PASS] cancellationReviewedBy field exists
  [PASS] cancellationReviewedAt field exists
  [PASS] cancellationReviewReason field exists
  [PASS] Decision validation includes pending/charged/waived

[TEST 2] Checking unified pricing helper...
  [PASS] getClientPackagePricing function exported
  [PASS] computeCancellationCharge function exported
  [PASS] getCancellationPolicy function exported
  [PASS] No hardcoded $75 fee
  [PASS] Dynamic pricing from package
  [PASS] Special package detection
  [PASS] requiresAdminReview flag

[TEST 3-8] All endpoint and UI tests...
  All patterns verified

=== TEST SUMMARY ===
Passed: 51
Failed: 0
Total:  51

[SUCCESS] ALL TESTS PASSED
```

### Frontend Build
```
Frontend Build: built in 6.99s
No TypeScript errors
```

---

## Checkpoint Summary

### Checkpoint #1: Code Quality (Self-Review)
**Date:** 2026-02-05
**Status:** PASS
- Follows existing patterns in sessionRoutes.mjs
- Proper TypeScript types in frontend
- Consistent styling with UI library

### Checkpoint #2: Logic Review
**Date:** 2026-02-05
**Status:** PASS
- Decision workflow: pending → charged/waived
- Reason required for waived decisions
- Silent mode overrides all notification flags

### Checkpoint #3: Security Review
**Date:** 2026-02-05
**Status:** PASS
- Admin-only access for charge-cancellation
- Audit trail with reviewer ID and timestamp
- Protected routes require authentication

### Checkpoint #4: Testing Review
**Date:** 2026-02-05
**Status:** PASS
- Backend: 51/51 pattern tests passed
- Frontend: Production build successful

### Checkpoint #5: Performance Review
**Date:** 2026-02-05
**Status:** PASS
- Efficient package pricing lookup
- Filter queries use indexed decision field

### Checkpoint #6: Integration Review
**Date:** 2026-02-05
**Status:** PASS
- Uses existing notification service
- Compatible with existing session model
- Unified pricing helper reusable

### Checkpoint #7: Human Review
**Date:** 2026-02-05
**Status:** PENDING (Production verification needed)

---

## Deployment

### Database Migration
```bash
cd backend
npx sequelize-cli db:migrate
```

### Git Commit
```
feat(sessions): add MindBody parity cancellation features

- Add decision status tracking (pending/charged/waived)
- Add admin audit trail (reviewedBy, reviewedAt, reviewReason)
- Create unified pricing helper (no hardcoded fees)
- Add silent cancel mode to suppress notifications
- Add decisionStatus filter to admin/cancelled endpoint
- Update CancelledSessionsWidget with decision badges
- Add waive reason requirement for fee waivers

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Deployment Status
- [x] Database migration created
- [x] Backend endpoints updated
- [x] Unified pricing helper created
- [x] Session model updated
- [x] Frontend UI component updated
- [x] Tests passed
- [ ] Committed to `main`
- [ ] Deployed to Render
- [ ] Migration run on production
- [ ] Production verification

---

## Usage Guide

### For Admins Reviewing Cancelled Sessions:
1. Navigate to Admin Dashboard
2. View Cancelled Sessions Widget
3. Use filter buttons: Pending / Charged / Waived / All
4. For pending sessions:
   - Click "Late Fee" or "Full Session" to charge
   - Or click "More" → enter waive reason → "Waive Charge"
5. Decision and reason are recorded with audit trail

### For Silent Cancellations:
```javascript
// API call with silent=true
PATCH /api/sessions/123/cancel
{
  "reason": "Admin adjustment",
  "chargeType": "none",
  "silent": true  // No emails or SMS sent
}
```

### Decision Badge Colors:
- **Yellow** - Pending (needs review)
- **Green** - Charged (fee applied)
- **Blue** - Waived (fee waived with reason)

---

**Quality Score:** 6/7 checkpoints passed (pending production verification)

**Document Version:** 1.0
**Created By:** Claude Opus 4.5
**Protocol:** AI Village Coordination + Feature Template
