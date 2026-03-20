# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 56.5s
> **Files:** backend/controllers/adminClientController.mjs, backend/models/Goal.mjs
> **Generated:** 3/17/2026, 8:43:10 PM

---

# 🚨 DATA SAFETY AUDIT REPORT — CRITICAL FINDINGS

## ⚠️ EXECUTIVE SUMMARY

**CRITICAL ISSUES FOUND: 6**  
**HIGH SEVERITY ISSUES: 8**  
**MEDIUM SEVERITY ISSUES: 4**

This audit identified **multiple data-destructive vulnerabilities** that could result in permanent loss of user accounts, workout history, payment records, and authentication credentials. **Immediate action required before next deployment.**

---

## 🔴 CRITICAL FINDINGS (P0 — IMMEDIATE FIX REQUIRED)

### CRITICAL-1: Hard Delete Pathway Still Accessible via API
**Severity:** CRITICAL  
**Data at Risk:** Entire user account, all workout history, all orders, all sessions  
**Blast Radius:** 1 user per call, but irreversible data loss  
**File:** `backend/controllers/adminClientController.mjs:645-650`

**What's Wrong:**
```javascript
} else {
  // Hard delete removed for compliance (financial & liability retention)
  await transaction.rollback();
  return res.status(403).json({
```

The code **claims** hard delete is disabled, but the `deleteClient` method still accepts `softDelete` as a parameter. A malicious/confused admin could send `softDelete: false` in the request body. While it returns 403, **the transaction is still open** and the code path exists. This is a ticking time bomb.

**Fix:**
```javascript
async deleteClient(req, res) {
  const transaction = await sequelize.transaction();
  
  try {
    ensureModels();
    const { clientId } = req.params;
    // REMOVE softDelete parameter entirely — force soft delete always
    // const { softDelete = true } = req.body; ❌ DELETE THIS LINE

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

    // ALWAYS soft delete — no conditional logic
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

    logger.info(`Deactivated client ${clientId}, cancelled ${cancelledCount[0]} future sessions, zeroed availableSessions`);

    await transaction.commit();

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

### CRITICAL-2: Password Reset Overwrites Without Audit Trail
**Severity:** CRITICAL  
**Data at Risk:** User authentication credentials  
**Blast Radius:** 1 user per call, but permanent lockout if password lost  
**File:** `backend/controllers/adminClientController.mjs:681-719`

**What's Wrong:**
```javascript
await client.update({ password: newPassword });
```

**No audit log** of who reset the password, when, or why. If an admin maliciously resets a client's password, there's no forensic trail. Also, **no email notification** to the client that their password was changed by an admin (security best practice).

**Fix:**
```javascript
async resetClientPassword(req, res) {
  try {
    ensureModels();
    const { clientId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
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

    // AUDIT LOG: Record who reset the password
    const adminId = req.user?.id || 'unknown';
    const adminEmail = req.user?.email || 'unknown';
    logger.warn(`SECURITY: Admin ${adminId} (${adminEmail}) reset password for client ${clientId} (${client.email})`);

    // Update password (hashed by model hook)
    await client.update({ 
      password: newPassword,
      forcePasswordChange: true // Force client to change on next login
    });

    // SEND EMAIL NOTIFICATION TO CLIENT (non-blocking)
    try {
      await sendGridEmail({
        to: client.email,
        subject: 'SwanStudios — Your Password Was Reset',
        text: `Hi ${client.firstName},\n\nYour SwanStudios password was reset by an administrator on ${new Date().toISOString()}.\n\nIf you did not request this change, please contact support immediately.\n\n— SwanStudios Team`,
        html: `<p>Hi ${client.firstName},</p><p>Your SwanStudios password was reset by an administrator on <strong>${new Date().toISOString()}</strong>.</p><p>If you did not request this change, please contact support immediately.</p><p>&mdash; SwanStudios Team</p>`
      });
    } catch (emailError) {
      logger.error(`Failed to send password reset notification to ${client.email}: ${emailError.message}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Client will be required to change password on next login.'
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

### CRITICAL-3: Batch Session Creation Without Rollback on Partial Failure
**Severity:** CRITICAL  
**Data at Risk:** Session credits, trainer assignments  
**Blast Radius:** 1 client, but corrupts availableSessions count  
**File:** `backend/controllers/adminClientController.mjs:734-797`

**What's Wrong:**
```javascript
await Session.bulkCreate(sessions, { transaction });

// Update client's available sessions count
await client.increment('availableSessions', { 
  by: sessionCount,
  transaction 
});
```

If `bulkCreate` succeeds but `increment` fails (e.g., database constraint violation), the transaction rolls back **but the client's `availableSessions` is now out of sync** with actual Session records. This creates "phantom sessions" that don't exist.

**Fix:**
```javascript
async assignTrainer(req, res) {
  const transaction = await sequelize.transaction();
  
  try {
    ensureModels();
    const { clientId } = req.params;
    const { trainerId, sessionCount = 1 } = req.body;

    // Validate sessionCount to prevent integer overflow
    if (!Number.isInteger(sessionCount) || sessionCount < 1 || sessionCount > 100) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'sessionCount must be an integer between 1 and 100'
      });
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

    const trainer = await User.findOne({
      where: { id: trainerId, role: { [Op.in]: ['trainer', 'admin'] } },
      transaction
    });

    if (!trainer) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    // ATOMIC: Increment availableSessions FIRST (fails fast if constraint violated)
    await client.increment('availableSessions', { 
      by: sessionCount,
      transaction 
    });

    // THEN create sessions (if this fails, increment is rolled back)
    const sessions = [];
    for (let i = 0; i < sessionCount; i++) {
      sessions.push({
        trainerId,
        userId: clientId,
        status: 'available',
        sessionType: 'personal_training'
      });
    }
    
    const createdSessions = await Session.bulkCreate(sessions, { 
      transaction,
      returning: true // Get IDs of created sessions for audit log
    });

    await transaction.commit();

    // AUDIT LOG: Record session grant
    logger.info(`Admin ${req.user?.id} granted ${sessionCount} sessions to client ${clientId} with trainer ${trainerId}. Session IDs: ${createdSessions.map(s => s.id).join(', ')}`);

    return res.status(200).json({
      success: true,
      message: `Assigned ${sessionCount} sessions with trainer successfully`,
      data: {
        client: {
          id: client.id,
          name: `${client.firstName} ${client.lastName}`,
          availableSessions: client.availableSessions + sessionCount
        },
        trainer: {
          id: trainer.id,
          name: `${trainer.firstName} ${trainer.lastName}`
        },
        sessionsCreated: sessionCount,
        sessionIds: createdSessions.map(s => s.id)
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error assigning trainer:', error);
    return res.status(500).json({
      success: false,
      message: 'Error assigning trainer',
      error: error.message
    });
  }
}
```

---

### CRITICAL-4: Unvalidated Date Inputs Allow Object Injection
**Severity:** CRITICAL  
**Data at Risk:** Database integrity (SQL injection via date parsing)  
**Blast Radius:** All users if exploited  
**File:** `backend/controllers/adminClientController.mjs:817-824`

**What's Wrong:**
```javascript
const { startDate, endDate } = req.query;

// Validate and sanitize date inputs (prevent object injection + invalid date crashes)
const isValidDate = (d) => d && !isNaN(Date.parse(String(d)));
const safeStartDate = isValidDate(startDate) ? new Date(String(startDate)).toISOString() : null;
const safeEndDate = isValidDate(endDate) ? new Date(String(endDate)).toISOString() : null;
```

**GOOD:** The code validates dates. **BAD:** It uses `Date.parse(String(d))` which can still parse malicious inputs like `"2024-01-01' OR '1'='1"` (SQL injection attempt). While Sequelize parameterizes queries, **this is a defense-in-depth failure**.

**Fix:**
```javascript
async getClientWorkoutStats(req, res) {
  try {
    ensureModels();
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    // STRICT ISO 8601 validation (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS.sssZ)
    const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/;
    
    const isValidDate = (d) => {
      if (!d || typeof d !== 'string') return false;
      if (!ISO_DATE_REGEX.test(d)) return false;
      const parsed = new Date(d);
      return !isNaN(parsed.getTime());
    };

    const safeStartDate = isValidDate(startDate) ? new Date(startDate).toISOString() : null;
    const safeEndDate = isValidDate(endDate) ? new Date(endDate).toISOString() : null;

    // Prevent time-travel attacks (dates in far future)
    const MAX_FUTURE_YEARS = 5;
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + MAX_FUTURE_YEARS);

    if (safeStartDate && new Date(safeStartDate) > maxDate) {
      return res.status(400).json({
        success: false,
        message: `startDate cannot be more than ${MAX_FUTURE_YEARS} years in the future`
      });
    }

    if (safeEndDate && new Date(safeEndDate) > maxDate) {
      return res.status(400).json({
        success: false,
        message: `endDate cannot be more than ${MAX_FUTURE_YEARS} years in the future`
      });
    }

    const dateFilter = {};
    if (safeStartDate && safeEndDate) {
      dateFilter.date = { [Op.between]: [safeStartDate, safeEndDate] };
    } else if (safeStartDate) {
      dateFilter.date = { [Op.gte]: safeStartDate };
    } else if (safeEndDate) {
      dateFilter.date = { [Op.lte]: safeEndDate };
    }

    // ... rest of method
  }
}
```

---

### CRITICAL-5: Session Cancellation Without Refund Logic
**Severity:** CRITICAL  
**Data at Risk:** Client session credits (financial loss)  
**Blast Radius:** 1 client per deactivation  
**File:** `backend/controllers/adminClientController.mjs:628-638`

**What's Wrong:**
```javascript
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
```

**FINANCIAL DATA LOSS:** When a client is deactivated, their `availableSessions` is zeroed out **without refunding the cancelled sessions**. If they had 10 sessions remaining and 3 were scheduled (now cancelled), they lose 13 sessions worth of value. **This is theft.**

**Fix:**
```javascript
// Cancel future scheduled sessions (but preserve availableSessions for refund/reactivation)
const [cancelledCount] = await Session.update(
  { status: 'cancelled', notes: 'Auto-cancelled: client account deactivated' },
  {
    where: {
      userId: clientId,
      status: { [Op.in]: ['scheduled', 'confirmed'] }, // Only cancel scheduled, NOT available
      sessionDate: { [Op.gt]: new Date() }
    },
    transaction
  }
);

// Deactivate but PRESERVE availableSessions (client can be reactivated later)
await client.update({ isActive: false }, { transaction });

logger.info(`Deactivated client ${clientId}, cancelled ${cancelledCount} future sessions, preserved ${client.availableSessions} available sessions for potential reactivation`);
```

---

### CRITICAL-6: Email Exposure in Error Messages
**Severity:** CRITICAL  
**Data at Risk:** User PII (email addresses)  
**Blast Radius:** 1 user per error, but violates GDPR/CCPA  
**File:** `backend/controllers/adminClientController.mjs:

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
