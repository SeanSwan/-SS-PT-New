# SwanStudios Store + Subscription Tier System — Master Build Plan

> **Status:** APPROVED — 14-Brain AI Village Validated (2026-04-05, $0.25, 11/12 passed)
> **Created:** 2026-04-04 | **Author:** Opus CEO + Gemini CTO
> **Planning Method:** Recursive Planning Protocol — Phase A (8 rounds) + Phase B (Village) + Phase C (refinement)

### Village-Required Fixes (incorporated into plan)
1. **modelSelector must be TypeScript** — typed interfaces, Number.isFinite() guard for Sequelize DECIMAL strings
2. **PaywallContext split** — separate State context and Actions context to prevent global re-renders
3. **DonationSlider ARIA** — role="slider", aria-valuenow/min/max/valuetext for WCAG
4. **Error Boundaries** — wrap AscensionPage, AIUsageDashboard, GenerationWizard
5. **Trial abuse** — check by email AND phone number
6. **Carousel dot indicators** on mobile
7. **Donation slider tick marks** at $1, $5, $10, $25, $50

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Access Hierarchy](#2-access-hierarchy)
3. [Subscription Tiers](#3-subscription-tiers)
4. [AI Cost Model](#4-ai-cost-model)
5. [Build Phases](#5-build-phases)
6. [Phase 1: Backend Foundation](#6-phase-1-backend-foundation)
7. [Phase 2: /ascension Page](#7-phase-2-ascension-page)
8. [Phase 3: Store Memberships](#8-phase-3-store-memberships)
9. [Phase 4: Global Paywall (402 Interceptor)](#9-phase-4-global-paywall)
10. [Phase 5: Feature Gating](#10-phase-5-feature-gating)
11. [Phase 6: Trainer Access Tiers](#11-phase-6-trainer-access-tiers)
12. [Phase 7: Anti-Abuse & Security](#12-phase-7-anti-abuse)
13. [Phase 8: Onboarding & Tour](#13-phase-8-onboarding)
14. [File Change Manifest](#14-file-change-manifest)
15. [Risks & Mitigations](#15-risks)

---

## 1. Executive Summary

Build the full subscription purchasing experience, tier-gated feature system, and trainer access control. Currently: 3 tiers defined in backend but no frontend UI shows them, no feature gating, no store integration, no trainer type distinction.

**Goal:** Users can see what each tier offers, subscribe/donate, and access gated features. Trainers are categorized (affiliated vs independent). Sean is the watchtower with full control.

---

## 2. Access Hierarchy

### Role-Based Access (Immutable)

| Role | Access | Subscription? | Notes |
|------|--------|---------------|-------|
| **Sean (admin)** | EVERYTHING, always | N/A — bypasses all gates | Watchtower — can grant/revoke anything |
| **SS Trainers** (role=trainer, affiliated) | Full trainer dashboard | Covered by SS | Same access as admin minus admin panel |
| **Independent Trainers** (role=trainer, independent) | Trainer dashboard, own clients only | TBD — future trainer subscription | Limited until Sean grants permissions |
| **Crystalline Swan Users** (role=client, tier=elite) | All client features | $24.99/mo | Unlimited AI + trainer messaging |
| **Swan Guardian Users** (role=client, tier=pro) | AI + advanced analytics | Donation $1-50 | AI scales with donation |
| **Swan Starter Users** (role=client, tier=free) | Core features | $0 | 10 AI chats/mo, 3 gens/mo |

### Sean's Watchtower Powers (Existing)
- **FeatureAccessPage** (`/dashboard/admin/feature-access`) — toggle per-user feature flags
- **TrainerPermissionsManager** — grant/revoke 6 granular permissions per trainer
- **Admin Grant** (`POST /api/subscriptions/admin/grant`) — manually assign any tier to any user
- All of this already exists and works

### Trainer Type Distinction (NEW — needs building)
- Add `trainerType` field to User model: `'affiliated'` | `'independent'` | `null`
- Affiliated trainers: auto-granted all 6 permissions, full dashboard access
- Independent trainers: start with limited permissions, Sean grants more as needed
- Middleware: `requireAffiliatedTrainer()` for SS-internal routes

---

## 3. Subscription Tiers (FINAL)

### Mission-First Philosophy: Give Back, Help People, They'll Help Us

**Core principle:** SwanStudios exists to help people. If we restrict AI access, we're hurting the people we're trying to help. The tiers differentiate on **FEATURES** (what you can access), NOT on how many times you can talk to the AI.

**The AI is the hook.** People come for the AI coaching, stay for the community, upgrade for the premium features. If we gate the AI, they never experience the value and they leave.

**Cost reality check:**
- Gemini Flash-Lite: ~$0.0002 per message
- 100 users × 50 msgs/month = 5,000 msgs = **$1/month**
- 1,000 users × 50 msgs/month = 50,000 msgs = **$10/month**
- Even 10,000 active users = **$100/month** — and by then subscription revenue dwarfs it
- Sean is OK paying $20-30/mo for the site. Normal usage won't come close to that.

**What CAN'T happen:** A bot or script sending 10,000 requests in an hour, running up hundreds of dollars. THAT is what we protect against — not normal people using the platform.

**Approach:**
- **NO per-user monthly message caps** for normal use
- **ALL tiers get AI access** — chat and workout generation
- **Safety valve:** anomaly detection for bots/abuse ONLY (not normal heavy users)
- **Admin monitoring dashboard** — Sean sees costs, gets alerted if something's wrong
- **Global daily cost ceiling** — if total API spend exceeds $5/day, auto-alert Sean
- **Per-user anomaly detection** — 100+ requests in 1 hour from one user = flag (likely bot)
- **Sean decides everything** — system alerts, human judgment

### Swan Starter — FREE ($0)
**Backend tier ID:** `free`

**Core features — the foundation everyone gets:**
- Workout logging (unlimited)
- Basic nutrition macro counter (log meals, daily macros)
- Exercise library (840+ exercises)
- Social feed (read + post + comment + like)
- Gamification (XP, levels, badges, leaderboard, streaks, companion pet)
- Basic progress charts (weight, workout frequency)
- BMI calculator
- Pain & Injury body map
- Community challenges
- Profile & settings
- Session booking
- Messages (trainer communication)
- **AI Coach chat — unlimited for normal use** (anomaly detection only)
- **AI workout generation — unlimited for normal use** (with confirmation flow)
- 30-day free trial of ALL premium features on signup

### Swan Guardian — DONATION ($1-$50, suggested $5/mo)
**Backend tier ID:** `pro` (display name: "Swan Guardian")

**Everything in Starter PLUS premium features:**
- All 4 NASM calculators (1RM, TDEE, Body Fat %, BMI)
- Full Victory chart gallery on profile (all 50 charts)
- Advanced progress analytics & insights
- Detailed NASM Analytics dashboard (14 charts)
- AI Nutrition coaching (meal planning, food intelligence)
- Swan Guardian badge (Rare — Gilded Fern glow)
- Priority in community challenges
- Support the mission — donation keeps platform free for others

### Crystalline Swan — $24.99/mo ($249.99/yr)
**Backend tier ID:** `elite`

**Everything in Guardian PLUS human trainer access:**
- Unlimited everything (same AI, plus premium features)
- Voice AI Coach (when available)
- Content Studio access
- Direct trainer messaging (async chat with Sean or assigned trainer)
- Video form check submissions
- Monthly custom workout plan review
- Creator Economy access
- Live streaming (create — watching is free for all)
- Crystalline Swan badge (Epic — Wing Purple glow)
- Priority scheduling for sessions
- Exclusive trainer Q&A sessions

### AI Generation Confirmation Flow (MANDATORY)

AI workout generations are expensive (10-20x more tokens than a chat message). Every generation MUST go through a **review-before-send** flow so users get it right the first time.

**The Flow:**
```
User clicks "Generate Workout" 
        ↓
STEP 1: Context Gathering Form (REQUIRED before generation)
  - What's your goal? (dropdown: strength, hypertrophy, endurance, fat loss, sport-specific, rehab)
  - How many days/week? (1-7 selector)
  - Session duration? (15/30/45/60/75/90 min)
  - Available equipment? (checkboxes: full gym, dumbbells only, bodyweight, home, outdoor)
  - Any injuries/limitations? (body map quick-select or text)
  - Experience level? (beginner/intermediate/advanced)
  - Focus areas? (muscle group multi-select)
  - Special notes? (free text — optional)
        ↓
STEP 2: Review & Confirm Page
  - Shows all selections in a clean summary card
  - "This generation uses 1 AI credit (you have X remaining this month)"
  - Token meter showing remaining gens for their tier
  - "Edit" button to go back and change anything
  - "Generate My Workout" confirmation button (primary CTA)
  - Tooltip: "AI generations use more processing power than chat — 
    make sure your details are complete for the best results"
        ↓
STEP 3: Generation Processing
  - Loading state with progress indicator
  - Backend receives the full context → better output quality
        ↓
STEP 4: Results
  - Full workout plan displayed
  - "Save to My Workouts" / "Regenerate" / "Edit & Regenerate"
  - Regenerate counts as another generation credit
```

**Why this matters:**
1. **Better outputs** — more context = more accurate/personalized workout
2. **Fewer wasted generations** — user reviews before spending the credit
3. **Transparency** — user knows this costs more than chat
4. **Data collection** — the form feeds profile data we can reuse for future gens

**Implementation:**
- New component: `frontend/src/components/WorkoutGeneration/GenerationWizard.tsx`
- Wraps the existing Workout Forge / AI generation flow
- Intercepts the "generate" action with the confirmation step
- Passes all gathered context to the backend along with the generation request

**Existing code to integrate with:**
- `backend/controllers/aiWorkoutController.mjs` — receives the context
- `frontend/src/components/DashBoard/Pages/trainer-dashboard/WorkoutForge.tsx` — existing workout generation UI
- The context gathering fields already partially exist in ClientOnboardingWizard (goals, equipment, limitations)

---

## 4. AI Cost Model

### Model Routing by Tier

| Tier | Gemini Model | Free Quota | Paid Cost/Msg |
|------|-------------|------------|---------------|
| Starter/Guardian ($0-4.99) | Flash-Lite | 1,000 req/day | ~$0.0002 |
| Guardian ($5+) | 2.5 Flash | 250 req/day | ~$0.0005 |
| Crystalline | 2.5 Flash | 250 req/day | ~$0.0005 |
| Admin/Trainers | 2.5 Flash (or env override) | N/A | Business cost |

### Cost Projections (no caps — real math)

| Users | Avg Msgs/User/Mo | Monthly AI Cost | Render Cost | Total | Revenue Needed |
|-------|------------------|----------------|-------------|-------|----------------|
| 0-50 | ~30 | **$0** (free quota) | $60 (current) | $60 | Existing plan |
| 50-200 | ~40 | **$2** | $60 | $62 | A few Guardians cover it |
| 200-1000 | ~50 | **$10** | $60-85 | $95 | Subscriptions easily cover |
| 1000-5000 | ~50 | **$50** | $85-150 | $200 | Scale comfortably |

**Flash-Lite is ~$0.0002/message.** Even aggressive usage stays cheap.

### Bandwidth & Server Monitoring (CRITICAL)

The bigger risk isn't AI cost — it's **server load** from many concurrent users hitting the API.

**Render Professional Plan ($60/mo) specs:**
- Shared CPU, scales automatically within plan limits
- If traffic spikes, requests queue → slow responses → bad UX
- Need monitoring BEFORE it becomes a problem

**What to monitor:**
- **Response times:** API p95 latency (alert if >3s consistently)
- **Active connections:** Concurrent WebSocket/HTTP connections
- **CPU/Memory:** Render dashboard already shows this
- **AI endpoint queue depth:** If AI requests are backing up
- **Error rate:** 5xx errors spike = server overwhelmed

**Implementation:**
- Render already has basic metrics in dashboard
- Add a lightweight `/api/health` endpoint that returns response time + queue depth
- Admin dashboard widget: "Server Health" card showing real-time latency, active users, error rate
- Alert Sean (email/notification) if:
  - p95 latency > 5 seconds for 5+ minutes
  - Error rate > 5% for 5+ minutes
  - Memory usage > 85%

**Scaling plan (when the time comes):**
- Render Professional → Render Professional Plus (more CPU/RAM) — seamless upgrade
- AI requests are async (user waits for response) — naturally rate-limited by UX
- The confirmation flow on workout gens reduces burst traffic
- If needed later: queue AI requests with Bull/Redis instead of inline processing

**New file:** `backend/routes/healthRoutes.mjs` — `/api/health` endpoint
**New admin widget:** Add "Server Health" card to admin overview dashboard

### Implementation (Village-corrected — TypeScript with type safety)
New file: `backend/services/ai/modelSelector.mjs`
```javascript
// Village fix: typed, handles Sequelize DECIMAL strings, NaN-safe
const DEFAULT_ADMIN_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export function resolveModelForTier(subscription, user) {
  if (user?.role === 'admin' || user?.role === 'trainer') return DEFAULT_ADMIN_MODEL;
  const tier = subscription?.tier ?? 'free';
  // Sequelize DECIMAL columns serialize as strings — coerce safely
  const raw = Number(subscription?.amount ?? 0);
  const amount = Number.isFinite(raw) ? raw : 0;
  if (tier === 'elite') return 'gemini-2.5-flash';
  if (tier === 'pro' && amount >= 5) return 'gemini-2.5-flash';
  return 'gemini-2.0-flash-lite';
}
```

---

## 5. Build Phases (Priority Order)

| Phase | What | Revenue Impact | Effort |
|-------|------|----------------|--------|
| **1** | Backend foundation (rename, limits, model routing) | Enables everything | Medium |
| **2** | /ascension page (tier comparison) | Users see what to buy | Large |
| **3** | Store memberships section | Users can buy | Medium |
| **4** | Global paywall (402 interceptor) | Converts free→paid | Medium |
| **5** | Feature gating in client dashboard | Creates urgency to upgrade | Medium |
| **6** | Trainer access tiers | Prepares for independent trainers | Small |
| **7** | Anti-abuse & security hardening | Protects revenue | Small |
| **8** | Onboarding + product tour | Improves conversion | Medium |

---

## 6. Phase 1: Backend Foundation

### 1A. Rename "Swan Pro" → "Swan Guardian" (display only)

| File | Lines | Change |
|------|-------|--------|
| `backend/routes/subscriptionRoutes.mjs` | 69, 70, 86 | name, tagline, badge name |
| `backend/routes/subscriptionRoutes.mjs` | 209, 267 | Error messages |
| `backend/middleware/requireSubscription.mjs` | 209, 267 | Error messages |
| `backend/models/Subscription.mjs` | 70 | Comment |
| `backend/models/User.mjs` | 139, 145, 150 | Comments |

**Tier ID stays `'pro'`** — no database migration needed, no Stripe changes.

### 1B. Update Tier Limits

**requireSubscription.mjs** TIER_LIMITS (lines 27-39):
- free: 3→**10** msgs/mo, 1→**3** gens/mo
- pro donation tiers: **15/25/40/60** msgs, **4/5/8/12** gens (scaling)
- elite: Infinity→**300/50** (soft cap — warn, don't block)

**subscriptionRoutes.mjs** TIER_DEFINITIONS — mirror same limits for API display.

### 1C. Flash-Lite Model Routing

**New file:** `backend/services/ai/modelSelector.mjs` — pure function, `resolveModelForTier(subscription, user)`

**Modify:** `backend/services/aiChatService.mjs` line 1967 — replace hardcoded model with `resolveModelForTier()`

**Modify:** `backend/controllers/aiWorkoutController.mjs` — pass `modelPreference` through context

**Add to costConfig.mjs:** Flash-Lite pricing entry

### 1D. Subscription Tier Flow-Through

Verify `req.subscription` passes from middleware → routes → services → adapters.
- aiChatRoutes.mjs: pass subscription to sendChatMessage()
- geminiAdapter.mjs: already supports `ctx.modelPreference` at line 108

---

## 7. Phase 2: /ascension Page

### Route: `/ascension` (public, no auth)

### New Files
```
frontend/src/pages/AscensionPage/
  AscensionPage.tsx              # Page shell, data fetching, responsive layout
  components/
    VaultCard.tsx                # Tier card with variant styling
    DonationSlider.tsx           # Guardian donation slider
    TierCarousel.tsx             # Mobile snap-scroll wrapper
```

### Design (Gemini CTO spec)
- **Mobile (320-768px):** Horizontal snap-scroll carousel, 85vw cards
- **Desktop (1024+):** 3-card staggered grid, max-width 1200px
- **Starter card:** Carbon #141419 bg, Graphite border
- **Guardian card:** Carbon→Midnight Sapphire gradient, Gilded Fern border + slider thumb
- **Crystalline card:** Obsidian Black bg, gradient border (Wing Purple→Ice Wing), 4s breathing animation
- **Typography:** Cormorant Garamond Italic for tier names, Fira Code for AI limits, Sora for features
- **Animations:** framer-motion staggered upward fade-in, spring physics
- **CTAs:** Dual-glow button rule (blue→purple glow, purple→cyan glow)

### Data Source
`useSubscription().tiers` — fetches from `GET /api/subscriptions/tiers`

**Need to extend `TierDefinition` interface** with: `annualPrice`, `annualPriceDisplay`, `donationBased`, `suggestedPrice`, `donationTiers[]`

### CTA Handlers
- Starter: "Current Plan" indicator (no action)
- Guardian: `checkout('pro', donationAmount)` → Stripe
- Crystalline: `checkout('elite', undefined, isAnnual ? 'year' : 'month')` → Stripe
- Trial: `startTrial()` → 30-day full access

---

## 8. Phase 3: Store Memberships

### Add "Memberships" Section to StoreV3.tsx

**New file:** `frontend/src/pages/shop/components/MembershipsSection.tsx`

**Placement in StoreV3:** Between hero (line 971) and packages (line 976), wrapped in ScrollReveal.

**Design:** 3 compact cards showing tier name, price, one-line benefit, "Learn More" → /ascension

**NOT a full feature comparison** — that's /ascension's job. This is a teaser.

---

## 9. Phase 4: Global Paywall (402 Interceptor)

### New File: `frontend/src/context/PaywallContext.tsx`

**Interface:**
- `showPaywall(featureName, data)` — triggered by 402 interceptor
- `hidePaywall()` — dismiss
- `onUnlocked(callback)` — retry failed request after upgrade
- Single-instance guard (debounce multiple 402s)
- Background-request awareness (`_isBackgroundRequest` flag)

### Modify: `frontend/src/services/api.service.ts`

Add 402 response interceptor using bridge pattern (module-level callback registration to avoid circular imports).

### Modify: `frontend/src/App.tsx`

Wrap app with `PaywallProvider` inside `FeatureAccessProvider`.

### Edge Cases Handled
- Multiple 402s → show one paywall only
- Background fetches → don't trigger paywall
- Trial expired mid-session → show paywall with trial-expired messaging
- Queue 402s during initial render (before PaywallProvider mounts)

---

## 10. Phase 5: Feature Gating

### Gating Strategy: Show locked, don't hide

Two mechanisms:
1. **Backend 402s** for AI features (handled by Phase 4 interceptor)
2. **CrystallineLockOverlay** for non-AI premium features

### Files to Gate

| File | Feature | Gate Level | What Users See |
|------|---------|-----------|----------------|
| `ClientProgressDashboardPage.tsx` | Detailed NASM Analytics link | Guardian+ | Lock overlay on "View Detailed" button |
| `NutritionWorkspace.tsx` | AI Meal Plan + Intelligence tabs | Guardian+ | Basic tabs free, AI tabs locked |
| `CreatorEconomyPage.tsx` | Creator Economy | Crystalline | Full page locked |
| `LiveStreamingPage.tsx` | "Go Live" button | Crystalline | Watch free, create locked |

### Pattern
```tsx
const { isPro, isElite, isTrial } = useSubscription();
<CrystallineLockOverlay
  isLocked={!isPro && !isElite && !isTrial}
  featureName="Feature Name"
  ctaLabel="Upgrade to Swan Guardian"
  onConfigure={() => navigate('/ascension')}
>
  <LockedContent />
</CrystallineLockOverlay>
```

---

## 11. Phase 6: Trainer Access Tiers

### Database Change
Add to User model:
```javascript
trainerType: {
  type: DataTypes.STRING(20),
  allowNull: true,
  validate: { isIn: [['affiliated', 'independent']] },
  comment: 'Trainer affiliation type — null for non-trainers'
}
```

### Trainer Types

| Type | Registration | Default Permissions | Dashboard Access | Sean Manages |
|------|-------------|--------------------|--------------------|-------------|
| **Affiliated** (SS employed) | Sean creates via admin | All 6 permissions auto-granted | Full trainer dashboard | Yes — full control |
| **Independent** (own business) | Self-register as trainer | view_progress + manage_clients only | Limited trainer dashboard | Yes — can grant more |

### Auto-Permission Granting
When `trainerType = 'affiliated'`, automatically grant all 6 permissions.
When `trainerType = 'independent'`, grant only `view_progress` + `manage_clients`.
Sean can override any permission via existing TrainerPermissionsManager.

### Visibility
Independent trainers can ONLY see/manage their own assigned clients.
Sean can see ALL trainers and ALL their clients.

### Migration
```sql
ALTER TABLE "Users" ADD COLUMN "trainerType" VARCHAR(20) NULL;
```

---

## 12. Phase 7: Usage Monitoring + Anti-Abuse

### Philosophy: No Caps, Only Safety Valves

**There are NO monthly message limits.** Everyone uses AI freely. The only protection is against things that could break the API or run up thousands in costs — bots, scripts, hackers, not normal people.

### Admin AI Usage Dashboard (NEW — add to admin overview)

**What Sean sees:**
- **Daily cost tracker:** Estimated Gemini API cost today/this week/this month
- **Top users:** Who's using the most (sorted by volume) — for awareness, not punishment
- **Anomaly alerts:** Only fires for truly abnormal patterns (see below)
- **Per-user detail:** Click any user → see their AI usage patterns
- **Quick actions:** "Throttle this user" (for confirmed abuse only) or "All clear" (dismiss alert)

**Anomaly detection (alert Sean, don't auto-block):**
- 100+ requests from one user in 1 hour → Yellow alert (might be power user OR bot)
- 500+ requests from one user in 1 day → Red alert (almost certainly automated)
- Daily total API cost exceeds $5 → Cost alert (something unusual happening)
- Repeated identical prompts from same user → Bot pattern alert

**Auto-throttle (ONLY for obvious attacks, not normal users):**
- 50+ requests in 1 minute from one user → 15-minute cooldown (definitely a bot/script)
- 2,000+ requests in 1 day from one user → auto-throttle to 10 RPM until Sean reviews
- These thresholds are so high that NO normal user would ever hit them

### Trainer Access

**All trainers get full AI access — no caps:**
- Affiliated trainers: unlimited (same as admin)
- Independent trainers: unlimited AI (same as users — no caps)
- Trainers using AI to serve their clients = platform is working = GOOD
- Sean monitors via admin dashboard, intervenes only if needed

### Rate Limiting (Anti-Bot Only)
- Per-user: 20 RPM (requests per minute) — normal use is ~2-3 RPM max
- 50+ RPM → auto-cooldown 15 minutes (definitely automated)
- Global daily cost ceiling: alert Sean at $5/day (at Flash-Lite pricing, this would require ~25,000 messages in one day — extreme)

### Cost Safety Net
- **Normal scenario:** 100 users × 50 msgs/month = $1/month total
- **Heavy scenario:** 1,000 users × 100 msgs/month = $20/month total  
- **Alert threshold:** $5/day = $150/month — would require massive scale or abuse
- **Nuclear option (never needed):** Sean can flip one env var to pause all AI for non-admin users
- At current scale (early launch), costs will be cents, not dollars

### Trial Abuse Prevention
- Check if email has EVER had a trial (cross-account)
- Return 403 `TRIAL_ALREADY_USED` if found

### Subscription Cancellation
- Access continues until `currentPeriodEnd`
- After period expires, auto-revert to free tier in middleware

### Frontend Security
- All tier checks happen on BACKEND (requireSubscription middleware)
- Frontend flags are display-only — never trust for access control
- Stripe webhook (verified signature) is the only way to change tier

### Implementation: Admin Usage Dashboard

**New admin page:** `/dashboard/admin/ai-usage`

**New backend endpoint:** `GET /api/admin/ai-usage-stats`
- Returns: top users, flagged users, monthly totals, cost estimates
- Queries User model's `aiMessagesUsedThisMonth` + `aiGenerationsUsedThisMonth`

**New file:** `frontend/src/components/DashBoard/Pages/admin-ai-usage/AIUsageDashboard.tsx`
- Table with user name, tier, msgs used, gens used, flag status
- Filter by: flagged only, tier, date range
- Quick action buttons: "Limit", "Grant more", "View detail"

---

## 13. Phase 8: Onboarding & Tour

### Onboarding Update
Add optional step to ClientOnboardingWizard after AI Consent (step 7):
- Show tier comparison (mini version of /ascension)
- "Start your 30-day free trial" CTA
- Can skip — goes to Summary

### Product Tour (first login after onboarding)
- Subtle spotlight-driven overlay (framer-motion clip-path)
- NOT annoying modal popups
- Highlights: AI Coach, Nutrition, Charts, Social, Gamification
- Shows which features are free vs premium
- "Explore" button to dismiss

### Tour Implementation
- Use framer-motion `AnimatePresence` with spotlight mask
- Store `hasSeenTour` in localStorage
- Only show once per user

---

## 14. File Change Manifest

### New Files (13)
| File | Purpose |
|------|---------|
| `backend/services/ai/modelSelector.mjs` | Tier-based Gemini model selection |
| `backend/routes/adminAiUsageRoutes.mjs` | AI usage stats endpoint for admin dashboard |
| `frontend/src/pages/AscensionPage/AscensionPage.tsx` | Tier comparison landing page |
| `frontend/src/pages/AscensionPage/components/VaultCard.tsx` | Tier card component |
| `frontend/src/pages/AscensionPage/components/DonationSlider.tsx` | Guardian donation slider |
| `frontend/src/pages/AscensionPage/components/TierCarousel.tsx` | Mobile snap-scroll |
| `frontend/src/pages/shop/components/MembershipsSection.tsx` | Store membership teaser |
| `frontend/src/context/PaywallContext.tsx` | Global 402 paywall context |
| `frontend/src/components/DashBoard/Pages/admin-ai-usage/AIUsageDashboard.tsx` | Admin AI usage monitoring |
| `backend/migrations/2026XXXX-add-trainer-type.cjs` | trainerType column migration |
| `frontend/src/pages/AscensionPage/components/BillingToggle.tsx` | Annual/monthly toggle |
| `frontend/src/components/Tour/ProductTour.tsx` | First-login spotlight tour |
| `frontend/src/components/WorkoutGeneration/GenerationWizard.tsx` | Confirmation flow before AI workout gen |

### Modified Files (18)
| File | Changes |
|------|---------|
| `backend/routes/subscriptionRoutes.mjs` | Rename Guardian, update limits, update features text |
| `backend/middleware/requireSubscription.mjs` | New limits, elite soft cap, abuse tracker, cancellation revert |
| `backend/models/Subscription.mjs` | Comment updates |
| `backend/models/User.mjs` | Add trainerType field, comment updates |
| `backend/services/aiChatService.mjs` | Thread subscription, use modelSelector |
| `backend/services/ai/costConfig.mjs` | Add Flash-Lite pricing |
| `backend/controllers/aiWorkoutController.mjs` | Pass modelPreference through ctx |
| `backend/routes/aiChatRoutes.mjs` | Pass subscription to service |
| `frontend/src/hooks/useSubscription.ts` | Extend TierDefinition interface |
| `frontend/src/services/api.service.ts` | Add 402 interceptor |
| `frontend/src/App.tsx` | Wrap with PaywallProvider |
| `frontend/src/routes/main-routes.tsx` | Add /ascension route |
| `frontend/src/pages/shop/StoreV3.tsx` | Insert MembershipsSection |
| `frontend/src/components/DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.tsx` | Gate detailed analytics |
| `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx` | Gate AI nutrition tabs |
| `frontend/src/pages/onboarding/ClientOnboardingWizard.tsx` | Add tier selection step |
| `frontend/src/components/Subscription/FrostedPaywall.tsx` | Already updated (previous session) |
| `backend/services/ai/rateLimiter.mjs` | Reduce to 5 RPM |

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Flash-Lite lower quality outputs | Free users get worse AI | Monitor feedback, upgrade if needed |
| Google cuts free quota further | Costs spike unexpectedly | Flash-Lite has highest free quota (1000/day) |
| Stripe webhook failures | Tiers don't update | Webhook retry + manual admin grant |
| Circular import (PaywallContext) | Build breaks | Bridge pattern (callback registration) |
| Multiple useSubscription mounts | N+1 API calls | Tolerable with HTTP cache, optimize later |
| Elite soft cap surprises power users | Complaints | Log warning, don't hard-block |
| Trial abuse (multi-account) | Lost revenue | Email-based trial check |
| Independent trainers access too much | Data leak | Permission-first model (grant, not deny) |

---

*This plan was recursively developed through 8 rounds of Opus CEO internal planning + 2 Gemini CTO consultations + 14-Brain AI Village validation (11/12 passed, $0.25). Village findings incorporated. APPROVED FOR IMPLEMENTATION.*
