import type { Dispatch, SetStateAction } from 'react';
import { ASSESSMENT_TYPES, COMPENSATION_LEVELS, OHSA_CHECKPOINTS, PERFORMANCE_TESTS, POSTURAL_CHECKPOINTS, TYPE_CRITERIA, type Assessment, type AssessmentType, type CompensationLevel } from './TrainerAssessmentsPage.data';
import { CheckpointCard, CheckpointCardTitle, CheckpointLabel, CheckpointRow, CheckpointView, CriteriaList, CriteriaTag, EmptyState, FieldGroup, GroupLabel, HistoryCard, HistoryInfo, HistoryMeta, HistoryScore, HistoryType, PerfInput, Pill, PillGroup, StatusText, TypeChip, TypeDescription, TypeSelector, UnitInputRow, UnitLabel } from './TrainerAssessmentsPage.styles';

export type CompensationScores = Record<string, CompensationLevel>;
export type PerformanceScores = Record<string, string>;

export const AssessmentTypeSelector = ({
  assessmentType,
  onSelect,
}: {
  assessmentType: AssessmentType;
  onSelect: (type: AssessmentType) => void;
}) => (
  <FieldGroup>
    <GroupLabel>Assessment Type</GroupLabel>
    <TypeSelector>
      {ASSESSMENT_TYPES.map(type => (
        <TypeChip key={type.value} type="button" $active={assessmentType === type.value} onClick={() => onSelect(type.value)}>
          {type.label}
        </TypeChip>
      ))}
    </TypeSelector>
  </FieldGroup>
);

export const AssessmentCriteria = ({ assessmentType }: { assessmentType: AssessmentType }) => (
  <>
    <TypeDescription>{TYPE_CRITERIA[assessmentType].description}</TypeDescription>
    <FieldGroup>
      <GroupLabel>NASM Checkpoints</GroupLabel>
      <CriteriaList>{TYPE_CRITERIA[assessmentType].criteria.map(item => <CriteriaTag key={item}>{item}</CriteriaTag>)}</CriteriaList>
    </FieldGroup>
    <FieldGroup>
      <GroupLabel>What to Observe</GroupLabel>
      <CriteriaList>{TYPE_CRITERIA[assessmentType].checkpoints.map(item => <CriteriaTag key={item} $accent>{item}</CriteriaTag>)}</CriteriaList>
    </FieldGroup>
  </>
);

interface CompensationScoringCardProps {
  title: string;
  checkpoints: readonly { key: string; label: string; view: string }[];
  scores: CompensationScores;
  setScores: Dispatch<SetStateAction<CompensationScores>>;
}

const CompensationScoringCard = ({ title, checkpoints, scores, setScores }: CompensationScoringCardProps) => (
  <CheckpointCard>
    <CheckpointCardTitle>{title}</CheckpointCardTitle>
    {checkpoints.map(checkpoint => (
      <CheckpointRow key={checkpoint.key}>
        <CheckpointLabel>{checkpoint.label} <CheckpointView>({checkpoint.view})</CheckpointView></CheckpointLabel>
        <PillGroup>
          {COMPENSATION_LEVELS.map(level => (
            <Pill key={level} type="button" $level={level} $active={scores[checkpoint.key] === level} onClick={() => setScores(prev => ({ ...prev, [checkpoint.key]: level }))}>
              {level}
            </Pill>
          ))}
        </PillGroup>
      </CheckpointRow>
    ))}
  </CheckpointCard>
);

export const OhsaScoringCard = (props: Omit<CompensationScoringCardProps, 'title' | 'checkpoints'>) => (
  <CompensationScoringCard title="OHSA Compensation Scoring" checkpoints={OHSA_CHECKPOINTS} {...props} />
);

export const PosturalScoringCard = (props: Omit<CompensationScoringCardProps, 'title' | 'checkpoints'>) => (
  <CompensationScoringCard title="Postural Deviation Scoring" checkpoints={POSTURAL_CHECKPOINTS} {...props} />
);

export const PerformanceScoringCard = ({
  scores,
  setScores,
}: {
  scores: PerformanceScores;
  setScores: Dispatch<SetStateAction<PerformanceScores>>;
}) => (
  <CheckpointCard>
    <CheckpointCardTitle>Performance Test Results</CheckpointCardTitle>
    {PERFORMANCE_TESTS.map(test => (
      <CheckpointRow key={test.key}>
        <CheckpointLabel>{test.label}</CheckpointLabel>
        <UnitInputRow>
          <PerfInput type="number" min={0} placeholder="--" aria-label={`${test.label} score`} value={scores[test.key]} onChange={event => setScores(prev => ({ ...prev, [test.key]: event.target.value }))} />
          <UnitLabel>{test.unit}</UnitLabel>
        </UnitInputRow>
      </CheckpointRow>
    ))}
  </CheckpointCard>
);

export const AssessmentHistoryList = ({ history }: { history: Assessment[] }) => {
  if (history.length === 0) {
    return <EmptyState>No assessments recorded yet. Complete the form above to get started.</EmptyState>;
  }

  return (
    <>
      {history.slice(0, 10).map(assessment => (
        <HistoryCard key={assessment.id}>
          <HistoryInfo>
            <HistoryType>{assessment.fullName || assessment.clientName || 'Assessment'}</HistoryType>
            <HistoryMeta>
              {assessment.source === 'trainer_assessment' ? 'Trainer Assessment' : assessment.source || 'Assessment'}
              {' '}&middot;{' '}
              {assessment.assessmentDate ? new Date(assessment.assessmentDate).toLocaleDateString() : assessment.date ? new Date(assessment.date).toLocaleDateString() : '--'}
              {assessment.status && <> &middot; <StatusText $completed={assessment.status === 'completed'}>{assessment.status}</StatusText></>}
            </HistoryMeta>
          </HistoryInfo>
          <HistoryScore>{assessment.nasmAssessmentScore ?? assessment.score ?? '--'}</HistoryScore>
        </HistoryCard>
      ))}
    </>
  );
};
