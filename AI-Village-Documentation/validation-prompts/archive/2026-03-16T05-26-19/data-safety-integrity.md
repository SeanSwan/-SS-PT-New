# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 53.7s
> **Files:** backend/controllers/adminClientController.mjs, backend/seeders/20260315000001-seed-manifest-achievements.cjs, frontend/src/utils/badgeImageResolver.ts
> **Generated:** 3/15/2026, 10:26:19 PM

---

# 🚨 DATA SAFETY AUDIT REPORT — CRITICAL FINDINGS

## EXECUTIVE SUMMARY
**OVERALL RISK LEVEL: HIGH**  
**CRITICAL FINDINGS: 3**  
**HIGH FINDINGS: 4**  
**MEDIUM FINDINGS: 2**

This audit identified **MULTIPLE CRITICAL DATA LOSS RISKS** that could destroy user data, corrupt authentication, or orphan financial records in production. The most severe issues involve unsafe seeder patterns, missing transaction rollback paths, and batch operations without safeguards.

---

## ❌ CRITICAL FINDINGS (Immediate Action Required)

### CRITICAL-1: Seeder Can Wipe All Achievements on Re-run
**Severity:** CRITICAL  
**Data at Risk:** All 242 achievements + ALL UserAchievements progress records  
**Blast Radius:** ALL USERS — every client loses workout milestones, streak badges, certification progress  
**File:** `backend/seeders/20260315000001-seed-manifest-achievements.cjs`  
**Lines:** 266-268

**What's Wrong:**
```javascript
async down(queryInterface) {
  await queryInterface.bulkDelete('Achievements', null, {});
}
```

The `down()` migration **DELETES ALL ACHIEVEMENTS WITHOUT A WHERE CLAUSE**. If an admin runs `npx sequelize-cli db:seed:undo` (common during debugging), this will:
1. Delete all 242 achievements from the database
2. **CASCADE DELETE all UserAchievements records** (if FK has `ON DELETE CASCADE`)
3. Destroy years of user progress (streaks, milestones, certifications)
4. Break the gamification system permanently (orphaned references)

**Why This Happens:**
- Sequelize seeders are often run/undone during development
- Production deployments may accidentally trigger `db:seed:undo:all`
- No confirmation prompt or safety check exists
- `null` where clause = "delete everything"

**Fix:**
```javascript
async down(queryInterface) {
  // SAFETY: Never delete achievements in production (breaks UserAchievements FK)
  // If you MUST reset (dev only), use explicit WHERE clause:
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    console.warn('[SAFETY] Skipping achievement deletion in production');
    return;
  }

  // Dev-only: Delete only seeded achievements (preserve custom ones)
  const manifestPath = path.resolve(__dirname, '../../scripts/achievement-badge-manifest.json');
  if (!fs.existsSync(manifestPath)) return;
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const templateIds = manifest.templates.map(t => t.name);
  
  await queryInterface.bulkDelete('Achievements', {
    name: { [Sequelize.Op.in]: templateIds }
  }, {});
  
  console.log(`[Dev] Deleted ${templateIds.length} seeded achievements`);
}
```

---

### CRITICAL-2: Batch Workout Count Query Vulnerable to Memory Exhaustion
**Severity:** CRITICAL  
**Data at Risk:** API availability, database connection pool  
**Blast Radius:** ALL USERS — admin dashboard becomes unusable, blocks other queries  
**File:** `backend/controllers/adminClientController.mjs`  
**Lines:** 327-343

**What's Wrong:**
```javascript
const clientIds = clients.map(c => c.id);

let workoutCountMap = {};
if (WorkoutSession?.findAll && clientIds.length > 0) {
  const workoutCounts = await WorkoutSession.findAll({
    attributes: [
      'userId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'total']
    ],
    where: { userId: { [Op.in]: clientIds }, status: 'completed' },
    group: ['userId'],
    raw: true
  });
```

**The Problem:**
- If `clientIds.length` is 1000+ (large gym with many clients), the `IN` clause becomes massive
- PostgreSQL query planner may choose a slow execution path (sequential scan)
- No `LIMIT` on the aggregation query — could scan millions of workout records
- No timeout set — query could run for minutes, blocking connection pool
- If WorkoutSession table has 100K+ rows, this query could OOM the Node.js process

**Scenario:**
1. Admin loads client list with `limit=100` (100 clients)
2. Each client has 500 completed workouts = 50,000 rows to scan
3. Query takes 30+ seconds, times out, crashes the API
4. All other admin requests queue behind this, cascade failure

**Fix:**
```javascript
const clientIds = clients.map(c => c.id);

// SAFETY: Limit batch size to prevent query explosion
const MAX_BATCH_SIZE = 100;
if (clientIds.length > MAX_BATCH_SIZE) {
  logger.warn(`Batch count skipped: ${clientIds.length} clients exceeds safe limit (${MAX_BATCH_SIZE})`);
  // Fallback: return 0 for all (or fetch on-demand per client)
} else if (WorkoutSession?.findAll && clientIds.length > 0) {
  try {
    // Add query timeout to prevent runaway queries
    const workoutCounts = await WorkoutSession.findAll({
      attributes: [
        'userId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total']
      ],
      where: { userId: { [Op.in]: clientIds }, status: 'completed' },
      group: ['userId'],
      raw: true,
      timeout: 5000 // 5 second max
    });
    
    for (const row of workoutCounts) {
      workoutCountMap[row.userId] = parseInt(row.total) || 0;
    }
  } catch (metricError) {
    logger.error(`Workout batch count failed: ${metricError.message}`);
    // Graceful degradation: return empty map
  }
}
```

**Alternative (Better Performance):**
Use a materialized view or cached counter column:
```sql
-- Migration: Add cached counter to users table
ALTER TABLE users ADD COLUMN total_workouts_cache INTEGER DEFAULT 0;

-- Trigger to update on workout completion
CREATE OR REPLACE FUNCTION update_workout_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE users SET total_workouts_cache = total_workouts_cache + 1 WHERE id = NEW.userId;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workout_count_trigger
AFTER INSERT OR UPDATE ON workout_sessions
FOR EACH ROW EXECUTE FUNCTION update_workout_count();
```

---

### CRITICAL-3: Hard Delete Code Path Still Exists (Compliance Violation)
**Severity:** CRITICAL  
**Data at Risk:** User accounts, workout history, orders, sessions (all related data)  
**Blast Radius:** 1 USER — but PERMANENT data loss, potential legal liability  
**File:** `backend/controllers/adminClientController.mjs`  
**Lines:** 618-625

**What's Wrong:**
```javascript
if (softDelete) {
  // ... soft delete logic ...
} else {
  // Hard delete removed for compliance (financial & liability retention)
  await transaction.rollback();
  return res.status(403).json({
    success: false,
    message: 'Hard deletion is disabled for compliance. Use soft delete (isActive=false) instead.'
  });
}
```

**The Issue:**
The code **still accepts `softDelete=false` in the request body** and processes it. While it currently rejects hard deletes, this is a **logic bomb waiting to happen**:

1. A future developer might "fix" the 403 error by removing the check
2. The parameter is still documented/accepted in the API contract
3. No middleware enforces soft-delete-only at the route level
4. If someone changes the `if` condition, hard delete becomes active again

**Why This Is Critical:**
- **NASM Compliance:** Personal training records must be retained for 7 years (liability)
- **Financial Records:** Orders/payments must be retained for tax audits (IRS requires 7 years)
- **GDPR Right to Erasure:** Requires anonymization, not deletion (preserve transaction history)
- **Cascade Risk:** Hard deleting a user could orphan Sessions, WorkoutSessions, Orders

**Fix:**
```javascript
async deleteClient(req, res) {
  const transaction = await sequelize.transaction();
  
  try {
    ensureModels();
    const { clientId } = req.params;
    
    // SAFETY: Hard delete permanently disabled for compliance
    // If softDelete param is provided, log warning (API contract violation)
    if (req.body.softDelete === false) {
      logger.warn(`Hard delete attempted on client ${clientId} by admin ${req.user?.id} — BLOCKED`);
    }

    const client = await User.findOne({
      where: { id: clientId, role: 'client' },
      transaction
    });

    if (!client) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // ALWAYS soft delete (no parameter accepted)
    const cancelledCount = await Session.update(
      { status: 'cancelled', notes: 'Auto-cancelled: client account deactivated' },
      {
        where: {
          userId: clientId,
          status: { [Op.in]: ['available', 'scheduled', 'confirmed'] },
          sessionDate: { [Op.gt]: new Date() }
        },
        transaction
      }
    );

    await client.update({ isActive: false, availableSessions: 0 }, { transaction });
    await transaction.commit();

    logger.info(`Deactivated client ${clientId}, cancelled ${cancelledCount[0]} future sessions`);

    return res.status(200).json({
      success: true,
      message: 'Client deactivated successfully'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error deactivating client:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deactivating client',
      error: error.message
    });
  }
}
```

---

## 🔴 HIGH FINDINGS

### HIGH-1: Password Reset Allows Weak Passwords (Brute Force Risk)
**Severity:** HIGH  
**Data at Risk:** User authentication credentials  
**Blast Radius:** 1 USER per call — but could be scripted to attack multiple accounts  
**File:** `backend/controllers/adminClientController.mjs`  
**Lines:** 641-666

**What's Wrong:**
```javascript
async resetClientPassword(req, res) {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long'
    });
  }
```

**The Problem:**
- Only checks length (8 chars minimum)
- Allows weak passwords like `12345678`, `aaaaaaaa`, `password`
- No complexity requirements (uppercase, numbers, symbols)
- No check against common password lists (rockyou.txt)
- Admin could accidentally set a weak password, compromising client account

**Attack Scenario:**
1. Admin resets client password to `12345678` (meets 8-char requirement)
2. Attacker brute-forces login with common passwords
3. Gains access to client account, views workout history, orders, PII

**Fix:**
```javascript
import passwordValidator from 'password-validator';

// Define password policy (top of file)
const passwordSchema = new passwordValidator();
passwordSchema
  .is().min(8)
  .is().max(100)
  .has().uppercase()
  .has().lowercase()
  .has().digits()
  .has().not().spaces()
  .is().not().oneOf(['Password123', '12345678', 'Passw0rd']); // Common passwords

async resetClientPassword(req, res) {
  try {
    ensureModels();
    const { clientId } = req.params;
    const { newPassword } = req.body;

    // Validate password strength
    const validationErrors = passwordSchema.validate(newPassword, { list: true });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: validationErrors.map(err => {
          switch(err) {
            case 'min': return 'Must be at least 8 characters';
            case 'uppercase': return 'Must contain uppercase letter';
            case 'lowercase': return 'Must contain lowercase letter';
            case 'digits': return 'Must contain number';
            case 'oneOf': return 'Password is too common';
            default: return err;
          }
        })
      });
    }

    const client = await User.findOne({
      where: { id: clientId, role: 'client' }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Update password (hashed by model hook)
    await client.update({ password: newPassword, forcePasswordChange: true });

    logger.info(`Admin ${req.user?.id} reset password for client ${clientId}`);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Client must change password on next login.'
    });
  } catch (error) {
    logger.error('Error resetting password:', error);
    return res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
}
```

---

### HIGH-2: Email Exposed in Error Messages (PII Leak)
**Severity:** HIGH  
**Data at Risk:** User email addresses (PII)  
**Blast Radius:** 1 USER per error — but logs may expose many emails over time  
**File:** `backend/controllers/adminClientController.mjs`  
**Lines:** 524, 545

**What's Wrong:**
```javascript
logger.info(`Admin ${req.user?.id ?? 'unknown'} created client ${newClient.id} (${email}), passwordSource=${passwordSource}, emailSent=${emailSent}`);
```

**The Problem:**
- User email logged in plaintext to application logs
- Logs may be stored in Elasticsearch, CloudWatch, or third-party services
- GDPR Article 32 requires pseudonymization of PII in logs
- If logs are compromised, attacker gets list of all client emails

**Fix:**
```javascript
import crypto from 'crypto';

// Helper function (add to utils/logger.mjs)
function hashPII(value) {
  return crypto.createHash('sha256').update(value).digest('hex').substring(0, 8);
}

// In controller:
logger.info(`Admin ${req.user?.id ?? 'unknown'} created client ${newClient.id} (email_hash:${hashPII(email)}), passwordSource=${passwordSource}, emailSent=${emailSent}`);

// For external client:
logger.info(`External client created: email_hash:${hashPII(email)} (source: ${clientSource}) by admin ${req.user?.id}`);
```

---

### HIGH-3: Transaction Rollback Missing in `updateClient` Error Path
**Severity:** HIGH  
**Data at Risk:** Partial client profile updates (corrupted state)  
**Blast Radius:** 1 USER — but leaves database in inconsistent state  
**File:** `backend/controllers/adminClientController.mjs`  
**Lines:** 567-603

**What's Wrong:**
```javascript
async updateClient(req, res) {
  const transaction = await sequelize.transaction();
  
  try {
    // ... update logic ...
    await client.update(safeUpdates, { transaction });
    // ... more operations ...
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    logger.error('Error updating

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
