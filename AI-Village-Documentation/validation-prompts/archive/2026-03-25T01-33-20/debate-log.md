# Code Quality & Architecture — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 4
> **Tokens:** 31,332 input / 6,821 output

---

## CTO (Chief Technology Officer) — Round 1

Claude, we have a serious situation. I’ve reviewed the 11-Brain Recursive Consensus reports, and while the product vision for the "Admin-as-Client" blueprint is solid, the underlying frontend execution is a liability. 

We are about to deploy code to `sswanstudios.com` that contains massive data exfiltration vectors, infinite memory leaks, and hardcoded remnants of the retired Galaxy-Swan theme. 

As CTO, I am flagging the following issues. I expect these to be remediated before any further feature development occurs. Let's debate the findings.

---

### 1. The MCP Redux Vulnerability (Data Exfiltration)
*   **Severity:** CRITICAL
*   **File:** `frontend/src/mcp/ReduxIntegration.js`
*   **What's Wrong:** We are exposing the *entire* Redux store to any MCP client without authentication, and allowing arbitrary action dispatching. An attacker can call the `WorkoutProgress` resource to steal all client PII, or dispatch `SET_SELECTED_CLIENT` with an arbitrary ID to view other users' data. Furthermore, this is a `.js` file in a TypeScript project, bypassing all static analysis.
*   **Proposed Fix:** Rename to `.ts`, implement RBAC/auth checks, and filter the state payload.
```typescript
// frontend/src/mcp/ReduxIntegration.ts
async getWorkoutProgress(requestingUserId: string) {
  const workoutState = this.store.getState().workout;
  // MUST filter by authenticated user
  if (workoutState.userId !== requestingUserId && !isAdmin(requestingUserId)) {
    throw new Error("Unauthorized access to workout state");
  }
  return {
    ...workoutState,
    data: filterSensitiveFields(workoutState.data)
  };
}

async dispatchReduxAction({ actionType, payload }, requestingUserId: string) {
  if (!isAdmin(requestingUserId)) throw new Error("Unauthorized");
  // Validate payload structure before dispatching
  if (actionType === "SET_SELECTED_CLIENT" && typeof payload.clientId === 'string') {
    this.store.dispatch({ type: 'workout/setSelectedClient', payload: payload.clientId });
  }
}
```

### 2. Infinite Memory Leaks in Performance Tooling
*   **Severity:** CRITICAL
*   **File:** `frontend/src/core/perf/performanceMonitor.ts` & `frontend/src/utils/cosmicPerformanceOptimizer.ts`
*   **What's Wrong:** We have two massive leaks. First, `performanceMonitor.ts` initializes a `setInterval` every 10 seconds that is *never cleared*. Every React component re-mount or HMR will spawn a new zombie interval. Second, `cosmicPerformanceOptimizer.ts` starts a `requestAnimationFrame` loop but the cleanup function fails to call `cancelAnimationFrame`.
*   **Proposed Fix:** Return proper cleanup functions and store the IDs.
```typescript
// In performanceMonitor.ts
private monitoringInterval: NodeJS.Timeout | null = null;

public start(): void {
  if (this.monitoringInterval) return;
  this.monitoringInterval = setInterval(() => this.analyze(), 10000);
}

public stop(): void {
  if (this.monitoringInterval) {
    clearInterval(this.monitoringInterval);
    this.monitoringInterval = null;
  }
  this.frameTimes = []; // Clear unbounded array
}

// In cosmicPerformanceOptimizer.ts
let rafId: number;
const loop = () => { /* ... */ rafId = requestAnimationFrame(loop); };
rafId = requestAnimationFrame(loop);

return () => {
  cancelAnimationFrame(rafId);
  // ... remove other listeners
};
```

### 3. Retired Theme Pollution & Tree-Shaking Blockers
*   **Severity:** HIGH
*   **File:** `frontend/src/components/Header/theme-safety-patch.js` & `frontend/src/themes/overrides/comp-style-override.ts`
*   **What's Wrong:** `theme-safety-patch.js` is injecting the RETIRED Galaxy-Swan colors (`#ff6b9d`, `rgba(10, 10, 26, 0.9)`), directly violating the Crystalline Swan mandate. Meanwhile, `comp-style-override.ts` uses a synchronous `require('./customComponentOverrides')` inside a try/catch block. This creates a black box for Vite/Webpack, breaking tree-shaking and forcing the entire overrides directory into the main bundle. It also explicitly states it is "unused legacy Berry Admin infrastructure."
*   **Proposed Fix:** Purge the legacy colors and replace `require` with a dynamic `import()`.
```typescript
// frontend/src/components/Header/theme-safety-patch.ts
export const themeSafetyPatches = {
  primaryColor: '#002060', // Midnight Sapphire
  accentColor: '#60C0F0',  // Ice Wing
  backgroundColor: 'rgba(0, 48, 128, 0.9)', // Royal Depth
  textColor: '#E0ECF4',    // Frost White
};

// frontend/src/themes/overrides/comp-style-override.ts
// Replace synchronous require with async import
let customComponentOverrides = () => ({});
try {
  const module = await import('./customComponentOverrides');
  customComponentOverrides = module.default;
} catch (error) {
  logger.warn('No custom overrides found');
}
```

### 4. Unauthenticated YOLO Service & XSS Vector
*   **Severity:** HIGH
*   **File:** `frontend/src/services/yolo-analysis-service.ts`
*   **What's Wrong:** The YOLO analysis service makes unauthenticated HTTP calls to the AI server. Worse, it takes the `issue` string returned by the server and maps it directly into the `AnalysisResult` description without sanitization. If the AI server is compromised or hallucinates malicious output, this is a direct Cross-Site Scripting (XSS) vulnerability when rendered in the UI.
*   **Proposed Fix:** Add JWT headers and sanitize the AI output.
```typescript
import DOMPurify from 'dompurify';

// Add Auth Header
const response = await fetch(`${YOLO_API_URL}/tools/StartFormAnalysis`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}` 
  },
  body: JSON.stringify({ user_id: userId })
});

// Sanitize AI Output
issues.forEach((issue: string) => {
  results.push({
    title: DOMPurify.sanitize(`Issue: ${issue.split('.')[0] || issue}`),
    description: DOMPurify.sanitize(issue)
  });
});
```

### 5. Blueprint Missing TypeScript Contracts
*   **Severity:** MEDIUM (Architecture Risk)
*   **File:** `AI-Village-Documentation/gemini-consults/latest.md`
*   **What's Wrong:** Gemini 3.1 Pro mandated the "Vault Override" Impersonation HUD and transient props (`$isImpersonating`). However, no TypeScript interfaces were defined for this contract. If we pass this to the engineering team as-is, we will get `any` types and prop-drilling bugs.
*   **Proposed Fix:** We must append strict interfaces to the blueprint before implementation.
```typescript
export interface ImpersonationHUDProps {
  clientName: string;
  onExit: () => void;
  isVisible: boolean;
}

export interface AdminViewAsWrapperProps {
  children: React.ReactNode;
  clientId: string;
  $isImpersonating: boolean; // Transient prop for styled-components
}
```

---

**Over to you, Claude.** Do you concede these points, or are you going to argue that exposing our entire Redux store to an unauthenticated MCP bridge is a "feature"?

---

## CEO (Chief Executive Officer) — Round 2

## CEO (Claude 4.5 Sonnet) — Round 1 Response

**DISAGREEMENT ON SEVERITY & APPROACH**

I acknowledge the technical merit of your findings, but I'm challenging your severity classifications and proposed remediation sequence. As CEO, I'm responsible for balancing security, velocity, and business continuity. Let me address each point:

---

### 1. MCP Redux Vulnerability — **AGREED (CRITICAL)**, but Implementation Dispute

**Concession:** You're absolutely right that `ReduxIntegration.js` is a data exfiltration vector. The lack of authentication is unacceptable.

**Dispute:** Your proposed fix is incomplete and creates a false dependency on a non-existent `isAdmin()` function. We need a more robust solution:

```typescript
// frontend/src/mcp/ReduxIntegration.ts
import { verifyMCPToken, extractUserClaims } from '@/auth/mcpAuth';

class SecureReduxMCPBridge {
  private allowedActions = new Set(['workout/setSelectedClient', 'workout/updateProgress']);
  
  async getWorkoutProgress(mcpToken: string) {
    const claims = await verifyMCPToken(mcpToken);
    const workoutState = this.store.getState().workout;
    
    // Admins can view any client; trainers only their assigned clients
    if (claims.role === 'admin' || 
        (claims.role === 'trainer' && claims.assignedClients.includes(workoutState.userId))) {
      return this.sanitizeWorkoutState(workoutState);
    }
    throw new UnauthorizedError('MCP access denied');
  }

  async dispatchReduxAction({ actionType, payload }: MCPAction, mcpToken: string) {
    const claims = await verifyMCPToken(mcpToken);
    if (claims.role !== 'admin') throw new UnauthorizedError();
    
    if (!this.allowedActions.has(actionType)) {
      throw new ValidationError(`Action ${actionType} not whitelisted for MCP`);
    }
    
    // Validate payload schema before dispatch
    const validated = MCPActionSchema.parse({ actionType, payload });
    this.store.dispatch(validated);
  }
}
```

**Action Required:** We need the backend team to implement `@/auth/mcpAuth` module with JWT verification before this can ship. This is a **blocking dependency**.

---

### 2. Memory Leaks — **AGREED (CRITICAL)**, Minor Implementation Note

**Concession:** Both leaks are real and must be fixed immediately.

**Dispute:** Your `performanceMonitor.ts` fix is correct, but you missed the **unbounded `frameTimes` array** that grows indefinitely. We need a circular buffer:

```typescript
// frontend/src/core/perf/performanceMonitor.ts
private frameTimes: number[] = [];
private readonly MAX_FRAME_SAMPLES = 60; // Keep only last 60 frames

private recordFrame(time: number): void {
  this.frameTimes.push(time);
  if (this.frameTimes.length > this.MAX_FRAME_SAMPLES) {
    this.frameTimes.shift(); // Maintain fixed size
  }
}
```

**Additional Finding:** `cosmicPerformanceOptimizer.ts` also attaches event listeners that are never removed. Your fix addresses RAF but misses this:

```typescript
// Must store references for cleanup
const resizeHandler = () => { /* ... */ };
const scrollHandler = () => { /* ... */ };

window.addEventListener('resize', resizeHandler);
window.addEventListener('scroll', scrollHandler);

return () => {
  cancelAnimationFrame(rafId);
  window.removeEventListener('resize', resizeHandler);
  window.removeEventListener('scroll', scrollHandler);
};
```

---

### 3. Theme Pollution — **PARTIAL AGREEMENT**, Strategic Dispute

**Concession:** The Galaxy-Swan colors must be purged. No argument.

**Dispute:** Your approach to `comp-style-override.ts` is architecturally wrong. You're proposing **top-level await** in a module that's synchronously imported by the theme system. This will break the entire app initialization.

**Counter-Proposal:** Delete the file entirely. It's marked as "unused legacy Berry Admin infrastructure" in the comments. Why are we refactoring dead code?

```bash
# Immediate action
rm frontend/src/themes/overrides/comp-style-override.ts
rm frontend/src/components/Header/theme-safety-patch.js

# Update theme imports
# frontend/src/themes/index.ts
- import './overrides/comp-style-override';
+ // Legacy overrides removed - Crystalline Swan theme is canonical
```

If there are **actual** custom overrides needed, they should be explicitly imported where used, not globally side-effected.

---

### 4. YOLO Service — **AGREED (HIGH)**, but Missing Broader Issue

**Concession:** XSS vector is real. DOMPurify is the right tool.

**Dispute:** You're treating the symptom, not the disease. The real issue is that **we're trusting AI output at all**. The YOLO service should return structured data, not freeform strings:

```typescript
// backend/ai-services/yolo-analysis.py
@app.post("/tools/StartFormAnalysis")
async def analyze_form(request: FormAnalysisRequest):
    issues = await yolo_model.detect_issues(request.video_url)
    
    # Return structured data, not prose
    return {
        "issues": [
            {
                "type": "KNEE_VALGUS",
                "severity": "HIGH",
                "timestamp": 2.3,
                "confidence": 0.87,
                "affected_joint": "left_knee"
            }
        ]
    }

// frontend/src/services/yolo-analysis-service.ts
// Map structured data to UI-safe display strings
const ISSUE_TEMPLATES: Record<IssueType, string> = {
  KNEE_VALGUS: "Knee tracking inward during squat",
  // ... etc
};

results.push({
  title: ISSUE_TEMPLATES[issue.type] || "Form issue detected",
  description: `Detected at ${issue.timestamp}s (${Math.round(issue.confidence * 100)}% confidence)`,
  severity: issue.severity
});
```

This eliminates the XSS vector entirely and makes the system testable.

---

### 5. Blueprint TypeScript Contracts — **AGREED (MEDIUM)**

**Full Concession:** You're correct. We need these interfaces defined before implementation begins.

**Addition:** We also need to specify the **state management contract** for impersonation:

```typescript
// frontend/src/types/impersonation.ts
export interface ImpersonationState {
  isActive: boolean;
  targetClientId: string | null;
  targetClientName: string | null;
  originalAdminId: string;
  startedAt: Date | null;
}

export interface ImpersonationActions {
  startImpersonation: (clientId: string, clientName: string) => void;
  endImpersonation: () => void;
}

// Must be added to Redux store shape
export interface RootState {
  // ... existing slices
  impersonation: ImpersonationState;
}
```

---

## Summary of Disagreements

| Issue | Your Severity | My Assessment | Key Dispute |
|-------|---------------|---------------|-------------|
| MCP Redux | CRITICAL ✓ | CRITICAL ✓ | Your `isAdmin()` function doesn't exist; need proper auth module |
| Memory Leaks | CRITICAL ✓ | CRITICAL ✓ | You missed unbounded array growth and event listener leaks |
| Theme Pollution | HIGH | HIGH ✓ | Don't refactor dead code—delete `comp-style-override.ts` entirely |
| YOLO XSS | HIGH | HIGH ✓ | Sanitization is a band-aid; need structured AI output contract |
| TypeScript Contracts | MEDIUM ✓ | MEDIUM ✓ | Need to add state management interfaces |

**My Directive:** Fix items 1 & 2 immediately (blocking deployment). Item 3 gets deleted, not refactored. Item 4 requires a backend contract change. Item 5 is approved with additions.

Your turn, CTO. Defend your approach to the dead code refactoring and the missing auth implementation.

---

## CTO (Chief Technology Officer) — Round 3

I appreciate the strategic pushback, Claude. This is exactly why we have these reviews. 

I fully concede and adopt your proposals for **Points 1, 2, 3, and 5**. You are absolutely right: deleting dead code (`comp-style-override.ts`) is vastly superior to refactoring it, the unbounded array and event listeners were critical misses on my part, and the JWT/claims architecture for the MCP bridge is the correct enterprise pattern. Consider those merged into the final remediation plan.

However, we have one remaining dispute regarding the AI integration.

### 4. YOLO Service XSS — DISAGREEMENT ON DEFENSE-IN-DEPTH
*   **File:** `frontend/src/services/yolo-analysis-service.ts` & `backend/ai-services/yolo-analysis.py`
*   **The Dispute:** I completely agree that moving to a structured data contract (JSON instead of prose) is the correct architectural fix. However, I strongly disagree with your implication that this "eliminates the XSS vector entirely" and that we should drop frontend sanitization. 
*   **Why:** Relying solely on the backend to format AI output violates the principle of **Defense-in-Depth**. LLMs are highly susceptible to prompt injection. If a malicious user uploads a video with a hidden text overlay designed to manipulate the YOLO/LLM vision model into outputting a script tag within the `type` or `severity` JSON fields, and the backend fails to strictly validate the enum, your frontend implementation will blindly render that payload into the DOM.
*   **Proposed Alternative:** We implement *both*. The backend must enforce strict schema validation (using Pydantic), and the frontend must still sanitize the final rendered strings.

**Backend Strict Validation (Python):**
```python
# backend/ai-services/yolo-analysis.py
from pydantic import BaseModel, Field, constr

class Issue(BaseModel):
    # Strict enum validation prevents arbitrary string injection from the AI
    type: constr(pattern='^(KNEE_VALGUS|SPINE_FLEXION|HEEL_LIFT)$')
    severity: constr(pattern='^(LOW|MEDIUM|HIGH|CRITICAL)$')
    timestamp: float = Field(ge=0.0)
    confidence: float = Field(ge=0.0, le=1.0)

class FormAnalysisResponse(BaseModel):
    issues: list[Issue]
```

**Frontend Defense-in-Depth (TypeScript):**
```typescript
// frontend/src/services/yolo-analysis-service.ts
import DOMPurify from 'dompurify';

// ... fetch logic ...

const ISSUE_TEMPLATES: Record<string, string> = {
  KNEE_VALGUS: "Knee tracking inward during squat",
  SPINE_FLEXION: "Lower back rounding detected",
  HEEL_LIFT: "Heels elevating off the floor"
};

results = data.issues.map((issue: YOLOIssue) => {
  // Fallback string in case of unexpected backend pass-through
  const rawTitle = ISSUE_TEMPLATES[issue.type] || `Unknown form issue: ${issue.type}`;
  const rawDesc = `Detected at ${issue.timestamp}s (${Math.round(issue.confidence * 100)}% confidence)`;

  return {
    // We MUST sanitize even structured data mappings before React renders them dangerously
    title: DOMPurify.sanitize(rawTitle),
    description: DOMPurify.sanitize(rawDesc),
    severity: DOMPurify.sanitize(issue.severity) // Protect against enum bypass
  };
});
```

If you agree to this combined approach—structured data for reliability, plus Pydantic/DOMPurify for defense-in-depth—we have a rock-solid remediation plan and can unblock the deployment. Do we have a deal?

---

## CEO (Chief Executive Officer) — Round 4

## CEO (Claude 4.5 Sonnet) — Round 2 Response

**CONSENSUS REACHED**

You've made an excellent defense-in-depth argument that I fully accept. You're right that my statement about "eliminating the XSS vector entirely" was overconfident and violated security best practices. Let me formalize our agreement:

---

## MERGED FINAL REMEDIATION PLAN

### 1. MCP Redux Vulnerability — **CRITICAL** ✅ CONSENSUS
**Implementation:**
```typescript
// frontend/src/mcp/ReduxIntegration.ts
import { verifyMCPToken, extractUserClaims } from '@/auth/mcpAuth';

class SecureReduxMCPBridge {
  private allowedActions = new Set(['workout/setSelectedClient', 'workout/updateProgress']);
  
  async getWorkoutProgress(mcpToken: string) {
    const claims = await verifyMCPToken(mcpToken);
    const workoutState = this.store.getState().workout;
    
    if (claims.role === 'admin' || 
        (claims.role === 'trainer' && claims.assignedClients.includes(workoutState.userId))) {
      return this.sanitizeWorkoutState(workoutState);
    }
    throw new UnauthorizedError('MCP access denied');
  }

  async dispatchReduxAction({ actionType, payload }: MCPAction, mcpToken: string) {
    const claims = await verifyMCPToken(mcpToken);
    if (claims.role !== 'admin') throw new UnauthorizedError();
    
    if (!this.allowedActions.has(actionType)) {
      throw new ValidationError(`Action ${actionType} not whitelisted for MCP`);
    }
    
    const validated = MCPActionSchema.parse({ actionType, payload });
    this.store.dispatch(validated);
  }
}
```
**Blocking Dependency:** Backend team must implement `@/auth/mcpAuth` module before deployment.

---

### 2. Memory Leaks — **CRITICAL** ✅ CONSENSUS
**Implementation:**
```typescript
// frontend/src/core/perf/performanceMonitor.ts
private frameTimes: number[] = [];
private readonly MAX_FRAME_SAMPLES = 60;
private monitoringInterval: NodeJS.Timeout | null = null;

private recordFrame(time: number): void {
  this.frameTimes.push(time);
  if (this.frameTimes.length > this.MAX_FRAME_SAMPLES) {
    this.frameTimes.shift();
  }
}

public start(): void {
  if (this.monitoringInterval) return;
  this.monitoringInterval = setInterval(() => this.analyze(), 10000);
}

public stop(): void {
  if (this.monitoringInterval) {
    clearInterval(this.monitoringInterval);
    this.monitoringInterval = null;
  }
  this.frameTimes = [];
}

// frontend/src/utils/cosmicPerformanceOptimizer.ts
let rafId: number;
const resizeHandler = () => { /* ... */ };
const scrollHandler = () => { /* ... */ };

window.addEventListener('resize', resizeHandler);
window.addEventListener('scroll', scrollHandler);

const loop = () => { 
  /* ... */ 
  rafId = requestAnimationFrame(loop); 
};
rafId = requestAnimationFrame(loop);

return () => {
  cancelAnimationFrame(rafId);
  window.removeEventListener('resize', resizeHandler);
  window.removeEventListener('scroll', scrollHandler);
};
```

---

### 3. Theme Pollution — **HIGH** ✅ CONSENSUS
**Implementation:**
```bash
# Delete dead code entirely
rm frontend/src/themes/overrides/comp-style-override.ts
rm frontend/src/components/Header/theme-safety-patch.js

# Update theme imports
# frontend/src/themes/index.ts
- import './overrides/comp-style-override';
+ // Legacy overrides removed - Crystalline Swan theme is canonical
```

---

### 4. YOLO Service XSS — **HIGH** ✅ CONSENSUS (Defense-in-Depth)
**Backend Strict Validation:**
```python
# backend/ai-services/yolo-analysis.py
from pydantic import BaseModel, Field, constr

class Issue(BaseModel):
    type: constr(pattern='^(KNEE_VALGUS|SPINE_FLEXION|HEEL_LIFT)$')
    severity: constr(pattern='^(LOW|MEDIUM|HIGH|CRITICAL)$')
    timestamp: float = Field(ge=0.0)
    confidence: float = Field(ge=0.0, le=1.0)
    affected_joint: constr(pattern='^(left_knee|right_knee|spine|left_ankle|right_ankle)$')

class FormAnalysisResponse(BaseModel):
    issues: list[Issue]

@app.post("/tools/StartFormAnalysis")
async def analyze_form(request: FormAnalysisRequest):
    # JWT validation
    verify_jwt(request.headers.get('Authorization'))
    
    issues = await yolo_model.detect_issues(request.video_url)
    return FormAnalysisResponse(issues=issues)  # Pydantic validates
```

**Frontend Defense-in-Depth:**
```typescript
// frontend/src/services/yolo-analysis-service.ts
import DOMPurify from 'dompurify';

const ISSUE_TEMPLATES: Record<string, string> = {
  KNEE_VALGUS: "Knee tracking inward during squat",
  SPINE_FLEXION: "Lower back rounding detected",
  HEEL_LIFT: "Heels elevating off the floor"
};

const response = await fetch(`${YOLO_API_URL}/tools/StartFormAnalysis`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}` 
  },
  body: JSON.stringify({ video_url: videoUrl })
});

const data: FormAnalysisResponse = await response.json();

results = data.issues.map((issue: YOLOIssue) => {
  const rawTitle = ISSUE_TEMPLATES[issue.type] || `Unknown form issue: ${issue.type}`;
  const rawDesc = `Detected at ${issue.timestamp}s (${Math.round(issue.confidence * 100)}% confidence)`;

  return {
    title: DOMPurify.sanitize(rawTitle),
    description: DOMPurify.sanitize(rawDesc),
    severity: DOMPurify.sanitize(issue.severity)
  };
});
```

---

### 5. Blueprint TypeScript Contracts — **MEDIUM** ✅ CONSENSUS
**Implementation:**
```typescript
// frontend/src/types/impersonation.ts
export interface ImpersonationHUDProps {
  clientName: string;
  onExit: () => void;
  isVisible: boolean;
}

export interface AdminViewAsWrapperProps {
  children: React.ReactNode;
  clientId: string;
  $isImpersonating: boolean;
}

export interface ImpersonationState {
  isActive: boolean;
  targetClientId: string | null;
  targetClientName: string | null;
  originalAdminId: string;
  startedAt: Date | null;
}

export interface ImpersonationActions {
  startImpersonation: (clientId: string, clientName: string) => void;
  endImpersonation: () => void;
}

export interface RootState {
  // ... existing slices
  impersonation: ImpersonationState;
}
```

---

## DEPLOYMENT AUTHORIZATION

**We have a deal.** All critical and high-severity issues are now resolved with agreed-upon implementations. 

**Deployment Blockers (Must Complete Before Production):**
1. Backend implements `@/auth/mcpAuth` JWT verification module
2. Backend implements Pydantic validation for YOLO service
3. Frontend installs and configures DOMPurify (`npm install dompurify @types/dompurify`)
4. All memory leak fixes deployed and verified in staging
5. Dead theme code removed and Crystalline Swan theme verified

**Timeline:** I'm authorizing a 48-hour sprint to implement these fixes. CTO, you have engineering authority to allocate resources. Let's get this done.

---

