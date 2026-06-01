/**
 * SUB-COMPONENT: SessionSummaryForm
 * PARENT: WorkoutLogger
 * PURPOSE: Session summary with intensity, notes, stats, and session deduction signal.
 */
import React from 'react';
import { Target, Activity, BarChart3, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  ClearRatingButton,
  InfoBadge,
  IntensityControlRow,
  SliderInput,
  SliderValue,
  StatsGrid,
  SummaryContainer,
  SummaryField,
  SummaryTitle,
  TextArea,
} from './SessionSummaryForm.styles';

interface SessionSummaryFormProps {
  // null = "not rated"; submit payload omits the field instead of saving a phantom 5.
  overallIntensity: number | null;
  onIntensityChange: (value: number | null) => void;
  sessionNotes: string;
  onNotesChange: (value: string) => void;
  exerciseCount: number;
  totalSets: number;
  estimatedDuration: number;
  clientSource?: string | null;
}

const SessionSummaryForm: React.FC<SessionSummaryFormProps> = React.memo(({
  overallIntensity,
  onIntensityChange,
  sessionNotes,
  onNotesChange,
  exerciseCount,
  totalSets,
  estimatedDuration,
  clientSource,
}) => {
  const isRated = overallIntensity !== null && overallIntensity !== undefined;
  const sliderValue = isRated ? (overallIntensity as number) : 5;
  const isNonDeductingClient = clientSource === 'move_fitness' || clientSource === 'external';
  const DeductionIcon = isNonDeductingClient ? CheckCircle : AlertTriangle;
  const deductionLabel = isNonDeductingClient ? 'No Paid Session Deduction' : 'Will Deduct 1 Session';

  return (
    <SummaryContainer>
      <SummaryTitle>
        <Target size={20} />
        Session Summary
      </SummaryTitle>

      <SummaryField>
        <label>Overall Session Intensity (1-10, optional):</label>
        <IntensityControlRow>
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
        </IntensityControlRow>
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
        <InfoBadge type={isNonDeductingClient ? 'success' : 'warning'}>
          <DeductionIcon size={16} />
          {deductionLabel}
        </InfoBadge>
      </StatsGrid>
    </SummaryContainer>
  );
});

SessionSummaryForm.displayName = 'SessionSummaryForm';
export default SessionSummaryForm;
