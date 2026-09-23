/**
 * ThemeLensButton.styles.ts
 * =========================
 *
 * Styled components for the header theme lens. Split out of ThemeLensButton.tsx so
 * that module stays inside Rule 4's 300-line cap.
 *
 * Every colour is read from the `$swatch` prop — there is no per-theme branch in
 * this file, which is the whole point of `getThemeSwatch`.
 */

import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import type { ThemeSwatch } from './themeSwatch';

// === KEYFRAME ANIMATIONS ===
export const stellarPulse = keyframes`
  0%, 100% { opacity: 0.8; transform: scale(1); filter: brightness(1); }
  50% { opacity: 1; transform: scale(1.05); filter: brightness(1.2); }
`;

export const orbitingParticles = keyframes`
  0% { transform: rotate(0deg) translateX(20px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(20px) rotate(-360deg); }
`;

export const LensContainer = styled(motion.div)`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const LensButton = styled(motion.button)<{
  $swatch: ThemeSwatch;
  $particleA: string;
  $particleB: string;
  $hasParticles: boolean;
  $sizePx: number;
}>`
  position: relative;
  width: ${({ $sizePx }) => $sizePx}px;
  height: ${({ $sizePx }) => $sizePx}px;
  padding: 0;
  border-radius: ${({ $swatch }) => $swatch.radius};
  border: ${({ $swatch }) => $swatch.border};
  background: ${({ $swatch }) => $swatch.fill};
  color: ${({ $swatch }) => $swatch.icon};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: ${({ $swatch }) => ($swatch.isLight ? 'visible' : 'hidden')};
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${({ $swatch }) => $swatch.glow};

  /* Orbiting particle — theme accent */
  &::before {
    content: '';
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: ${({ $particleA }) => $particleA};
    animation: ${orbitingParticles} 3s linear infinite;
    opacity: 0.8;
    display: ${({ $hasParticles }) => ($hasParticles ? 'block' : 'none')};
  }

  /* Orbiting particle — theme secondary */
  &::after {
    content: '';
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: ${({ $particleB }) => $particleB};
    animation: ${orbitingParticles} 4s linear infinite reverse;
    animation-delay: -1s;
    opacity: 0.6;
    display: ${({ $hasParticles }) => ($hasParticles ? 'block' : 'none')};
  }

  &:hover {
    transform: scale(1.1);
    animation: ${stellarPulse} 2s ease-in-out infinite;
    box-shadow: ${({ $swatch }) => $swatch.hoverGlow};
  }

  &:active {
    transform: scale(0.95);
  }

  /* focus-visible, not focus: a mouse click should not paint a ring */
  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid ${({ $swatch }) => $swatch.focusRing};
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
      animation: none;
    }

    &:active {
      transform: none;
    }

    &::before,
    &::after {
      animation: none;
      opacity: 0;
    }
  }
`;

export const LensGlyph = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 2;
  pointer-events: none;
`;

export const TooltipBubble = styled(motion.div)<{ $swatch: ThemeSwatch }>`
  position: absolute;
  bottom: -46px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.3;

  /*
   * width: max-content is LOAD-BEARING, not tidiness.
   *
   * Without it the bubble is shrink-to-fit inside a 44px-wide container, so the
   * available width falls below the longest word and the browser drops to
   * min-content: the label wrapped to SIX lines of roughly one word each, and
   * max-width never engaged. Measured before this change: 78-92px wide and 6-7
   * lines tall on EVERY viewport. max-content sizes to the text, then max-width caps
   * it, which is what makes the cap mean anything.
   *
   * NOTE: no backticks in these CSS comments. A backtick terminates the template
   * literal the CSS lives in, and the rest of the file is then parsed as JavaScript.
   * This comment originally quoted the property names with backticks and broke the
   * build in exactly that way.
   */
  width: max-content;
  max-width: min(260px, calc(100vw - 32px));
  white-space: normal;
  text-align: center;

  /*
   * Anchored to the control's RIGHT edge so a 260px bubble grows LEFTWARD, into the
   * page, rather than past the right edge. The lens sits at the header's right edge on
   * wide viewports, so centring pushes the bubble off-screen from ~768px up.
   */
  right: 0;
  left: auto;
  translate: none;

  pointer-events: none;
  z-index: 1000;
  /*
   * Tokenized background and text, NOT $swatch.fill / $swatch.icon.
   *
   * HY4 round 3 (#1, CRITICAL). The swatch's icon colour is chosen by
   * readableOn(gradientMidpoint(from, to)) — the MIDPOINT. That is sound for the
   * lens glyph, which is a small non-text graphic drawn near the middle of the
   * gradient. It is wrong for a 260px text bubble that spans the whole thing: the
   * gradient runs from background.primary to colors.primary, so the text near the
   * light end sits on colors.primary itself. For crystalline-default that is
   * #FFFFFF on #60C0F0 = 1.99:1, against the 4.5:1 that 0.75rem normal text needs.
   * Measured, not reasoned about.
   *
   * --bg-primary and --text-primary are the theme's designed pair, so they hold at
   * every point of the bubble. The swatch still supplies the accent border, so the
   * bubble keeps its per-theme identity.
   */
  background: var(--bg-primary, #001545);
  color: var(--text-primary, #f8fafc);
  border: ${({ $swatch }) => $swatch.border};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);

  &::before {
    content: '';
    position: absolute;
    top: -6px;
    /* Points at the control: its centre sits 22px in from its own right edge, and the
       6px side borders make the triangle 12px wide. */
    right: 16px;
    left: auto;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    /* Must match the bubble's own background, or the arrow shows a seam. */
    border-bottom: 6px solid var(--bg-primary, #001545);
  }

  /*
   * Below 480px the control is nowhere near the right edge, so a 260px bubble
   * anchored right would run off the LEFT instead. Centre it here; the
   * calc(100vw - 32px) cap then keeps it inside the viewport.
   *
   * Centring uses the standalone translate property, NOT transform. The
   * tooltipVariants animation drives y/scale, and framer-motion writes those as an
   * INLINE transform, which outranks this stylesheet — so a transform: translateX
   * here would be overridden for the whole entrance.
   */
  @media (max-width: 480px) {
    right: auto;
    left: 50%;
    translate: -50% 0;

    &::before {
      right: auto;
      left: 50%;
      transform: translateX(-50%);
    }
  }
`;

export const VisuallyHidden = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export const iconVariants = {
  idle: { scale: 1, rotate: 0, transition: { duration: 0.3 } },
  hover: { scale: 1.1, rotate: 15, transition: { duration: 0.3 } },
  tap: { scale: 0.9, rotate: -15, transition: { duration: 0.1 } },
};

export const tooltipVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.8 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
  },
};

/**
 * Sizes. There is deliberately no `small`: it rendered a 36px control, below the
 * 44px minimum touch target, and no call site used it.
 */
export const GLYPH_SIZE = { medium: 20, large: 24 } as const;
export const BUTTON_SIZE = { medium: 44, large: 52 } as const;
