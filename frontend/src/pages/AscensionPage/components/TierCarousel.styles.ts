/**
 * FILE: TierCarousel.styles.ts
 * PURPOSE: Crystalline Swan mobile carousel styles for Ascension tier cards.
 * LAST VALIDATED: 2026-06-09 via TierCarousel contract and Ascension mobile Guardian smoke.
 */
import styled from 'styled-components';

const cyan = 'var(--accent-primary, #60C0F0)';
const mutedDot = 'color-mix(in srgb, var(--text-primary, #E0ECF4) 22%, transparent)';

export const CarouselWrapper = styled.div`
  width: 100%;
  overflow: hidden;
`;

export const ScrollContainer = styled.div`
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding: 0 7.5vw;
  scroll-padding-inline: 7.5vw;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }

  & > * {
    flex: 0 0 85vw;
    scroll-snap-align: center;
  }
`;

export const DotIndicators = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.35rem 0 0.5rem;
`;

export const Dot = styled.button<{ $active: boolean }>`
  position: relative;
  width: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $active }) => $active ? cyan : mutedDot};
    box-shadow: ${({ $active }) => $active
      ? `0 0 14px color-mix(in srgb, ${cyan} 58%, transparent)`
      : 'none'};
    transform: translate(-50%, -50%) scale(${({ $active }) => $active ? 1.28 : 1});
    transition: background 0.24s ease, box-shadow 0.24s ease, transform 0.24s ease;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -8px;
  }
`;
