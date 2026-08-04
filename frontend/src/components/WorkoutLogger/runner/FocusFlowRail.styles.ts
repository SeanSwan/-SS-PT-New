/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ FocusFlowRail.styles — the top exercise-navigation cluster  │
 * │ (Sean, 2026-07-31: nav moved from the bottom ThumbBar to    │
 * │ the top, where nothing can jump). ◀ rail ▶ in one row:      │
 * │ arrows step exercises; the rail scrolls (touch fling,       │
 * │ desktop hold-drag + wheel, keyboard roving tabs).           │
 * │ Compact chips: inactive = numbered dot, active = expanded   │
 * │ pill, next-incomplete = truncated-name preview (Kimi b.2).  │
 * │ Depth tiers (Kimi b.4): active glows world-accent, done     │
 * │ wears earned gold quietly, pending is ghost.                │
 * │ All chrome rides the Lens world seam — no palette-dead      │
 * │ tokens (shell.world-seam.test.ts law).                      │
 * └─────────────────────────────────────────────────────────────┘
 */
import styled, { css, keyframes } from 'styled-components';
import { TRAIN } from '../../../styles/train-tokens';

export const RailNavRow = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
`;

export const RailArrowButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--world-text, #e0ecf4) 16%, transparent);
  background: var(--world-panel, #141419);
  color: var(--world-text, #e0ecf4);
  cursor: pointer;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8b5cf6);
    outline-offset: 2px;
  }
`;

/* ── The scroller ─────────────────────────────────────────────── */
export const ProgressRail = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  /* A sideways fling stays in the rail — never chains to the page or to
     the browser's back-swipe gesture on iOS. */
  overscroll-behavior-x: contain;
  padding: 4px 2px 8px;
  /* Keyboard focus scrolls a chip to rest INSIDE the fade, not under it —
     otherwise Tab lands on a chip whose focus ring is masked out. */
  scroll-padding-inline: 14px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  /* Desktop affordance for the hold-and-drag (useRailDragScroll). */
  @media (hover: hover) and (pointer: fine) {
    cursor: grab;
    &:active { cursor: grabbing; }
  }

  /* Edge fade = the "there's more" affordance (same idiom as
     ExerciseFilterChips). Purely visual; it never eats a tap. */
  mask-image: linear-gradient(
    to right,
    transparent 0,
    black 10px,
    black calc(100% - 10px),
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    black 10px,
    black calc(100% - 10px),
    transparent 100%
  );
`;

/* Tabs-only group inside the rail (tablist purity — Add sits outside).
   `flex: 0 0 auto` is LOAD-BEARING: as a flex item this group would
   otherwise default to flex-shrink:1, collapse to the rail's width, and
   clip every chip past the fold — the scroller's scrollWidth would never
   grow, so there was nothing to scroll to (Sean's 2026-07-31 report:
   only ~5 of 11 exercises reachable). Regression-locked in
   FocusFlowSkin.railScroll.test.tsx. */
export const RailGroup = styled.div`
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
`;

/* Earned-gold completion pulse (Kimi d): transform/opacity only —
   GPU-composited, zero layout. Reduced motion = instant flip. */
const completionPulse = keyframes`
  0% { transform: scale(0.6); opacity: 0.9; }
  100% { transform: scale(1.6); opacity: 0; }
`;

export const RailChip = styled.button<{
  $state: 'pending' | 'active' | 'done';
  $linked?: boolean;
  $preview?: boolean;
  $pulse?: boolean;
}>`
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 44px;
  min-height: 44px;
  padding: ${({ $state, $preview }) => ($state === 'active' || $preview ? '8px 14px' : '8px')};
  border-radius: 999px;
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
  background: transparent; /* ghost tier — pending recedes */
  border: 1px solid color-mix(in srgb, var(--world-text, #e0ecf4) 14%, transparent);
  color: ${TRAIN.pending};

  ${({ $state }) => $state === 'active' && css`
    border-color: ${TRAIN.active};
    color: ${TRAIN.active};
    background: color-mix(in srgb, var(--world-accent, #60C0F0) 14%, var(--world-panel, #141419));
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--world-text, #e0ecf4) 18%, transparent),
      0 0 12px -2px color-mix(in srgb, var(--world-accent, #60C0F0) 35%, transparent);
  `}
  ${({ $state }) => $state === 'done' && css`
    border-color: color-mix(in srgb, var(--accent-gold, #C6A84B) 55%, transparent);
    color: ${TRAIN.done};
  `}

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 3px; /* circles clip a 2px ring (Kimi c.7) */
  }
  ${({ $linked }) => ($linked ? css`
    border-left: 2px solid var(--world-accent, #60c0f0);
    margin-left: -6px;
  ` : '')}

  /* The earned moment: a gold ring blooms once when the exercise completes. */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 2px solid var(--accent-gold, #C6A84B);
    opacity: 0;
    pointer-events: none;
  }
  ${({ $pulse }) => ($pulse ? css`
    @media (prefers-reduced-motion: no-preference) {
      /* will-change only WHILE pulsing — a standing hint on 11+ chips would
         hold that many compositor layers alive for a 450ms once-per-exercise
         moment. */
      &::after {
        will-change: transform, opacity;
        animation: ${completionPulse} 0.45s ease-out 1;
      }
    }
  ` : '')}
`;

/** Name label — full on the active pill, truncated on the preview chip. */
export const ChipName = styled.span<{ $preview?: boolean }>`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${({ $preview }) => ($preview ? 'max-width: 72px;' : 'max-width: 40vw;')}
`;

/* Non-color state indicator (WCAG 1.4.1 — never color-only). */
export const RailDot = styled.span<{ $state: 'pending' | 'active' | 'done' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid currentColor;
  background: ${({ $state }) => ($state === 'done' ? 'currentColor' : 'transparent')};
  font-size: 10px;
  line-height: 1;
  font-variant-numeric: tabular-nums;

  /* The ✓ must not inherit gold-on-gold — cut it to the world floor. */
  ${({ $state }) => $state === 'done' && css`
    color: ${TRAIN.done};
    > span { color: var(--world-bg, #0A0A0F); }
  `}
`;
