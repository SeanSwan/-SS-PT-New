/**
 * ┌─── SUB-COMPONENT: SessionSummaryForm ──────────────────────┐
 * │ PARENT: WorkoutLogger                                       │
 * │ PURPOSE: Session summary with intensity slider, notes,      │
 * │          and real-time workout stats (exercises, sets, time) │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────┐                │
 * │ │ Session Summary                          │                │
 * │ │ ┌─ Intensity ──────────────────────────┐ │                │
 * │ │ │ [●━━━━━━━━━━━━━━━━━━━━━━━] 7/10      │ │                │
 * │ │ └──────────────────────────────────────┘ │                │
 * │ │ ┌─ Notes ──────────────────────────────┐ │                │
 * │ │ │ [textarea]                           │ │                │
 * │ │ └──────────────────────────────────────┘ │                │
 * │ │ [Exercises: 5] [Sets: 18] [~45 min]     │                │
 * │ └──────────────────────────────────────────┘                │
 * │ Props: {                                                    │
 * │   overallIntensity, onIntensityChange,                      │
 * │   sessionNotes, onNotesChange,                              │
 * │   exerciseCount, totalSets, estimatedDuration               │
 * │ }                                                           │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import { Target, Activity, BarChart3, Clock, AlertTriangle } from 'lucide-react';
import { CS } from './WorkoutLoggerCS';

interface SessionSummaryFormProps {
  // Phase 16 (2026-04-16): null = "not rated". The component renders a
  // visibly dimmed slider with "Not rated" text in this state and keeps
  // save enabled — the wire contract omits the field from the payload
  // when null so the backend persists DB null rather than a phantom 5.
  overallIntensity: number | null;
  onIntensityChange: (value: number | null) => void;
  sessionNotes: string;
  onNotesChange: (value: string) => void;
  exerciseCount: number;
  totalSets: number;
  estimatedDuration: number;
}

const SessionSummaryForm: React.FC<SessionSummaryFormProps> = React.memo(({
  overallIntensity,
  onIntensityChange,
  sessionNotes,
  onNotesChange,
  exerciseCount,
  totalSets,
  estimatedDuration,
}) => {
  const isRated = overallIntensity !== null && overallIntensity !== undefined;
  // Render position for the slider handle when "not rated". Using 5
  // (midpoint) is a visual placeholder only — the wire payload omits
  // the field entirely. `$unrated` dims the track so the control
  // reads as "untouched" rather than "picked 5".
  const sliderValue = isRated ? (overallIntensity as number) : 5;

  return (
    <SummaryContainer>
      <SummaryTitle>
        <Target size={20} />
        Session Summary
      </SummaryTitle>

      <SummaryField>
        <label>Overall Session Intensity (1-10, optional):</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <SliderInput
            type="range"
            min={1}
            max={10}
            value={sliderValue}
            $unrated={!isRated}
            onChange={(e) => onIntensityChange(parseInt(e.target.value))}
            aria-label="Session intensity rating"
          />
          <SliderValue $unrated={!isRated}>
            {isRated ? `${overallIntensity}/10` : 'Not rated'}
          </SliderValue>
          {isRated && (
            <ClearRatingButton
              type="button"
              onClick={() => onIntensityChange(null)}
              aria-label="Clear intensity rating"
            >
              Clear
            </ClearRatingButton>
          )}
        </div>
      </SummaryField>

    <SummaryField>
      <label>Session Notes:</label>
      <TextArea
        value={sessionNotes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Overall session notes, client feedback, observations, modifications made..."
        rows={4}
      />
    </SummaryField>

    <StatsGrid>
      <InfoBadge type="info">
        <Activity size={16} />
        Total Exercises: {exerciseCount}
      </InfoBadge>
      <InfoBadge type="info">
        <BarChart3 size={16} />
        Total Sets: {totalSets}
      </InfoBadge>
      <InfoBadge type="info">
        <Clock size={16} />
        Est. Duration: {estimatedDuration} min
      </InfoBadge>
      <InfoBadge type="warning">
        <AlertTriangle size={16} />
        Will Deduct 1 Session
      </InfoBadge>
    </StatsGrid>
  </SummaryContainer>
  );
});

SessionSummaryForm.displayName = 'SessionSummaryForm';
export default SessionSummaryForm;

// ── Styled Components ──

const SummaryContainer = styled.div`
  background: ${CS.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid ${CS.glassBorder};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  @media (max-width: 430px) {
    padding: 1.25rem;
    border-radius: 1rem;
  }
`;

const SummaryTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: ${CS.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  letter-spacing: -0.01em;

  svg { color: ${CS.accent}; }
`;

const SummaryField = styled.div`
  margin-bottom: 1.5rem;
  &:last-child { margin-bottom: 0; }

  label {
    display: block;
    font-weight: 600;
    color: ${CS.textSecondary};
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-family: 'Sora', sans-serif;
  }
`;

// Phase 16 (2026-04-16): `$unrated` dims the slider when overallIntensity
// is null, giving the control a visibly distinct "not rated" state so
// users don't confuse it with a deliberate 5/10 rating.
const SliderInput = styled.input<{ $unrated?: boolean }>`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(96, 192, 240, 0.15), rgba(80, 160, 240, 0.2));
  outline: none;
  appearance: none;
  opacity: ${({ $unrated }) => ($unrated ? 0.35 : 1)};
  transition: opacity 0.2s ease;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${CS.glow}, ${CS.gaming});
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(80, 160, 240, 0.4), 0 0 12px rgba(80, 160, 240, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.2);
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${CS.glow}, ${CS.gaming});
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 8px rgba(80, 160, 240, 0.4);
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 4px;
  }
`;

const SliderValue = styled.span<{ $unrated?: boolean }>`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ $unrated }) => ($unrated ? 'rgba(224, 236, 244, 0.5)' : CS.glowLight)};
  font-style: ${({ $unrated }) => ($unrated ? 'italic' : 'normal')};
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  min-width: 2.5rem;
  text-align: right;
`;

// Phase 16: small "Clear" button shown only when an intensity value is
// set. Gives the user an explicit path from "rated 7/10" back to
// "not rated" — otherwise the slider can only move between 1 and 10
// once touched, and there's no natural way to unpick a rating.
const ClearRatingButton = styled.button`
  min-height: 44px;
  min-width: 44px;
  padding: 0 0.75rem;
  border-radius: 0.5rem;
  background: transparent;
  border: 1px solid rgba(224, 236, 244, 0.15);
  color: rgba(224, 236, 244, 0.7);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;

  &:hover {
    border-color: rgba(224, 236, 244, 0.35);
    color: rgba(224, 236, 244, 0.95);
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 4px;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 1rem;
  background: rgba(20, 20, 25, 0.7);
  border: 1px solid ${CS.glassBorder};
  border-radius: 0.75rem;
  color: ${CS.text};
  font-size: 0.9rem;
  font-family: 'Sora', sans-serif;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 2px rgba(80, 160, 240, 0.15);
  }

  &::placeholder { color: rgba(224, 236, 244, 0.4); }
`;

const InfoBadge = styled.div<{ type: 'warning' | 'info' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border-radius: 2rem;
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  min-height: 44px;
  backdrop-filter: blur(8px);
  background: ${props =>
    props.type === 'warning' ? CS.warningBg :
    props.type === 'success' ? CS.successBg :
    CS.infoBg
  };
  border: 1px solid ${props =>
    props.type === 'warning' ? CS.warningBorder :
    props.type === 'success' ? CS.successBorder :
    CS.infoBorder
  };
  color: ${props =>
    props.type === 'warning' ? CS.warningText :
    props.type === 'success' ? CS.successText :
    CS.glowLight
  };
  svg { flex-shrink: 0; }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 1.5rem;
`;
