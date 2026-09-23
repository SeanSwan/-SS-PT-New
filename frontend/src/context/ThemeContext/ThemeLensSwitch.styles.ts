/**
 * ThemeLensSwitch.styles.ts
 * =========================
 *
 * The "Match system" toggle for the theme picker.
 *
 * Extracted from ThemeLensPopover.styles.ts under Rule 4's remedy list: the picker
 * stylesheet reached 308 lines when the `PanelTitle` contrast fix added the comment
 * explaining it, and the correct answer to a file at the cap is to extract a
 * concern rather than delete the rationale.
 *
 * This is a control, not panel chrome, which is what makes the split principled
 * rather than a line-count shuffle: it is the only interactive element in the picker
 * that is not a theme option, and it is the one round 1 gave a 44x44 hit area.
 */

import styled from 'styled-components';
import { TOUCH_TARGET_PX } from './themeLensMetrics';

/**
 * The switch is a 44x44 hit area; the 34x18 track and its 12px thumb are drawn
 * with pseudo-elements. It used to BE the 34x18 visual, which is well under the
 * 44px minimum touch target.
 */
export const Switch = styled.button<{ $on: boolean }>`
  position: relative;
  flex: 0 0 auto;
  width: ${TOUCH_TARGET_PX}px;
  height: ${TOUCH_TARGET_PX}px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;

  /* track */
  &::before {
    content: '';
    position: absolute;
    top: 13px;
    left: 5px;
    width: 34px;
    height: 18px;
    border-radius: 999px;
    border: 1px solid
      ${({ $on }) =>
        $on
          ? 'color-mix(in srgb, var(--accent-primary, #60c0f0) 70%, transparent)'
          : 'var(--border-strong, rgba(255, 255, 255, 0.2))'};
    background: ${({ $on }) =>
      $on
        ? 'color-mix(in srgb, var(--accent-primary, #60c0f0) 45%, transparent)'
        : 'color-mix(in srgb, var(--bg-base, #030712) 70%, transparent)'};
    transition: background 0.2s ease, border-color 0.2s ease;
  }

  /* thumb — 3px inset from either end of the 34px track */
  &::after {
    content: '';
    position: absolute;
    top: 16px;
    left: ${({ $on }) => ($on ? '24px' : '8px')};
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--text-primary, #f8fafc);
    transition: left 0.2s ease;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before,
    &::after {
      transition: none;
    }
  }
`;
