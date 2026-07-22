---
decision: Arc L blueprint — logger fluidity to "best it can possibly be" (Mobbin 1.1 full contract), worker-executable in Fable+Kimi's vision
status: open
supersedes: none
---

# ELEGANCE BLUEPRINT — Arc L: Workout Logger Fluidity

**Worker contract:** execute EXACTLY this. Where this doc decides, you do not re-decide. TDD every
slice (RED test first). All colors `var(--token, #crystalline-fallback)` — the logger rides the Swan
Lens automatically via tokens; NEVER hardcode a look. All targets ≥44px. `prefers-reduced-motion`
honored everywhere. Zero PII to LLMs. Commit per slice; batch push after CLEAN×2.

## Verified current state (do not re-audit)
- `WorkoutLogger.tsx` (866 ln — DO NOT push past cap; new UI goes in NEW files).
- `ExerciseSetRowComponent.tsx` (203 ln) — weight/reps inputs, RPE slider at :135-144.
- `GhostDataRow.tsx` — READ-ONLY ghost display ("Last: 135lbs × 10"), renders only setIndex 0,
  trainer/admin path only (`skip` on client route — 403 endpoint; KEEP that rule).
- `useGhostPreFill.ts` — auto-populates NEW sets from last session + overload suggestion.
- `FloatingRestTimer.tsx` mounted at WorkoutLogger:844.
- Save → 201 carries prEvents + handoff → PostSaveHandoff celebration (SHIPPED — do not touch).
- Dictation: Coach command lane live ("✓ Added Goblet Squat — 3×12" chip pattern exists).

## Mermaid — target interaction flow
```mermaid
flowchart TD
  A[Set row focused] -->|tap ghost row| B[Accept last-time values → inputs filled]
  A -->|tap weight/reps input on mobile| C[NumericKeypadSheet opens]
  C -->|digits + Done| D[Value committed, next field auto-focused]
  B --> E{Set logged?}
  D --> E
  E -->|tap Log| F[Rest timer starts — ambient pulse + aria-live countdown]
  F -->|voice: skip / plus fifteen| G[Timer adjusts]
  F -->|timer ends| H[Next set row auto-highlighted]
```

## Slices (independently shippable, in order)

### L1 — Ghost-tap-accept (the 1-gesture repeat)
- `GhostDataRow.tsx`: add optional prop `onAccept?: (ghost: GhostSet) => void`. When present, the row
  renders as a `<button type="button">` (44px min-height, full-width) with trailing affordance label
  `Tap to use` (Sora 0.72rem, `var(--text-secondary, #8aa2b8)`). onClick → `onAccept(ghostSet)`.
  Absent → exact current read-only rendering (client route unchanged).
- `ExerciseCardComponent.tsx`: pass `onAccept` filling set 0's weight/reps/rpe via existing
  `onUpdateSet(exerciseIndex, 0, field, value)` calls (one per field, sequential).
- ACCEPTANCE (tests): tap ghost → onUpdateSet called with ghost weight+reps(+rpe if present); no
  `onAccept` → no button role rendered; keyboard Enter works; row ≥44px.
- BAN: do not auto-accept without a tap; do not render the button on the client self-log route.

### L2 — NumericKeypadSheet (mobile bottom-sheet number pad)
- NEW `frontend/src/components/WorkoutLogger/NumericKeypadSheet.tsx` (+`.styles.ts`, ≤300 ln each):
  portal bottom sheet, keys 1-9/0/decimal/backspace/±2.5 steppers/Done, each key ≥48px, Graphite
  `var(--surface-dark, #1A1A24)` sheet, key press feedback via transform scale (reduced-motion: none).
  Props: `{ open, label, value, allowDecimal, onCommit(next: number), onClose }`.
- Wire in `ExerciseSetRowComponent`: on touch devices (pointer: coarse media check hook) tapping the
  weight or reps input opens the sheet instead of the OS keyboard (`inputMode="none"` when coarse,
  readOnly + onClick). Desktop unchanged (normal inputs).
- On Done → commit via onUpdateSet → auto-advance: weight→reps→(RPE row visible? focus it)→Log button.
- ACCEPTANCE: coarse-pointer tap opens sheet; Done commits + advances; Esc/backdrop closes without
  commit; desktop keyboard path untouched (tests mock matchMedia pointer:coarse).
- BAN: never block paste/manual entry on desktop; no OS-keyboard flash (inputMode none before focus).

### L3 — Rest-timer atmosphere
- `FloatingRestTimer`: add `aria-live="polite"` remaining-time announcement at 30/10/0s marks; add
  ±15s and Skip buttons (44px) if absent; ambient border pulse synced to the second
  (`transform/opacity` keyframe, killed under reduced-motion → static ring + text).
- Voice: register `rest_skip` + `rest_adjust` FRONTEND_DISPATCH commands (mirror bootcampCommands.mjs
  shape; events `AI_LOGGER_REST_SKIP`, `AI_LOGGER_REST_ADJUST {deltaSeconds:±15..±60}`) + listener in
  a NEW `useLoggerRestAiEvents.ts` (mirror useBootcampAiEvents; validate delta; ack contract).
- ACCEPTANCE: timer announces via aria-live; voice skip works through the dispatcher map; reduced
  motion = zero animation, countdown text still updates.

### L4 — Dictation degradation chips
- Extend the shipped confirm-chip pattern: on dictation parse failure/ambiguity in the logger context,
  render an inline chip row "Didn't catch that — tap to type" opening L2's keypad/text path; on mic
  permission denial render a one-time receipt chip (not a toast) with the keypad fallback.
- ACCEPTANCE: parse-fail path shows chip (test with mocked failure); never an error wall/modal.

## Metrics (closeout payload)
Median taps per logged set ≤2 on the repeat path (L1) — count in tests by simulating the flow;
keypad commit+advance ≤2 taps per field; zero regressions in the 57-test handoff suite +
logger draft/coach tests.

## Do-NOT list
No schema changes. No touching PostSaveHandoff/celebration. No new transport (blueprint 06-bans §1).
No MUI. No Recharts. WorkoutLogger.tsx stays ≤866 ln (net additions go to new files). No flags.
