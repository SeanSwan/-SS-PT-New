# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 79.3s
> **Files:** docs/ai-workflow/blueprints/SWAN-COACH-ASSISTANT-MASTER-BLUEPRINT.md, frontend/src/components/Shared/AITerminalPanel.tsx, frontend/src/components/AIAssistant/AIContextSelector.tsx, frontend/src/components/AIAssistant/DictationOrb.tsx, frontend/src/config/dashboard-tabs.ts
> **Generated:** 3/30/2026, 5:26:33 PM

---

# 🚨 DATA SAFETY AUDIT REPORT — SWAN STUDIOS

**Auditor:** DATA SAFETY AUDITOR  
**Date:** 2026-03-30  
**Severity Scale:** CRITICAL (data loss) | HIGH (corruption risk) | MEDIUM (exposure) | LOW (best practice)

---

## ⚠️ EXECUTIVE SUMMARY

**CRITICAL FINDINGS:** 0  
**HIGH FINDINGS:** 3  
**MEDIUM FINDINGS:** 4  
**LOW FINDINGS:** 2

**Overall Risk Level:** 🟡 **MODERATE** — No immediate data-loss vulnerabilities found in reviewed code, but **architectural gaps** exist that could lead to data corruption or loss in production scenarios not covered by these files.

**Key Concern:** The blueprint describes a system that will interact with user data (workouts, clients, sessions, macros) but the reviewed code **does not show database operations**. The real risk lies in the **backend implementation** (not provided) and **missing safeguards** in the architecture.

---

## 🔴 CRITICAL FINDINGS

### None in reviewed code
The files reviewed are **frontend UI components and documentation**. No direct database operations (`DELETE`, `TRUNCATE`, `sync({ force: true })`, etc.) are present.

---

## 🟠 HIGH FINDINGS

### HIGH-1: Unvalidated Client Context Injection Could Corrupt Data
**Severity:** HIGH  
**Data at Risk:** Client workout plans, session logs, macro entries  
**Blast Radius:** 1 client per incident, but repeatable across all clients  
**File & Line:** `frontend/src/components/Shared/AITerminalPanel.tsx:144-151`

**What's Wrong:**
```tsx
let enrichedMessage = text;
if (clientId) {
  enrichedMessage += `\n[Context: clientId=${clientId}]`;
}
if (equipmentProfileId) {
  enrichedMessage += `\n[Context: equipmentProfileId=${equipmentProfileId}]`;
}
```

The `clientId` and `equipmentProfileId` are **appended to the user's message without validation**. If the backend AI service uses this context to perform database operations (e.g., "log this workout for client 123"), a malicious or buggy frontend could:
- Send `clientId=-1` or `clientId=null` → backend writes to wrong client or crashes
- Send `clientId=999999` (non-existent) → orphaned records
- Send `clientId` of a different user → **cross-client data corruption**

**Scenario:**
1. Admin opens AITerminalPanel with `clientId={5}` (Jackie)
2. Browser extension or XSS modifies the prop to `clientId={8}` (Marcus)
3. Admin says "Log today's workout: Bench Press 3x10"
4. Backend writes workout to Marcus's account instead of Jackie's
5. **Data corruption:** Marcus now has Jackie's workout in his history

**Fix:**
```tsx
// AITerminalPanel.tsx
const handleSend = useCallback(async () => {
  const text = inputValue.trim();
  if (!text || sending) return;

  // ✅ VALIDATE clientId before sending
  if (clientId !== undefined && (clientId <= 0 || !Number.isInteger(clientId))) {
    console.error('[AITerminalPanel] Invalid clientId:', clientId);
    // Show error to user: "Invalid client context. Please refresh and try again."
    return;
  }

  // ✅ VALIDATE equipmentProfileId
  if (equipmentProfileId !== undefined && equipmentProfileId !== null && equipmentProfileId <= 0) {
    console.error('[AITerminalPanel] Invalid equipmentProfileId:', equipmentProfileId);
    return;
  }

  let enrichedMessage = text;
  if (clientId && clientId > 0) {
    enrichedMessage += `\n[Context: clientId=${clientId}]`;
  }
  if (equipmentProfileId && equipmentProfileId > 0) {
    enrichedMessage += `\n[Context: equipmentProfileId=${equipmentProfileId}]`;
  }

  setInputValue('');
  await sendMessageWithConversation(enrichedMessage, context, `${displayLabel} — ${context}`, clientId || null);
}, [inputValue, sending, clientId, equipmentProfileId, context, displayLabel, sendMessageWithConversation]);
```

**Backend Mitigation (REQUIRED):**
```javascript
// backend/services/aiChatService.mjs
async function processAIMessage(message, userId, context) {
  // ✅ Extract clientId from message context
  const clientIdMatch = message.match(/\[Context: clientId=(\d+)\]/);
  const clientId = clientIdMatch ? parseInt(clientIdMatch[1], 10) : null;

  if (clientId) {
    // ✅ VERIFY the requesting user has permission to access this client
    const hasAccess = await db.ClientTrainerAssignments.findOne({
      where: { clientId, trainerId: userId }
    });

    if (!hasAccess && userRole !== 'admin') {
      throw new Error('Unauthorized: You do not have access to this client');
    }

    // ✅ VERIFY the client exists
    const client = await db.Users.findByPk(clientId);
    if (!client) {
      throw new Error(`Client ID ${clientId} does not exist`);
    }
  }

  // ... proceed with AI processing
}
```

---

### HIGH-2: Voice Auto-Send Could Trigger Unintended Destructive Commands
**Severity:** HIGH  
**Data at Risk:** Any data the AI has permission to modify (workouts, sessions, client records)  
**Blast Radius:** 1 user per incident, but high frequency risk (voice is always-on)  
**File & Line:** `frontend/src/components/Shared/AITerminalPanel.tsx:156-167` and `frontend/src/components/AIAssistant/DictationOrb.tsx:228-237`

**What's Wrong:**
Voice auto-send fires **750ms after speech ends** with no confirmation. If the AI backend has destructive capabilities (e.g., "delete all workouts for this client"), a misheard phrase could trigger data loss.

**Scenario:**
1. Trainer says: "Show me Jackie's **last** workout"
2. Speech API mishears as: "**Delete** Jackie's last workout"
3. Auto-send fires → backend AI interprets as delete command
4. **Data loss:** Jackie's most recent workout is deleted with no undo

**Current Code:**
```tsx
// DictationOrb.tsx:228-237
recognition.onend = () => {
  // ...
  if (sessionText) {
    autoSendTimerRef.current = setTimeout(() => {
      autoSendTimerRef.current = null;
      onAutoSendRef.current?.(sessionText); // ⚠️ NO CONFIRMATION
    }, 750);
  }
};
```

**Fix — Add Destructive Command Detection:**
```tsx
// DictationOrb.tsx
const DESTRUCTIVE_KEYWORDS = ['delete', 'remove', 'clear', 'wipe', 'erase', 'drop'];

recognition.onend = () => {
  setListening(false);
  setInterim('');

  if (!holdToTalkRef.current && autoSendRef.current && onAutoSendRef.current) {
    const sessionText = sessionAccumulatedRef.current.trim();
    sessionAccumulatedRef.current = '';

    if (sessionText) {
      // ✅ CHECK for destructive keywords
      const lowerText = sessionText.toLowerCase();
      const hasDestructiveKeyword = DESTRUCTIVE_KEYWORDS.some(kw => lowerText.includes(kw));

      if (hasDestructiveKeyword) {
        // ✅ REQUIRE manual confirmation for destructive commands
        // Fill the input field but DO NOT auto-send
        onTranscriptRef.current(sessionText);
        // Show warning toast: "Destructive command detected. Please review and send manually."
        return;
      }

      // Safe command → auto-send as normal
      autoSendTimerRef.current = setTimeout(() => {
        autoSendTimerRef.current = null;
        onAutoSendRef.current?.(sessionText);
      }, 750);
    }
  }
};
```

**Backend Mitigation (REQUIRED):**
```javascript
// backend/services/aiChatService.mjs
const DESTRUCTIVE_ACTIONS = ['delete', 'remove', 'clear', 'drop', 'truncate'];

async function executeAIAction(action, params, userId) {
  const actionLower = action.toLowerCase();
  const isDestructive = DESTRUCTIVE_ACTIONS.some(kw => actionLower.includes(kw));

  if (isDestructive) {
    // ✅ REQUIRE explicit confirmation token from frontend
    if (!params.confirmationToken || params.confirmationToken !== 'USER_CONFIRMED') {
      return {
        requiresConfirmation: true,
        message: `This action will ${action}. Please confirm to proceed.`,
        confirmationRequired: true
      };
    }

    // ✅ LOG all destructive actions
    await db.AuditLog.create({
      userId,
      action: `AI_DESTRUCTIVE_ACTION: ${action}`,
      params: JSON.stringify(params),
      timestamp: new Date()
    });
  }

  // ... execute action
}
```

---

### HIGH-3: Missing Transaction Wrappers for Multi-Step AI Actions
**Severity:** HIGH  
**Data at Risk:** Workout plans, client assignments, session bookings  
**Blast Radius:** 1 client per incident, leaves data in inconsistent state  
**File & Line:** Blueprint Section 13 (Data Flow) — backend implementation not provided

**What's Wrong:**
The blueprint describes AI actions that will involve **multiple database writes**:
- "Generate workout plan" → creates WorkoutPlan + WorkoutExercises + sets ClientWorkoutPlan
- "Book session" → creates Session + updates trainer availability + sends notification
- "Log meal" → creates MacroLog + updates daily totals + recalculates weekly averages

If any step fails mid-operation, **partial data is left in the database**.

**Scenario:**
1. AI generates a 6-exercise workout plan for Jackie
2. Backend writes WorkoutPlan (ID 501)
3. Backend writes 3 WorkoutExercises successfully
4. **Network timeout** on exercise 4
5. Backend crashes before writing exercises 5-6
6. **Data corruption:** Jackie has a workout plan with only 3 exercises (incomplete)
7. Trainer sees the plan, thinks it's complete, assigns it to Jackie
8. Jackie trains with an incomplete plan

**Fix (Backend — CRITICAL):**
```javascript
// backend/services/aiWorkoutService.mjs
async function generateWorkoutPlan(clientId, exercises, optPhase, trainerId) {
  const transaction = await db.sequelize.transaction();

  try {
    // ✅ ALL writes happen inside transaction
    const plan = await db.WorkoutPlans.create({
      name: `AI Generated - ${new Date().toISOString()}`,
      clientId,
      trainerId,
      optPhase,
      status: 'draft'
    }, { transaction });

    const exerciseRecords = await Promise.all(
      exercises.map(ex => db.WorkoutExercises.create({
        workoutPlanId: plan.id,
        exerciseId: ex.exerciseId,
        sets: ex.sets,
        reps: ex.reps,
        tempo: ex.tempo,
        rest: ex.rest
      }, { transaction }))
    );

    await db.ClientWorkoutPlans.create({
      clientId,
      workoutPlanId: plan.id,
      assignedAt: new Date()
    }, { transaction });

    // ✅ COMMIT only if all steps succeed
    await transaction.commit();

    return { success: true, planId: plan.id };

  } catch (error) {
    // ✅ ROLLBACK on any failure
    await transaction.rollback();
    logger.error('[AI Workout] Transaction failed:', error);
    throw new Error('Failed to generate workout plan. No data was saved.');
  }
}
```

---

## 🟡 MEDIUM FINDINGS

### MEDIUM-1: Client PII Exposure in AI Message Context
**Severity:** MEDIUM  
**Data at Risk:** Client names, IDs, equipment profiles  
**Blast Radius:** 1 client per message, but logged in browser console and backend logs  
**File & Line:** `frontend/src/components/Shared/AITerminalPanel.tsx:144-151`

**What's Wrong:**
```tsx
enrichedMessage += `\n[Context: clientId=${clientId}]`;
```

Client IDs are appended to **every AI message**. If backend logs these messages (common for debugging), client IDs are stored in plaintext logs. If logs are compromised, attacker can map IDs to users.

**Fix:**
```tsx
// ✅ Use opaque tokens instead of raw IDs
const clientToken = clientId ? await hashClientId(clientId) : null;
enrichedMessage += `\n[Context: clientToken=${clientToken}]`;
```

Backend decodes the token to retrieve the actual ID.

---

### MEDIUM-2: No Rate Limiting on AI Requests
**Severity:** MEDIUM  
**Data at Risk:** API quota exhaustion, cost overruns, denial of service  
**Blast Radius:** All users (if quota exhausted, AI stops working for everyone)  
**File & Line:** `frontend/src/components/Shared/AITerminalPanel.tsx:138-152`

**What's Wrong:**
No frontend or backend rate limiting is mentioned. A user (or bug) could spam AI requests, exhausting Gemini/OpenAI quota and racking up costs.

**Fix (Frontend):**
```tsx
const [requestCount, setRequestCount] = useState(0);
const [lastRequestTime, setLastRequestTime] = useState(0);

const handleSend = useCallback(async () => {
  const now = Date.now();
  
  // ✅ RATE LIMIT: max 10 requests per minute
  if (now - lastRequestTime < 60000 && requestCount >= 10) {
    // Show error: "Too many requests. Please wait a moment."
    return;
  }

  if (now - lastRequestTime >= 60000) {
    setRequestCount(1);
  } else {
    setRequestCount(prev => prev + 1);
  }
  setLastRequestTime(now);

  // ... proceed with send
}, [requestCount, lastRequestTime, ...]);
```

**Fix (Backend — REQUIRED):**
```javascript
// backend/middleware/rateLimiter.mjs
import rateLimit from 'express-rate-limit';

export const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per user
  keyGenerator: (req) => req.user.id,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many AI requests. Please wait a moment.'
    });
  }
});

// Apply to AI routes
app.use('/api/ai-chat', aiChatLimiter);
```

---

### MEDIUM-3: Voice Transcript Stored in Browser Memory Indefinitely
**Severity:** MEDIUM  
**Data at Risk:** Sensitive voice transcripts (client health info, payment details)  
**Blast Radius:** 1 user, but persistent across sessions if not cleared  
**File & Line:** `frontend/src/components/AIAssistant/DictationOrb.tsx:90-92`

**What's Wrong:**
```tsx
const accumulatedRef = useRef('');
const sessionAccumulatedRef = useRef('');
```

Voice transcripts accumulate in refs and are never explicitly cleared. If a user dictates sensitive info ("Jackie's credit card is 4111..."), it stays in memory until page refresh.

**Fix:**
```tsx
// ✅ Clear sensitive data after send
const handleSend = useCallback(async () => {
  // ... send logic
  
  // Clear accumulated transcripts
  accumulatedRef.current = '';
  sessionAccumulatedRef.current = '';
  setInterim('');
}, [...]);

// ✅ Clear on unmount
useEffect(() => {
  return () => {
    accumulatedRef.current = '';
    sessionAccumulatedRef.current = '';
  };

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
