# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 83.7s
> **Files:** docs/ai-workflow/blueprints/SOCIAL-RPG-COMMUNITY-UPGRADE-PLAN.md
> **Generated:** 3/31/2026, 9:10:35 PM

---

# SwanStudios Social + RPG Community Platform — Data Safety Audit Report

**Auditor:** Data Safety Review  
**Date:** 2026-03-31  
**Scope:** SOCIAL-RPG-COMMUNITY-UPGRADE-PLAN.md  
**Classification:** PRODUCTION SYSTEM — Real User Data at Risk  
**Verdict:** ⚠️ **DO NOT DEPLOY Phase 1+ without addressing CRITICAL and HIGH findings**

---

## AUDIT SCOPE NOTE

This plan is primarily a **social/RPG community upgrade** document. The eight audit questions reference AI chat features (JSONB message arrays, R2 storage, voice recording, Gemini transcription) that are **not present in this plan document**. This indicates the audit questions were written for a *different* plan (likely an AI Chat upgrade plan) and applied to the wrong document.

**This audit will:**
1. Answer each question as it applies to *this plan* where applicable
2. Flag where questions reference features **absent from this plan** (itself a safety finding)
3. Audit the actual data safety risks present in this plan

---

## FINDING 1: AUDIT QUESTION MISMATCH — WRONG PLAN REVIEWED

**Severity: CRITICAL**  
**Category: Process Safety**

### Finding

The eight audit questions reference features that **do not exist in this plan document**:

| Audit Question | Referenced Feature | Present in This Plan? |
|---|---|---|
| Q1: Conversation JSONB growth | AI chat message storage | ❌ Not mentioned |
| Q3: R2 storage for attachments | File upload to ai-chat/ bucket | ❌ Not mentioned |
| Q4: Voice recording storage | Audio → Gemini transcription | ❌ Not mentioned |
| Q5: "Zero backend changes" Phase 1 | AI chat sidebar | ❌ Not mentioned |
| Q6: Concurrent JSONB access | Chat message race conditions | ❌ Not mentioned |
| Q7: Token usage tracking | AI message metadata | ❌ Not mentioned |
| Q2, Q8 | Soft delete, rate limiting | ✅ Partially applicable |

### Risk

If the AI Chat upgrade plan exists as a **separate unreviewed document**, it contains:
- JSONB unbounded growth risk (real PostgreSQL concern)
- Voice recording privacy exposure (GDPR/CCPA implications)
- R2 orphaned file accumulation (storage cost + data retention violation)
- Race conditions on concurrent writes

These are **unaudited production risks** if that plan is being implemented in parallel.

### Recommendation

```
IMMEDIATE ACTION REQUIRED:
1. Locate the AI Chat upgrade plan document
2. Submit it for a separate dedicated audit
3. Do NOT merge AI chat features into production until audited
4. Confirm which plan is currently in active development
5. Establish a document control process — each plan gets its own audit ticket
```

---

## FINDING 2: USER LOCATION DATA — PRIVACY & LEGAL EXPOSURE

**Severity: CRITICAL**  
**Category: Data Privacy / Legal Compliance**

### Finding

Section 3C introduces location-based discovery:

```
- Users set their city/area in profile settings
- "Near You" tab in Explore: shows events, communities, users in your area
- Privacy: exact location never shared — city/zip level only
- Area leaderboards: "Top 10 in Los Angeles this week"
```

New model proposed: `UserLocation.mjs — city/zip for location-based discovery (no exact coords)`

### Specific Risks

**Risk A: ZIP code is not anonymous**  
ZIP codes combined with age, gender, and fitness data can re-identify individuals with high accuracy. A ZIP + job class + faction + workout schedule is a **quasi-identifier fingerprint**. This is a documented de-anonymization vector (Sweeney, 1997 — 87% of Americans uniquely identified by ZIP + DOB + gender).

**Risk B: No consent model defined**  
The plan does not specify:
- Is location opt-in or opt-out?
- Is it stored encrypted?
- What is the retention policy?
- Can users delete their location data independently of their account?

**Risk C: CCPA/GDPR classification**  
Location data (even city-level) is classified as **personal data** under GDPR Article 4(1) and **sensitive personal information** under CCPA 2023. This triggers:
- Right to deletion (must be independently deletable)
- Right to know (must be disclosed in privacy policy)
- Data minimization requirement (collect only what's needed)
- Potential requirement for Data Protection Impact Assessment (DPIA)

**Risk D: No defined schema for UserLocation.mjs**  
The plan lists this as "new model needed" with no schema. Without explicit field definitions, a developer might store more precise location than intended.

**Risk E: "Near You" leaderboard reveals presence**  
"Top 10 in Los Angeles this week" tells a stalker that a specific user is currently active in Los Angeles. Combined with workout schedule patterns, this enables physical location prediction.

### Recommendation

```sql
-- UserLocation schema MUST include:
CREATE TABLE user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city VARCHAR(100),           -- "Los Angeles" — never street/neighborhood
  state_province VARCHAR(100),
  country_code CHAR(2),
  -- NEVER store: zip_code, coordinates, neighborhood, street
  location_consent BOOLEAN NOT NULL DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ,
  consent_ip_hash VARCHAR(64),  -- hashed, not raw IP
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ        -- soft delete for right-to-erasure
);

-- Index for discovery queries
CREATE INDEX idx_user_locations_city_country 
  ON user_locations(city, country_code) 
  WHERE deleted_at IS NULL;
```

```
REQUIRED BEFORE LAUNCH:
1. Location must be EXPLICIT OPT-IN with clear consent UI
2. Privacy policy must be updated before any location feature ships
3. Remove ZIP code from UserLocation — city + country only
4. Leaderboards must show display names only, never real names + location
5. Add location data to deletion cascade (ON DELETE CASCADE above)
6. Conduct DPIA if serving EU users
7. "Near You" must have a visible "Hide my location" toggle accessible in ≤2 taps
```

---

## FINDING 3: PARTY SYSTEM — ACCOUNT DELETION CASCADE FAILURE

**Severity: CRITICAL**  
**Category: Data Integrity / Referential Integrity**

### Finding

The plan explicitly raises this in Question 8:
> "What happens if a party member deletes their account mid-season?"

The plan does **not answer this question**. The proposed models `Party.mjs` + `PartyMember.mjs` have no defined schema, and the plan contains no cascade behavior specification.

### Specific Risks

**Risk A: Orphaned party records**  
If a party creator deletes their account and `PartyMember` has a foreign key to `users.id` without `ON DELETE CASCADE`, the deletion will either:
- **Fail silently** (if FK constraint is missing) — leaving ghost user references
- **Throw a FK violation** (if constraint exists) — blocking account deletion, which is a **GDPR/CCPA right-to-erasure violation**

**Risk B: Shared HP bar corruption**  
The party HP bar is described as a shared state. If a member's workout contributions are deleted with their account, the HP calculation becomes incorrect for remaining members. This affects real user experience and trust.

**Risk C: Party chat message orphaning**  
Party chat messages from a deleted user — do they show "[deleted user]"? Get removed? The plan doesn't specify. Removing them could break conversation context. Keeping them requires a tombstone pattern.

**Risk D: Season progress loss**  
If a party of 4 is mid-season and one member deletes, the remaining 3 lose their shared progress context. No recovery mechanism is defined.

**Risk E: Faction contribution orphaning**  
`UserFaction.mjs` tracks XP contributed to faction totals. If a user deletes their account, does their contributed XP remain in the faction total? If yes, the leaderboard is permanently inflated. If no, existing members lose earned standing.

### Recommendation

```sql
-- Party schema MUST handle deletion gracefully:
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  creator_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- SET NULL not CASCADE — party survives creator deletion
  season_id INTEGER,
  hp_current INTEGER NOT NULL DEFAULT 100,
  hp_max INTEGER NOT NULL DEFAULT 100,
  status VARCHAR(20) DEFAULT 'active' 
    CHECK (status IN ('active', 'disbanded', 'completed')),
  disbanded_at TIMESTAMPTZ,
  disbanded_reason VARCHAR(50),  -- 'creator_deleted', 'manual', 'season_end'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- SET NULL: member slot becomes vacant, not deleted
  display_name_snapshot VARCHAR(100), -- snapshot at join time for tombstone display
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  leave_reason VARCHAR(50)  -- 'voluntary', 'account_deleted', 'kicked'
);

-- Faction XP: freeze contributions on deletion, don't remove
-- Add to UserFaction:
ALTER TABLE user_factions ADD COLUMN account_deleted_at TIMESTAMPTZ;
-- Faction total XP remains; deleted user's slot shows "[Former Member]"
```

```
REQUIRED BEFORE LAUNCH:
1. Define explicit ON DELETE behavior for ALL new FK relationships
2. Implement account deletion dry-run: show user what party/faction data will be affected
3. Party disbands automatically if membership drops below 2 (not 1 orphaned record)
4. Faction XP contributions are frozen (not removed) on account deletion
5. Party chat tombstone: "[Member has left SwanStudios]" for deleted user messages
6. Add integration test: delete party creator → verify party still accessible to members
```

---

## FINDING 4: SOFT DELETE INTEGRITY — DELETED USERS IN SOCIAL GRAPH

**Severity: HIGH**  
**Category: Data Integrity**

### Finding

The plan activates existing models (`Community.mjs`, `CommunityMembership.mjs`, `UserFollow.mjs`, `EventManagement.mjs`) and creates new social graph relationships. The existing soft-delete pattern (`status='deleted'`) must be consistently applied across all new query paths.

### Specific Risks

**Risk A: Community member lists showing deleted users**  
When community routes are built, a `GET /api/social/communities/:id/members` query that JOINs `CommunityMembership` → `Users` without filtering `users.status != 'deleted'` will expose deleted user profiles.

**Risk B: Event attendance showing deleted users**  
`EventAttendance` records for deleted users will appear in RSVP lists unless explicitly filtered. "12 people are going" could include 3 deleted accounts.

**Risk C: Faction leaderboard ghost entries**  
`GET /api/social/factions/leaderboard` aggregating XP by faction will include deleted users' contributions in totals. The leaderboard count ("Vanguard: 47 members, 12,450 XP") will be inflated.

**Risk D: Live activity ticker broadcasting deleted user events**  
If a user deletes their account while a Socket.IO broadcast is in flight, the activity ticker could display "[deleted user] just completed Leg Day" — exposing that a now-deleted account existed.

**Risk E: UserFollow activation without soft-delete audit**  
`UserFollow.mjs` is described as "MODEL ONLY — Rich schema, no routes." When routes are added, the follow relationship queries need to filter both follower and followee for active status. A deleted user's followers should not receive their activity.

### Recommendation

```javascript
// Create a reusable scope for all social queries — add to User model:
// models/User.mjs
User.addScope('active', {
  where: { 
    status: { [Op.notIn]: ['deleted', 'suspended', 'banned'] }
  }
});

// ALL social graph queries MUST use this pattern:
// ❌ WRONG:
const members = await CommunityMembership.findAll({
  where: { community_id: communityId },
  include: [{ model: User }]
});

// ✅ CORRECT:
const members = await CommunityMembership.findAll({
  where: { community_id: communityId },
  include: [{ 
    model: User.scope('active'),
    required: true  // INNER JOIN — excludes deleted users entirely
  }]
});

// For leaderboards — exclude deleted users from aggregation:
// ❌ WRONG:
SELECT faction_id, SUM(xp_contributed) as total_xp 
FROM user_factions 
GROUP BY faction_id;

// ✅ CORRECT:
SELECT uf.faction_id, SUM(uf.xp_contributed) as total_xp
FROM user_factions uf
JOIN users u ON u.id = uf.user_id
WHERE u.status NOT IN ('deleted', 'suspended', 'banned')
  AND uf.account_deleted_at IS NULL
GROUP BY uf.faction_id;
```

```
REQUIRED BEFORE LAUNCH:
1. Code review checklist item: every new route that queries users must use User.scope('active')
2. Add database-level view: CREATE VIEW active_users AS SELECT * FROM users WHERE status NOT IN (...)
3. Live activity ticker: filter deleted users at Socket.IO broadcast layer, not just query layer
4. Write integration test for each new route: create user, soft-delete, verify they don't appear
5. Audit existing Community/Event models for soft-delete consistency before activating routes
```

---

## FINDING 5: CONCURRENT PARTY HP BAR — RACE CONDITION

**Severity: HIGH**  
**Category: Data Integrity / Concurrency**

### Finding

The party HP bar is described as a **shared mutable state**:
> "Everyone works out → HP stays full → party XP multiplier (1.25x)"
> "Someone misses → party takes 'damage' (visible to all members)"

This is a classic read-modify-write race condition. If two party members complete workouts simultaneously, both read `hp_current = 85`, both add their HP contribution, both write back — one write is lost.

### Specific Risk Scenario

```
Party HP: 70/100
Member A completes workout → reads 70 → calculates 70 + 15 = 85 → writes 85
Member B completes workout → reads 70 → calculates 70 + 15 = 85 → writes 85
Result: HP = 85 (should be 100)
Member B's workout contribution is silently lost
```

At small scale (2 DAU currently) this is rare. At 50+ DAU with parties of 3-5, this becomes a **daily occurrence** that erodes user trust in the core mechanic.

### Recommendation

```sql
-- Use atomic UPDATE with optimistic locking:
-- Option A: PostgreSQL atomic increment (preferred for simple HP changes)
UPDATE parties 
SET hp_current = LEAST(hp_max, hp_current + $hp_gain),
    updated_at = NOW()
WHERE id = $party_id
RETURNING hp_current, hp_max;

-- Option B: Row-level locking for complex HP calculations
BEGIN;
SELECT hp_current, hp_max 
FROM parties 
WHERE id = $party_id 
FOR UPDATE;  -- Exclusive row lock

-- Calculate new HP here
UPDATE parties SET hp_current = $new_hp WHERE id = $party_id;
COMMIT;

-- Option C: Sequelize implementation
await Party.increment('hp_current', { 
  by: hpGain, 
  where: { id: partyId },
  // Add cap via raw query or post-update normalization
});
// Then cap at hp_max:
await Party.update(
  { hp_current: sequelize.literal(`LEAST(hp_max, hp_current)`) },
  { where: { id: partyId } }
);
```

```javascript
// For the XP multiplier calculation — use database value, never client value:
// ❌ WRONG

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
