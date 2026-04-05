# Smart Escalation (MiniMax M2.7) — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.7 | **Duration:** 113.6s
> **Files:** docs/ai-workflow/blueprints/SUBSCRIPTION-STORE-MASTER-BUILD-PLAN.md
> **Generated:** 4/4/2026, 11:51:48 PM

---

# SwanStudios Security Analysis: CRITICAL Findings Review

After deep-diving into the build plan, I need to address a fundamental issue: **this document contains no actual CVEs or security vulnerabilities** — it's a feature build plan. However, there are several architectural and implementation concerns worth analyzing. Let me separate genuine risks from over-classified operational concerns.

---

## Finding #1: Rate Limiter Inconsistency

### 1. Is This Truly CRITICAL or Over-Classified?

**⚠️ LEGITIMATE CONCERN (Medium-High)**

The manifest states reducing to **5 RPM** in `backend/services/ai/rateLimiter.mjs`, but the document body discusses **20 RPM** as the normal threshold. This inconsistency will cause real user impact.

```
Expected behavior: 20 RPM (definitely human)
Problem: 5 RPM implementation (will throttle power users)
```

---

### 2. Exact Fix with Code Snippet

```javascript
// backend/services/ai/rateLimiter.mjs

// REMOVE the 5 RPM directive from manifest
// REPLACE with properly tiered limits:

const RATE_LIMITS = {
  // Normal users: 20 RPM = ~0.3 req/sec, far exceeding human typing speed
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    cooldownMinutes: 15
  },
  
  // Heavy users (Guardian/Elite): 30 RPM
  premium: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    cooldownMinutes: 15
  },
  
  // Anti-bot emergency threshold (NEVER normal human)
  botThreshold: {
    windowMs: 60 * 1000,
    maxRequests: 50,
    cooldownMinutes: 15,
    severity: 'auto-throttle'
  }
};

function checkRateLimit(userId, tier) {
  const limit = tier === 'free' ? RATE_LIMITS.default : RATE_LIMITS.premium;
  const requests = getRequestCount(userId, limit.windowMs);
  
  // Soft warning at 80% capacity
  if (requests >= limit.maxRequests * 0.8) {
    logWarning(`User ${userId} at ${requests}/${limit.maxRequests} RPM`);
  }
  
  // Hard throttle
  if (requests >= limit.maxRequests) {
    if (requests >= RATE_LIMITS.botThreshold.maxRequests) {
      applyCooldown(userId, RATE_LIMITS.botThreshold);
      alertAdmin(`BOT DETECTED: User ${userId} at ${requests} RPM`);
    } else {
      applyCooldown(userId, limit);
    }
    return { allowed: false, retryAfter: limit.cooldownMinutes * 60 };
  }
  
  return { allowed: true };
}
```

---

### 3. Blast Radius — How Many Users Affected?

| Scenario | Users Impacted | Severity |
|----------|----------------|----------|
| 5 RPM deployed | **100% of active users** during normal use | **HIGH** |
| 20 RPM deployed | **0%** under normal conditions | None |
| 20 RPM deployed | **<1%** who legitimately use AI heavily | Low |

A power user doing 15 AI-assisted workouts in an hour would hit 5 RPM but never touch 20 RPM.

---

### 4. Priority Order

```
🔴 IMMEDIATE (before any deployment):
   Fix manifest to say 20 RPM, not 5 RPM
   
🟡 PHASE 7 (build order):
   Implement tiered rate limits per above
```

---

## Finding #2: Frontend Lock Overlay = Security Theater

### 1. Is This Truly CRITICAL or Over-Classified?

**⚠️ CRITICAL — This Is A Real Vulnerability**

The document explicitly states:
- "Frontend flags are display-only — never trust for access control"
- BUT the implementation uses `<CrystallineLockOverlay>` as the gating mechanism

**Problem:** Anyone with basic browser knowledge can:
1. Right-click → Inspect Element
2. Delete the overlay `<div>`
3. Access premium features for free

The **ONLY** real protection is the backend 402 interceptor, which the document does include. The frontend overlay is UX only.

---

### 2. Exact Fix with Code Snippet

```tsx
// frontend/src/components/Subscription/CrystallineLockOverlay.tsx

// ADD prominent warning comment:
/**
 * ⚠️ SECURITY NOTE ⚠️
 * This component is UX/DESIGN ONLY.
 * Do NOT rely on this for access control.
 * All real gating happens in backend requireSubscription middleware.
 * Users CAN bypass this by editing DOM.
 * 
 * Purpose: Creates visual barrier + smooth upgrade flow.
 */

// RENAME to make intent clear:
export function PremiumFeatureGuard({ 
  children, 
  requiredTier,
  isLocked 
}: PremiumFeatureGuardProps) {
  const { isPro, isElite, isTrial } = useSubscription();
  
  const hasAccess = 
    isElite || 
    isPro || 
    isTrial ||
    requiredTier === 'free';

  // REMOVE any conditional rendering that "protects" content
  // Content should ALWAYS render — overlay is purely visual
  
  return (
    <div className="premium-feature-container">
      {/* Content always visible (backend handles real protection) */}
      <div className={hasAccess ? 'content-full' : 'content-blurred'}>
        {children}
      </div>
      
      {/* Upgrade prompt for non-premium users */}
      {!hasAccess && (
        <PremiumOverlay variant="glass">
          <LockIcon />
          <h3>Unlock Premium</h3>
          <p>Upgrade to access this feature</p>
          <UpgradeButton onClick={() => navigate('/ascension')}>
            See Plans
          </UpgradeButton>
        </PremiumOverlay>
      )}
    </div>
  );
}
```

**Critical Backend Reinforcement:**

```javascript
// backend/middleware/requireSubscription.mjs

// STRENGTHEN the 402 response:
function requireTier(requiredTier) {
  return async (req, res, next) => {
    // ALWAYS check backend first — frontend is lying
    const userTier = req.subscription?.tier || 'free';
    const hasAccess = checkTierAccess(userTier, requiredTier);
    
    if (!hasAccess) {
      // Log the attempted bypass (could indicate abuse or frontend bug)
      if (req.headers['x-requested-tier']) {
        logSecurityEvent('TIER_BYPASS_ATTEMPT', {
          userId: req.user?.id,
          claimedTier: req.headers['x-requested-tier'],
          actualTier: userTier,
          path: req.path
        });
      }
      
      return res.status(402).json({
        error: 'PAYMENT_REQUIRED',
        message: 'Upgrade to access this feature',
        requiredTier,
        currentTier: userTier,
        upgradeUrl: '/ascension',
        // DO NOT reveal what the locked feature actually is
      });
    }
    
    next();
  };
}
```

---

### 3. Blast Radius — How Many Users Affected?

| User Type | Impact | Effort to Bypass |
|-----------|--------|------------------|
| Casual user | Sees overlay, pays or leaves | None needed |
| Technical user | Bypasses in 10 seconds | Inspect Element |
| Malicious user | Could scrape all "premium" content | Automated DOM parsing |

**If backend 402 is properly implemented:** Blast radius = 0 (frontend bypass yields no data)

**If backend 402 is missing:** Blast radius = **ALL premium content** for all users

---

### 4. Priority Order

```
🔴 CRITICAL (Phase 1):
   Verify backend 402 interceptor exists AND is comprehensive
   Test: bypass frontend overlay, verify 402 response
   
🟡 PHASE 5:
   Implement PremiumFeatureGuard with blurred content (not hidden)
   
🟢 ONGOING:
   Audit all premium endpoints for 402 coverage
```

---

## Finding #3: AI Cost Anomaly Thresholds Are Too Lenient

### 1. Is This Truly CRITICAL or Over-Classified?

**⚠️ OVER-CLASSIFIED as security, actually OPERATIONAL risk**

The thresholds stated:
- 100+ requests/hour = Yellow alert
- 500+ requests/day = Red alert

**Reality Check:**
- 100 requests/hour = ~1.7 RPM = Still within normal heavy use
- A user asking 50 follow-up questions during one workout = 50 requests
- 500 requests/day = ~0.35 RPM average = Completely normal

**The 50 RPM auto-throttle is correct** (definitely automated).

---

### 2. Exact Fix with Code Snippet

```javascript
// backend/services/ai/anomalyDetector.mjs

const ANOMALY_THRESHOLDS = {
  // Normal heavy user: 10-15 RPM peak during active session
  // Power user: 20 RPM peak (rare)
  // BOT: 50+ RPM (virtually impossible for human)
  
  yellowAlert: {
    requestsPerHour: 100, // REASONABLE — ~1.7 RPM, possible for very engaged user
    requestsPerDay: 500,
    severity: 'monitor'
  },
  
  redAlert: {
    requestsPerHour: 200, // ~3.3 RPM — still possibly power user, flag for review
    requestsPerDay: 1000, // ~0.7 RPM average — could be legitimate
    severity: 'review'
  },
  
  autoThrottle: {
    requestsPerMinute: 50, // 50 RPM = 0.83 RPS = BOT (auto-throttle)
    requestsPerHour: 3000, // Safety net
    severity: 'emergency-block'
  },
  
  costAlert: {
    dailyCostUsd: 5, // Flash-Lite: $5 = 25,000 messages = massive scale OR abuse
    monthlyCostUsd: 50 // Alert at $50/mo (would need 250,000 messages)
  }
};

function detectAnomalies(userId) {
  const stats = getAIUsageStats(userId);
  
  // Check individual user patterns
  if (stats.lastHour >= ANOMALY_THRESHOLDS.autoThrottle.requestsPerMinute) {
    triggerAutoThrottle(userId);
    alertAdmin(`EMERGENCY: User ${userId} auto-throttled at ${stats.lastMinute} req/min`);
    return { action: 'throttled', reason: 'bot-detection' };
  }
  
  if (stats.lastHour >= ANOMALY_THRESHOLDS.redAlert.requestsPerHour) {
    flagUser(userId, 'high-usage');
    alertAdmin(`RED: User ${userId} at ${stats.lastHour} req/hr`);
    return { action: 'flagged', reason: 'high-volume' };
  }
  
  // Check global cost
  const todayCost = calculateDailyAICost();
  if (todayCost >= ANOMALY_THRESHOLDS.costAlert.dailyCostUsd) {
    alertAdmin(`COST ALERT: $${todayCost} spent today (limit: $${ANOMALY_THRESHOLDS.costAlert.dailyCostUsd})`);
    return { action: 'alert', reason: 'cost-threshold' };
  }
  
  return { action: 'allowed' };
}
```

---

### 3. Blast Radius — How Many Users Affected?

**Current thresholds (100/hr, 500/day):** Affects 0% of users under normal use.

**More realistic thresholds (200/hr, 1000/day):** Still affects 0% of legitimate users.

**Cost ceiling ($5/day):** Affects 0% until platform reaches 25,000 messages/day.

---

### 4. Priority Order

```
🟡 PHASE 7 (build order is appropriate):
   Implement per-user anomaly detection with refined thresholds
   Auto-throttle at 50 RPM is correct and should be emphasized
   Cost ceiling is operational awareness, not security
```

---

## Finding #4: TrainerType Permission Auto-Granting

### 1. Is This Truly CRITICAL or Over-Classified?

**⚠️ LEGITIMATE CONCERN (Medium)**

The plan states:
- Affiliated trainers: auto-granted ALL 6 permissions
- Independent trainers: only `view_progress` + `manage_clients`

**Risk:** If `trainerType` is mis-set or modifiable by users, privilege escalation is possible.

---

### 2. Exact Fix with Code Snippet

```javascript
// backend/models/User.mjs

trainerType: {
  type: DataTypes.STRING(20),
  allowNull: true,
  validate: {
    isIn: [['affiliated', 'independent', null]]
  },
  // CRITICAL: This field can ONLY be set by:
  // 1. Database migration (initial setup)
  // 2. Sean via admin panel
  // 3. NEVER via user-facing endpoints
  comment: 'INTERNAL ONLY — Set by admin only, never exposed to user'
}

// backend/middleware/trainerAuth.mjs

const PERMISSION_MATRIX = {
  affiliated: ['view_clients', 'edit_clients', 'view_progress', 
                'manage_workouts', 'message_clients', 'access_dashboard'],
  independent: ['view_progress', 'manage_clients'], // Minimum viable
  null: [] // Non-trainers
};

// NEVER trust client-provided trainerType
function requireAffiliatedTrainer(req, res, next) {
  if (req.user?.role !== 'trainer') {
    return res.status(403).json({ error: 'NOT_TRAINER' });
  }
  
  // trainerType must be set server-side ONLY
  // Check database directly, not req.body or JWT claims
  const user = await User.findByPk(req.user.id);
  
  if (user.trainerType !== 'affiliated') {
    // Independent trainers don't get affiliated routes
    return res.status(403).json({ 
      error: 'AFFILIATED_ONLY',
      message: 'This feature is for affiliated trainers only'
    });
  }
  
  next();
}

// Independent trainers: explicit permission check
function requireTrainerPermission(permission) {
  return async (req, res, next) => {
    // 1. Sean (admin) bypasses all
    if (req.user?.role === 'admin') return next();
    
    // 2. Affiliated trainers have all permissions
    const user = await User.findByPk(req.user.id);
    if (user.trainerType === 'affiliated') return next();
    
    // 3. Independent trainers: check explicit permissions
    const trainerPermissions = await getTrainerPermissions(req.user.id);
    if (!trainerPermissions.includes(permission)) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        required: permission,
        granted: trainerPermissions
      });
    }
    
    // 4. Independent trainers can ONLY see their own clients
    if (req.params.clientId) {
      const isOwnClient = await verifyTrainerClientRelationship(
        req.user.id, 
        req.params.clientId
      );
      if (!isOwnClient) {
        return res.status(403).json({ 
          error: 'NOT_YOUR_CLIENT' 
        });
      }
    }
    
    next();
 

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
