# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 75.1s
> **Files:** backend/services/ai/debate/debateOrchestrator.mjs, backend/routes/aiDebateRoutes.mjs, backend/services/voiceTranscriptionService.mjs, frontend/src/components/AIAssistant/DictationOrb.tsx, frontend/src/components/AIAssistant/VoiceUpload.tsx, backend/services/ai/aiVillageService.mjs
> **Generated:** 3/20/2026, 4:23:10 AM

---

# 🚨 DATA SAFETY AUDIT REPORT — CRITICAL FINDINGS

## EXECUTIVE SUMMARY
**CRITICAL RISK IDENTIFIED**: In-memory job stores with **NO DATABASE PERSISTENCE** create catastrophic data loss scenarios during server restarts, crashes, or deployments.

---

## 🔴 CRITICAL FINDINGS

### **CRITICAL-001: Debate Results Lost on Server Restart**
- **Severity:** CRITICAL
- **Data at Risk:** All AI-generated workout plans, nutrition plans, progress analyses
- **Blast Radius:** ALL users with in-progress or recently completed debates (last 30-60 minutes)
- **File & Line:** `backend/services/ai/debate/debateOrchestrator.mjs:40-42`

**What's Wrong:**
```javascript
const activeDebates = new Map();
```
Debate results stored ONLY in memory. When the server restarts (deployment, crash, OOM kill, PM2 restart):
1. User requests a $0.50 AI debate (takes 2-3 minutes to run)
2. Server crashes 90 seconds in
3. User polls `/api/ai/debate/:jobId/status` → **404 Not Found**
4. All debate rounds, cost tracking, and partial results **permanently lost**
5. User must pay again and wait another 3 minutes

**Production Scenario:**
- Trainer generates a 12-week workout plan for a client at 2:55 PM
- DevOps deploys a hotfix at 3:00 PM (standard zero-downtime deploy)
- Debate job lost mid-execution
- Trainer sees "Debate not found" error
- Client never receives their plan
- No audit trail of what happened

**Fix:**
```javascript
// Option A: Persist to PostgreSQL (recommended)
import { DebateJob } from '../../models/DebateJob.mjs';

async function createDebateJob(debateType, clientContext, userId, options = {}) {
  const jobId = `debate_${randomBytes(16).toString('hex')}`;
  
  const job = await DebateJob.create({
    id: jobId,
    type: debateType,
    state: DEBATE_STATES.PENDING,
    userId,
    clientContext: JSON.stringify(clientContext),
    options: JSON.stringify(options),
    rounds: [],
    totalCostUSD: 0,
    progress: [],
  });
  
  activeDebates.set(jobId, job); // Keep in-memory cache
  return job;
}

// Update state changes to persist
async function updateDebateState(jobId, updates) {
  const job = activeDebates.get(jobId);
  Object.assign(job, updates);
  
  await DebateJob.update(updates, { where: { id: jobId } });
}

// On server startup, restore active debates
async function restoreActiveDebates() {
  const active = await DebateJob.findAll({
    where: { 
      state: { [Op.in]: [DEBATE_STATES.PENDING, DEBATE_STATES.RUNNING] },
      createdAt: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) }
    }
  });
  
  for (const job of active) {
    // Mark as failed with recovery message
    await job.update({
      state: DEBATE_STATES.FAILED,
      error: 'Server restarted during debate execution. Please retry.',
      completedAt: new Date(),
    });
  }
}
```

---

### **CRITICAL-002: Validation Job Results Lost on Restart**
- **Severity:** CRITICAL  
- **Data at Risk:** AI Village 11-brain validation reports, security audit results
- **Blast Radius:** ALL admins running validations (typically 1-2 per day)
- **File & Line:** `backend/services/ai/aiVillageService.mjs:27`

**What's Wrong:**
```javascript
const activeJobs = new Map();
```
Same issue as debates. Validation runs take 5-10 minutes and cost API credits. If server restarts:
1. Admin triggers full codebase validation (10 min runtime)
2. Server crashes at minute 8
3. All validation output lost
4. Admin must re-run (wastes 8 minutes + API costs)

**Additional Risk:**
The validation orchestrator runs as a **child process** (`execFile`). If the parent Node process crashes, the child process becomes orphaned and continues consuming resources without any way to retrieve results.

**Fix:**
```javascript
// Persist validation jobs to database
const ValidationJob = sequelize.define('ValidationJob', {
  id: { type: DataTypes.STRING, primaryKey: true },
  state: { type: DataTypes.ENUM('pending', 'running', 'complete', 'failed') },
  userId: { type: DataTypes.INTEGER },
  options: { type: DataTypes.JSONB },
  output: { type: DataTypes.TEXT }, // Store incrementally
  exitCode: { type: DataTypes.INTEGER },
  error: { type: DataTypes.TEXT },
  summary: { type: DataTypes.TEXT },
  startedAt: { type: DataTypes.DATE },
  completedAt: { type: DataTypes.DATE },
});

// Write output to DB every 5 seconds during execution
child.stdout.on('data', async (chunk) => {
  job.output += chunk.toString();
  await ValidationJob.update(
    { output: job.output },
    { where: { id: job.id } }
  );
});
```

---

### **HIGH-003: Race Condition in Transcription Rate Limiting**
- **Severity:** HIGH
- **Data at Risk:** API cost overruns, user quota bypass
- **Blast Radius:** All users with concurrent transcription requests
- **File & Line:** `backend/services/voiceTranscriptionService.mjs:23-34`

**What's Wrong:**
```javascript
export function checkTranscriptionLimit(userId) {
  const entry = userTranscriptions.get(userId);
  if (!entry || entry.resetAt < now) {
    return { allowed: true, remaining: MAX_TRANSCRIPTIONS_PER_HOUR };
  }
  const remaining = MAX_TRANSCRIPTIONS_PER_HOUR - entry.count;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}

export function recordTranscription(userId) {
  // ... increments count AFTER transcription completes
}
```

**Race Condition:**
1. User at 9/10 quota sends 5 concurrent transcription requests
2. All 5 requests call `checkTranscriptionLimit()` simultaneously
3. All see `remaining: 1` → all allowed
4. User transcribes 5 files (total: 14/10) → quota bypassed

**Fix:**
```javascript
// ALREADY FIXED in code — use checkAndRecordTranscription()
export function checkAndRecordTranscription(userId) {
  const now = Date.now();
  const entry = userTranscriptions.get(userId);

  if (!entry || entry.resetAt < now) {
    userTranscriptions.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return { allowed: true, remaining: MAX_TRANSCRIPTIONS_PER_HOUR - 1 };
  }

  if (entry.count >= MAX_TRANSCRIPTIONS_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++; // ✅ Atomic increment
  return { allowed: true, remaining: MAX_TRANSCRIPTIONS_PER_HOUR - entry.count };
}
```

**BUT** — the route handler must use this function. Verify in `backend/routes/aiChatRoutes.mjs` (not provided) that it calls `checkAndRecordTranscription()` instead of separate check/record.

---

### **HIGH-004: Debate Ownership Validation Happens AFTER Job Lookup**
- **Severity:** HIGH
- **Data at Risk:** Debate results, client PII in debate context
- **Blast Radius:** Any authenticated user can access any other user's debate
- **File & Line:** `backend/routes/aiDebateRoutes.mjs:34-47`

**What's Wrong:**
```javascript
const validateDebateOwnership = (req, res, next) => {
  const job = getDebateJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ success: false, error: 'Debate not found' });
  }

  if (job.userId !== req.user.id && req.user.role !== 'admin') {
    logger.warn(`[Security] User ${req.user.id} attempted unauthorized access`);
    return res.status(403).json({ success: false, error: 'Unauthorized access' });
  }
  // ...
};
```

**IDOR Vulnerability:**
1. Attacker (user ID 42) creates a debate → gets `jobId: debate_abc123`
2. Attacker guesses another user's jobId: `debate_abc124`
3. Calls `GET /api/ai/debate/debate_abc124/status`
4. Middleware fetches full job object (including `clientContext` with PII)
5. **THEN** checks ownership
6. Returns 403, but job data already loaded into memory

**Information Leakage:**
Even though the response is 403, the attacker can:
- Enumerate valid job IDs (404 vs 403)
- Time the response to infer if the job exists
- If there's any error logging, PII might leak to logs

**Fix:**
```javascript
// Option A: Check ownership in the query itself
export function getDebateJob(jobId, userId, isAdmin = false) {
  const job = activeDebates.get(jobId);
  if (!job) return null;
  
  // Authorization check at data layer
  if (job.userId !== userId && !isAdmin) {
    return null; // Don't reveal existence
  }
  
  return job;
}

// Middleware becomes simpler
const validateDebateOwnership = (req, res, next) => {
  const job = getDebateJob(
    req.params.jobId,
    req.user.id,
    req.user.role === 'admin'
  );

  if (!job) {
    return res.status(404).json({ success: false, error: 'Debate not found' });
  }

  req.debateJob = job;
  next();
};
```

---

### **MEDIUM-005: Debate Cost Tracking Not Persisted**
- **Severity:** MEDIUM
- **Data at Risk:** API cost accounting, billing reconciliation
- **Blast Radius:** All debates (affects financial reporting)
- **File & Line:** `backend/services/ai/debate/debateOrchestrator.mjs:362`

**What's Wrong:**
```javascript
// Estimate cost (~$0.002 per round for free models, ~$0.01 for Gemini Pro)
job.totalCostUSD += 0.005;
```

Cost tracking is:
1. **Estimated** (not actual from provider)
2. **In-memory only** (lost on restart)
3. **Not logged to database** (no audit trail)

**Business Impact:**
- Cannot reconcile actual API bills with internal cost tracking
- If server crashes mid-debate, cost is lost (under-reporting)
- No per-client cost attribution for billing

**Fix:**
```javascript
// Log each round's cost to database
await sequelize.query(
  `INSERT INTO "DebateRoundCosts" 
   ("debateId", "roundNumber", "model", "estimatedCostUSD", "actualCostUSD", "createdAt")
   VALUES (:debateId, :round, :model, :estimated, :actual, NOW())`,
  {
    replacements: {
      debateId: job.id,
      round: roundNumber,
      model: 'gemini-pro', // from config
      estimated: 0.005,
      actual: result.usage?.totalCost || null, // if provider returns it
    },
  }
);

// Aggregate for reporting
SELECT "debateId", SUM("estimatedCostUSD") as total
FROM "DebateRoundCosts"
GROUP BY "debateId";
```

---

### **MEDIUM-006: Zombie Debate Cleanup Deletes Jobs Without Marking Failed**
- **Severity:** MEDIUM
- **Data at Risk:** Debate state integrity, user-facing error messages
- **Blast Radius:** Debates that exceed 60-minute runtime
- **File & Line:** `backend/services/ai/debate/debateOrchestrator.mjs:50-61`

**What's Wrong:**
```javascript
if (!debate.completedAt && debate.startedAt && debate.startedAt < zombieThreshold) {
  logger.error(`[DebateOrchestrator] Reaping zombie debate ${id}`);
  debate.state = DEBATE_STATES.FAILED;
  debate.error = 'Debate exceeded maximum runtime and was terminated';
  debate.completedAt = Date.now();
  activeDebates.delete(id); // ❌ Deleted immediately
  zombieCount++;
}
```

**Issue:**
1. Debate runs for 61 minutes (zombie threshold)
2. Cleanup timer marks it as FAILED and sets error message
3. **Immediately deletes it from activeDebates**
4. User polls `/status` 5 seconds later → **404 Not Found**
5. User never sees the error message "exceeded maximum runtime"

**Fix:**
```javascript
// Don't delete immediately — let normal cleanup handle it after 30 min
if (!debate.completedAt && debate.startedAt && debate.startedAt < zombieThreshold) {
  logger.error(`[DebateOrchestrator] Reaping zombie debate ${id}`);
  debate.state = DEBATE_STATES.FAILED;
  debate.error = 'Debate exceeded maximum runtime and was terminated';
  debate.completedAt = Date.now();
  // ✅ Don't delete — let it be cleaned up by normal 30-min threshold
  zombieCount++;
}
```

---

### **MEDIUM-007: Debate Client Context Contains PII**
- **Severity:** MEDIUM
- **Data at Risk:** Client names, ages, medical conditions (pain entries)
- **Blast Radius:** All debates (stored in memory, logs, potential DB)
- **File & Line:** `backend/routes/aiDebateRoutes.mjs:79-107`

**What's Wrong:**
```javascript
const [client] = await sequelize.query(
  `SELECT id, "firstName", "lastName", age, gender, "nasmPhase", ...
   FROM "Users" WHERE id = :clientId`,
  // ...
);

const enrichment = {
  painEntries: [...], // Contains bodyPart, painLevel
  workouts: [...],
  macroLogs: [...],
  goals: [...],
};

const { deIdentified } = deIdentifyClient(client, enrichment);
```

**Risk:**
Even though `deIdentifyClient()` is called, the **original PII** is:
1. Loaded into memory (vulnerable to memory dumps)
2. Potentially logged if there's an error before de-identification
3. Passed through multiple function calls before sanitization

**Fix:**
```javascript
// De-identify at the SQL layer
const [client] = await sequelize.query(
  `SELECT 
     id,
     'Client' || id AS "firstName",  -- ✅ De-identify in query
     NULL AS "lastName",
     age,
     gender,
     "nasmPhase",
     "trainingExperience",
     "fitnessGoals"
   FROM "Users" 
   WHERE id = :clientId AND "isActive" = true 
   LIMIT 1`,
  { replacements: { clientId: resolvedClientId }, type: sequelize.QueryTypes.SELECT }
);

// PII never enters application memory
```

---

### **LOW-008: DictationOrb Memory Leak on Rapid Mount/Unmount**
- **Severity:** LOW
- **Data at Risk:** Browser memory (client-side only)
- **Blast Radius:** Users who rapidly navigate between pages with DictationOrb
- **File & Line:** `frontend/src/components/AIAssistant/DictationOrb.tsx:109-127`

**What's Wrong:**
```javascript
useEffect(() => {
  // ... create recognition ...
  
  return () =>

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
