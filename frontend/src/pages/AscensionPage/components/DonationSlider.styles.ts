/**
 * FILE: DonationSlider.styles.ts
 * PURPOSE: Crystalline Swan styles for the Guardian pay-what-you-can slider.
 * LAST VALIDATED: 2026-06-09 via DonationSlider theme contract and Ascension visual smoke.
 */
import styled from 'styled-components';

const gold = 'var(--gilded-fern, #C6A84B)';
const textPrimary = 'var(--text-primary, #E0ECF4)';
const textMuted = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 48%, transparent))';
const rail = 'var(--surface-dark, #1A1A24)';

export const SliderWrapper = styled.div`
  width: 100%;
  padding: 0.75rem 0 0.85rem;
`;

export const SliderHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.55rem;
`;

export const DonationAmount = styled.div`
  color: ${textPrimary};
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.75rem, 4vw, 2rem);
  font-weight: 850;
  line-height: 1;
  letter-spacing: 0;

  span {
    margin-left: 0.15rem;
    color: ${textMuted};
    font-size: 1rem;
    font-weight: 500;
  }
`;

export const TierLabel = styled.span`
  color: ${gold};
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const SliderTrackWrapper = styled.div`
  position: relative;
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
`;

export const SliderInput = styled.input<{ $pct: number }>`
  width: 100%;
  min-height: 44px;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;

  &::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 6px;
    background: linear-gradient(
      to right,
      ${gold} 0%,
      ${gold} ${({ $pct }) => $pct}%,
      ${rail} ${({ $pct }) => $pct}%,
      ${rail} 100%
    );
  }

  &::-moz-range-track {
    height: 6px;
    border-radius: 6px;
    background: ${rail};
  }

  &::-moz-range-progress {
    height: 6px;
    border-radius: 6px;
    background: ${gold};
  }

  &::-webkit-slider-thumb {
    width: 24px;
    height: 24px;
    margin-top: -9px;
    border: 0;
    border-radius: 50%;
    background: ${gold};
    box-shadow: 0 0 12px color-mix(in srgb, var(--gilded-fern, #C6A84B) 58%, transparent);
    cursor: pointer;
    -webkit-appearance: none;
    transition: box-shadow 0.2s ease, transform 0.2s ease;
  }

  &::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 50%;
    background: ${gold};
    box-shadow: 0 0 12px color-mix(in srgb, var(--gilded-fern, #C6A84B) 58%, transparent);
    cursor: pointer;
    transition: box-shadow 0.2s ease, transform 0.2s ease;
  }

  &::-webkit-slider-thumb:hover,
  &::-moz-range-thumb:hover {
    transform: scale(1.12);
  }

  &:focus {
    outline: none;
  }

  &:focus-visible::-webkit-slider-thumb,
  &:focus-visible::-moz-range-thumb {
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--wing-purple, #8B5CF6) 36%, transparent),
      0 0 12px color-mix(in srgb, var(--gilded-fern, #C6A84B) 58%, transparent);
  }
`;

export const TickMarks = styled.div`
  position: relative;
  width: 100%;
  min-height: 44px;
  margin-top: -0.1rem;
`;

export const Tick = styled.button<{ $active: boolean; $position: number }>`
  position: absolute;
  left: ${({ $position }) => $position}%;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ $active }) => $active ? gold : textMuted};
  cursor: pointer;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0;
  transform: translateX(-50%);
  transition: color 0.2s ease, transform 0.2s ease;

  &:hover {
    color: ${gold};
    transform: translateX(-50%) translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -6px;
  }
`;

export const SuggestedNote = styled.p`
  max-width: 24rem;
  margin: 0.15rem auto 0;
  color: ${textMuted};
  font-family: 'Sora', sans-serif;
  font-size: 0.74rem;
  line-height: 1.45;
  text-align: center;
`;
