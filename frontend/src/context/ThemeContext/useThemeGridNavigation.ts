/**
 * useThemeGridNavigation.ts
 * =========================
 *
 * Keyboard navigation for the theme picker's radiogroup: roving focus, arrow
 * movement, Home/End, Escape and Tab.
 *
 * Extracted from `ThemeLensPopover.tsx` to keep that module inside Rule 4 — and
 * because "how a radiogroup answers the keyboard" is a concern with its own
 * contract, distinct from "what the picker renders". It is also the half worth
 * testing directly, which is easier when it is not entangled with markup.
 *
 * Contract
 * - Exactly one option is tabbable, and it is the FOCUSED one, not the selected one.
 * - Arrows move focus AND apply the theme, which is native radio behaviour.
 *   Focus-only navigation leaves `aria-checked` stale and tells a screen reader the
 *   wrong thing is active.
 * - Arrows do NOT close. A keyboard user has to be able to walk the grid.
 * - Escape and Tab close and hand focus back to the anchor (`restoreFocus` true).
 * - Outside dismissal is deliberately NOT here: that is a pointer concern owned by
 *   the popover, and it must close WITHOUT restoring focus.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
  type RefObject,
} from 'react';
import type { ThemeId } from './UniversalThemeContext';

/** Used only if the computed grid template cannot be read (e.g. `display: none`). */
export const FALLBACK_COLUMNS = 4;

export interface ThemeGridNavigationOptions {
  /** Canonical order — `themeCycle`. */
  themeIds: readonly ThemeId[];
  /** The applied theme. The initial focus target on open. */
  activeTheme: ThemeId;
  /** Apply WITHOUT closing. */
  onPreview: (themeId: ThemeId) => void;
  /** Close, optionally returning focus to the anchor. */
  onClose: (restoreFocus?: boolean) => void;
}

export interface ThemeGridNavigation {
  /**
   * Attach to the `role="radiogroup"` element.
   *
   * Typed `RefObject<HTMLDivElement>`, NOT `RefObject<HTMLDivElement | null>`.
   * Those look interchangeable and are not. `@types/react` declares
   * `RefObject<T>` with `readonly current: T | null`, which makes it covariant in
   * `T`, so the compiler compares the TYPE ARGUMENTS rather than expanding the
   * property: `RefObject<HTMLDivElement | null>` is not assignable to
   * `RefObject<HTMLDivElement>`, because `HTMLDivElement | null` is not assignable
   * to `HTMLDivElement`. A styled component's `ref` prop wants the latter, so the
   * React-19 spelling fails to compile in this React-18-typed repo. `useRef<T>(null)`
   * already infers this exact type. Verified by probe: tmp/ref-probe.tsx.
   */
  gridRef: RefObject<HTMLDivElement>;
  /**
   * Ref callback array for the options, indexed by position.
   *
   * `MutableRefObject`, not `RefObject`: `RefObject.current` is nullable, so
   * assigning into it from a ref callback is a "possibly null" error. `useRef` with
   * an initial value returns `MutableRefObject`, which is what this actually is.
   */
  optionRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
  /** Index of the option that owns the single tab stop. */
  focusedIndex: number;
  /** Attach to the radiogroup's `onKeyDown`. */
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export const useThemeGridNavigation = ({
  themeIds,
  activeTheme,
  onPreview,
  onClose,
}: ThemeGridNavigationOptions): ThemeGridNavigation => {
  // `useRef<T>(null)` infers RefObject<T>; `useRef<T | null>(null)` would infer
  // MutableRefObject<T | null>, which a styled component's `ref` rejects.
  const gridRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Captured once: the panel mounts when it opens, so this is the theme to focus.
  const initialIndexRef = useRef(Math.max(0, themeIds.indexOf(activeTheme)));
  const [focusedIndex, setFocusedIndex] = useState(initialIndexRef.current);

  /**
   * The live column count, read from the rendered grid. Hard-coding it would
   * desync Up/Down from the layout as soon as `auto-fill` picked a different
   * number of columns than the constant.
   */
  const getColumnCount = useCallback((): number => {
    const grid = gridRef.current;
    if (!grid) return FALLBACK_COLUMNS;
    const template = window.getComputedStyle(grid).gridTemplateColumns;
    const count = template.split(' ').filter(Boolean).length;
    return count > 0 ? count : FALLBACK_COLUMNS;
  }, []);

  const focusOption = useCallback(
    (index: number) => {
      const total = themeIds.length;
      const clamped = ((index % total) + total) % total;
      setFocusedIndex(clamped);
      optionRefs.current[clamped]?.focus();
    },
    [themeIds.length]
  );

  // Move focus to the active option when the panel opens. Runs once per open —
  // `focusOption` is stable, so this must NOT depend on `activeTheme`, or every
  // arrow press would re-run it and fight the user's navigation.
  useEffect(() => {
    const timer = setTimeout(() => focusOption(initialIndexRef.current), 0);
    return () => clearTimeout(timer);
  }, [focusOption]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const found = optionRefs.current.findIndex((node) => node === document.activeElement);
      /**
       * `-1` means focus is not on an option. In a real browser that is unreachable —
       * the grid is not focusable, so a keydown inside it implies focus is on an
       * option, and focus landing on `body` removes the grid from the event's
       * propagation path entirely. It is still handled: computing from `-1` would
       * make ArrowRight jump to the FIRST theme and ArrowLeft to the LAST, and a
       * silent wrong-theme jump is worse than a defensive fallback to the index we
       * are already tracking.
       */
      const index = found === -1 ? focusedIndex : found;

      /** Move focus and apply the theme, as a native radio group does. */
      const moveTo = (next: number) => {
        const total = themeIds.length;
        const clamped = ((next % total) + total) % total;
        focusOption(clamped);
        onPreview(themeIds[clamped]);
      };

      /**
       * Column count is read LAZILY, inside the two branches that need it.
       *
       * `getColumnCount` calls `window.getComputedStyle`, which forces a style
       * recalc. It used to run before the switch, so every keypress paid for a
       * layout read — including Escape, Home, End and Tab, none of which use it.
       * Cheaper and no less correct: Up/Down are the only keys that need a row.
       */
      const columns = () => getColumnCount();

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onClose(true);
          break;
        case 'ArrowRight':
          event.preventDefault();
          moveTo(index + 1);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          moveTo(index - 1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveTo(index + columns());
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveTo(index - columns());
          break;
        case 'Home':
          event.preventDefault();
          moveTo(0);
          break;
        case 'End':
          event.preventDefault();
          moveTo(themeIds.length - 1);
          break;
        case 'Tab':
          /*
           * Shift+Tab must NOT close the panel.
           *
           * HY4 round 3 (#2, HIGH). Focus is placed in the grid when the panel opens,
           * and the grid is the LAST focusable thing in the panel — so Shift+Tab is the
           * only keyboard route to the "Match system" switch and the "Next" cycle
           * button. Treating Shift+Tab like Tab dismissed the popover and made both
           * controls keyboard-unreachable (WCAG 2.1.1). Let the browser move focus
           * backwards; the panel closes on focus-out instead.
           */
          if (event.shiftKey) break;
          // Forward Tab is about to leave the popover; close it rather than leaving an
          // orphaned panel behind the header. `preventDefault` first: without it the
          // browser also moves focus, and the restore in the next frame fights that
          // move, producing a visible focus jump.
          event.preventDefault();
          onClose(true);
          break;
        default:
          break;
      }
    },
    [focusedIndex, focusOption, getColumnCount, onClose, onPreview, themeIds]
  );

  return { gridRef, optionRefs, focusedIndex, onKeyDown };
};
