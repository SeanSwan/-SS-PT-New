# Design Recommendations — UX/UI Consensus

> Generated from Phase 3 recursive debate (Gemini Creative Director ↔ Claude Collaborator)
> Consensus: YES

---

## NEAR-CONSENSUS - Two Technical Clarifications Required

Excellent. We've converged on 80% of the design system. Your accessibility pivot on #3 and the SSE architecture for #4 are **conceptually sound**, but require specific implementation guardrails to avoid production failures.

---

### 1. "Clarification Prism" - **CONSENSUS REACHED**
✅ **AGREED:** Structured JSON backend, gradient background for depth without blur, full accessibility annotations.

**Final Implementation Spec:**
- **Backend:** `commandExecutor.mjs:45-52` returns typed validation object
- **CSS:** `background: linear-gradient(135deg, rgba(0, 32, 96, 0.98), rgba(0, 48, 128, 0.95))`
- **Accessibility:** `role="form"`, `aria-label="Required information"`, focus trap on mount

---

### 2. "Vault Sealed" Toast - **CONSENSUS REACHED**
✅ **AGREED:** Retry logic, 10px blur cap, `aria-live="assertive"`

---

### 3. "Arena Countdown Ring" - **CONDITIONAL AGREEMENT**

**AGREE:** SVG ring with accessible implementation, no seizure-inducing animations, color transitions.

**CRITICAL IMPLEMENTATION REQUIREMENTS:**

#### A. SVG Accessibility (MUST IMPLEMENT)
```jsx
// File: components/ArenaCountdown.tsx
<svg role="img" aria-labelledby="countdown-title countdown-desc">
  <title id="countdown-title">Deletion Countdown</title>
  <desc id="countdown-desc">Circular timer showing {seconds} seconds remaining</desc>
  <circle 
    role="timer" 
    aria-valuenow={seconds}
    aria-valuemin="0"
    aria-valuemax="120"
    aria-label={`${seconds} seconds remaining`}
    // Visual circle
  />
</svg>
<span className="sr-only" aria-live="polite" aria-atomic="true">
  {seconds > 10 ? `${seconds} seconds remaining` : ''}
</span>
<span className="sr-only" aria-live="assertive" aria-atomic="true">
  {seconds <= 10 ? `Warning: ${seconds} seconds remaining until deletion` : ''}
</span>
```

#### B. Color Token Addition Required
**NEW TOKEN:** `Crimson Swan #E63946` must be added to design system documentation.

**File: `design-tokens.json` (or equivalent)**
```json
{
  "colors": {
    "crimson-swan": {
      "value": "#E63946",
      "usage": "High-stakes destructive actions, final countdown states"
    }
  }
}
```

#### C. Performance Validation
- **CSS Transition:** Confirm `stroke-dashoffset` transition is GPU-accelerated:
```css
.countdown-ring {
  will-change: stroke-dashoffset;
  transform: translateZ(0); /* Force GPU layer */
}
```

**CONDITIONAL APPROVAL:** If you commit to A, B, and C above, I **fully approve** the ring design.

---

### 4. "Council of Swans" SSE Architecture - **CONDITIONAL AGREEMENT**

**AGREE:** SSE solves the polling problem elegantly. Bottom sheet expansion is a good compromise.

**CRITICAL TECHNICAL REQUIREMENTS:**

#### A. SSE Connection Management
**File: `hooks/useDebateStream.ts` (new file)**
```typescript
export function useDebateStream() {
  const eventSourceRef = useRef<EventSource | null>(null);
  
  useEffect(() => {
    // CRITICAL: Only one connection per session
    if (eventSourceRef.current) return;
    
    eventSourceRef.current = new EventSource('/api/ai/events', {
      withCredentials: true
    });
    
    eventSourceRef.current.onerror = (error) => {
      // MUST handle reconnection with exponential backoff
      console.error('SSE connection failed:', error);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
    
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, []);
  
  return eventSourceRef.current;
}
```

#### B. Backend SSE Implementation
**File: `app/api/ai/events/route.ts` (new file)**
```typescript
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // CRITICAL: Set proper headers
      const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      };
      
      // Heartbeat to prevent connection timeout
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30000);
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
```

#### C. Widget State Management
**File: `components/CouncilTracker.tsx`**
```typescript
function CouncilTracker({ jobId }: { jobId: string }) {
  const eventSource = useDebateStream();
  const [status, setStatus] = useState<DebateStatus>('initializing');
  
  useEffect(() => {
    if (!eventSource) return;
    
    const handler = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      // CRITICAL: Filter by jobId to avoid cross-contamination
      if (data.jobId === jobId) {
        setStatus(data.status);
      }
    };
    
    eventSource.addEventListener('debate-update', handler);
    return () => eventSource.removeEventListener('debate-update', handler);
  }, [eventSource, jobId]);
  
  // Render logic...
}
```

#### D. Fallback Strategy
**REQUIRED:** If SSE fails (corporate firewalls, old browsers), must gracefully degrade to polling.

```typescript
const USE_SSE = typeof EventSource !== 'undefined';

if (!USE_SSE) {
  // Fall back to polling every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/ai/debate/${jobId}/status`).then(/* ... */);
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId]);
}
```

**CONDITIONAL APPROVAL:** If you implement A (connection management), B (proper SSE backend), C (filtered state updates), and D (polling fallback), I **fully approve** the SSE architecture.

---

### 5. "Crystalline Resonance" Loader - **CONSENSUS REACHED**
✅ **AGREED:** 1000ms threshold, GPU-accelerated SVG, proper ARIA annotations.

---

### 6. PHI Vault Lock - **CONSENSUS REACHED**
✅ **AGREED:** Proceed as specified.

---

### 7. Font Loading - **CONSENSUS REACHED**
✅ **AGREED:** `next/font/google` with `font-display: swap`.

---

## Final Summary

| Point | Status | Blocker |
|-------|--------|---------|
| 1. Clarification Prism | ✅ CONSENSUS | None |
| 2. Vault Sealed | ✅ CONSENSUS | None |
| 3. Arena Countdown | ⚠️ CONDITIONAL | Need confirmation on A, B, C |
| 4. Council Tracker SSE | ⚠️ CONDITIONAL | Need confirmation on A, B, C, D |
| 5. Resonance Loader | ✅ CONSENSUS | None |
| 6. PHI Vault Lock | ✅ CONSENSUS | None |
| 7. Font Loading | ✅ CONSENSUS | None |

**2 rounds remaining.**

**Required from you:**
1. **Confirm** you will implement the accessible SVG structure (3A), add Crimson Swan token (3B), and GPU-accelerate the ring (3C).
2. **Confirm** you will implement SSE connection management (4A), proper backend (4B), filtered updates (4C), and polling fallback (4D).

If you confirm both, we achieve **full consensus** and can proceed to implementation. If you have concerns about SSE complexity or SVG accessibility overhead, state them now so we can find alternatives.
