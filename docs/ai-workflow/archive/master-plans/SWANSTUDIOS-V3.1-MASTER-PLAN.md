# 🚀 SWANSTUDIOS V3.1 - MASTER IMPLEMENTATION PLAN

**Version:** 3.1 FINAL (Consolidated AI Village Consensus)
**Created:** 2025-10-29
**Status:** 🟡 PLANNING PHASE - NO CODE UNTIL PHASE 0 APPROVED
**Priority:** CRITICAL - Site is LIVE, zero-rework strategy required

---

## 📋 EXECUTIVE SUMMARY

### **Mission:**
Transform SwanStudios from a personal training tool into an **emotionally intelligent, privacy-first life companion** with unique features that are hard to copy.

### **Current Reality:**
- ✅ **Live production site** with paying customers
- ✅ **Existing features implemented** (Gamification, Admin Diagnostics, Client Dashboard, Trainer Dashboard)
- ⚠️ **Technical debt** (MUI remnants, Sequelize-only, no theme tokens, provider hell in App.tsx)
- ⚠️ **Missing v3.1 vision features** (Stormy, Constellation, Edge Pose, Nutrition, etc.)

### **Strategy:**
**STABILIZE → ENHANCE → EXPAND** (not rebuild)
- **M0 (Weeks 1-2):** Foundation stabilization (MUI elimination, Theme tokens, Prisma bridge)
- **M1-M3 (Weeks 3-8):** Core AI enhancements (Readiness, Stormy MVP, Constellation MVP)
- **M4-M6 (Weeks 9-14):** Advanced features (Edge Pose, Nutrition, Quests)
- **M7-M8 (Weeks 15-16):** Data Rights, Accessibility, Polish

---

## 🎯 WHAT ALL 3 AIS AGREE ON

### **✅ CONSENSUS POINTS:**

1. **DO NOT rebuild from scratch** - Enhance existing dashboards
2. **MUI must be eliminated** - Complete styled-components migration
3. **Prisma migration needed** - But use dual-write bridge, not big-bang
4. **Theme tokens required** - Create `galaxySwanTheme.ts` as single source of truth
5. **Feature flags mandatory** - All new features behind flags for safe rollout
6. **Phase 0 approval gates** - 5 AI approvals before any coding
7. **Live-site safety first** - Canary rollouts, quick rollbacks, no breaking changes
8. **Leverage existing strengths** - Admin Diagnostics, Gamification, UI Kit already built

### **⚠️ DIVERGENCE POINTS (RESOLVED):**

| Topic | Gemini | Roo Code | ChatGPT | **RESOLUTION** |
|-------|--------|----------|---------|----------------|
| **Timeline** | 20-24 weeks | 12 weeks MVP | 12 weeks | **16 weeks** (MVP in 12, polish in 4) |
| **Prisma Migration** | Now | Hybrid | Gradual | **Dual-write bridge** (M0-M2, full cutover M3) |
| **Scope** | Full v3.1 now | MVP first | Phased | **Phased MVP** (core in M0-M3, advanced M4-M8) |
| **Social Features** | Missing core loop | Not priority | Moderate | **Add Community Feed** (M5) |

---

## 📊 COMPREHENSIVE FEATURE AUDIT

### **EXISTING FEATURES (ALREADY IMPLEMENTED) ✅**

#### **Admin Dashboard** (47 components found!)
**Location:** `frontend/src/components/DashBoard/Pages/admin-dashboard/`

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| **Diagnostics & Debug** | `DiagnosticsDashboard.tsx`, `AdminDebugPanel.tsx` | ✅ LIVE | API/DB health, endpoint tester, logs |
| **MCP/AI Monitoring** | `components/AIMonitoringPanel.tsx` | ✅ LIVE | AI usage, cost tracking |
| **Security Monitoring** | `components/SecurityMonitoringPanel.tsx` | ✅ LIVE | Auth attempts, rate limits |
| **System Health** | `components/SystemHealthPanel.tsx` | ✅ LIVE | CPU, memory, DB connections |
| **Content Moderation** | `components/ContentModerationPanel.tsx`, `sections/ContentModerationSection.tsx` | ✅ LIVE | Foundation for Good Vibes |
| **Business Intelligence** | `components/BusinessIntelligenceDashboard.tsx` | ✅ LIVE | Revenue, user analytics |
| **Revenue Analytics** | `components/RevenueAnalyticsPanel.tsx` | ✅ LIVE | Stripe integration, MRR tracking |
| **User Analytics** | `components/UserAnalyticsPanel.tsx` | ✅ LIVE | Signup tracking, retention |
| **Trainer Permissions** | `components/TrainerManagement/TrainerPermissionsManager.tsx` | ✅ LIVE | RBAC already implemented |
| **Orientation Management** | `orientation-dashboard-view.tsx`, `components/OrientationList.tsx` | ✅ LIVE | Onboarding submissions |
| **Notification System** | `components/NotificationTester.tsx`, `sections/NotificationsSection.tsx` | ✅ LIVE | In-app + email notifications |
| **Social Media Command** | `components/SocialMediaCommand/SocialMediaCommandCenter.tsx` | ✅ LIVE | Content management |
| **MCP Servers Management** | `sections/MCPServersSection.tsx` | ✅ LIVE | Workout MCP, Gamification MCP, YOLO MCP |
| **Real-Time Signup Monitoring** | `components/RealTimeSignupMonitoring.tsx` | ✅ LIVE | Live signup funnel |
| **NASM Compliance** | `components/NASMCompliancePanel.tsx` | ✅ LIVE | Training certification tracking |
| **Bulk Moderation** | `components/BulkModerationPanel.tsx` | ✅ LIVE | Batch content actions |
| **Data Verification** | `components/DataVerificationPanel.tsx` | ✅ LIVE | Data integrity checks |
| **Pending Orders** | `components/PendingOrdersAdminPanel.tsx` | ✅ LIVE | Payment processing |
| **Performance Reports** | `components/PerformanceReportsPanel.tsx` | ✅ LIVE | System metrics over time |

**⚠️ MUI ISSUE:** 12 Admin files still import `@mui/*` - **MUST FIX IN M0**

#### **Client Dashboard** (37 components found!)
**Location:** `frontend/src/components/ClientDashboard/`

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| **Revolutionary Dashboard** | `RevolutionaryClientDashboard.tsx` | ✅ LIVE | Main client view |
| **Galaxy Sections** | `GalaxySections.tsx` | ✅ LIVE | **Constellation UI exists!** (line 204) |
| **Gamification** | `sections/GamificationSection.tsx` | ✅ LIVE | XP, badges, quests |
| **My Workouts** | `sections/MyWorkoutsSection.tsx`, `sections/EnhancedMyWorkoutsSection.tsx` | ✅ LIVE | Workout history |
| **Overview** | `sections/EnhancedOverviewSection.tsx` | ✅ LIVE | Dashboard home |
| **Progress Tracking** | `ProgressSection.tsx`, `components/ProgressChart.tsx` | ✅ LIVE | Charts (uses MUI - fix in M0) |
| **Community** | `sections/CommunitySection.tsx` | ✅ LIVE | Social features foundation |
| **Creative Hub** | `sections/CreativeHubSection.tsx` | ✅ LIVE | Content creation |
| **Profile** | `sections/ProfileSection.tsx`, `newLayout/SocialProfileSection.tsx` | ✅ LIVE | User profiles |
| **Messaging** | `MessagesSection.tsx`, `newLayout/EnhancedMessagingSection.tsx` | ✅ LIVE | Trainer-client chat |
| **Settings** | `sections/SettingsSection.tsx` | ✅ LIVE | User preferences |
| **Stellar Sidebar** | `StellarSidebar.tsx` | ✅ LIVE | Galaxy-Swan themed navigation |
| **Time Warp** | `EnhancedTimeWarp.tsx` | ✅ LIVE | Progress timeline visualization |
| **Debug Panel** | `newLayout/DebugPanel.tsx` | ✅ LIVE | Client-side diagnostics |

**Key Finding:** **Constellation UI already exists** in `GalaxySections.tsx` (line 204) and `RevolutionaryClientDashboard.tsx` (line 201) - just needs persistence!

#### **Gamification System** (Already Working!)
**Location:** `frontend/src/components/Gamification/`

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| **Gamification Dashboard** | `GamificationDashboard.tsx` | ✅ LIVE | Main gamification view (line 353 has quest completion) |
| **Gamification Display** | `GamificationDisplay.tsx` | ✅ LIVE | XP, levels, badges |

**Key Finding:** **Quests already implemented** (line 353 of `GamificationDashboard.tsx`)

#### **UI Kit** (11 components - MUI-free!)
**Location:** `frontend/src/components/ui-kit/`

| Component | Status | Notes |
|-----------|--------|-------|
| Typography | ✅ Ready | PageTitle, SectionTitle, BodyText, etc. |
| Buttons | ✅ Ready | Primary, Secondary, Outlined, Danger, Ghost, Icon |
| Inputs | ✅ Ready | StyledInput, TextArea, Select, FormField |
| Cards | ✅ Ready | Card, StatsCard, ActionCard |
| Table | ✅ Ready | Compound component pattern |
| Pagination | ✅ Ready | Full pagination controls |
| Badge | ✅ Ready | Status variants |
| EmptyState | ✅ Ready | Loading states |
| Container | ✅ Ready | Layout containers with executiveTheme |
| Animations | ✅ Ready | shimmer, float, pulse, glow, fadeIn, slideUp |

**Status:** **All UI Kit components exist, just need theme token integration** (M0)

#### **Backend** (Sequelize-based)
**Location:** `backend/`

| Feature | Status | Notes |
|---------|--------|-------|
| **Node + Express** | ✅ LIVE | Main API server |
| **PostgreSQL + Sequelize** | ✅ LIVE | Primary ORM (e.g., `backend/apply-minimal-fix.js` line 1, `backend/database.mjs` line 8) |
| **Row-Level Security (RLS)** | ✅ LIVE | Multi-tenant isolation |
| **Content Moderation API** | ✅ LIVE | `backend/controllers/adminContentModerationController.mjs` (line 19) |
| **MCP Servers** | ✅ LIVE | Workout MCP, Gamification MCP, YOLO MCP (Python) |
| **Stripe Integration** | ✅ LIVE | Payment processing |
| **JWT Auth** | ✅ LIVE | Authentication system |

---

### **V3.1 VISION FEATURES (PLANNED - NOT YET IMPLEMENTED) ❌**

#### **1. Stormy Companion AI** (Emotional Intelligence)
**Status:** ❌ NOT IMPLEMENTED

**What's Missing:**
- `trustLevel` field on User model
- `StormBriefing` model (daily narratives)
- `personalityTraits` JSON field
- `/api/stormy/briefing` endpoint
- "Data card" explainability UI
- Daily briefing generation job

**Why Critical:**
- Core differentiator (unique, hard to copy)
- Drives daily engagement (target: 70% users interact daily)
- Foundation for adaptive training

**MVP Scope (M1):**
- Trust Level tracking (0-100 scale)
- Daily briefing text (no personality evolution yet)
- Simple "Data card" showing data sources
- Manual trigger (no nightly job yet)

---

#### **2. Constellation 2.0** (Visual Progress Journey)
**Status:** ⚠️ PARTIAL (UI exists, no persistence)

**What Exists:**
- ✅ Constellation UI in `GalaxySections.tsx` (line 204)
- ✅ Visual elements in `RevolutionaryClientDashboard.tsx` (line 201)

**What's Missing:**
- ❌ `ConstellationElement` model (workout/PR/badge events)
- ❌ Persistence layer (events stored in DB)
- ❌ Shareable SVG export
- ❌ Animation engine (stars → supernovas → nebulae)
- ❌ `/api/constellation/elements` endpoint

**Why Critical:**
- Emotional engagement (users see visual story of progress)
- Social sharing potential (target: 50% share snapshots)
- Gamification integration (badges → constellation perks)

**MVP Scope (M2):**
- Persist workout/PR/badge events as constellation elements
- Basic x/y/size/color generation
- Static SVG export
- No animations yet (add in M5)

---

#### **3. Edge Pose Coach** (Privacy-First Posture Analysis)
**Status:** ⚠️ PARTIAL (demo exists, not integrated)

**What Exists:**
- ✅ Object detection demo: `frontend/src/components/ObjectDetection/ObjectDetection.component.jsx` (line 1)

**What's Missing:**
- ❌ `PoseSession` model (metrics JSON, optional video)
- ❌ `RepScore` model (per-rep ROM/tempo/depth)
- ❌ MediaPipe/TFLite/WebNN integration
- ❌ On-device inference (metrics only by default)
- ❌ Signed URL service (short TTL for consented video)
- ❌ Trainer ghost-review UI
- ❌ `/api/pose/session` endpoint
- ❌ Rep counter + heatmap visualization

**Why Critical:**
- Signature differentiator (privacy-first, no video by default)
- Injury prevention (ROM/asymmetry detection)
- Form coaching at scale

**MVP Scope (M2):**
- On-device pose detection (metrics only)
- Rep counter (squat, pushup, deadlift)
- ROM/tempo/depth scores
- Trainer ghost-review (approve before client sees)
- Explicit consent for video upload

---

#### **4. Readiness & Recovery** (Safe Auto-Adjust)
**Status:** ⚠️ PARTIAL (HRV UI exists, no compute)

**What Exists:**
- ✅ HRV reference in `AIInsightsPanel.tsx` (line 287)

**What's Missing:**
- ❌ `readiness_score` table
- ❌ Nightly job (compute ACWR, sleep debt, HRV trend)
- ❌ Readiness Dial UI component
- ❌ "Data card" explainability (show why score is X)
- ❌ Safe auto-adjust policy (reduce volume if readiness low)
- ❌ `/api/readiness/score` endpoint

**Why Critical:**
- Injury prevention (catch overtraining early)
- Trust building (show your work on every decision)
- Differentiate from "one size fits all" apps

**MVP Scope (M1):**
- ACWR calculation (acute:chronic workload ratio)
- Sleep debt tracking (self-reported)
- Readiness score (0-100)
- Simple "Data card" UI
- Manual review only (no auto-adjust yet)

---

#### **5. Nutrition Real World** (Pantry/Receipt Scan)
**Status:** ❌ NOT IMPLEMENTED

**What's Missing:**
- ❌ `PantryItem` model (barcode, nutrition JSON, allergens)
- ❌ Barcode scan + OCR service
- ❌ Grocery list generator (store-aware, budget tiers)
- ❌ Allergy guard (flag conflicting items)
- ❌ Blood-type preference (opt-in, low-evidence label)
- ❌ `/api/pantry/scan` endpoint
- ❌ Meal planner integration

**Why Critical:**
- Real-world utility (vs abstract macro tracking)
- Budget-conscious (show cheap protein options)
- Safety (allergy warnings)

**MVP Scope (M3):**
- Barcode scan → nutrition lookup
- Pantry inventory (add/remove items)
- Simple grocery list
- Allergy flagging (user-defined)
- Blood-type preferences marked "low evidence"

---

#### **6. Gamification 2.0** (Quests & World Events)
**Status:** ⚠️ PARTIAL (basic quests exist, no world events)

**What Exists:**
- ✅ Quest completion flow in `GamificationDashboard.tsx` (line 353)

**What's Missing:**
- ❌ `Quest` model (personal/social/world types)
- ❌ `WorldEvent` model (e.g., "1M reps as a community")
- ❌ `QuestParticipant` join table
- ❌ "Uplift" button (positive reinforcement, not "likes")
- ❌ Positivity streak tracking
- ❌ Donation quests (e.g., "10 workouts = $10 to charity")
- ❌ `/api/quests`, `/api/world-events` endpoints

**Why Critical:**
- Community engagement (solo → social)
- Positive culture (uplift economy vs likes)
- Charitable giving (cause-driven motivation)

**MVP Scope (M5):**
- Personal quests (e.g., "Complete 20 workouts")
- World event framework (community goal tracking)
- Uplift button (positive reinforcement)
- Donation quest pilot (1 event to test)

---

#### **7. Good Vibes Enforcement** (AI Moderation + Reframe)
**Status:** ⚠️ PARTIAL (moderation endpoints exist, no reframe)

**What Exists:**
- ✅ Content moderation API: `backend/controllers/adminContentModerationController.mjs` (line 19)
- ✅ Admin moderation panels in Admin Dashboard

**What's Missing:**
- ❌ `CommunityInteraction` model (positivityScore, flagged)
- ❌ AI reframe suggestions (negative → constructive)
- ❌ Positivity streak tracking (consecutive positive interactions)
- ❌ Constellation perks for uplift streaks
- ❌ `/api/community/uplift`, `/api/community/moderate` endpoints
- ❌ Low-latency text moderation service

**Why Critical:**
- Culture tech (not just moderation)
- Retention (positive community = stickiness)
- Brand differentiation (kindness as a feature)

**MVP Scope (M5):**
- Positivity scoring (0-100 per interaction)
- AI reframe suggestions (low-latency)
- Uplift streak tracking
- Simple cosmetic perks (e.g., constellation colors)

---

#### **8. Program Mutation Engine** (Ethical A/B Testing)
**Status:** ❌ NOT IMPLEMENTED

**What's Missing:**
- ❌ `Experiment` model (bandit spec)
- ❌ `ExperimentEnrollment` model (user assignments)
- ❌ Multi-armed bandit service
- ❌ Trainer bounds (safety guardrails)
- ❌ Cohort benchmarking (k-anonymized, opt-out)
- ❌ `/api/experiments/assign`, `/api/experiments/decide` endpoints

**Why Critical:**
- Continuous optimization (vs static programming)
- Ethical personalization (bounded, transparent)
- Competitive edge (data-driven adaptation)

**MVP Scope (M4):**
- Simple A/B tests (1-2 variables max)
- Trainer bounds required (e.g., volume ±20% only)
- Manual review before enrollment
- Opt-out honored immediately

---

#### **9. Trainer Quality Ops** (Shadow QA + Handoff Packs)
**Status:** ❌ NOT IMPLEMENTED

**What's Missing:**
- ❌ `CoachReview` model (QA rubric)
- ❌ `HandoffPack` model (distilled CMP, risks, cues)
- ❌ Shadow mode QA workflow
- ❌ 2 strengths + 1 growth note monthly cadence
- ❌ Auto handoff pack generation

**Why Critical:**
- Quality control at scale
- Trainer development (coaching the coaches)
- Client safety (catch issues before harm)

**MVP Scope (M4):**
- Shadow mode QA (1 review/week per trainer)
- Simple rubric (3 categories: safety, programming, communication)
- Manual handoff packs (no auto-generation yet)

---

#### **10. Life Modes** (Prenatal/Postnatal, Family/Kids, Accessibility)
**Status:** ❌ NOT IMPLEMENTED

**What's Missing:**
- ❌ Prenatal/Postnatal mode toggles
- ❌ Trimester-specific contraindications
- ❌ Pelvic floor exercise library
- ❌ Family/Kids quest types
- ❌ Accessibility features (color-blind safe, voice-first)
- ❌ High contrast mode

**Why Critical:**
- Underserved markets (prenatal fitness is neglected)
- Accessibility compliance (ADA/WCAG)
- Family engagement (kids' fitness quests)

**MVP Scope (M6):**
- Prenatal mode toggle (opt-in)
- Basic contraindications (e.g., no supine after week 20)
- Simple pelvic floor library (5-10 exercises)
- Family quest pilot (1-2 quest types)

---

#### **11. Data Rights & Trust** (Per-Field Consent + Client Data Room)
**Status:** ❌ NOT IMPLEMENTED

**What's Missing:**
- ❌ `ConsentGrant` model (granular scopes: MEDS, INJURIES, POSTURE_PHOTO, VIDEO_COACH, WEARABLE_HRV)
- ❌ Consent Manager UI (per-field toggles)
- ❌ Client Data Room (audit viewer, full export)
- ❌ "Show your work" on Stormy reasoning (data citations)
- ❌ Retention controls (auto-delete after X months)
- ❌ `/api/data-room/export` endpoint
- ❌ GDPR-style data export

**Why Critical:**
- Trust building (transparency = retention)
- Compliance (GDPR, CCPA)
- Competitive edge (few apps offer this level of control)

**MVP Scope (M7):**
- Per-field consent UI (7 scopes)
- Audit viewer (who accessed what, when)
- Full data export (JSON + PDF)
- Simple retention policy (1 year default, configurable)

---

#### **12. Theme API** (Galaxy-Swan Tokens + Theme Validator)
**Status:** ⚠️ PARTIAL (docs exist, no implementation)

**What Exists:**
- ✅ Galaxy-Swan docs: `docs/current/GALAXY-SWAN-THEME-DOCS.md` (line 1)

**What's Missing:**
- ❌ `frontend/src/theme/galaxySwanTheme.ts` (token system)
- ❌ `galaxySwanChartsTheme.ts` (Recharts adapter)
- ❌ Theme Validator (static analyzer)
- ❌ UI Kit refactor to consume tokens
- ❌ V0-to-Figma consistency enforcement
- ❌ `/api/theme/validate` endpoint (optional)

**Why Critical:**
- Brand consistency (no more ad-hoc colors)
- Designer-developer handoff (tokens = source of truth)
- Accessibility (enforced contrast ratios)

**MVP Scope (M0):**
- Create `galaxySwanTheme.ts` with complete token system
- Refactor UI Kit to consume tokens
- Manual Theme Validator checklist
- Recharts theme adapter

---

#### **13. Prisma Migration** (Replace Sequelize)
**Status:** ❌ NOT STARTED (Sequelize is active ORM)

**What Exists:**
- ✅ Sequelize: `backend/database.mjs` (line 8), `backend/apply-minimal-fix.js` (line 1)
- ✅ PostgreSQL (live production DB)

**What's Missing:**
- ❌ `schema.prisma` file
- ❌ Prisma migrations
- ❌ Dual-write bridge (write to both Sequelize + Prisma)
- ❌ Shadow reads (compare Prisma vs Sequelize results)
- ❌ RLS policy enforcement in Prisma

**Why Critical:**
- Type safety (Prisma generates TypeScript types)
- Migration tooling (safer schema changes)
- Query performance (optimized SQL generation)
- Community support (Prisma is actively maintained)

**Migration Strategy (M0-M3):**
1. **M0 (Week 1-2):** Create `schema.prisma` from existing Sequelize models
2. **M1 (Week 3-4):** Dual-write setup (new writes go to both ORMs)
3. **M2 (Week 5-6):** Shadow reads (compare results, log discrepancies)
4. **M3 (Week 7-8):** Full cutover (retire Sequelize)

---

## 🗺️ COMPREHENSIVE WIREFRAME MAP

### **CLIENT DASHBOARD** (Existing + Enhanced)

#### **Existing Screens (DO NOT BREAK):**
1. ✅ **Overview** (`EnhancedOverviewSection.tsx`)
   - Stats cards
   - Recent activity
   - Quick actions
   - **ADD:** Readiness Dial (M1), Stormy Briefing (M1)

2. ✅ **My Workouts** (`EnhancedMyWorkoutsSection.tsx`)
   - Workout history
   - Exercise library
   - **ADD:** Constellation visualization (M2), Edge Pose metrics (M2)

3. ✅ **Progress** (`ProgressSection.tsx`, `ProgressChart.tsx`)
   - Charts (weight, strength, body fat)
   - **FIX:** Replace MUI charts with Recharts (M0)
   - **ADD:** Constellation timeline (M2), Readiness trend (M1)

4. ✅ **Gamification** (`GamificationSection.tsx`)
   - XP, levels, badges
   - Quests
   - **ADD:** World Events (M5), Uplift streaks (M5), Donation quests (M5)

5. ✅ **Community** (`CommunitySection.tsx`)
   - Social feed (basic)
   - **ADD:** Community Feed with Uplift button (M5), Positivity moderation (M5)

6. ✅ **Profile** (`ProfileSection.tsx`, `SocialProfileSection.tsx`)
   - User info
   - **ADD:** Constellation public view (M2), Badge showcase (M5)

7. ✅ **Messages** (`MessagesSection.tsx`, `EnhancedMessagingSection.tsx`)
   - Trainer-client chat
   - **ADD:** AI reframe suggestions (M5)

8. ✅ **Settings** (`SettingsSection.tsx`)
   - Preferences
   - **ADD:** Consent Manager (M7), Life Mode toggles (M6)

#### **New Screens (TO ADD):**
9. ❌ **Stormy Companion** (M1)
   - Daily briefing card
   - Trust Level display
   - "Data card" explainability
   - Personality traits (future)

10. ❌ **Constellation 2.0** (M2)
    - Interactive star map
    - Workout/PR/badge events as stars
    - Technique supernovas (M5)
    - Shareable SVG export

11. ❌ **Edge Pose Coach** (M2)
    - Camera view (opt-in)
    - Real-time rep counter
    - ROM/tempo/depth heatmap
    - 3 form cues per set
    - Trainer ghost-review status

12. ❌ **Readiness Dashboard** (M1)
    - Readiness Dial (0-100 score)
    - ACWR, sleep debt, HRV trend
    - "Data card" explainability
    - Safe auto-adjust recommendations

13. ❌ **Nutrition Real World** (M3)
    - Pantry inventory
    - Barcode/receipt scanner
    - Grocery list generator
    - Budget tier options
    - Allergy guard

14. ❌ **Client Data Room** (M7)
    - Consent Manager (per-field toggles)
    - Audit viewer (access logs)
    - Full data export (JSON + PDF)
    - Retention controls

---

### **TRAINER DASHBOARD** (Existing + Enhanced)

#### **Existing Screens (DO NOT BREAK):**
1. ✅ **Client List**
   - Active clients
   - Search/filter
   - Quick actions
   - **ADD:** Readiness scores (M1), Ghost review queue (M2)

2. ✅ **Trainer Gamification** (`trainer-gamification/`)
   - Award points
   - Award achievements
   - Client gamification stats
   - **ADD:** World Event management (M5), Uplift streak visibility (M5)

3. ✅ **Client Progress** (various admin-client-progress components)
   - Progress charts
   - Goal tracking
   - **ADD:** Constellation view (M2), Readiness trend (M1)

4. ✅ **Sessions** (admin-sessions components)
   - Session scheduling
   - Session history
   - **ADD:** Auto-adjust recommendations (M1)

#### **New Screens (TO ADD):**
5. ❌ **AI Training Lab** (M1) - **NEW MAJOR SECTION**
   - Master Prompt Builder (comprehensive client profile)
   - AI Research Console (query AI Village)
   - Posture Analysis (photo upload + AI insights)
   - Workout Logger (iPad-optimized)
   - Gamification Manager (award XP, create goals)

6. ❌ **Edge Pose Ghost Review** (M2)
   - Client pose session queue
   - Rep-by-rep heatmaps
   - Approve/reject form cues
   - ROM/asymmetry alerts

7. ❌ **Readiness Monitor** (M1)
   - Client readiness scores dashboard
   - ACWR/sleep debt/HRV trends
   - Safe auto-adjust recommendations
   - Override controls

8. ❌ **Mutation Engine** (M4)
   - Active experiments
   - Bandit performance
   - Trainer bounds configuration
   - Client enrollment management

9. ❌ **Shadow QA** (M4)
   - Review queue (1/week)
   - QA rubric (safety, programming, communication)
   - 2 strengths + 1 growth note
   - Handoff pack generator

10. ❌ **Nutrition Coach** (M3)
    - Client pantry overview
    - Meal plan builder
    - Grocery list generator
    - Allergy/preference management

---

### **ADMIN DASHBOARD** (Existing + Enhanced)

#### **Existing Screens (KEEP EVERYTHING):**
1. ✅ **Diagnostics Dashboard** (`DiagnosticsDashboard.tsx`)
   - API/DB health
   - Endpoint tester
   - Purchase flow diagnostics
   - System logs

2. ✅ **AI Monitoring** (`AIMonitoringPanel.tsx`)
   - AI usage tracking
   - Cost monitoring
   - Model performance

3. ✅ **Security Monitoring** (`SecurityMonitoringPanel.tsx`)
   - Auth attempts
   - Rate limits
   - IP blocking

4. ✅ **System Health** (`SystemHealthPanel.tsx`)
   - CPU, memory, DB connections
   - Real-time metrics

5. ✅ **Content Moderation** (`ContentModerationPanel.tsx`, `BulkModerationPanel.tsx`)
   - User-generated content review
   - Bulk actions

6. ✅ **Business Intelligence** (`BusinessIntelligenceDashboard.tsx`)
   - Revenue analytics
   - User analytics
   - Retention metrics

7. ✅ **MCP Servers** (`MCPServersSection.tsx`)
   - Workout MCP status
   - Gamification MCP status
   - YOLO MCP status

8. ✅ **Orientation Management** (`orientation-dashboard-view.tsx`)
   - Orientation submissions
   - Notification tester

9. ✅ **Trainer Management** (`TrainersManagementSection.tsx`, `TrainerPermissionsManager.tsx`)
   - Trainer accounts
   - Permissions (RBAC)

10. ✅ **Real-Time Signup Monitoring** (`RealTimeSignupMonitoring.tsx`)
    - Live signup funnel

11. ✅ **NASM Compliance** (`NASMCompliancePanel.tsx`)
    - Certification tracking

12. ✅ **Social Media Command** (`SocialMediaCommandCenter.tsx`)
    - Content management

#### **New Screens (TO ADD):**
13. ❌ **AI Operations** (M1)
    - Stormy briefing quality metrics
    - Edge Pose model performance
    - Mutation engine results
    - Readiness job status

14. ❌ **Good Vibes Dashboard** (M5)
    - Community positivity scores
    - Uplift streak leaderboard
    - Reframe suggestion quality
    - Moderation queue

15. ❌ **Constellation Analytics** (M2)
    - Constellation sharing metrics
    - Event distribution (workouts, PRs, badges)
    - Social sharing conversion

16. ❌ **Data Rights Compliance** (M7)
    - Consent grant status
    - Data export requests
    - Retention policy enforcement
    - GDPR/CCPA compliance dashboard

17. ❌ **Life Modes Dashboard** (M6)
    - Prenatal/Postnatal user counts
    - Family quest participation
    - Accessibility feature usage

---

## 🎯 ZERO-REWORK REFACTORING ORDER

### **CRITICAL PRINCIPLE:** Each milestone builds ONLY on stable, completed prior milestones.

---

### **M0: FOUNDATION STABILIZATION** (Weeks 1-2)
**Goal:** Fix technical debt, establish stable base for all future work

**NO NEW FEATURES** - Only fixes and infrastructure

#### **Tasks:**
1. **MUI Elimination** (Week 1)
   - Remove ALL `@mui/*` imports (12 Admin files)
   - Refactor to styled-components
   - Test all affected components
   - **Files to fix:**
     - `DiagnosticsDashboard.tsx`
     - `AdminDebugPanel.tsx`
     - `AdminDebugPage.tsx`
     - `orientation-dashboard-view.tsx`
     - `orientation-dashboard-view.V2.tsx`
     - `sections/ClientsManagementSection.tsx`
     - `components/AIMonitoringPanel.tsx`
     - `components/SecurityMonitoringPanel.tsx`
     - `components/TrainerManagement/TrainerPermissionsManager.tsx`
     - `components/NotificationSettingsList.tsx`
     - `components/NotificationTester.tsx`
     - `components/OrientationList.tsx`

2. **Theme Tokens Creation** (Week 1-2)
   - Create `frontend/src/theme/galaxySwanTheme.ts`
   - Complete token system:
     ```typescript
     export const galaxySwanTheme = {
       colors: {
         cosmic: {
           purple: '#8B5CF6',
           cyan: '#06B6D4',
           // ... all colors
         },
         // ... rest of tokens
       },
       gradients: {
         cosmicBg: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',
         // ... all gradients
       },
       // ... typography, spacing, shadows, etc.
     }
     ```
   - Create `frontend/src/theme/galaxySwanChartsTheme.ts` (Recharts adapter)
   - Update UI Kit components to consume tokens
   - Enforce AA/AAA contrast ratios

3. **Prisma Bridge Setup** (Week 2)
   - Create `schema.prisma` from existing Sequelize models
   - Generate initial migration
   - Set up dual-write infrastructure (feature flagged)
   - DO NOT migrate data yet (just setup)

4. **Feature Flag System** (Week 2)
   - Create feature flag service
   - Add flags:
     - `pose_edge` (Edge Pose Coach)
     - `pantry_scan` (Nutrition Real World)
     - `experiments` (Mutation Engine)
     - `prenatal` (Life Modes)
     - `constellation_persist` (Constellation 2.0)
     - `prisma_reads` (Prisma read queries)
     - `prisma_writes` (Prisma write queries)
   - Environment-based overrides (dev/staging/prod)

5. **CI/CD Guardrails** (Week 2)
   - Block `@mui/*` imports (ESLint rule)
   - Enforce theme token usage (no hardcoded colors)
   - Type checks (strict mode)
   - Rollback scripts

#### **Success Criteria:**
- ✅ Zero MUI imports remaining
- ✅ All components use theme tokens
- ✅ Prisma schema matches Sequelize models
- ✅ Feature flags operational
- ✅ CI blocks MUI/hardcoded colors
- ✅ Site remains 100% functional (no regressions)

#### **Phase 0 Approval Required:**
**M0 Foundation Design Packet** - Get 5 AI approvals before proceeding

---

### **M1: READINESS CORE + STORMY MVP** (Weeks 3-4)
**Goal:** Add core AI features that enhance existing workflows

#### **Tasks:**
1. **Database Schema (Prisma)** (Week 3)
   - Add to `schema.prisma`:
     ```prisma
     model User {
       trustLevel     Int?     @default(0)
       personalityTraits Json?
       lastBriefingDate DateTime?
     }

     model StormBriefing {
       id        String   @id @default(uuid())
       userId    String
       content   String   @db.Text
       mood      String
       highlights Json
       createdAt DateTime @default(now())
     }

     model ReadinessScore {
       id         String   @id @default(uuid())
       userId     String
       date       DateTime
       score      Int      // 0-100
       acwr       Float
       sleepDebt  Int      // hours
       hrvTrend   String   // "improving", "stable", "declining"
       factors    Json     // detailed breakdown
       createdAt  DateTime @default(now())
     }
     ```
   - Generate migration (Prisma)
   - Mirror in Sequelize (temporary dual-write)

2. **Readiness Nightly Job** (Week 3)
   - Compute ACWR (acute:chronic workload ratio)
   - Sleep debt (self-reported hours)
   - HRV trend (if wearable connected)
   - Generate readiness score (0-100)
   - Populate `readiness_score` table
   - Schedule: 3 AM daily

3. **Stormy Briefing Service** (Week 3-4)
   - Trust Level calculation logic
   - Daily briefing generation (using AI)
   - "Data card" explainability (cite data sources)
   - Manual trigger endpoint: `POST /api/stormy/briefing`
   - Store in `StormBriefing` table

4. **Frontend Components** (Week 4)
   - **Readiness Dial** (Client Dashboard → Overview)
     - 0-100 score display
     - Color-coded (red/yellow/green)
     - "Data card" button (show ACWR, sleep, HRV)
     - Safe auto-adjust recommendations (manual review only)

   - **Stormy Briefing Card** (Client Dashboard → Overview)
     - Daily narrative text
     - Trust Level indicator (0-100)
     - "Show your work" button (data citations)
     - Simple personality traits (no evolution yet)

5. **API Endpoints** (Week 4)
   ```
   GET  /api/readiness/score/:userId/:date
   POST /api/stormy/briefing (trigger generation)
   GET  /api/stormy/briefing/:userId/latest
   ```

#### **Success Criteria:**
- ✅ Readiness score computed nightly for all active users
- ✅ Stormy briefing generates on demand
- ✅ "Data card" shows explainability
- ✅ UI components render without errors
- ✅ Performance: <2s to load readiness + briefing

#### **Phase 0 Approval Required:**
**M1 Readiness + Stormy Design Packet** - Get 5 AI approvals before coding

---

### **M2: EDGE POSE MVP + CONSTELLATION 2.0 PERSISTENCE** (Weeks 5-6)
**Goal:** Add signature visual features that differentiate SwanStudios

#### **Tasks:**
1. **Database Schema (Prisma)** (Week 5)
   - Add to `schema.prisma`:
     ```prisma
     model PoseSession {
       id              String   @id @default(uuid())
       userId          String
       workoutId       String?
       exercise        String   // "squat", "pushup", etc.
       metrics         Json     // ROM, tempo, depth, asymmetry
       videoUrl        String?  // signed URL (if consented)
       trainerApproved Boolean  @default(false)
       repScores       RepScore[]
       createdAt       DateTime @default(now())
     }

     model RepScore {
       id            String      @id @default(uuid())
       poseSessionId String
       repNumber     Int
       rom           Float       // range of motion (degrees)
       tempo         Float       // seconds
       depth         Float       // squat depth, etc.
       formQuality   Int         // 0-100
       cues          Json        // 3 form cues
       createdAt     DateTime    @default(now())
     }

     model ConstellationElement {
       id        String   @id @default(uuid())
       userId    String
       type      String   // "workout", "pr", "badge", "goal"
       x         Float
       y         Float
       size      Float
       color     String
       metadata  Json     // event details
       createdAt DateTime @default(now())
     }
     ```
   - Generate migration
   - Mirror in Sequelize

2. **Edge Pose Service (Client-Side)** (Week 5)
   - Integrate MediaPipe Pose (or TFLite/WebNN)
   - On-device inference (no server processing)
   - Metrics-only by default (no video upload)
   - Detect squat/pushup/deadlift
   - Calculate ROM, tempo, depth per rep
   - Generate 3 form cues per set
   - Optional: short video with explicit consent (signed URL, 1-hour TTL)

3. **Constellation Persistence** (Week 5-6)
   - Generate constellation elements on:
     - Workout completion → star
     - PR set → supernova (future animation)
     - Badge earned → nebula (future animation)
     - Goal completed → constellation cluster
   - x/y positioning algorithm (spiral outward from center)
   - Size/color based on achievement magnitude
   - Store in `ConstellationElement` table
   - SVG export endpoint: `GET /api/constellation/export/:userId`

4. **Frontend Components** (Week 6)
   - **Pose Session Panel** (Client Dashboard → Workout Detail)
     - Camera view (opt-in)
     - Real-time rep counter
     - ROM/tempo/depth heatmap (post-set)
     - 3 form cues display
     - "Pending trainer review" badge

   - **Constellation Map** (Client Dashboard → Progress)
     - Canvas/SVG rendering
     - Interactive (hover for event details)
     - Shareable SVG export button
     - No animations yet (static for MVP)

   - **Ghost Review Queue** (Trainer Dashboard → Edge Pose)
     - Client pose sessions awaiting review
     - Rep-by-rep heatmaps
     - Approve/reject form cues
     - ROM/asymmetry alerts

5. **API Endpoints** (Week 6)
   ```
   POST /api/pose/session
   POST /api/pose/session/:id/rep (add rep score)
   GET  /api/pose/session/:id/video (signed URL, consented only)
   POST /api/constellation/elements (create event)
   GET  /api/constellation/elements/:userId
   GET  /api/constellation/export/:userId (SVG)
   ```

#### **Success Criteria:**
- ✅ On-device pose detection working for 3 exercises
- ✅ Rep counter accurate (±1 rep)
- ✅ Constellation elements persist and render
- ✅ SVG export downloads correctly
- ✅ Trainer ghost review functional
- ✅ Video consent flow working (opt-in only)

#### **Phase 0 Approval Required:**
**M2 Edge Pose + Constellation Design Packet** - Get 5 AI approvals

---

### **M3: NUTRITION REAL WORLD** (Week 7)
**Goal:** Add practical nutrition features users need daily

#### **Tasks:**
1. **Database Schema (Prisma)** (Week 7)
   - Add to `schema.prisma`:
     ```prisma
     model PantryItem {
       id           String   @id @default(uuid())
       userId       String
       barcode      String?
       name         String
       nutrition    Json     // calories, protein, carbs, fat, etc.
       allergens    String[] // ["dairy", "nuts", etc.]
       quantity     Int
       unit         String   // "servings", "oz", etc.
       addedAt      DateTime @default(now())
     }
     ```

2. **Barcode Scan Service** (Week 7)
   - Client-side barcode scanner (HTML5 Camera API)
   - UPC lookup (vendor API: OpenFoodFacts, Nutritionix, etc.)
   - Cache by UPC (reduce API costs)
   - OCR for receipts (future, not MVP)

3. **Grocery List Generator** (Week 7)
   - Meal plan → ingredient list
   - Budget tier options (low/medium/high)
   - Store-aware (future, not MVP)
   - Allergy guard (flag conflicting items)

4. **Frontend Components** (Week 7)
   - **Pantry Inventory** (Client Dashboard → Nutrition)
     - List of pantry items
     - Add/remove items
     - Barcode scanner button

   - **Grocery List** (Client Dashboard → Nutrition)
     - Generated from meal plan
     - Budget tier selector
     - Check off items as purchased

   - **Allergy Guard** (Client Dashboard → Settings)
     - User-defined allergies
     - Flag items in pantry/grocery list

5. **API Endpoints** (Week 7)
   ```
   POST /api/pantry/scan (barcode → nutrition lookup)
   GET  /api/pantry/:userId
   POST /api/pantry/:userId/item (add item)
   DELETE /api/pantry/:userId/item/:id
   GET  /api/pantry/:userId/grocery-list
   ```

#### **Success Criteria:**
- ✅ Barcode scan working (80%+ accuracy)
- ✅ Pantry inventory functional
- ✅ Grocery list generates from meal plan
- ✅ Allergy warnings display correctly

#### **Phase 0 Approval Required:**
**M3 Nutrition Design Packet** - Get 5 AI approvals

---

### **M4: MUTATION ENGINE + TRAINER QA** (Week 8)
**Goal:** Add ethical personalization and quality control

#### **Tasks:**
1. **Database Schema (Prisma)** (Week 8)
   - Add to `schema.prisma`:
     ```prisma
     model Experiment {
       id          String   @id @default(uuid())
       name        String
       banditSpec  Json     // multi-armed bandit config
       trainerBounds Json   // safety limits
       enrollments ExperimentEnrollment[]
       createdAt   DateTime @default(now())
     }

     model ExperimentEnrollment {
       id           String   @id @default(uuid())
       experimentId String
       userId       String
       armAssigned  String
       optedOut     Boolean  @default(false)
       createdAt    DateTime @default(now())
     }

     model CoachReview {
       id           String   @id @default(uuid())
       trainerId    String
       reviewerId   String   // admin/senior trainer
       rubric       Json     // safety, programming, communication
       strengths    String[] // 2 strengths
       growth       String   // 1 growth area
       createdAt    DateTime @default(now())
     }

     model HandoffPack {
       id           String   @id @default(uuid())
       clientId     String
       fromTrainerId String
       toTrainerId   String?
       cmpSummary    String   @db.Text
       risks         Json
       effectiveCues Json
       createdAt     DateTime @default(now())
     }
     ```

2. **Mutation Engine Service** (Week 8)
   - Simple A/B test (1-2 variables max)
   - Multi-armed bandit (Thompson sampling)
   - Trainer bounds enforcement (e.g., volume ±20% only)
   - Manual review before enrollment
   - Opt-out honored immediately

3. **Shadow QA Workflow** (Week 8)
   - Admin/senior trainer reviews 1 client session/week per trainer
   - QA rubric (3 categories: safety, programming, communication)
   - 2 strengths + 1 growth note
   - Stored in `CoachReview` table

4. **Frontend Components** (Week 8)
   - **Experiment Manager** (Admin Dashboard → AI Operations)
     - Active experiments list
     - Bandit performance charts
     - Trainer bounds configuration
     - Client enrollment management

   - **Shadow QA Queue** (Admin Dashboard → Trainer QA)
     - Trainer review assignments (1/week)
     - QA rubric form
     - 2 strengths + 1 growth input
     - Submit review button

5. **API Endpoints** (Week 8)
   ```
   POST /api/experiments (create experiment)
   POST /api/experiments/:id/assign (enroll user)
   POST /api/experiments/:id/decide (get recommendation)
   POST /api/coach-reviews (submit QA)
   GET  /api/coach-reviews/:trainerId
   ```

#### **Success Criteria:**
- ✅ Experiment enrollment working
- ✅ Bandit recommendations generated
- ✅ Trainer bounds enforced
- ✅ Shadow QA workflow functional
- ✅ Opt-out honored immediately

#### **Phase 0 Approval Required:**
**M4 Mutation + QA Design Packet** - Get 5 AI approvals

---

### **M5: GAMIFICATION 2.0 + GOOD VIBES** (Week 9)
**Goal:** Enhance community engagement with positive culture

#### **Tasks:**
1. **Database Schema (Prisma)** (Week 9)
   - Add to `schema.prisma`:
     ```prisma
     model Quest {
       id           String   @id @default(uuid())
       type         String   // "personal", "social", "world"
       name         String
       description  String
       xpReward     Int
       badgeId      String?
       participants QuestParticipant[]
       createdAt    DateTime @default(now())
     }

     model QuestParticipant {
       id        String   @id @default(uuid())
       questId   String
       userId    String
       progress  Int      @default(0)
       completed Boolean  @default(false)
       createdAt DateTime @default(now())
     }

     model WorldEvent {
       id           String   @id @default(uuid())
       name         String
       description  String
       goal         Int      // e.g., 1M reps as a community
       progress     Int      @default(0)
       donationLink String?
       participants WorldEventParticipant[]
       startsAt     DateTime
       endsAt       DateTime
       createdAt    DateTime @default(now())
     }

     model WorldEventParticipant {
       id           String   @id @default(uuid())
       worldEventId String
       userId       String
       contribution Int      @default(0)
       createdAt    DateTime @default(now())
     }

     model CommunityInteraction {
       id              String   @id @default(uuid())
       userId          String
       targetUserId    String?
       type            String   // "uplift", "comment", "post"
       content         String?  @db.Text
       positivityScore Int      @default(0)
       flagged         Boolean  @default(false)
       moderatorNotes  String?
       createdAt       DateTime @default(now())
     }
     ```

2. **Quest & World Event Service** (Week 9)
   - Personal quest generation (e.g., "Complete 20 workouts")
   - World event tracking (community goal progress)
   - Donation quest pilot (1 event linked to charity)
   - Quest completion logic
   - XP/badge rewards on completion

3. **Good Vibes Service** (Week 9)
   - AI text moderation (low-latency)
   - Positivity scoring (0-100 per interaction)
   - AI reframe suggestions (negative → constructive)
   - Uplift streak tracking (consecutive positive interactions)
   - Constellation perks for uplift streaks (cosmetic)

4. **Frontend Components** (Week 9)
   - **Quest Card** (Client Dashboard → Gamification)
     - Personal quests list
     - Progress bars
     - Completion celebration

   - **World Event Tracker** (Client Dashboard → Gamification)
     - Community goal progress
     - Your contribution
     - Donation link (if applicable)

   - **Uplift Button** (Client Dashboard → Community Feed)
     - Positive reinforcement (not "like")
     - Uplift streak counter
     - Constellation perk indicator

   - **Positivity Moderator** (Admin Dashboard → Good Vibes)
     - Flagged interactions queue
     - Positivity scores
     - Reframe suggestions
     - Approve/reject actions

5. **API Endpoints** (Week 9)
   ```
   GET  /api/quests/:userId
   POST /api/quests/:id/progress (update progress)
   GET  /api/world-events
   POST /api/world-events/:id/contribute
   POST /api/community/uplift (give uplift)
   POST /api/community/moderate (AI moderation)
   GET  /api/community/interactions/:userId (uplift streak)
   ```

#### **Success Criteria:**
- ✅ Personal quests functional
- ✅ World event tracking working
- ✅ Uplift button operational
- ✅ Positivity scoring accurate (manual validation on 100 interactions)
- ✅ Reframe suggestions helpful (trainer feedback)

#### **Phase 0 Approval Required:**
**M5 Gamification 2.0 + Good Vibes Design Packet** - Get 5 AI approvals

---

### **M6: LIFE MODES (PRENATAL/FAMILY)** (Week 10)
**Goal:** Support underserved user segments

#### **Tasks:**
1. **Database Schema (Prisma)** (Week 10)
   - Add to `schema.prisma`:
     ```prisma
     model User {
       lifeModes Json? // { prenatal: true, trimester: 2, familyMode: true }
     }

     model ContraindicationRule {
       id             String   @id @default(uuid())
       lifeMode       String   // "prenatal", "postnatal", "family"
       trimester      Int?     // 1, 2, 3 (prenatal only)
       exercise       String
       contraindicated Boolean
       reason         String
       alternatives   String[]
       createdAt      DateTime @default(now())
     }
     ```

2. **Life Mode Service** (Week 10)
   - Prenatal mode toggle (opt-in)
   - Trimester-specific contraindications
   - Pelvic floor exercise library (5-10 exercises)
   - Family quest generation (kids' fitness)

3. **Frontend Components** (Week 10)
   - **Life Mode Toggles** (Client Dashboard → Settings)
     - Prenatal mode (with trimester selector)
     - Postnatal mode
     - Family mode

   - **Contraindication Alerts** (Client Dashboard → Workouts)
     - Exercise flagged (e.g., "No supine exercises after week 20")
     - Alternative exercises suggested

   - **Pelvic Floor Library** (Client Dashboard → Exercises)
     - 5-10 pelvic floor exercises
     - Trimester-appropriate

   - **Family Quests** (Client Dashboard → Gamification)
     - Kids' fitness challenges
     - Family workout streaks

4. **API Endpoints** (Week 10)
   ```
   POST /api/users/:id/life-mode (toggle mode)
   GET  /api/contraindications/:lifeMode/:trimester
   GET  /api/exercises/pelvic-floor
   GET  /api/quests/family
   ```

#### **Success Criteria:**
- ✅ Prenatal mode toggle working
- ✅ Contraindication alerts display correctly
- ✅ Pelvic floor library accessible
- ✅ Family quests functional

#### **Phase 0 Approval Required:**
**M6 Life Modes Design Packet** - Get 5 AI approvals

---

### **M7: DATA RIGHTS & TRUST** (Week 11)
**Goal:** Build trust through transparency and control

#### **Tasks:**
1. **Database Schema (Prisma)** (Week 11)
   - Add to `schema.prisma`:
     ```prisma
     model ConsentGrant {
       id          String   @id @default(uuid())
       userId      String
       scope       String   // "MEDS", "INJURIES", "POSTURE_PHOTO", "VIDEO_COACH", "WEARABLE_HRV"
       granted     Boolean  @default(false)
       grantedAt   DateTime?
       revokedAt   DateTime?
       createdAt   DateTime @default(now())
     }

     model AuditLog {
       id         String   @id @default(uuid())
       userId     String
       accessorId String   // who accessed
       dataType   String   // "medical", "posture_photo", "video"
       action     String   // "READ", "WRITE", "DELETE"
       createdAt  DateTime @default(now())
     }
     ```

2. **Consent Management Service** (Week 11)
   - Granular consent scopes (7 scopes):
     1. MEDS (medications)
     2. INJURIES (injury history)
     3. POSTURE_PHOTO (posture photos)
     4. VIDEO_COACH (Edge Pose video)
     5. WEARABLE_HRV (wearable data)
     6. NUTRITION (pantry/meal data)
     7. EXPERIMENTS (mutation engine enrollment)
   - Per-field toggles in UI
   - Revoke consent (immediate effect)
   - Audit logging (who accessed what, when)

3. **Client Data Room** (Week 11)
   - Full data export (JSON + PDF)
   - Audit viewer (access logs)
   - Retention controls (1 year default, configurable)
   - GDPR-style data deletion

4. **Frontend Components** (Week 11)
   - **Consent Manager** (Client Dashboard → Settings)
     - 7 consent scope toggles
     - Granted/revoked status
     - Last updated timestamp

   - **Data Room** (Client Dashboard → Settings)
     - "Export My Data" button (JSON + PDF)
     - Audit Log viewer (who accessed what, when)
     - Retention policy display
     - "Delete My Data" button (with confirmation)

   - **"Show Your Work" (Stormy)** (Client Dashboard → Stormy Briefing)
     - Data citations (which data influenced briefing)
     - Reasoning transparency

5. **API Endpoints** (Week 11)
   ```
   POST /api/consent/:userId/:scope (grant/revoke)
   GET  /api/consent/:userId (all consents)
   GET  /api/data-room/export/:userId (JSON + PDF)
   GET  /api/data-room/audit/:userId (access logs)
   DELETE /api/data-room/:userId (GDPR deletion)
   ```

#### **Success Criteria:**
- ✅ Consent toggles functional
- ✅ Consent revocation takes immediate effect
- ✅ Full data export downloads correctly
- ✅ Audit log accurate
- ✅ Data deletion works (with cascading deletes)

#### **Phase 0 Approval Required:**
**M7 Data Rights Design Packet** - Get 5 AI approvals

---

### **M8: POLISH & ACCESSIBILITY** (Weeks 12-13)
**Goal:** Enterprise-grade quality and compliance

#### **Tasks:**
1. **Accessibility Audit** (Week 12)
   - WCAG 2.1 AA compliance
   - Keyboard navigation (all interactive elements)
   - Screen reader support (ARIA labels)
   - Color contrast (AA/AAA ratios)
   - Focus rings (visible on all focusable elements)
   - Alt text (all images, charts)
   - Reduced motion (respect `prefers-reduced-motion`)
   - High contrast mode

2. **Theme Validator** (Week 12)
   - Static analyzer (enforce theme token usage)
   - CI integration (fail builds on violations)
   - Manual checklist (visual QA)
   - V0-to-Figma consistency check

3. **Performance Optimization** (Week 12-13)
   - N+1 query prevention (backend)
   - Lazy loading (non-critical panels)
   - React.memo (heavy components)
   - Image optimization (WebP, lazy loading)
   - Code splitting (routes)
   - Caching strategies (server-side, 2-5 min TTL)

4. **Error Boundaries** (Week 13)
   - Wrap all dashboard routes
   - Loading skeletons
   - User-friendly error messages
   - Rollbar/Sentry integration

5. **Final QA** (Week 13)
   - Manual testing (all features)
   - Regression testing (existing features)
   - Cross-browser testing (Chrome, Firefox, Safari, Edge)
   - Mobile responsiveness (iPad, iPhone, Android)
   - Load testing (100 concurrent users)

#### **Success Criteria:**
- ✅ WCAG 2.1 AA compliant
- ✅ Lighthouse score >90 (performance, accessibility)
- ✅ Zero hardcoded colors
- ✅ No N+1 queries
- ✅ Error boundaries catch all crashes
- ✅ All tests pass (unit, integration, e2e)

#### **Phase 0 Approval Required:**
**M8 Polish & Accessibility Design Packet** - Get 5 AI approvals

---

### **M9: LAUNCH & MONITOR** (Weeks 14-16)
**Goal:** Safe production rollout with monitoring

#### **Tasks:**
1. **Canary Rollout** (Week 14)
   - 5% of users (feature flags)
   - Monitor error rates, performance
   - Gather user feedback
   - Fix critical issues

2. **Gradual Rollout** (Week 15)
   - 50% of users
   - Monitor engagement metrics
   - A/B test messaging/onboarding
   - Iterate on UX

3. **Full Launch** (Week 16)
   - 100% of users
   - Marketing push
   - Monitor support tickets
   - Rapid iteration on feedback

4. **Observability** (Weeks 14-16)
   - Structured logs (trace IDs)
   - RED metrics (Rate, Errors, Duration)
   - Dashboard monitoring (Grafana, DataDog, etc.)
   - Alert thresholds (error rate >1%, latency >2s)

#### **Success Criteria:**
- ✅ <1% error rate
- ✅ <2s p95 latency
- ✅ >70% user engagement (Stormy, Constellation, etc.)
- ✅ Positive user feedback (NPS >50)
- ✅ Zero data breaches

---

## 📚 AI VILLAGE HANDBOOK UPDATES

### **NEW SECTION: SwanStudios Priority Project**

Add to `SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md`:

```markdown
## 🚨 SWANSTUDIOS PRIORITY PROJECT (NOTHING ELSE UNTIL THIS IS DONE)

**Status:** ACTIVE (Week 0 of 16-week plan)
**Approach:** STABILIZE → ENHANCE → EXPAND (no rebuild)
**Current Phase:** M0 Foundation Stabilization

### **Critical Constraints:**
1. ✅ **Site is LIVE** - Zero downtime, no breaking changes
2. ✅ **Paying customers** - Must maintain existing functionality
3. ✅ **Phase 0 approval required** - 5 AI approvals before any coding
4. ✅ **Feature flags mandatory** - All new features behind flags
5. ✅ **Canary rollouts only** - 5% → 50% → 100% gradual release
6. ✅ **Quick rollback capability** - 1-click revert on any issue

### **v3.1 Vision Summary:**
Transform SwanStudios into an **emotionally intelligent, privacy-first life companion** with:
- **Stormy Companion AI** (daily briefings, trust levels)
- **Constellation 2.0** (visual progress journey)
- **Edge Pose Coach** (privacy-first form analysis)
- **Readiness & Recovery** (ACWR, sleep debt, HRV)
- **Nutrition Real World** (pantry scan, grocery lists)
- **Gamification 2.0** (quests, world events, uplift economy)
- **Good Vibes Enforcement** (AI moderation, reframe DM)
- **Program Mutation Engine** (ethical A/B testing)
- **Trainer Quality Ops** (shadow QA, handoff packs)
- **Life Modes** (prenatal/postnatal, family/kids, accessibility)
- **Data Rights & Trust** (per-field consent, client data room)
- **Theme API** (Galaxy-Swan tokens, Theme Validator)
- **Prisma Migration** (replace Sequelize gradually)

### **16-Week Roadmap:**
- **M0 (Weeks 1-2):** Foundation (MUI elimination, Theme tokens, Prisma bridge)
- **M1 (Weeks 3-4):** Readiness + Stormy MVP
- **M2 (Weeks 5-6):** Edge Pose MVP + Constellation 2.0 persistence
- **M3 (Week 7):** Nutrition Real World
- **M4 (Week 8):** Mutation Engine + Trainer QA
- **M5 (Week 9):** Gamification 2.0 + Good Vibes
- **M6 (Week 10):** Life Modes (prenatal/family)
- **M7 (Week 11):** Data Rights & Trust
- **M8 (Weeks 12-13):** Polish & Accessibility
- **M9 (Weeks 14-16):** Launch & Monitor

### **AI Village Roles (v3.1 Specific):**

| AI | Primary Responsibility | v3.1 Focus |
|----|------------------------|------------|
| **Claude Code** | Main Orchestrator | Prisma migration, architecture, Phase 0 approvals |
| **Roo Code (Grok Fast 1)** | Backend Specialist | Prisma schemas, RLS policies, readiness job, mutation engine |
| **Gemini** | Frontend Specialist | Theme tokens, Constellation UI, Charts adapter, accessibility |
| **ChatGPT-5** | QA Engineer | Phase 0 reviews, edge cases, user story validation, testing |
| **Claude Desktop** | Multimodal Analysis | Edge Pose analysis, posture photos, video form review |

### **Current Task (Week 0):**
**Create Phase 0 Design Packet for M0 Foundation**
- MUI elimination plan (12 files)
- Theme tokens specification
- Prisma migration strategy
- Feature flag implementation
- CI/CD guardrails

**Get 5 AI approvals before ANY coding begins.**

---

## ⚠️ NOTHING NEW UNTIL SWANSTUDIOS V3.1 IS COMPLETE ⚠️

**No new projects, no new apps, no greenfield work.**
**All AI resources focused on SwanStudios refactor until Week 16 completion.**
```

---

## 🎯 IMMEDIATE NEXT STEPS (TODAY)

### **Step 1: Get Confirmation on Key Decisions**

**You must answer these before I proceed:**

1. **Scope:** Do you approve the 16-week phased plan? (M0-M9)
   - ✅ YES, proceed with phased plan
   - ❌ NO, adjust timeline/scope (tell me how)

2. **Prisma Migration:** Do you approve the dual-write bridge strategy?
   - ✅ YES, migrate to Prisma gradually (M0-M3)
   - ❌ NO, keep Sequelize for now

3. **Feature Priorities:** Do you approve the milestone order? (M0 → M1 → ... → M9)
   - ✅ YES, this order makes sense
   - ❌ NO, I want to change the order (tell me which features are higher priority)

4. **Live Site Safety:** Do you approve the canary rollout strategy? (5% → 50% → 100%)
   - ✅ YES, gradual rollout with monitoring
   - ❌ NO, different approach (tell me what)

---

### **Step 2: I Will Create Phase 0 Packet for M0 Foundation**

Once you confirm the above, I will immediately create:

**M0 FOUNDATION PHASE 0 DESIGN PACKET**
- Complete MUI elimination plan (12 files, exact changes)
- Theme tokens specification (`galaxySwanTheme.ts` full code)
- Prisma schema (from existing Sequelize models)
- Feature flag system design
- CI/CD guardrail implementation
- Rollback procedures

**This will be a comprehensive document (500+ lines) ready for 5 AI approvals.**

---

### **Step 3: Update AI Village Handbook**

I will add the "SwanStudios Priority Project" section to the handbook with:
- v3.1 vision summary
- 16-week roadmap
- AI role assignments
- Current task (M0 Foundation)
- "Nothing else until this is done" constraint

---

### **Step 4: Begin M0 Implementation (After 5 AI Approvals)**

Once Phase 0 packet gets 5 approvals, Roo Code + Gemini will:
- Remove all MUI imports (12 files)
- Create theme tokens (`galaxySwanTheme.ts`)
- Refactor UI Kit components
- Set up Prisma bridge
- Implement feature flags
- Add CI guardrails

**Target:** M0 complete in 2 weeks (by Week 2)

---

## 💬 YOUR DECISION TIME

**Please confirm:**

1. ✅/❌ Approve 16-week phased plan?
2. ✅/❌ Approve Prisma migration strategy?
3. ✅/❌ Approve milestone order?
4. ✅/❌ Approve canary rollout strategy?

**Then I will immediately:**
- Create M0 Foundation Phase 0 Design Packet
- Update AI Village Handbook
- Get 5 AI approvals
- Begin implementation

**Let's make SwanStudios the best personal training app ever!** 🚀

---

**END OF MASTER PLAN**
**Version:** 3.1 FINAL
**Status:** 🟡 AWAITING YOUR APPROVAL TO PROCEED
**Next Action:** You confirm 4 decisions above → I create M0 Phase 0 packet