# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 74.2s
> **Files:** backend/models/User.mjs, backend/migrations/20260314000001-add-client-source-to-users.cjs, backend/schemas/clientSource.mjs, backend/controllers/adminClientController.mjs, backend/routes/adminClientRoutes.mjs
> **Generated:** 3/14/2026, 7:42:58 PM

---

# Deep Architecture Review & Bug Hunt — SwanStudios Backend

## Executive Summary

After systematic analysis of the provided backend files, I've identified **4 CRITICAL bugs**, **6 HIGH severity issues**, **5 MEDIUM issues**, and **6 LOW/cosmetic issues**. The most critical finding is a **data integrity vulnerability** in the `clientSource` field validation that could allow invalid values to persist in production.

---

## 1. BUG DETECTION

### CRITICAL

#### Bug #1: Invalid Sequelize Validation for `clientSource` ENUM
| Severity | File & Line |
|----------|-------------|
| **CRITICAL** | `backend/models/User.mjs` — Line ~268 |

**What's Wrong:**
```javascript
clientSource: {
  type: DataTypes.STRING(50),
  allowNull: false,
  defaultValue: 'swanstudios',
  validate: {
    isIn: [['swanstudios', 'move_fitness', 'external']]  // ❌ DOUBLE-NESTED ARRAY
  },
  // ...
}
```

The `isIn` validator expects a flat array `['a', 'b', 'c']`, not a nested array `[['a', 'b', 'c']]`. This causes Sequelize to validate against the entire array as a single string, effectively allowing **any value** to pass validation. The migration adds the column with no constraints, and this broken validation provides zero protection.

**Fix:**
```javascript
clientSource: {
  type: DataTypes.STRING(50),
  allowNull: false,
  defaultValue: 'swanstudios',
  validate: {
    isIn: {
      args: [['swanstudios', 'move_fitness', 'external']],
      msg: 'Invalid client source'
    }
  }
},
```

Or better, use a custom validator for explicit control:
```javascript
validate: {
  isValidClientSource(value) {
    const valid = ['swanstudios', 'move_fitness', 'external'];
    if (!valid.includes(value)) {
      throw new Error(`clientSource must be one of: ${valid.join(', ')}`);
    }
  }
}
```

---

#### Bug #2: Wrong Field Name in `getClientWorkoutStats` Query
| Severity | File & Line |
|----------|-------------|
| **CRITICAL** | `backend/controllers/adminClientController.mjs` — Line ~560 |

**What's Wrong:**
```javascript
const [totalWorkouts, totalForms, recentWorkouts] = await Promise.all([
  WorkoutSession.count({ where: { userId: clientId, status: 'completed', ...dateFilter } }),
  DailyWorkoutForm.count({ where: { clientId, ...dateFilter } }),  // ❌ WRONG FIELD NAME
  // ...
]);
```

The `DailyWorkoutForm` model likely uses `userId` (consistent with all other models in this codebase), not `clientId`. This query will **always return 0** because it's querying a non-existent column, making the `totalForms` metric completely broken.

**Fix:**
```javascript
DailyWorkoutForm.count({ where: { userId: clientId, ...dateFilter } }),
```

---

#### Bug #3: Unverified `req.user` Access Causes Crash
| Severity | File & Line |
|----------|-------------|
| **CRITICAL** | `backend/controllers/adminClientController.mjs` — Lines ~340, ~620 |

**What's Wrong:**
```javascript
// Line ~340 in createClient
logger.info(`Admin ${req.user.id} created client ${newClient.id}...`);

// Line ~620 in createExternalClient  
logger.info(`External client created: ${email} (source: ${clientSource}) by admin ${req.user?.id}`);
```

The route uses `protect` and `authorize(['admin'])` middleware, but if either middleware fails or is misconfigured, `req.user` could be undefined. Line 340 has no optional chaining — this will throw `TypeError: Cannot read property 'id' of undefined` if the middleware chain fails silently.

**Fix:**
```javascript
logger.info(`Admin ${req.user?.id ?? 'unknown'} created client ${newClient.id}...`);
```

---

#### Bug #4: Password Reset Allows 6-Character Passwords
| Severity | File & Line |
|----------|-------------|
| **CRITICAL** | `backend/controllers/adminClientController.mjs` — Line ~447 |

**What's Wrong:**
```javascript
if (!newPassword || newPassword.length < 6) {
  return res.status(400).json({
    success: false,
    message: 'Password must be at least 6 characters long'
  });
}
```

OWASP recommends **minimum 8 characters** for passwords, and modern standards suggest 12+. A 6-character password is trivially brute-forceable. This is a **security vulnerability** in admin password reset functionality.

**Fix:**
```javascript
if (!newPassword || newPassword.length < 8) {
  return res.status(400).json({
    success: false,
    message: 'Password must be at least 8 characters long'
  });
}
```

---

### HIGH

#### Bug #5: Potential Null Reference in `getBillingOverview`
| Severity | File & Line |
|----------|-------------|
| **HIGH** | `backend/controllers/adminClientController.mjs` — Line ~594 |

**What's Wrong:**
```javascript
const lastPurchase = await Order.findOne({
  // ...
  attributes: ['id', 'orderNumber', 'totalAmount', 'completedAt', 'paymentAppliedAt', 'paymentReference', 'notes']
});
```

The code assumes `completedAt`, `paymentAppliedAt`, and `paymentReference` fields exist on the Order model. If these columns don't exist in the database, Sequelize will either throw an error or return null for those fields. The subsequent code at line ~612 tries to access `lastPurchase.completedAt` which could be undefined.

**Fix:** Add defensive checks or verify Order model schema:
```javascript
lastPurchase: lastPurchase ? {
  id: lastPurchase.id,
  packageName: lastPurchase.orderNumber || 'Session Package',
  sessions: null,
  amount: lastPurchase.totalAmount,
  grantedAt: lastPurchase.completedAt ?? lastPurchase.createdAt,  // Fallback
  paymentAppliedAt: lastPurchase.paymentAppliedAt ?? null,
  paymentReference: lastPurchase.paymentReference ?? null
} : null,
```

---

#### Bug #6: Inconsistent Error Message Exposure
| Severity | File & Line |
|----------|-------------|
| **HIGH** | `backend/controllers/adminClientController.mjs` — Multiple locations |

**What's Wrong:**
```javascript
// Line ~233 (getClients)
error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message

// Line ~326 (getClientDetails)  
error: error.message  // ❌ Always exposes error message

// Line ~620 (createExternalClient)
error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
```

Inconsistent error handling leaks implementation details in production in `getClientDetails`, while other endpoints properly mask errors. This could expose sensitive information (table names, SQL fragments, file paths) to attackers.

**Fix:** Standardize error handling:
```javascript
// In getClientDetails (line ~326)
error: process.env.NODE_ENV === 'production' ? 'Error fetching client details' : error.message
```

---

#### Bug #7: Missing `clientSource` Validation in Controller
| Severity | File & Line |
|----------|-------------|
| **HIGH** | `backend/controllers/adminClientController.mjs` — Lines ~334, ~606 |

**What's Wrong:**
```javascript
// createClient accepts clientSource from req.body without validation
const {
  // ...
  clientSource = 'swanstudios',
  // ...
} = req.body;

// createExternalClient also accepts clientSource without validation
const {
  // ...
  clientSource = 'move_fitness',
  // ...
} = req.body;
```

The controller accepts `clientSource` directly from the request body without validating against the allowed values. Combined with Bug #1 (broken Sequelize validation), this allows **arbitrary strings** to be stored in the database.

**Fix:** Add validation using the Zod schema:
```javascript
import { ClientSourceSchema } from '../schemas/clientSource.mjs';

// In createClient:
const validatedSource = ClientSourceSchema.parse(clientSource);

// In createExternalClient:
const validatedSource = ClientSourceSchema.parse(clientSource);
```

Or inline validation:
```javascript
const validSources = ['swanstudios', 'move_fitness', 'external'];
if (clientSource && !validSources.includes(clientSource)) {
  return res.status(400).json({
    success: false,
    message: `Invalid clientSource. Must be one of: ${validSources.join(', ')}`
  });
}
```

---

#### Bug #8: Race Condition in Password Check During Update
| Severity | File & Line |
|----------|-------------|
| **HIGH** | `backend/models/User.mjs` — Lines ~307-317 |

**What's Wrong:**
```javascript
User.beforeUpdate(async (user) => {
  try {
    if (user.changed('password') && user.password && user.password.length > 0) {
      if (!user.password.startsWith('$2')) {  // ❌ RACE CONDITION WINDOW
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  } catch (err) {
    console.error("Error in beforeUpdate hook:", err);
    throw err;
  }
});
```

The check `!user.password.startsWith('$2')` is not atomic. If two concurrent requests try to update the same user's password, both could pass the check before either hashes the password, potentially leading to double-hashing or the raw password being saved. While bcrypt is slow enough to make this unlikely, it's still a race condition.

**Fix:** Use a more robust approach:
```javascript
User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const plainPassword = user.password;
    // If already hashed (e.g., from external source), don't re-hash
    if (plainPassword.startsWith('$2a$') || plainPassword.startsWith('$2b$')) {
      return;
    }
    // Validate minimum length before hashing
    if (plainPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(plainPassword, salt);
  }
});
```

---

#### Bug #9: Soft Delete Doesn't Clear `availableSessions`
| Severity | File & Line |
|----------|-------------|
| **HIGH** | `backend/controllers/adminClientController.mjs` — Lines ~467-490 |

**What's Wrong:**
```javascript
if (softDelete) {
  await client.update({ isActive: false }, { transaction });
  
  // Cancels future sessions but doesn't reset availableSessions
  const cancelledCount = await Session.update(
    { status: 'cancelled', notes: 'Auto-cancelled: client account deactivated' },
    { where: { userId: clientId, status: { [Op.in]: ['available', 'scheduled', 'confirmed'] } } }
  );
}
```

When a client is soft-deleted (deactivated), their `availableSessions` count remains unchanged. If the client is later reactivated, they retain their old session count. However, if the intent is to "freeze" the account, the sessions should also be frozen, not just cancelled. This creates inconsistent state.

**Fix:** Either reset sessions or document the behavior:
```javascript
if (softDelete) {
  await client.update({ 
    isActive: false,
    availableSessions: 0  // Reset sessions on deactivation
  }, { transaction });
  
  // Cancel future sessions
  await Session.update(
    { status: 'cancelled', notes: 'Auto-cancelled: client account deactivated' },
    { where: { userId: clientId, status: { [Op.in]: ['available', 'scheduled', 'confirmed'] } }, transaction }
  );
  
  logger.info(`Deactivated client ${clientId}, reset availableSessions to 0`);
}
```

---

#### Bug #10: Missing Transaction in `resetClientPassword`
| Severity | File & Line |
|----------|-------------|
| **HIGH** | `backend/controllers/adminClientController.mjs` — Lines ~440-460`

**What's Wrong:**
```javascript
async resetClientPassword(req, res) {
  // ❌ No transaction wrapper
  const client = await User.findOne({ where: { id: clientId, role: 'client' } });
  
  if (!client) { /* ... */ }
  
  await client.update({ password: newPassword });  // No transaction
}
```

While less critical for a single-table update, this breaks the pattern used everywhere else in the controller and could cause issues if audit logging or other side effects are added later.

**Fix:**
```javascript
async resetClientPassword(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const client = await User.findOne({ 
      where: { id: clientId, role: 'client' },
      transaction 
    });
    
    if (!client) {
      await transaction.rollback();
      return res.status(404).json({ /* ... */ });
    }
    
    await client.update({ password: newPassword }, { transaction });
    
    // TODO: Add audit log entry here
    
    await transaction.commit();
    return res.status(200).json({ /* ... */ });
  } catch (error) {
    await transaction.rollback();
    // ... error handling
  }
}
```

---

### MEDIUM

#### Bug #11: Defensive Check for `hasWorkoutAssociation` May Hide Real Issues
| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | `backend/controllers/adminClientController.mjs` — Lines ~198, ~280 |

**What's Wrong:**
```javascript
const hasWorkoutAssociation = User.associations?.workoutSessions;

if (hasWorkoutAssociation) {
  includeOptions.push({ /* ... */ });
}
```

If the `workoutSessions` association isn't defined, the code silently skips including workout data. This could hide configuration errors where the association should exist but doesn't. In production, this would mean admins see incomplete data with no indication something is misconfigured.

**Fix:** Add logging when association is missing:
```javascript
const hasWorkoutAssociation = User.associations?.workoutSessions;

if (!hasWorkoutAssociation) {
  logger.warn('WorkoutSession association not defined on User model - workout data will be unavailable');
} else {
  includeOptions.push({ /* ... */ });
}
```

---

#### Bug #12: Username Generation in `createExternalClient` Could Produce Duplicates
| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | `backend/controllers/adminClientController.mjs` — Line ~606 |

**What's Wrong:**
```javascript
const username = email.split('@')[0] + '_' + Date.now().toString(36);
```

If the same email is used in two requests within the same millisecond, or if `Date.now()` returns the same value, this could produce duplicate usernames. The code checks for existing email but not username.

**Fix:**
```javascript
// Generate unique username with sufficient entropy
const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
const username = `${baseUsername}_${crypto.randomBytes(4).toString('hex')}`;

// Verify uniqueness
const existing = await User.findOne({ where: { username } });
if (existing) {
  return res.status(409).json({
    success: false,
    message: 'Username conflict, please try again'
  });
}
```

---

#### Bug #13: `getMeasurementStatus` Called on Every Client in List
| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | `backend/controllers/adminClientController.mjs` — Line ~248 |

**What's Wrong:**
```javascript
const enrichedClients = clients.map((client) => {
  const { masterPromptJson, ...clientData } = client.toJSON();
  const scheduleStatus = getMeasurementStatus(clientData);  // Called for EACH client
  // ...
});
```

`getMeasurementStatus` is called for every client in the paginated list. If this function performs database queries or complex calculations, this creates N+1 performance issues. Even if it's pure computation, it's wasteful for list views.

**Fix:** Only calculate for detail views, or make the function lazy-load:
```javascript
// Only include measurement status in detail view
const enrichedClients = clients.map((client) => {
  const { masterPromptJson, ...clientData } = client.toJSON();
  
  return {
    ...clientData,
    onboardingComplete: masterPromptJson != null,
    totalWorkouts: workoutCountMap[client.id] || 0,
    totalOrders: orderCountMap[client.id] || 0,
    lastWorkout: clientData.workoutSessions?.[0] || null,
    nextSession: clientData.clientSessions?.[0] || null,
    // Remove measurementSchedule from list - fetch on detail view only
  };
});
```

---

#### Bug #14: Inconsistent Password Handling in Create Flows
| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | `backend/controllers/adminClientController.mjs` — Lines ~334, ~606 |

**What's Wrong:**
```javascript
// createClient
const effectivePassword = password || crypto.randomBytes(12).toString('base64url');

// createExternalClient  
const effectivePassword = password || crypto.randomBytes(12).toString('base64url');
```

Both methods accept an optional `password` from the request body. If an admin provides a password, it's used directly without validation (length, complexity). This bypasses the minimum length check in `resetClientPassword` and could allow weak passwords for admin-created accounts.

**Fix:** Validate any supplied password:
```javascript
const effectivePassword = password || crypto.randomBytes(12).toString('base64url');

if (password && password.length < 8) {
  return res.status(400).json({
    success: false,
    message: 'Password must be at least 8 characters'
  });
}
```

---

#### Bug #15: No Input Sanitization on User-Provided Fields
| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | `backend/controllers/adminClientController.mjs` — Multiple create/update methods |

**What's Wrong:**
Fields like `firstName`, `lastName`, `fitnessGoal`, etc. are stored directly without sanitization. While Sequelize parameterized queries prevent SQL injection, there's no XSS protection if these fields are ever rendered in HTML.

**Fix:** Add sanitization or use a library:
```javascript
import DOMPurify from 'isomorphic-dompurify';

const sanitizedFirstName = DOMPurify.sanitize(firstName);
```

---

### LOW

#### Bug #16: Console Logging in Production Hooks
| Severity | File & Line |
|----------|-------------|
| **LOW** | `backend/models/User.mjs` — Lines ~308, ~318 |

**What's Wrong:**
```javascript
console.error("Error in beforeCreate hook:", err);
console.error("Error in beforeUpdate hook:", err);
```

Should use the application's logger (`logger.mjs`) for consistency and proper log management.

---

## 2. ARCHITECTURE FLAWS

### HIGH

#### Arch #1: Lazy Model Loading Pattern is Fragile
| Severity | File & Line |
|----------|-------------|
| **HIGH** | `backend/controllers/adminClientController.mjs` — Lines ~130-145 |

**What's Wrong:**
```javascript
let User;
let ClientProgress;
// ... etc

const ensureModels = () => {
  if (User && ClientProgress && /* ... */) return;
  const models = getAllModels();
  User = models.User;
  // ...
  if (!User) throw new Error('User model not available...');
};
```

This lazy-loading pattern is called at the start of **every method**. If any model fails to load, the error only surfaces on the first request, not at startup. This violates fail-fast principles — configuration errors should be caught at server initialization, not on first API call.

**Fix:** Load models once at controller initialization:
```javascript
// At module level
let models;
try {
  models = getAllModels();
} catch (err) {
  throw new Error(`Failed to initialize AdminClientController: ${err.message}`);
}

const { User, ClientProgress, Session, WorkoutSession, Order, DailyWorkoutForm } = models;
```

---

#### Arch #2: No Rate Limiting on Admin Operations
| Severity | File & Line |
|----------|-------------|
| **HIGH** | `backend/routes/adminClientRoutes.mjs` — (entire file) |

**What's Wrong:**
The admin routes perform expensive operations (creating clients, bulk updates, generating reports) with no rate limiting. A compromised admin account or runaway frontend could hammer the API.

**Fix:** Add rate limiting to routes:
```javascript
import rateLimit from 'express-rate-limit';

const createClientLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { success: false, message: 'Too many client creations, please try again later' }
});

router.post('/clients', protect, authorize(['admin']), createClientLimiter, adminClientController.createClient);
```

---

## 3. INTEGRATION ISSUES

### MEDIUM

#### Int #1: Schema/Model Mismatch for `clientSource`
| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | `backend/schemas/clientSource.mjs` vs `backend/models/User.mjs` |

**What's Wrong:**
The Zod schema correctly defines the enum, but the Sequelize model validation is broken (Bug #1). This creates a situation where:
- API validation (Zod) works correctly
- Database validation (Sequelize) is broken
- The migration adds no constraints

If the Zod validation is bypassed (e.g., direct database access), invalid values can enter the system.

---

#### Int #2: No Loading/Error States for MCP Fallback
| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | `backend/controllers/adminClientController.mjs` — Lines ~295-300 |

**What's Wrong:**
```javascript
// MCP servers decommissioned — stats fetched from local DB only
const mcpStats = {};
```

The code explicitly notes MCP servers are decommissioned but doesn't indicate this in the response. A frontend consuming this API might wait for `mcpStats` data that will never arrive.

**Fix:**
```javascript
const mcpStats = {
  status: 'decommissioned',
  message: 'MCP analytics disabled - using local database only'
};
```

---

## 4. DEAD CODE & TECH DEBT

### MEDIUM

#### Debt #1: Commented-Out Code Not Cleaned Up
| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | `backend/models/User.mjs` — Line ~224 |

**What's Wrong:**
```javascript
// Remove the problematic foreign key reference
// badgesPrimary field removed
```

Dead comments should be removed, not left in production code.

---

#### Debt #2: TODO Comment Indicates Incomplete Work
| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | `backend/controllers/adminClientController.mjs` — Line ~475 |

**What's Wrong:**
```javascript
// TODO: Add audit log entry here
```

Indicates incomplete security logging that should be addressed before production.

---

#### Debt #3: Hardcoded MCP Server URLs in Response
| Severity | File & Line |
|----------|-------------|
| **LOW** | `backend/controllers/adminClientController.mjs` — Lines ~540-548 |

**What's Wrong:**
```javascript
const mcpServers = [
  { name: 'Workout MCP', url: 'http://localhost:8000' },
  // ...
];
```

Hardcoded localhost URLs in a production controller. These should come from environment configuration.

---

## 5. PRODUCTION READINESS

### CRITICAL

#### Prod #1: Console Statements in Production Code
| Severity | File & Line |
|----------|-------------|
| **CRITICAL** | `backend/models/User.mjs` — Lines ~308, ~318 |

**What's Wrong:**
```javascript
console.error("Error in beforeCreate hook:", err);
```

Console statements bypass log aggregation (Winston), can't be filtered by level in production, and may not be captured in containerized environments.

**Fix:** Use the application's logger:
```javascript
import logger from '../utils/logger.mjs';

// In hooks:
logger.error('Error in beforeCreate hook', { error: err.message, stack: err.stack });
```

---

#### Prod #2: No Request Validation Middleware
| Severity | File & Line |
|----------|-------------|
| **CRITICAL** | `backend/routes/adminClientRoutes.mjs` — (entire file) |

**What's Wrong:**
Routes accept `req.body` directly without schema validation. While some methods use Zod schemas, they're not integrated into the route handlers. Invalid data hits the controller and causes validation errors mid-operation.

**Fix:** Add validation middleware:
```javascript
import { validateRequest } from '../middleware/validateRequest.mjs';
import { CreateClientSchema } from '../schemas/createClient.mjs';

router.post('/clients', 
  protect, 
  authorize(['admin']), 
  validateRequest(CreateClientSchema), 
  adminClientController.createClient
);
```

---

### HIGH

#### Prod #3: No Pagination Limits on Certain Queries
| Severity | File & Line |
|----------|-------------|
| **HIGH** | `backend/controllers/adminClientController.mjs` — Line ~560 |

**What's Wrong:**
```javascript
DailyWorkoutForm.count({ where: { userId: clientId, ...dateFilter } }),
```

While this is a COUNT query (not returning rows), if `dateFilter` is not provided, this could count the user's entire workout history. Not a performance issue for counts, but inconsistent with other queries that always apply limits.

---

#### Prod #4: Missing Index on `clientSource` for Filtering
| Severity | File & Line |
|----------|-------------|
| **HIGH** | `backend/migrations/20260314000001-add-client-source-to-users.cjs` — Line ~30 |

**What's Wrong:**
The migration creates an index on `clientSource`:
```javascript
await queryInterface.addIndex('Users', ['clientSource'], {
  name: 'idx_users_client_source',
  unique: false
});
```

However, the `getClients` controller uses `clientSource` in a filter:
```javascript
if (clientSource) {
  whereClause.clientSource = clientSource;
}
```

This should work, but verify the index is actually being used with `EXPLAIN ANALYZE`. The index on a low-cardinality column (only 3 values) may not be used by the query planner.

---

## Summary Table

| Severity | Count | Top Issues |
|----------|-------|------------|
| **CRITICAL** | 4 | Invalid `clientSource` validation, wrong field name in query, unverified `req.user`, weak password policy |
| **HIGH** | 6 | Null reference risks, inconsistent errors, missing validation, race condition, soft delete issues, no transactions |
| **MEDIUM** | 5 | Defensive checks hiding issues, username collisions, N+1 potential, inconsistent password handling, no sanitization |
| **LOW** | 6 | Console logging, dead comments, hardcoded URLs, TODO items |

---

## Recommended Priority Fixes

1. **Immediate (P0):** Fix Bug #1 (`clientSource` validation), Bug #2 (field name), Bug #3 (`req.user`), Bug #4 (password length)
2. **This Sprint (P1):** Add request validation middleware, fix console logging, standardize error handling
3. **Next Sprint (P2):** Address architecture issues (lazy loading, rate limiting), clean up dead code
4. **Backlog (P3):** Sanitization, MCP status response improvement, username collision handling

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
