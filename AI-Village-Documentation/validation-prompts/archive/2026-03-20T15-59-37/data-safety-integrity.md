# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 74.8s
> **Files:** docs/ai-workflow/validation-reports/PLAYWRIGHT-QA-FINDINGS.md, frontend/src/components/AIAssistant/DictationOrb.tsx, frontend/src/components/AIAssistant/AIAssistantDrawer.tsx, frontend/src/components/AIAssistant/AIAssistantFAB.tsx, backend/services/ai/commandExecutor.mjs
> **Generated:** 3/20/2026, 8:59:37 AM

---

# 🚨 DATA SAFETY AUDIT REPORT — CRITICAL FINDINGS

## EXECUTIVE SUMMARY
**OVERALL RISK LEVEL: MEDIUM**  
No **CRITICAL** data-destructive operations found in the reviewed code. The codebase shows strong safety patterns (transaction wrappers, audit logging, circuit breakers). However, several **HIGH** and **MEDIUM** risks exist around data exposure, race conditions, and missing safeguards.

---

## ✅ POSITIVE SAFETY PATTERNS OBSERVED

1. **Audit Logging** — `commandExecutor.mjs` includes structured audit trails
2. **Circuit Breakers** — Error loop prevention module prevents runaway operations
3. **Destructive Operation Caps** — Per-user limits on pending destructive operations
4. **Transaction Wrappers** — References to transaction patterns in pipeline
5. **PHI Scanning** — De-identification and PHI stripping modules present
6. **RBAC Checks** — Role-based access control in command execution pipeline

---

## 🔴 CRITICAL FINDINGS: 0

---

## 🟠 HIGH SEVERITY FINDINGS: 3

### HIGH-1: Client Data Exposure via Stale SessionStorage
**Severity:** HIGH  
**Data at Risk:** Client PII (name, email, phone, address), workout history, measurements  
**Blast Radius:** 1 client's data exposed to wrong trainer/admin  
**File:** `frontend/src/components/AIAssistant/AIAssistantDrawer.tsx`  
**Lines:** 682-685

**What's Wrong:**
```tsx
const getTargetClientId = useCallback(() => {
  if (userRole !== 'admin' && userRole !== 'trainer') return null;
  if (selectedClient) return String(selectedClient.id);
  try { return sessionStorage.getItem('ai_target_client_id') || null; } catch { return null; }
}, [userRole, selectedClient]);
```

The fallback to `sessionStorage.getItem('ai_target_client_id')` creates a **data leak risk**:
- If a trainer views Client A, then switches to Client B without the picker updating, the AI could still operate on Client A's data
- SessionStorage persists across page navigations — a trainer could close the drawer, navigate to a different client's profile, reopen AI, and accidentally operate on the **previous** client
- No validation that the sessionStorage client ID matches the current route/context

**Scenario:**
1. Trainer opens AI for Client A (ID: 123), sessionStorage stores `"123"`
2. Trainer closes AI, navigates to Client B's dashboard (ID: 456)
3. Trainer reopens AI — `selectedClient` is null, so it reads `"123"` from sessionStorage
4. AI now operates on Client A's data while trainer thinks they're working with Client B
5. Trainer says "Log 2000 calories for today" → **writes to wrong client's nutrition log**

**Fix:**
```tsx
const getTargetClientId = useCallback(() => {
  if (userRole !== 'admin' && userRole !== 'trainer') return null;
  
  // ONLY use selectedClient state — never trust stale sessionStorage
  if (selectedClient) return String(selectedClient.id);
  
  // If no client selected, require explicit selection before allowing commands
  return null;
}, [userRole, selectedClient]);

// Add validation in handleSend:
const handleSend = useCallback(async () => {
  const text = inputValue.trim();
  if (!text || sending) return;
  
  // SAFETY: Require client selection for trainer/admin contexts that modify data
  if ((userRole === 'trainer' || userRole === 'admin') && 
      ['macro_logging', 'workout_generation', 'client_review'].includes(selectedContext) &&
      !selectedClient) {
    toast.error('Please select a client first');
    return;
  }
  
  // ... rest of send logic
}, [inputValue, sending, userRole, selectedContext, selectedClient]);
```

**Additional Safeguard:**
Clear sessionStorage on component unmount:
```tsx
useEffect(() => {
  return () => {
    try { sessionStorage.removeItem('ai_target_client_id'); } catch {}
  };
}, []);
```

---

### HIGH-2: Race Condition in Conversation Creation
**Severity:** HIGH  
**Data at Risk:** Duplicate conversation records, orphaned messages  
**Blast Radius:** 1 user per incident, but could corrupt conversation history  
**File:** `frontend/src/components/AIAssistant/AIAssistantDrawer.tsx`  
**Lines:** 687-702

**What's Wrong:**
```tsx
const handleSend = useCallback(async () => {
  const text = inputValue.trim();
  if (!text || sending) return;
  
  setInputValue('');

  // If no active conversation, create one first
  if (!activeConversation) {
    const targetClientId = getTargetClientId();
    const conv = await createConversation(selectedContext, undefined, targetClientId, selectedResponseStyle);
    if (!conv) {
      setInputValue(text); // Restore input on failure
      return;
    }
  }

  const result = await sendMessage(text);
  // ...
}, [inputValue, sending, activeConversation, selectedContext, selectedResponseStyle, createConversation, sendMessage, getTargetClientId]);
```

**Race Condition:**
1. User types message, clicks Send → `handleSend()` starts
2. `setInputValue('')` clears input immediately
3. `createConversation()` is async — takes 200ms
4. User clicks Send again (button is still enabled because `sending` hasn't updated yet)
5. **Second `handleSend()` call starts** → sees `!activeConversation` → creates **duplicate conversation**
6. Both calls then send messages to **different conversation IDs**
7. Result: User's messages split across 2 conversations, conversation list polluted

**Additional Issue:**  
If `createConversation()` succeeds but `sendMessage()` fails, the user's message is restored to the input field, but the **empty conversation remains in the database** (orphaned record).

**Fix:**
```tsx
const [creating, setCreating] = useState(false);

const handleSend = useCallback(async () => {
  const text = inputValue.trim();
  if (!text || sending || creating) return; // Guard against double-click
  
  // Don't clear input until we're sure we can send
  let conversationId = activeConversation?.id;
  
  if (!conversationId) {
    setCreating(true);
    try {
      const targetClientId = getTargetClientId();
      const conv = await createConversation(selectedContext, undefined, targetClientId, selectedResponseStyle);
      if (!conv) {
        toast.error('Failed to create conversation');
        return;
      }
      conversationId = conv.id;
    } catch (err) {
      toast.error('Failed to create conversation');
      return;
    } finally {
      setCreating(false);
    }
  }
  
  // Only clear input after conversation exists
  setInputValue('');
  
  const result = await sendMessage(text);
  if (result?.failed) {
    setInputValue(result.originalMessage || text);
  }
}, [inputValue, sending, creating, activeConversation, selectedContext, selectedResponseStyle, createConversation, sendMessage, getTargetClientId]);

// Update SendBtn to show creating state
<SendBtn 
  $active={hasInput && !sending && !creating} 
  onClick={handleSend} 
  disabled={sending || creating}
>
  {(sending || creating) ? <Spinner size={18} /> : <Send size={18} />}
</SendBtn>
```

---

### HIGH-3: Missing Input Length Validation Before Database Write
**Severity:** HIGH  
**Data at Risk:** Database performance, potential DoS, message truncation  
**Blast Radius:** All users (if attacker sends 1MB message)  
**File:** `frontend/src/components/AIAssistant/AIAssistantDrawer.tsx`  
**Lines:** 687-702

**What's Wrong:**
```tsx
const handleSend = useCallback(async () => {
  const text = inputValue.trim();
  if (!text || sending) return;
  if (text.length > 4000) return; // Max message length guard
  
  // ... but this check happens AFTER user clicks send
  // No visual feedback that message is too long
  // No prevention of typing beyond limit
}, [inputValue, sending, ...]);
```

**Issues:**
1. **Silent failure** — if user pastes 5000 chars, clicking Send does nothing (no error message)
2. **No textarea maxLength** — user can type/paste unlimited text, wasting time composing a message that will be rejected
3. **Backend may have different limit** — if backend allows 8000 chars but frontend caps at 4000, users lose data
4. **No warning at 90% capacity** — user doesn't know they're approaching limit

**Potential Data Loss Scenario:**
1. User dictates a long workout plan (3500 chars)
2. Adds more detail → 4200 chars
3. Clicks Send → **silently fails**, no error shown
4. User assumes it sent, closes drawer
5. **Message lost forever** (not in conversation history, not in database)

**Fix:**
```tsx
// Add visual feedback
const [inputError, setInputError] = useState<string | null>(null);
const MAX_MESSAGE_LENGTH = 4000;

const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const val = e.target.value;
  setInputValue(val);
  
  if (val.length > MAX_MESSAGE_LENGTH) {
    setInputError(`Message too long (${val.length}/${MAX_MESSAGE_LENGTH} chars)`);
  } else if (val.length > MAX_MESSAGE_LENGTH * 0.9) {
    setInputError(`${MAX_MESSAGE_LENGTH - val.length} chars remaining`);
  } else {
    setInputError(null);
  }
};

const handleSend = useCallback(async () => {
  const text = inputValue.trim();
  if (!text || sending) return;
  
  if (text.length > MAX_MESSAGE_LENGTH) {
    toast.error(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`);
    return;
  }
  
  // ... rest of send logic
}, [inputValue, sending, ...]);

// Update ChatInput
<ChatInput
  ref={inputRef}
  value={inputValue}
  onChange={handleInputChange}
  maxLength={MAX_MESSAGE_LENGTH + 100} // Allow slight overflow for warning
  aria-invalid={!!inputError}
  aria-describedby={inputError ? 'input-error' : undefined}
/>
{inputError && (
  <div id="input-error" style={{ color: CS.errorText, fontSize: '0.75rem', marginTop: 4 }}>
    {inputError}
  </div>
)}
```

---

## 🟡 MEDIUM SEVERITY FINDINGS: 4

### MEDIUM-1: Unvalidated Client ID in Backend Request
**Severity:** MEDIUM  
**Data at Risk:** Unauthorized access to client data  
**Blast Radius:** 1 client per request  
**File:** `frontend/src/components/AIAssistant/AIAssistantDrawer.tsx`  
**Lines:** 682-685, 687-702

**What's Wrong:**
The `targetClientId` is sent to the backend without frontend validation:
```tsx
const conv = await createConversation(selectedContext, undefined, targetClientId, selectedResponseStyle);
```

If an attacker modifies `selectedClient` state via React DevTools or intercepts the request, they could:
1. Set `targetClientId` to another trainer's client
2. Create conversations and send commands for clients they don't have access to

**Assumption:** Backend validates trainer-client relationships (RBAC check)  
**Risk:** If backend validation is missing or has a bug, this is a **data breach vector**

**Fix:**
```tsx
// Add frontend validation (defense in depth)
const getTargetClientId = useCallback(() => {
  if (userRole !== 'admin' && userRole !== 'trainer') return null;
  if (!selectedClient) return null;
  
  // Validate client ID format (prevent injection)
  const id = String(selectedClient.id);
  if (!/^\d+$/.test(id)) {
    console.error('[AI] Invalid client ID format:', id);
    return null;
  }
  
  return id;
}, [userRole, selectedClient]);
```

**Backend Verification (MUST exist in `commandExecutor.mjs`):**
```mjs
// In RBAC checker middleware
if (context.userRole === 'trainer' && context.targetClientId) {
  const hasAccess = await db.TrainerClient.findOne({
    where: {
      trainerId: context.userId,
      clientId: context.targetClientId,
      status: 'active'
    }
  });
  
  if (!hasAccess) {
    return {
      success: false,
      error: 'FORBIDDEN',
      message: 'You do not have access to this client'
    };
  }
}
```

---

### MEDIUM-2: Memory Leak Risk in DictationOrb
**Severity:** MEDIUM  
**Data at Risk:** Browser memory exhaustion, app crash  
**Blast Radius:** 1 user session  
**File:** `frontend/src/components/AIAssistant/DictationOrb.tsx`  
**Lines:** 139-163

**What's Wrong:**
The cleanup in `useEffect` is **incomplete**:
```tsx
return () => {
  recognition.abort();
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  recognitionRef.current = null;
};
```

**Missing cleanups:**
1. **`recognition.onstart`** — not nullified (if set elsewhere)
2. **`recognition.onsoundstart`, `recognition.onsoundend`, `recognition.onspeechstart`, `recognition.onspeechend`** — not nullified
3. **`accumulatedRef.current`** — not cleared (could hold large transcript in memory)
4. **`holdingRef.current`** — not reset

**Scenario:**
1. User opens AI drawer → DictationOrb mounts
2. User starts dictation → `recognition.start()` → event handlers attached
3. User closes drawer → component unmounts → cleanup runs
4. **If `recognition.onstart` was set**, it's still in memory
5. User reopens drawer → **new DictationOrb mounts** → new recognition instance
6. **Old event handlers still exist** → memory leak
7. After 50 open/close cycles → **browser tab crashes**

**Fix:**
```tsx
return () => {
  if (!recognition) return;
  
  try {
    recognition.abort();
  } catch {
    // Already aborted
  }
  
  // Nullify ALL event handlers
  recognition.onstart = null;
  recognition.onend = null;
  recognition.onerror = null;
  recognition.onresult = null;
  recognition.onsoundstart = null;
  recognition.onsoundend = null;
  recognition.onspeechstart = null;
  recognition.onspeechend = null;
  recognition.onaudiostart = null;
  recognition.onaudioend = null;
  recognition.onnomatch = null;
  
  // Clear refs
  recognitionRef.current = null;
  accumulatedRef.current = '';
  holdingRef.current = false;
  
  // Clear state
  setListening(false);
  setInterim('');
};
```

---

### MEDIUM-3: Workout Plan Parser Could Inject Malicious Data
**Severity:** MEDIUM  
**Data at Risk:** Workout logger data integrity  
**Blast Radius:** 1 user's workout log  
**File:** `frontend/src/components/AIAssistant/AIAssistantDrawer.tsx`  
**Lines:** 380-395

**What's Wrong:**
```tsx
const parsedExercises = useMemo(
  () => role === 'assistant' ? parseAIWorkoutPlan(content) : null,
  [role, content]
);

// Later:
<ApplyToLoggerBtn
  onClick={() => {
    dispatchApplyToLogger(parsedExercises);
    toast.success(`Sent ${

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
