# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 64.2s
> **Files:** backend/routes/claimRoutes.mjs, backend/services/claimTokenService.mjs, backend/controllers/adminClientController.mjs, backend/migrations/20260327000001-add-account-status-claim-token.cjs
> **Generated:** 3/27/2026, 5:10:43 PM

---

# 🚨 DATA SAFETY AUDIT REPORT — CRITICAL FINDINGS

## EXECUTIVE SUMMARY
**OVERALL RISK LEVEL: HIGH** ⚠️

Found **8 CRITICAL** and **3 HIGH** severity issues that could result in:
- Mass deletion of user accounts
- Permanent loss of workout/payment history
- Account lockouts during migrations
- Data corruption from race conditions

---

## 🔴 CRITICAL FINDINGS

### 1. MASS CLIENT DELETION WITHOUT SAFEGUARDS
**Severity:** CRITICAL  
**Data at Risk:** All client accounts, workout history, orders, sessions  
**Blast Radius:** ALL USERS (could delete entire client base)  
**File:** `backend/controllers/adminClientController.mjs:522-570`

**What's Wrong:**
```javascript
async deleteClient(req, res) {
  // ...
  if (softDelete) {
    await client.update({ isActive: false, availableSessions: 0 }, { transaction });
  }
}
```

The endpoint has **NO confirmation flow**, **NO batch operation limits**, and **NO row count checks**. A single malicious/accidental API call with a loop could deactivate all clients:

```javascript
// Attacker/bug could do this:
for (let id of allClientIds) {
  await fetch('/api/admin/clients/' + id, { method: 'DELETE' });
}
```

**Fix:**
```javascript
async deleteClient(req, res) {
  const { clientId } = req.params;
  const { softDelete = true, confirmationCode } = req.body;

  // SAFETY: Require confirmation code for deletion
  const expectedCode = `DELETE-${clientId.slice(0, 8)}`;
  if (confirmationCode !== expectedCode) {
    return res.status(400).json({
      success: false,
      message: `Deletion requires confirmation code: ${expectedCode}`
    });
  }

  // SAFETY: Check if client has recent activity (prevent accidental deletion)
  const recentActivity = await WorkoutSession.findOne({
    where: {
      userId: clientId,
      completedAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }
  });

  if (recentActivity && !req.body.forceDeleteActive) {
    return res.status(400).json({
      success: false,
      message: 'Client has activity in last 30 days. Set forceDeleteActive=true to proceed.'
    });
  }

  // ... rest of deletion logic
}
```

---

### 2. MIGRATION MISSING `down()` FUNCTION — UNRECOVERABLE FAILURES
**Severity:** CRITICAL  
**Data at Risk:** Users table structure (accountStatus, claimToken columns)  
**Blast Radius:** ALL USERS (table locked if migration fails)  
**File:** `backend/migrations/20260327000001-add-account-status-claim-token.cjs`

**What's Wrong:**
```javascript
module.exports = {
  async up(queryInterface, Sequelize) {
    // ... adds columns
  }
  // ❌ NO down() FUNCTION
};
```

If this migration fails mid-execution (e.g., ENUM constraint error), **you cannot rollback**. The Users table will be left in a corrupted state with partial columns added.

**Fix:**
```javascript
module.exports = {
  async up(queryInterface, Sequelize) {
    // ... existing up logic
  },

  async down(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('Users').catch(() => null);
    if (!tableDesc) return;

    // Remove columns in reverse order
    if (tableDesc.claimTokenExpires) {
      await queryInterface.removeColumn('Users', 'claimTokenExpires');
    }
    if (tableDesc.claimTokenHash) {
      await queryInterface.removeColumn('Users', 'claimTokenHash');
    }
    if (tableDesc.accountStatus) {
      await queryInterface.removeColumn('Users', 'accountStatus');
      // Drop ENUM type (PostgreSQL-specific)
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_Users_accountStatus";`
      );
    }
  }
};
```

---

### 3. ENUM MIGRATION WITHOUT TRANSACTION SAFETY (PostgreSQL)
**Severity:** CRITICAL  
**Data at Risk:** Users table (entire table locked during ALTER TYPE)  
**Blast Radius:** ALL USERS (production downtime if migration times out)  
**File:** `backend/migrations/20260327000001-add-account-status-claim-token.cjs`

**What's Wrong:**
```javascript
await queryInterface.addColumn('Users', 'accountStatus', {
  type: Sequelize.ENUM('stub', 'invited', 'active'),
  defaultValue: 'active',
  allowNull: false
});
```

In PostgreSQL, `ALTER TYPE` operations **lock the entire table** and cannot run inside a transaction. If the migration times out (e.g., on a table with 10,000+ users), the table remains locked and **all login attempts fail**.

**Fix:**
```javascript
async up(queryInterface, Sequelize) {
  // Step 1: Add column as nullable VARCHAR first (no lock)
  await queryInterface.addColumn('Users', 'accountStatus', {
    type: Sequelize.STRING(20),
    allowNull: true
  });

  // Step 2: Backfill existing rows (batched to avoid timeout)
  await queryInterface.sequelize.query(`
    UPDATE "Users" 
    SET "accountStatus" = 'active' 
    WHERE "accountStatus" IS NULL 
      AND "role" = 'client'
      AND "isActive" = true;
  `);

  // Step 3: Add NOT NULL constraint (fast, no data copy)
  await queryInterface.changeColumn('Users', 'accountStatus', {
    type: Sequelize.STRING(20),
    allowNull: false,
    defaultValue: 'active'
  });

  // Step 4: Add CHECK constraint for enum values (PostgreSQL 12+)
  await queryInterface.sequelize.query(`
    ALTER TABLE "Users" 
    ADD CONSTRAINT "Users_accountStatus_check" 
    CHECK ("accountStatus" IN ('stub', 'invited', 'active'));
  `);
}
```

---

### 4. PASSWORD OVERWRITE WITHOUT VALIDATION — PLAINTEXT LEAK RISK
**Severity:** CRITICAL  
**Data at Risk:** User passwords (could be stored as plaintext if bcrypt hook fails)  
**Blast Radius:** 1 user per call (but repeatable attack)  
**File:** `backend/routes/claimRoutes.mjs:141-143`

**What's Wrong:**
```javascript
const updates = {
  password,  // ❌ Assumes bcrypt hook always runs
  accountStatus: 'active',
  // ...
};
await matchedUser.update(updates, { individualHooks: true });
```

If `individualHooks: true` is accidentally removed (e.g., during refactor), the password is stored as **plaintext**. This has happened in production systems before.

**Fix:**
```javascript
// ALWAYS hash password explicitly before storage
const bcrypt = require('bcryptjs');

const updates = {
  password: await bcrypt.hash(password, 10),  // ✅ Explicit hash
  accountStatus: 'active',
  forcePasswordChange: false,
  claimTokenHash: null,
  claimTokenExpires: null,
};

await matchedUser.update(updates);  // No need for individualHooks
```

---

### 5. RACE CONDITION IN TOKEN VERIFICATION — DOUBLE CLAIM EXPLOIT
**Severity:** CRITICAL  
**Data at Risk:** User accounts (one token could activate multiple accounts)  
**Blast Radius:** 1-2 users per attack (but allows account hijacking)  
**File:** `backend/routes/claimRoutes.mjs:117-150`

**What's Wrong:**
```javascript
// Thread 1: Finds matchedUser, starts update
const matchedUser = await User.findAll({ where: { ... } });

// Thread 2: Finds SAME matchedUser (token not cleared yet)
const matchedUser = await User.findAll({ where: { ... } });

// Both threads call update() — token used twice
await matchedUser.update({ claimTokenHash: null });
```

**Fix:**
```javascript
router.post('/activate', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // ... token verification logic

    // ATOMIC: Update with WHERE clause to prevent double-claim
    const [updatedRows] = await User.update(
      {
        password: await bcrypt.hash(password, 10),
        accountStatus: 'active',
        forcePasswordChange: false,
        claimTokenHash: null,
        claimTokenExpires: null,
        email: email || matchedUser.email
      },
      {
        where: {
          id: matchedUser.id,
          claimTokenHash: { [Op.ne]: null },  // ✅ Only update if token still exists
          accountStatus: 'invited'
        },
        transaction
      }
    );

    if (updatedRows === 0) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'Token already used or account already active'
      });
    }

    await transaction.commit();
    // ...
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});
```

---

### 6. BULK SESSION CANCELLATION WITHOUT ROW LIMIT
**Severity:** CRITICAL  
**Data at Risk:** Training sessions (could cancel thousands of sessions)  
**Blast Radius:** ALL CLIENTS (if WHERE clause bug)  
**File:** `backend/controllers/adminClientController.mjs:548-557`

**What's Wrong:**
```javascript
const cancelledCount = await Session.update(
  { status: 'cancelled', notes: 'Auto-cancelled: client account deactivated' },
  {
    where: {
      userId: clientId,  // ❌ If clientId is undefined/null, cancels ALL sessions
      status: { [Op.in]: ['available', 'scheduled', 'confirmed'] },
      sessionDate: { [Op.gt]: new Date() }
    },
    transaction
  }
);
```

**Fix:**
```javascript
// SAFETY: Validate clientId before bulk operation
if (!clientId || typeof clientId !== 'string') {
  throw new Error('Invalid clientId for session cancellation');
}

// SAFETY: Dry-run to check row count
const sessionsToCancel = await Session.count({
  where: {
    userId: clientId,
    status: { [Op.in]: ['available', 'scheduled', 'confirmed'] },
    sessionDate: { [Op.gt]: new Date() }
  },
  transaction
});

// SAFETY: Abort if suspiciously high count
if (sessionsToCancel > 100) {
  throw new Error(`Refusing to cancel ${sessionsToCancel} sessions (limit: 100)`);
}

const [cancelledCount] = await Session.update(/* ... */);
logger.warn(`Cancelled ${cancelledCount} sessions for deactivated client ${clientId}`);
```

---

### 7. EMAIL COLLISION IN EXTERNAL CLIENT CREATION
**Severity:** CRITICAL  
**Data at Risk:** User accounts (duplicate emails = login failures)  
**Blast Radius:** 1 user per collision (but breaks authentication)  
**File:** `backend/controllers/adminClientController.mjs:894-899`

**What's Wrong:**
```javascript
const existingUser = await User.findOne({ where: { email } });
if (existingUser) {
  return res.status(400).json({ message: 'A client with this email already exists' });
}

// ❌ Race condition: Another request could create same email between check and insert
const newClient = await User.create({ email, ... });
```

**Fix:**
```javascript
try {
  const newClient = await User.create({
    email,
    username,
    // ... other fields
  }, {
    transaction,
    // ✅ Let database UNIQUE constraint catch duplicates
  });
} catch (error) {
  if (error.name === 'SequelizeUniqueConstraintError') {
    await transaction.rollback();
    return res.status(409).json({
      success: false,
      message: 'Email already exists',
      field: error.errors[0]?.path  // 'email' or 'username'
    });
  }
  throw error;
}
```

---

### 8. CLAIM TOKEN BRUTE-FORCE VULNERABILITY
**Severity:** CRITICAL  
**Data at Risk:** User accounts (attacker could claim any STUB account)  
**Blast Radius:** ALL STUB ACCOUNTS (4-char suffix = 1.6M combinations)  
**File:** `backend/services/claimTokenService.mjs:20-35`

**What's Wrong:**
```javascript
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars
const suffix = Array.from(crypto.randomBytes(4))
  .map(b => CHARSET[b % CHARSET.length])
  .join('');  // Only 32^4 = 1,048,576 combinations

// ❌ No rate limiting on /verify or /activate endpoints
```

An attacker could brute-force all tokens in ~3 hours at 100 req/sec.

**Fix:**
```javascript
// 1. Increase token entropy (6 chars = 1 billion combinations)
const suffix = Array.from(crypto.randomBytes(6))
  .map(b => CHARSET[b % CHARSET.length])
  .join('');
const plainToken = `SWAN-${suffix}`;  // e.g., SWAN-A7X3K9

// 2. Add rate limiting to routes (claimRoutes.mjs)
import rateLimit from 'express-rate-limit';

const claimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts per IP
  message: 'Too many claim attempts, please try again later'
});

router.get('/verify/:token', claimLimiter, async (req, res) => { /* ... */ });
router.post('/activate', claimLimiter, async (req, res) => { /* ... */ });

// 3. Add attempt tracking to User model
await matchedUser.update({
  claimAttempts: sequelize.literal('COALESCE("claimAttempts", 0) + 1')
});

if (matchedUser.claimAttempts > 10) {
  // Invalidate token after 10 failed attempts
  await matchedUser.update({ claimTokenHash: null });
}
```

---

## 🟠 HIGH SEVERITY FINDINGS

### 9. PII EXPOSURE IN ERROR LOGS
**Severity:** HIGH  
**Data at Risk:** Email addresses, names (GDPR/CCPA violation)  
**Blast Radius:** ALL USERS (logs persist indefinitely)  
**File:** Multiple files

**What's Wrong:**
```javascript
logger.info(`Admin ${req.user?.id} created client ${newClient.id} (${email})`);
logger.error('Error fetching client details:', error);  // May contain email in stack trace
```

**Fix:**
```javascript
// Redact PII in logs
logger.info(`Admin ${req.user?.id} created client ${newClient.id} (email: ${email.replace(/(?<=.{2}).(?=.*@)/g, '*')})`);

// Use structured logging with PII filters
logger.error('Error fetching client details', {
  clientId: clientId,
  error: error.message,  // Don't log full stack in production
  userId: req.user?.id
});
```

---

### 10. MISSING TRANSACTION IN `createClient`
**Severity:** HIGH  
**Data at Risk:** User + ClientProgress (orphaned records if email send fails)  
**Blast Radius:** 1 user per failure  
**File:** `backend/controllers/adminClientController.mjs:265-340`

**What's Wrong:**

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
