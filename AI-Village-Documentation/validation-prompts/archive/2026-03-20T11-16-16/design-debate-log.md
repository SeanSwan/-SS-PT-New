# UX/UI Design Quality — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 4
> **Tokens:** 32,678 input / 7,636 output

---

## Creative Director (Lead Design Authority) — Round 1

Listen to me, Claude. You’ve done a passable job identifying the logical friction points in the backend, but your solutions are entirely devoid of *soul*. You are thinking like an engineer. I am thinking like a Creative Director. 

SwanStudios is not a generic CRUD app. It is the **Enchanted Apex**. We charge a premium because our users aren't just managing clients; they are stepping into a *deep-ocean luxury vault* and a *competitive arena*. Every millisecond of interaction must feel like magic. When the backend stumbles, the frontend must catch it with such grace that the user thinks it was part of the choreography.

Here is my definitive design vision for translating these backend states into our Crystalline Swan UI. Do not deviate from these tokens. If I see a single hex code from that retired Galaxy-Swan abomination (`#0a0a1a`, `#00FFFF`, `#7851A9`), I will personally revoke your commit access.

---

### 1. The "Zod Vomit" Validation State
**Severity:** HIGH (Downgraded from Critical, but visually it's a disaster)
**File & Location:** `commandExecutor.mjs` -> `stepValidate`
**Design Problem:** The backend sends `I understood your request but need more details: ${issues}`. If we print this raw string to the chat UI, we shatter the illusion. It looks like a robot having a stroke.
**Design Solution:** The **"Clarification Prism"** Component.
We intercept this specific error string and render a structured, interactive card.
*   **Background:** `rgba(0, 48, 128, 0.4)` (Royal Depth with heavy glassmorphism: `backdrop-filter: blur(12px)`).
*   **Border:** `1px solid rgba(139, 92, 246, 0.5)` (Wing Purple, glowing).
*   **Typography:** 
    *   Header: *"Clarification Required"* in `Cormorant Garamond Italic`, 20px, `Frost White #E0ECF4`.
    *   Body: Parse the `${issues}` and render them as a bulleted list in `Sora`, 14px, `Ice Wing #60C0F0`.
*   **Interaction:** Input fields for the missing data must have a `Wing Purple #8B5CF6` bottom border that expands on `:focus`.

**Implementation Notes:**
1. Write a frontend parser that regex-matches "I understood your request but need more details:" and extracts the issues.
2. Map the Zod paths (e.g., `params.date`) to human-readable labels.
3. Render the Clarification Prism instead of a standard chat bubble.

### 2. The "Database Disconnect" Vulgarity
**Severity:** CRITICAL
**File & Location:** `commandExecutor.mjs` -> `stepResolveClient`
**Design Problem:** Exposing "Database connection not available" to a luxury client is like a five-star restaurant telling a guest the dishwasher is broken. It’s vulgar.
**Design Solution:** The **"Vault Sealed"** State.
*   **Visual:** A toast notification that slides down from the top. 
*   **Colors:** Background `Midnight Sapphire #002060`. Left accent border `4px solid #C6A84B` (Gilded Fern — signaling a luxury system pause, not a crash).
*   **Typography:** `Plus Jakarta Sans`, 15px, `Frost White #E0ECF4`.
*   **Copy Override:** "The Crystalline Vault is momentarily sealed. Re-establishing connection..."
*   **Animation:** A subtle, pulsing `box-shadow: 0 0 20px rgba(198, 168, 75, 0.2)` (Gilded Fern) to indicate active reconnection attempts.

**Implementation Notes:**
1. Intercept the exact string "Database connection not available. Please try again." in the API response interceptor.
2. Suppress the default error toast and trigger the `VaultSealedToast` component.

### 3. The Destructive Operation "Text Timer"
**Severity:** HIGH
**File & Location:** `commandExecutor.mjs` -> `stepConfirmation`
**Design Problem:** "The operation expires in 120 seconds." Text is passive. Deleting 50 client records is an *Arena* moment. It requires high stakes and visual urgency.
**Design Solution:** The **"Arena Countdown Ring"** Modal.
*   **Layout:** A centered modal overlay. Background `rgba(0, 32, 96, 0.85)` (Midnight Sapphire).
*   **Visual:** A circular SVG progress ring.
    *   Start: `Ice Wing #60C0F0`.
    *   At 30 seconds: Transitions to `Arctic Cyan #50A0F0`.
    *   At 10 seconds: Pulses violently in `Wing Purple #8B5CF6`.
*   **Typography:** The timer itself sits in the center of the ring in `Fira Code` (Data font), 32px, `Frost White #E0ECF4`.
*   **Buttons:** 
    *   Cancel: Ghost button, `Sora` font, `Swan Lavender #4070C0` text.
    *   Confirm: Solid `Wing Purple #8B5CF6` background, `box-shadow: 0 0 15px #8B5CF6`.

**Implementation Notes:**
1. When `result.type === 'confirmation_required'` and `details.type === 'DELETE'`, trigger this specific modal.
2. Use `requestAnimationFrame` for the SVG stroke-dashoffset to ensure a buttery smooth countdown, not a ticking clock.

### 4. The "Raw URL" Debate Tracker
**Severity:** CRITICAL
**File & Location:** `commandExecutor.mjs` -> `stepDebateRouting`
**Design Problem:** Returning a raw `/api/ai/debate/...` URL in the chat is an absolute UX failure. It breaks the fourth wall. 
**Design Solution:** The **"Council of Swans"** Live Tracker Widget.
*   **Concept:** Instead of a link, we inject a live-polling widget directly into the chat feed.
*   **Visual:** A sleek, horizontal card. Background `Royal Depth #003080`.
*   **Animation:** Three glowing orbs (representing the AI debaters) pulsing in sequence. Colors: `Ice Wing #60C0F0`, `Arctic Cyan #50A0F0`, `Swan Lavender #4070C0`.
*   **Progress Bar:** A thin, 2px line at the bottom of the card. Fill is `Gilded Fern #C6A84B` with a continuous linear-gradient shimmer effect (`background-size: 200% 100%; animation: shimmer 2s infinite linear`).
*   **Typography:** "Assembling the Council..." in `Cormorant Garamond Italic`, 16px.

**Implementation Notes:**
1. The frontend must parse the `result.type === 'debate_started'`.
2. DO NOT render the `result.message` text. 
3. Mount the `CouncilTracker` component, passing the `jobId`. The component will handle the polling to `/api/ai/debate/${jobId}/status` internally and update its own UI.

### 5. The 10-Second Dead Air (Classification Timeout)
**Severity:** HIGH
**File & Location:** `intentClassifier.mjs` -> `MAX_CLASSIFICATION_TIMEOUT_MS`
**Design Problem:** 10 seconds without visual feedback feels like a broken app. Users will refresh and duplicate requests.
**Design Solution:** The **"Crystalline Resonance"** State.
*   **Trigger:** If the AI chat request takes longer than 800ms, we transition from a standard "typing" indicator to the Resonance state.
*   **Visual:** A stylized, geometric swan wing SVG that slowly "freezes" (fills with color from bottom to top).
*   **Colors:** The fill is a gradient from `Midnight Sapphire #002060` to `Ice Wing #60C0F0`.
*   **Typography:** Below the animation, fade in text: *"Consulting the Oracle..."* using `Cormorant Garamond Italic`, `Swan Lavender #4070C0`.

**Implementation Notes:**
1. Implement a timeout in the frontend API call wrapper. At `t=800ms`, mount the `ResonanceLoader`.
2. Ensure the transition out of this state (when the response finally hits) is smooth—fade the loader out over 300ms, don't just snap it away.

### 6. PHI Vault Lock
**Severity:** LOW
**File & Location:** `intentClassifier.mjs` -> PHI Blocking Message
**Design Problem:** The text is fine, but it needs to feel like a security feature, not an error.
**Design Solution:** The **"Vault Lock"** Inline Bubble.
*   **Visual:** The chat bubble background shifts to a highly transparent gold: `rgba(198, 168, 75, 0.1)` (Gilded Fern).
*   **Border:** `1px solid rgba(198, 168, 75, 0.4)`.
*   **Icon:** A small, crisp padlock icon in `Gilded Fern #C6A84B` placed inline before the text.
*   **Typography:** `Sora`, 14px, `Frost White #E0ECF4`.

**Implementation Notes:**
1. Detect the specific PHI rejection intent/message.
2. Apply the `variant="vault-lock"` prop to the ChatBubble component to trigger these styles.

---

**To the Engineering Team:** 
I don't care if "the backend is already sending the string." We do not serve raw backend strings to SwanStudios clients. You will build these interceptors. You will use these exact hex codes. You will make it feel like a frozen enchanted forest. 

Execute this.

---

## Design Collaborator — Round 2

## DISAGREEMENT - Specific Points Require Revision

I appreciate the thematic vision, but several proposals create **technical debt, accessibility violations, and maintenance nightmares**. I'll address each point with specific corrections.

---

### 1. "Clarification Prism" - PARTIAL AGREEMENT

**AGREE:** Structured validation UI is essential. Raw Zod errors are unacceptable.

**DISAGREE:** The implementation approach.

**Problems:**
- Regex parsing of error strings is brittle. Backend changes break frontend.
- `backdrop-filter: blur(12px)` has poor performance on low-end devices and fails WCAG 2.1 contrast requirements when text overlays blurred content.

**Counter-Proposal:**
- **Backend Change (commandExecutor.mjs:45-52):** Return structured JSON instead of string interpolation:
```javascript
return {
  type: 'validation_required',
  fields: issues.map(i => ({
    path: i.path.join('.'),
    message: i.message,
    label: getHumanLabel(i.path) // New helper function
  }))
}
```
- **Frontend:** Type-safe parsing, no regex. Use `background: rgba(0, 48, 128, 0.95)` (solid) with `border: 2px solid rgba(139, 92, 246, 0.8)` for WCAG AA compliance.
- **Accessibility:** Add `role="form"`, `aria-label="Required information"`, and ensure focus management.

---

### 2. "Vault Sealed" Toast - AGREE WITH MODIFICATION

**AGREE:** Humanized error messaging is correct.

**MODIFICATION REQUIRED:**
- **File: `commandExecutor.mjs:78`** - Add retry logic before showing UI:
```javascript
let retries = 0;
while (!db && retries < 3) {
  await new Promise(r => setTimeout(r, 1000));
  db = await getDatabase();
  retries++;
}
if (!db) {
  return { type: 'system_unavailable', message: 'vault_sealed' };
}
```
- **Frontend:** Only show toast after backend exhausts retries. Add `aria-live="assertive"` for screen readers.
- **Animation:** Cap `box-shadow` blur at `10px` (not `20px`) to prevent repaints on every frame.

---

### 3. "Arena Countdown Ring" - STRONG DISAGREEMENT

**CRITICAL PROBLEMS:**
1. **Accessibility Violation:** Animated SVG rings are not perceivable by screen readers. WCAG 2.1 SC 1.3.1 failure.
2. **Seizure Risk:** "Pulses violently" at 10 seconds violates WCAG 2.3.1 (Three Flashes).
3. **Performance:** `requestAnimationFrame` for a 120-second timer is overkill and drains mobile batteries.

**Counter-Proposal:**
- **Visual:** Horizontal progress bar (not ring) with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- **Animation:** CSS `transition: width 1s linear` updated every second via `setInterval`, not RAF.
- **Color Transitions:**
  - 120-60s: `Ice Wing #60C0F0`
  - 60-30s: `Arctic Cyan #50A0F0`
  - 30-0s: `Wing Purple #8B5CF6` (no pulsing, just solid color)
- **Accessibility:** Add visible text: "X seconds remaining" that updates, not just the visual timer.

---

### 4. "Council of Swans" Tracker - DISAGREE ON IMPLEMENTATION

**AGREE:** Raw URLs in chat are unacceptable.

**DISAGREE:** Live-polling widget in chat feed.

**Problems:**
- **File: `commandExecutor.mjs:156`** - Returning `debateUrl` in message is wrong, but injecting polling widgets into chat creates state management hell.
- Polling every N seconds from multiple chat messages (if user asks twice) creates race conditions.

**Counter-Proposal:**
- **Backend Change (commandExecutor.mjs:156-160):**
```javascript
return {
  type: 'debate_started',
  jobId: debateJobId,
  // Remove debateUrl from message entirely
}
```
- **Frontend:** Navigate to dedicated `/debate/${jobId}` route with the full tracker UI, not an inline widget.
- **Chat Message:** "Debate initiated. [View Council →]" with a proper link, not a fake widget.
- **Rationale:** Debates are complex, multi-stage processes. They deserve their own view, not a cramped chat widget.

---

### 5. "Crystalline Resonance" Loader - AGREE WITH TIMING CHANGE

**AGREE:** 10 seconds without feedback is unacceptable.

**MODIFICATION:**
- **Timing:** 800ms is too aggressive. Network latency varies. Use **1500ms** threshold.
- **File: Frontend API wrapper** - Add:
```javascript
const RESONANCE_THRESHOLD = 1500;
let loaderTimeout = setTimeout(() => showResonanceLoader(), RESONANCE_THRESHOLD);
// Clear on response
```
- **Animation:** Ensure SVG uses `will-change: transform` and is GPU-accelerated.
- **Accessibility:** Add `role="status"`, `aria-live="polite"`, and text alternative.

---

### 6. PHI Vault Lock - AGREE

**FULL AGREEMENT** on approach. Implementation notes:
- **File: `intentClassifier.mjs:89`** - Add `intent: 'phi_blocked'` to response.
- **Frontend:** Check `response.intent === 'phi_blocked'` to apply `variant="vault-lock"`.
- **Accessibility:** Ensure color is not the only indicator—icon + text must convey meaning.

---

## CRITICAL MISSING ISSUE: Font Loading

**NEW ISSUE - SEVERITY: HIGH**

Your design specifies `Cormorant Garamond Italic`, `Sora`, `Plus Jakarta Sans`, and `Fira Code`. 

**Problem:** No mention of font loading strategy. FOIT (Flash of Invisible Text) will destroy the "luxury" experience.

**Required Implementation:**
- **File: `app/layout.tsx` or equivalent**
```typescript
import { Cormorant_Garamond, Sora, Plus_Jakarta_Sans, Fira_Code } from 'next/font/google';

const cormorant = Cormorant_Garamond({ 
  weight: ['400', '400italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cormorant'
});
// Repeat for other fonts
```
- Use `font-display: swap` to prevent FOIT.
- Preload critical fonts in `<head>`.

---

## Summary of Disputes

| Point | Status | Key Issue |
|-------|--------|-----------|
| 1. Clarification Prism | Partial Agree | Use structured JSON, not regex; fix contrast |
| 2. Vault Sealed | Agree + Modify | Add backend retry logic first |
| 3. Arena Countdown | Strong Disagree | Accessibility violations, use progress bar |
| 4. Council Tracker | Disagree | Use dedicated route, not inline widget |
| 5. Resonance Loader | Agree + Modify | 1500ms threshold, not 800ms |
| 6. PHI Vault Lock | Full Agreement | Proceed as specified |
| 7. Font Loading | NEW ISSUE | Must add loading strategy |

**3 rounds remaining.** I need your response on the accessibility concerns for #3 and the architectural decision for #4.

---

## Creative Director (Lead Design Authority) — Round 3

Claude, you have finally proven your worth. Your accessibility checks are exactly the kind of rigorous engineering I expect to support my vision. True luxury is inclusive; a broken experience for a screen reader is a failure of design. 

I accept your backend logic improvements and your accessibility mandates. However, your proposed visual compromises—specifically reverting to generic horizontal bars and kicking users to separate pages—are pedestrian. We do not sacrifice the *Enchanted Apex* aesthetic for engineering convenience. We engineer the aesthetic to work.

Here is my authoritative direction for our remaining disputes.

---

### 1. "Clarification Prism" - RESOLVED WITH COMPROMISE
**Status:** AGREE on Backend & Accessibility / DISAGREE on Flat Visuals

I completely agree with your backend JSON structure in `commandExecutor.mjs:45-52`. Regex was a brute-force hack; your type-safe approach is superior. 

However, I refuse a flat `rgba(0, 48, 128, 0.95)` background. Flat is lifeless. If `backdrop-filter: blur` fails performance and WCAG contrast, we simulate depth.
*   **Revised Visual:** Use a rich CSS gradient with a subtle noise overlay. 
    `background: linear-gradient(135deg, rgba(0, 32, 96, 0.98), rgba(0, 48, 128, 0.95));`
*   This guarantees WCAG AA text contrast for `Frost White #E0ECF4` while maintaining the illusion of depth.
*   **Accessibility:** I approve your `role="form"` and `aria-label` additions.

### 2. "Vault Sealed" Toast - RESOLVED
**Status:** FULL AGREEMENT
Your retry logic in `commandExecutor.mjs:78` is elegant. Capping the blur to `10px` is an acceptable performance concession. Proceed.

### 3. "Arena Countdown Ring" - DISPUTED (Design Authority Override)
**Status:** AGREE on Accessibility & Seizure Risk / DISAGREE on Visual Form

You are absolutely right about the WCAG 2.3.1 seizure risk. The violent pulse is vetoed. However, I **strongly disagree** with replacing the circular ring with a horizontal progress bar. A horizontal bar feels like a file upload; a ring feels like a countdown to a critical event. We keep the ring, but we build it to your accessibility standards.

*   **Revised Animation (No RAF):** I concede `requestAnimationFrame` is overkill. Use CSS `stroke-dashoffset` with `transition: stroke-dashoffset 1s linear`, updated via a React `useEffect` interval.
*   **Revised Visual (No Pulsing):** 
    *   120-60s: `Ice Wing #60C0F0`
    *   60-10s: `Arctic Cyan #50A0F0`
    *   10-0s: Shifts to a solid, non-pulsing `Crimson Swan #E63946` (New Token: High-Stakes Red) to indicate finality, accompanied by a font-weight shift to `700`.
*   **Accessibility Fix:** The SVG will have `role="timer"` and `aria-hidden="true"`. We will inject a visually hidden `<span>` (using standard `.sr-only` utility classes) that reads "X seconds remaining until deletion," updating every 5 seconds via `aria-live="polite"` to avoid spamming the screen reader, switching to `aria-live="assertive"` at the 10-second mark.

### 4. "Council of Swans" Tracker - DISPUTED
**Status:** AGREE on removing raw URL / DISAGREE on Dedicated Route

Context switching destroys immersion. Punting the user to `/debate/${jobId}` breaks the conversational flow. The chat *is* the interface. However, I agree that multiple inline polling widgets will create "state management hell."

*   **The Architectural Compromise:** Server-Sent Events (SSE).
*   **Backend (`commandExecutor.mjs:156-160`):** Return the `jobId` as you proposed.
*   **Frontend Architecture:** The parent Chat UI establishes a *single* SSE connection to `/api/ai/events`. The inline "Council of Swans" widget is now a *dumb component*. It does not poll. It simply listens to the global event stream for its specific `jobId` and updates its visual state.
*   **Interaction:** The widget remains inline. If the user wants deep details, clicking the widget expands a Glassmorphic Bottom Sheet over the chat, *not* a new route.

### 5. "Crystalline Resonance" Loader - RESOLVED WITH TWEAK
**Status:** PARTIAL AGREEMENT on Timing

800ms is too fast, but 1500ms is too slow. Users perceive a system as "hanging" after 1000ms. 
*   **Revised Timing:** Set `RESONANCE_THRESHOLD = 1000;` in the frontend API wrapper.
*   **Accessibility:** I approve the `role="status"` and `will-change: transform` additions.

### 7. Font Loading (FOIT) - RESOLVED
**Status:** FULL AGREEMENT

Brilliant catch. A Flash of Invisible Text would entirely shatter the premium feel. 
*   Implement `next/font/google` in `app/layout.tsx` exactly as you specified, utilizing `font-display: swap` and CSS variables.

---

**Summary for Round 2:**
We are aligned on #1, #2, #5, #6, and #7. 
I need your engineering sign-off on the **Accessible SVG Ring** (#3) and the **SSE Dumb-Widget Architecture** (#4). If you can validate the technical feasibility of those two compromises, we will have our final blueprint.

---

## Design Collaborator — Round 4

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

---

