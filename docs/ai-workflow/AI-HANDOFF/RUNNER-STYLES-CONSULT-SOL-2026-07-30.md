# Consult reply — GPT Sol 5.6 (openai/gpt-5.6-sol) — 2026-07-30T05:38:57.209Z

> tokens: prompt=1857 completion=6419

# Executive verdict

The strongest product is **not ten equally elaborate mini-apps**. It is one excellent runner with ten visual interaction lenses built from a shared primitive kit.

The draft currently over-invests in spectacle and under-represents **supersets/circuits, error recovery, and interrupted-session resilience**. The biggest offenders are **Stadium HUD**, unrestricted **World Immersion**, and the duplication among **Focus Flow, Command Deck, and Split Zen**.

---

# 1. Attack the 10 — ranked weakest to strongest

## Recommended revised roster

| Rank | Draft direction | Verdict | Concrete change |
|---:|---|---|---|
| 10 | **Stadium HUD** | **Replace.** Combo mechanics reward logging velocity, not training quality. They can pressure users to shorten rest or log sloppy sets. “PR sirens” also make earned gold noisy and less credible. | Replace with **Performance Proof** — *quiet, factual deltas and validated PR moments; gold appears only when an earned event is confirmed.* |
| 9 | **World Immersion** | **Constrain heavily.** Parallax, particles, glass, and dynamic retinting are a readability, battery, GPU, and motion-accessibility trap. It risks becoming the screenshot skin nobody actually trains with. | Rename **World Glass** — *static or extremely slow atmospheric depth behind an opaque active-set island; one brief set-completion mote, no continuous particle system.* |
| 8 | **Ring Runner** | **Weak as a full input model.** Rings communicate progress well but handle weight, reps, RPE, corrections, and notes poorly. It is currently a visualization looking for a workflow. | Rename **Orbit Runner** — *the ring owns session progress and rest; a conventional thumb-zone set editor remains beneath it.* |
| 7 | **Coach Voice-First** | **“Voice-first” is wrong for public gyms.** Noise, privacy, accents, earbuds, and recognition failures make voice a shortcut—not the sole hierarchy. | Rename **Coach Copilot** — *a persistent purple command strip with visible transcript, confidence, correction, and one-tap manual fallback.* |
| 6 | **Timeline Pulse** | **Distinct, but dangerously close to the current long vertical stack.** It only works if the timeline represents sequence—not all editable detail simultaneously. | Keep, but make it **auto-centered and windowed** — *past two events, NOW, next two events; expand on demand.* |
| 5 | **Command Deck** | **Mobile version duplicates Focus Flow and Split Zen.** “Desktop two-pane” is useful, but desktop layout alone does not justify a separate Runner Style. | Merge with Split Zen into **Glance Deck** — *viewport-scale weight × reps, “SET 2 OF 3,” and peekable previous/next exercise cards.* |
| 4 | **Split Zen** | **Good signature, insufficient full-system coverage.** Giant numerals become awkward once tempo, RPE, rest, notes, corrections, and coach proposals appear. | Merge into **Glance Deck**. Keep giant numerals as its active-entry state rather than pretending they can carry the whole session. |
| 3 | **Ladder Dense Pro** | **Strong and necessary.** It serves repeat users who value throughput over theater. The risk is shrinking controls to achieve density. | Keep. Use a pinned active row, 48–52px row height, no horizontal scrolling, and progressively disclose nonessential fields. |
| 2 | **Sheet Stack** | **Excellent mobile ergonomics.** It naturally supports keypad, Rolodex, Coach, rest, and corrections. The danger is modal nesting. | Keep, but enforce **one sheet host, one active sheet, no sheet-on-sheet stacking**. |
| 1 | **Focus Flow** | **Best overall foundation and best default.** It provides clear NOW state without hiding workout context. | Keep. Replace free-form swipe navigation with explicit Previous/Next controls plus optional swipe; edge gestures must not compete with iOS back navigation. |

## Replacement for the merged slot

### **Set Queue**
*The next three actionable events—log, rest, then next exercise—form a thumb-reachable queue, with NOW always occupying the primary bottom card.*

This is more useful than maintaining both Command Deck and Split Zen. It is particularly strong for interrupted attention because it answers: **“What do I do right now, and what happens next?”**

## Final recommended ten

1. Focus Flow  
2. Sheet Stack  
3. Ladder Dense Pro  
4. Glance Deck  
5. Set Queue  
6. Timeline Pulse  
7. Coach Copilot  
8. Orbit Runner  
9. World Glass  
10. Performance Proof  

---

# 2. Top three for iPhone-X one-hand gym use

## 1. **Focus Flow — make this the default**

Why:

- Best 1-meter “where am I?” comprehension.
- Keeps one exercise and one active set dominant.
- Accommodates every required field through progressive disclosure.
- Lower learning cost than sheets, giant gestures, or timelines.
- Works equally well for planned sessions, ad hoc sessions, and Coach-added exercises.

### Required default layout

- **Top:** compact elapsed time, plan context, Finish.
- **Upper-middle:** exercise name, set progress, previous/next context.
- **Middle:** active set with large weight/reps values.
- **Lower-middle:** overload and last-weight chips.
- **Bottom thumb zone:** persistent `Log Set` button.
- **Resting state:** rest bar replaces the Log button but retains `Skip` and `±15s`.
- Coach/dictation remains a compact dock above the bottom safe area.

Do not make the breathing pulse continuous. One soft emphasis on focus change is enough; otherwise it becomes ambient distraction.

## 2. **Sheet Stack**

Best for users who frequently edit RPE, tempo, notes, Coach commands, and exercise selection. It is the cleanest way to preserve L2 keypad ergonomics without visually bloating the runner.

Its weakness is context loss: a sheet can obscure the exercise and set being edited. Every detent must retain a compact context header such as:

> Bench Press · Set 2 of 4

## 3. **Ladder Dense Pro**

Best for experienced lifters who log from memory and want maximum set throughput. It should be offered prominently after the user has completed several sessions, but it should not be the first-run default.

It must remain genuinely touchable. “Dense” cannot mean 32px rows and tiny edit affordances.

---

# 3. Missing headless-engine contract

These omissions will otherwise force skins to invent behavior locally.

## P0 — must be added before skin work

### 1. Stable entity identity and ordering

Do not expose only array positions.

```ts
sessionId
exerciseId
setId
blockId?
exerciseOrder[]
setOrderByExercise
```

Required actions:

```ts
reorderExercise(...)
reorderSet(...)
moveExerciseToBlock(...)
```

Stable IDs are essential when Coach inserts an exercise, a set is removed, or a skin switches while an editor is open.

### 2. Explicit session and set lifecycle states

A boolean `logged` is insufficient.

```ts
sessionStatus:
  | 'draft'
  | 'active'
  | 'paused'
  | 'finishing'
  | 'saving'
  | 'saved'
  | 'save_failed'
  | 'abandoned'

setStatus:
  | 'pending'
  | 'active'
  | 'logging'
  | 'logged'
  | 'editing'
  | 'error'
```

All skins need identical semantics for disabling duplicate submissions, showing save failures, and applying Train colors honestly.

### 3. Engine-owned edit buffers

Weight/reps currently risk living inside each skin’s local inputs. That would lose uncommitted edits during a Lens swap.

```ts
setDraftsById: {
  weightText
  repsText
  rpeText
  tempoText
  restText
  notes
  dirtyFields[]
  validationErrors[]
}
```

Actions:

```ts
updateSetDraft(setId, patch)
commitSetDraft(setId)
discardSetDraft(setId)
```

Never rely on uncontrolled DOM values for workout data.

### 4. Validation and logging result

`logSet` needs more than a void return.

```ts
logSet(setId): Promise<
  | { ok: true; eventId; prEvents[]; nextFocus }
  | { ok: false; fieldErrors; recoverable; message }
>
```

Add an idempotency key so sweaty double-taps cannot duplicate a set.

### 5. Undo and destructive-action recovery

Required actions:

```ts
undoLastAction()
restoreRemovedSet(...)
restoreRemovedExercise(...)
```

Removing a logged exercise should not be an immediate destructive operation. Use a short undo window and preserve audit history.

### 6. Rest timer as absolute time, not decrementing UI state

Expose:

```ts
rest: {
  status
  startedAt
  endsAt
  prescribedSeconds
  adjustmentSeconds
  source: 'plan' | 'user' | 'coach'
  associatedSetId
}
```

Every skin derives the display from `endsAt`. This avoids timer drift when the app backgrounds, the device locks, or the skin swaps.

### 7. Canonical focus/navigation model

```ts
focus: {
  exerciseId
  setId
  field?: 'weight' | 'reps' | 'rpe' | 'tempo' | 'rest' | 'notes'
  reason: 'user' | 'logged' | 'coach' | 'restore' | 'validation'
}
```

Actions:

```ts
focusSet(...)
focusNextAction()
focusPreviousAction()
```

A style may render focus differently, but must not calculate the next set independently.

---

## P1 — necessary for a polished runner

### 8. Workout structure beyond `exercises[]`

The engine needs:

- Superset/circuit/block identity.
- Round number and round count.
- Exercise transition order.
- Optional timed work intervals.
- Per-side or unilateral set designation.
- Warm-up, working, drop, AMRAP, and failure-set types.

Without this, skins will flatten supersets into misleading sequential lists.

### 9. Target, previous, and suggestion provenance

Each displayed value must distinguish:

```ts
targetValue
previousValue
draftValue
suggestedValue
suggestionReason
suggestionConfidence
acceptedSuggestionId
```

Otherwise skins will inconsistently label a prior weight as a prescribed target.

### 10. Save synchronization state

Expose:

```ts
sync: {
  localRevision
  remoteRevision
  lastSavedAt
  pendingChanges
  status
  conflict?
}
```

“Saved · 2s ago” must be based on actual persistence, not a cosmetic timer.

### 11. Dictation lifecycle

```ts
dictationStatus:
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'processing'
  | 'needs_confirmation'
  | 'failed'

partialTranscript
finalTranscript
confidence
permissionState
inputRoute
```

Actions must include cancel, retry, edit transcript, and confirm—not just command execution.

### 12. Coach proposal lifecycle

```ts
proposal: {
  id
  command
  explanation
  affectedEntities
  status: 'proposed' | 'accepted' | 'rejected' | 'executing' | 'failed'
}
```

Coach should not silently mutate the workout. Material changes require visible confirmation and undo.

### 13. Overlay/surface intent

The engine or a shared host controller should own semantic surfaces:

```ts
openSurface('keypad' | 'rolodex' | 'coach' | 'pain' | 'finish')
closeSurface()
```

Skins choose the presentation—sheet, drawer, panel—but not whether multiple conflicting surfaces can be open.

### 14. Units, locale, and formatting

Include:

- kg/lb units.
- Plate precision and allowed increments.
- Decimal separator.
- Timer formatting.
- RPE scale rules.
- Accessible spoken labels.

Do not let each skin round weights differently.

### 15. Post-save proof payload

The celebration needs canonical facts:

```ts
duration
loggedSets
totalVolume
validatedPRs
streakChange
planCompletion
shareableSummary
```

A skin should render this payload, not recalculate accomplishments.

---

# 4. Lens-switchable architecture — sharpest risks and mandates

## 1. State loss during swap

### Risk

Local component state will inevitably appear: input text, active sheet, scroll position, open notes, partial dictation, or an uncommitted keypad value. Lazy-loading a different skin unmounts the current tree and destroys it.

### Mandate

Place the engine and shared surface controller above the lazy skin boundary:

```tsx
<SessionRunnerProvider>
  <RunnerSurfaceProvider>
    <Suspense fallback={<RunnerSwapSkeleton />}>
      <SelectedRunnerSkin />
    </Suspense>
  </RunnerSurfaceProvider>
</SessionRunnerProvider>
```

Rules:

- All workout data and edit buffers live in the engine.
- Active semantic surface lives in the shared host.
- Skin-local state is limited to disposable presentation state.
- Swap tests must include an open keypad, dirty notes, active rest, partial dictation, and save in progress.

Do not permit style switching while the canonical save transaction is committing. Queue the visual swap until save resolves.

---

## 2. Contract drift across ten skins

### Risk

One skin will eventually omit pain capture, hide `removeSet`, mishandle a Coach proposal, or implement rest adjustment differently.

### Mandate

Create a **Runner Skin Conformance Suite** and a typed capability manifest. Every skin must pass the same behavioral scenarios:

1. Start planned and unplanned sessions.
2. Edit and log every supported set field.
3. Add/remove/restore set.
4. Add/remove/restore exercise.
5. Start, adjust, skip, background, and resume rest.
6. Accept/reject every Coach command family.
7. Capture pain.
8. Recover from save failure.
9. Swap Lens at every lifecycle state.
10. Finish and render canonical proof.

A skin cannot ship with `supportsNotes: false`. Progressive disclosure is acceptable; missing behavior is not.

---

## 3. Focus and accessibility corruption on swap

### Risk

A DOM node disappears while VoiceOver, keyboard focus, or the keypad is attached to it. Focus may fall to `<body>`, causing the user to lose context.

### Mandate

Use semantic focus keys rather than DOM references:

```ts
{ exerciseId, setId, field }
```

After a swap:

1. Render the new skin.
2. Resolve the semantic key to its new element.
3. Restore focus without unwanted scrolling.
4. Announce once: “Runner style changed to Focus Flow. Bench Press, set 2 active.”

Also mandate:

- Shared accessible names for all actions.
- Centralized live-region announcements.
- No color-only state distinctions.
- No swipe-only navigation.
- Reduced-motion snapshots for every skin.
- VoiceOver rotor and Switch Control testing on the top three skins.

---

## 4. Test-matrix explosion

### Risk

Ten skins × palette lenses × mobile widths × motion preferences × session states becomes unmanageable if treated as full Cartesian coverage.

### Mandate

Use layered testing:

- **Engine:** exhaustive unit/state-machine tests, skin-independent.
- **Shared primitives:** keypad, rest controller, Rolodex, Coach, Finish tested once.
- **Every skin:** contract conformance at 320px and 375px.
- **Top three skins:** full device/accessibility/E2E matrix.
- **Other seven:** focused visual and contract smoke matrix.
- **Palette testing:** semantic token contrast tests, not screenshot every palette/skin combination.
- **Golden scenarios:** planned session, no-plan session, superset, active rest, save failure, mid-session swap.

This is only manageable if skins compose shared primitives. Ten independent DOM implementations will become a permanent QA tax.

---

## 5. Bundle and runtime cost

### Risk

Ten skins can duplicate animation libraries, charts, media handling, icons, and CSS. World Glass and Orbit Runner are especially likely to import expensive rendering code.

### Mandate

- Current skin in the initial route chunk; all others lazy-loaded.
- Static image/video previews in the Lens picker—never load a live skin for the thumbnail.
- Prefetch only on picker open or idle Wi-Fi.
- Shared motion package; no skin-specific animation dependency.
- Per-skin compressed JS budget: approximately **25–35 KB**, excluding shared primitives.
- No WebGL requirement.
- No continuous off-screen animation.
- Pause atmosphere when hidden or backgrounded.
- Test on low-power mode and thermally constrained devices, not only flagship hardware.

---

## 6. CSS/token leakage

### Risk

A skin can hard-code cyan, gold, or purple and break world retinting or state truth.

### Mandate

Expose semantic tokens, not just raw palette values:

```css
--runner-active
--runner-pending
--runner-logged
--runner-coach
--runner-danger
--runner-surface
--runner-text-primary
--runner-focus-ring
```

`--world-accent` may feed `--runner-active`, but may not override logged gold or Coach purple. Automated contrast tests should validate every approved Lens recipe.

Use CSS layers or scoped modules so one lazy skin cannot alter shared keypad or host styles.

---

## 7. Accidental interaction differences

### Risk

If every skin invents its own gestures, users are not changing appearance—they are relearning the product.

### Mandate

Standardize these invariants:

- Tap value → L2 numeric sheet.
- Primary bottom action → Log Set or active rest action.
- Long press is never required.
- Horizontal swipe is optional enhancement only.
- Finish remains top-right and text-labeled.
- Coach is always identifiable in Wing Purple.
- Gold always means completed/earned, never selected or promotional.
- Destructive actions share the same confirmation/undo policy.

“Skin” must not become an excuse for ten incompatible products.

---

# 5. iPhone-X traps for the top three

## A. Focus Flow

### Safe-area traps

- The notch leaves little room for plan title, timer, and Finish. Do not build a tall dashboard header.
- Keep Finish in a stable top-right 44×44px target below `env(safe-area-inset-top)`.
- Long assignment titles must truncate to one line; the full title can open in context details.
- Bottom controls require padding for `env(safe-area-inset-bottom)` so Log does not sit on the home indicator.

### Reachability traps

- Previous/Next exercise controls near the top are difficult one-handed. Duplicate compact navigation near the active card or allow an optional card swipe.
- Weight, reps, and Log should occupy the lower 55–60% of the screen.
- Do not place `±15s` beside a top rest timer. Put adjustments in the bottom rest action row.

### Keypad traps

- The iOS visual viewport shrinks when the keyboard appears; a centered active card can be pushed beneath the notch.
- Use the existing L2 numeric sheet rather than the native keyboard where possible.
- When the keypad opens, pin an editor header with exercise, set number, field label, current value, and unit.
- Do not auto-advance from weight to reps if the user opened an existing logged set merely to inspect it.

### Gesture trap

A right-edge or left-edge exercise swipe can conflict with iOS back navigation. Ignore gesture starts inside the outer edge exclusion zone and retain explicit controls.

---

## B. Sheet Stack

### Safe-area traps

- The collapsed detent must sit above the home indicator and preserve a full 44px grab/primary action zone.
- A full-height sheet still needs top inset; it must not place Close under the notch.
- The sheet backdrop cannot obscure the global draft/save state entirely.

### Reachability traps

- The most common sheet detent should place weight, reps, and Log within the bottom thumb arc.
- Do not force users to drag to a larger detent before every set.
- Place the sheet handle above, not between, critical controls to prevent accidental drags.

### Keypad overlap traps

- A keypad inside a sheet plus another sheet for notes or Coach creates nested modal chaos.
- Use one sheet host whose content transitions between editor, keypad, Rolodex, and Coach.
- Recalculate detents from `visualViewport.height`, not only `100vh`.
- Preserve the active field above the keypad without scrolling the whole page behind the sheet.

### Dismissal trap

A downward swipe must not silently discard dirty values. If the draft is valid, preserve it in the engine; if invalid, collapse to a compact error state rather than losing it.

---

## C. Ladder Dense Pro

### Safe-area traps

- A pinned table header plus notch-safe app header can consume too much of the 812px height.
- Combine plan context and session stats into one compact top bar.
- The final visible row must clear both the pinned Log action and home indicator.

### Reachability traps

- Inline Log controls on upper rows are outside the thumb zone.
- Selecting a row should mirror its primary action into a pinned bottom bar.
- Never require tapping a tiny cell checkbox. The Log target should be at least 44×44px even if the visual glyph is smaller.

### Keypad overlap traps

- Native keyboards can hide the row being edited.
- Pin the active row immediately above the L2 numeric sheet, or render a compact edit clone in the sheet header.
- Maintain column labels while editing; “225” without a visible `Weight · lb` label is error-prone.
- On close, return scroll to the original row without a jump.

### Width trap

At 320–375px, all of these will not fit as equal columns:

> Set | Previous | Target | Weight | Reps | RPE | Log

The default row should show only:

> Set | Weight | Reps | Log

Previous/target should become a secondary line or ghost text; RPE and other metadata open through row expansion. **No horizontal scrolling.**

---

# 6. Missing 11th direction

## **Circuit Relay**

**Signature:** *The runner groups supersets and circuits into rounds, with a persistent “NEXT STATION” handoff showing the next exercise, equipment, and transition countdown.*

This is the most important missing direction because the current ten are primarily visual treatments of a linear exercise list. Real training is often not linear:

- A1/A2 supersets.
- Three-station circuits.
- Timed work/rest blocks.
- Unilateral left/right alternation.
- Equipment-change transitions.
- “Complete all exercises, then repeat round” structures.

### Mobile shape

- NOW card: current station and set.
- Bottom action: `Log & Next Station`.
- Peek card: next exercise, equipment, and target.
- Compact round indicator: `ROUND 2 / 4`.
- Transition timer distinct from recovery rest.
- Ability to skip a busy station and return without breaking the round.

### Engine implication

This direction exposes a major contract gap: `exercises[]` cannot remain a flat sequence. Add first-class blocks, rounds, station order, and transition timers before implementing Circuit Relay—or every skin will invent incompatible superset logic.

---

# Final recommendation

Build in this order:

1. **Engine contract hardening and shared primitives**
2. **Focus Flow** as the default and quality benchmark
3. **Sheet Stack**
4. **Ladder Dense Pro**
5. Conformance harness and mid-session Lens swapping
6. Remaining skins, beginning with Set Queue and Glance Deck
7. World Glass and Orbit Runner last, under strict performance budgets

Do not build ten skins in parallel. If Focus Flow, Sheet Stack, and Dense Pro cannot all pass the same save-failure, dirty-input, rest-backgrounding, VoiceOver, and mid-session-swap scenarios, the architecture is not ready for skins four through ten.
