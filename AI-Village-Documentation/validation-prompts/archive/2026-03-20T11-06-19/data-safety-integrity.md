# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 69.5s
> **Files:** backend/services/ai/commandExecutor.mjs, backend/services/ai/intentClassifier.mjs, backend/services/ai/clientResolver.mjs, backend/services/ai/errorLoopPrevention.mjs, backend/routes/aiBffRoutes.mjs
> **Generated:** 3/20/2026, 4:06:19 AM

---

# 🚨 DATA SAFETY AUDIT REPORT — CRITICAL FINDINGS

## EXECUTIVE SUMMARY
**OVERALL RISK LEVEL: MEDIUM-HIGH**

This AI command execution pipeline has **NO DIRECT DATABASE DESTRUCTIVE OPERATIONS** in the reviewed files, which is good. However, there are **CRITICAL ARCHITECTURAL GAPS** that could lead to data loss through indirect pathways, plus several high-risk patterns that need immediate attention.

---

## 🔴 CRITICAL FINDINGS

### 1. **UNVERIFIED DESTRUCTIVE OPERATION EXECUTION**
**Severity:** CRITICAL  
**Data at Risk:** ANY user data — workouts, profiles, sessions, measurements  
**Blast Radius:** Depends on operation — could be 1 user or ALL users  
**File:** `backend/services/ai/commandExecutor.mjs:397-420`

**What's Wrong:**
```javascript
export async function executeConfirmedOperation(operationId, user, sequelize) {
  const { verified, operation, error } = verifyAndRetrieveOperation(operationId, user.id);

  if (!verified) {
    return { success: false, message: error, data: null };
  }

  // Execute via internal API call
  try {
    const command = getCommand(operation.type);
    // The actual API call will be handled by the route layer
    // Return the verified operation for the route to execute
    return {
      success: true,
      message: `Operation confirmed: ${operation.description}`,
      data: {
        endpoint: operation.endpoint,
        method: command?.method || 'POST',
        params: operation.params,
        operationId: operation.id,
      },
    };
```

**THE PROBLEM:** This function returns a "success" response **WITHOUT ACTUALLY EXECUTING THE OPERATION**. The comment says "will be handled by the route layer" but there's **NO TRANSACTION WRAPPER**, **NO ROLLBACK MECHANISM**, and **NO VERIFICATION** that the route layer will handle it correctly.

**Failure Scenarios:**
1. Route layer crashes mid-execution → partial data written, no rollback
2. Network timeout between this function and route → operation marked confirmed but never executed
3. Route layer receives wrong params → deletes wrong records
4. No audit trail of what was ACTUALLY deleted vs. what was CONFIRMED

**Fix:**
```javascript
export async function executeConfirmedOperation(operationId, user, sequelize) {
  const { verified, operation, error } = verifyAndRetrieveOperation(operationId, user.id);

  if (!verified) {
    return { success: false, message: error, data: null };
  }

  const transaction = await sequelize.transaction();
  
  try {
    const command = getCommand(operation.type);
    if (!command) {
      throw new Error(`Command ${operation.type} not found in registry`);
    }

    // CRITICAL: Verify operation hasn't already been executed
    const alreadyExecuted = await sequelize.query(
      `SELECT executed_at FROM destructive_operations WHERE operation_id = :opId AND executed_at IS NOT NULL`,
      { replacements: { opId: operationId }, type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (alreadyExecuted.length > 0) {
      await transaction.rollback();
      return { success: false, message: 'Operation already executed', data: null };
    }

    // Execute the actual database operation HERE, not in route layer
    let result;
    if (command.method === 'DELETE') {
      // REQUIRE explicit WHERE clause
      if (!operation.params.id && !operation.params.clientId) {
        throw new Error('DELETE operations MUST specify id or clientId');
      }
      
      // Log BEFORE delete for audit trail
      const recordsToDelete = await sequelize.query(
        `SELECT * FROM "${command.table}" WHERE id = :id`,
        { replacements: { id: operation.params.id }, type: sequelize.QueryTypes.SELECT, transaction }
      );
      
      logger.info('[DESTRUCTIVE_OP] Pre-delete snapshot', {
        operationId,
        userId: user.id,
        table: command.table,
        recordCount: recordsToDelete.length,
        records: recordsToDelete,
      });

      result = await sequelize.query(
        command.query, // Must be parameterized query from registry
        { replacements: operation.params, type: sequelize.QueryTypes.DELETE, transaction }
      );
    } else {
      result = await sequelize.query(
        command.query,
        { replacements: operation.params, type: sequelize.QueryTypes.UPDATE, transaction }
      );
    }

    // Mark operation as executed
    await sequelize.query(
      `UPDATE destructive_operations SET executed_at = NOW(), executed_by = :userId WHERE operation_id = :opId`,
      { replacements: { userId: user.id, opId: operationId }, transaction }
    );

    await transaction.commit();

    logger.info('[DESTRUCTIVE_OP] Executed successfully', {
      operationId,
      userId: user.id,
      affectedRows: result[1],
    });

    return {
      success: true,
      message: `Operation completed: ${operation.description}`,
      data: { affectedRows: result[1], operationId },
    };

  } catch (err) {
    await transaction.rollback();
    logger.error('[DESTRUCTIVE_OP] Execution failed, rolled back', {
      operationId,
      error: err.message,
      stack: err.stack,
    });
    return { success: false, message: `Execution failed: ${err.message}`, data: null };
  }
}
```

---

### 2. **MISSING DESTRUCTIVE OPERATIONS TABLE**
**Severity:** CRITICAL  
**Data at Risk:** Audit trail of ALL destructive operations  
**Blast Radius:** System-wide — no way to prove what was deleted or by whom  
**File:** `backend/services/ai/commandExecutor.mjs:186-203`

**What's Wrong:**
The code references `prepareDestructiveOperation()` and `verifyAndRetrieveOperation()` from `./destructiveOperations.mjs`, but **THAT FILE IS NOT PROVIDED**. This means:

1. **NO DATABASE TABLE** to store pending operations
2. **NO HMAC VERIFICATION** implementation visible
3. **NO EXPIRATION ENFORCEMENT** on confirmations
4. **NO AUDIT TRAIL** of who confirmed what

**Failure Scenarios:**
- User confirms operation, server restarts → operation ID lost, never executed
- Attacker replays old operation IDs → re-executes deleted operations
- No way to audit "who deleted client #61's workout history on 2026-03-19"

**Fix:**
Create migration **IMMEDIATELY**:

```sql
-- migrations/YYYYMMDD_create_destructive_operations.sql
CREATE TABLE IF NOT EXISTS destructive_operations (
  operation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('DELETE', 'UPDATE', 'BULK_DELETE')),
  target_table VARCHAR(100) NOT NULL,
  target_endpoint VARCHAR(255) NOT NULL,
  command_params JSONB NOT NULL,
  description TEXT NOT NULL,
  affected_records JSONB NOT NULL, -- Array of {id, name}
  hmac_signature VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '120 seconds',
  confirmed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  executed_by INTEGER REFERENCES "Users"(id),
  execution_result JSONB,
  
  -- Prevent replay attacks
  CONSTRAINT no_duplicate_execution CHECK (
    (executed_at IS NULL) OR (confirmed_at IS NOT NULL)
  )
);

CREATE INDEX idx_destructive_ops_user ON destructive_operations(user_id, created_at DESC);
CREATE INDEX idx_destructive_ops_expires ON destructive_operations(expires_at) WHERE executed_at IS NULL;

-- Auto-cleanup expired operations (prevent table bloat)
CREATE OR REPLACE FUNCTION cleanup_expired_destructive_ops()
RETURNS void AS $$
BEGIN
  DELETE FROM destructive_operations 
  WHERE expires_at < NOW() - INTERVAL '24 hours' 
    AND executed_at IS NULL;
END;
$$ LANGUAGE plpgsql;
```

---

### 3. **NO TRANSACTION WRAPPER IN PIPELINE**
**Severity:** HIGH  
**Data at Risk:** Client resolution + command execution state  
**Blast Radius:** 1 user per failed operation  
**File:** `backend/services/ai/commandExecutor.mjs:256-281`

**What's Wrong:**
```javascript
for (const step of PIPELINE_STEPS) {
  try {
    await step(ctx);
    if (ctx.error || ctx.skipRemainingSteps) {
      // ...
      return ctx;
    }
  } catch (err) {
    ctx.error = `Internal error during ${ctx.stage}: ${err.message}`;
    // ...
    return ctx;
  }
}
```

**THE PROBLEM:** If `stepResolveClient` succeeds but `stepDebateRouting` crashes, the client resolution is **NOT ROLLED BACK**. This can leave orphaned state in:
- Conversation history (error loop tracker)
- Cache entries
- Any side effects from earlier steps

**Fix:**
```javascript
export async function executeCommandPipeline(rawInput, user, options = {}) {
  const ctx = createContext(rawInput, user, options);
  const conversationId = options.conversationId || null;
  
  // Wrap ENTIRE pipeline in transaction if sequelize available
  const transaction = options.sequelize ? await options.sequelize.transaction() : null;
  
  try {
    // ... error loop check ...

    for (const step of PIPELINE_STEPS) {
      try {
        await step(ctx);
        if (ctx.error || ctx.skipRemainingSteps) {
          if (transaction) await transaction.rollback();
          ctx.metadata.timing.end = Date.now();
          ctx.metadata.timing.totalMs = ctx.metadata.timing.end - ctx.metadata.timing.start;
          auditPipelineResult(ctx);
          return ctx;
        }
      } catch (err) {
        if (transaction) await transaction.rollback();
        ctx.error = `Internal error during ${ctx.stage}: ${err.message}`;
        ctx.metadata.timing.end = Date.now();
        ctx.metadata.timing.totalMs = ctx.metadata.timing.end - ctx.metadata.timing.start;
        logger.error('[CommandExecutor] Pipeline exception', {
          stage: ctx.stage,
          error: err.message,
          stack: err.stack,
        });
        auditPipelineResult(ctx);
        return ctx;
      }
    }

    if (transaction) await transaction.commit();
    
    ctx.metadata.timing.end = Date.now();
    ctx.metadata.timing.totalMs = ctx.metadata.timing.end - ctx.metadata.timing.start;
    auditPipelineResult(ctx);
    return ctx;
    
  } catch (err) {
    if (transaction) await transaction.rollback();
    throw err;
  }
}
```

---

## 🟠 HIGH FINDINGS

### 4. **CLIENT RESOLVER SQL INJECTION RISK**
**Severity:** HIGH  
**Data at Risk:** Entire Users table  
**Blast Radius:** ALL users if exploited  
**File:** `backend/services/ai/clientResolver.mjs:119-127`

**What's Wrong:**
```javascript
let query = `SELECT id, "firstName", "lastName", email, "isActive", version
             FROM "Users" WHERE "isActive" = true AND role = 'client'`;
const replacements = {};

if (trainerId) {
  // Optionally restrict to trainer's clients — requires trainer-client relationship table
  // For now, just fetch all active clients (trainer filtering can be added later)
}

query += ' ORDER BY "lastName", "firstName" LIMIT 50';

const clients = await sequelize.query(query, {
  replacements,
  type: sequelize.QueryTypes.SELECT,
});
```

**THE PROBLEM:** The comment says "trainer filtering can be added later" but the code **DOESN'T USE THE `replacements` OBJECT**. If someone adds trainer filtering by string concatenation instead of parameterized queries, this becomes an SQL injection vector.

**Current Risk:** LOW (no concatenation yet)  
**Future Risk:** HIGH (when trainer filtering is added)

**Fix:**
```javascript
let query = `SELECT id, "firstName", "lastName", email, "isActive", version
             FROM "Users" WHERE "isActive" = true AND role = 'client'`;
const replacements = {};

if (trainerId) {
  // CRITICAL: Use parameterized query, NEVER string concatenation
  query += ` AND id IN (
    SELECT client_id FROM trainer_clients WHERE trainer_id = :trainerId
  )`;
  replacements.trainerId = trainerId;
}

query += ' ORDER BY "lastName", "firstName" LIMIT 50';

const clients = await sequelize.query(query, {
  replacements, // Now actually used
  type: sequelize.QueryTypes.SELECT,
});
```

**ALSO ADD VALIDATION:**
```javascript
if (trainerId && (typeof trainerId !== 'number' || trainerId <= 0)) {
  return { resolved: null, suggestions: [], error: 'Invalid trainer ID' };
}
```

---

### 5. **UNVALIDATED CLIENT ID INJECTION**
**Severity:** HIGH  
**Data at Risk:** Wrong client's data modified  
**Blast Radius:** 1 client per attack  
**File:** `backend/services/ai/commandExecutor.mjs:147-166`

**What's Wrong:**
```javascript
// Use explicitly selected client from UI, or extract from intent
const clientRef = ctx.intent.clientRef || ctx.options.selectedClientName;
const clientId = ctx.intent.params?.clientId || ctx.options.selectedClientId;

if (clientId) {
  // Direct ID provided — use it
  ctx.resolvedClient = { id: clientId };
  // Still need to resolve for name
}

// ...

// Inject resolved clientId into params
if (resolved && ctx.intent.params) {
  ctx.intent.params.clientId = resolved.id;
}
```

**THE PROBLEM:** If `ctx.intent.params.clientId` is provided by the AI classifier, it's **NEVER VALIDATED** against the user's permissions. A malicious prompt could trick the AI into classifying:

```
"Delete workout for client #999"
```

And if the trainer doesn't have access to client #999, the operation would still proceed to confirmation.

**Fix:**
```javascript
if (clientId) {
  // CRITICAL: Validate client ID is a positive integer
  const parsedId = parseInt(clientId);
  if (isNaN(parsedId) || parsedId <= 0) {
    ctx.error = 'Invalid client ID';
    return ctx;
  }
  
  // CRITICAL: Verify user has access to this client
  if (ctx.user.role === 'trainer') {
    const hasAccess = await sequelize.query(
      `SELECT 1 FROM trainer_clients WHERE trainer_id = :trainerId AND client_id = :clientId LIMIT 1`,
      { 
        replacements: { trainerId: ctx.user.id, clientId: parsedId },
        type: sequelize.QueryTypes.SELECT,
        transaction: ctx.options.transaction,
      }
    );
    
    if (!hasAccess || hasAccess.length === 0) {
      ctx.error = `You don't have access to client #${parsedId}`;
      return ctx;
    }
  }
  
  ctx.resolvedClient = { id: parsedId };
}
```

---

### 6. **CACHE POISONING VIA INTERNAL FETCH**
**Severity:** HIGH  
**Data at Risk:** Dashboard stats, client summaries exposed to wrong users  
**Blast Radius:** ALL users viewing cached data  
**File:** `backend/routes/aiBffRoutes.mjs:39-65`

**What's Wrong:**
```javascript
async function fetchInternal(path, req, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout =

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
