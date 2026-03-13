# Frontend UI/UX Expert — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-pro-preview | **Duration:** 42.1s
> **Files:** frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx
> **Generated:** 3/12/2026, 2:10:18 PM

---

As the Lead UI/UX Architect and Co-Orchestrator for SwanStudios, I have reviewed the `UniversalMasterSchedule.tsx` component. 

My design philosophy for this module is **"Crystalline Precision."** A master schedule is the central nervous system of a fitness SaaS. It must feel like a high-end Bloomberg Terminal mixed with Apple Fitness+ — dense with data, yet visually breathable, utilizing our deep-ocean/frozen-forest aesthetic to guide the eye without overwhelming it.

I have identified critical tech debt from the retired Galaxy-Swan theme and several missed opportunities for premium interaction design. 

Here are my authoritative design directives. Claude, you are to implement these exactly as specified.

---

### 1. CRITICAL: Purge Galaxy-Swan Tech Debt (Scrollbar)
**Severity:** CRITICAL
**File & Location:** `frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx` -> `ScheduleContainer` styled-component.
**Design Problem:** The custom scrollbar is using retired Galaxy-Swan tokens (`rgba(10, 10, 15, 0.8)` for the track, and `rgba(0, 200, 255, 0.5)` for the hover state). This breaks the Crystalline Swan immersion and looks like a cheap cyberpunk theme rather than a luxury vault.
**Design Solution:** We must use `Royal Depth #003080` for the track and `Arctic Cyan #50A0F0` / `Ice Wing #60C0F0` for the interactive states.

**Implementation Notes for Claude:**
Replace the `::-webkit-scrollbar` block in `ScheduleContainer` with the following exact CSS:
```css
  /* Premium Crystalline Scrollbar */
  &::-webkit-scrollbar {
    width: 6px; /* Slimmer, more elegant */
    height: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 48, 128, 0.4); /* Royal Depth with opacity */
    border-radius: 8px;
    margin: 4px; /* Detach from edges slightly */
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(80, 160, 240, 0.6); /* Arctic Cyan */
    border-radius: 8px;
    border: 1px solid rgba(224, 236, 244, 0.1); /* Frost White glass edge */
    transition: background 0.2s ease;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(96, 192, 240, 0.9); /* Ice Wing glow on hover */
  }
```

### 2. HIGH: Typography Enforcement & Exact Token Usage
**Severity:** HIGH
**File & Location:** `frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx` -> `ScheduleContainer` styled-component.
**Design Problem:** The container sets `color: #f0f0ff;` which is an approximation. We must use the exact `Frost White #E0ECF4` token. Furthermore, the container fails to establish the CSS variables for our typography matrix, risking fallback fonts in sub-components.
**Design Solution:** Inject the typography matrix and exact color tokens at the root of the schedule to enforce inheritance.

**Implementation Notes for Claude:**
Add the following properties to the top of the `ScheduleContainer` styled-component:
```css
  /* Crystalline Swan Base Tokens */
  color: #E0ECF4; /* Frost White */
  font-family: 'Sora', sans-serif; /* Default UI font */
  
  /* Establish local typography variables for sub-components */
  --font-heading: 'Plus Jakarta Sans', sans-serif;
  --font-drama: 'Cormorant Garamond', serif;
  --font-data: 'Fira Code', monospace;
  --font-ui: 'Sora', sans-serif;

  /* Mobile Safe Areas for modern devices (iPhone Notch/Dynamic Island) */
  padding-bottom: env(safe-area-inset-bottom, 20px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
```

### 3. HIGH: Premium Loading Choreography (Kill the Spinner)
**Severity:** HIGH
**File & Location:** `frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx` -> `if (dataLoading.sessions && sessions.length === 0)` block.
**Design Problem:** A fullscreen `<Spinner>` is a jarring, low-effort UX pattern for a premium platform. It causes a massive layout shift when the calendar finally renders.
**Design Solution:** Implement a "Crystalline Shimmer" skeleton screen that mimics the layout of the calendar/timeline before data arrives.

**Implementation Notes for Claude:**
1. Remove the `<Spinner size={60} text="Loading Schedule..." fullscreen />`.
2. Replace it with a new styled-component `<ScheduleSkeleton />`.
3. Create the skeleton inline or in the `ui` folder using this exact animation:
```tsx
const SkeletonPulse = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const ScheduleSkeleton = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  
  .skeleton-header {
    height: 64px;
    border-radius: 16px;
    background: linear-gradient(90deg, rgba(0, 48, 128, 0.4) 25%, rgba(80, 160, 240, 0.15) 50%, rgba(0, 48, 128, 0.4) 75%);
    background-size: 400% 100%;
    animation: ${SkeletonPulse} 2s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
    border: 1px solid rgba(224, 236, 244, 0.05);
  }

  .skeleton-grid {
    flex: 1;
    border-radius: 16px;
    background: linear-gradient(90deg, rgba(0, 32, 96, 0.6) 25%, rgba(0, 48, 128, 0.4) 50%, rgba(0, 32, 96, 0.6) 75%);
    background-size: 400% 100%;
    animation: ${SkeletonPulse} 2s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
    border: 1px solid rgba(224, 236, 244, 0.05);
  }
`;

// In the render block:
if (dataLoading.sessions && sessions.length === 0) {
  return (
    <ScheduleContainer>
      <ScheduleSkeleton>
        <div className="skeleton-header" />
        <div className="skeleton-grid" />
      </ScheduleSkeleton>
    </ScheduleContainer>
  );
}
```

### 4. MEDIUM: "Swan Glide" Entrance Animation
**Severity:** MEDIUM
**File & Location:** `frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx` -> `<motion.div>` wrapper inside `ScheduleContainer`.
**Design Problem:** The current Framer Motion transition (`duration: 0.6, ease: [0.16, 1, 0.3, 1]`) is decent, but lacks the "weight" and "glassy" feel of our Crystalline theme. It just slides up.
**Design Solution:** Add a subtle scale effect and a blur filter to create a "defrosting/revealing" effect as the schedule loads.

**Implementation Notes for Claude:**
Update the `motion.div` props to the following:
```tsx
<motion.div
  initial={{ opacity: 0, y: 30, scale: 0.98, filter: 'blur(8px)' }}
  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
  transition={{ 
    duration: 0.8, 
    ease: [0.16, 1, 0.3, 1],
    opacity: { duration: 0.6 },
    filter: { duration: 0.4 }
  }}
  style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}
>
```

### 5. MEDIUM: Touch Target & Mobile-First Guardrails
**Severity:** MEDIUM
**File & Location:** `frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx` -> Global context.
**Design Problem:** While the sub-components handle the actual buttons, the root component orchestrates the `BookingDrawer` and Modals. On mobile, bottom sheets must not be obscured by the browser's dynamic UI (Safari address bar).
**Design Solution:** Ensure the `ScheduleContainer` explicitly handles `dvh` (Dynamic Viewport Height) correctly with a fallback, and prevents pull-to-refresh on the calendar area which ruins the drag-and-drop UX.

**Implementation Notes for Claude:**
Update the `height` and `overscroll-behavior` in `ScheduleContainer`:
```css
  /* Fallback for older browsers, dvh for modern mobile */
  height: calc(100vh - var(--shell-chrome));
  height: calc(100dvh - var(--shell-chrome));
  
  /* Prevent pull-to-refresh on mobile which breaks drag-and-drop */
  overscroll-behavior-y: none;
  touch-action: pan-x pan-y;
```

---

### Final Orchestration Note to Claude:
Do not alter the Redux logic or the custom hooks (`useCalendarData`, etc.). Your focus is strictly on applying these UI/UX architectural changes to the `UniversalMasterSchedule.tsx` file. Ensure all hex codes match the Crystalline Swan palette exactly. Execute these updates and prepare the sub-components for a similar design pass.

---

*Part of SwanStudios 7-Brain Validation System*
