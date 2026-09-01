/**
 * SheenButton — Forge Sheen-tier button (SWA-224)
 * ================================================
 * BLUEPRINT
 * ---------
 * Purpose : The taste-anchor button. Candidate B's trailing eased glow orb and
 *           continuous chroma blend, inside candidate C's always-visible
 *           rotating metal ring, with the border rendered as a window onto a world.
 * Inputs  : `world` (chrome | sky | gold | neon), `variant`, plus every native
 *           button attribute.
 * Outputs : A single <button>. No wrapper div, so it drops into existing layouts.
 * A11y    : >=48px tall (Rule 2 needs 44), visible focus ring, reduced-motion and
 *           forced-colors handled in `sheenFrame`, decorative layers aria-hidden.
 * Perf    : Pointer tracking is delegated to the ONE shared engine in
 *           `useSheenPointer` — N buttons cost one listener and one rAF loop.
 *
 * Dual-Button Glow (house rule): a sapphire face glows purple, a purple face
 * glows cyan. The variants below encode that pairing; do not add a variant that
 * glows its own hue.
 *
 * @see docs SWA-224 · tokens `styles/sheenPackTokens.ts`
 */

import React, { forwardRef, useRef } from 'react';
import styled, { css } from 'styled-components';
import { CS } from '../../../styles/crystallineSwanTheme';
import { SHEEN, type SheenWorldId } from '../../../styles/sheenPackTokens';
import { useSheenPointer } from '../../../hooks/useSheenPointer';
import { sheenWindow, sheenWorld, sheenReducedMotion, sheenForcedColors } from './sheenFrame';
import { SheenWorldLayers } from './SheenWorldLayers';

export type SheenButtonVariant = 'primary' | 'accent' | 'gilded';

export interface SheenButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Which world is painted inside the frame. Defaults to the chrome default. */
  world?: SheenWorldId;
  /** Face colour + its paired glow. Dual-Button Glow is enforced by the pairing. */
  variant?: SheenButtonVariant;
  /** Stretch to the container width instead of hugging the label. */
  fullWidth?: boolean;
  children?: React.ReactNode;
}

/**
 * Face colour and the orb pair blended across the width.
 * The orb pair is deliberately the OPPOSITE family from the face — that is the
 * Dual-Button Glow rule, expressed as data rather than left to each call site.
 */
const VARIANTS: Record<
  SheenButtonVariant,
  { face: string; text: string; orb: readonly [string, string]; halo: string }
> = {
  primary: {
    face: CS.midnightSapphire,
    text: CS.frostWhite,
    orb: [CS.wingPurple, CS.iceWing],
    halo: `rgba(${CS.rgbWingPurple}, 0.32)`,
  },
  accent: {
    face: CS.wingPurple,
    text: CS.frostWhite,
    orb: [CS.iceWing, CS.arcticCyan],
    halo: `rgba(${CS.rgbIceWing}, 0.34)`,
  },
  gilded: {
    face: CS.royalDepth,
    text: CS.frostWhite,
    orb: [CS.gildedFern, CS.iceWing],
    halo: `rgba(${CS.rgbGildedFern}, 0.3)`,
  },
};

const faceStyles = css<{ $variant: SheenButtonVariant }>`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  /* NOT height: 100%. The root is a flex container with min-height and an auto
     height, so a percentage height is indefinite -> resolves to content height
     (16px), AND an explicit height cancels the flex stretch that would have
     filled the button. The face then paints a thin strip across the top third.
     Browser-verified 2026-09-01; jsdom cannot see this. Stretch instead. */
  align-self: stretch;
  min-height: 100%;
  border-radius: inherit;
  overflow: hidden;
  padding: 0 30px;
  white-space: nowrap;
  color: ${({ $variant }) => VARIANTS[$variant].text};
  /* 3D bevel: top light-catch, bottom depth */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    inset 0 -3px 8px rgba(0, 0, 0, 0.45);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0) 34%),
    ${({ $variant }) => VARIANTS[$variant].face};

  /* the trailing orb — position and colour are driven by the shared engine */
  &::before {
    content: '';
    position: absolute;
    /* left/top take a percentage of the PARENT box, which is what the engine
       writes. A percentage inside translate() would resolve against this 32px
       pseudo-element instead, capping travel at ~32px — the orb would barely
       move. Centre with a fixed -50%, never a variable one. */
    left: var(--px, 50%);
    top: var(--py, 50%);
    width: 32px;
    height: 32px;
    margin: 0;
    border-radius: 50%;
    background: var(--orb, transparent);
    opacity: var(--opac, 0);
    transform: translate(-50%, -50%);
    filter: blur(20px);
    pointer-events: none;
  }
`;

const Root = styled.button<{ $variant: SheenButtonVariant; $world: SheenWorldId; $full: boolean }>`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: stretch;
  border: none;
  padding: 0;
  background: none;
  cursor: pointer;
  /* Rule 2 — 44px is the floor; the sheen frame needs 48 to read properly. */
  min-height: 48px;
  min-width: ${({ $full }) => ($full ? '100%' : '140px')};
  width: ${({ $full }) => ($full ? '100%' : 'auto')};
  border-radius: ${SHEEN.radius.button};
  font: 600 16px/1 'Sora', system-ui, sans-serif;
  letter-spacing: 0.4px;
  box-shadow:
    0 10px 26px rgba(0, 0, 0, 0.55),
    0 0 22px ${({ $variant }) => VARIANTS[$variant].halo};
  transition:
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.3s;

  &:hover {
    transform: translateY(-1px);
    box-shadow:
      0 14px 32px rgba(0, 0, 0, 0.55),
      0 0 34px ${({ $variant }) => VARIANTS[$variant].halo};
  }

  &:active {
    transform: translateY(1px) scale(0.98);
    transition: transform 0.09s cubic-bezier(0.16, 1, 0.3, 1);
  }

  &:focus-visible {
    outline: 2px solid ${CS.wingPurple};
    outline-offset: 4px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover,
    &:active {
      transform: none;
    }
  }

  .sheen-face {
    ${faceStyles}
  }

  .sheen-window {
    ${({ $world }) => css`
      ${sheenWindow('button')}
      ${sheenWorld($world)}
      ${sheenReducedMotion}
      ${sheenForcedColors}
    `}
  }
`;

export const SheenButton = forwardRef<HTMLButtonElement, SheenButtonProps>(function SheenButton(
  { world = 'chrome', variant = 'primary', fullWidth = false, children, type = 'button', ...rest },
  forwardedRef,
) {
  const faceRef = useRef<HTMLSpanElement>(null);
  useSheenPointer(faceRef, { orb: VARIANTS[variant].orb });

  return (
    <Root
      ref={forwardedRef}
      type={type}
      $variant={variant}
      $world={world}
      $full={fullWidth}
      data-sheen-world={world}
      {...rest}
    >
      <span className="sheen-window" aria-hidden="true">
        <SheenWorldLayers world={world} />
      </span>
      <span className="sheen-face" ref={faceRef}>
        {children}
      </span>
    </Root>
  );
});

export default SheenButton;
