# Custom Package Builder - Developer Guide 🛠️

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Data Flow](#data-flow)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Maintenance](#maintenance)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
├─────────────────────────────────────────────────────────────┤
│  OptimizedGalaxyStoreFront.tsx                              │
│  └─> PackagesGrid.tsx                                       │
│       ├─> CustomPackageCard.tsx (CTA)                      │
│       └─> CustomPackageBuilder.tsx (Wizard)                │
│            ├─> useCustomPackagePricing.ts (Hook)           │
│            └─> CustomPackageErrorBoundary.tsx              │
│                                                              │
│  ShoppingCart.tsx                                           │
│  └─> CustomPackageCartItem.tsx (Enhanced Display)         │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ API Calls
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
├─────────────────────────────────────────────────────────────┤
│  storeFrontRoutes.mjs                                       │
│  ├─> GET /api/storefront/calculate-price                   │
│  └─> POST /api/storefront (admin only)                     │
│                                                              │
│  StorefrontItem.mjs (Model)                                 │
│  └─> packageType: 'fixed' | 'monthly' | 'custom'          │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React 18, TypeScript, Styled Components, Framer Motion
- **State Management**: useReducer, Context API
- **API Client**: Axios
- **Mobile Gestures**: react-swipeable
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (via Sequelize ORM)
- **Testing**: Jest, React Testing Library, MSW

---

## Backend Implementation

### Pricing Endpoint

**File**: `backend/routes/storeFrontRoutes.mjs:116-245`

#### Route Definition

```javascript
/**
 * GET /api/storefront/calculate-price
 * Public endpoint (no auth required)
 *
 * Query Parameters:
 * - sessions: number (10-100) [REQUIRED]
 * - pricePerSession: number (optional, default: 175)
 */
router.get('/calculate-price', async (req, res) => {
  // ... implementation
});
```

#### Business Logic

```javascript
// Volume Discount Tiers
if (sessions >= 10 && sessions <= 19) {
  discountPerSession = 10;  // Bronze: $165/session
  tier = 'bronze';
} else if (sessions >= 20 && sessions <= 39) {
  discountPerSession = 13;  // Silver: $162/session
  tier = 'silver';
} else if (sessions >= 40) {
  discountPerSession = 15;  // Gold: $160/session
  tier = 'gold';
}
```

#### Response Format

```json
{
  "success": true,
  "pricing": {
    "sessions": 25,
    "pricePerSession": 162,
    "volumeDiscount": 13,
    "discountPercentage": 7.4,
    "discountTier": "silver",
    "subtotal": 4375,
    "totalDiscount": 325,
    "finalTotal": 4050,
    "savingsMessage": "You save $325 vs. buying single sessions! 🥈 Silver tier discount unlocked!",
    "metadata": {
      "nextTierSessions": 40,
      "nextTierDiscount": 15,
      "nextTierMessage": "Add 15 more sessions to unlock Gold tier!"
    }
  }
}
```

#### Validation Rules

```javascript
// Minimum sessions (profitability threshold)
if (sessions < 10) {
  return res.status(400).json({
    success: false,
    message: 'Minimum 10 sessions required for custom packages',
    businessRule: 'Profitability threshold - custom packages must be at least 10 sessions'
  });
}

// Maximum sessions (capacity planning)
if (sessions > 100) {
  return res.status(400).json({
    success: false,
    message: 'Maximum 100 sessions allowed for custom packages',
    businessRule: 'Capacity planning - contact us for larger packages'
  });
}
```

#### Route Ordering ⚠️

**CRITICAL**: The `/calculate-price` route MUST come BEFORE the `/:id` route to prevent route collision.

```javascript
// ✅ CORRECT ORDER
router.get('/calculate-price', ...);  // Line 153
router.get('/:id', ...);              // Line 252

// ❌ INCORRECT ORDER (causes 500 errors)
router.get('/:id', ...);
router.get('/calculate-price', ...);  // "calculate-price" parsed as ID
```

---

### Database Model

**File**: `backend/models/StorefrontItem.mjs`

#### Schema Extensions

```javascript
packageType: {
  type: DataTypes.STRING,
  allowNull: false,
  defaultValue: 'fixed',
  validate: {
    isIn: {
      args: [['fixed', 'monthly', 'custom']],  // ✅ Includes 'custom'
      msg: "Package type must be 'fixed', 'monthly', or 'custom'"
    }
  }
}
```

#### Hooks for Custom Packages

```javascript
StorefrontItem.addHook('beforeValidate', (item) => {
  if (item.packageType === 'custom') {
    // Custom packages: calculate based on sessions or totalSessions
    if (!isNaN(sessionsNum) && sessionsNum > 0) {
      item.totalCost = parseFloat((sessionsNum * pricePerSessionNum).toFixed(2));
    } else if (!isNaN(totalSessionsNum) && totalSessionsNum > 0) {
      item.totalCost = parseFloat((totalSessionsNum * pricePerSessionNum).toFixed(2));
    }
  }
});
```

---

## Frontend Implementation

### Component Hierarchy

```
PackagesGrid
├─> CustomPackageCard (CTA)
└─> CustomPackageErrorBoundary
    └─> CustomPackageBuilder (Wizard)
        ├─> Step 1: Session Selection
        │   └─> useCustomPackagePricing hook
        ├─> Step 2: Schedule Preference
        └─> Step 3: Review & Confirm
```

---

### CustomPackageBuilder Component

**File**: `frontend/src/pages/shop/components/CustomPackageBuilder.tsx`

#### State Management (useReducer)

```typescript
interface WizardState {
  currentStep: number;      // 1, 2, or 3
  sessions: number;         // 10-100
  schedulePreference: 'flexible' | 'weekly' | 'biweekly';
  notes: string;
}

type WizardAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_SESSIONS'; payload: number }
  | { type: 'SET_SCHEDULE'; payload: 'flexible' | 'weekly' | 'biweekly' }
  | { type: 'SET_NOTES'; payload: string }
  | { type: 'RESET' };
```

#### Mobile Swipe Gestures

```typescript
const swipeHandlers = useSwipeable({
  onSwipedLeft: () => {
    if (state.currentStep < 3 && !loading && pricing) {
      dispatch({ type: 'NEXT_STEP' });
    }
  },
  onSwipedRight: () => {
    if (state.currentStep > 1) {
      dispatch({ type: 'PREV_STEP' });
    }
  },
  trackMouse: true,  // Desktop compatibility
  delta: 50          // Minimum swipe distance
});
```

#### Props Interface

```typescript
interface CustomPackageBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (packageData: CustomPackageData) => void;
}

interface CustomPackageData {
  sessions: number;
  pricePerSession: number;
  totalCost: number;
  discountTier: 'bronze' | 'silver' | 'gold';
  volumeDiscount: number;
  schedulePreference: 'flexible' | 'weekly' | 'biweekly';
  notes?: string;
}
```

---

### useCustomPackagePricing Hook

**File**: `frontend/src/hooks/useCustomPackagePricing.ts`

#### Implementation

```typescript
export const useCustomPackagePricing = (
  initialSessions: number = 10,
  debounceMs: number = 300
): UseCustomPackagePricingReturn => {
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<number>(initialSessions);

  // Debounced pricing calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sessions >= 10 && sessions <= 100) {
        fetchPricing(sessions);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [sessions, debounceMs, fetchPricing]);

  return { pricing, loading, error, calculatePricing };
};
```

#### Why Debouncing?

**Problem**: Slider movement triggers dozens of API calls per second
**Solution**: 300ms debounce delay
**Result**: API called only after user stops moving slider for 300ms

**Performance Impact**:
- Without debouncing: ~50-100 API calls during slider interaction
- With debouncing: 1-2 API calls (initial + final position)

---

### Error Boundary

**File**: `frontend/src/pages/shop/components/CustomPackageErrorBoundary.tsx`

#### Usage

```typescript
<CustomPackageErrorBoundary onReset={handleCloseCustomWizard}>
  <CustomPackageBuilder
    isOpen={isCustomWizardOpen}
    onClose={handleCloseCustomWizard}
    onComplete={handleCustomPackageComplete}
  />
</CustomPackageErrorBoundary>
```

#### Error Types Handled

1. **JavaScript Errors**: Component crashes, render errors
2. **Network Errors**: API failures, timeouts
3. **Validation Errors**: Business rule violations
4. **Pricing Errors**: Calculation failures

---

### Cart Integration

**File**: `frontend/src/pages/shop/components/PackagesGrid.tsx:274-319`

#### Data Transformation

```typescript
const handleCustomPackageComplete = useCallback((packageData: CustomPackageData) => {
  const customPackageItem: StoreItem = {
    id: Date.now(),  // Temporary ID
    name: `Custom Training Package (${packageData.sessions} Sessions)`,
    description: `${packageData.sessions} sessions at $${packageData.pricePerSession}/session with ${packageData.discountTier} tier discount`,
    packageType: 'custom',
    sessions: packageData.sessions,
    pricePerSession: packageData.pricePerSession,
    totalCost: packageData.totalCost,
    displayPrice: packageData.totalCost,
    price: packageData.totalCost,
    theme: 'cosmic',
    isActive: true,
    imageUrl: null,
    displayOrder: 999,
    includedFeatures: `${packageData.schedulePreference} scheduling${packageData.notes ? ` | Notes: ${packageData.notes}` : ''}`,
    customPackageConfig: {
      selectedSessions: packageData.sessions,
      pricePerSession: packageData.pricePerSession,
      volumeDiscount: packageData.volumeDiscount,
      discountTier: packageData.discountTier,
      calculatedTotal: packageData.totalCost
    }
  };

  onAddToCart(customPackageItem);
  setIsCustomWizardOpen(false);
}, [onAddToCart]);
```

---

### Enhanced Cart Display

**File**: `frontend/src/components/ShoppingCart/CustomPackageCartItem.tsx`

#### Features

1. **Tier Badge**: Visual tier indicator (Bronze/Silver/Gold)
2. **Savings Highlight**: Green box showing total savings
3. **Session Breakdown**: Sessions, price per session, volume discount
4. **Schedule Info**: Scheduling preference with icon
5. **Notes Section**: Optional notes in italics
6. **Cosmic Animations**: Pulsing background, floating badges

#### Rendering Logic

```typescript
// ShoppingCart.tsx conditional rendering
if (isCustomPackage && storefrontItem) {
  return (
    <CustomPackageCartItem
      key={item.id}
      name={storefrontItem.name || 'Custom Training Package'}
      sessions={storefrontItem.sessions || 0}
      pricePerSession={storefrontItem.pricePerSession || 0}
      totalCost={item.price}
      discountTier={storefrontItem.customPackageConfig?.discountTier || 'bronze'}
      volumeDiscount={storefrontItem.customPackageConfig?.volumeDiscount || 0}
      schedulePreference={extractSchedulePreference(storefrontItem.includedFeatures)}
      notes={extractNotes(storefrontItem.includedFeatures)}
      quantity={item.quantity}
      onRemove={() => handleRemoveItem(item.id)}
    />
  );
}
```

---

## Data Flow

### Complete User Journey

```
1. USER: Clicks "Start Building" on CustomPackageCard
   └─> PackagesGrid sets isCustomWizardOpen = true

2. WIZARD OPENS: CustomPackageBuilder renders Step 1
   └─> useCustomPackagePricing hook initialized with 25 sessions (default)

3. API CALL: GET /api/storefront/calculate-price?sessions=25
   └─> Backend calculates Silver tier pricing
   └─> Returns pricing response

4. USER: Moves slider to 35 sessions
   └─> dispatch({ type: 'SET_SESSIONS', payload: 35 })
   └─> Hook debounces for 300ms
   └─> API call triggered after 300ms
   └─> Pricing updates in UI

5. USER: Clicks "Next: Schedule"
   └─> dispatch({ type: 'NEXT_STEP' })
   └─> Step 2 renders

6. USER: Selects "Flexible scheduling"
   └─> dispatch({ type: 'SET_SCHEDULE', payload: 'flexible' })

7. USER: Clicks "Next: Review"
   └─> dispatch({ type: 'NEXT_STEP' })
   └─> Step 3 renders with complete summary

8. USER: Clicks "Add to Cart"
   └─> onComplete callback fired
   └─> handleCustomPackageComplete transforms data
   └─> onAddToCart called with StoreItem
   └─> CartContext adds item
   └─> Wizard closes

9. CART: ShoppingCart detects packageType === 'custom'
   └─> Renders CustomPackageCartItem instead of standard CartItemContainer
   └─> Displays tier badge, savings, schedule, notes

10. CHECKOUT: User proceeds to checkout
    └─> Custom package data preserved
    └─> Order created with custom package details
```

---

## Testing

### Backend Tests

**File**: `backend/__tests__/storefront-custom-pricing.test.mjs`

#### Test Coverage

- ✅ Bronze tier calculations (10-19 sessions)
- ✅ Silver tier calculations (20-39 sessions)
- ✅ Gold tier calculations (40-100 sessions)
- ✅ Tier boundary transitions
- ✅ Business rule validation (min/max)
- ✅ Error handling
- ✅ Performance (<100ms response time)
- ✅ Response format validation

#### Running Tests

```bash
# Backend tests
cd backend
npm test storefront-custom-pricing.test.mjs

# Expected output
PASS  __tests__/storefront-custom-pricing.test.mjs
  ✓ Bronze tier: 10 sessions (45ms)
  ✓ Silver tier: 25 sessions (38ms)
  ✓ Gold tier: 50 sessions (42ms)
  ✓ Rejects sessions < 10 (28ms)
  ✓ Rejects sessions > 100 (31ms)

Tests: 25 passed, 25 total
Time: 2.456s
```

---

### Frontend Tests

**File**: `frontend/src/pages/shop/components/__tests__/CustomPackageFlow.e2e.test.tsx`

#### Test Coverage

- ✅ CustomPackageCard visibility
- ✅ Wizard modal opening/closing
- ✅ Step 1: Session selection + real-time pricing
- ✅ Step 2: Schedule preference selection
- ✅ Step 3: Review & confirm
- ✅ Cart integration
- ✅ Data transformation
- ✅ Error handling
- ✅ Accessibility (WCAG 2.1 AAA)
- ✅ Mobile swipe gestures

#### Running Tests

```bash
# Frontend E2E tests
cd frontend
npm test CustomPackageFlow.e2e.test.tsx

# Expected output
PASS  src/pages/shop/components/__tests__/CustomPackageFlow.e2e.test.tsx
  CustomPackageFlow E2E Tests
    CustomPackageCard Visibility
      ✓ should render "Build Your Perfect Package" section
      ✓ should display CustomPackageCard with all key elements
    Wizard Modal Opening
      ✓ should open wizard when clicked
      ✓ should close wizard when X clicked
    Step 1: Session Selection
      ✓ should display session slider with default value
      ✓ should fetch real-time pricing for bronze tier
      ✓ should fetch real-time pricing for silver tier
      ✓ should fetch real-time pricing for gold tier
    Cart Integration
      ✓ should call onAddToCart with correct data
      ✓ should transform data into StoreItem format

Tests: 42 passed, 42 total
Time: 8.234s
```

---

### Manual Testing Checklist

#### Desktop Testing
- [ ] Chrome: Wizard opens/closes smoothly
- [ ] Firefox: Slider works correctly
- [ ] Safari: Pricing API calls successful
- [ ] Edge: Cart display correct

#### Mobile Testing
- [ ] iOS Safari: Swipe gestures work
- [ ] Chrome Android: Touch targets adequate
- [ ] Mobile layout: Bottom sheet displays correctly
- [ ] Keyboard: Auto-hides after input

#### Accessibility Testing
- [ ] Screen reader: All elements announced
- [ ] Keyboard navigation: Tab order logical
- [ ] High contrast: All text readable
- [ ] Zoom 200%: No horizontal scroll

---

## Deployment

### Environment Variables

```env
# Backend (.env)
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...

# Frontend (.env)
REACT_APP_API_URL=https://api.swanstudios.com
REACT_APP_ENV=production
```

---

### Pre-Deployment Checklist

#### Backend
- [ ] Run all backend tests: `npm test`
- [ ] Verify database migrations applied
- [ ] Check StorefrontItem model includes 'custom' type
- [ ] Confirm route ordering (calculate-price before /:id)
- [ ] Test API endpoint manually: `curl http://localhost:10000/api/storefront/calculate-price?sessions=25`

#### Frontend
- [ ] Run all frontend tests: `npm test`
- [ ] Build production bundle: `npm run build`
- [ ] Check bundle size (<500KB gzipped)
- [ ] Verify no console errors in build
- [ ] Test wizard flow in production build

---

### Deployment Steps

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies
npm install

# 3. Run tests
npm test

# 4. Build frontend
cd frontend
npm run build

# 5. Restart backend
pm2 restart backend

# 6. Verify deployment
curl https://api.swanstudios.com/api/storefront/calculate-price?sessions=25
```

---

## Maintenance

### Monitoring

#### API Metrics to Track
- **/calculate-price response time**: Should be <100ms
- **Error rate**: Should be <0.1%
- **Request volume**: Track usage patterns
- **Tier distribution**: See which tiers are popular

#### Frontend Metrics
- **Wizard completion rate**: % of users who complete all 3 steps
- **Average session count**: What users typically select
- **Cart conversion**: % who add custom package to cart
- **Checkout completion**: % who complete purchase

---

### Common Maintenance Tasks

#### Updating Discount Tiers

**File**: `backend/routes/storeFrontRoutes.mjs:186-195`

```javascript
// Example: Adding a "Platinum" tier for 75+ sessions
if (sessions >= 75) {
  discountPerSession = 18;  // $157/session
  tier = 'platinum';
}
```

**Also Update**:
- Frontend TypeScript types
- Cart display tier configurations
- User documentation

---

#### Changing Session Limits

```javascript
// backend/routes/storeFrontRoutes.mjs
// Update minimum
if (sessions < 15) {  // Changed from 10
  return res.status(400).json({ ... });
}

// Update maximum
if (sessions > 150) {  // Changed from 100
  return res.status(400).json({ ... });
}
```

**Also Update**:
- Hook validation
- Slider min/max
- User documentation

---

#### Optimizing Debounce Delay

```typescript
// frontend/src/hooks/useCustomPackagePricing.ts

// Too fast (excessive API calls)
debounceMs: 100  // ❌

// Recommended (balanced)
debounceMs: 300  // ✅

// Too slow (poor UX)
debounceMs: 1000  // ❌
```

---

### Database Migrations

#### Adding Custom Package Fields

```javascript
// Example migration
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('StorefrontItems', 'customPackageNotes', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('StorefrontItems', 'customPackageNotes');
  }
};
```

---

## Performance Optimization

### Current Optimizations

1. **Debounced API Calls**: 300ms delay prevents request spam
2. **Memoized Components**: PackagesGrid uses React.memo
3. **useCallback Hooks**: Prevents unnecessary re-renders
4. **Lazy Loading**: Modal content loaded only when opened
5. **Route Ordering**: Prevents expensive regex matching

---

### Future Optimizations

1. **API Caching**: Cache pricing responses for common session counts
2. **Bundle Splitting**: Code-split wizard into separate chunk
3. **Service Worker**: Offline pricing calculation
4. **WebSocket**: Real-time pricing updates without polling
5. **CDN**: Serve static wizard assets from CDN

---

## Security Considerations

### Input Validation

#### Backend
- ✅ Sessions parameter: Integer, 10-100 range
- ✅ Price parameter: Positive number, reasonable range
- ✅ SQL Injection: Parameterized queries via Sequelize
- ✅ XSS: Sanitized user inputs (notes, schedule)

#### Frontend
- ✅ Slider constraints: HTML min/max attributes
- ✅ Type safety: TypeScript strict mode
- ✅ CSRF: Token validation in cart actions
- ✅ Rate limiting: Debouncing prevents API abuse

---

### Data Privacy

- **PII**: No personally identifiable information in custom packages
- **Session Storage**: No sensitive data persisted client-side
- **HTTPS**: All API calls encrypted
- **Logs**: No logging of user selections

---

## Troubleshooting

### Issue: Route Collision (500 Error)

**Symptoms**: `GET /api/storefront/calculate-price` returns 500 error with "invalid input syntax for type integer"

**Cause**: `/calculate-price` route defined AFTER `/:id` route

**Fix**:
```javascript
// ✅ CORRECT ORDER
router.get('/calculate-price', ...);  // Must come first
router.get('/:id', ...);

// ❌ INCORRECT
router.get('/:id', ...);
router.get('/calculate-price', ...);  // "calculate-price" treated as ID
```

---

### Issue: Excessive API Calls

**Symptoms**: Network tab shows dozens of pricing requests per second

**Cause**: Debouncing not working or disabled

**Fix**:
```typescript
// Check useCustomPackagePricing hook
const debounceMs = 300;  // Ensure this is set

// Verify useEffect has correct dependencies
useEffect(() => {
  const timer = setTimeout(() => {
    fetchPricing(sessions);
  }, debounceMs);
  return () => clearTimeout(timer);
}, [sessions, debounceMs, fetchPricing]);  // ✅ All deps included
```

---

### Issue: Pricing Not Updating

**Symptoms**: Slider moves but pricing stays same

**Cause**: API error, network issue, or state not updating

**Debug Steps**:
1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify `calculatePricing` function is called
4. Check React DevTools for state updates

---

## Contributing

### Code Style

- **Formatting**: Prettier
- **Linting**: ESLint
- **Type Checking**: TypeScript strict mode
- **Commits**: Conventional Commits format

### Pull Request Process

1. Create feature branch: `git checkout -b feature/custom-package-enhancement`
2. Make changes with tests
3. Run test suite: `npm test`
4. Commit with message: `feat: Add platinum tier for 75+ sessions`
5. Push and create PR
6. Request review from team

---

## Changelog

### Version 1.0.0 (2025-11-19)

**Added**:
- Custom package builder wizard (3 steps)
- Volume discount tiers (Bronze/Silver/Gold)
- Real-time pricing API endpoint
- Mobile swipe gestures
- Enhanced cart display
- Comprehensive error handling
- Full test suite (frontend + backend)

**Technical Details**:
- Backend: Express route with business logic validation
- Frontend: React wizard with useReducer state management
- Database: StorefrontItem model extended for 'custom' type
- Tests: 67 total (25 backend + 42 frontend)

---

## License

Proprietary - Swan Studios PT © 2025

---

## Support

**For Development Questions**:
- Team Slack: #custom-package-dev
- Email: dev-team@swanstudios.com

**For Production Issues**:
- On-call: 1-800-SWAN-DEV
- PagerDuty: custom-package-alerts

---

**Last Updated**: November 19, 2025
**Document Version**: 1.0.0
**Maintained by**: Swan Studios PT Development Team
