/**
 * FILE: SwanRankBadge.styles.ts
 * PURPOSE: Styled surface for the Swan rank badge frame. Internal-glow lighting
 *          only (no drop shadows — mud on the vault). Companion culled < 768px
 *          (Kimi mobile-density mandate). One styled wrapper; dynamics as vars.
 */

import styled from 'styled-components';

export const BadgeWrap = styled.div`
  position: relative;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;

  svg { display: block; }

  .badge-frame-edge {
    /* internal glow, not a drop shadow */
    filter: drop-shadow(0 0 4px color-mix(in srgb, var(--ice-wing, #60c0f0) 30%, transparent));
  }

  /* Sovereign (rank 10): a gold facet fringe on the frame edge. */
  &[data-sovereign='true'] .badge-frame-edge {
    filter: drop-shadow(0 0 8px color-mix(in srgb, var(--gilded-fern, #c6a84b) 55%, transparent));
  }

  .badge-ring-slot {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
`;

export const BadgeCrown = styled.div`
  position: absolute;
  top: -6%;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--gilded-fern, #c6a84b) 45%, transparent));
`;

export const BadgePips = styled.div`
  position: absolute;
  bottom: 8%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 3px;
  pointer-events: none;

  .pip {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--frost-white, #e0ecf4) 14%, transparent);
    transition: background var(--speed-snap, 160ms) var(--ease-snap, cubic-bezier(0.16, 1, 0.3, 1));
  }
  .pip.on {
    box-shadow: 0 0 4px color-mix(in srgb, var(--ice-wing, #60c0f0) 45%, transparent);
  }

  @media (max-width: 414px) {
    .pip { width: 4px; height: 4px; }
  }
`;

export const BadgeRankLabel = styled.span`
  position: absolute;
  bottom: -14%;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gilded-fern, #c6a84b);
`;

export const CompanionSlot = styled.div`
  position: absolute;
  top: 4%;
  right: 2%;
  pointer-events: none;

  /* Kimi mobile-density: companion retreats into the menagerie < 768px so the
     badge never looks broken with a 10px noise-sprite on it. */
  @media (max-width: 767px) {
    display: none;
  }
`;
