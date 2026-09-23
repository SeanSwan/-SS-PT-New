/**
 * UniversalThemeToggle.tsx
 * ========================
 *
 * The header theme lens — orchestrator only.
 *
 * This file used to hold the entire control: eight `switch ($currentTheme)` blocks
 * (13 cases each against 28 registered themes, so 15 themes fell through to
 * `default` and rendered one identical swatch), a hand-maintained copy of every
 * theme name, and a hover-only tooltip. Those responsibilities now live in:
 *
 *   themeSwatch.ts          — the swatch, derived from the palette
 *   themeToggleMetadata.tsx — accessible names + one distinct glyph per theme
 *   ThemeLensButton.tsx     — the 44px control
 *   ThemeLensPopover.tsx    — the 28-theme picker
 *
 * Public surface is unchanged: default export, `showTooltip` / `size` / `className`,
 * and the `themeToggleMetadata` re-export that
 * UniversalThemeContext.themeCycle.test.ts depends on.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useUniversalTheme, type ThemeId } from './UniversalThemeContext';
import ThemeLensButton from './ThemeLensButton';
import ThemeLensPopover from './ThemeLensPopover';

// Re-exported for existing consumers and tests.
export {
  themeToggleMetadata,
  getThemeDescription,
  getThemeIconKey,
  themeIconKeys,
  ThemeLensIcon,
} from './themeToggleMetadata';
export type { ThemeIconKey, ThemeToggleMetadataEntry } from './themeToggleMetadata';

const LensRoot = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export interface UniversalThemeToggleProps {
  showTooltip?: boolean;
  /** No `small`: a 36px control is below the 44px minimum touch target. */
  size?: 'medium' | 'large';
  className?: string;
}

const UniversalThemeToggle: React.FC<UniversalThemeToggleProps> = ({
  showTooltip = true,
  size = 'medium',
  className,
}) => {
  const { currentTheme, setTheme, toggleTheme } = useUniversalTheme();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const closePicker = useCallback((restoreFocus = true) => {
    setIsPickerOpen(false);
    if (restoreFocus) {
      // Return focus to the control that opened the picker.
      requestAnimationFrame(() => buttonRef.current?.focus());
    }
  }, []);

  const handleSelect = useCallback(
    (themeId: ThemeId) => {
      setTheme(themeId);
      closePicker();
    },
    [closePicker, setTheme]
  );

  // Escape closes from anywhere, including once focus has left the panel.
  useEffect(() => {
    if (!isPickerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePicker();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPickerOpen, closePicker]);

  return (
    /*
     * MotionConfig is LOAD-BEARING, not decoration.
     *
     * The `@media (prefers-reduced-motion: reduce)` blocks in the styled
     * components cannot stop framer-motion: it drives transform/opacity through
     * INLINE styles and the Web Animations API, so `animation: none` has no effect
     * on it and an inline `transform` outranks a class-level `transform: none`.
     * Without this wrapper the lens still scaled on hover, the glyph still rotated,
     * and the picker still translated on open — while the CSS claimed otherwise.
     *
     * reducedMotion="user" makes framer drop transform/layout animations when the
     * OS asks for reduced motion; opacity fades remain, which the spec permits.
     */
    <MotionConfig reducedMotion="user">
      <LensRoot className={className}>
        <ThemeLensButton
          size={size}
          showTooltip={showTooltip}
          isPickerOpen={isPickerOpen}
          onOpenPicker={() => setIsPickerOpen((open) => !open)}
          // Arrow-key cycling must not open the picker.
          onCycle={(direction) => toggleTheme(direction)}
          buttonRef={buttonRef}
        />

        <AnimatePresence>
          {isPickerOpen && (
            <ThemeLensPopover
              activeTheme={currentTheme}
              onSelect={handleSelect}
              // Arrow navigation applies the theme but keeps the panel open, so a
              // keyboard user can walk the grid. `setTheme` is the apply-only path;
              // closing lives in `handleSelect`.
              onPreview={setTheme}
              onClose={closePicker}
              onCycle={() => toggleTheme(1)}
              anchorRef={buttonRef}
            />
          )}
        </AnimatePresence>
      </LensRoot>
    </MotionConfig>
  );
};

export default UniversalThemeToggle;
