# SwanStudios Subscription Tier System — Master Blueprint

## Vision
SwanStudios aims to help as many people as possible while generating sustainable revenue. The tier system follows a **generous free tier + donation-based middle tier + premium human-touch tier** model inspired by platforms like Wikipedia (donation), Duolingo (freemium), and Strava (premium).

## Business Context
- **Current state:** All revenue from one-time session package sales ($175-$29,120)
- **Problem:** No recurring revenue. No way for users who can't afford 1-on-1 training to engage with the platform.
- **Solution:** 3-tier subscription system that monetizes AI features while keeping the platform accessible to everyone.
- **Owner's goal:** "Help as many people as possible" — pricing should never be a barrier to fitness improvement.

---

## Tier Architecture

### Tier 1: FREE — "Swan Starter"
**Price:** $0 forever
**Purpose:** Generous free tier that provides real value, not a crippled demo.

**Includes:**
- Full workout logging (unlimited)
- Exercise library browsing (840+ exercises)
- Social feed (read + post + comment + like)
- Gamification (XP, levels, badges, leaderboard)
- Basic progress tracking (workout history, streaks)
- 3 AI chat messages per month (sample the AI, build desire for more)
- 1 AI workout generation per month
- BMI calculator
- Community access (challenges, friends)
- 1-month full AI trial on signup (then drops to 3/month limit)

**Limitations:**
- AI capped at 3 chats + 1 workout gen/month after trial
- No NASM calculators (1RM, TDEE, Body Fat %)
- No advanced analytics/charts on profile
- No direct trainer messaging
- No priority support

### Tier 2: SUPPORTER — "Swan Guardian" (Donation-Based)
**Price:** Suggested $5/month, **pay-what-you-want** (minimum $1)
**Purpose:** Full digital experience. Users who want to support the platform and unlock AI.

**Includes everything in Free, PLUS:**
- **Unlimited AI chat** (no message cap)
- **Unlimited AI workout generation**
- **All 4 NASM calculators** (1RM, Calorie/TDEE, Body Fat %, BMI)
- **Advanced Victory charts on profile** (all 50 charts unlocked)
- **"Swan Guardian" supporter badge** (Rare rarity — Gilded Fern glow)
- **Priority in community challenges**
- **Ad-free experience** (if ads are ever added)
- **Monthly supporter spotlight** on social feed

**Pay-What-You-Want mechanics:**
- Default slider set to $5
- Minimum: $1/month
- Suggested: $5/month
- Generous: $10/month (shows gratitude message)
- Max: $50/month (shows "Legendary Patron" message)
- Friendly copy: "Your support keeps SwanStudios free for everyone. Suggested: $5/month"

### Tier 3: PREMIUM — "Swan Elite"
**Price:** $10/month (fixed)
**Purpose:** Human trainer touch — real advice from certified professionals.

**Includes everything in Supporter, PLUS:**
- **Direct trainer messaging** (async chat with Sean or assigned trainer)
- **Monthly custom workout plan review** (trainer reviews your AI-generated plan and adjusts)
- **Video form check submissions** (upload form video, get trainer feedback within 48h)
- **Priority scheduling** for in-person sessions (if applicable)
- **"Swan Elite" premium badge** (Epic rarity — Wing Purple glow)
- **Exclusive trainer Q&A sessions** (monthly group video)
- **1 free in-person/virtual session per quarter** (if within service area)
- **Custom exercise suggestions** based on trainer assessment

---

## Technical Architecture

### Backend

#### New Model: `Subscription.mjs`
```
Fields:
- id (PK)
- userId (FK → User)
- tier: ENUM('free', 'supporter', 'premium')
- status: ENUM('active', 'trial', 'past_due', 'cancelled', 'paused')
- amount: DECIMAL(10,2) — actual amount paid (for pay-what-you-want)
- trialStartDate: DATE — when 1-month trial started
- trialEndDate: DATE — trialStartDate + 30 days
- currentPeriodStart: DATE
- currentPeriodEnd: DATE
- stripeSubscriptionId: STRING — for Stripe recurring billing
- stripeCustomerId: STRING — Stripe customer reference
- cancelledAt: DATE
- cancelReason: STRING
- paymentMethod: ENUM('stripe', 'zelle', 'venmo', 'manual')
- createdAt, updatedAt
```

#### User Model Additions
```
- subscriptionTier: ENUM('free', 'supporter', 'premium'), default 'free'
- aiMessagesUsedThisMonth: INTEGER, default 0
- aiGenerationsUsedThisMonth: INTEGER, default 0
- aiUsageResetDate: DATE — first of each month
```

#### New Middleware: `requireSubscription.mjs`
```javascript
// Logic:
// 1. Admin/trainer roles: ALWAYS pass (they manage the platform)
// 2. Check user.subscriptionTier
// 3. For 'free' tier: check if within trial period OR under monthly AI cap
// 4. For 'supporter'/'premium': check subscription status is 'active'
// 5. If blocked: return 402 with tier info + upgrade URL
```

#### AI Route Integration
```
CURRENT:  protect → aiKillSwitch → aiRateLimiter → controller
PROPOSED: protect → aiKillSwitch → requireSubscription('supporter') → aiRateLimiter → controller
```

#### Stripe Integration
- Use Stripe Checkout `mode: 'subscription'` for recurring billing
- Supporter tier: Stripe product with $5 default price + custom amount support
- Premium tier: Stripe product with $10 fixed price
- Webhook: `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
- Zelle/Venmo: Manual verification by admin (mark subscription active manually)

### Frontend

#### Paywall Glass Overlay Component
When a free-tier user tries to access a gated feature:
- Semi-transparent glass overlay with Crystalline Swan theme
- Clear messaging: "Unlock unlimited AI coaching"
- Tier comparison card showing Free vs Supporter vs Premium
- Pay-what-you-want slider for Supporter tier
- "Start Free Trial" button (if not yet trialed)
- "Subscribe" button → Stripe Checkout

#### Subscription Management Page
- Current tier display with badge
- Usage meters (AI chats used this month)
- Upgrade/downgrade buttons
- Cancel subscription
- Payment history
- Pay-what-you-want amount adjustment

#### AI Usage Counter (Free Tier)
- Small badge on AI FAB: "2/3 AI chats remaining"
- Progress ring depletes as messages are used
- When depleted: glass overlay with upgrade prompt

---

## Migration Plan
1. Create `Subscription` model + migration
2. Add subscription fields to `User` model via migration
3. All existing users start as 'free' tier with 30-day trial
4. Create Stripe products/prices for Supporter and Premium
5. Add `requireSubscription` middleware to AI routes
6. Build frontend paywall overlay + subscription management
7. Add Stripe webhook handler for subscription lifecycle
8. Admin dashboard: subscription management panel

## Revenue Projections (Conservative)
- 100 free users × 10% convert to Supporter × $5 avg = $50/month
- 100 free users × 5% convert to Premium × $10 = $50/month
- Total recurring: ~$100/month baseline, scaling with user growth
- Plus existing session package revenue ($175-$29K one-time)

## Success Metrics
- Free → Supporter conversion rate (target: 10%)
- Free → Premium conversion rate (target: 5%)
- Average donation amount (target: $5+)
- Monthly recurring revenue (MRR)
- AI feature engagement rate by tier
- Churn rate by tier (target: <5% monthly)
