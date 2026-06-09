/**
 * FILE: DonationSlider.tsx
 * PURPOSE: Render the Guardian pay-what-you-can amount control on Ascension.
 * LAST VALIDATED: 2026-06-09 via DonationSlider theme contract and Ascension visual smoke.
 */
import React, { useCallback, useMemo } from 'react';
import type { DonationTier } from '../../../hooks/useSubscription';
import {
  DonationAmount,
  SliderHeader,
  SliderInput,
  SliderTrackWrapper,
  SliderWrapper,
  SuggestedNote,
  Tick,
  TickMarks,
  TierLabel,
} from './DonationSlider.styles';

interface DonationSliderProps {
  min: number;
  max: number;
  value: number;
  suggested: number;
  donationTiers?: DonationTier[];
  onChange: (value: number) => void;
}

const TICKS = [1, 5, 10, 25, 50];

const clampPct = (value: number, min: number, max: number) => {
  const range = Math.max(max - min, 1);
  return Math.min(100, Math.max(0, ((value - min) / range) * 100));
};

const DonationSlider: React.FC<DonationSliderProps> = ({
  min,
  max,
  value,
  suggested,
  donationTiers = [],
  onChange,
}) => {
  const pct = clampPct(value, min, max);
  const visibleTicks = useMemo(
    () => TICKS.filter(tick => tick >= min && tick <= max),
    [max, min],
  );

  const currentLabel = useMemo(() => {
    const tier = donationTiers.find(t => value >= t.minAmount && value <= t.maxAmount);
    return tier?.label || '';
  }, [value, donationTiers]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value));
  }, [onChange]);

  const handleTick = useCallback((tick: number) => {
    onChange(tick);
  }, [onChange]);

  const donationAriaText = currentLabel
    ? `$${value} one-time donation - ${currentLabel}`
    : `$${value} one-time donation`;

  return (
    <SliderWrapper>
      <SliderHeader>
        <DonationAmount>
          ${value}
          <span> donation</span>
        </DonationAmount>
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
          aria-label="Donation amount"
          aria-valuetext={donationAriaText}
        />
      </SliderTrackWrapper>

      <TickMarks>
        {visibleTicks.map(tick => (
          <Tick
            key={tick}
            $active={value >= tick}
            $position={clampPct(tick, min, max)}
            aria-label={`Set donation to $${tick}`}
            aria-pressed={value === tick}
            onClick={() => handleTick(tick)}
            type="button"
          >
            ${tick}
          </Tick>
        ))}
      </TickMarks>

      <SuggestedNote>
        Suggested: ${suggested} - your support keeps SwanStudios free for everyone
      </SuggestedNote>
    </SliderWrapper>
  );
};

export default DonationSlider;
