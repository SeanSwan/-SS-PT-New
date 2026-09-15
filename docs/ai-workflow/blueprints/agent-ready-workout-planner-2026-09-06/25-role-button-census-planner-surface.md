# role="button" census: planner surface landed, register for the rest

Date: 2026-09-13 (session). Layered on receipts 19–24; worktree `codex/rolodex-bootcamp-planner-20260913`,
base `c0cbe538d…`, **still no commit**. Pain gate untouched (H07 = Sean's).

## Converted this slice (the /workout-planner surface — all three browser-verified)

- **SavedPlanCard `Card`** (`SavedPlanCard.styles.ts`): `styled.div` → `styled.button` (+ appearance/
  font/color/text-align resets); role/tabIndex/`handleCardKeyDown` shim deleted; `type="button"` added.
  Two unit tests that pinned the old keyDown shim were rewritten to the real contract (native BUTTON
  tagName + click → onLoad; keyboard activation is browser-provided and locked end-to-end in the
  Playwright spec).
- **`PlannerLensSwitcher` `LensCard`**: `styled.div` → `styled.button` (+ resets); shim deleted;
  `aria-pressed` (already present) retained on a real toggle button.
- **`DashboardBackgroundStudio` summary**: `role="button"` REMOVED, not converted — the element is a
  native `<summary>` inside `<details>` and already carries button semantics; the extra role was
  double-advertising.

Browser proof: new `workout-planner surface` test in `sprint-planner-a11y.spec.ts` — zero
`div[role="button"]` on the settled /workout-planner page, plan card is `BUTTON` + ≥44px. Run:
**5 passed / 0 failed** under the coach-mobile config (census pass in XR Chromium AND iPhone XR
WebKit; full 20-viewport matrix still green). Post-slice: planner suite **87 files / 457 tests**
green, `tsc --noEmit`@16384MB 0 errors.

## The census register (remaining div/summary fake buttons, one surface per slice)

SVG exception first: `BodyMapSVG.tsx:340` / `BodyMap` regions keep `role="button"` ON SVG HIT
AREAS — SVG shapes cannot be native buttons; that is the correct pattern and is OUT of the census.

Each of the following needs its own surface slice (read styled base → convert or justify → browser
assert on its mounted route): `BodyMap/index.tsx` ActiveEntryRow (div, has shim) ·
`BodyMap/PainEntryPanel.tsx:288` · `BootcampBuilder/ExerciseRolodexList.tsx:78` ·
`admin-dashboard/ContactNotificationItem.tsx:62` · `admin-dashboard/VisitorGeoWidget.detail.tsx:117`
(ModalOverlay-as-button) · `admin-gallery/PhotoUploader.tsx:105` ·
`coach-assistant/ConversationItem.tsx:118` · `FeaturesSection.V2.tsx:401` ·
`EquipmentManagerPage.tsx:1436` · `FormAnalysis/HistoryTab.tsx:247` ·
`EnhancedNotificationSection.tsx:696` · `PlaudClipUploader.tsx:190` ·
`UniversalMasterSchedule` (SessionCard, ScheduleStats, WeekViewGhostLayer, WeekView ×3,
DayViewStacked) · `UserDashboardBackgroundControlsDisclosure.tsx:37` (likely a redundant summary
role like the studio one) · `PhotoGalleryCard.tsx:32` · `VirtualOlympicsPage.tsx:525` ·
`VoiceMemoUpload.tsx:187` · `WorkoutManagement/ClientSelection.tsx:934` ·
`WorkoutManagement/ExerciseLibrary.tsx:929`.

## Label

PLANNER SURFACE VERIFIED (browser census pass in two engines + full matrix + suite + tsc). The
census register above is the honest remainder: ~19 files, each a small surface slice. NOT DRY,
NOT DEPLOYED, no commit, no push, no production DB contact, no paid calls.
