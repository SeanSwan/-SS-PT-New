# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 64.1s
> **Files:** backend/models/Goal.mjs, backend/models/associations.mjs
> **Generated:** 3/21/2026, 12:22:48 AM

---

# 🚨 DATA SAFETY AUDIT REPORT — CRITICAL FINDINGS

## ⚠️ EXECUTIVE SUMMARY
**OVERALL RISK LEVEL: MEDIUM-HIGH**

The Goal model and associations file contain **NO CRITICAL destructive operations**, but have **SIGNIFICANT data integrity and safety gaps** that could lead to data loss, orphaned records, or corrupted user state during normal operations.

---

## 🔴 CRITICAL FINDINGS

### ❌ CRITICAL #1: Missing CASCADE Delete Protection on Goal Deletion
**Severity:** CRITICAL  
**Data at Risk:** GoalSupporter, GoalComment, GoalLike, GoalMilestone records  
**Blast Radius:** All users who interacted with a deleted goal (supporters, commenters, likers)  
**File & Line:** `backend/models/Goal.mjs` (entire model), `backend/models/associations.mjs` lines 538-558

**What's Wrong:**
When a user deletes a Goal, the foreign key associations to `GoalSupporter`, `GoalComment`, `GoalLike`, and `GoalMilestone` do **NOT** specify `onDelete` behavior. This means:
- If a Goal is deleted, related records become **orphaned** (pointing to non-existent goalId)
- Queries like "show me goals I'm supporting" will **fail or return corrupt data**
- No transaction wrapper ensures atomic deletion of Goal + related records

**Current Code (associations.mjs):**
```javascript
Goal.hasMany(GoalSupporter, { foreignKey: 'goalId', as: 'supporterLinks' });
GoalSupporter.belongsTo(Goal, { foreignKey: 'goalId', as: 'goal' });
// ❌ NO onDelete: 'CASCADE' or 'SET NULL' specified
```

**Fix:**
```javascript
// In associations.mjs
Goal.hasMany(GoalSupporter, { 
  foreignKey: 'goalId', 
  as: 'supporterLinks',
  onDelete: 'CASCADE' // ✅ Delete supporters when goal is deleted
});
GoalSupporter.belongsTo(Goal, { 
  foreignKey: 'goalId', 
  as: 'goal',
  onDelete: 'CASCADE'
});

// Apply same fix to GoalComment, GoalLike, GoalMilestone
Goal.hasMany(GoalComment, { 
  foreignKey: 'goalId', 
  as: 'comments',
  onDelete: 'CASCADE' 
});
Goal.hasMany(GoalLike, { 
  foreignKey: 'goalId', 
  as: 'likes',
  onDelete: 'CASCADE' 
});
Goal.hasMany(GoalMilestone, { 
  foreignKey: 'goalId', 
  as: 'milestoneCheckpoints',
  onDelete: 'CASCADE' 
});

// ✅ ALSO add database-level CASCADE in migration:
// ALTER TABLE goal_supporters ADD CONSTRAINT fk_goal_supporters_goal
//   FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE;
```

---

### ❌ CRITICAL #2: User Deletion Could Orphan All Goals
**Severity:** CRITICAL  
**Data at Risk:** All Goal records for deleted user  
**Blast Radius:** All goals created by a user (could be 100+ goals)  
**File & Line:** `backend/models/associations.mjs` line 532

**What's Wrong:**
```javascript
User.hasMany(Goal, { foreignKey: 'userId', as: 'goals' });
Goal.belongsTo(User, { foreignKey: 'userId', as: 'user' });
// ❌ NO onDelete behavior specified
```

If a User account is deleted (GDPR request, admin action, account closure):
- All their Goals remain in database with **invalid userId**
- `Goal.belongsTo(User)` queries will **fail**
- Progress tracking, leaderboards, and social features will **break**

**Fix:**
```javascript
// Option A: Prevent user deletion if they have active goals
User.hasMany(Goal, { 
  foreignKey: 'userId', 
  as: 'goals',
  onDelete: 'RESTRICT' // ✅ Block user deletion if goals exist
});

// Option B: Soft-delete goals when user is deleted
User.hasMany(Goal, { 
  foreignKey: 'userId', 
  as: 'goals',
  onDelete: 'CASCADE' // ⚠️ Deletes all goals (use with caution)
});

// ✅ RECOMMENDED: Add a pre-delete hook in User model
User.beforeDestroy(async (user, options) => {
  const activeGoals = await Goal.count({ 
    where: { userId: user.id, status: ['active', 'paused'] } 
  });
  if (activeGoals > 0) {
    throw new Error('Cannot delete user with active goals. Archive goals first.');
  }
});
```

---

## 🟠 HIGH SEVERITY FINDINGS

### ⚠️ HIGH #1: No Transaction Wrapper in `updateProgress()` Method
**Severity:** HIGH  
**Data at Risk:** Goal progress history, milestone state, XP rewards  
**Blast Radius:** Single user's goal (but could corrupt leaderboard/stats)  
**File & Line:** `backend/models/Goal.mjs` lines 285-324

**What's Wrong:**
The `updateProgress()` instance method performs **multiple state changes** without a transaction:
1. Updates `currentValue`
2. Updates `progressPercentage`
3. Appends to `progressHistory` JSONB array
4. Checks and updates `milestones` JSONB array
5. Potentially changes `status` to 'completed'
6. Calls `this.save()`

If `this.save()` fails (database timeout, constraint violation), the in-memory object is **partially modified** but not persisted, leading to:
- Progress history showing incorrect values
- Milestones marked as achieved but not saved
- XP rewards not granted

**Current Code:**
```javascript
async updateProgress(newValue, notes = null) {
  const oldValue = this.currentValue;
  
  this.currentValue = Math.max(0, newValue);
  this.progressPercentage = this.calculateProgressPercentage();
  this.lastProgressUpdate = new Date();
  
  // ❌ Multiple mutations without transaction
  if (!this.progressHistory) this.progressHistory = [];
  this.progressHistory.push({ /* ... */ });
  
  if (this.progressPercentage >= 100 && this.status === 'active' && this.autoComplete) {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  this.checkMilestones(); // ❌ Mutates this.milestones
  
  await this.save(); // ❌ Single point of failure
  return this;
}
```

**Fix:**
```javascript
async updateProgress(newValue, notes = null, transaction = null) {
  const t = transaction || await db.transaction();
  
  try {
    const oldValue = this.currentValue;
    
    this.currentValue = Math.max(0, newValue);
    this.progressPercentage = this.calculateProgressPercentage();
    this.lastProgressUpdate = new Date();
    
    if (!this.progressHistory) this.progressHistory = [];
    this.progressHistory.push({
      date: new Date().toISOString(),
      value: this.currentValue,
      change: this.currentValue - oldValue,
      percentage: this.progressPercentage,
      notes: notes
    });
    
    if (this.progressPercentage >= 100 && this.status === 'active' && this.autoComplete) {
      this.status = 'completed';
      this.completedAt = new Date();
      
      // ✅ Award XP in same transaction
      if (this.xpReward > 0) {
        await Gamification.increment('totalXP', {
          by: this.xpReward,
          where: { userId: this.userId },
          transaction: t
        });
      }
    }
    
    this.checkMilestones();
    
    await this.save({ transaction: t });
    
    if (!transaction) await t.commit(); // ✅ Only commit if we created the transaction
    return this;
  } catch (error) {
    if (!transaction) await t.rollback();
    throw error;
  }
}
```

---

### ⚠️ HIGH #2: JSONB Array Mutation Without Concurrency Protection
**Severity:** HIGH  
**Data at Risk:** `progressHistory`, `milestones`, `supporters` JSONB arrays  
**Blast Radius:** Single goal (but could lose weeks of progress history)  
**File & Line:** `backend/models/Goal.mjs` lines 298-306, 311-320

**What's Wrong:**
JSONB array mutations like `this.progressHistory.push()` are **NOT atomic** in PostgreSQL. If two requests call `updateProgress()` simultaneously:
1. Request A reads `progressHistory = [entry1, entry2]`
2. Request B reads `progressHistory = [entry1, entry2]`
3. Request A pushes entry3, saves `[entry1, entry2, entry3]`
4. Request B pushes entry4, saves `[entry1, entry2, entry4]` ← **entry3 is lost**

**Current Code:**
```javascript
if (!this.progressHistory) this.progressHistory = [];
this.progressHistory.push({ /* ... */ }); // ❌ Race condition
await this.save();
```

**Fix:**
```javascript
// Use PostgreSQL's jsonb_insert or array append operator
await Goal.update({
  progressHistory: db.fn('jsonb_insert', 
    db.col('progressHistory'), 
    '{-1}', // Append to end
    JSON.stringify({
      date: new Date().toISOString(),
      value: newValue,
      change: newValue - this.currentValue,
      percentage: this.calculateProgressPercentage(),
      notes: notes
    })
  ),
  currentValue: newValue,
  progressPercentage: this.calculateProgressPercentage(),
  lastProgressUpdate: new Date()
}, {
  where: { id: this.id },
  transaction: t
});

// ✅ Alternative: Use raw SQL for atomic JSONB append
await db.query(`
  UPDATE goals 
  SET progress_history = progress_history || $1::jsonb,
      current_value = $2,
      progress_percentage = $3,
      last_progress_update = NOW()
  WHERE id = $4
`, {
  bind: [
    JSON.stringify([{ date: new Date(), value: newValue, ... }]),
    newValue,
    this.calculateProgressPercentage(),
    this.id
  ],
  transaction: t
});
```

---

### ⚠️ HIGH #3: Missing Validation on `deadline` Field Update
**Severity:** HIGH  
**Data at Risk:** Goal deadline integrity, overdue calculations  
**Blast Radius:** Single goal (but breaks analytics/reminders)  
**File & Line:** `backend/models/Goal.mjs` lines 127-133

**What's Wrong:**
The `deadline` field has validation **only on creation**:
```javascript
deadline: {
  type: DataTypes.DATE,
  allowNull: false,
  validate: {
    isDate: true,
    isAfter: new Date().toISOString() // ❌ Only checked on INSERT
  }
}
```

If a goal is updated with `goal.deadline = pastDate; goal.save()`, Sequelize **does NOT re-run validators**. This allows:
- Setting deadline to past dates (breaks `isOverdue()` logic)
- Setting deadline before `startDate` (impossible timeline)
- Setting deadline to invalid date strings

**Fix:**
```javascript
// Add a beforeUpdate hook
Goal.beforeUpdate(async (goal, options) => {
  if (goal.changed('deadline')) {
    const newDeadline = new Date(goal.deadline);
    const startDate = new Date(goal.startDate);
    const now = new Date();
    
    // ✅ Validate deadline is in the future (unless goal is already completed)
    if (goal.status !== 'completed' && newDeadline < now) {
      throw new Error('Deadline cannot be in the past for active goals');
    }
    
    // ✅ Validate deadline is after start date
    if (newDeadline <= startDate) {
      throw new Error('Deadline must be after start date');
    }
    
    // ✅ Recalculate estimated completion if progress exists
    if (goal.progressPercentage > 0) {
      goal.estimatedCompletionDate = goal.calculateEstimatedCompletion();
    }
  }
});
```

---

## 🟡 MEDIUM SEVERITY FINDINGS

### ⚠️ MEDIUM #1: No Safeguard Against Mass Goal Deletion
**Severity:** MEDIUM  
**Data at Risk:** All goals for a user  
**Blast Radius:** Single user (but could be 50+ goals)  
**File & Line:** N/A (missing from codebase)

**What's Wrong:**
There is **NO code** preventing a single API call from deleting all of a user's goals:
```javascript
// Hypothetical vulnerable endpoint
await Goal.destroy({ where: { userId: req.user.id } }); 
// ❌ Deletes ALL goals with no confirmation, no undo
```

**Fix:**
```javascript
// Add a class method with safety checks
Goal.safeDelete = async function(goalId, userId, options = {}) {
  const { confirmationToken, transaction } = options;
  
  // ✅ Require explicit confirmation for active goals
  const goal = await Goal.findOne({ 
    where: { id: goalId, userId },
    transaction 
  });
  
  if (!goal) {
    throw new Error('Goal not found');
  }
  
  if (goal.status === 'active' && !confirmationToken) {
    throw new Error('Active goals require confirmation token to delete');
  }
  
  // ✅ Soft delete instead of hard delete
  goal.status = 'cancelled';
  goal.cancelledAt = new Date();
  await goal.save({ transaction });
  
  return goal;
};

// ✅ Add a bulk delete limit
Goal.bulkDelete = async function(userId, goalIds, transaction) {
  if (goalIds.length > 10) {
    throw new Error('Cannot delete more than 10 goals at once. Contact support for bulk operations.');
  }
  
  return Goal.update(
    { status: 'cancelled', cancelledAt: new Date() },
    { where: { id: goalIds, userId }, transaction }
  );
};
```

---

### ⚠️ MEDIUM #2: XP Reward Not Granted Atomically with Goal Completion
**Severity:** MEDIUM  
**Data at Risk:** User XP balance, achievement progress  
**Blast Radius:** Single user  
**File & Line:** `backend/models/Goal.mjs` lines 311-315

**What's Wrong:**
When a goal auto-completes, the XP reward is **NOT automatically granted**:
```javascript
if (this.progressPercentage >= 100 && this.status === 'active' && this.autoComplete) {
  this.status = 'completed';
  this.completedAt = new Date();
  // ❌ No XP grant here — must be done in separate API call
}
```

If the API endpoint forgets to grant XP, or if the request fails after `goal.save()` but before XP grant, the user **loses their reward permanently**.

**Fix:**
```javascript
// In updateProgress method, after setting status to 'completed'
if (this.progressPercentage >= 100 && this.status === 'active' && this.autoComplete) {
  this.status = 'completed';
  this.completedAt = new Date();
  
  // ✅ Grant XP in same transaction
  if (this.xpReward > 0 || this.completionBonus > 0) {
    const totalXP = this.xpReward + this.completionBonus;
    
    await Gamification.increment('totalXP', {
      by: totalXP,
      where: { userId: this.userId },

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
