# AI Prompt: Execute FitnessStats V2 Refactor

**Instructions:**
You are an expert React developer. Execute the FitnessStats V2 refactor plan in **BATCH MODE** (no approval needed for each step). Complete all tasks and report back when done.

---

## Context

**Goal:** Refactor `FitnessStats.tsx` to match `ProgramsOverview.V3` glass-morphism style, add video background, and remove `V1ThemeBridge`.

**Files Changed:**
- `frontend/src/components/FitnessStats/FitnessStats.tsx`
- `frontend/src/pages/HomePage/components/HomePage.V2.component.tsx`

**Design Specs:**
- **Video:** `smoke.mp4` (desktop only, `preload="metadata"`, opacity 0.25).
- **Cards:** Glass surface (`rgba(15, 25, 35, 0.92)`), blur 12px, hover lift + teal glow.
- **Typography:** Cormorant Garamond (headings), Source Sans 3 (values).
- **Charts:** Recharts preserved, `debounce={100}` on `ResponsiveContainer`.

---

## Step 1: Apply Critical Patches (Must Do)

Before implementing, apply these patches to the plan:

### A. Add Poster Image to Video
In `FitnessStats.tsx`, update the `<video>` tag:
```tsx
<video
  autoPlay
  muted
  loop
  playsInline
  preload="metadata"
  poster="/images/smoke-poster.jpg" // ADD THIS LINE
  className="video-bg"
>
  <source src="/videos/smoke.mp4" type="video/mp4" />
</video>
```

### B. Add `overflow: hidden` to Cards
In `FitnessStats.tsx`, update the `Card` styled component:
```tsx
const Card = styled(motion.div)`
  background: ${T.surface};
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 212, 170, 0.12);
  border-radius: 16px;
  overflow: hidden; // ADD THIS LINE
  height: 280px;
  // ... existing styles
`;
```

### C. Add `debounce` to Charts
In `FitnessStats.tsx`, update `ResponsiveContainer`:
```tsx
<ResponsiveContainer width="100%" height="100%" debounce={100}>
  {/* Chart components */}
</ResponsiveContainer>
```

### D. Add Fluid Typography (Optional but Recommended)
In `FitnessStats.tsx`, update stat value font size:
```tsx
const StatValue = styled.div`
  font-family: 'Source Sans 3', sans-serif;
  font-size: clamp(2rem, 5vw, 2.8rem); // ADD clamp()
  font-weight: 700;
  color: ${T.text};
`;
```

---

## Step 2: Implement the Component

### A. Rewrite `FitnessStats.tsx`
1.  **Imports:** Add `useIsDesktop`, `useReducedMotion`, `framer-motion`, `recharts`.
2.  **Video Section:** Add conditional video background (desktop only).
3.  **Grid Layout:** Implement 3-col → 2-col → 1-col responsive grid.
4.  **Stat Cards:** Create 6 cards with counter animation.
5.  **Chart Cards:** Create 3 cards with Recharts (line, bar, pie).
6.  **Styling:** Use `styled-components` with Ethereal Wilderness tokens.

### B. Update `HomePage.V2.component.tsx`
1.  Remove `V1ThemeBridge` wrapper around `FitnessStats`.
2.  Keep `Suspense` fallback.

---

## Step 3: TypeScript & Build

Run these commands in sequence:

```bash
cd frontend
npx tsc --noEmit
npm run build
```

**If errors occur:**
- Fix TypeScript errors.
- Retry build.
- If stuck, log the error and proceed to Playwright testing (report the error).

---

## Step 4: Playwright Visual Verification

Use **Playwright MCP** to capture screenshots and verify the implementation.

### A. Capture Screenshots
Run these commands to capture screenshots at key breakpoints:

```bash
# Desktop (1280px)
playwright screenshot --wait-for-timeout 2000 --full-page http://localhost:5173 fitness-stats-1280w.png

# Tablet (768px)
playwright screenshot --wait-for-timeout 2000 --full-page http://localhost:5173 fitness-stats-768w.png

# Mobile (375px)
playwright screenshot --wait-for-timeout 2000 --full-page http://localhost:5173 fitness-stats-375w.png
```

### B. Verify Visual Requirements
Check the screenshots for:

| Check | Desktop (1280px) | Tablet (768px) | Mobile (375px) |
| :--- | :--- | :--- | :--- |
| **Grid Layout** | 3×2 stats, 3×1 charts | 2×3 stats, 1-col charts | 1-col stats (450px max) |
| **Video** | `smoke.mp4` playing | `smoke.mp4` playing | Gradient only (no video) |
| **Number Contrast** | High contrast, readable | High contrast, readable | High contrast, readable |
| **Hover Effects** | Cards lift + glow | Cards lift + glow | No hover (touch) |
| **Chart Rendering** | All 3 charts visible | All 3 charts visible | All 3 charts visible |
| **Touch Targets** | N/A | N/A | ≥44px buttons/links |

### C. Console Errors
Check for console errors:
```bash
playwright evaluate "console.error" | head -n 20
```

**Report:** List any console errors found.

---

## Step 5: Acceptance Criteria

Verify these criteria are met:

- [ ] **Video:** Desktop shows `smoke.mp4`, mobile shows gradient (no `<video>` in DOM).
- [ ] **Glass Style:** Cards match `ProgramsOverview.V3` (glass surface, blur, teal border).
- [ ] **Typography:** Headings use Cormorant Garamond, values use Source Sans 3.
- [ ] **Charts:** All 3 charts render correctly (line, bar, pie).
- [ ] **Responsive:** Grid breaks at 1024px and 768px as specified.
- [ ] **Animation:** Counter animation works, reduced motion supported.
- [ ] **No Console Errors:** Build succeeds, no runtime errors.
- [ ] **V1ThemeBridge Removed:** Component renders without wrapper.

---

## Step 6: Final Report

When complete, output a report in this format:

```markdown
## FitnessStats V2 Refactor — Execution Report

### Status: ✅ Complete / ⚠️ Partial / ❌ Failed

### Critical Patches Applied:
- [ ] Poster image added
- [ ] overflow: hidden added
- [ ] debounce added to charts
- [ ] Fluid typography added

### Build Status:
- [ ] TypeScript: ✅ Pass / ❌ Fail
- [ ] Build: ✅ Pass / ❌ Fail

### Playwright Verification:
| Breakpoint | Grid | Video | Contrast | Charts |
|------------|------|-------|----------|--------|
| 1280px | ✅ | ✅ | ✅ | ✅ |
| 768px | ✅ | ✅ | ✅ | ✅ |
| 375px | ✅ | ✅ | ✅ | ✅ |

### Console Errors:
- [ ] None / [List errors]

### Notes:
[Any observations or issues]
```

---

## Instructions

1.  **Read** the plan context.
2.  **Apply** critical patches (Step 1).
3.  **Implement** the component (Step 2).
4.  **Run** TypeScript and build (Step 3).
5.  **Verify** with Playwright (Step 4).
6.  **Report** completion (Step 6).

**GO:** Execute the refactor and report back when done.