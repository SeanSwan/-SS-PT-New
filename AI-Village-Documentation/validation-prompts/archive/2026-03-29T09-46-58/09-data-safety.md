# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 54.0s
> **Files:** docs/ai-workflow/blueprints/GAMIFICATION-RPG-VISION-V2.md
> **Generated:** 3/29/2026, 2:46:58 AM

---

# 🚨 DATA SAFETY AUDIT REPORT — GAMIFICATION-RPG-VISION-V2.md

## ⚠️ EXECUTIVE SUMMARY

**Document Type:** Product Vision / Feature Specification  
**Direct Code Risk:** ❌ NONE (No executable code present)  
**Implementation Risk:** 🔴 **CRITICAL** (Multiple data safety landmines if implemented carelessly)

**Overall Assessment:** This is a **design document**, not production code. However, it describes **13 new database tables** and **complex multi-table operations** that, if implemented without extreme caution, could create catastrophic data loss scenarios.

---

## 🔴 CRITICAL FINDINGS (Implementation Risks)

### FINDING #1: Companion Sprite "Health Decay" System — Data Deletion Risk

**Severity:** 🔴 **CRITICAL**  
**Data at Risk:** User engagement history, sprite evolution progress, potentially linked achievement data  
**Blast Radius:** Every user with a companion sprite (potentially all users)

**Location:** Part 2, Section 8 — "Companion Sprite (Tamagotchi × The Sims 3)"

**What's Wrong:**
```md
- **If user stops logging in:**
  - Sprite loses health
  - Gets negative Moodlets (thought bubble with crying face)
  - Visually reverts to weaker form
```

**The Danger:**
If implemented naively, this could be coded as:
```javascript
// ❌ CATASTROPHIC IMPLEMENTATION
async function decayInactiveSprites() {
  const inactiveUsers = await User.findAll({
    where: {
      lastLoginAt: { [Op.lt]: moment().subtract(7, 'days') }
    }
  });
  
  // THIS COULD WIPE MONTHS OF PROGRESS
  await UserSprite.destroy({
    where: { userId: { [Op.in]: inactiveUsers.map(u => u.id) } }
  });
}
```

**Required Safeguards:**
```javascript
// ✅ SAFE IMPLEMENTATION
async function decayInactiveSprites() {
  const transaction = await sequelize.transaction();
  try {
    // NEVER delete — only update state
    const inactiveUsers = await User.findAll({
      where: {
        lastLoginAt: { [Op.lt]: moment().subtract(7, 'days') }
      },
      transaction
    });
    
    // Store decay history for recovery
    await UserSprite.update(
      {
        healthPoints: sequelize.literal('GREATEST(healthPoints - 10, 0)'),
        evolutionStage: sequelize.literal(`
          CASE 
            WHEN healthPoints <= 20 THEN 'Baby'
            WHEN healthPoints <= 50 THEN 'Juvenile'
            ELSE evolutionStage
          END
        `),
        lastDecayAt: new Date(),
        // CRITICAL: Store original state for recovery
        decayHistory: sequelize.fn(
          'jsonb_insert',
          sequelize.col('decayHistory'),
          '{0}',
          JSON.stringify({
            decayedAt: new Date(),
            previousHealth: sequelize.col('healthPoints'),
            previousStage: sequelize.col('evolutionStage')
          })
        )
      },
      {
        where: { userId: { [Op.in]: inactiveUsers.map(u => u.id) } },
        transaction
      }
    );
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    // NEVER let decay failures break other systems
    logger.error('Sprite decay failed but data preserved', error);
  }
}
```

**Required Schema Safety:**
```sql
-- UserSprite table MUST have:
ALTER TABLE "UserSprites" 
  ADD COLUMN "decayHistory" JSONB DEFAULT '[]',
  ADD COLUMN "lastDecayAt" TIMESTAMP,
  ADD CONSTRAINT "health_never_negative" CHECK (healthPoints >= 0);

-- Prevent accidental deletion
CREATE POLICY "prevent_sprite_deletion" ON "UserSprites"
  FOR DELETE USING (false); -- Only allow via explicit admin function
```

---

### FINDING #2: Party/Linkshell "Shared HP Bar" — Cascade Deletion Risk

**Severity:** 🔴 **CRITICAL**  
**Data at Risk:** Party membership history, shared goals, chat logs, collective achievements  
**Blast Radius:** All members of affected parties (3-5 users per party)

**Location:** Part 2, Section 3 — "Linkshells / Party System"

**What's Wrong:**
```md
- Mini-groups of 3-5 clients = "Parties" or "Linkshells"
- **Shared HP bar** for the week
- One member missing macros = party takes "damage"
```

**The Danger:**
If a user deletes their account or a party is disbanded, naive CASCADE deletes could wipe:
- All party chat history
- Shared achievement progress
- Other members' party-related XP

**Catastrophic Schema:**
```sql
-- ❌ DANGEROUS
CREATE TABLE "Parties" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255)
);

CREATE TABLE "PartyMembers" (
  id SERIAL PRIMARY KEY,
  partyId INTEGER REFERENCES "Parties"(id) ON DELETE CASCADE, -- ❌ WIPES ALL MEMBERS
  userId INTEGER REFERENCES "Users"(id) ON DELETE CASCADE     -- ❌ WIPES PARTY HISTORY
);
```

**Required Safe Schema:**
```sql
-- ✅ SAFE
CREATE TABLE "Parties" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  disbandedAt TIMESTAMP NULL,        -- Soft delete
  disbandedByUserId INTEGER NULL,
  disbandReason TEXT NULL
);

CREATE TABLE "PartyMembers" (
  id SERIAL PRIMARY KEY,
  partyId INTEGER REFERENCES "Parties"(id) ON DELETE RESTRICT, -- ✅ Prevent cascade
  userId INTEGER REFERENCES "Users"(id) ON DELETE RESTRICT,    -- ✅ Prevent cascade
  joinedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  leftAt TIMESTAMP NULL,              -- Soft delete membership
  leftReason TEXT NULL,
  -- Preserve contribution history even after leaving
  totalXpContributed INTEGER DEFAULT 0,
  totalWorkoutsCompleted INTEGER DEFAULT 0,
  CONSTRAINT "no_duplicate_active_members" 
    UNIQUE (partyId, userId) WHERE (leftAt IS NULL)
);

-- Prevent accidental party deletion
CREATE POLICY "prevent_party_deletion" ON "Parties"
  FOR DELETE USING (false); -- Only soft delete via disbandedAt
```

**Required Safe Disbanding Logic:**
```javascript
// ✅ SAFE PARTY DISBANDING
async function disbandParty(partyId, disbandedByUserId, reason) {
  const transaction = await sequelize.transaction();
  try {
    // 1. Verify party exists and isn't already disbanded
    const party = await Party.findOne({
      where: { id: partyId, disbandedAt: null },
      transaction,
      lock: transaction.LOCK.UPDATE // Prevent race conditions
    });
    
    if (!party) {
      throw new Error('Party not found or already disbanded');
    }
    
    // 2. Archive all member contributions BEFORE marking as left
    const members = await PartyMember.findAll({
      where: { partyId, leftAt: null },
      transaction
    });
    
    // 3. Create permanent archive record
    await PartyArchive.create({
      partyId,
      disbandedAt: new Date(),
      disbandedByUserId,
      reason,
      finalMemberCount: members.length,
      finalTotalXp: members.reduce((sum, m) => sum + m.totalXpContributed, 0),
      memberSnapshot: members.map(m => ({
        userId: m.userId,
        xpContributed: m.totalXpContributed,
        workoutsCompleted: m.totalWorkoutsCompleted
      }))
    }, { transaction });
    
    // 4. Soft delete party (NEVER hard delete)
    await party.update({
      disbandedAt: new Date(),
      disbandedByUserId,
      disbandReason: reason
    }, { transaction });
    
    // 5. Soft delete memberships (NEVER hard delete)
    await PartyMember.update(
      { 
        leftAt: new Date(),
        leftReason: 'Party disbanded'
      },
      { 
        where: { partyId, leftAt: null },
        transaction 
      }
    );
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

---

### FINDING #3: Seasonal Content Rotation — Data Purge Risk

**Severity:** 🔴 **CRITICAL**  
**Data at Risk:** User progress in expired seasons, earned rewards, battle pass history  
**Blast Radius:** All users who participated in previous seasons

**Location:** Part 2, Section 1 — "Faction Warfare & Seasonal Pacing"

**What's Wrong:**
```md
- **"Seasons of Strength"** — 9-week Battle Pass cycles
```

**The Danger:**
When Season 2 starts, naive implementation might:
```javascript
// ❌ CATASTROPHIC
async function startNewSeason() {
  // THIS WIPES ALL PREVIOUS SEASON DATA
  await SeasonReward.destroy({ where: {} }); // ❌ NO WHERE CLAUSE
  await UserSeasonProgress.destroy({ where: {} }); // ❌ DELETES HISTORY
}
```

**Required Safe Implementation:**
```javascript
// ✅ SAFE SEASON ROTATION
async function startNewSeason(newSeasonData) {
  const transaction = await sequelize.transaction();
  try {
    // 1. Archive current season (NEVER delete)
    const currentSeason = await Season.findOne({
      where: { isActive: true },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    
    if (currentSeason) {
      // 2. Snapshot all user progress BEFORE closing season
      const allProgress = await UserSeasonProgress.findAll({
        where: { seasonId: currentSeason.id },
        transaction
      });
      
      await SeasonArchive.create({
        seasonId: currentSeason.id,
        endedAt: new Date(),
        totalParticipants: allProgress.length,
        totalXpEarned: allProgress.reduce((sum, p) => sum + p.xpEarned, 0),
        progressSnapshot: allProgress.map(p => ({
          userId: p.userId,
          finalLevel: p.level,
          finalXp: p.xpEarned,
          rewardsEarned: p.rewardsEarned
        }))
      }, { transaction });
      
      // 3. Mark season as ended (NEVER delete)
      await currentSeason.update({
        isActive: false,
        endedAt: new Date()
      }, { transaction });
    }
    
    // 4. Create new season (additive operation)
    const newSeason = await Season.create({
      ...newSeasonData,
      isActive: true,
      startedAt: new Date()
    }, { transaction });
    
    // 5. Initialize progress for all active users (don't touch old data)
    const activeUsers = await User.findAll({
      where: { isActive: true },
      attributes: ['id'],
      transaction
    });
    
    await UserSeasonProgress.bulkCreate(
      activeUsers.map(u => ({
        userId: u.id,
        seasonId: newSeason.id,
        level: 1,
        xpEarned: 0
      })),
      { 
        transaction,
        updateOnDuplicate: [] // Don't overwrite if exists
      }
    );
    
    await transaction.commit();
    return newSeason;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

**Required Schema:**
```sql
-- Prevent deletion of season data
CREATE TABLE "Seasons" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  isActive BOOLEAN DEFAULT false,
  startedAt TIMESTAMP NOT NULL,
  endedAt TIMESTAMP NULL,
  CONSTRAINT "only_one_active_season" 
    EXCLUDE USING gist (isActive WITH =) WHERE (isActive = true)
);

CREATE TABLE "UserSeasonProgress" (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES "Users"(id) ON DELETE RESTRICT,
  seasonId INTEGER REFERENCES "Seasons"(id) ON DELETE RESTRICT,
  level INTEGER DEFAULT 1,
  xpEarned INTEGER DEFAULT 0,
  -- NEVER delete this table
  CONSTRAINT "unique_user_season" UNIQUE (userId, seasonId)
);

-- Permanent archive (never deleted)
CREATE TABLE "SeasonArchives" (
  id SERIAL PRIMARY KEY,
  seasonId INTEGER REFERENCES "Seasons"(id),
  endedAt TIMESTAMP NOT NULL,
  totalParticipants INTEGER,
  totalXpEarned BIGINT,
  progressSnapshot JSONB NOT NULL
);

CREATE POLICY "prevent_season_deletion" ON "Seasons"
  FOR DELETE USING (false);

CREATE POLICY "prevent_progress_deletion" ON "UserSeasonProgress"
  FOR DELETE USING (false);
```

---

### FINDING #4: Loot Drop System — Duplicate Reward Risk

**Severity:** 🟡 **HIGH**  
**Data at Risk:** User inventory integrity, duplicate legendary rewards  
**Blast Radius:** Individual users (but could affect economy/fairness)

**Location:** Part 2, Section 4 — "Loot Chasing"

**What's Wrong:**
```md
| Legendary | 1% | Free session, merch discount, real-world reward |
```

**The Danger:**
If loot drop logic isn't idempotent, a user could:
- Refresh the page during loot animation
- Trigger the same workout completion webhook twice
- Receive duplicate legendary rewards (free sessions, discounts)

**Unsafe Implementation:**
```javascript
// ❌ DANGEROUS (no idempotency check)
async function grantLootDrop(userId, workoutId) {
  const rarity = rollLootRarity(); // Random roll
  
  // If this runs twice, user gets 2x rewards
  await UserInventory.create({
    userId,
    itemRarity: rarity,
    itemType: getRewardForRarity(rarity)
  });
}
```

**Safe Implementation:**
```javascript
// ✅ SAFE (idempotent with unique constraint)
async function grantLootDrop(userId, workoutId) {
  const transaction = await sequelize.transaction();
  try {
    // 1. Check if loot already granted for this workout
    const existing = await LootDrop.findOne({
      where: { userId, workoutId },
      transaction
    });
    
    if (existing) {
      // Already granted — return existing loot
      return existing;
    }
    
    // 2. Roll rarity
    const rarity = rollLootRarity();
    const reward = getRewardForRarity(rarity);
    
    // 3. Create loot record (unique constraint prevents duplicates)
    const lootDrop = await LootDrop.create({
      userId,
      workoutId,
      rarity,
      rewardType: reward.type,
      rewardValue: reward.value,
      grantedAt: new Date()
    }, { transaction });
    
    // 4. Grant reward to inventory (with duplicate protection)
    if (reward.type === 'item') {
      await UserInventory.create({
        userId,
        itemId: reward.itemId,
        acquiredFrom: 'loot_drop',
        lootDropId: lootDrop.id
      }, { transaction });
    } else if (reward.type === 'free_session') {
      await UserCredit.increment('freeSessionsRemaining', {
        by: 1,
        where: { userId },
        transaction
      });
    }
    
    await transaction.commit();
    return lootDrop;
  

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
