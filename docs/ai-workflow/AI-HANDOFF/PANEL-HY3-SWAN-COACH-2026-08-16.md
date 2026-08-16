# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-SWAN-COACH-BATCH-REVIEW-PACKET.md
**Seed:** (none)
**Tokens:** 10315 in / 9464 out | **Cost:** ~$0.0064 | **Wall:** 91.5s | **finish_reason:** stop

---

As Tencent Hy3 (SwanStudios design-inspiration reviewer) I restrict this hostile review to **UI/UX and interaction only**, but I still enforce the ratified Crystalline Swan constraints (dark-first, styled-components, tokenized palette, 44px targets, WCAG 4.5:1, ≤300‑line files, responsive 320→3840, reduced‑motion, Victory if charts appear).  

---

## RANKED WEAKNESSES (worst‑first)

### 1. CRITICAL — Phantom “listening” surface (lies to the user)
**File:** `CoachFreestyleOverlay.tsx`  
**Identifiers:** `const session = useFreestyleSession({ accountKey });` (component body, ~line 33); destructure block (~line 38‑44) omits `error` and never calls `appendFragment`; `useEffect` auto‑start (~line 47) calls only `session.start()`; no `useCoachCapture` import.  
**What breaks:** The overlay shows “Listening. Talk as long as you need…” but **never opens the microphone**. `useCoachCapture` is not mounted, so `start()`/`stop()`/`transcribe()` are never invoked. `fragments` stays empty; counters read 0; the BreathOrb animates on a fake state. The UI violates the core product promise and the retention contract (nothing is actually captured).  
**Conditions:** 100% of sessions on every breakpoint.  
**Fix:** Wire the capture hook into the overlay and drive the UI from its real status. (See builder‑exact correction below.)

### 2. HIGH — Unratified danger colors & broken tokenization
**File:** `CoachFreestyleOverlay.styles.ts`  
**Identifiers:** `ControlButton` `$variant === 'danger'` block (`#C92A54`, `#FF8FA3`); `DiscardConfirm` border/background (`#C92A54`).  
**What breaks:** The ratified palette contains **no red**. Using `#C92A54`/`#FF8FA3` violates “tokenized colors” and the closed palette rule. It also creates a non‑system visual language.  
**Conditions:** Whenever discard confirmation or danger button renders (all viewports).  
**Fix:** Replace with ratified tokens only – Wing Purple `#8B5CF6` background, Ice Wing `#60C0F0` glow (cyan glow forbidden on buttons per “Arctic Cyan charts‑only”). (Correction below.)

### 3. HIGH — No error / auto‑stop surfacing
**File:** `CoachFreestyleOverlay.tsx`  
**Identifiers:** Destructured `session` misses `error`; `StatusLine` only switches on `state` strings, never on `error` or `CAPTURE_AUTO_STOPPED_COPY`.  
**What breaks:** If mic permission denied or lifecycle auto‑stop fires (tab hidden), the user sees only the generic “Listening…” or “Finished…” copy. The ratified retention contract requires the auto‑stop notice; UI hides it.  
**Conditions:** Permission revocation, screen lock, navigation away.  
**Fix:** Render `session.error ?? capture.error` in a prominent, WCAG‑compliant alert region.

### 4. MEDIUM — Dialog focus & AT isolation missing
**File:** `CoachFreestyleOverlay.tsx` (`<FreestyleOverlay role="dialog" aria-modal="true">`)  
**What breaks:** No initial focus, no focus trap. Keyboard/AT users (or Sean with a Bluetooth keyboard) can tab outside the modal; Escape logic assumes focus inside.  
**Conditions:** Any open state with AT.  
**Fix:** `autoFocus` the primary control; trap focus within overlay; restore focus to trigger on close.

### 5. MEDIUM — Thumb‑arc fragmentation at 320px
**File:** `CoachFreestyleOverlay.styles.ts` `ControlRow`; `CoachFreestyleOverlay.tsx` button set.  
**What breaks:** At 320px, `Pause` + `Done` + `Discard` (each ~92px + gaps) wrap; the primary `Done` can fall to a second row, leaving the thumb arc. One‑handed gym‑floor use is compromised.  
**Conditions:** ≤375px width.  
**Fix:** Use `order` to keep primary `Done` first, or implement a sticky bottom bar with full‑width primary action.

### 6. LOW — No Victory chart where data exists
**Note:** No charts are used. If a level/metre or words‑per‑minute sparkline is added later, it **must** be Victory (enforced constraint). Current absence is not a defect, but a missed calm‑signal opportunity.

---

## SINGLE HIGHEST‑IMPACT IMPROVEMENT
**Integrate `useCoachCapture` into `CoachFreestyleOverlay`** so the listening orb, counters, and fragment feed reflect a real microphone session, and surface its `error`/auto‑stop copy. This converts the component from a static mock into the actual freestyle dictation surface and simultaneously resolves weaknesses #1 and #3.

---

## BUILDER‑EXACT CORRECTIONS

### A. Overlay wiring (replace relevant section of `CoachFreestyleOverlay.tsx`)
```tsx
import { useCoachCapture } from './hooks/useCoachCapture'; // add
// ...
const session = useFreestyleSession({ accountKey });
const capture = useCoachCapture(); // mount capture pipeline

const {
  state, fragments, elapsedMs, sinceLastFragmentMs, wordCount,
  error: sessionError, discardPending, start, pause, resume, stop,
  requestDiscard, cancelDiscard, discard, reset, appendFragment,
} = session;

// Drive real capture from session state
useEffect(() => {
  if (isOpen && state === 'idle') start();
}, [isOpen, state, start]);

useEffect(() => {
  if (state === 'listening' && capture.status === 'idle') capture.start();
  if (state !== 'listening' && capture.status === 'capturing') capture.stop();
}, [state, capture]);

// Feed transcript fragments into session (interim or final)
useEffect(() => {
  if (capture.transcript) appendFragment(capture.transcript);
}, [capture.transcript, appendFragment]);

// Surface capture errors/auto-stop
const uiError = sessionError ?? capture.error;
```
Then add to `StatusLine` block:
```tsx
{uiError && <span style={{ color: 'var(--frost-white, #E0ECF4)' }}>{uiError}</span>}
```

### B. Palette correction (`CoachFreestyleOverlay.styles.ts`)
Replace danger variant and DiscardConfirm with ratified tokens only:
```ts
if ($variant === 'danger') {
  return css`
    background: var(--wing-purple, #8B5CF6);
    border: 1px solid color-mix(in srgb, var(--ice-wing, #60C0F0) 40%, transparent);
    color: var(--frost-white, #E0ECF4);
    &:hover {
      box-shadow: 0 0 18px color-mix(in srgb, var(--ice-wing, #60C0F0) 50%, transparent);
    }
  `;
}
```
```ts
export const DiscardConfirm = styled.div`
  /* ... */
  border: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 34%, transparent);
  background: color-mix(in srgb, var(--wing-purple, #8B5CF6) 10%, var(--bg-surface, #1A1A24));
`;
```
(Remove all `#C92A54`/`#FF8FA3` and `--danger-*` fallbacks.)

### C. 320px thumb‑arc guard (`ControlRow` usage in tsx)
```tsx
{(isListening || isPaused) && (
  <ControlButton type="button" $variant="primary" onClick={handleStop}
    aria-label="Finish and review" style={{ order: -1 }}>
    <Check size={18} aria-hidden="true" /> Done
  </ControlButton>
)}
```

### D. Focus trap (minimal)
Add `autoFocus` to the first control rendered (or a ref on `FreestyleOverlay` focusing primary button on open).

---

## CONSTRAINT COMPLIANCE CHECK
- **Dark‑first / styled‑components:** Compliant.  
- **Tokenized colors:** Violated by danger hues (fixed above). All other fallbacks use ratified hex.  
- **44px touch:** `ControlButton` min‑height 52px – compliant.  
- **WCAG 4.5:1:** Ratified colors on dark pass; danger fix maintains contrast.  
- **File ≤300 lines:** All four files within limit.  
- **Responsive 320–3840:** Flex + max‑width works; thumb‑arc wrap addressed.  
- **Reduced‑motion:** `motionSafe` mixin applied correctly; compliant.  
- **Victory charts:** None used; if added must be Victory.  
- **Gold law:** Not used – compliant.  
- **Dual‑Button Glow:** Primary blue→purple glow kept; danger now purple→Ice‑Wing glow (cyan glow avoided per charts‑only rule).

Fine: `SignalStrip` `aria-live="off"` is correct.

---

## ENHANCEMENTS (UI/UX, one‑handed mid‑session)
- **Haptic‑style pulse on fragment arrival:** subtle scale on `LivePhrase` (respecting reduced‑motion) confirms capture without reading transcript.  
- **Persistent “discard armed” banner:** instead of only replacing controls, keep a thin gold‑filigree (≤1px) top border when `discardPending` – uses gold law legally.  
- **Large hit‑target Done:** make primary action full‑width sticky bottom on ≤414px.

## WHAT I WOULD ATTACK (UI‑level session loss)
- Because the overlay never calls `capture.start()`, a trainer believes a session is recording; if they close the tab, `useFreestyleSession` unmount purge wipes an empty buffer – no data, but false confidence. Real integration (fix #1) closes this.  
- The missing error surface lets an auto‑stop (lifecycle) go unnoticed; user may keep talking for 10 min with mic already killed by `pagehide`.

No praise sections. Above is the complete hostile UI/UX review.
