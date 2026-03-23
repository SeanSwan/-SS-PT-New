# Gamification Phase 2/3/6 + Security Hardening Master Prompt

> **Author:** Claude Opus 4.6 (CEO) | **Date:** 2026-03-23
> **AI Village Validated:** Pending
> **Prerequisite:** GAMIFICATION-PSYCHOLOGY-ENHANCEMENT-MASTER-PROMPT.md (Phase 1 complete)
> **Scope:** Security fixes, Phase 2 completion, Phase 3 social, Phase 6 architecture

---

## 1. SECURITY HARDENING (P0 — Fix Before Any Feature Work)

### Security Audit Summary (20 vulnerabilities found)

| # | Severity | Vulnerability | Impact |
|---|----------|--------------|--------|
| 1 | **CRITICAL** | IDOR: clients can access any user's gamification data | Data breach |
| 2 | **CRITICAL** | No idempotency: replay attacks for unlimited points | Economic exploit |
| 3 | **CRITICAL** | No upper bound on point values in awardPoints | Point inflation |
| 4 | HIGH | useStreakFreeze no ownership check | Grief other users |
| 5 | HIGH | getStreakFreezeStatus no ownership check | Privacy leak |
| 6 | HIGH | Trainers can record workouts for any user | Point farming |
| 7 | HIGH | Surprise multiplier daily cap trusts caller metadata | Bypass cap |
| 8 | HIGH | Race condition in Engine.awardPoints (no transaction) | Double awards |
| 9 | HIGH | Persistence double-multiplier on certain actions | Point inflation |
| 10 | HIGH | Redis-only methods crash in prod, bypass rate limits | Bypass all limits |
| 11 | HIGH | Streak freeze race condition (no locking) | Exceed max freezes |
| 12 | MEDIUM | updateRules only modifies in-memory state | Lost on restart |
| 13 | MEDIUM | EthicalGamification guardrails are 100% stubs | Zero protection |
| 14 | MEDIUM | Leaderboard no pagination limit cap | DoS vector |
| 15 | MEDIUM | Error messages leak internal details | Info disclosure |
| 16 | MEDIUM | debugSeedAchievements runs raw SQL/require() | Code execution risk |
| 17 | MEDIUM | Math.random() used despite crypto claim | Predictable rolls |
| 18 | LOW | Settings/leaderboard expose config publicly | PII exposure |
| 19 | LOW | Achievement hard delete destroys audit trail | Data loss |
| 20 | LOW | Milestone hard delete destroys audit trail | Data loss |

### Security Fix Implementation Plan

#### Fix 1: IDOR Ownership Middleware (CRITICAL)
**File:** `backend/routes/gamificationRoutes.mjs`
**Fix:** Create `authorizeOwnerOrAdmin` middleware that verifies `req.params.userId == req.user.id` for client role. Trainers see their assigned clients only. Admins see all.

```javascript
const authorizeOwnerOrAdmin = (req, res, next) => {
  const targetUserId = parseInt(req.params.userId || req.body.userId);
  const requesterId = req.user?.id;
  const role = req.user?.role;

  if (role === 'admin') return next();
  if (role === 'trainer') return next(); // TODO: check trainer-client assignment
  if (targetUserId === requesterId) return next();

  return res.status(403).json({
    success: false,
    error: 'You can only access your own gamification data'
  });
};
```

Apply to: getUserProfile, getUserTransactions, getStreakFreezeStatus, useStreakFreeze, redeemReward

#### Fix 2: Idempotency Keys (CRITICAL)
**File:** `backend/controllers/gamificationController.mjs`
**Fix:** Add unique constraint on PointTransaction: `(userId, source, sourceId, DATE(createdAt))`. Before awarding points, check if a matching transaction exists.

```javascript
// In awardPoints controller method:
const existingTransaction = await PointTransaction.findOne({
  where: {
    userId,
    source: source || 'manual',
    sourceId: sourceId || null,
    createdAt: { [Op.gte]: startOfToday }
  },
  transaction: t
});
if (existingTransaction) {
  return res.status(409).json({
    success: false,
    error: 'Points already awarded for this action'
  });
}
```

#### Fix 3: Input Validation (CRITICAL)
**File:** `backend/controllers/gamificationController.mjs`
**Fix:** Add validation to awardPoints endpoint:

```javascript
const MAX_SINGLE_AWARD = 500;
const points = parseInt(req.body.points);
if (!Number.isInteger(points) || points < 1 || points > MAX_SINGLE_AWARD) {
  return res.status(400).json({
    success: false,
    error: `Points must be between 1 and ${MAX_SINGLE_AWARD}`
  });
}
```

Also cap `pointsMultiplier` in updateSettings to max 5.0.

#### Fix 4: Streak Freeze Ownership (HIGH)
**File:** `backend/controllers/gamificationController.mjs`
**Fix:** In useStreakFreeze and getStreakFreezeStatus, force `userId = req.user.id` for client role. Only admin/trainer can specify a different userId.

#### Fix 5: Surprise Multiplier DB-Level Cap (HIGH)
**File:** `backend/services/gamification/GamificationEngine.mjs`
**Fix:** Query PointTransaction for today's surprise multiplier count instead of trusting metadata:

```javascript
const todaySurprises = await PointTransaction.count({
  where: {
    userId,
    metadata: { surpriseMultiplier: { [Op.ne]: null } },
    createdAt: { [Op.gte]: startOfToday }
  }
});
```

#### Fix 6: Transaction Wrapping (HIGH)
**File:** `backend/services/gamification/GamificationEngine.mjs`
**Fix:** Wrap awardPoints in a database transaction with SELECT FOR UPDATE on the Gamification row:

```javascript
const result = await sequelize.transaction(async (t) => {
  const gamRecord = await Gamification.findOne({
    where: { userId },
    lock: t.LOCK.UPDATE,
    transaction: t
  });
  // ... award points, check level up, check achievements
});
```

#### Fix 7: Persistence PostgreSQL Fallbacks (HIGH)
**File:** `backend/services/gamification/GamificationPersistence.mjs`
**Fix:** Every method that calls `this.redis.*` must check `this.redisEnabled` first and fall through to a Sequelize query. Priority methods:
- `getCurrentStreak` → query Gamification model
- `getActionCountToday` → query PointTransaction with date filter
- `getUserLeaderboardRank` → query Gamification ordered by totalXP
- `hasAchievement` → query UserAchievement

#### Fix 8: EthicalGamification Real Implementation (MEDIUM)
**File:** `backend/services/gamification/EthicalGamification.mjs`
**Fix:** Replace stub methods with real database queries:
- `getRecentActions(userId)` → query PointTransaction last 5 minutes
- `getDailyActionCount(userId, action)` → query PointTransaction today
- `getCurrentSessionLength(userId)` → calculate from login timestamp

#### Fix 9: Pagination Cap (MEDIUM)
**Fix:** `const limit = Math.min(parseInt(req.query.limit) || 10, 100);`

#### Fix 10: Error Message Sanitization (MEDIUM)
**Fix:** Replace `error: error.message` with `error: 'An error occurred'` in all non-admin responses. Keep detailed errors for admin role only.

#### Fix 11: Soft Delete for Achievements/Milestones (LOW)
**Fix:** Change hard delete to `isActive: false` update pattern per CLAUDE.md convention.

---

## 2. PHASE 2 COMPLETION — Celebration & Re-engagement

### 2a. Post-Workout Celebration Screen
**Psychology:** Peak-End Rule (Kahneman, 1999) — the peak moment and ending of an experience disproportionately affect how it's remembered and evaluated.

**Components to build:**
1. `PostWorkoutCelebration.tsx` — Full-screen overlay after workout save
2. `XPCounter.tsx` — Animated XP count-up with easeOutExpo + tabular-nums
3. `ParticleBurst.tsx` — GPU-composited particles (transform/opacity only)

**XP Counter Spec:**
- Duration: 800ms-1500ms (dynamic based on delta)
- Easing: easeOutExpo — `t === 1 ? 1 : 1 - Math.pow(2, -10 * t)`
- Increment logic: <100 count by 1s, <1000 by 5s, 1000+ by 25s
- Font: Fira Code with `font-variant-numeric: tabular-nums`
- Final value: guaranteed exact with onComplete callback
- prefers-reduced-motion: instant fill, no animation

**Particle Burst Spec:**
- 12-20 particles per burst (rarity determines count)
- Colors: Tier-specific (Bronze=#CD7F32, Silver=#C0C0C0, Gold=#C6A84B, etc.)
- Duration: 1.5s fade, random velocity vectors
- GPU-composited: transform + opacity ONLY (no width/height/top/left)
- Canvas-based for performance (not DOM elements)

**Celebration Flow:**
1. Workout saved → 500ms delay → overlay fades in (opacity 0→1, 300ms)
2. XP counter animates (800-1500ms with easeOutExpo)
3. If surprise multiplier: show "Double XP Surge!" label with gold glow
4. If level up: tier-colored radial glow pulse + particle burst
5. If achievement unlocked: badge scales 0→1.1→1.0 with spring easing
6. Auto-dismiss after 5s or tap anywhere to dismiss

### 2b. Comeback Challenges (Re-engagement)
**Psychology:** Loss Aversion + Commitment/Consistency — users who've invested effort hate abandoning progress.

**Triggers:**
- 24h missed: Gentle push notification "Your streak needs you!"
- 48h missed: If streak freeze available, auto-prompt to use it
- 7d missed: "Welcome Back Challenge" — complete 3 workouts this week for 2x XP
- 30d missed: "Fresh Start" — reset expectations, offer reduced daily goal

**Implementation:**
1. Add `lastActivityDate` check in daily cron job
2. Create `ComebackChallenge` model (userId, type, startDate, endDate, reward, status)
3. Frontend: `ComebackBanner.tsx` — dismissible banner at top of dashboard
4. Backend: `POST /api/gamification/comeback-challenge/accept`

### 2c. Row-Level Locks for XP Awards
**Pattern:** PostgreSQL `SELECT ... FOR UPDATE` within a transaction

```javascript
// Acquire exclusive lock on user's gamification row
const gamRecord = await Gamification.findOne({
  where: { userId },
  lock: transaction.LOCK.UPDATE, // SELECT FOR UPDATE
  transaction
});

// Now safe to read, modify, and write
gamRecord.totalXP += pointsToAward;
gamRecord.level = calculateLevel(gamRecord.totalXP);
await gamRecord.save({ transaction });
```

This prevents concurrent requests from reading stale XP totals.

---

## 3. PHASE 3 — Social Psychology Features

### 3a. WebSocket Live Activity Feed
**Architecture:**
```
Client Browser ←→ Socket.IO ←→ Express Server ←→ Redis Pub/Sub (adapter)
                                                  ↕
                                              PostgreSQL
```

**Setup (5-10 lines in socket.mjs):**
```javascript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

**Event Types:**
| Event | Data | Debounce |
|-------|------|----------|
| `workout_completed` | userId, username, workoutName, xpEarned | 30s per user |
| `achievement_unlocked` | userId, username, achievementName, rarity | None |
| `level_up` | userId, username, newLevel, newTier | None |
| `streak_milestone` | userId, username, streakDays | None |

**Client-side debounce (30s):**
```javascript
const lastEmission = useRef<Record<string, number>>({});
const shouldEmit = (event: string, userId: number) => {
  const key = `${event}:${userId}`;
  const now = Date.now();
  if (now - (lastEmission.current[key] || 0) < 30000) return false;
  lastEmission.current[key] = now;
  return true;
};
```

**Fallback:** If WebSocket fails, fall back to polling `/api/gamification/activity-feed?since=<timestamp>` every 60s.

### 3b. Leaderboard Alerts
**Psychology:** Social Proof + FOMO — "Sarah just passed you on the weekly leaderboard!"

**Implementation:**
- After point award, check if user's new rank passed anyone
- If passed someone, emit `rank_change` event to both users
- Limit: max 1 alert per user per hour (prevent spam)
- Opt-in setting: `notifyOnRankChange: boolean` in user preferences
- UI: Toast notification with 5s auto-dismiss

### 3c. Weekly Recap Cards
**Inspired by:** Spotify Wrapped, Strava Weekly Report

**Content:**
- Total workouts this week vs last week (↑/↓ indicator)
- Total XP earned + surprise multipliers received
- Current streak + longest streak
- Rank change on leaderboard
- Top exercise (most completed)
- "Stat of the week" — one highlighted metric that improved

**Implementation:**
- Backend: `GET /api/gamification/weekly-recap` (computed from PointTransaction + Gamification tables)
- Frontend: `WeeklyRecapCard.tsx` — carousel-style card with swipe-through stats
- Trigger: Show on Monday morning login (or first login after Sunday midnight)

---

## 4. PHASE 6 — Architecture Decomposition (Strangler Fig)

### Problem
`gamificationController.mjs` is 2480 lines — 8x over the 300-line limit.

### Strangler Fig Strategy
1. **Create new service files** for each domain:
   - `GamificationPointsService.mjs` — point award logic, validation, idempotency
   - `GamificationAchievementService.mjs` — achievement CRUD, progress checks
   - `GamificationLeaderboardService.mjs` — leaderboard queries, rank calculations
   - `GamificationStreakService.mjs` — streak tracking, freeze logic, comeback
   - `GamificationRewardService.mjs` — reward redemption, marketplace

2. **Delegate from controller** — each controller method calls the appropriate service:
   ```javascript
   import { GamificationPointsService } from '../services/gamification/GamificationPointsService.mjs';

   awardPoints: async (req, res) => {
     const result = await GamificationPointsService.awardPoints(userId, points, options);
     return res.json({ success: true, data: result });
   }
   ```

3. **Test new services** — >90% coverage before removing old logic

4. **Remove old logic** — once services are proven, remove duplicated code from controller

### File Structure After Decomposition
```
backend/services/gamification/
├── GamificationEngine.mjs          (orchestrator — delegates to services)
├── GamificationPersistence.mjs     (data access layer)
├── EthicalGamification.mjs         (guardrails)
├── GamificationPointsService.mjs   (NEW — points, multipliers, validation)
├── GamificationAchievementService.mjs (NEW — achievements, progress)
├── GamificationLeaderboardService.mjs (NEW — rankings, social)
├── GamificationStreakService.mjs    (NEW — streaks, freezes, comeback)
└── GamificationRewardService.mjs   (NEW — rewards, marketplace)
```

---

## 5. AI Village Validation Checklist

Before implementation, AI Village must verify:

### Security
- [ ] IDOR ownership checks on all user-specific endpoints
- [ ] Idempotency key design prevents replay attacks
- [ ] Input validation bounds are reasonable
- [ ] Transaction safety for concurrent operations
- [ ] Error messages don't leak internal details

### Performance
- [ ] Celebration animations use GPU-composited properties only
- [ ] WebSocket debounce prevents UI thrashing
- [ ] Leaderboard queries are indexed and capped
- [ ] Weekly recap query doesn't scan full transaction history

### Psychology (Ethical)
- [ ] Comeback challenges are encouraging, not shaming
- [ ] Leaderboard alerts are opt-in, not forced
- [ ] Celebration screens auto-dismiss (not blocking)
- [ ] Ethical guardrails are actually functional (not stubs)

### Accessibility
- [ ] Celebration screen respects prefers-reduced-motion
- [ ] XP counter has aria-live for screen readers
- [ ] All new components have 44px touch targets
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1)

### Blueprint Compliance
- [ ] All new files have 7-Star documentation headers
- [ ] All files under 300 lines (or documented exception)
- [ ] Parent-child relationships documented in blueprints
- [ ] Click-outcome flowcharts for interactive elements

---

## 6. Implementation Order (Back-to-Back Sprints)

| Sprint | Scope | Priority |
|--------|-------|----------|
| **Sprint 1** | Security fixes #1-#3 (CRITICAL) | P0 — deploy blocker |
| **Sprint 2** | Security fixes #4-#11 (HIGH) | P0 — deploy blocker |
| **Sprint 3** | Phase 2: Celebration screen + XP counter | P1 |
| **Sprint 4** | Phase 2: Comeback challenges + row-level locks | P1 |
| **Sprint 5** | Phase 3: WebSocket activity feed | P2 |
| **Sprint 6** | Phase 3: Leaderboard alerts + weekly recap | P2 |
| **Sprint 7** | Phase 6: Strangler Fig decomposition | P3 |
| **Sprint 8** | Security fixes #12-#20 (MEDIUM/LOW) | P3 |

All sprints execute sequentially without stopping for permissions.
Blueprint every file along the way per CLAUDE.md protocol.
Playwright QA on production after all sprints complete.

---

*SwanStudios Gamification Phase 2/3/6 + Security Hardening Master Prompt*
*Claude Opus 4.6 — CEO, SwanStudios AI Village*
