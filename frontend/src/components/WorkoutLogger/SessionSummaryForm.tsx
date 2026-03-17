/**
 * SessionSummaryForm — Intensity slider, notes, and workout stats
 * Extracted from WorkoutLogger monolith
 */
import React from 'react';
import styled from 'styled-components';
import { Target, Activity, BarChart3, Clock, AlertTriangle } from 'lucide-react';
import { CS } from './WorkoutLoggerCS';

interface SessionSummaryFormProps {
  overallIntensity: number;
  onIntensityChange: (value: number) => void;
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
}) => (
  <SummaryContainer>
    <SummaryTitle>
      <Target size={20} />
      Session Summary
    </SummaryTitle>

    <SummaryField>
      <label>Overall Session Intensity (1-10):</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <SliderInput
          type="range"
          min={1}
          max={10}
          value={overallIntensity}
          onChange={(e) => onIntensityChange(parseInt(e.target.value))}
        />
        <SliderValue>{overallIntensity}/10</SliderValue>
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
));

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

const SliderInput = styled.input`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(96, 192, 240, 0.15), rgba(80, 160, 240, 0.2));
  outline: none;
  appearance: none;

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

const SliderValue = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${CS.glowLight};
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  min-width: 2.5rem;
  text-align: right;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 1rem;
  background: rgba(0, 48, 128, 0.4);
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
