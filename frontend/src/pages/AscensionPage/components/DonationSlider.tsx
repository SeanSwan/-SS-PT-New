import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import type { DonationTier } from '../../../hooks/useSubscription';

interface DonationSliderProps {
  min: number;
  max: number;
  value: number;
  suggested: number;
  donationTiers?: DonationTier[];
  onChange: (value: number) => void;
}

const TICKS = [1, 5, 10, 25, 50];

const DonationSlider: React.FC<DonationSliderProps> = ({
  min, max, value, suggested, donationTiers = [], onChange,
}) => {
  const pct = ((value - min) / (max - min)) * 100;

  const currentLabel = useMemo(() => {
    const tier = donationTiers.find(t => value >= t.minAmount && value <= t.maxAmount);
    return tier?.label || '';
  }, [value, donationTiers]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  }, [onChange]);

  return (
    <SliderWrapper>
      <SliderHeader>
        <DonationAmount>${value}<span> donation</span></DonationAmount>
        {currentLabel && <TierLabel>{currentLabel}</TierLabel>}
      </SliderHeader>

      <SliderTrackWrapper>
        <SliderInput
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={handleChange}
          $pct={pct}
          role="slider"
          aria-label="Donation amount"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={`$${value} one-time donation — ${currentLabel}`}
        />
      </SliderTrackWrapper>

      <TickMarks>
        {TICKS.map(tick => (
          <Tick
            key={tick}
            $active={value >= tick}
            $position={((tick - min) / (max - min)) * 100}
            onClick={() => onChange(tick)}
            aria-label={`Set donation to $${tick}`}
          >
            ${tick}
          </Tick>
        ))}
      </TickMarks>

      <SuggestedNote>Suggested: ${suggested} — your support keeps SwanStudios free for everyone</SuggestedNote>
    </SliderWrapper>
  );
};

export default DonationSlider;

const SliderWrapper = styled.div`
  width: 100%;
  padding: 1rem 0;
`;

const SliderHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const DonationAmount = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 2rem;
  color: var(--text-primary, #E0ECF4);
  span {
    font-size: 1rem;
    font-weight: 400;
    opacity: 0.6;
    margin-left: 2px;
  }
`;

const TierLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: #C6A84B;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SliderTrackWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
`;

const SliderInput = styled.input<{ $pct: number }>`
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 44px;
  background: transparent;
  cursor: pointer;

  &::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(
      to right,
      #C6A84B 0%,
      #C6A84B ${({ $pct }) => $pct}%,
      #1A1A24 ${({ $pct }) => $pct}%,
      #1A1A24 100%
    );
  }

  &::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: #1A1A24;
  }

  &::-moz-range-progress {
    height: 6px;
    border-radius: 3px;
    background: #C6A84B;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 24px;
    width: 24px;
    border-radius: 50%;
    background: #C6A84B;
    box-shadow: 0 0 12px rgba(198, 168, 75, 0.6);
    margin-top: -9px;
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    border: none;
  }

  &::-moz-range-thumb {
    height: 24px;
    width: 24px;
    border-radius: 50%;
    background: #C6A84B;
    box-shadow: 0 0 12px rgba(198, 168, 75, 0.6);
    cursor: pointer;
    border: none;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }

  &:focus {
    outline: none;
  }

  &:focus-visible::-webkit-slider-thumb {
    border: 2px solid #8B5CF6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.3), 0 0 12px rgba(198, 168, 75, 0.6);
  }
`;

const TickMarks = styled.div`
  position: relative;
  width: 100%;
  height: 1.5rem;
  margin-top: 0.25rem;
`;

const Tick = styled.button<{ $active: boolean; $position: number }>`
  position: absolute;
  left: ${({ $position }) => $position}%;
  transform: translateX(-50%);
  background: none;
  border: none;
  padding: 0;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: ${({ $active }) => $active ? '#C6A84B' : 'rgba(224, 236, 244, 0.3)'};
  cursor: pointer;
  min-width: 44px;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover { color: #C6A84B; }
`;

const SuggestedNote = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: rgba(224, 236, 244, 0.4);
  margin-top: 0.75rem;
  text-align: center;
`;
