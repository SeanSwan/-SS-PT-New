import React from 'react';
import { CheckCircle2, ListChecks, Plus } from 'lucide-react';
import ExerciseMediaPreview from '../../../WorkoutLogger/ExerciseMediaPreview';
import type {
  SwanCoachGenerationMode,
  WorkoutGuidedCandidateExercise,
  WorkoutGuidedCandidatesResponse,
} from './WorkoutPlannerGuidedCandidateTypes';
import {
  CandidateAddButton,
  CandidateEmpty,
  CandidateMetaPill,
  CandidateMetaRow,
  CandidateName,
  CandidateNote,
  GuidedCandidateCard,
  GuidedCandidateGrid,
  GuidedCandidatesClear,
  GuidedCandidatesHeader,
  GuidedCandidatesMeta,
  GuidedCandidatesTitle,
  GuidedCandidatesWrap,
  GuidedSlot,
  GuidedSlotInstruction,
} from './WorkoutPlannerGuidedCandidatesPanel.styles';

interface WorkoutPlannerGuidedCandidatesPanelProps {
  candidates: WorkoutGuidedCandidatesResponse | null;
  generationMode: SwanCoachGenerationMode;
  generatingCandidates: boolean;
  onSelectCandidate: (candidate: WorkoutGuidedCandidateExercise) => void;
  onClearCandidates: () => void;
}

const modeLabel = (generationMode: SwanCoachGenerationMode) => {
  if (generationMode === 'deep_grill') return 'Deep Grill';
  if (generationMode === 'guide_me') return 'Guide Me';
  return 'Auto';
};

const candidateNote = (candidate: WorkoutGuidedCandidateExercise) => (
  candidate.readinessNote || candidate.selectionReason || 'Ready for trainer selection.'
);

const hasRestValue = (restSeconds: WorkoutGuidedCandidateExercise['restSeconds']) => (
  restSeconds !== undefined && restSeconds !== null && Number.isFinite(Number(restSeconds))
);

const candidateTrainingParams = (candidate: WorkoutGuidedCandidateExercise) => [
  candidate.sets && candidate.reps ? `${candidate.sets} x ${candidate.reps}` : null,
  candidate.tempo ? `Tempo ${candidate.tempo}` : null,
  hasRestValue(candidate.restSeconds) ? `${candidate.restSeconds}s rest` : null,
].filter(Boolean) as string[];

const WorkoutPlannerGuidedCandidatesPanel: React.FC<WorkoutPlannerGuidedCandidatesPanelProps> = ({
  candidates,
  generationMode,
  generatingCandidates,
  onSelectCandidate,
  onClearCandidates,
}) => {
  if (!candidates && !generatingCandidates) return null;

  return (
    <GuidedCandidatesWrap aria-live="polite">
      <GuidedCandidatesHeader>
        <GuidedCandidatesTitle>
          <ListChecks size={16} /> Exercise Options
          <GuidedCandidatesMeta>{modeLabel(generationMode)}</GuidedCandidatesMeta>
        </GuidedCandidatesTitle>
        {candidates ? (
          <GuidedCandidatesClear type="button" onClick={onClearCandidates}>Clear</GuidedCandidatesClear>
        ) : null}
      </GuidedCandidatesHeader>

      {generatingCandidates ? (
        <GuidedSlotInstruction>Building exercise options...</GuidedSlotInstruction>
      ) : null}

      {candidates?.slots.map(slot => (
        <GuidedSlot key={slot.slotId}>
          <GuidedSlotInstruction>{slot.instruction}</GuidedSlotInstruction>
          {slot.candidates.length > 0 ? (
            <GuidedCandidateGrid>
              {slot.candidates.map(candidate => {
                const params = candidateTrainingParams(candidate);
                return (
                  <GuidedCandidateCard key={candidate.candidateId || candidate.exerciseKey}>
                    <ExerciseMediaPreview exercise={candidate.exerciseSlim} variant="thumbnail" />
                    <div>
                      <CandidateName>{candidate.exerciseName}</CandidateName>
                      <CandidateNote>{candidateNote(candidate)}</CandidateNote>
                      {params.length > 0 ? (
                        <CandidateMetaRow aria-label={`Training parameters for ${candidate.exerciseName}`}>
                          {params.map(param => <CandidateMetaPill key={param}>{param}</CandidateMetaPill>)}
                        </CandidateMetaRow>
                      ) : null}
                    </div>
                    <CandidateAddButton
                      type="button"
                      onClick={() => onSelectCandidate(candidate)}
                      aria-label={`Add ${candidate.exerciseName}`}
                    >
                      <Plus size={15} /> Add option <CheckCircle2 size={15} />
                    </CandidateAddButton>
                  </GuidedCandidateCard>
                );
              })}
            </GuidedCandidateGrid>
          ) : (
            <CandidateEmpty>
              No exercise options matched this slot. Adjust the category or equipment profile, then try again.
            </CandidateEmpty>
          )}
        </GuidedSlot>
      ))}
    </GuidedCandidatesWrap>
  );
};

export default WorkoutPlannerGuidedCandidatesPanel;