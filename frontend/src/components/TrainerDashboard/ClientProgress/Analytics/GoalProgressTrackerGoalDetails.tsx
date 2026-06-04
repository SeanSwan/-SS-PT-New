import React from 'react';
import { CheckCircle, Circle, X } from 'lucide-react';
import type { GoalData } from '../../../../services/enhanced-progress-analytics-service';
import ProgressAreaChart from '../../../FitnessStats/charts/ProgressAreaChart';
import {
  clampPercent,
  formatPredictedCompletion,
  formatSuccessLikelihood,
  goalAccentTone,
  goalStatusTextTone,
  goalStatusTone,
  milestoneKey,
} from './GoalProgressTracker.logic';
import {
  AccentButton,
  BodyText,
  Chip,
  ErrorText,
  FieldLabel,
  FormGrid,
  GhostButton,
  IconBtn,
  InsightBox,
  InsightGrid,
  InsightLabel,
  InsightValue,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPanel,
  ModalTitleActions,
  Overlay,
  PanelTitle,
  StepCaption,
  StepConnector,
  StepContent,
  StepIconCol,
  StepItem,
  StepperContainer,
  StepTitle,
  SubTitle,
  TextInput,
  TwoColGrid,
} from './GoalProgressTracker.styles';

interface GoalProgressTrackerGoalDetailsProps {
  goal: GoalData | null;
  progressDraft: string;
  goalActionError: string | null;
  isSavingGoal: boolean;
  onClose: () => void;
  onProgressDraftChange: (value: string) => void;
  onUpdateProgress: (goal: GoalData) => void;
}

const GoalProgressTrackerGoalDetails: React.FC<GoalProgressTrackerGoalDetailsProps> = ({
  goal,
  progressDraft,
  goalActionError,
  isSavingGoal,
  onClose,
  onProgressDraftChange,
  onUpdateProgress,
}) => {
  if (!goal) return null;

  const milestones = goal.milestones ?? [];
  const chartData = (goal.progressHistory ?? []).map((point) => ({
    date: point.date,
    progress: clampPercent(goal.targetValue > 0 ? (point.value / goal.targetValue) * 100 : 0),
  }));

  return (
    <Overlay onClick={onClose}>
      <ModalPanel onClick={(event) => event.stopPropagation()}>
        <ModalHeader>
          <PanelTitle>{goal.title}</PanelTitle>
          <ModalTitleActions>
            <Chip $bg={goalStatusTone(goal.status)} $color={goalStatusTextTone(goal.status)}>
              {goal.progress}% Complete
            </Chip>
            <IconBtn onClick={onClose}>
              <X size={18} />
            </IconBtn>
          </ModalTitleActions>
        </ModalHeader>

        <ModalBody>
          <TwoColGrid>
            <div>
              <SubTitle>Progress Timeline</SubTitle>
              <StepperContainer>
                {milestones.map((milestone, index) => (
                  <StepItem key={milestoneKey(goal, milestone.id)}>
                    <StepIconCol>
                      {milestone.completed ? (
                        <CheckCircle size={20} color={goalAccentTone('success')} />
                      ) : (
                        <Circle size={20} color={goalAccentTone('warning')} />
                      )}
                      <StepConnector $visible={index < milestones.length - 1} />
                    </StepIconCol>
                    <StepContent>
                      <StepTitle>{milestone.title}</StepTitle>
                      <StepCaption>
                        Target: {milestone.target} {goal.unit} | Current: {milestone.current} {goal.unit}
                      </StepCaption>
                      {milestone.completed && milestone.date && (
                        <StepCaption $tone="success">
                          Completed: {new Date(milestone.date).toLocaleDateString()}
                        </StepCaption>
                      )}
                      {!milestone.completed && milestone.estimatedDate && (
                        <StepCaption $tone="warning">
                          Estimated: {new Date(milestone.estimatedDate).toLocaleDateString()}
                        </StepCaption>
                      )}
                    </StepContent>
                  </StepItem>
                ))}
              </StepperContainer>
            </div>

            <div>
              <SubTitle>Progress Chart</SubTitle>
              <ProgressAreaChart
                data={chartData}
                xKey="date"
                yKeys={[{ key: 'progress', name: 'Progress %', color: goalStatusTone(goal.status) }]}
                height={200}
              />
              <InsightBox>
                <SubTitle>AI Insights</SubTitle>
                <BodyText>{goal.insights?.recommendation ?? 'No goal insight is available yet.'}</BodyText>
                <InsightGrid>
                  <div>
                    <InsightLabel>Predicted Completion</InsightLabel>
                    <InsightValue>{formatPredictedCompletion(goal.insights?.predictedCompletion)}</InsightValue>
                  </div>
                  <div>
                    <InsightLabel>Success Likelihood</InsightLabel>
                    <InsightValue>{formatSuccessLikelihood(goal.insights?.likelihood)}</InsightValue>
                  </div>
                </InsightGrid>
              </InsightBox>
            </div>
          </TwoColGrid>

          <InsightBox>
            <SubTitle>Update Current Value</SubTitle>
            <FormGrid>
              <FieldLabel>
                Current {goal.unit}
                <TextInput
                  min="0"
                  type="number"
                  value={progressDraft}
                  onChange={(event) => onProgressDraftChange(event.target.value)}
                />
              </FieldLabel>
              <FieldLabel>
                Target
                <TextInput value={`${goal.targetValue} ${goal.unit}`} disabled />
              </FieldLabel>
            </FormGrid>
            {goalActionError && (
              <ErrorText>
                <BodyText $danger>{goalActionError}</BodyText>
              </ErrorText>
            )}
          </InsightBox>
        </ModalBody>

        <ModalFooter>
          <GhostButton onClick={onClose}>Close</GhostButton>
          <AccentButton onClick={() => onUpdateProgress(goal)} disabled={isSavingGoal}>
            {isSavingGoal ? 'Saving...' : 'Update Progress'}
          </AccentButton>
        </ModalFooter>
      </ModalPanel>
    </Overlay>
  );
};

export default GoalProgressTrackerGoalDetails;
