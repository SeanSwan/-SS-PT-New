/**
 * useBeforeAfterSlider — shared before/after comparison slider mechanism
 * =====================================================================
 * Owns the position state AND the interaction surface for every before/after
 * photo comparison in the app, so the in-post and standalone viewers cannot
 * drift apart again.
 *
 * WHY THIS EXISTS
 * ---------------
 * Two implementations of the same control had diverged:
 *   - `TransformationPhotoShowcase` (dashboard) — real drag, no keyboard, 36px handle
 *   - `PostContent` / `PostCard` (feed)         — value frozen at 50, no setter at all,
 *                                                 and a decorative 40px div that looked
 *                                                 draggable but had no handler
 * Sharing only the number would have left the feed with a control it could not
 * drive, so this hook exports the whole mechanism: state, pointer drag, keyboard
 * operation, and the ARIA prop bundle.
 *
 * ACCESSIBILITY
 * -------------
 * `containerProps` carries `role="slider"` plus `aria-valuenow/min/max` and
 * `tabIndex={0}`, and `onKeyDown` implements the WAI-ARIA slider keyboard
 * contract (arrows, PageUp/PageDown, Home/End). Consumers are responsible for
 * rendering a handle that meets the 44px touch-target rule.
 *
 * USAGE
 * -----
 *   const { containerRef, containerProps } = useBeforeAfterSlider();
 *   <SliderContainer ref={containerRef} {...containerProps}>
 *     <AfterLayer />   // clip-path: inset(0 0 0 var(--swan-slider-pos, 50%))
 *     <Divider />      // left:      var(--swan-slider-pos, 50%)
 *   </SliderContainer>
 *
 * RENDERING CONTRACT
 * ------------------
 * The live position rides on the `--swan-slider-pos` CSS custom property, which
 * `containerProps.style` sets on the track element. Consumers read it in CSS.
 * This is deliberate: interpolating the position into a styled-component prop
 * would mint a fresh CSS class on every pointer-move frame. One class, one
 * variable, no churn — and both viewers reveal the photo the same way.
 */

import { useState, useCallback, useRef, useMemo } from 'react';

/** Clamped travel range. Keeps a sliver of both images visible at the extremes. */
export const SLIDER_MIN = 5;
export const SLIDER_MAX = 95;
/** CSS custom property carrying the live divider position, e.g. "62%". */
export const SLIDER_POSITION_VAR = '--swan-slider-pos';
const STEP = 2;
const PAGE_STEP = 10;

export interface UseBeforeAfterSliderOptions {
  /** Starting position, in percent. Clamped into [SLIDER_MIN, SLIDER_MAX]. */
  initialPosition?: number;
  /** Accessible name for the comparison control. */
  label?: string;
}

export interface UseBeforeAfterSliderResult {
  /** Current divider position, in percent. */
  position: number;
  /** Imperatively set the position (clamped). */
  setPosition: (next: number) => void;
  /** Attach to the element whose width defines the drag track. */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Spread onto that same element — pointer handlers + ARIA slider contract. */
  containerProps: {
    role: 'slider';
    tabIndex: 0;
    'aria-label': string;
    'aria-valuenow': number;
    'aria-valuemin': number;
    'aria-valuemax': number;
    'aria-orientation': 'horizontal';
    style: React.CSSProperties;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
}

const clamp = (n: number) => Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, n));

export function useBeforeAfterSlider(
  options: UseBeforeAfterSliderOptions = {}
): UseBeforeAfterSliderResult {
  const {
    initialPosition = 50,
    label = 'Before and after photo comparison slider',
  } = options;

  const [position, setPositionState] = useState(() => clamp(initialPosition));
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const setPosition = useCallback((next: number) => {
    setPositionState(clamp(next));
  }, []);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    setPositionState(clamp(((clientX - rect.left) / rect.width) * 100));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  }, [updateFromClientX]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updateFromClientX(e.clientX);
  }, [updateFromClientX]);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = position - STEP;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = position + STEP;
        break;
      case 'PageDown':
        next = position - PAGE_STEP;
        break;
      case 'PageUp':
        next = position + PAGE_STEP;
        break;
      case 'Home':
        next = SLIDER_MIN;
        break;
      case 'End':
        next = SLIDER_MAX;
        break;
      default:
        return;
    }
    e.preventDefault();
    setPositionState(clamp(next));
  }, [position]);

  const containerProps = useMemo(() => ({
    role: 'slider' as const,
    tabIndex: 0 as const,
    'aria-label': label,
    'aria-valuenow': Math.round(position),
    'aria-valuemin': SLIDER_MIN,
    'aria-valuemax': SLIDER_MAX,
    'aria-orientation': 'horizontal' as const,
    style: { [SLIDER_POSITION_VAR]: `${position}%` } as React.CSSProperties,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave: onPointerUp,
    onKeyDown,
  }), [label, position, onPointerDown, onPointerMove, onPointerUp, onKeyDown]);

  return { position, setPosition, containerRef, containerProps };
}

export default useBeforeAfterSlider;
