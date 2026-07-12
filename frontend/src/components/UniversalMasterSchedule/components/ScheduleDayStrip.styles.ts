/**
 * ============================================================================
 * SCHEDULE DAY STRIP — STYLES (Crystalline glass ribbon, lens-aware)
 * ============================================================================
 * The MindBody-class date ribbon, Swan-upgraded: obsidian glass rail
 * (C12), electric ice active state with the Dual-Button Glow discipline,
 * gold badge dots for session counts, scroll-snap chips at the 44px
 * floor, and safe-area honesty on notched phones. Sticky on phone
 * viewports so day navigation never scrolls away mid-schedule; a calm
 * inline ribbon on desktop. Uses the device-matrix media builders — this
 * is the first production consumer of the portable package.
 * ============================================================================
 */
import styled from 'styled-components';
import { media, safeArea, TOUCH_TARGET_MIN_PX } from '../../../styles/device-matrix';

export const StripRail = styled.nav`
  position: relative;
  z-index: 24;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 8px clamp(10px, 1.4vw, 18px);
  background: linear-gradient(
    135deg,
    rgba(20, 20, 25, 0.85),
    rgba(26, 26, 36, 0.75)
  );
  backdrop-filter: blur(18px) saturate(130%);
  border-block: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 18%, transparent);

  ${media.phone} {
    position: sticky;
    top: 0;
    padding-left: ${safeArea('left', '10px')};
    padding-right: ${safeArea('right', '10px')};
  }
`;

export const StripScroller = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  overscroll-behavior-x: contain;
  padding: 2px;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--ice-wing, #60c0f0) 35%, transparent);
    border-radius: 4px;
  }
`;

export const DayChipButton = styled.button<{ $active: boolean; $today: boolean }>`
  flex: 0 0 auto;
  scroll-snap-align: center;
  min-width: 58px;
  min-height: ${TOUCH_TARGET_MIN_PX + 12}px;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 1px;
  padding: 5px 8px;
  cursor: pointer;
  border-radius: 14px;
  border: 1px solid
    ${({ $active, $today }) =>
      $active
        ? 'var(--ice-wing, #60c0f0)'
        : $today
          ? 'color-mix(in srgb, var(--gilded-fern, #c6a84b) 55%, transparent)'
          : 'color-mix(in srgb, var(--frost-white, #e0ecf4) 10%, transparent)'};
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(160deg, var(--midnight-sapphire, #002060), var(--royal-depth, #003080))'
      : 'color-mix(in srgb, var(--carbon, #141419) 72%, transparent)'};
  color: var(--frost-white, #e0ecf4);
  box-shadow: ${({ $active }) =>
    $active
      ? '0 0 18px color-mix(in srgb, var(--wing-purple, #8b5cf6) 45%, transparent)'
      : 'none'};
  transition: transform 160ms ease, box-shadow 160ms ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: translateY(-2px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }

  &:focus-visible {
    outline: 3px solid var(--wing-purple, #8b5cf6);
    outline-offset: 2px;
  }

  .dow {
    font: 650 9px/1 'Fira Code', monospace;
    text-transform: uppercase;
    color: ${({ $active }) =>
      $active ? 'var(--ice-wing, #60c0f0)' : 'var(--text-secondary, #b8c8d8)'};
  }

  .day {
    font: 800 17px/1.1 'Plus Jakarta Sans', sans-serif;
  }

  .month {
    font: 650 8px/1 'Fira Code', monospace;
    color: var(--gilded-fern, #c6a84b);
    text-transform: uppercase;
    min-height: 9px;
  }
`;

export const SessionBadge = styled.em`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--gilded-fern, #c6a84b);
  color: var(--obsidian-black, #0a0a0f);
  font: 800 9px/1 'Fira Code', monospace;
  font-style: normal;
  pointer-events: none;
`;

export const ChipShell = styled.span`
  position: relative;
  display: inline-flex;
`;

export const EdgeButton = styled.button`
  flex: 0 0 auto;
  min-width: ${TOUCH_TARGET_MIN_PX}px;
  min-height: ${TOUCH_TARGET_MIN_PX}px;
  display: grid;
  place-items: center;
  cursor: pointer;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 32%, transparent);
  background: color-mix(in srgb, var(--carbon, #141419) 80%, transparent);
  color: var(--frost-white, #e0ecf4);

  &:focus-visible {
    outline: 3px solid var(--wing-purple, #8b5cf6);
    outline-offset: 2px;
  }
`;

export const TodayPill = styled(EdgeButton)`
  padding: 0 12px;
  font: 750 12px/1 'Sora', sans-serif;
  border-color: color-mix(in srgb, var(--gilded-fern, #c6a84b) 50%, transparent);
  color: var(--gilded-fern, #c6a84b);
`;
