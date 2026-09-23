/**
 * ThemeLensPopover.styles.ts
 * ==========================
 *
 * Styled components for the theme picker. Split out of ThemeLensPopover.tsx so
 * each module stays inside Rule 4's 300-line budget.
 *
 * Layout notes that matter:
 * - The grid uses `auto-fill` + a 66px floor so the column count follows the
 *   panel width instead of being hard-coded. 28 options at a fixed 4 columns
 *   forced 7 rows into a 440px box on desktop, so the last row was clipped.
 * - `ScrollFade` is a sticky child of the scroll container: it pins to the
 *   bottom of the scrollport and fades out once the user reaches the end, which
 *   is the only affordance telling them there is more below.
 * - Touch targets are 44px. The switch and the cycle button draw a smaller VISUAL
 *   inside a 44px hit area rather than shrinking the hit area to match the visual.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { OPTION_MIN_WIDTH, TOUCH_TARGET_PX } from './themeLensMetrics';

export const Panel = styled(motion.div)`
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 1200;
  width: min(420px, calc(100vw - 24px));
  max-height: min(74vh, 540px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-primary, #60c0f0) 45%, transparent)
    transparent;
  padding: 12px;
  border-radius: 14px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-strong, rgba(96, 192, 240, 0.3));
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(16px);

  /* Overlay scrollbars are invisible until hover, which hid the fact that the
     list continues. Force a visible thin bar. */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-primary, #60c0f0) 45%, transparent);
  }

  @media (max-width: 600px) {
    position: fixed;
    top: 66px;
    left: 8px;
    right: 8px;
    width: auto;
    max-height: min(74vh, 500px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  padding: 0 2px;
`;

export const PanelTitle = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  /* --text-secondary, NOT --text-muted.
   *
   * At 0.75rem/600 this is normal-size text, so WCAG 2.1 AA wants 4.5:1. Measured
   * composited over the panel's own surface, --text-muted reaches only 2.65-3.51:1
   * in four themes (frozen-aurora, obsidian-black, crystalline-mono, deep-ocean) —
   * a real failure. --text-secondary is 6.42:1 at worst across all 28.
   *
   * The palette token itself was deliberately NOT raised: var(--text-muted) has
   * 740 call sites across 355 files, so changing it is an app-wide visual redesign,
   * not a lens fix. That gap is recorded, with numbers, in themeContrast.test.ts.
   */
  color: var(--text-secondary, rgba(248, 250, 252, 0.85));
`;

export const CycleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  /* 44px hit area; the pill look comes from padding, not from a short height. */
  min-height: ${TOUCH_TARGET_PX}px;
  padding: 10px 14px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-primary, #f8fafc);
  background: color-mix(in srgb, var(--accent-primary, #60c0f0) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 40%, transparent);
  transition: background 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60c0f0) 24%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 2px;
  }
`;

export const SystemRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  padding: 0 9px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-base, #030712) 55%, transparent);
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
`;

export const SystemLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary, rgba(248, 250, 252, 0.85));
`;

export const Grid = styled.div`
  display: grid;
  /* auto-fill keeps the column count honest as the panel resizes, and the
     ArrowUp/ArrowDown handler reads the real count back off the DOM. */
  grid-template-columns: repeat(auto-fill, minmax(${OPTION_MIN_WIDTH}px, 1fr));
  gap: 6px;
`;

export const Option = styled.button<{ $selected: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 7px 4px 6px;
  border-radius: 10px;
  cursor: pointer;
  text-align: center;
  background: ${({ $selected }) =>
    $selected
      ? 'color-mix(in srgb, var(--accent-primary, #60c0f0) 20%, transparent)'
      : 'color-mix(in srgb, var(--bg-base, #030712) 60%, transparent)'};
  border: 1px solid
    ${({ $selected }) =>
      $selected
        ? 'color-mix(in srgb, var(--accent-primary, #60c0f0) 60%, transparent)'
        : 'var(--border-soft, rgba(255, 255, 255, 0.08))'};
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60c0f0) 50%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const OptionSwatch = styled.span<{ $fill: string; $border: string; $radius: string }>`
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  border-radius: ${({ $radius }) => $radius};
  background: ${({ $fill }) => $fill};
  border: ${({ $border }) => $border};
`;

export const OptionLabel = styled.span<{ $selected: boolean }>`
  /* 0.6rem (9.6px) was below comfortable reading size for a control that is the
     only way to tell 28 themes apart by name. */
  font-size: 0.75rem;
  line-height: 1.25;
  font-weight: 500;
  /* The selected option's label is painted on a 20% accent wash, not on the panel,
   * and --text-secondary only reaches 4.26:1 there on deep-ocean — under the 4.5:1
   * that 0.75rem/500 needs. --text-primary reaches 5.67:1 on that same wash.
   *
   * The unselected label keeps --text-secondary (6.24:1 worst case). Only the
   * SELECTED option is emphasised; brightening all 28 labels would be a redesign
   * smuggled in as a contrast fix.
   */
  color: ${({ $selected }) =>
    $selected ? 'var(--text-primary, #f8fafc)' : 'var(--text-secondary, rgba(248, 250, 252, 0.85))'};
  overflow-wrap: anywhere;
`;

export const SelectedMark = styled.span`
  position: absolute;
  top: 3px;
  right: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--accent-primary, #60c0f0);
  /* --text-on-accent, NOT --bg-base.
   *
   * The disc is painted with --accent-primary, so the glyph on it needs a colour
   * chosen for THAT surface. --bg-base is the page colour, which is a coincidence
   * that holds on dark themes and collapses on others: measured on obsidian-black,
   * #0A0A0F on #002060 is 1.29:1 — the check mark is effectively invisible, against
   * the 3:1 WCAG 1.4.11 wants for a graphical object.
   *
   * --text-on-accent is the palette's own answer to exactly this question:
   * themeUtils.getReadableAccentText(colors.primary), i.e. whichever of #030712 /
   * #FFFFFF contrasts better on the accent. Worst case across all 28 themes is
   * 4.51:1. It is emitted for every theme, so the fallback is unreachable.
   */
  color: var(--text-on-accent, #030712);
`;

/**
 * Sticky bottom fade. Pins to the bottom of the scrollport (the -12px bottom
 * offset cancels the Panel's padding) and disappears once there is nothing left
 * to reveal. `pointer-events: none` keeps the last row clickable underneath it.
 */
export const ScrollFade = styled.div<{ $visible: boolean }>`
  position: sticky;
  bottom: -12px;
  height: 30px;
  margin-top: -30px;
  pointer-events: none;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.2s ease;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--bg-elevated, #141419) 85%
  );

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
