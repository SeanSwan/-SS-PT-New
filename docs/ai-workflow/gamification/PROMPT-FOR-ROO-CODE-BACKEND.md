# 🚀 ROO CODE: GAMIFICATION BACKEND IMPLEMENTATION PROMPT

## 🎯 Your Mission (1 Week Sprint)

Build the **complete backend infrastructure** for SwanStudios gamification system. You're responsible for the technical foundation while MinMax v2 handles the strategic UX layer in parallel.

**Your Focus**: Speed + Robustness + Security
**Timeline**: 1 week (7 days)
**Tech Stack**: Node.js, PostgreSQL, TypeScript, MCP (Model Context Protocol)

---

## 📋 Context: What You're Building

SwanStudios needs a **world-class gamification backend** that:
1. **Tracks XP & Levels** (user progression system)
2. **Manages Points Economy** (1 point = $0.001, sustainable economics)
3. **Powers Referral System** (viral growth with 5-tier milestones)
4. **Stores Achievements** (custom badge uploads from Midjourney)
5. **Handles Challenges** (extensible JSON-driven system)
6. **Computes Leaderboards** (cached rankings with Redis)
7. **Manages Battle Pass** (seasonal progression system)
8. **Processes Point Purchases** (two-phase commit for shop integration)

**Critical Requirements**:
- ✅ **Idempotency**: Prevent duplicate point claims
- ✅ **Security**: Server-side validation, rate limiting, anti-fraud
- ✅ **Double-Entry Ledger**: Audit trail for every point transaction
- ✅ **Two-Phase Commit**: Safe point purchases with rollback
- ✅ **Future-Proof**: Easy to add new challenges/badges without code changes

---

## 🗄️ DATABASE SCHEMA (11 Tables)

### **1. gamification_profiles** (User Stats & Privacy)

```sql
CREATE TABLE gamification_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- XP System (Leveling - NOT spendable)
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 100),
  current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
  total_lifetime_xp BIGINT NOT NULL DEFAULT 0 CHECK (total_lifetime_xp >= 0),

  -- Streak System (Burnout Prevention)
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_activity_date DATE,
  streak_freezes_available INTEGER NOT NULL DEFAULT 0 CHECK (streak_freezes_available >= 0),

  -- Rest Days (Wellness Feature)
  rest_days_this_week INTEGER NOT NULL DEFAULT 0 CHECK (rest_days_this_week BETWEEN 0 AND 2),
  scheduled_rest_days JSONB DEFAULT '[]', -- ['2025-11-03', '2025-11-05']

  -- Privacy Settings (GDPR Compliant)
  leaderboard_visibility VARCHAR(20) NOT NULL DEFAULT 'friends_only'
    CHECK (leaderboard_visibility IN ('public', 'friends_only', 'private')),
  display_name_type VARCHAR(20) NOT NULL DEFAULT 'username'
    CHECK (display_name_type IN ('real_name', 'username', 'anonymous')),
  show_on_global_leaderboard BOOLEAN NOT NULL DEFAULT FALSE,
  show_on_friends_leaderboard BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_gym_leaderboard BOOLEAN NOT NULL DEFAULT TRUE,

  -- Metadata
  timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ftue_stage INTEGER NOT NULL DEFAULT 1 CHECK (ftue_stage BETWEEN 1 AND 4),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_gamification_level ON gamification_profiles(level DESC);
CREATE INDEX idx_gamification_lifetime_xp ON gamification_profiles(total_lifetime_xp DESC);
CREATE INDEX idx_gamification_streak ON gamification_profiles(current_streak DESC);
CREATE INDEX idx_gamification_last_activity ON gamification_profiles(last_activity_date DESC);
CREATE INDEX idx_gamification_privacy ON gamification_profiles(show_on_global_leaderboard)
  WHERE show_on_global_leaderboard = TRUE;
```

---

### **2. point_transactions** (Double-Entry Ledger - CRITICAL)

```sql
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction Details
  amount INTEGER NOT NULL, -- Positive = earn, Negative = spend
  balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),

  -- Classification
  transaction_type VARCHAR(20) NOT NULL
    CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'refund', 'admin_adjustment', 'referral_reward')),
  source VARCHAR(50) NOT NULL
    CHECK (source IN ('level_up', 'achievement', 'battle_pass', 'referral', 'challenge', 'purchase', 'admin', 'weekly_milestone', 'event')),

  -- References
  reference_id UUID, -- ID of challenge, achievement, order, etc.
  reference_type VARCHAR(50), -- 'challenge', 'achievement', 'order', 'referral'

  -- Metadata (Flexible JSONB)
  metadata JSONB,
  description TEXT,

  -- Idempotency & Audit (CRITICAL FOR SECURITY)
  idempotency_key VARCHAR(100) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Invariant: Balance integrity
  CONSTRAINT valid_balance_change CHECK (balance_after = balance_before + amount)
);

-- Performance Indexes
CREATE INDEX idx_point_transactions_user ON point_transactions(user_id, created_at DESC);
CREATE INDEX idx_point_transactions_type ON point_transactions(transaction_type, created_at DESC);
CREATE INDEX idx_point_transactions_idempotency ON point_transactions(idempotency_key);
CREATE INDEX idx_point_transactions_reference ON point_transactions(reference_type, reference_id);

-- Function: Get Current Point Balance (Derived from Ledger)
CREATE OR REPLACE FUNCTION get_user_point_balance(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM point_transactions
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Function: Validate Ledger Integrity (Run nightly as cron job)
CREATE OR REPLACE FUNCTION validate_ledger_integrity()
RETURNS TABLE(user_id UUID, expected_balance INTEGER, actual_balance INTEGER) AS $$
  SELECT
    pt.user_id,
    SUM(pt.amount)::INTEGER as expected_balance,
    (SELECT balance_after FROM point_transactions
     WHERE user_id = pt.user_id
     ORDER BY created_at DESC LIMIT 1) as actual_balance
  FROM point_transactions pt
  GROUP BY pt.user_id
  HAVING SUM(pt.amount) != (
    SELECT balance_after FROM point_transactions
    WHERE user_id = pt.user_id
    ORDER BY created_at DESC LIMIT 1
  );
$$ LANGUAGE SQL;
```

---

### **3. challenges** (Extensible JSON-Driven System)

```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Challenge Definition
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL
    CHECK (category IN ('workout', 'nutrition', 'social', 'streak', 'referral', 'special_event')),

  -- Difficulty & Rewards
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'legendary')),
  xp_reward INTEGER NOT NULL CHECK (xp_reward >= 0),
  point_reward INTEGER NOT NULL DEFAULT 0 CHECK (point_reward >= 0),

  -- Recurrence
  recurrence_type VARCHAR(20) NOT NULL
    CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'one_time', 'event')),
  reset_time TIME DEFAULT '00:00:00',

  -- Unlock Criteria
  min_level INTEGER DEFAULT 1,
  required_achievement_id UUID REFERENCES achievements(id),

  -- Completion Criteria (FUTURE-PROOF JSON)
  completion_criteria JSONB NOT NULL,
  /* Examples:
    Daily Cardio: {"type": "workout_duration", "target": 30, "unit": "minutes", "workout_type": "cardio"}
    Meal Logger: {"type": "log_meals", "target": 3}
    Referral King: {"type": "refer_users", "target": 1}
    Streak Master: {"type": "maintain_streak", "target": 7}
    Hydration Hero: {"type": "water_intake", "target": 8, "unit": "glasses"}
  */

  -- Server Validation
  server_validation_required BOOLEAN NOT NULL DEFAULT TRUE,
  verification_source VARCHAR(50), -- 'healthkit', 'google_fit', 'trainer_approval', 'api'

  -- Availability
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  start_date TIMESTAMP,
  end_date TIMESTAMP,

  -- Display
  icon_url VARCHAR(500),
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_challenges_active ON challenges(is_active, recurrence_type);
CREATE INDEX idx_challenges_category ON challenges(category);
CREATE INDEX idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX idx_challenges_dates ON challenges(start_date, end_date) WHERE is_active = TRUE;
```

---

### **4. user_challenge_progress** (Completion Tracking)

```sql
CREATE TABLE user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,

  -- Progress Tracking
  current_progress INTEGER NOT NULL DEFAULT 0,
  target_progress INTEGER NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Completion Details
  completed_at TIMESTAMP,
  xp_earned INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,

  -- Idempotency (CRITICAL)
  idempotency_key VARCHAR(100) UNIQUE,

  -- Verification
  verification_data JSONB,

  -- Period Tracking (for daily/weekly challenges)
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Prevent duplicate completions in same period
  CONSTRAINT unique_user_challenge_period UNIQUE (user_id, challenge_id, period_start)
);

-- Indexes
CREATE INDEX idx_user_challenge_progress_user ON user_challenge_progress(user_id, is_completed);
CREATE INDEX idx_user_challenge_progress_period ON user_challenge_progress(period_start, period_end);
```

---

### **5. achievements** (Badge System with Upload Support)

```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Achievement Definition
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL
    CHECK (category IN ('workout_milestone', 'nutrition', 'streak', 'social', 'referral', 'special', 'seasonal')),

  -- Rarity System (5 Tiers)
  rarity VARCHAR(20) NOT NULL DEFAULT 'common'
    CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),

  -- Rewards
  point_reward INTEGER NOT NULL DEFAULT 0 CHECK (point_reward >= 0),
  title_unlock VARCHAR(100), -- e.g., "Legendary Warrior"
  cosmetic_unlock VARCHAR(100), -- e.g., "golden_border", "platinum_badge"

  -- Badge Image (CDN URLs - Uploaded via Admin Panel)
  badge_image_url VARCHAR(500) NOT NULL,
  badge_thumbnail_url VARCHAR(500),
  badge_version INTEGER NOT NULL DEFAULT 1, -- Increment when updating image

  -- Unlock Criteria (FUTURE-PROOF JSON)
  unlock_criteria JSONB NOT NULL,
  /* Examples:
    {"type": "workout_count", "target": 100}
    {"type": "streak_days", "target": 365}
    {"type": "referrals", "target": 10}
    {"type": "level", "target": 50}
    {"type": "challenge_completions", "category": "workout", "target": 50}
  */

  -- Display
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  is_secret BOOLEAN NOT NULL DEFAULT FALSE, -- Hidden until unlocked

  -- Physical Rewards (for Legendary/Mythic only)
  physical_reward_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  physical_reward_description TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) -- Admin who created
);

-- Indexes
CREATE INDEX idx_achievements_rarity ON achievements(rarity);
CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_visible ON achievements(is_visible, sort_order);
CREATE INDEX idx_achievements_secret ON achievements(is_secret) WHERE is_secret = TRUE;
```

---

### **6. user_achievements** (Unlock Tracking)

```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,

  -- Unlock Status
  is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMP,

  -- Progress Tracking (for multi-step achievements)
  current_progress INTEGER NOT NULL DEFAULT 0,
  target_progress INTEGER NOT NULL,

  -- Notification
  notification_sent BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

-- Indexes
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id, is_unlocked);
CREATE INDEX idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);
CREATE INDEX idx_user_achievements_progress ON user_achievements(user_id, current_progress);
```

---

### **7. referrals** (Viral Growth System)

```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Referrer (Person who sent referral)
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL UNIQUE, -- e.g., "SEAN-SWAN-X7Y2"

  -- Referee (Person who was referred)
  referee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referee_email VARCHAR(255),
  referee_name VARCHAR(255),

  -- Status Tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'signed_up', 'converted', 'paid_client', 'churned')),

  -- Conversion Milestones
  signed_up_at TIMESTAMP,
  first_purchase_at TIMESTAMP,
  first_training_session_at TIMESTAMP,
  total_revenue_generated DECIMAL(10, 2) DEFAULT 0.00,

  -- Rewards Given
  referrer_points_awarded INTEGER DEFAULT 0,
  referee_points_awarded INTEGER DEFAULT 0,
  referrer_milestone_achieved VARCHAR(50), -- 'bronze', 'silver', 'gold', 'platinum', 'diamond'

  -- Attribution
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  landing_page VARCHAR(500),

  -- Anti-Fraud (CRITICAL)
  referee_ip_address INET,
  referee_device_fingerprint VARCHAR(255),
  is_flagged_fraud BOOLEAN NOT NULL DEFAULT FALSE,
  fraud_reason TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_referrals_referrer ON referrals(referrer_user_id, status);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_status ON referrals(status, created_at DESC);
CREATE INDEX idx_referrals_fraud ON referrals(is_flagged_fraud) WHERE is_flagged_fraud = TRUE;
CREATE INDEX idx_referrals_revenue ON referrals(total_revenue_generated DESC);
```

---

### **8. referral_milestones** (Tiered Reward System)

```sql
CREATE TABLE referral_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Milestone Definition
  name VARCHAR(100) NOT NULL UNIQUE,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),

  -- Requirements
  required_referrals INTEGER NOT NULL,
  required_conversions INTEGER, -- Optional: Must have X paying clients

  -- Rewards
  point_reward INTEGER NOT NULL DEFAULT 0,
  badge_achievement_id UUID REFERENCES achievements(id),
  exclusive_perk TEXT,

  -- Display
  icon_url VARCHAR(500),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed Data (Option A Currency: 1pt = $0.001)
INSERT INTO referral_milestones (name, tier, required_referrals, point_reward, sort_order) VALUES
('Bronze Recruiter', 'bronze', 1, 500, 1),       -- $0.50 value
('Silver Recruiter', 'silver', 5, 3000, 2),      -- $3.00 value
('Gold Recruiter', 'gold', 10, 8000, 3),         -- $8.00 value
('Platinum Recruiter', 'platinum', 25, 25000, 4), -- $25.00 value
('Diamond Recruiter', 'diamond', 50, 75000, 5);   -- $75.00 value
```

---

### **9. leaderboards** (Pre-Computed Rankings - Redis Cache)

```sql
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Scope
  scope VARCHAR(50) NOT NULL
    CHECK (scope IN ('global', 'gym', 'age_bracket', 'gender')),
  scope_identifier VARCHAR(100), -- gym_id, '25-34', 'male', etc.

  -- Period
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('all_time', 'weekly', 'monthly')),
  period_start DATE,
  period_end DATE,

  -- Rankings (Pre-Computed JSONB)
  rankings JSONB NOT NULL,
  /* Structure:
    [
      {"rank": 1, "userId": "uuid", "displayName": "SwanWarrior", "xp": 45000, "level": 25},
      {"rank": 2, "userId": "uuid", "displayName": "FitnessBeast", "xp": 42000, "level": 24},
      ...
    ]
  */

  -- Cache Control
  last_computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  next_refresh_at TIMESTAMP NOT NULL,

  CONSTRAINT unique_leaderboard_scope_period UNIQUE (scope, scope_identifier, period_type, period_start)
);

-- Indexes
CREATE INDEX idx_leaderboards_scope ON leaderboards(scope, period_type);
CREATE INDEX idx_leaderboards_refresh ON leaderboards(next_refresh_at);
```

---

### **10. battle_pass_seasons** (Seasonal Content)

```sql
CREATE TABLE battle_pass_seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Season Info
  name VARCHAR(100) NOT NULL UNIQUE,
  season_number INTEGER NOT NULL UNIQUE,

  -- Duration
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,

  -- Structure
  total_tiers INTEGER NOT NULL DEFAULT 50 CHECK (total_tiers > 0),
  xp_per_tier INTEGER NOT NULL DEFAULT 500,

  -- Pricing (Option A Currency)
  premium_price_usd DECIMAL(10, 2) NOT NULL DEFAULT 29.99,
  premium_price_points INTEGER NOT NULL DEFAULT 30000, -- 30,000 pts = $30

  -- Rewards Config (JSONB for Flexibility)
  free_track_rewards JSONB NOT NULL,
  premium_track_rewards JSONB NOT NULL,
  /* Structure:
    {
      "tier_1": {"points": 100, "badge": "season_participant"},
      "tier_5": {"points": 200, "item": "protein_sample"},
      "tier_10": {"points": 500, "title": "Summer Warrior"},
      "tier_50": {"points": 5000, "badge": "season_champion", "physical_reward": "Custom trophy"}
    }
  */

  -- Metadata
  theme_color VARCHAR(7) DEFAULT '#ff9900',
  banner_image_url VARCHAR(500),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_season_dates CHECK (end_date > start_date)
);

-- Only one active season at a time
CREATE UNIQUE INDEX idx_battle_pass_active ON battle_pass_seasons(is_active) WHERE is_active = TRUE;
```

---

### **11. user_battle_pass** (User Progress)

```sql
CREATE TABLE user_battle_pass (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,

  -- Track Type
  has_premium BOOLEAN NOT NULL DEFAULT FALSE,
  purchased_at TIMESTAMP,
  purchase_type VARCHAR(20) CHECK (purchase_type IN ('cash', 'points')),

  -- Progress
  current_tier INTEGER NOT NULL DEFAULT 0 CHECK (current_tier >= 0),
  current_tier_xp INTEGER NOT NULL DEFAULT 0,

  -- Claimed Rewards
  claimed_free_rewards JSONB NOT NULL DEFAULT '[]',    -- [1, 2, 5, 10]
  claimed_premium_rewards JSONB NOT NULL DEFAULT '[]', -- [1, 2, 5, 10]

  -- Tier Boost Purchases
  tier_boosts_purchased INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_season UNIQUE (user_id, season_id)
);

-- Indexes
CREATE INDEX idx_user_battle_pass_user ON user_battle_pass(user_id, season_id);
CREATE INDEX idx_user_battle_pass_premium ON user_battle_pass(has_premium);
CREATE INDEX idx_user_battle_pass_tier ON user_battle_pass(current_tier DESC);
```

---

## 🔌 API ENDPOINTS (Priority Order)

### **Phase 1: Core Profile & XP (Days 1-2)**

#### `GET /api/gamification/profile/:userId`
**Purpose**: Get complete user gamification profile

**Response**:
```typescript
{
  success: true,
  data: {
    level: 12,
    currentXP: 350,
    nextLevelXP: 500,
    totalLifetimeXP: 5850,
    xpProgress: 70, // Percentage

    // Points (Currency)
    points: 2400,
    lifetimePointsEarned: 8900,
    lifetimePointsSpent: 6500,

    // Streak
    currentStreak: 15,
    longestStreak: 28,
    streakFreezesAvailable: 2,

    // Privacy
    privacySettings: {
      leaderboardVisibility: 'friends_only',
      showOnGlobalLeaderboard: false
    }
  }
}
```

---

#### `POST /api/gamification/profile/earn-xp`
**Purpose**: Award XP for workout/activity (SERVER-VALIDATED)

**Request**:
```typescript
{
  userId: string,
  xpAmount: number, // Server computes, client suggests
  source: 'workout' | 'challenge' | 'daily_login',
  metadata: {
    workoutId?: string,
    duration?: number,
    caloriesBurned?: number
  },
  idempotencyKey: string // REQUIRED
}
```

**Logic**:
1. Check idempotency key (prevent duplicates)
2. Validate XP amount (server-side, don't trust client)
3. Add XP to profile
4. Check if level up (current_xp >= next_level_xp)
5. If level up:
   - Increment level
   - Reset current_xp = overflow
   - Award 200 points (level-up bonus)
   - Check for level-based achievement unlocks
6. Return response with level_up flag

**Response**:
```typescript
{
  success: true,
  data: {
    xpEarned: 150,
    newTotalXP: 6000,
    levelUp: true,
    newLevel: 13,
    pointsAwarded: 200, // Level-up bonus
    newPointBalance: 2600,

    // Any achievements unlocked
    achievementsUnlocked: [
      {
        id: 'uuid',
        name: 'Lucky 13',
        rarity: 'rare',
        pointReward: 100
      }
    ]
  }
}
```

---

### **Phase 2: Challenges (Days 2-3)**

#### `GET /api/gamification/challenges/available`
**Purpose**: Get challenges available to user

**Query Params**:
- `userId`: string
- `category?`: 'workout' | 'nutrition' | 'social' | 'referral'
- `difficulty?`: 'easy' | 'medium' | 'hard'

**Logic**:
1. Fetch active challenges (is_active = true)
2. Filter by user level (min_level <= user.level)
3. Filter by recurrence (daily = today's challenges)
4. Check user completion status
5. Return with progress

**Response**:
```typescript
{
  success: true,
  data: {
    daily: [
      {
        id: 'uuid',
        name: 'Morning Cardio',
        description: 'Complete 30 minutes of cardio',
        category: 'workout',
        difficulty: 'medium',
        xpReward: 15,
        pointReward: 0,
        completionCriteria: {
          type: 'workout_duration',
          target: 30,
          unit: 'minutes'
        },
        userProgress: {
          current: 0,
          target: 30,
          isCompleted: false
        },
        expiresAt: '2025-11-03T23:59:59Z'
      }
    ],
    weekly: [...],
    special: [...]
  }
}
```

---

#### `POST /api/gamification/challenges/complete`
**Purpose**: Mark challenge complete (SERVER-VALIDATED)

**Request**:
```typescript
{
  userId: string,
  challengeId: string,
  progressData: {
    duration?: number, // For workout challenges
    mealsLogged?: number, // For nutrition
    referralCode?: string // For referral challenges
  },
  verificationData?: {
    healthKitWorkoutId?: string,
    trainerApprovalId?: string
  },
  idempotencyKey: string // REQUIRED
}
```

**Logic** (CRITICAL - Server Validation):
1. Check idempotency key
2. Fetch challenge from DB (trusted source)
3. Validate completion criteria (server-side)
4. Check if already completed in this period
5. Award XP (from challenge.xp_reward, NOT client)
6. Award points if applicable
7. Check for achievement unlocks
8. Return response

**Response**:
```typescript
{
  success: true,
  data: {
    challengeCompleted: true,
    xpEarned: 15,
    pointsEarned: 0,
    newTotalXP: 6015,

    achievementsUnlocked: [
      {
        id: 'uuid',
        name: 'Week Warrior',
        rarity: 'rare',
        pointReward: 100
      }
    ]
  }
}
```

---

### **Phase 3: Points & Ledger (Days 3-4)**

#### `POST /api/gamification/points/purchase`
**Purpose**: Purchase shop item with points (TWO-PHASE COMMIT)

**Request**:
```typescript
{
  userId: string,
  itemId: string,
  itemType: 'training_session' | 'supplement' | 'gear' | 'battle_pass_premium',
  pointCost: number, // Server validates
  idempotencyKey: string
}
```

**Logic** (TWO-PHASE COMMIT):
```typescript
async function purchaseWithPoints(req) {
  const transaction = await db.beginTransaction();

  try {
    // PHASE 1: Check idempotency
    const existing = await checkIdempotency(req.idempotencyKey);
    if (existing) return existing;

    // PHASE 2: Check balance
    const balance = await getPointBalance(req.userId);
    if (balance < req.pointCost) {
      throw new InsufficientPointsError();
    }

    // PHASE 3: Reserve points (soft lock)
    const reservation = await reservePoints({
      userId: req.userId,
      amount: req.pointCost,
      expiresIn: 60000 // 60 seconds
    });

    // PHASE 4: Create shop order (external API call)
    const order = await shopService.createOrder({
      userId: req.userId,
      itemId: req.itemId,
      paymentType: 'points',
      reservationId: reservation.id
    });

    // PHASE 5: Commit point deduction (double-entry ledger)
    await insertPointTransaction({
      userId: req.userId,
      amount: -req.pointCost,
      balanceBefore: balance,
      balanceAfter: balance - req.pointCost,
      transactionType: 'spent',
      source: 'purchase',
      referenceId: order.id,
      referenceType: 'order',
      idempotencyKey: req.idempotencyKey,
      metadata: { itemId: req.itemId, orderId: order.id }
    });

    // PHASE 6: Release reservation
    await releaseReservation(reservation.id);

    await transaction.commit();
    return { success: true, order, newBalance: balance - req.pointCost };

  } catch (error) {
    // ROLLBACK: Release reservation, rollback transaction
    await releaseReservation(reservation?.id);
    await transaction.rollback();
    throw error;
  }
}
```

**Response Success**:
```typescript
{
  success: true,
  data: {
    transactionId: 'uuid',
    orderId: 'uuid',
    pointsSpent: 100000,
    newBalance: 2400,
    message: 'Purchase successful!'
  }
}
```

**Response Error**:
```typescript
{
  success: false,
  error: {
    code: 'INSUFFICIENT_POINTS',
    message: 'You need 97,600 more points',
    details: {
      required: 100000,
      current: 2400,
      shortfall: 97600
    }
  }
}
```

---

#### `GET /api/gamification/points/history/:userId`
**Purpose**: Get point transaction history (audit trail)

**Response**:
```typescript
{
  success: true,
  data: {
    total: 245,
    transactions: [
      {
        id: 'uuid',
        amount: 200,
        balanceBefore: 2200,
        balanceAfter: 2400,
        type: 'earned',
        source: 'level_up',
        description: 'Level 12 → 13 bonus',
        createdAt: '2025-11-02T09:30:00Z'
      }
    ],
    summary: {
      totalEarned: 8900,
      totalSpent: 6500,
      netBalance: 2400
    }
  }
}
```

---

### **Phase 4: Referrals (Days 4-5)**

#### `POST /api/gamification/referrals/generate-code`
**Purpose**: Generate unique referral code

**Request**:
```typescript
{
  userId: string
}
```

**Logic**:
1. Check if user already has referral code
2. If exists, return existing
3. If not, generate unique code: `${firstName.toUpperCase()}-SWAN-${randomHash(4)}`
4. Insert into referrals table

**Response**:
```typescript
{
  success: true,
  data: {
    referralCode: 'SEAN-SWAN-X7Y2',
    referralUrl: 'https://swanstudios.com/join?ref=SEAN-SWAN-X7Y2',
    sharingMessage: 'Join me at SwanStudios and get 500 bonus points! Use code SEAN-SWAN-X7Y2'
  }
}
```

---

#### `POST /api/gamification/referrals/track`
**Purpose**: Track referral signup

**Request**:
```typescript
{
  referralCode: string,
  newUserId: string,
  newUserEmail: string,
  ipAddress: string,
  deviceFingerprint: string,
  utmSource?: string
}
```

**Logic** (ANTI-FRAUD):
```typescript
async function trackReferral(req) {
  // 1. Find referrer
  const referral = await db.findReferralByCode(req.referralCode);
  const referrerId = referral.referrer_user_id;

  // 2. Anti-fraud checks
  if (referrerId === req.newUserId) {
    await flagFraud(req.referralCode, 'Self-referral');
    return { success: false, error: 'Invalid referral' };
  }

  const referrerIP = await getUserIP(referrerId);
  if (referrerIP === req.ipAddress) {
    await flagFraud(req.referralCode, 'Same IP as referrer');
    return { success: false, error: 'Invalid referral' };
  }

  const ipReferralCount = await db.countReferralsFromIP(req.ipAddress, 7); // Last 7 days
  if (ipReferralCount > 3) {
    await flagFraud(req.referralCode, 'Too many referrals from IP');
    return { success: false, error: 'Suspicious activity' };
  }

  // 3. Create referral record
  await db.insertReferral({
    referrerUserId: referrerId,
    refereeUserId: req.newUserId,
    status: 'signed_up',
    signedUpAt: new Date(),
    ipAddress: req.ipAddress,
    deviceFingerprint: req.deviceFingerprint
  });

  // 4. Award points to BOTH users
  await awardPoints(referrerId, 500, 'referral', 'Referral signup bonus');
  await awardPoints(req.newUserId, 500, 'referral', 'Welcome bonus');

  return {
    success: true,
    referrerReward: { points: 500 },
    refereeReward: { points: 500 }
  };
}
```

---

#### `POST /api/gamification/referrals/convert`
**Purpose**: Mark referral as converted (first purchase)

**Request**:
```typescript
{
  referralId: string,
  conversionType: 'first_purchase' | 'first_training_session',
  revenueGenerated: number
}
```

**Logic**:
1. Update referral status to 'converted'
2. Award conversion bonus (2,000 points)
3. Check milestone achievements (5, 10, 25, 50 referrals)
4. If milestone reached, award milestone bonus + badge

**Response**:
```typescript
{
  success: true,
  data: {
    referrerReward: {
      points: 2000,
      message: 'Your referral made their first purchase!'
    },
    milestoneAchieved: {
      name: 'Silver Recruiter',
      tier: 'silver',
      totalReferrals: 5,
      pointReward: 3000
    }
  }
}
```

---

### **Phase 5: Achievements & Leaderboards (Days 5-6)**

#### `GET /api/gamification/achievements`
**Purpose**: Get all achievements (locked + unlocked)

**Response**:
```typescript
{
  success: true,
  data: {
    total: 50,
    unlocked: 12,
    achievements: [
      {
        id: 'uuid',
        name: 'First Steps',
        rarity: 'common',
        badgeImageUrl: 'https://cdn.swanstudios.com/badges/first-steps-v1.png',
        pointReward: 50,
        isUnlocked: true,
        unlockedAt: '2025-10-15T14:30:00Z',
        progress: { current: 1, target: 1 }
      },
      {
        id: 'uuid',
        name: '100 Workout Legend',
        rarity: 'legendary',
        pointReward: 5000,
        isUnlocked: false,
        progress: { current: 24, target: 100 }
      }
    ]
  }
}
```

---

#### `POST /api/admin/achievements/upload` (Admin Only)
**Purpose**: Upload custom badge (Midjourney integration)

**Request** (multipart/form-data):
```typescript
{
  name: string,
  description: string,
  category: string,
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic',
  pointReward: number,
  unlockCriteria: {
    type: 'workout_count' | 'streak_days' | 'referrals',
    target: number
  },
  badgeImage: File // PNG/SVG, max 5MB
}
```

**Logic**:
1. Validate image (format, size, dimensions)
2. Upload to CDN (S3/Cloudflare)
3. Generate thumbnail (256x256)
4. Insert achievement record
5. Return URLs

---

#### `GET /api/gamification/leaderboards/:scope`
**Purpose**: Get cached leaderboard rankings

**Path Params**:
- `scope`: 'global' | 'friends' | 'gym'

**Query Params**:
- `userId`: string
- `period`: 'all_time' | 'weekly' | 'monthly'
- `limit`: number (default 100)

**Logic**:
1. Check Redis cache first (5min TTL)
2. If cache miss, query DB
3. Respect privacy settings (show_on_global_leaderboard)
4. Compute user's position
5. Cache result

**Response**:
```typescript
{
  success: true,
  data: {
    scope: 'global',
    period: 'weekly',
    userPosition: {
      rank: 42,
      displayName: 'SwanWarrior',
      level: 12,
      xp: 5850
    },
    rankings: [
      { rank: 1, displayName: 'FitnessBeast', level: 25, xp: 45000 },
      { rank: 2, displayName: 'IronWarrior', level: 24, xp: 42000 }
    ]
  }
}
```

---

### **Phase 6: Battle Pass (Days 6-7)**

#### `GET /api/gamification/battle-pass/:userId`
**Purpose**: Get user's battle pass progress

**Response**:
```typescript
{
  success: true,
  data: {
    seasonName: 'Summer Shred 2025',
    currentTier: 8,
    totalTiers: 50,
    hasPremium: false,
    currentTierXP: 350,
    xpPerTier: 500,

    freeRewards: [
      { tier: 10, points: 500, claimed: false }
    ],
    premiumRewards: [
      { tier: 10, points: 1000, item: 'Training Session', claimed: false, locked: true }
    ]
  }
}
```

---

#### `POST /api/gamification/battle-pass/claim`
**Purpose**: Claim battle pass tier reward

**Request**:
```typescript
{
  userId: string,
  seasonId: string,
  tierId: number,
  track: 'free' | 'premium',
  idempotencyKey: string
}
```

**Logic**:
1. Check if user reached tier
2. Check if premium (for premium rewards)
3. Check if already claimed
4. Award reward (points, badge, etc.)
5. Mark as claimed

---

## 🛡️ SECURITY IMPLEMENTATION (CRITICAL)

### **1. Idempotency Middleware**

```typescript
// Apply to ALL write endpoints
async function checkIdempotency(req, res, next) {
  const { idempotencyKey } = req.body;

  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'Idempotency key required' }
    });
  }

  // Check if request with this key already processed
  const cached = await redis.get(`idempotency:${idempotencyKey}`);
  if (cached) {
    return res.json(JSON.parse(cached)); // Return cached result
  }

  // Store response in Redis after processing (in endpoint)
  req.idempotencyKey = idempotencyKey;
  next();
}
```

---

### **2. Rate Limiting**

```typescript
const rateLimits = {
  'POST /api/gamification/challenges/complete': {
    maxRequests: 10,
    windowMs: 86400000 // 10 per day
  },
  'POST /api/gamification/points/purchase': {
    maxRequests: 5,
    windowMs: 3600000 // 5 per hour
  },
  'POST /api/gamification/referrals/track': {
    maxRequests: 3,
    windowMs: 86400000 // 3 per day
  }
};

app.use(rateLimit(rateLimits));
```

---

### **3. Server-Side Validation**

```typescript
// NEVER trust client-supplied reward amounts
async function awardXP(userId, xpAmount, source) {
  // Fetch trusted reward amount from DB
  if (source === 'challenge') {
    const challenge = await db.getChallengeById(challengeId);
    xpAmount = challenge.xp_reward; // Use DB value, ignore client
  }

  // Continue with validated amount...
}
```

---

## 📊 TESTING CHECKLIST

### **Database Integrity**
- [ ] Test point balance = SUM(transactions)
- [ ] Test double-entry ledger invariant
- [ ] Test idempotency (duplicate requests return same result)
- [ ] Test unique constraints (no duplicate achievements)

### **API Endpoints**
- [ ] Test all endpoints with valid data
- [ ] Test error cases (insufficient points, invalid challenges)
- [ ] Test idempotency keys
- [ ] Test rate limiting (blocked after limit)

### **Security**
- [ ] Test server-side validation (client can't cheat)
- [ ] Test referral anti-fraud (same IP flagged)
- [ ] Test two-phase commit rollback (shop order fails)

### **Performance**
- [ ] Test leaderboard cache (Redis)
- [ ] Test DB query performance (< 200ms p95)
- [ ] Test concurrent requests (race conditions)

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Run all database migrations
- [ ] Seed initial data (challenges, achievements, milestones)
- [ ] Configure Redis cache
- [ ] Set up CDN for badge uploads
- [ ] Configure rate limiting
- [ ] Test idempotency in production
- [ ] Monitor point transaction accuracy
- [ ] Set up nightly ledger validation cron job

---

## 📁 DELIVERABLES (End of Week 1)

1. **Database Migrations** (11 tables with indexes)
2. **API Endpoints** (20+ endpoints with idempotency)
3. **Security Middleware** (rate limiting, validation)
4. **Seed Data** (20 challenges, 30 achievements, 5 milestones)
5. **Testing Suite** (unit + integration tests)
6. **Documentation** (API contracts, error codes)

---

**Ready to build? Start with Phase 1 (Profile & XP) and work through sequentially. You've got this! 🚀**

**Questions? Check the main blueprint: `ROO-CODE-GAMIFICATION-IMPLEMENTATION-BLUEPRINT.md`**
