/**
 * SheenCard — Forge Sheen-tier card (SWA-224)
 * ============================================
 * BLUEPRINT
 * ---------
 * Purpose : The card sibling of SheenButton. Sean's note on candidate C was that
 *           the SheenCard is "pretty much perfect" — so the geometry and surface
 *           are kept as they were and only the frame is crowned with the world.
 * Inputs  : `world`, optional `interactive`, plus native div attributes.
 * Outputs : A single <div> (or <button> semantics via `onClick` + `interactive`).
 * A11y    : A card is a container, not a control, unless `interactive` is set —
 *           in which case it gets a real role, tabindex, keyboard activation and
 *           a focus ring. Decorative layers are aria-hidden.
 * Perf    : Shares the one pointer engine with every other Sheen surface.
 *
 * Frame weight is 6px here, not the button's 4.5px. That is decision 2: worlds
 * are not legible below 6px, and a card has the room a 44px control does not.
 *
 * SWAN CARD STANDARD (CLAUDE.md): "Client/data cards ... must stay low-motion:
 * no pointer tracking, no heavy animation loops, no hover-only actions." The
 * Forge encodes the same split as `.sw-card--showcase` (motion allowed) vs
 * `.sw-card--data` (low-motion, no pointer tracking). This component therefore
 * defaults to `data` — the SAFE side. A card only tracks the pointer when a
 * caller explicitly asks for `showcase`, so the violation cannot happen by
 * omission. The first version of this file tracked unconditionally and shipped
 * that way; caught 2026-09-01 reading the Forge's own card spec.
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

/**
 * `showcase` sells something (store, feature, hero) and may move.
 * `data` presents a client/trainer/measurement record and must not.
 */
export type SheenCardSurface = 'showcase' | 'data';

export interface SheenCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which world is painted inside the frame. */
  world?: SheenWorldId;
  /**
   * Motion tier. Defaults to `data` — the low-motion side — so a client or
   * measurement card cannot acquire pointer tracking by forgetting a prop.
   */
  surface?: SheenCardSurface;
  /**
   * Make the whole card activatable. Adds button semantics, keyboard support
   * and a focus ring. Leave false for a plain container — a non-interactive
   * card must not advertise itself to assistive tech as something to press.
   */
  interactive?: boolean;
  children?: React.ReactNode;
}

const Root = styled.div<{ $world: SheenWorldId; $interactive: boolean }>`
  position: relative;
  isolation: isolate;
  border-radius: ${SHEEN.radius.card};
  padding: 22px;
  color: ${CS.textSecondary};
  background: linear-gradient(
    160deg,
    rgba(${CS.rgbRoyalDepth}, 0.42),
    rgba(${CS.rgbMidnightSapphire}, 0.72)
  );
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
  transition:
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.35s;

  ${({ $interactive }) =>
    $interactive &&
    css`
      cursor: pointer;

      &:hover {
        transform: translateY(-2px);
        box-shadow:
          0 28px 68px rgba(0, 0, 0, 0.45),
          0 0 30px rgba(${CS.rgbIceWing}, 0.3);
      }

      &:focus-visible {
        outline: 2px solid ${CS.wingPurple};
        outline-offset: 4px;
      }
    `}

  /* pointer wash — same engine, driven by the same custom properties */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    border-radius: inherit;
    pointer-events: none;
    mix-blend-mode: screen;
    opacity: var(--opac, 0);
    background: radial-gradient(
      320px circle at var(--px, 50%) var(--py, 50%),
      rgba(${CS.rgbIceWing}, 0.32),
      transparent 55%
    );
  }

  > .sheen-body {
    position: relative;
    z-index: 2;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }

  .sheen-window {
    ${({ $world }) => css`
      ${sheenWindow('card')}
      ${sheenWorld($world)}
      ${sheenReducedMotion}
      ${sheenForcedColors}
    `}
  }
`;

/** Stable empty ref: registering this is a no-op, which is how a data card opts out. */
const nullRef: React.RefObject<HTMLDivElement | null> = { current: null };

export const SheenCard = forwardRef<HTMLDivElement, SheenCardProps>(function SheenCard(
  { world = 'sky', surface = 'data', interactive = false, children, onClick, onKeyDown, ...rest },
  forwardedRef,
) {
  const selfRef = useRef<HTMLDivElement>(null);
  // Only a showcase card tracks the pointer. Passing a null ref to the hook
  // registers nothing, so a data card costs the engine nothing at all.
  const trackedRef = surface === 'showcase' ? selfRef : nullRef;
  useSheenPointer(trackedRef);

  const setRefs = (node: HTMLDivElement | null) => {
    (selfRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) {
      (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  // Space and Enter must activate an interactive card, or it is mouse-only —
  // the exact defect a hostile review caught on the SwanGuard shell.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (!interactive || e.defaultPrevented) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      (e.currentTarget as HTMLDivElement).click();
    }
  };

  return (
    <Root
      ref={setRefs}
      $world={world}
      $interactive={interactive}
      data-sheen-world={world}
      data-sheen-surface={surface}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      <span className="sheen-window" aria-hidden="true">
        <SheenWorldLayers world={world} />
      </span>
      <div className="sheen-body">{children}</div>
    </Root>
  );
});

export default SheenCard;
