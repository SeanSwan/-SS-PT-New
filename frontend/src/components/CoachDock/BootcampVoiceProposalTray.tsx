/**
 * Voice proposal review boundary for Bootcamp Builder.
 * A spoken exercise name stays inert until the trainer confirms a canonical
 * Workout Rolodex match. Free-text inventions can never enter the class.
 */
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useExerciseSearch, type ExerciseSlim } from '../WorkoutLogger/useExerciseSearch';

export interface BootcampVoiceProposal {
  exerciseName: string;
  stationIndex?: number;
}

interface Props {
  proposal: BootcampVoiceProposal;
  onApplyExercise: (exercise: ExerciseSlim, stationIndex?: number) => void;
  onDismiss: () => void;
}

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

const BootcampVoiceProposalTray: React.FC<Props> = ({ proposal, onApplyExercise, onDismiss }) => {
  const { allExercises, isLoading, loadError } = useExerciseSearch();
  const match = useMemo(
    () => allExercises.find((exercise) => normalize(exercise.name) === normalize(proposal.exerciseName)),
    [allExercises, proposal.exerciseName],
  );
  const target = proposal.stationIndex == null ? 'the next available station' : `Station ${proposal.stationIndex + 1}`;
  const unavailable = !isLoading && !match;

  return (
    <Tray aria-live="polite" aria-label="Voice exercise proposal review">
      <Eyebrow>Voice proposal · review required</Eyebrow>
      <Title>{proposal.exerciseName} <span>→ {target}</span></Title>
      <Copy>The class has not changed. Confirm only after checking this is the exercise you want.</Copy>
      {isLoading && <Status>Checking the Workout Rolodex…</Status>}
      {loadError && <Status role="alert">The Rolodex is unavailable. Try again after it reloads.</Status>}
      {unavailable && !loadError && <Status role="alert">Could not find an exact Rolodex match. Use the Rolodex to choose an approved exercise.</Status>}
      <Actions>
        <Action type="button" onClick={() => match && onApplyExercise(match, proposal.stationIndex)} disabled={!match || isLoading}>
          Apply {proposal.exerciseName}
        </Action>
        <Dismiss type="button" onClick={onDismiss}>Dismiss</Dismiss>
      </Actions>
    </Tray>
  );
};

const Tray = styled.section`
  margin: 0 16px 12px;
  padding: 14px;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 14px;
  background: linear-gradient(135deg, var(--bg-elevated, #003080), var(--bg-surface, #141419));
  color: var(--text-primary, #E0ECF4);
  box-shadow: 0 10px 28px rgba(0, 32, 96, 0.32);
`;
const Eyebrow = styled.p`
  margin: 0 0 4px;
  color: var(--accent-primary, #60C0F0);
  font: 700 0.72rem/1.3 var(--font-ui, Sora, sans-serif);
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;
const Title = styled.h3`
  margin: 0;
  font: 700 1rem/1.35 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  span { color: var(--text-secondary, #b6c8d8); font-weight: 500; }
`;
const Copy = styled.p`
  margin: 6px 0 0;
  color: var(--text-secondary, #b6c8d8);
  font-size: 0.84rem;
  line-height: 1.45;
`;
const Status = styled.p`
  margin: 8px 0 0;
  color: var(--accent-warning, #C6A84B);
  font-size: 0.82rem;
  line-height: 1.4;
`;
const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;
const Button = styled.button`
  min-height: 44px;
  padding: 0 14px;
  border-radius: 10px;
  font: 700 0.84rem/1 var(--font-ui, Sora, sans-serif);
  cursor: pointer;
  &:focus-visible { outline: 3px solid var(--focus-ring, #8B5CF6); outline-offset: 2px; }
  &:disabled { cursor: not-allowed; opacity: 0.52; }
`;
const Action = styled(Button)`
  border: 1px solid var(--accent-primary, #60C0F0);
  background: var(--button-primary, #002060);
  color: var(--text-primary, #E0ECF4);
`;
const Dismiss = styled(Button)`
  border: 1px solid var(--border-subtle, #4070C0);
  background: transparent;
  color: var(--text-primary, #E0ECF4);
`;

export default BootcampVoiceProposalTray;
