# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.7-20260318 | **Duration:** 82.3s
> **Files:** docs/ai-workflow/blueprints/SUBSCRIPTION-STORE-MASTER-BUILD-PLAN.md
> **Generated:** 4/4/2026, 11:51:48 PM

---

# Deep Architecture Review: SUBSCRIPTION-STORE-MASTER-BUILD-PLAN.md

**Document Type:** Build Plan / Architecture Specification
**Reviewer:** Principal Software Engineer (Deep Architecture + Bug Hunt)
**Scope:** Strategic plan for subscription store, tier system, and AI feature gating

---

## CRITICAL SEVERITY FINDINGS

### 🔴 CRITICAL-1: Fundamental Contradiction — "No Caps" vs. Explicit Limits

| Attribute | Value |
|-----------|-------|
| **Severity** | CRITICAL |
| **Section** | Executive Summary (Line ~70) vs. Phase 1B (Line ~350) |
| **What's Wrong** | The document makes two mutually exclusive claims in different sections: |

**Executive Summary states:**
> "The tiers differentiate on **FEATURES** (what you can access), NOT on how many times you can talk to the AI."
> "**NO per-user monthly message caps** for normal use"
> "**ALL tiers get AI access** — chat and workout generation"

**Phase 1B defines actual limits:**
```javascript
// requireSubscription.mjs TIER_LIMITS (lines 27-39):
free: 3→10 msgs/mo, 1→3 gens/mo
pro donation tiers: 15/25/40/60 msgs, 4/5/8/12 gens (scaling)
elite: Infinity→300/50 (soft cap — warn, don't block)
```

**Impact:**
- This contradiction will confuse developers implementing the feature
- Marketing may promise "unlimited" while the code enforces limits
- Users who exceed limits will experience unexpected behavior
- Audit/compliance issues if limits are misrepresented

**Fix:** Decide definitively:
1. **Option A (True Unlimited):** Remove all monthly limits, rely solely on anomaly detection and rate limiting
2. **Option B (Explicit Tiers):** Acknowledge that tiers DO have limits, and the "mission-first philosophy" is about generosity within those limits, not true unlimited access

I recommend **Option B** with honest messaging:
> "Swan Guardian and Crystalline Swan subscribers get generous monthly AI access (15-60 messages, 4-12 generations) with priority access to premium AI features. Swan Starter users get 10 messages and 3 generations monthly to experience the AI coaching."

---

### 🔴 CRITICAL-2: Admin Bypass Creates Security Surface

| Attribute | Value |
|-----------|-------|
| **Severity** | CRITICAL |
| **Section** | Access Hierarchy (Line ~35) |
| **What's Wrong** | The plan states: |

```markdown
| **Sean (admin)** | EVERYTHING, always | N/A — bypasses all gates | Watchtower — can grant/revoke anything |
```

**Problem:** A global admin bypass pattern is a massive security anti-pattern:
- Any admin account compromise grants unrestricted access to ALL features
- Internal malicious admin can access any user's data with zero friction
- Audit trails become meaningless when gates are universally bypassed
- Compliance frameworks (SOC2, GDPR) require principle of least privilege

**Fix:** Implement granular admin access:
```javascript
// Instead of blanket bypass:
// OLD: user.role === 'admin' → bypass all gates

// NEW: Feature-specific admin permissions:
const ADMIN_PERMISSIONS = {
  VIEW_ANALYTICS: 'admin:view:analytics',
  GRANT_TIER: 'admin:grant:tier',
  VIEW_USER_DATA: 'admin:view:user:{userId}',
  MANAGE_TRAINER_ACCESS: 'admin:manage:trainer',
  // etc.
};

// Admin can access feature X IF admin has permission X
// Or: Admin can view any user's data but still needs to respect subscription gates for FEATURES
```

---

### 🔴 CRITICAL-3: AI Usage Stats Endpoint Missing Authorization

| Attribute | Value |
|-----------|-------|
| **Severity** | CRITICAL |
| **Section** | Phase 7 / File Manifest (Line ~780) |
| **What's Wrong** | The plan specifies: |

```markdown
**New backend endpoint:** `GET /api/admin/ai-usage-stats`
- Returns: top users, flagged users, monthly totals, cost estimates
- Queries User model's `aiMessagesUsedThisMonth` + `aiGenerationsUsedThisMonth`
```

**Problem:** This endpoint exposes PII (user names, email, usage patterns) to anyone who can hit the endpoint. While the plan assumes it's admin-only, there's no explicit mention of:
1. Route-level middleware (`requireAdmin`)
2. Parameterized queries to prevent SQL injection
3. Rate limiting on this expensive aggregation endpoint

**Fix:**
```javascript
// backend/routes/adminAiUsageRoutes.mjs
import { requireAdmin } from '../middleware/requireAdmin.mjs';
import { validateQueryParams } from '../middleware/validateRequest.mjs';

router.get('/ai-usage-stats',
  requireAdmin, // CRITICAL: enforce admin role
  validateQueryParams({
    startDate: { type: 'date', required: false },
    endDate: { type: 'date', required: false },
    tier: { type: 'enum', values: ['free', 'pro', 'elite'], required: false },
    flaggedOnly: { type: 'boolean', required: false },
    limit: { type: 'integer', min: 1, max: 100, default: 50 },
    offset: { type: 'integer', min: 0, default: 0 }
  }),
  asyncHandler(getAIUsageStats)
);
```

---

### 🔴 CRITICAL-4: Rate Limiting Contradicts "No Caps" Messaging

| Attribute | Value |
|-----------|-------|
| **Severity** | CRITICAL |
| **Section** | Phase 7 (Line ~580) vs. Rate Limiting Section |
| **What's Wrong** | The plan states "no monthly caps" but enforces per-minute rate limits: |

```markdown
### Rate Limiting (Anti-Bot Only)
- Per-user: 20 RPM (requests per minute) — normal use is ~2-3 RPM max
- 50+ RPM → auto-cooldown 15 minutes (definitely automated)
```

**Problem:**
- 20 RPM = 28,800 requests/day = ~864,000 monthly
- While technically not a "monthly cap," this IS a throughput cap
- Power users (trainers with many clients) could hit this legitimately
- The contradiction between "unlimited" marketing and hard rate limits creates user experience problems

**Fix:**
1. Increase rate limit to 60 RPM for paid tiers (1 req/second is reasonable)
2. Add burst allowance (allow short spikes to 100 RPM)
3. Document clearly: "Rate limiting is per-minute to prevent abuse, not a monthly cap"

---

## 🔴 HIGH SEVERITY FINDINGS

### 🟠 HIGH-1: Model Selector Logic Inconsistency

| Attribute | Value |
|-----------|-------|
| **Severity** | HIGH |
| **File** | `backend/services/ai/modelSelector.mjs` (specified in Phase 1C) |
| **Line** | Code snippet in Phase 4 (AI Cost Model) |
| **What's Wrong** | The model selector uses `amount >= 5` for Flash upgrade, but the tier definitions use $1-$50 donations: |

```javascript
// Current code:
if (tier === 'pro' && amount >= 5) return 'gemini-2.5-flash';
return 'gemini-2.0-flash-lite';
```

**Problems:**
1. **Inconsistent threshold:** Guardian is $1-$50, but Flash-2.5 requires $5+
2. **What happens at $3 donation?** Gets Flash-Lite despite being a "paid" Guardian
3. **Edge case:** User upgrades from $1 → $5 midpoint — when exactly does model change?
4. **Silent degradation:** $3 donor expects premium features but gets degraded AI

**Fix:**
```javascript
export function resolveModelForTier(subscription, user) {
  if (user?.role === 'admin' || user?.role === 'trainer') {
    return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  const tier = subscription?.tier || 'free';
  const amount = parseFloat(subscription?.amount) || 0;

  // Define thresholds explicitly
  const THRESHOLDS = {
    gemini_2_5_flash: 5.00,  // Requires $5+ donation
    gemini_flash_lite: 0      // Default for everyone else
  };

  if (tier === 'elite') return 'gemini-2.5-flash';
  if (tier === 'pro') {
    return amount >= THRESHOLDS.gemini_2_5_flash
      ? 'gemini-2.5-flash'
      : 'gemini-2.0-flash-lite';
  }
  return 'gemini-2.0-flash-lite'; // free tier
}
```

---

### 🟠 HIGH-2: Race Condition — Subscription Status Updates

| Attribute | Value |
|-----------|-------|
| **Severity** | HIGH |
| **Section** | Phase 7 Anti-Abuse (Line ~600) |
| **What's Wrong** | Subscription cancellation policy has a race condition: |

```markdown
### Subscription Cancellation
- Access continues until `currentPeriodEnd`
- After period expires, auto-revert to free tier in middleware
```

**Race Condition Scenario:**
1. User cancels subscription on Jan 15 (period ends Feb 15)
2. User attempts chargeback or payment fails on Feb 14
3. Stripe webhook fires, but webhook arrives AFTER user's local session cache
4. User continues accessing premium features until webhook processes
5. During this window (could be minutes to hours), premium features are accessible without valid subscription

**Fix:**
```javascript
// backend/middleware/requireSubscription.mjs
export async function requireSubscription(requiredTier = 'free') {
  return async (req, res, next) => {
    // ALWAYS check Stripe for current subscription status
    // Do NOT trust cached subscription state
    const user = req.user;

    try {
      // Fetch REAL-TIME subscription status from Stripe
      const stripeCustomer = await stripe.customers.retrieve(user.stripeCustomerId);

      if (stripeCustomer.deleted) {
        // Customer deleted their Stripe account
        return res.status(402).json({ code: 'SUBSCRIPTION_INVALID' });
      }

      const subscription = stripeCustomer.subscriptions?.data[0];

      // Check if subscription is actually active
      const isActive = subscription?.status === 'active' ||
                        subscription?.status === 'trialing';

      // Check period end
      const now = new Date();
      const periodEnd = new Date(subscription?.current_period_end * 1000);

      if (!isActive || periodEnd < now) {
        // Subscription is invalid - force immediate downgrade
        await User.update(
          { subscriptionTier: 'free' },
          { where: { id: user.id } }
        );
        return res.status(402).json({
          code: 'SUBSCRIPTION_EXPIRED',
          expiredAt: periodEnd
        });
      }

      // Pass real-time subscription to downstream
      req.subscription = {
        tier: subscription.metadata.tier || 'free',
        amount: subscription.items.data[0].price.unit_amount / 100,
        periodEnd: periodEnd
      };

      next();
    } catch (error) {
      // On Stripe error, FAIL CLOSED (deny access) not open
      console.error('Subscription verification failed:', error);
      return res.status(503).json({
        code: 'SUBSCRIPTION_CHECK_FAILED',
        retryable: true
      });
    }
  };
}
```

---

### 🟠 HIGH-3: Product Tour

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
