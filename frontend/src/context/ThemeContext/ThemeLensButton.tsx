/**
 * ThemeLensButton.tsx
 * ===================
 *
 * The header theme lens itself: a 44px control that shows the ACTIVE theme.
 *
 * Behaviour
 * - Click / Enter / Space  → opens the theme picker
 * - ArrowLeft / ArrowRight → cycles to the previous / next theme without opening it
 * - Hover or keyboard focus → shows the tooltip naming the current theme
 *
 * Every colour comes from `getThemeSwatch(themeId)`; there is no per-theme branch
 * in this file. Reduced motion is handled by the `<MotionConfig reducedMotion="user">`
 * in UniversalThemeToggle.tsx — the CSS media query below cannot stop framer-motion,
 * which animates through inline styles and the Web Animations API.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useUniversalTheme, type ThemeId } from './UniversalThemeContext';
import { getThemeSwatch } from './themeSwatch';
import { getThemeDescription, ThemeLensIcon } from './themeToggleMetadata';
import {
  BUTTON_SIZE,
  GLYPH_SIZE,
  LensButton,
  LensContainer,
  LensGlyph,
  TooltipBubble,
  VisuallyHidden,
  iconVariants,
  tooltipVariants,
} from './ThemeLensButton.styles';

export interface ThemeLensButtonProps {
  /** No `small`: a 36px control is below the 44px minimum touch target. */
  size?: 'medium' | 'large';
  showTooltip?: boolean;
  isPickerOpen: boolean;
  onOpenPicker: () => void;
  onCycle: (direction: 1 | -1) => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}

const ThemeLensButton: React.FC<ThemeLensButtonProps> = ({
  size = 'medium',
  showTooltip = true,
  isPickerOpen,
  onOpenPicker,
  onCycle,
  buttonRef,
}) => {
  const { currentTheme } = useUniversalTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showTooltipState, setShowTooltipState] = useState(false);

  const swatch = useMemo(() => getThemeSwatch(currentTheme), [currentTheme]);
  const currentLabel = getThemeDescription(currentTheme);

  // Tooltip on hover OR keyboard focus — it used to be hover-only, so keyboard and
  // touch users never saw it.
  useEffect(() => {
    if (!showTooltip || isPickerOpen || (!isHovered && !isFocused)) {
      setShowTooltipState(false);
      return;
    }
    const timer = setTimeout(() => setShowTooltipState(true), 300);
    return () => clearTimeout(timer);
  }, [isHovered, isFocused, showTooltip, isPickerOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      onCycle(1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      onCycle(-1);
    }
  };

  return (
    /*
     * MotionConfig lives here, not only in UniversalThemeToggle.
     *
     * This component is exported from the barrel, so a consumer can mount it without
     * the toggle. Relying on an ancestor's MotionConfig would mean reduced motion
     * silently stops working the moment it is used anywhere else — the failure mode
     * is invisible in the header, where it happens to be covered.
     *
     * Nesting is safe: an inner MotionConfig overrides an outer one with the same
     * value, and the toggle keeps its own for the AnimatePresence that lives there.
     */
    <MotionConfig reducedMotion="user">
      <LensContainer>
        <LensButton
          ref={buttonRef}
          type="button"
          $swatch={swatch}
          $particleA={swatch.particles?.primary ?? 'transparent'}
          $particleB={swatch.particles?.secondary ?? 'transparent'}
          $hasParticles={swatch.particles !== null}
          $sizePx={BUTTON_SIZE[size]}
          onClick={onOpenPicker}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-label={`Theme: ${currentLabel}. Activate to choose a theme.`}
          aria-haspopup="dialog"
          aria-expanded={isPickerOpen}
          data-theme-lens
        >
          <LensGlyph
            variants={iconVariants}
            initial="idle"
            animate={isHovered ? 'hover' : 'idle'}
            whileTap="tap"
          >
            <ThemeLensIcon themeId={currentTheme} size={GLYPH_SIZE[size]} />
          </LensGlyph>
        </LensButton>

        <AnimatePresence>
          {showTooltipState && (
            <TooltipBubble
              $swatch={swatch}
              variants={tooltipVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              /*
               * aria-hidden, NOT role="presentation".
               *
               * HY4 round 3 (#4). role="presentation" strips the element's SEMANTICS
               * but leaves its text in the accessibility tree, so a screen reader
               * announced the theme twice: once from this bubble and once from the
               * button's aria-label plus the ScreenReaderStatus live region below.
               * The bubble is decorative — the accessible name already carries the
               * theme and the interaction hint, and arrow-key movement is native
               * radiogroup behaviour, so the hint is not lost by hiding this.
               */
              aria-hidden="true"
              // Harness hook, consistent with `data-theme-lens` / `data-theme-picker`.
              // A text locator resolves to an arbitrary ancestor and reports ITS box —
              // measured 78-92px wide for text that must wrap at 260px, which is how a
              // "no overflow" verdict gets manufactured by the instrument.
              data-theme-tooltip
            >
              {currentLabel} — click for themes, arrows to cycle
            </TooltipBubble>
          )}
        </AnimatePresence>

        {/* Announce the change for screen readers; the button label alone is not enough
            because focus stays on the button after a cycle. */}
        <ScreenReaderStatus themeId={currentTheme} />
      </LensContainer>
    </MotionConfig>
  );
};

const ScreenReaderStatus: React.FC<{ themeId: ThemeId }> = ({ themeId }) => (
  <VisuallyHidden aria-live="polite" aria-atomic="true" role="status">
    {`Theme ${getThemeDescription(themeId)}`}
  </VisuallyHidden>
);

export default ThemeLensButton;
