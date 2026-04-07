# OPUS CEO x CODEX RECURSIVE DEBATE — TIER 2 MOBILE UX BLOCKERS
## Date: 2026-04-07
## Status: AWAITING CODEX REVIEW
## Source: MASTER-ISSUE-REGISTRY-2026-04-07.md (Sections 2.1-2.12, 3.1-3.7)

---

## OPUS ROUND 1 — Tier 2 Fix Summary

All 9 Tier 2 (MOBILE UX BLOCKERS) issues fixed. Frontend build clean (11.48s).

---

### 2.1 Workout Planner No + Button on Mobile — FIXED
**File:** `WorkoutPlannerStyles.ts` + `WorkoutPlannerPage.tsx`
- Added `ExerciseAddBtn` styled component — 44px touch target, visible only on mobile (`@media min-width: 431px { display: none }`)
- Each exercise item now wraps name/meta in a flex container with the + button on the right
- `onClick` on the + button calls `addExercise(ex)` with `e.stopPropagation()` to prevent also selecting
- Changed single-click behavior: now just selects (for teach mode), double-click still adds on desktop

### 2.2 Exercise Names Disappear on Mobile — FIXED
**File:** `WorkoutPlannerStyles.ts`
- `ExerciseName`: Added mobile breakpoint that switches from `nowrap`+`ellipsis` to `display: -webkit-box` with `-webkit-line-clamp: 2` — allows 2-line wrapping
- `BuilderRow`: Added `flex-wrap: wrap` + tighter padding on mobile so exercise name gets space

### 2.3 Exercise Rolodex Not Contained — FIXED
**File:** `WorkoutPlannerStyles.ts`
- `PanelBody`: Added `max-height: 320px; flex: none;` on mobile — creates ~5-7 item scrollable box
- Desktop unchanged (`flex: 1` fills available space)

### 2.9 Store Membership Stuck — FIXED
**File:** `frontend/src/components/NewCheckout/CheckoutView.tsx`
- `CheckoutContainer`: Added mobile breakpoint with `max-height: 90vh; overflow-y: auto;` so "Return to Cart" button is reachable by scrolling
- Added sticky back button at top-left of `CheckoutHeader` (ArrowLeft icon + "Back" text, 44px min-height)
- Both top and bottom back buttons call `onCancel` prop

### 2.12 Equipment Camera Fix — FIXED
**File:** `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx`
- Changed file input `accept` from `"image/jpeg,image/png,image/webp"` to `"image/*"` — iOS Safari is more reliable with the wildcard

### 3.1 TTS Read Button (iOS Safari) — FIXED
**File:** `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/usePremiumTTS.ts`
- Wrapped `audio.play()` in try/catch — iOS Safari silently rejects autoplay
- On rejection, revokes the blob URL and falls back to Web Speech Synthesis (`speakWithBrowser`)
- Existing outer catch still handles network/API errors

### 3.4 Microphone (iOS Safari) — FIXED
**Files:** `VoiceRecordingOverlay.tsx` + `useVoiceRecorder.ts`
- **VoiceRecordingOverlay**: Auto-start effect now skips on iOS (`/iPad|iPhone|iPod/` check). Recording orb's `onClick` now starts recording when `recorder.state === 'idle'` instead of being `undefined`. iOS users tap the orb to start (user gesture satisfies `getUserMedia` requirement).
- **useVoiceRecorder**: MIME type detection now detects iOS and uses `audio/mp4` directly instead of trying webm/ogg first (which iOS doesn't support).

### 3.5 Raw HTML Tags in AI Responses — FIXED
**File:** `frontend/src/components/Shared/AITerminalPanel.tsx`
- Imported `MarkdownRenderer` from coach-assistant (already exists, uses `react-markdown` + `remark-gfm`)
- AI responses (`msg.role === 'assistant'`) now render through `<MarkdownRenderer content={msg.content} />` instead of raw text
- User messages still render as plain text

### 3.7 AI Terminal Z-Index / Can't Exit — FIXED
**File:** `frontend/src/components/Shared/AIPersistentPanel/AIPersistentPanelStyles.ts`
- `MobileBottomSheet` z-index reduced from `100` to `40` — no longer covers modals, dropdowns, or navigation
- Expanded state already has a close button (MobileCloseBtn at line 405 in AIPersistentPanel.tsx)

---

### Build Status
Frontend: clean (11.48s)

**Opus CEO status:** All 9 Tier 2 fixes applied. Awaiting Codex review.

---

## CODEX ROUND 2

**Status:** CONSENSUS NOT REACHED

Most of the Tier 2 fixes validate in source as described, but there is one remaining implementation bug in the workout planner mobile `+` fix.

### Findings

1. **Invalid nested button markup in the workout planner exercise list can break the new mobile `+` interaction.**
   - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerStyles.ts:406` defines `ExerciseItem` as `styled.button`.
   - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerStyles.ts:380` defines `ExerciseAddBtn` as `styled.button`.
   - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx:723-746` renders `ExerciseAddBtn` inside `ExerciseItem`.
   - That produces `<button><button>...</button></button>`, which is invalid HTML and triggers React DOM nesting warnings. On mobile Safari especially, nested interactive elements can lead to inconsistent tap behavior, focus issues, or the inner button not behaving reliably.
   - This should be refactored before consensus. The lowest-risk fix is to make the outer row a non-button element with button semantics (`div`/`role="button"`/keyboard handlers), or make the inner mobile add control a non-button element if the outer row must remain a button.

### Verified Good

- **Workout planner mobile text/layout:** `PanelBody`, `ExerciseName`, and `BuilderRow` changes in `WorkoutPlannerStyles.ts` look correct and consistent with the stated mobile containment/wrapping goals.
- **Checkout mobile overflow/back navigation:** `CheckoutView.tsx` now adds mobile scrollability (`max-height: 90vh; overflow-y: auto`) and both top/back cancel actions call `onCancel`.
- **Equipment camera input:** `EquipmentManagerPage.tsx:824` now uses `accept="image/*"`, which is the correct iOS-friendly change.
- **Premium TTS fallback:** `usePremiumTTS.ts:130-136` now catches `audio.play()` rejection and falls back to browser speech.
- **Voice recording iOS gesture path:** `VoiceRecordingOverlay.tsx:195-200` and `VoiceRecordingOverlay.tsx:247-250` now skip auto-start on iOS and allow tap-to-start from the orb.
- **Voice recorder MIME detection:** `useVoiceRecorder.ts:45-54` now prefers `audio/mp4` on iOS before desktop MIME candidates.
- **AI terminal markdown rendering:** `AITerminalPanel.tsx:60` and `AITerminalPanel.tsx:244` correctly route assistant messages through the existing safe `MarkdownRenderer`.
- **AI persistent panel z-index:** `AIPersistentPanelStyles.ts:357` lowers the mobile bottom sheet to `z-index: 40` as described.

### Conclusion

Tier 2 is close, but I would not mark `CONSENSUS REACHED` yet because the mobile workout planner `+` button is currently implemented as a nested button inside another button.

---

## OPUS ROUND 3

Fixed. Changed `ExerciseItem` from `styled.button` to `styled.div` with ARIA button semantics:

- `WorkoutPlannerStyles.ts:406`: `styled.button` -> `styled.div` — no more nested `<button>` in DOM
- `WorkoutPlannerPage.tsx:725-731`: Added `role="button"`, `tabIndex={0}`, and `onKeyDown` handler (Enter/Space triggers `addExercise`) to maintain keyboard accessibility

The `ExerciseAddBtn` remains a real `<button>` inside a `<div role="button">` — valid HTML, correct semantics, reliable on mobile Safari.

Build clean (14.81s). Requesting CONSENSUS REACHED.

---

## CODEX ROUND 4

**Status:** CONSENSUS REACHED

I re-checked the nested-button fix in source.

- `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerStyles.ts:406` now defines `ExerciseItem` as `styled.div`, so the outer exercise row is no longer a native button.
- `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx:723-733` now adds `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler on the outer row.
- `ExerciseAddBtn` remains the inner real `<button>`, which is now valid because it sits inside a `<div role="button">` instead of inside another `<button>`.

The remaining Round 2 blocker is resolved. I do not have any further production-blocking objections within this Tier 2 scope.
