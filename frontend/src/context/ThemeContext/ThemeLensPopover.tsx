/**
 * ThemeLensPopover.tsx
 * ====================
 *
 * The theme picker. Before this existed the lens only cycled: reaching the 28th
 * theme took 27 clicks in one direction, with no way to see what was available.
 *
 * Accessibility
 * - `role="radiogroup"` / `role="radio"` + `aria-checked` — a single choice from a
 *   set, which is what a radio group means to assistive tech.
 * - Roving focus: exactly ONE option is tabbable, and it is the FOCUSED one.
 * - Arrow keys move focus AND apply the theme, which is native radio behaviour.
 *   Focus-only navigation left `aria-checked` stale and told a screen reader the
 *   wrong thing. Arrows preview without closing; Enter/Space/click commit and close.
 * - Escape closes and returns focus to the lens button.
 * - Clicking outside closes WITHOUT stealing focus back — see `onClose`.
 * - Keyboard behaviour lives in `useThemeGridNavigation`; this file owns markup,
 *   the outside-pointer dismissal, and the scroll affordance.
 *
 * Layout
 * - The grid's column count is read back off the DOM for arrow navigation, so
 *   Up/Down stay correct when the panel resizes and the column count changes.
 * - A sticky bottom fade appears while there is more to scroll to.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { Check, Shuffle } from 'lucide-react';
import { themes, themeCycle, useUniversalTheme, type ThemeId } from './UniversalThemeContext';
import { getThemeSwatch } from './themeSwatch';
import { getThemeDescription } from './themeToggleMetadata';
import { useThemeGridNavigation } from './useThemeGridNavigation';
import {
  CycleButton,
  Grid,
  Option,
  OptionLabel,
  OptionSwatch,
  Panel,
  PanelHeader,
  PanelTitle,
  ScrollFade,
  SelectedMark,
  SystemLabel,
  SystemRow,
} from './ThemeLensPopover.styles';
import { Switch } from './ThemeLensSwitch.styles';

export interface ThemeLensPopoverProps {
  /** The theme currently applied — the single source of truth is the provider. */
  activeTheme: ThemeId;
  /** Apply AND close. Used by click and by Enter/Space. */
  onSelect: (themeId: ThemeId) => void;
  /**
   * Apply WITHOUT closing. Used by arrow navigation, so a keyboard user can walk
   * the grid and see each theme applied rather than having the panel shut on the
   * first keypress.
   */
  onPreview: (themeId: ThemeId) => void;
  /**
   * `restoreFocus` defaults to true — the popover owned focus, so it gives it back
   * to the lens.
   *
   * Outside dismissal passes `false`, and that distinction is load-bearing. The user
   * clicked something else (a nav link, a form field); the browser focuses it on
   * mousedown, and a focus restore would then YANK focus to the lens button in the
   * next frame, so the thing they just clicked never activates.
   */
  onClose: (restoreFocus?: boolean) => void;
  onCycle: () => void;
  /** The lens button — clicks inside it are not "outside". */
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

const ThemeLensPopover: React.FC<ThemeLensPopoverProps> = ({
  activeTheme,
  onSelect,
  onPreview,
  onClose,
  onCycle,
  anchorRef,
}) => {
  const { followSystemTheme, setFollowSystemTheme, systemPrefersDark } = useUniversalTheme();
  const panelRef = useRef<HTMLDivElement>(null);
  const [hasOverflowBelow, setHasOverflowBelow] = useState(false);

  const { gridRef, optionRefs, focusedIndex, onKeyDown } = useThemeGridNavigation({
    themeIds: themeCycle,
    activeTheme,
    onPreview,
    onClose,
  });

  // Track whether anything is still hidden below the fold.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const update = () => {
      const remaining = panel.scrollHeight - panel.scrollTop - panel.clientHeight;
      setHasOverflowBelow(remaining > 4);
    };

    update();
    panel.addEventListener('scroll', update, { passive: true });

    // The panel resizes with the viewport, so re-measure on resize too.
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(panel);

    return () => {
      panel.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, []);

  // Outside click closes. It must NOT restore focus: the pointer already focused
  // whatever the user aimed at, and pulling focus back to the lens would stop that
  // element from ever activating.
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [anchorRef, onClose]);

  /**
   * Focus leaving the panel closes it — WITHOUT restoring focus.
   *
   * HY4 round 3 (#2, HIGH). Shift+Tab is now allowed through (see
   * `useThemeGridNavigation`), so focus can walk backwards out of the grid to the
   * switch, then the cycle button, then the lens. Without this the panel would stay
   * orphaned behind the header once focus had genuinely left it.
   *
   * It must NOT restore focus: focus has already moved — that is why focusout fired —
   * and pulling it back would undo the user's move. Same reasoning as round 2's
   * outside-click fix.
   */
  const handleFocusOut = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    // Null relatedTarget means focus left the document entirely (window blur, alt-tab,
    // devtools). Closing on that would dismiss the panel for switching windows.
    if (!next) return;
    if (panelRef.current?.contains(next)) return;
    if (anchorRef?.current?.contains(next)) return;
    onClose(false);
  };

  return (
    /*
     * MotionConfig lives here, not only in UniversalThemeToggle.
     *
     * The barrel exports this component, so it can be mounted without the toggle —
     * and then the ancestor that made reduced motion work would be gone. The failure
     * is invisible in the header, which is exactly why it has to be local. The
     * toggle keeps its own for the AnimatePresence that wraps this panel.
     */
    <MotionConfig reducedMotion="user">
      <Panel
        ref={panelRef}
        role="dialog"
        aria-label="Choose a theme"
        data-theme-picker
        onBlur={handleFocusOut}
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      >
        <PanelHeader>
          <PanelTitle>{themeCycle.length} themes</PanelTitle>
          <CycleButton type="button" onClick={onCycle}>
            <Shuffle size={12} />
            Next
          </CycleButton>
        </PanelHeader>

        {/* No way to follow the OS colour scheme existed before: the only options were
            28 fixed palettes. */}
        <SystemRow>
          <SystemLabel>Match system ({systemPrefersDark ? 'dark' : 'light'})</SystemLabel>
          <Switch
            type="button"
            role="switch"
            aria-checked={followSystemTheme}
            aria-label="Follow the system colour scheme"
            $on={followSystemTheme}
            onClick={() => setFollowSystemTheme(!followSystemTheme)}
          />
        </SystemRow>

        <Grid
          ref={gridRef}
          role="radiogroup"
          aria-label="Themes"
          data-theme-grid
          onKeyDown={onKeyDown}
        >
          {themeCycle.map((themeId, index) => {
            const swatch = getThemeSwatch(themeId);
            const selected = themeId === activeTheme;

            return (
              <Option
                key={themeId}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={getThemeDescription(themeId)}
                title={getThemeDescription(themeId)}
                // Roving tabindex follows FOCUS, not selection: the tab stop must be
                // the option the user is on, which arrow navigation also applies.
                tabIndex={index === focusedIndex ? 0 : -1}
                $selected={selected}
                onClick={() => onSelect(themeId)}
              >
                <OptionSwatch
                  $fill={swatch.fill}
                  $border={swatch.border}
                  $radius={swatch.radius}
                  aria-hidden="true"
                />
                <OptionLabel $selected={selected} aria-hidden="true">
                  {themes[themeId].name}
                </OptionLabel>
                {selected && (
                  <SelectedMark aria-hidden="true">
                    <Check size={9} strokeWidth={3} />
                  </SelectedMark>
                )}
              </Option>
            );
          })}
        </Grid>

        <ScrollFade $visible={hasOverflowBelow} aria-hidden="true" />
      </Panel>
    </MotionConfig>
  );
};

export default ThemeLensPopover;
