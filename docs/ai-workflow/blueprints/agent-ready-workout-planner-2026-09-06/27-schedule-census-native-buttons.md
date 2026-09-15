# Schedule census: UniversalMasterSchedule native buttons

Layered on receipts 19–26. Worktree head is now `5431519a4` — the takeover agent committed the Luna
layer + receipts 19–22 (`700ffc599`, docs-only `5431519a4`); this session's B1/B2 work (receipts
23–26 + edits) remains the dirty layer, still **no new commit** by this agent.

## Converted (7 sites, 6 files, all on the /master-schedule surface)

- `SessionCard.styles.ts` `CardContainer` + `Cards/SessionCard.tsx`: div→button, shim deleted.
- `WeekView.sessionStyles.ts`: `WeekSessionCard` + `GhostSessionCard` → button (+resets; the
  generic-args multi-line bases needed the resets AFTER the opening backtick — first insert landed
  inside the generics and tsc caught it, repaired).
- `WeekView.layoutStyles.ts`: `DayHeaderCell` + `HourSlot` → button. Keyboard booking on HourSlot is
  preserved by native Enter/Space → click (offset 0 = top of hour, matching the old shim's
  `handleSlotClick(day, hour)`).
- `WeekView.tsx`: three usage sites converted; `handleSlotKeyDown` / `handleDayHeaderKeyDown` /
  `handleSessionKeyDown` defs and the now-unused `isKeyboardActivationKey` import deleted.
- `WeekViewGhostLayer.tsx`: shim deleted (native activation fires the existing stopPropagation
  onClick → book()); unused import removed.
- `DayViewStacked.styles.ts` `TrainerHeaderBar` + usage: div→button — this control previously had NO
  keyboard access at all (a bare div with onClick); the conversion is an a11y FIX, not just a swap.
- `ScheduleStats.tsx`: `role="button"` deleted — the stat toggles were already `as="button"`; the
  role was double-advertising.
- `WeekView.keyboardActivation.test.tsx`: rewritten from keyDown-shim pinning to the native contract
  (tagName BUTTON + click activation for day header / hour slot / session card).

## Verified

- UniversalMasterSchedule suite: **96 files / 363 tests** green (was 3 file failures mid-slice: the
  styles mishap + the pinned-shim test, all resolved).
- `tsc --noEmit`@16384MB: **0 errors** (caught the generic-injection mishap and the
  TrainerHeaderBar base immediately).
- Playwright (coach-mobile config): **7 passed / 0 failed** — NEW master-schedule census test
  (zero `div[role="button"]` on the settled /master-schedule page, real interactivity guard) in XR
  Chromium AND iPhone XR WebKit; planner census both engines; keyboard/focus both engines; full
  20-viewport matrix green.
- Hygiene: vite stopped, `test-results/` removed.

## Register after this slice

Remaining census items (each its own slice): BodyMap index/PainEntryPanel (div rows),
ExerciseRolodexList, ContactNotificationItem, VisitorGeoWidget overlay, PhotoUploader,
ConversationItem, FeaturesSection.V2, EquipmentManagerPage, FormAnalysis HistoryTab,
EnhancedNotificationSection, PlaudClipUploader, PhotoGalleryCard, VirtualOlympicsPage,
VoiceMemoUpload, WorkoutManagement ×2. BodyMapSVG remains exempt (SVG hit areas).

## H07 — still awaiting Sean's one word (A / B / C), brief in receipt 26. Untouched by anyone.
