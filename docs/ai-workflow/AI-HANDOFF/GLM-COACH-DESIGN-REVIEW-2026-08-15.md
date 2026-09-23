# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/GLM-COACH-DESIGN-SOURCE-2026-08-15.md
**Tokens:** 35249 in / 34451 out (reasoning: 21570) | total 69700
**Wall:** 606.0s

---

# SWANSTUDIOS PACKET B — HOSTILE VISUAL-DESIGN REVIEW
**Reviewer:** GLM-5.3 · **Date:** 2026-08-15 · **Sources:** `origin/main`, verbatim styled-components per Packet B
**Verdict up front:** Six surfaces, three unrelated bubble languages, three token syntaxes, one WCAG failure sitting on the owner's named priority surface, and a brand typeface that never ships. This is not a design system yet. Details below, worst-first, all citations verifiable in the provided source.

---

## P1. Per-surface hostile critique

### P1.5 — CLIENT ↔ TRAINER/TEAM CHAT (Sean's named target — worst surface in the packet)

Files: `frontend/src/components/Social/Messaging/MessagingStyles.ts`, `MessageThread.styles.ts`, `ConversationListPanel.styles.ts`, `GroupMessageBubble.styles.ts`

**S5-1. Your own messages fail WCAG, and they're the majority of the screen.** `MessagingStyles.ts → MessageBubble`: mine = `background: var(--accent-secondary, #8B5CF6)`, carrying `MessageText` at `color: var(--text-primary, #E0ECF4)` — Frost White `#E0ECF4` on Wing Purple `#8B5CF6` computes to **≈3.5:1**, below the 4.5:1 floor for 13px (`0.8125rem`) body text. `MessageTime` makes it worse: `rgba(224, 236, 244, 0.95)` at `0.6rem` (9.6px) on the same purple ≈ 3.3:1. `PendingBubble` then applies `opacity: 0.5` to the entire bubble, collapsing contrast toward ~2:1 on the exact message the user just typed. Replacement: deepen the fill to `color-mix(in srgb, var(--accent-secondary, #8B5CF6) 72%, var(--bg-base, #0A0A0F))` (≈5.6:1 with `#E0ECF4`), keep Frost White text at full alpha, and replace bubble-level `opacity` with a `1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent)` border + 60%-alpha timestamp for the pending state.

**S5-2. Twenty bare color literals — the worst token discipline in the codebase — including a second, secret palette.** `MessagingStyles.ts` contains 10 hardcoded hex + 10 hardcoded rgba outside any `var(--token, fallback)`: `OnlineDot`/`OnlineBadge` use `#4ECDC4` and `#4A5568`; `ConnectionStatus`/`StatusDot` and `ErrorBanner` use `#D4A574` (×6 occurrences across background mixes, border, text, and hover); glows at `rgba(78, 205, 196, 0.5)`, `rgba(212, 165, 116, 0.4)`, `rgba(139, 92, 246, 0.4)`, `rgba(96, 192, 240, 0.4/0.15/0.12)`; `ModalOverlay` ships a bare `rgba(0, 0, 0, 0.6)`. None of `#4ECDC4`, `#4A5568`, `#D4A574` exist in the SwanStudios palette — this is framework-default teal/slate/tan smuggled into the flagship surface. Replacement: online presence = `var(--accent-primary, #60C0F0)` with `color-mix` glow; offline = `color-mix(in srgb, var(--text-primary, #E0ECF4) 25%, transparent)`; disconnected/error = `var(--danger-text, #C92A54)` per the Coach files' own convention; all glows via `color-mix(in srgb, var(--accent-primary, #60C0F0) N%, transparent)`.

**S5-3. The Dual-Button Glow law is violated on both purple surfaces in this chat.** `SendButton`: purple bg (`var(--accent-secondary, #8B5CF6)`) with hover `box-shadow: 0 0 16px rgba(139, 92, 246, 0.4)` — purple glowing purple. `GroupMessageBubble.styles.ts → GroupBubbleCard` mine: purple gradient with `box-shadow: 0 14px 30px color-mix(... var(--accent-secondary, #8B5CF6) 18%, transparent)` — same offense. Purple bg must throw a cyan glow. Replacement: `box-shadow: 0 10px 28px color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)` on both.

**S5-4. Two avatar geometries in one chat.** `MessagingStyles.ts → Avatar`: 44×44, `border-radius: 50%`. `GroupMessageBubble.styles.ts → GroupMessageAvatar`: 38×38, `border-radius: 14px`. The moment a user opens a group thread, every identity chip changes shape and size. Replacement: one avatar primitive, circle, `$size` prop of 44 (list/thread) and 32 (in-bubble, group only), ring color from the existing `roleTone()` helper.

**S5-5. The 1:1 bubble is the cheapest component in the product while its group sibling is the richest — in the same feature.** `MessageBubble` is a flat fill (`#8B5CF6` / `#1A1A24`), zero shadow, zero gradient, radius 14px. Forty lines away, `GroupBubbleCard` has a 135° gradient, a 42%/18% color-mix border, a 30px colored shadow, and a 6px tail corner. Users will experience two different products inside one inbox. Replacement: promote `GroupBubbleCard`'s recipe to the single bubble primitive for both (spec in P3).

**S5-6. Zero `prefers-reduced-motion` in the entire chat feature.** `MessagingStyles.ts` defines five keyframes — `shimmer`, `fadeIn`, `slideUp`, `typingDot`, `bannerSlideDown` — and guards none. `ConversationItem` runs `animation: ${fadeIn} 0.3s ease` on every list row; `SkeletonLine` shimmers at `1.5s infinite`. Coach files honor the media query (`TypingWrap`, `ThinkingWrap`, all of `VoiceRecordingOverlay.styles.ts`); the chat is the unguarded surface. Replacement: wrap all five keyframe consumers in `@media (prefers-reduced-motion: reduce) { animation: none; }` or a shared `reducedMotionSafe` helper — Logger already has one (`WorkoutLoggerCS` exports it; import the pattern).

**S5-7. Selection causes a 1px layout jump in the conversation list.** `ConversationItem`: base `border: none`; `$active` adds `border: 1px solid color-mix(...)`. Border appears/disappears on a box with no permanent border reservation, so every selection twitch-shifts the row content by 1px. Replacement: base `border: 1px solid transparent`, and express selection with the 3px Ice Wing left rail (matching `CoachMessageStyles.ts → MessageBubbleAI`'s `border-left: 3px solid var(--ice-wing)`), not a full outline.

**S5-8. The unread badge misuses a background token and undersells the inbox's most urgent signal.** `UnreadBadge`: `background: var(--bg-primary, #002060)` — Midnight Sapphire bound to a token named "bg", i.e., a button color serving as badge fill via a surface token name — at 20px height with `0.625rem` (10px) digits. The single number that pulls a trainer back into the app is the smallest text on the screen. Replacement: `background: var(--accent-primary, #60C0F0)`, `color: var(--bg-base, #0A0A0F)` (≈9.7:1), `min-width: 22px; height: 22px; font-size: 0.75rem`, glow `0 0 10px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent)`.

**S5-9. Mobile height math collides with itself.** `MessagingContainer`: `@media (max-width: 768px) { height: calc(100dvh - 210px); min-height: 520px; }`. On a 375×667 iPhone SE the computed height is 457px, so `min-height: 520px` wins and the container overflows its allotted region by ~63px — the page scrolls around the chat and the composer drifts below the fold. The magic `210px` is also untraceable. Replacement: define `--messaging-chrome-offset` on the page shell, use `height: calc(100dvh - var(--messaging-chrome-offset, 210px))` with **no** mobile `min-height`, and add `padding-bottom: max(0.75rem, env(safe-area-inset-bottom))` to `ComposeBar`.

**S5-10. The filter row cannot physically fit its labels.** `ConversationListPanel.styles.ts → FilterRow`: `repeat(5, minmax(0, 1fr))` inside `InboxTools` (`padding: 0.75rem`) inside `ConversationPanel` (`width: 320px`). Per column: (320 − 24 − 4×0.35rem gaps) / 5 ≈ 54px. "Trainers" at `0.68rem` Sora needs ~60px — it clips or wraps ugly. Replacement: two rows of `repeat(auto-fit, minmax(88px, 1fr))`, or a horizontally scrollable single row with `overflow-x: auto` and the shared thin-scrollbar treatment.

**S5-11. Chrome outranks content in the conversation panel.** `InboxTools` stacks `MetricRow` (44px) + `SearchBox` (44px) + `FilterRow` (44px) plus gaps/padding ≈ 160px of tooling above the list, inside a container whose minimum is `clamp(560px, ...)`. Nearly 30% of the inbox is instrumentation before the first human name appears. Replacement: collapse `MetricRow` into a single inline `MetricPill` row shown only when a value is non-zero, and move filters behind a disclosure toggle defaulting to "All".

**S5-12. Dead declaration and brittle geometry in the modal search.** `SearchInput`: `width: 100%;` then, four lines later, `width: calc(100% - 2.5rem);` with `margin: 0.75rem 1.25rem` — the first `width` is dead code and the calc duplicates the margin arithmetic by hand. Replacement: drop the first `width`, set `align-self: stretch; margin: 0 1.25rem 0.75rem;` and let flex do it.

**S5-13. Timestamp architecture is noise.** `MessageTime` is `display: block; margin-top: 4px` inside every `MessageBubble`, so a 9.6px Fira line rides under every single message forever. Replacement: render time only under the **last** bubble of a sender group, outside the bubble, `0.625rem` Fira Code at `rgba(224, 236, 244, 0.6)`, aligned to the sender's side. Also raise `TimeStamp` (list) and `MessageTime` floors from `0.625rem`/`0.6rem` to `0.6875rem` minimum.

**S5-14. The error banner is a clickable `<div>` in the wrong color.** `ErrorBanner`: `cursor: pointer` on `styled.div` — no focus, no keyboard path, no 44px guarantee — and it's tinted `#D4A574` while every other surface codes errors as `var(--danger-text, #C92A54)` (see `CoachMessage.styles.ts → ErrorCardTitle`). Replacement: render as a `<button>`, `min-height: 44px`, `background: color-mix(in srgb, var(--danger-text, #C92A54) 14%, var(--bg-surface, #1A1A24))`, `color: var(--danger-soft-text, #ff8fa3)`, `border-left: 3px solid var(--danger-text, #C92A54)`.

**S5-15. Three different bubble max-widths for the same concept.** `MessageBubble` 75%, `GroupMessageContent` `min(74%, 560px)`, `MessageThread.styles.ts → LoadingMessageRow` 60%. Skeletons visibly narrower than the messages they placeholder. Replacement: one `--sw-bubble-max: min(76%, 560px)` everywhere.

---

### P1.1 — SWAN COACH message/chat styling

Files: `frontend/src/components/DashBoard/Pages/coach-assistant/styles/CoachMessageStyles.ts`, `CoachMessage.styles.ts`, `VoiceRecordingOverlay.styles.ts`

**C1-1. Arctic Cyan is used in a button.** `CoachMessage.styles.ts → TranscriptBtn` `$primary`: `background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-data, #50A0F0))`. Palette law: `#50A0F0` is charts-only, never buttons/glow. This is the clearest palette-law breach in the packet. Replacement: `linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))` with a cyan hover glow per the dual-glow rule — or a solid sapphire button with purple glow.

**C1-2. Timestamps are functionally invisible.** `CoachMessageStyles.ts → MessageTime`: `color: var(--text-muted, rgba(224, 236, 244, 0.35))` — 35%-alpha Frost White over the Royal Depth glass (`rgba(var(--royal-depth-rgb, 0, 48, 128), 0.5)`) computes to **≈2.5:1** at 13px→11px. Fails 4.5:1 with both values on record (`rgba(224,236,244,0.35)` over `#003080`-at-50%-on-dark). Replacement: `rgba(224, 236, 244, 0.6)` minimum (≈5:1), `0.6875rem` floor.

**C1-3. Type inverts as screens grow.** `MessageBubbleAI`: base `font-size: 16px`, then `@media (min-width: 1200px) { font-size: 15px; }`. Larger displays get smaller body text; `MessageActionBtn` repeats the pattern (14px → 13px @768 → 12px @1200). Replacement: 15px base, 16px at ≥1200, delete the shrink queries; keep the 2560/3840 steps.

**C1-4. White-based borders in a cyan-border system.** `TranscriptBtn` non-primary: `border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.15))` and `background: var(--surface-subtle, rgba(255, 255, 255, 0.04))` — the only white-overlay surfaces in the packet; every other border is `rgba(96, 192, 240, …)`. Replacement: `color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)` border, `color-mix(... 5%, transparent)` fill.

**C1-5. Status whisper-text in the voice overlay.** `VoiceRecordingOverlay.styles.ts → StatusText`: `color: rgba(224, 236, 244, 0.4)` at 14px on the `color-mix(... var(--bg-base, #030712) 92%, transparent)` scrim ≈ **2.9:1**. The instruction text during dictation — the text the user must read — fails contrast. Replacement: `rgba(224, 236, 244, 0.75)`.

**C1-6. A stray `--primary` token and an alien bg fallback.** `ReceiptActionButton`: `color-mix(in srgb, var(--primary, #002060) 82%, transparent)` — `--primary` appears exactly once in the packet alongside `--accent-primary` and `--bg-primary`; three names for overlapping meanings. And `Overlay`'s `var(--bg-base, #030712)` fallback is not Obsidian `#0A0A0F`. Replacement: `var(--bg-primary, #002060)`; `#0A0A0F` fallback.

**C1-7. `TranscriptBtn` has no focus-visible and no hover.** It defines `:disabled` only — a 44px control with transitions (`transition: all 0.15s`) transitioning to nothing. Replacement: add the standard `outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px` and a 12% color-mix hover.

**C1-8. Third token syntax multiplies maintenance.** `MessagesArea`: `rgba(var(--midnight-sapphire-rgb, 0, 32, 96), 0.15)`; `MessageBubbleAI`: `rgba(var(--ice-wing-rgb, 96, 192, 240), 0.12)` and `var(--ice-wing, rgb(96, 192, 240))` — the rgb-triplet pattern coexists with `var(--token, #hex)`, and the same Ice Wing is written two ways (`#60C0F0` vs `rgb(96, 192, 240)`). Replacement: standardize on `color-mix(in srgb, var(--token, #fallback) N%, transparent)`.

---

### P1.2 — WORKOUT LOGGER

Files: `frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.styles.ts`, `frontend/src/components/WorkoutLogger/ExerciseCardComponent.styles.ts`, `ExerciseSetRow.styles.ts`

**L2-1. The Logger lives entirely outside the token law.** `ExerciseCardComponent.styles.ts` opens with `import { CS, reducedMotionSafe, withAlpha } from './WorkoutLoggerCS'` and `ExerciseSetRow.styles.ts` adds `import { TRAIN } from '../../styles/train-tokens'`. Every color is a compile-time JS constant — `${CS.glow}`, `${CS.gaming}`, `withAlpha(CS.cardDark, 0.7)` — meaning zero `var(--token, #fallback)` compliance is even *possible* in these files, and runtime theming/lens recipes can't reach them except through the two `--world-*-radius` seams. This is the single largest token-discipline violation in the packet by construction. Replacement: map CS/TRAIN to CSS custom properties in one generated `:root` block, keep JS names as aliases.

**L2-2. Page-level purple wash on a trainer tool.** `EnhancedWorkoutLogger.styles.ts → WorkoutContainer`: `background: linear-gradient(135deg, rgba(var(--obsidian-black-rgb, 10, 10, 15), 0.95) 0%, rgba(var(--wing-purple-rgb, 139, 92, 246), 0.1) 50%, rgba(var(--wing-purple-rgb, 139, 92, 246), 0.05) 100%)` plus `min-height: 100vh`. A full-viewport purple gradient claim inside a dashboard shell — Wing Purple is a *glow accent*, not a page tint, and 100vh inside an app chrome guarantees inner scroll fighting outer scroll. Replacement: page background belongs to the shell (`var(--bg-base, #0A0A0F)`); reserve purple for the `focus-within` glow already well-expressed in `SetRow`.

**L2-3. Warning color is a framework default.** `ErrorContainer .error-icon { color: var(--warning, #f59e0b) }` — that's Tailwind amber-500, while Coach uses `var(--warning-text, #F5D678)` and Planner routes warnings to `PLANNER_GOLD`. Three warning hues across three surfaces. Replacement: one `--warning-text` (`#F5D678`) everywhere; retire `--warning`/`#f59e0b`.

**L2-4. The 10-column grid is defined twice, by hand, and must never diverge.** `ExerciseSetRow.styles.ts` → `TableHeader` and `SetRow` both carry the identical `grid-template-columns: 50px minmax(80px, 0.8fr) minmax(64px, 0.6fr) minmax(110px, 1fr) minmax(120px, 1.1fr) minmax(224px, 1.7fr) minmax(110px, 1fr) minmax(140px, 1.4fr) 48px 44px`. One edit to either silently breaks header/row alignment. Replacement: `const SET_GRID = css\`grid-template-columns: …\`` exported once, interpolated into both — same for the mobile `32px minmax(0,1fr) minmax(0,1fr) 48px` pair.

**L2-5. Cross-file radius fallback war.** `CardContainer`: `border-radius: var(--world-panel-radius, 1.5rem)` (24px) vs `BootcampBuilderStyles.ts → Panel`: `var(--world-panel-radius, 12px)`. `SetsTable`: `var(--world-row-radius, 1rem)` vs Bootcamp `StationCard`: `var(--world-row-radius, 8px)`. Same tokens, contradictory fallbacks — whatever the runtime value, half the app is wrong when the token is unset. Replacement: fallbacks must equal the canonical scale (16px panels, 12px rows) from a single constants file.

**L2-6. `SetCell` styles its grandchildren by structural position.** `& > input, & > div { flex: 1; min-width: 0; }` and `${SetRow}[data-details='closed'] &:not([data-essential]) { display: none; }` — child-component DOM is load-bearing CSS. Any refactor of the row's internals breaks the layout silently. Replacement: explicit `$role` transient props on `SetCell`, no bare child selectors.

---

### P1.3 — WORKOUT PLANNER

Files: `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerShell.styles.ts`, `WorkoutPlannerPage.styles.ts`, `WorkoutPlannerRolodexCard.styles.ts`

**P3-1. The status banner's state ternary returns the same value twice.** `WorkoutPlannerShell.styles.ts → StatusBanner`: `background: ${({ $type }) => $type === 'error' ? 'rgba(26, 26, 36, 0.95)' : 'rgba(26, 26, 36, 0.95)'}` — identical strings in both branches. Success and error are visually distinguished *only* by a 4px left border (`var(--danger, #C92A54)` vs `PLANNER_GOLD`). This is dead logic impersonating state design, on a hardcoded `rgba(26,26,36,0.95)` (Graphite, hardcoded, ×3 including `DegradedBanner`). Replacement: `background: color-mix(in srgb, ${tone} 10%, var(--bg-elevated, #141419))` where tone is danger/gold per `$type`, token-bound.

**P3-2. Same token, two fallbacks, in the same file.** `Select`: `background: var(--bg-surface, #003080)`. `ActionBtn`: `background: var(--bg-surface, #002060)`. Royal Depth and Midnight Sapphire both posing as `--bg-surface` — while `MessagingStyles.ts → ConversationPanel` uses `var(--bg-surface, #1A1A24)`. Three "surfaces," two of them button blues. Replacement: `--bg-surface` is Graphite `#1A1A24`, full stop; buttons take `var(--bg-primary, #002060)` / `var(--bg-elevated, #003080)` by role.

**P3-3. Gold is sprayed across the Planner like a default accent.** `DegradedBanner` (full `border: 1px solid ${PLANNER_GOLD}` + gold `svg` + gold `strong`), `DegradedPanel` (`border: 1px solid ${PLANNER_GOLD}`), `PlannerHandoffLink` `$primary` (gold text, gold border, gold-tinted bg), `MetaTag` "Medium Impact" (gold text + gold bg + gold border). Four simultaneous gold deployments in one scene against a law of one badge / 1px filigree / focus ring. Replacement: degraded states keep a single `border-left: 3px` gold marker with neutral fill; handoff primary becomes sapphire + purple glow; impact tiers recolor to cyan/danger and a neutral.

**P3-4. 8.8px text, three DOM levels deep.** `WorkoutPlannerRolodexCard.styles.ts → PlannerMediaThumb`: `> div [role='img'] > div:last-of-type { font-size: 0.55rem; ... }` — 8.8px body text, styled via selectors reaching into another component's internals (`> div [role='img']`), with a sibling at `0.64rem`. Replacement: nothing below `0.6875rem` anywhere; move thumbnail typography into the thumb component's own styles.

**P3-5. Animating `grid-template-columns` is a per-frame layout thrash.** `ThreePanel`: `transition: grid-template-columns 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)` on teach-mode toggle — every frame reflows and repaints three panels of virtualized content. Not GPU-safe. Replacement: transition an overlay `transform: translateX()` for the teach panel, or accept a 120ms opacity crossfade.

**P3-6. Mobile turns into three nested scroll cages.** `PanelBody`: `@media (max-width: 430px) { max-height: 320px; flex: none; }` — three panels each capped at 320px with internal `overflow-y: auto`, stacked, inside `Page` scrolling. The user swims through four scroll contexts. Replacement: on mobile let panels grow naturally (`max-height: none`), virtualization already handles length; keep one page scroll.

**P3-7. Param labels fail contrast at 9.6px.** `WorkoutPlannerPage.styles.ts → ParamLabel`: `font-size: 0.6rem; color: rgba(224, 236, 244, 0.4)` ≈ **2.8:1**. Same for `ResultsCount` at `rgba(224, 236, 244, 0.5)`. Replacement: `0.6875rem` + `rgba(224, 236, 244, 0.65)`.

**P3-8. Selection styled as `outline` conflates chosen with focused.** `ActiveScheduleDay`/`ClickableMesocycleCard` use `outline: 2px solid var(--accent-secondary, #8B5CF6)` for `$active`/`$selected` — the property screen readers and keyboard users interpret as focus. Replacement: selection = `border-left: 3px` rail + tinted fill; reserve `outline` for `:focus-visible`.

---

### P1.4 — BOOTCAMP CREATOR

Files: `frontend/src/components/BootcampBuilder/BootcampBuilderStyles.ts`, `BootcampBuilderChrome.styles.ts`, `BootcampCommandDeck.styles.ts`

**B4-1. The primary CTA has no hover, no focus ring, and a dead gradient.** `BootcampBuilderStyles.ts → PrimaryButton`: blue→purple gradient, `&:disabled { opacity: 0.5; }` and nothing else — no `:hover`, no `:focus-visible`, no glow, on the screen's main action. It also has no dual-glow pairing at all. Replacement: add `&:hover { box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent); }` (blue-purple gradient → cyan glow) and the standard `focus-visible` outline.

**B4-2. `outline: none` with no replacement on inputs.** `Select` and `Input`: `&:focus { border-color: var(--accent-primary, #60c0f0); outline: none; }` — keyboard focus is a 1px border-color shift on a 30%-alpha border. Same on `FloorModeToggle` (no focus style at all). Replacement: `box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent)` on focus, `outline` restored on `:focus-visible`.

**B4-3. "Success" is cyan here, green in Coach.** `ExerciseRow` `$isCardio`: `color: var(--success, #60C0F0)`; `DifficultyChip` easy: `var(--success, #60C0F0)`; `InsightCard` freshness: `var(--success, #60C0F0)` — versus `CoachMessage.styles.ts → SuccessCardValue` `var(--success-text, #10B981)`. Ice Wing is the glow/accent, not a status hue; two "success" colors across surfaces trains users to distrust both. Replacement: `var(--success-text, #10B981)` for status; cardio styling switches to italic + Fira rather than a hue swap.

**B4-4. Warning tone is Wing Purple.** `BootcampCommandDeck.styles.ts → toneStyles.warning`: `--command-tone: var(--accent-secondary, #8B5CF6)` — purple reads as "warning" here, as "readable meta" in `MetricPill strong`, and as "my message" in chat. A color cannot mean three things. Replacement: warning tone = `var(--warning-text, #F5D678)` (gold is already the `ready` tone; keep them distinct: ready=gold, steady=cyan, warning=amber, danger=`#C92A54`).

**B4-5. Uppercase microtype with tracking explicitly zeroed.** `CommandDeckKicker`, `MetricLabel`, `RepairQueueTitle` (all `text-transform: uppercase` with `letter-spacing: 0`), and `GroupMessageBubble.styles.ts → GroupRoleBadge` (`letter-spacing: 0` at `0.6rem` uppercase Fira). All-caps 11px with zero tracking is anti-legibility. Replacement: `letter-spacing: 0.08em` on all uppercase labels below 14px.

**B4-6. Panel fills are alpha-transparent over nothing.** `Panel`: `background: var(--bg-elevated, rgba(20, 20, 25, 0.6))` and `StationCard`: `var(--bg-surface, rgba(20, 20, 25, 0.7))` — translucent fallbacks on a page that is itself flat `#0A0A0F`, and token fallbacks that contradict the same tokens' hex fallbacks elsewhere (`--bg-elevated, #141419` in three other files). Also `PageWrapper` ships `color: var(--text-primary, #F8F9FA)` in floor mode — `#F8F9FA` is not Frost White `#E0ECF4`. Replacement: opaque Carbon/Graphite fallbacks; one Frost White.

**B4-7. Spacing and radius speak px-and-shrugs.** `ThreePane` gap 16→12→8px, `Panel` radius 12→8px at 430px, `StationCard` 8px, chips 4px, while Chat/Planner use rem and 10–16px radii. Same product, two unit systems, five radii in one file. Replacement: 4/8/12/16 radius scale, rem-based 4px base grid (P2).

---

## P2. Cross-cutting defects

**X1. Token fallback drift — the same tokens resolve to different colors depending on file.** Recorded verbatim:

| Token | Fallback A | Fallback B | Fallback C |
|---|---|---|---|
| `--bg-base` | `#0A0A0F` (MessagingStyles) | `#030712` (PlannerShell `Page`, VoiceOverlay) | — |
| `--bg-surface` | `#1A1A24` (MessagingStyles) | `#003080` (PlannerShell `Select`) | `#002060` (PlannerShell `ActionBtn`) |
| `--bg-elevated` | `#141419` (Messaging/Planner/CommandDeck) | `rgba(20,20,25,0.6)` (Bootcamp `Panel`) | — |
| `--world-panel-radius` | `1.5rem` (Logger `CardContainer`) | `12px` (Bootcamp `Panel`) | — |
| `--world-row-radius` | `1rem` (Logger `SetsTable`) | `8px` (Bootcamp `StationCard`) | — |
| `--text-primary` | `#E0ECF4` | `#F8F9FA` (Bootcamp floor mode) | `#e2e8f0` (Coach `TranscriptBtn`) |
| `--text-secondary` | `rgba(224,236,244,0.6/0.7)` | `#94a3b8` (Planner `StatusBanner` button) | — |
| `--warning` family | `#F5D678` (Coach) | `#f59e0b` (Logger) | `PLANNER_GOLD` (Planner) |
| `--success` family | `#10B981` (Coach) | `#60C0F0` (Bootcamp ×3) | — |

`#94a3b8`, `#e2e8f0`, `#f59e0b`, `#F8F9FA`, `#4A5568`, `#4ECDC4`, `#D4A574` are framework-default palette leakage, not SwanStudios colors. Until fallbacks are generated from one source, the "law" is unenforceable — every file is its own theme when a token is missing.

**X2. Three coexisting token syntaxes plus a stray name.** `var(--token, #hex)` (majority), `rgba(var(--token-rgb, r g b), a)` (Coach glass, Logger page), and JS compile-time constants (`CS`, `TRAIN`). Plus `--primary` (Coach `ReceiptActionButton`), `--accent-primary`, and `--bg-primary` all in play for overlapping meanings. One syntax, one naming scheme, or nothing is a system.

**X3. Dual-Button Glow law: 2 violations, 1 lone lawful instance.** Violations: `SendButton` (purple→purple), `GroupBubbleCard` mine (purple→purple shadow). The only correct pairing in the packet is Planner `ActionBtn` — sapphire bg + purple hover glow, cosmic gradient + cyan glow. That's the floor, not the bar; encode it once in a `SwanButton` primitive so it can't be re-broken per file.

**X4. Gold overexposure.** `RoleLine` `$group` (gold role text), Bootcamp `FloorModeToggle` (gold active border + tint + text), `DegradedBanner`/`DegradedPanel` (full gold borders + icon + strong), `PlannerHandoffLink` primary, `MetaTag` Medium Impact, CommandDeck `ready` tone + `AlertChip`. Seven scenes-deep deployments of a color whose law says one badge or one 1px filigree per scene. Gold is currently a general warm accent, which is expressly forbidden.

**X5. Three bubble systems for "conversation."** Coach glass with 3px rails (`MessageBubbleAI`/`MessageBubbleUser`), DM flat fills (`MessageBubble`), group gradient cards (`GroupBubbleCard`). Three max-widths (92%/85%, 75%, 74%/560px), three tail-corner treatments (4px/4px/6px), two typing indicators (Coach `bounce` 8px dots vs Messaging `typingDot` 6px dots). Users cross all three inside one session.

**X6. Shadow language is split-brained.** Layered depth exists in `CardContainer` (`0 8px 32px` + `0 0 40px` glow, hover `0 16px 48px`), `GroupBubbleCard` (`0 14px 30px`), `CommandDeckShell` (`0 18px 44px` + inset highlight). Completely absent: `MessagingContainer`, Planner `Panel`, Bootcamp `Panel`, every messaging surface. Half the app floats; half is pasted on.

**X7. Radius chaos.** Observed values: 4 (bubble tails, `MetaTag`), 6 (Bootcamp inputs), 7 (`SkeletonLine`), 8 (buttons, `StationCard`), 10 (list items), 12 (container, Planner `Panel`, Bootcamp `Panel`), 14 (`MessageBubble`), 16 (`GroupBubbleCard`, modal), 22 (composer pill), 24 (`CardContainer` 1.5rem). Ten radii, no scale.

**X8. Breakpoint zoo.** Media queries at 360, 375, 430, 520, 640, 760, 768, 1024, 1180, 1200, 1279, 2200, 2560, 3840 — fourteen breakpoints across six surfaces, several bespoke to one component (`520px` exists only for `MessageBubbleAI`; `1180px` only for the set grid). Collapse to ≤7 canonical steps plus a documented large-format tier.

**X9. Microtype below 10px.** `0.55rem` (8.8px, Planner thumb), `0.6rem` (9.6px, `MessageTime`, `GroupMessageMeta`, `ConnectionStatus`, `ParamLabel`), `0.625rem` (10px, `TimeStamp`, `UnreadBadge`, `HeaderKicker`, `SupersetBadge`), `0.62rem`, `0.65rem`, `0.68rem` — six sub-11px sizes, several failing contrast (S5-1, C1-2, P3-7). Floor: `0.6875rem`.

**X10. `prefers-reduced-motion` coverage is arbitrary.** Honored: Coach typing/thinking, all of `VoiceRecordingOverlay`, `CommandMeterFill`, Logger via `reducedMotionSafe`. Ignored: every keyframe in `MessagingStyles.ts` (five of them, including infinite shimmer and per-row list entrance) and Planner's `iceShimmer` consumers. Either it's a law or it's decoration.

**X11. Cormorant Garamond Italic — the brand's drama face — appears zero times** in any of the provided sources. The type system (PJS/Sora/Fira) is running at three-quarters capacity; every surface reads as engineering UI with no editorial voice.

**X12. Duplicated primitives that already disagree with themselves.** Two composers (`MessageInput`/`MessageTextArea`), two presence dots + one status dot (`OnlineDot`/`OnlineBadge`/`StatusDot`), two typing indicators, three avatar shapes, ≥8 chip/badge components (`UnreadBadge`, `MetricPill`, `DifficultyChip`, `TimingBadge`, `ModChip`, `MetaTag`, `GroupRoleBadge`, `ConfidenceBadge`, `PainFlagBadge`, `SupersetBadge`, `AlertChip`, `RepairQueueItem`), four skeleton systems (`SkeletonLine`, `SkeletonStack`, `SkeletonConversationRow`, `GeneratingSkeletonRow`), three banner systems (`ErrorBanner` ×2 files, `StatusBanner`, `DegradedBanner`, `TranscriptError`), ≥8 icon-buttons-at-44px. See P4.

---

## P3. The beautification plan for the client ↔ trainer chat

This is Sean's named priority, so here is the full restyle, not a patch list.

### 3.1 Design thesis — "Dark water, lit edges"
The thread is dark water: Obsidian `#0A0A0F` depth with a single cold light source. Identity comes from **edges, not fills** — Ice Wing rails and glows on what the trainer sends and on what's alive; Wing Purple glass with a **cyan** halo (dual-glow law) on what you send. Gold appears exactly once in the whole surface: a 1px filigree under the thread header (lawful use: filigree line). Everything else is graphite, cyan, and Frost White. No teal, no tan, no slate — S5-2's secret palette dies here.

### 3.2 The signature visual moment — "the Wake"
Three moves, all cheap, all in `MessagingStyles.ts`:

1. **Ice-lit ceiling.** `ThreadPanel` gains `background: radial-gradient(1100px 420px at 50% -12%, color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, transparent), transparent 62%), var(--bg-base, #0A0A0F)` — the thread reads as lit-from-above water instead of a flat void. This is the atmosphere layer the checklist demands and the file currently has none of.
2. **Arrival glow.** The latest inbound message carries a decaying edge-light: `box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent), 0 12px 32px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)` that settles to `0 10px 28px color-mix(... 10%, transparent)` over 1.2s (one keyframe, `box-shadow` only on the newest bubble, guarded by reduced-motion). A message *arriving* becomes a felt event.
3. **Swan-spark typing.** Delete `typingDot` (6px circles). Import and reuse the Coach's `ThinkingDiamond` recipe from `coach-assistant/styles/CoachAnimations` — three 10px clip-path diamonds with the staggered `diamondShimmer` (0s/0.2s/0.4s). Coach and chat now share one "Swan is thinking" language; this is the cheapest brand-unification win available anywhere in Packet B.

### 3.3 Message-bubble architecture
One primitive, `ChatBubble`, replacing `MessageBubble`, `PendingBubble`, `GroupBubbleCard`, and (phase 2) the Coach pair:

- **Shape:** `border-radius: 16px`, tail corner `6px` (adopt `GroupBubbleCard`'s geometry — kill the 14px/4px pair).
- **Mine:** `background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 68%, var(--bg-base, #0A0A0F)))` — the dark end guarantees the ≥4.5:1 floor for `#E0ECF4` text that the current flat `#8B5CF6` (3.5:1) fails. Border `1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent)`. Shadow — the law — `0 10px 28px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)` (purple fill, cyan glow).
- **Theirs:** `GroupBubbleCard`'s their-recipe: `linear-gradient(135deg, color-mix(in srgb, var(--bg-surface, #1A1A24) 90%, var(--accent-primary, #60C0F0)), var(--bg-surface, #1A1A24))`, border `1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)`, shadow `0 12px 28px color-mix(in srgb, var(--bg-base, #0A0A0F) 45%, transparent)`, plus a `3px` Ice Wing left rail on the **first** bubble of a group only — matching Coach's `MessageBubbleAI` rail so trainer-voice reads identically everywhere.
- **Pending:** same fill, `border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent)`, 60%-alpha meta — never `opacity` on the whole bubble.
- **Max width:** `min(76%, 560px)` — one value for messages, groups, and `LoadingMessageRow`.
- **Meta:** timestamp/receipts move **out** of the bubble (kills the per-bubble `MessageTime` block). Under the last bubble of a group: Fira Code `0.6875rem`, `rgba(224, 236, 244, 0.65)`, aligned to sender side; `ReadReceiptWrap` keeps `var(--accent-primary, #60C0F0)` for read.
- **Group speaker line:** keep `GroupSpeakerName`/`GroupRoleBadge` above first-of-group bubbles; raise badge type to `0.6875rem` with `letter-spacing: 0.08em`.

### 3.4 List & thread hierarchy
- **Thread header outranks everything:** `ThreadUserName` goes `1.125rem`/700 PJS (currently `1rem` — smaller than the *list panel's* `ConversationTitle` at `1.125rem`, a straight hierarchy inversion), `ThreadUserRole` stays `0.7rem` Fira. Beneath it, the one gold moment: `border-bottom: 1px solid transparent; background-image: linear-gradient(90deg, color-mix(in srgb, var(--accent-gold, #C6A84B) 55%, transparent), transparent 70%)` — a 1px filigree fade.
- **Conversation rows:** base `border: 1px solid transparent` (kills the 1px selection jump), active state = `border-left: 3px solid var(--accent-primary, #60C0F0)` + `color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)` fill — the rail language shared with Coach and Logger's `TRAIN.active`. Delete `animation: ${fadeIn}` from `ConversationItem`.
- **Unread badge:** Ice Wing fill, Obsidian digits, 22px, per S5-8.
- **Inbox tools diet:** metrics collapse to one conditional pill; filters behind a disclosure; search stays. Target: first conversation within 96px of the panel top.
- **Presence:** one dot language — `AvatarWrap` + `OnlineBadge` recolored to `var(--accent-primary, #60C0F0)`/neutral; delete `OnlineDot` and the teal/tan literals.

### 3.5 Composer
Merge `MessageInput` + `MessageTextArea` into one autosizing `ComposerInput`: `min-height: 44px; max-height: 132px; border-radius: 16px` (join the bubble family; the 22px pill is the last iMessage hand-me-over), Fira time隐喻 aside — Sora `0.875rem`. Focus: `border-color: var(--accent-primary, #60C0F0)` **plus** `box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent)` — the current `0 0 12px rgba(96, 192, 240, 0.12)` is a 12%-alpha whisper, functionally invisible. `SendButton`: keep 44px circle, purple fill, but hover glow becomes cyan (`0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent)`) — the law. `ComposeBar` gains `padding-bottom: max(0.75rem, env(safe-area-inset-bottom))`.

### 3.6 Empty / loading / error
- **Empty:** replace the generic 80px purple circle (`EmptyIcon`) with the wake mark — the three `ThinkingDiamond` shards angled as a chevron over a `1px` Ice Wing waterline. `EmptyTitle` becomes **Cormorant Garamond Italic, 1.375rem** — the first deployment of the drama face in this codebase, spent on the surface Sean cares about. `EmptySubtext` `0.8125rem` Sora, `rgba(224, 236, 244, 0.7)`.
- **Loading:** skeleton bubbles adopt real bubble geometry (16px/6px tail, alternating alignment, `min(76%, 560px)` widths) instead of naked `SkeletonLine` bars; shimmer continues but gains the reduced-motion guard (static `color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)`).
- **Error:** per S5-14 — a real 44px button, danger tokens, `bannerSlideDown` kept but guarded.

### 3.7 Mobile (320 / 375 / 414)
- Fix the height collision: `height: calc(100dvh - var(--messaging-chrome, 210px))`, **no** `min-height` under 768px.
- Panel swap gains a 240ms `transform: translateX(±24px)` + fade, guarded by reduced-motion — currently an instant cut via `$mobileHidden`.
- `FilterRow` → scrollable single row or 2×3 grid (S5-10).
- All controls already hold 44px (`NewChatButton`, `BackButton`, `SendButton`, `MessageTextArea`) — keep it that way; the fix list is height, filters, and safe-area only.

### 3.8 Acceptance checklist for this surface
No bare hex/rgba outside `var()` fallbacks (currently 20); every text pair ≥4.5:1 with values on file; every keyframe reduced-motion-guarded; exactly one gold element; both purple fills throw cyan glows; one avatar shape; one bubble geometry; Cormorant present exactly once.

---

## P4. Shared primitives to extract

Location: `frontend/src/components/shared/` (new). Each listed with its current duplicate implementations.

1. **`ChatBubble`** — eats `MessageBubble`, `PendingBubble` (MessagingStyles.ts), `GroupBubbleCard` (GroupMessageBubble.styles.ts), later `MessageBubbleAI`/`MessageBubbleUser` (CoachMessageStyles.ts). Encodes §3.3.
2. **`SwanButton`** — Planner `ActionBtn` (the only lawful dual-glow instance) as seed; absorbs `SendButton`, `NewChatButton`, Bootcamp `PrimaryButton`, `TranscriptBtn`, `ReceiptActionButton`, `ActionBtn` (Voice). Variants: sapphire→purple glow, purple→cyan glow, ghost, danger.
3. **`IconButton44`** — `BackButton`, `CloseButton`, `RemoveExerciseBtn`, `RemoveSetButton`, `ExerciseAddBtn`, `StarButton`, `SupersetLinkButton`. One 44px geometry, one focus ring, one hover tint.
4. **`SwanAvatar`** — `Avatar` (44 circle) + `GroupMessageAvatar` (38 squircle). `$size`, `$shape`, `$ring` (from `roleTone`).
5. **`Chip`** — replaces the twelve badge/pill components enumerated in X12. Tones: accent/gold(limited)/danger/warning/neutral; `min-height: 20px`, `0.6875rem` floor, `letter-spacing: 0.08em` on uppercase.
6. **`Banner`** — `ErrorBanner` (Messaging), `ErrorBanner` (Bootcamp), `StatusBanner` + `DegradedBanner` (Planner), `TranscriptError` (Coach). Fixes the dead ternary class of bug by construction.
7. **`SwanInput` / `ComposerInput`** — `MessageInput`, `MessageTextArea`, `SearchInput` (fixing its double `width`), `InboxSearch`, Bootcamp `Input`/`Select` (restoring focus rings), Planner `MiniInput` family. One focus treatment: border + 35% ring.
8. **`Panel` / `PanelHeader`** — Planner `Panel`/`PanelHeader`, Bootcamp `Panel`/`PanelTitle`, `ConversationPanel`/`ConversationHeader`, `ThreadPanel`/`ThreadHeader`. One border, one radius (16px), one elevation token.
9. **`PresenceDot` / `StatusDot`** — `OnlineDot`, `OnlineBadge`, `StatusDot`, `ConnectionStatus`. Kills the teal/tan literals.
10. **`SwanSkeleton`** — `SkeletonLine`, `SkeletonStack`, `SkeletonConversationRow`, `GeneratingSkeletonRow`/`SkeletonDelayRow`. One shimmer, reduced-motion-guarded, geometry-aware.
11. **`EmptyState`** — `EmptyState`/`EmptyIcon`/`EmptyTitle`/`EmptySubtext`, Planner `EmptyMessage`, Logger `CenteredLoading`. Ships with the Cormorant title + diamond wake as the default.
12. **Mixins:** `swanFocus($color)`, `swanScroll($w)` (kills the 4px/6px scrollbar drift), `reducedMotionSafe` (promote Logger's helper to shared), and `SET_GRID` (ExerciseSetRow's duplicated 10-column template).

---

## P5. Ranked build order — highest visual-impact-per-effort first

1. **Chat contrast + glow + pending fix** — `MessagingStyles.ts` (`MessageBubble`, `PendingBubble`, `MessageTime`, `SendButton`) and `GroupMessageBubble.styles.ts` (`GroupBubbleCard` shadow). ~1 hour, removes a WCAG failure and two palette-law violations from the owner's priority surface. Nothing else matters until the text is legible.
2. **Purge the chat's 20 hardcoded literals** — `MessagingStyles.ts` (`OnlineDot`, `OnlineBadge`, `ConnectionStatus`, `StatusDot`, `ErrorBanner`, `ModalOverlay`, all bare rgba glows). Map to palette tokens per S5-2/S5-14. Half a day, and the surface finally speaks only Swan colors.
3. **Token fallback unification** — fix the X1 table at the source: one generated fallbacks file; correct `--bg-surface` ×3, `--bg-base` ×2, `--bg-elevated` ×2, `--world-*-radius` ×2, kill `--primary`, retire `#94a3b8`/`#e2e8f0`/`#f59e0b`/`#F8F9FA`. Touches every styles file but is mechanical.
4. **Chat thread atmosphere + signature moment** — `ThreadPanel` ice ceiling, arrival glow, diamond typing (import from `coach-assistant/styles/CoachAnimations`), thread-header filigree + `1.125rem` promotion, `ConversationItem` rail selection. This is the "beautification" Sean asked for by name.
5. **Extract `IconButton44`, `Chip`, `Banner`, `SwanSkeleton`** — per P4; refactor Bootcamp (`PrimaryButton`/`Select`/`Input` focus rings), Planner (`StatusBanner` dead ternary), Messaging (`ErrorBanner` semantics) onto them immediately.
6. **Composer + mobile height** — merge `MessageInput`/`MessageTextArea`, visible focus ring, `100dvh` token fix, safe-area padding, guarded panel-swap transition. Files: `MessagingStyles.ts`, `ConversationListPanel.styles.ts`.
7. **Coach corrections** — `TranscriptBtn` Arctic-Cyan gradient and missing focus (`CoachMessage.styles.ts`), `MessageTime` 0.35 alpha (`CoachMessageStyles.ts`), 16→15px inversion queries, `#030712` fallback. Small file, high brand-adjacency.
8. **Gold diet + warning/success unification** — Planner (`DegradedBanner`, `DegradedPanel`, `PlannerHandoffLink`, `MetaTag`) and Bootcamp (`FloorModeToggle`, toneStyles). One gold moment per scene; `--warning-text: #F5D678`, `--success-text: #10B981` everywhere.
9. **Scale codification** — radius {4, 8, 12, 16}, spacing on a 4px rem grid, type floor `0.6875rem`, scrollbar mixin, breakpoint diet per X7/X8/X9. Sweep all six surfaces.
10. **Logger token migration** — port `WorkoutLoggerCS` `CS`/`TRAIN` to CSS custom properties, share `SET_GRID`, kill the purple page wash and `min-height: 100vh` (`EnhancedWorkoutLogger.styles.ts`). Largest refactor, lowest urgency — do it last, after the primitives exist to migrate into.

**Bottom line:** the chat is one focused day (steps 1–2–4) away from looking intentional; the system is one primitives pass (step 5) away from never regressing like this again.
