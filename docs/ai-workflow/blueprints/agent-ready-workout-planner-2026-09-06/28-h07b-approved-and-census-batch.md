# H07-B implemented (Sean-approved) + census batch converted

Layered on receipts 19–27. Worktree head `5431519a4`; this agent's work remains the uncommitted
dirty layer. **Sean's approval: "do all the fixes you recommend i approve" → H07 option B executed.**

## H07-B — the severe-pain 422 is now a backstop (RED→GREEN)

- New pure predicate `severePainReviewRequired(painAlerts)` in `painAwareGating.mjs`: severe (≥7) +
  UNMAPPED region → review required; severe + flagged exercises left as CAUTION (no alternative
  existed) → review required; severe + EVERY flagged exercise auto-routed (`cautionExercises` empty)
  → **no longer blocks** — the class carries the painSwap/painCaution trail and the pain_alert
  explanations. Sub-severity alerts never block.
- `bootcampGenerator.mjs` now gates on the predicate instead of the inline
  `flaggedExercises?.length` check (which counted successfully-swapped exercises as blockers).
- Tests: 5 new cases in `bootcampPainGating.test.mjs` (fully-swapped → false, unswapped caution →
  true, unmapped severe → true, sub-severity ignored, mixed blocks only when one case is
  unswapped/unmapped) — observed RED (missing export) then GREEN. Pain/generation suites: **39/39**.
- The gate remains fail-closed for everything gating cannot make safe; what changed is that a
  trainer with one injured roster client can generate classes again when the gating already routed
  every flagged movement.

## Census batch — 9 more sites converted (8 files)

- `ExerciseRolodexList` (styles + usage): rolodex tiles → native buttons, shim deleted.
- `FormAnalysis/HistoryTab` `Card`: `styled(motion.div)` → `styled(motion.button)`, shim deleted.
- `PhotoGalleryCard` `PhotoCard`: `styled(motion.article)` → `styled(motion.button)`, shim deleted.
- DropZones ×3 (`PhotoUploader`, `PlaudClipUploader`, `VoiceMemoUpload` `Container`): div→button;
  drag handlers preserved (drop targets work on buttons); `aria-disabled` gating kept (disabled
  would kill drag events).
- `FeaturesSection.V2` `FeatureCardWrapper`: was a button-fake NAVIGATION — now a real link
  (`as="a" href`), click + keyboard from the anchor itself; `text-decoration: none` added.
- `VisitorGeoWidget.detail`: the modal BACKDROP dropped its fake `role="button"` — a backdrop with a
  real Close button inside is not a button. Escape handling retained; mouse click-to-close retained.

Verification: `tsc --noEmit`@16384MB **0 errors** (caught and fixed two real mishaps mid-slice: a
stray brace in VoiceMemoUpload and the VoiceMemo `Container` base needing conversion); affected
suites **205 files / 1266 tests** green; full browser regression **7/7** (master-schedule + planner
censuses in XR Chromium and WebKit, keyboard/focus, 20-viewport matrix).

## Skipped with reasons (register remainder, ~8 files)

- `ConversationItem`: the row contains an inline EDIT INPUT while renaming — a native button wrapper
  would be invalid HTML and break the input. Needs a title-button refactor; its own slice.
- `ContactNotificationItem`: its motion base lives in an imported styles module not yet located read;
  same treatment, next batch.
- `BodyMap` index + `PainEntryPanel` rows, `EnhancedNotificationSection`, `EquipmentManagerPage`,
  `VirtualOlympicsPage`, `WorkoutManagement` ×2: untouched this batch (budget went to verified
  conversion, not volume); each is the same small pattern.
- `BodyMapSVG`: exempt permanently (SVG hit areas).

Browser census on the newly converted ROUTES (gallery, marketing/history, features page) is pending
— these were verified by tsc + their unit suites this batch; their census assertions land when each
route's e2e stubs are written. NOT DEPLOYED, no commit, no production DB contact, no paid calls.
