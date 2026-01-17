# NASM GROWTH PLAN INTEGRATION ANALYSIS V2.0 (REFACTORED)
**Date:** 2026-01-16
**Purpose:** Compare new brainstorming session against existing SwanStudios plan
**Analyst:** Claude Code (Sonnet 4.5)
**Status:** 🟡 PENDING USER APPROVAL
**Refactor Reason:** User clarified - NO PRICING ON HOMEPAGE, STORE IS SOURCE OF TRUTH

---

## 🚨 CRITICAL USER CORRECTIONS INTEGRATED

### What Changed From V1.0:

**V1.0 MISTAKE:**
- Recommended showing pricing on homepage (PackageSection.V2.tsx)
- Created hybrid pricing grid with 3 tiers visible
- Assumed homepage should anchor pricing

**V2.0 CORRECTION (Per User Feedback):**
- ✅ **NO PRICING ON HOMEPAGE** - Only CTA to /shop
- ✅ **STORE IS SOURCE OF TRUTH** - All pricing lives in /shop
- ✅ **PackageSection.V2.tsx** → Becomes "Programs Overview" (no prices, just outcomes)
- ✅ **Homepage CTA:** "View Packages in Store" (not "Start Your 21-Day Reset")

---

## EXECUTIVE SUMMARY

**COMPATIBILITY SCORE: 90/100** (Upgraded from 85 after removing homepage pricing conflicts)

**Overall Assessment:** HIGH COMPATIBILITY - Brainstorming plan integrates seamlessly when homepage focuses on OUTCOMES instead of PRICING.

**Key Insight:** Your brainstorming packages (21-Day Jumpstart, 12-Week Accelerator, 6-Month, 12-Month) are UPSELL TIERS in the /shop, NOT homepage packages. Homepage should drive traffic to /shop with value props, not sticker shock.

---

## ✅ PART 1: PERFECT SYNERGIES (UNCHANGED FROM V1.0)

### 1.1 NASM Protocol Compliance ✅ ALREADY COMPLETE
*(Same as V1.0 - already implemented in Phase 0.5)*

### 1.2 Fairmont Parent Targeting ✅ ALREADY IN PLAN
*(Same as V1.0 - exact match)*

### 1.3 The "One-Line Model" ✅ MATCHES EXISTING FUNNEL
*(Same as V1.0 - homepage → /shop → onboarding)*

### 1.4 85-Question Questionnaire ✅ ALREADY IMPLEMENTED
*(Same as V1.0 - Phase 1.1 in progress)*

---

## 🔄 PART 2: UPDATES NEEDED (REFACTORED)

### 2.1 HOMEPAGE PRICING SECTION ⚠️ MAJOR REFACTOR REQUIRED

**CURRENT STATE (PackageSection.V2.tsx):**
```tsx
<PackageCard
  title="Express 30"
  price="$110/session"
  features={["30-Min High Intensity", "Metabolic Conditioning"]}
/>
<PackageCard
  title="Signature 60"
  price="$175-200/session"
  features={["60-Min Expert Coaching", "Full Analysis"]}
/>
<PackageCard
  title="Transformation Pack"
  price="$1,600 / 10 sessions"
  features={["10 Sessions", "Save $100", "Priority Scheduling"]}
/>
```

**PROBLEM:**
- Shows hardcoded pricing on homepage
- Violates "store is source of truth" principle
- Pricing drift risk (homepage vs /shop inconsistency)
- Creates sticker shock before value is communicated

**USER DIRECTIVE:**
> "I DO NOT WANT TO HAVE THE PRICES ON THE MAIN PAGE IT SHOULD ONLY BE IN THE STORE SO THAT SECTION MIGHT JUST NEED TO BE A CTA TO GO TO THE STORE"

**REFACTORED SOLUTION:**

**PackageSection.V2.tsx → ProgramsOverview.V3.tsx**

**New Component Purpose:**
- Show OUTCOMES and WHO each program is for
- NO pricing (remove all `price` props)
- Single CTA per card: "View in Store"
- Focus on NASM credibility, results, trust signals

**Refactored Code Structure:**

```tsx
interface ProgramCardProps {
  title: string;
  tagline: string; // "Entry-Level Strategy" → "Built for Busy Schedules"
  outcomes: string[]; // NOT features - OUTCOMES
  whoFor: string; // "Best for: Time-stressed professionals"
  imageSrc: string;
  videoSrc?: string;
  badge?: string;
}

const ProgramCard: React.FC<ProgramCardProps> = ({
  title,
  tagline,
  outcomes, // Changed from features
  whoFor,
  imageSrc,
  badge
}) => {
  return (
    <Card>
      {badge && <Badge>{badge}</Badge>}
      <BackgroundVideo src={imageSrc} />

      <Content>
        <ProgramName>{title}</ProgramName>
        <Tagline>{tagline}</Tagline>

        <WhoFor>{whoFor}</WhoFor>

        <OutcomesList>
          {outcomes.map((outcome, idx) => (
            <OutcomeItem key={idx}>
              <CheckIcon />
              {outcome}
            </OutcomeItem>
          ))}
        </OutcomesList>

        <GlowButton
          text="View in Store"
          onClick={() => navigate('/shop')}
          theme="primary"
          fullWidth
        />
      </Content>
    </Card>
  );
};

const ProgramsOverview: React.FC = () => {
  return (
    <Section id="programs">
      <Container>
        <Header>
          <h2>Choose Your Path</h2>
          <p>
            Start with precision sessions to ignite your journey, or commit to a full transformation
            with our premium performance packages. All programs include NASM-compliant movement screening
            and personalized corrective exercise strategies.
          </p>
        </Header>

        <Grid>
          <ProgramCard
            title="Express Precision"
            tagline="Built for Busy Schedules"
            whoFor="Best for: Time-stressed professionals needing maximum efficiency"
            outcomes={[
              "30-min high-intensity sessions",
              "Metabolic conditioning focus",
              "Mobility + key lifts only",
              "Flexible pay-per-session"
            ]}
            imageSrc="https://images.unsplash.com/photo-1534438327276-14e5300c3a48"
            theme="primary"
          />

          <ProgramCard
            title="Signature Performance"
            tagline="Premium Coaching Experience"
            whoFor="Best for: Serious athletes and goal-driven clients"
            outcomes={[
              "60-min expert biomechanical coaching",
              "Full movement analysis (NASM OHSA)",
              "Strength + hypertrophy programs",
              "Optional AI data tracking upgrade"
            ]}
            imageSrc="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b"
            badge="Most Popular"
            theme="cosmic"
          />

          <ProgramCard
            title="Transformation Program"
            tagline="Commit to Results"
            whoFor="Best for: New clients ready to make lasting lifestyle change"
            outcomes={[
              "Multi-session commitment packages",
              "Comprehensive NASM assessment included",
              "Priority scheduling + quarterly re-screens",
              "Best value for serious commitment"
            ]}
            imageSrc="https://images.unsplash.com/photo-1517836357463-d25dfeac3438"
            badge="Best Value"
            theme="emerald"
          />
        </Grid>

        <CTAFooter>
          <GlowButton
            text="View All Packages & Pricing in Store"
            onClick={() => navigate('/shop')}
            size="large"
            theme="cosmic"
          />
        </CTAFooter>
      </Container>
    </Section>
  );
};
```

**Key Changes:**
1. ❌ **REMOVED:** All `price` props
2. ❌ **REMOVED:** "Standard vs Performance + Data" toggle (pricing-specific)
3. ❌ **REMOVED:** Hardcoded session counts ("10 sessions", "8 sessions")
4. ✅ **ADDED:** `outcomes` (results-focused language)
5. ✅ **ADDED:** `whoFor` (target persona clarity)
6. ✅ **ADDED:** Single CTA footer driving to /shop
7. ✅ **ADDED:** NASM credibility in description

**Benefits:**
- ✅ No pricing drift (store is single source of truth)
- ✅ Reduces cognitive load (3 clear paths, not 7 package options)
- ✅ Communicates value BEFORE price (outcomes → store → pricing)
- ✅ Mobile-friendly (no price comparison paralysis)
- ✅ Trust signals first (NASM, results, who it's for)

---

### 2.2 HERO SECTION CTA ⚠️ REFACTOR REQUIRED

**CURRENT STATE (Hero-Section.tsx):**
```tsx
<GlowButton
  text="View Options"
  onClick={() => navigate('/shop')}
/>
<SecondaryButton text="Get Started" />
```

**GEMINI'S WRONG SUGGESTION:**
```tsx
<GlowButton
  text="Start Your 21-Day Reset" // ❌ WRONG - "21-Day Reset" not real product
  onClick={() => navigate('/shop')}
/>
```

**PROBLEM WITH GEMINI'S APPROACH:**
- "21-Day Reset" is from brainstorming, NOT your actual product names
- Creates broken promise ("Start 21-Day Reset" → arrives at /shop → sees "Express 30, Signature 60, Transformation Pack")
- Introduces inconsistent naming vs store

**USER'S ACTUAL PRODUCTS (FROM CURRENT-TASK.md):**
1. Express 30 ($110/session, 30 minutes)
2. Signature 60 ($175/session standard, $200 with AI Data)
3. Transformation Pack ($1,600 total, 10 sessions, $160/session rate)

**REFACTORED SOLUTION:**

**Hero-Section.tsx CTA:**
```tsx
<CTAGroup>
  <GlowButton
    text="View Packages in Store" // ✅ CLEAR, TRUTHFUL
    onClick={() => navigate('/shop')}
    size="large"
    theme="cosmic"
  />
  <SecondaryButton
    text="Book Free Movement Screen" // ✅ LOW-BARRIER ENTRY
    onClick={() => navigate('/book-screen')} // New landing page from brainstorming
  />
</CTAGroup>
```

**Why This Works:**
- ✅ "View Packages in Store" = truthful (takes them to /shop with real pricing)
- ✅ "Book Free Movement Screen" = low-commitment entry point (from brainstorming plan)
- ✅ Two clear paths: Ready to buy → /shop, Need convincing → /book-screen
- ✅ No invented product names

---

### 2.3 STORE PACKAGE ARCHITECTURE ⚠️ REFACTOR REQUIRED

**CURRENT STORE (/shop) PACKAGES:**
```
┌─────────────────────────────────────────────────┐
│ CURRENT /SHOP PACKAGES (3 TIERS)               │
├─────────────────────────────────────────────────┤
│ 1. Express 30       $110/session (30 min)      │
│ 2. Signature 60     $175/session (60 min)      │
│ 3. Transformation   $1,600 (10 sessions)       │
└─────────────────────────────────────────────────┘
```

**BRAINSTORMING PLAN PACKAGES:**
```
┌─────────────────────────────────────────────────┐
│ BRAINSTORMING PACKAGES (7 TIERS)               │
├─────────────────────────────────────────────────┤
│ 1. Express 30       $110/session (30 min)      │ ← MATCHES CURRENT
│ 2. Signature 60     $175-200/session (60 min)  │ ← MATCHES CURRENT
│ 3. 21-Day Jumpstart $1,400-1,600 (8 sessions)  │ ← NEW
│ 4. Transformation*  $1,600 (10 sessions)       │ ← MATCHES CURRENT
│ 5. 12-Week Accel    $6,300-7,200 (36 sessions) │ ← NEW
│ 6. 6-Month Trans    $9,100-10,400 (52 sessions)│ ← NEW
│ 7. 12-Month Elite   $27,300-31,200 (156 sess)  │ ← NEW
└─────────────────────────────────────────────────┘
```

**CONFLICT:**
- Brainstorming calls 10-session pack "Transformation Pack"
- Brainstorming ALSO has "6-Month Transformation" (52 sessions)
- Same name, different products

**REFACTORED SOLUTION:**

**RENAME FOR CLARITY:**

```
┌──────────────────────────────────────────────────────────────┐
│ UNIFIED /SHOP PACKAGE CATALOG (7 TIERS)                     │
├──────────────────────────────────────────────────────────────┤
│ TIER 1: PAY-PER-SESSION (Visible on /shop front page)       │
│   • Express 30          $110/session (30 min)               │
│   • Signature 60 (Std)  $175/session (60 min)               │
│   • Signature 60 (AI)   $200/session (60 min + data)        │
│                                                              │
│ TIER 2: STARTER PACKAGES (Visible on /shop front page)      │
│   • Jumpstart Pack      $1,600 (10 sessions) ← RENAMED      │
│     - Was "Transformation Pack"                              │
│     - Entry-level commitment                                 │
│     - Best for first-time clients                            │
│                                                              │
│ TIER 3: COMMITMENT PACKAGES (Visible after clicking "View   │
│         Long-Term Options" on /shop)                         │
│   • 21-Day Reset        $1,400 (Std) / $1,600 (AI)         │
│     - 8 sessions in 21 days                                  │
│     - Rapid habit formation                                  │
│                                                              │
│   • 12-Week Accelerator $6,300 (Std) / $7,200 (AI)         │
│     - 36 sessions (3x/week for 12 weeks)                     │
│     - Strength + hypertrophy focus                           │
│                                                              │
│   • 6-Month Program     $9,100 (Std) / $10,400 (AI)        │
│     - 52 sessions (2x/week for 6 months)                     │
│     - Lifestyle transformation                               │
│                                                              │
│   • 12-Month Elite      $27,300 (Std) / $31,200 (AI)       │
│     - 156 sessions (3x/week for 12 months)                   │
│     - Premium long-term commitment                           │
│     - Quarterly re-screens included                          │
└──────────────────────────────────────────────────────────────┘
```

**Key Changes:**
1. ✅ **"Transformation Pack" → "Jumpstart Pack"** (10 sessions, $1,600)
   - Resolves naming conflict
   - Aligns with brainstorming "Jumpstart" language
   - Still entry-level package

2. ✅ **"6-Month Transformation"** becomes **"6-Month Program"**
   - Avoids "Transformation" overlap
   - Clear duration-based naming

3. ✅ **Two-Tier /shop UI:**
   - **Front page:** Express 30, Signature 60, Jumpstart Pack (3 options)
   - **"View Long-Term Options" button:** Reveals 21-Day, 12-Week, 6-Month, 12-Month

**Benefits:**
- ✅ Reduces choice paralysis (3 front-page options, not 7)
- ✅ Upsell path clear (Jumpstart → 21-Day → 12-Week → 6-Month → 12-Month)
- ✅ No naming conflicts
- ✅ Store is single source of truth (all pricing visible only in /shop)

---

### 2.4 "AI DATA PACKAGE" VS "PERFORMANCE + DATA" ⚠️ NAMING CONSOLIDATION

**CURRENT NAMING (CURRENT-TASK.md):**
> "Signature 60 (AI Data Package): $200/session"

**BRAINSTORMING NAMING:**
> "Performance + Data: $200 / 60 min (golf / corrective / analytics emphasis)"

**CONFLICT:**
- Same product, two names
- "AI Data Package" emphasizes tech/tracking
- "Performance + Data" emphasizes outcomes/analytics

**REFACTORED SOLUTION:**

**UNIFIED NAME:** "Signature 60 - AI Performance"

**Reasoning:**
- Combines "AI" (tech credibility) + "Performance" (outcome focus)
- Shortens to "Signature AI" in conversation
- Differentiates from "Signature Standard" ($175)

**Implementation:**

```tsx
// /shop Package Grid
<PackageCard
  title="Signature 60 (Standard)"
  price="$175/session"
  features={[
    "60-min expert coaching",
    "NASM movement analysis",
    "Strength programming",
    "Basic progress tracking"
  ]}
/>

<PackageCard
  title="Signature 60 (AI Performance)" // ✅ UNIFIED NAME
  price="$200/session"
  badge="Recommended for Golf/Corrective"
  features={[
    "Everything in Standard, PLUS:",
    "Golf rotation screen (if applicable)",
    "Advanced analytics dashboard",
    "Wearable data integration",
    "Corrective exercise AI recommendations"
  ]}
/>
```

**User Decision:**
- [ ] Approve "Signature 60 (AI Performance)" as unified name
- [ ] Prefer "Signature 60 (AI Data Package)"
- [ ] Prefer "Signature 60 (Performance + Data)"

---

### 2.5 NAVIGATION LABEL: "STORE" VS "PRICING" ⚠️ GEMINI WAS WRONG

**GEMINI'S SUGGESTION:**
> "Rename 'SwanStudios Store' to 'Pricing' or 'Packages'"

**WHY GEMINI IS WRONG:**
- Your /shop contains MORE than just pricing (could include merch, digital products, boot camp classes)
- "Pricing" is misleading if store expands beyond training packages
- "Store" is accurate and future-proof

**REFACTORED SOLUTION:**

**KEEP "SWANSTUDIOS STORE" IN NAVIGATION**

```tsx
// NavigationLinks.tsx - NO CHANGE FROM CURRENT
<StyledNavLink to="/shop">
  SwanStudios Store
</StyledNavLink>
```

**Alternative (If You Want More Clarity):**
```tsx
<StyledNavLink to="/shop">
  Store <SmallText>(Packages & Pricing)</SmallText>
</StyledNavLink>
```

**User Decision:**
- [ ] Keep "SwanStudios Store" (current)
- [ ] Change to "Store (Packages & Pricing)"
- [ ] Ignore Gemini's "Pricing" suggestion

---

## ➕ PART 3: NEW ADDITIONS (UNCHANGED FROM V1.0)

### 3.1 TIME & SCHEDULE OPTIMIZATION ➕ ADD TO HANDBOOK
*(Same as V1.0 - sustainable schedule template)*

### 3.2 "NOT SALESY" SCRIPTS ➕ ADD TO PHASE 5
*(Same as V1.0 - Fairmont parent scripts)*

### 3.3 FILMING WORKFLOW ➕ ADD TO CONTENT STRATEGY
*(Same as V1.0 - batch filming, equipment checklist)*

### 3.4 RULES ENGINE (AI-POWERED OFFER LOGIC) ➕ ADD TO PHASE 1.3
*(Same as V1.0 - NASM score → package recommendation)*

---

## ⚠️ PART 4: CONFLICTS REQUIRING DECISION (REFACTORED)

### 4.1 "TRANSFORMATION PACK" RENAME ⚠️ CRITICAL

**RECOMMENDED CHANGE:**
- Current: "Transformation Pack" (10 sessions, $1,600)
- New: "Jumpstart Pack" (10 sessions, $1,600)

**Reasoning:**
- Frees "Transformation" name for longer programs (6-month, 12-month)
- Aligns with brainstorming "21-Day Jumpstart" language
- Reduces naming confusion

**User Decision Required:**
- [ ] **Option 1: Rename to "Jumpstart Pack"** (RECOMMENDED)
- [ ] **Option 2: Keep "Transformation Pack"** (current)
- [ ] **Option 3: Rename to "Starter Pack"** (generic)

---

### 4.2 EXPRESS 30 POSITIONING ⚠️ FRONT PAGE VS HIDDEN

**CURRENT STATE:**
- Express 30 is front-and-center on /shop pricing grid (left card)

**BRAINSTORMING SUGGESTION:**
> "30-Minute Sessions (hidden fallback, not your main menu). Only reveal if they say time/budget is the blocker."

**REFACTORED OPTIONS:**

**Option A: Keep Visible (Current Approach)**
- Pros: Low-barrier entry, captures price-sensitive leads
- Cons: Anchors pricing at $110 (lowest)

**Option B: Hide on /shop Front Page, Show on "View All Options"**
- /shop front page shows: Signature 60 (Standard), Signature 60 (AI), Jumpstart Pack
- "Express 30 also available" link at bottom → expands to show Express 30
- Pros: Anchors pricing higher ($175), still accessible
- Cons: May miss time-sensitive leads

**Option C: Show on Exit Intent Only**
- Hide from /shop grid
- Exit-intent popup: "Looking for shorter sessions? Try Express 30 (30-min) for $110"
- Pros: Anchors high, captures abandoning visitors
- Cons: Most complex to implement

**User Decision Required:**
- [ ] **Option A: Keep visible** (current)
- [ ] **Option B: Hide on front page, show on "View All"**
- [ ] **Option C: Exit intent popup only**

---

### 4.3 CONTENT MARKETING PRIORITY ⚠️ PHASE 6 VS IMMEDIATE

**BRAINSTORMING PLAN INCLUDES:**
- YouTube comeback series (transformation story)
- Instagram daily reels (15-30 sec demos)
- Nextdoor community engagement (3 posts/week + 5-10 comments/day)
- Filming workflow (batch filming 2x/week)

**EXISTING PLAN:**
- ❌ No content strategy documented
- ✅ Social media infrastructure exists (EnhancedSocialPosts component)

**REFACTORED OPTIONS:**

**Option A: Phase 6 (Post-Launch) - RECOMMENDED**
- Focus on Phase 0-5 first (platform functionality)
- Add content marketing AFTER first clients onboarded
- Prevents scope creep, ensures revenue first

**Option B: Immediate (Parallel Track)**
- Implement content strategy NOW alongside Phase 1-5
- Start filming this week
- Risk: Delays Phase 0-5 completion

**Option C: Skip (Digital Platform Only)**
- No YouTube/Instagram/Nextdoor strategy
- Pure digital platform focus

**User Decision Required:**
- [ ] **Option A: Phase 6 (Post-Launch)** - Focus on platform first
- [ ] **Option B: Immediate (Parallel)** - Start filming now
- [ ] **Option C: Skip** - Digital platform only

---

### 4.4 LOCAL LEAD GEN LANDING PAGE ⚠️ BUILD `/book-screen` OR NOT

**BRAINSTORMING PLAN ASSUMES:**
- In-person Fairmont parent conversations → "Here's the link to book a screen"
- Sycamore Park free classes → "DM me for screen booking"
- Golf performance clients → "Let's schedule a rotation screen"

**NEED:** Landing page to capture these warm leads

**REFACTORED OPTIONS:**

**Option A: Build `/book-screen` Landing Page (RECOMMENDED)**

**Features:**
- Simple calendar interface (select date/time)
- Capture: Name, Email, Phone, Pain Points
- Auto-send SMS confirmation (Twilio)
- Triggers POST /api/onboarding/:userId/movement-screen (admin can fill out later)

**Wireframe:**
```
┌─────────────────────────────────────────────┐
│ Book Your Free 10-Min Movement Screen       │
│                                              │
│ We'll identify your #1 movement limitation  │
│ and show you the fastest path to fix it.    │
│                                              │
│ [Calendar Widget - Select Date/Time]        │
│                                              │
│ Your Info:                                   │
│ Name:     [________________]                 │
│ Email:    [________________]                 │
│ Phone:    [________________]                 │
│                                              │
│ What's bothering you most?                   │
│ [ ] Knee pain                                │
│ [ ] Back pain                                │
│ [ ] Shoulder stiffness                       │
│ [ ] Low energy                               │
│ [ ] Golf performance                         │
│ [ ] Other: [____________]                    │
│                                              │
│ [Confirm Booking]                            │
└─────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Captures warm leads from Fairmont/Park/Golf
- ✅ Reduces friction (no phone tag)
- ✅ Auto-populates admin dashboard (pending screen appointments)
- ✅ SMS confirmation builds trust

**Option B: Manual Booking (No Landing Page)**
- Fairmont/Park leads text you directly
- You manually add to calendar
- No tech implementation needed

**Option C: Redirect to /shop**
- In-person leads → "Go to swanstudios.com/shop"
- Risk: Warm leads hit pricing page (cold conversion)

**User Decision Required:**
- [ ] **Option A: Build `/book-screen`** landing page
- [ ] **Option B: Manual booking** (text/call only)
- [ ] **Option C: Redirect to /shop**

---

## ❌ PART 5: REMOVALS (UNCHANGED FROM V1.0)

**NO REMOVALS IDENTIFIED** ✅

All existing plan elements remain valid. Brainstorming adds sales/marketing strategy to complement existing tech infrastructure.

---

## 📋 PART 6: INTEGRATION ROADMAP (REFACTORED)

### Phase 0: Immediate Updates (2 hours)

**File Updates:**
- [ ] **Refactor PackageSection.V2.tsx → ProgramsOverview.V3.tsx**
  - Remove all `price` props
  - Change `features` → `outcomes`
  - Add `whoFor` persona clarity
  - Single CTA: "View in Store"

- [ ] **Update Hero-Section.tsx CTA**
  - Change "View Options" → "View Packages in Store"
  - Add secondary CTA: "Book Free Movement Screen" (if `/book-screen` approved)

- [ ] **Update CURRENT-TASK.md Pricing Table**
  - Rename "Transformation Pack" → "Jumpstart Pack" (if approved)
  - Add 4 commitment packages (21-Day, 12-Week, 6-Month, 12-Month) as "Admin Tier"

- [ ] **Update AI Village Handbook Section 9.8**
  - Document "Store is source of truth" principle
  - Remove homepage pricing references
  - Add "Programs Overview" section (outcomes, not prices)

- [ ] **Create NASM-GROWTH-PLAN-INTEGRATION-ANALYSIS-V2.md** (THIS FILE)

---

### Phase 1: /shop Store Architecture (4 hours)

**Tasks:**
- [ ] **Decide: Package Naming**
  - "Transformation Pack" → "Jumpstart Pack"?
  - "6-Month Transformation" → "6-Month Program"?

- [ ] **Decide: Express 30 Positioning**
  - Visible on front page vs "View All Options" vs Exit intent?

- [ ] **Implement Two-Tier /shop UI**
  - **Front Page (3 packages):**
    - Signature 60 (Standard) - $175/session
    - Signature 60 (AI Performance) - $200/session
    - Jumpstart Pack - $1,600 (10 sessions)

  - **"View Long-Term Options" Button Reveals:**
    - 21-Day Reset - $1,400 (Std) / $1,600 (AI)
    - 12-Week Accelerator - $6,300 (Std) / $7,200 (AI)
    - 6-Month Program - $9,100 (Std) / $10,400 (AI)
    - 12-Month Elite - $27,300 (Std) / $31,200 (AI)

- [ ] **Add Package Variant Toggle (if needed)**
  - "Standard" vs "AI Performance" switch per package
  - Shows price difference + feature comparison

---

### Phase 2: Local Lead Gen Integration (3 hours)

**Tasks (IF `/book-screen` APPROVED):**
- [ ] **Create `/book-screen` Landing Page**
  - Calendar widget (select date/time)
  - Form: Name, Email, Phone, Pain Points
  - SMS confirmation (Twilio)
  - POST /api/screens/book endpoint

- [ ] **Update Fairmont/Park Scripts**
  - Add: "Go to swanstudios.com/book-screen to reserve your spot"
  - SMS follow-up template with booking link

- [ ] **Create FAIRMONT-PARENT-SCRIPTS.md**
  - In-person conversation templates
  - Text message follow-ups
  - 10-min screen close script

---

### Phase 3: Content Strategy (5 hours)

**Tasks (IF PHASE 6 APPROVED):**
- [ ] **Create Section 9.9: Content Marketing Strategy**
  - YouTube filming workflow
  - Instagram reel templates
  - Nextdoor engagement protocol

- [ ] **Create Section 9.9.1: Trainer Work-Life Balance**
  - Mon/Wed/Fri: Move work + paid sessions
  - Tue/Thu/Sat: Park class + screens + paid session

- [ ] **Create Section 9.9.2: Filming Workflow**
  - Always-on kit (iPhone, tripod)
  - Batch filming schedule (2x/week, 10-15 clips)
  - Audio workaround (until DJI mic)

- [ ] **Define Phase 6: Content Engine**
  - Phase 6.1: YouTube channel setup + first 5 videos
  - Phase 6.2: Instagram automation (weekly reel schedule)
  - Phase 6.3: Nextdoor automation (post templates)

---

### Phase 4: Automation Enhancements (4 hours)

**Tasks:**
- [ ] **Add Phase 1.3: Package Recommendation Engine**
  - GET /api/packages/recommend/:userId
  - Logic: NASM score → recommended package

- [ ] **Update Phase 4 Day 0-7 SMS Sequences**
  - Add brainstorming script copy (specific language)
  - Day 0: Welcome + pricing sheet link
  - Day 7: Transformation Pack offer (if not purchased)

- [ ] **Create Rules Engine Logic**
  - IF NASM < 60 → Recommend "21-Day Reset" (corrective focus)
  - IF commitmentLevel = 'high' + primaryGoal = 'weight_loss' → Recommend "12-Week Accelerator"
  - IF commitmentLevel = 'very_high' → Recommend "12-Month Elite"
  - DEFAULT → Recommend "Jumpstart Pack"

---

### Phase 5: Ethics & Dual Employment (1 hour)

**Tasks:**
- [ ] **Create Section 9.10: Dual Employment Ethics Protocol**
  - Move-assigned clients: Stay in Move's process
  - Self-sourced clients: SwanStudios private clients
  - Training location rules: Home/Park/Client's gym (NOT Move gym without permission)

- [ ] **Document Client Source Tracking**
  - Database field: `clientSource` (Move, Fairmont, Park, Golf, YouTube, IG, Nextdoor, Direct)
  - Admin dashboard filter: "Show only SwanStudios clients" vs "Show only Move clients"

---

## 🎯 CRITICAL DECISIONS REQUIRED (REFACTORED)

### Decision 1: Package Renaming ⚠️ BLOCKING

**Question:** Should we rename "Transformation Pack" to avoid conflict with "6-Month Transformation"?

**Options:**
- [ ] **Option 1: Rename to "Jumpstart Pack"** (10 sessions, $1,600)
  - Aligns with brainstorming "21-Day Jumpstart" language
  - Frees "Transformation" for longer programs

- [ ] **Option 2: Keep "Transformation Pack"** (10 sessions, $1,600)
  - No code changes needed
  - Ignore brainstorming "6-Month Transformation" naming

- [ ] **Option 3: Rename to "Starter Pack"** (10 sessions, $1,600)
  - Generic, clear entry-level positioning

**Impact:** Affects /shop UI, PackageSection code, database Package model

---

### Decision 2: Express 30 Positioning ⚠️ PRICING ANCHOR

**Question:** Should Express 30 be visible on /shop front page or hidden?

**Options:**
- [ ] **Option A: Keep visible** (current approach)
  - Shows Express 30 on /shop front page
  - Low-barrier entry point

- [ ] **Option B: Hide on front, show on "View All"**
  - Front page: Signature 60 (Std), Signature 60 (AI), Jumpstart Pack
  - "Express 30 also available" link expands to show it
  - Anchors pricing higher

- [ ] **Option C: Exit intent popup only**
  - Hidden from /shop entirely
  - Only appears when user attempts to leave page

**Impact:** Affects pricing perception, conversion rate, lead capture

---

### Decision 3: Content Marketing Timing ⚠️ NON-BLOCKING

**Question:** When should we implement YouTube/Instagram/Nextdoor strategy?

**Options:**
- [ ] **Option A: Phase 6 (Post-Launch)** - RECOMMENDED
  - Focus on Phase 0-5 first (platform functionality)
  - Add content AFTER first clients onboarded

- [ ] **Option B: Immediate (Parallel Track)**
  - Implement content strategy NOW
  - Start filming this week

- [ ] **Option C: Skip**
  - No content marketing
  - Pure digital platform focus

**Impact:** Determines if we add Section 9.9 + Phase 6 to roadmap

---

### Decision 4: Local Lead Gen Landing Page ⚠️ NON-BLOCKING

**Question:** Should we build `/book-screen` landing page?

**Options:**
- [ ] **Option A: Build `/book-screen`** landing page
  - Calendar widget + form capture
  - SMS confirmation
  - Auto-populates admin dashboard

- [ ] **Option B: Manual booking**
  - Text/call only (no tech)

- [ ] **Option C: Redirect to /shop**
  - In-person leads hit pricing page

**Impact:** Determines if we create wireframes for `/book-screen` in Phase 1.4

---

## 📊 INTEGRATION SUMMARY (REFACTORED)

### ✅ What Stays (Existing Plan Elements)
- Phase 0-5 roadmap (Database → Launch)
- NASM protocol implementation (PAR-Q+ + OHSA)
- 85-question questionnaire system
- Fairmont parent targeting
- RevolutionaryClientDashboard
- Admin data entry UIs (Phase 1.2)
- Automation sequences (Phase 4)
- UX/UI Design Protocol
- AI Village structure (6 AIs, coordination)
- **Store is source of truth for pricing** ✅ NEW EMPHASIS

### ➕ What Gets Added (Brainstorming Contributions)
- **ProgramsOverview.V3.tsx** (no pricing, outcomes-focused)
- **Two-tier /shop UI** (3 front-page packages + 4 long-term options)
- **"Not Salesy" scripts** (Fairmont, Park, Golf)
- **Content marketing strategy** (YouTube, IG, Nextdoor)
- **Filming workflow** (batch filming, equipment)
- **Trainer work-life balance protocol** (sustainable schedule)
- **Package recommendation engine** (NASM score → offer logic)
- **Dual employment ethics** (Move vs SwanStudios separation)
- **`/book-screen` landing page** (if approved)

### 🔄 What Gets Updated (Merged Elements)
- **PackageSection.V2.tsx → ProgramsOverview.V3.tsx** (remove prices)
- **Hero-Section.tsx CTA** ("View Packages in Store")
- **"Transformation Pack" → "Jumpstart Pack"** (if approved)
- **"AI Data Package" → "AI Performance"** (unified naming)
- **Phase 4 SMS sequences** (add brainstorming script copy)
- **Phase 5 client materials** (Fairmont parent scripts)

### ⚠️ What Needs Decision (Conflicts)
- Package renaming ("Transformation" → "Jumpstart"?)
- Express 30 positioning (visible vs hidden?)
- Content marketing timing (Phase 6 vs Immediate vs Skip?)
- Local lead gen approach (Build `/book-screen` vs Manual vs Redirect?)

---

## 🚀 NEXT STEPS (AFTER USER APPROVAL)

**Once you approve the 4 decisions above:**

1. **Refactor Homepage (2 hours):**
   - PackageSection.V2.tsx → ProgramsOverview.V3.tsx
   - Remove all prices
   - Add outcomes, whoFor personas
   - Single CTA: "View in Store"

2. **Update /shop Store (4 hours):**
   - Implement two-tier UI (3 front + 4 long-term)
   - Rename packages (if approved)
   - Add "Standard vs AI Performance" variant toggle

3. **Update Documentation (2 hours):**
   - AI Village Handbook (add Sections 9.9, 9.9.1, 9.9.2, 9.10)
   - CURRENT-TASK.md (updated pricing table, Phase 6)
   - Create FAIRMONT-PARENT-SCRIPTS.md

4. **Build `/book-screen` (if approved) (3 hours):**
   - Landing page wireframe
   - Calendar widget integration
   - Form capture + SMS confirmation
   - POST /api/screens/book endpoint

---

## 📝 APPROVAL CHECKLIST (REFACTORED)

**Please review this refactored analysis and provide approval for:**

- [ ] **DECISION 1: PACKAGE RENAMING** (Jumpstart / Keep Transformation / Starter)
- [ ] **DECISION 2: EXPRESS 30 POSITIONING** (Visible / Hidden Front / Exit Intent)
- [ ] **DECISION 3: CONTENT MARKETING TIMING** (Phase 6 / Immediate / Skip)
- [ ] **DECISION 4: LOCAL LEAD GEN** (Build `/book-screen` / Manual / Redirect)
- [ ] **APPROVE HOMEPAGE REFACTOR** (ProgramsOverview.V3.tsx with NO pricing)
- [ ] **APPROVE /SHOP TWO-TIER UI** (3 front + 4 long-term packages)
- [ ] **APPROVE ALL NEW SECTIONS** (9.9, 9.9.1, 9.9.2, 9.10)
- [ ] **CONFIRM: Store is source of truth for pricing** ✅

**Once approved, I will:**
1. Refactor PackageSection.V2.tsx → ProgramsOverview.V3.tsx (remove all pricing)
2. Update Hero-Section.tsx CTA ("View Packages in Store")
3. Update AI Village Handbook with new sections
4. Update CURRENT-TASK.md with merged pricing + Phase 6
5. Create implementation prompts for approved features

---

**KEY DIFFERENCE FROM V1.0:**
✅ **V2.0 respects "Store is source of truth"** - NO pricing on homepage
✅ **V2.0 uses REAL product names** - Express 30, Signature 60, Jumpstart Pack (not invented tiers)
✅ **V2.0 focuses on OUTCOMES** - Homepage drives to /shop with value props, not sticker shock

---

**END OF REFACTORED INTEGRATION ANALYSIS V2.0**
