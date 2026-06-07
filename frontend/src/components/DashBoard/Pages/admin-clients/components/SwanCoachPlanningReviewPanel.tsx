/**
 * COMPONENT: SwanCoachPlanningReviewPanel
 * PURPOSE: Shows Swan Coach safety/data coverage before a generated plan can
 * be approved.
 * OWNER: Codex
 * LAST VALIDATED: 2026-06-06
 *
 * WIREFRAME:
 * [Status banner]
 * [Data Used] [Missing Data]
 * [Review Signals]
 * [Critical Missing Inputs]
 * [Acknowledgement checkbox when review_required]
 *
 * DATA FLOW:
 * Props In: planning, acknowledged, onAcknowledgedChange
 * State: none
 * API Calls: none
 * Events: acknowledgement checkbox change
 * Children: styled cards and badges from copilot shared styles
 *
 * ARCHITECTURE:
 * WorkoutCopilotPanel -> CopilotDraftReview/LongHorizonPlanReviewEditor
 *   -> SwanCoachPlanningReviewPanel -> swanCoachPlanningReviewUtils
 */
import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { SwanCoachPlanningFingerprint } from '../../../../../services/aiWorkoutService';
import {
  Badge,
  BadgeRow,
  ExplainLabel,
  ExplainValue,
  InfoContent,
  InfoPanel,
  SectionTitle,
} from './copilot-shared-styles';
import { PanelIcon } from './CopilotDraftReview.styles';
import {
  AcknowledgementLabel,
  ReviewCard,
  ReviewGrid,
  ReviewList,
  ReviewSection,
} from './SwanCoachPlanningReviewPanel.styles';
import {
  labelPlanningSignal,
  nonEmptyList,
  requiresSwanCoachPlanningReview,
} from './swanCoachPlanningReviewUtils';

interface SwanCoachPlanningReviewPanelProps {
  planning: SwanCoachPlanningFingerprint | null;
  acknowledged: boolean;
  onAcknowledgedChange: (checked: boolean) => void;
}

const SwanCoachPlanningReviewPanel: React.FC<SwanCoachPlanningReviewPanelProps> = ({
  planning,
  acknowledged,
  onAcknowledgedChange,
}) => {
  if (!planning) return null;

  const requiresReview = requiresSwanCoachPlanningReview(planning);
  const safetyGate = planning.safetyGate;
  const dataUsed = nonEmptyList(planning.dataCategoriesUsed);
  const missingData = nonEmptyList(planning.missingDataCategories);
  const signals = nonEmptyList(safetyGate?.reviewRequiredSignals);
  const missingCritical = nonEmptyList(safetyGate?.missingCriticalData);
  const statusLabel = requiresReview ? 'Coach review required' : 'Coach review ready';

  return (
    <ReviewSection aria-label="Swan Coach planning review">
      <SectionTitle><ShieldCheck size={16} /> Swan Coach Data Coverage</SectionTitle>

      <InfoPanel $variant={requiresReview ? 'warning' : 'success'}>
        <PanelIcon>
          {requiresReview ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
        </PanelIcon>
        <InfoContent>
          <strong>{statusLabel}</strong>
          <div>
            {safetyGate?.reviewMessage || 'Swan Coach planning metadata is attached to this draft.'}
          </div>
        </InfoContent>
      </InfoPanel>

      <ReviewGrid>
        <ReviewCard>
          <ExplainLabel>Data Used</ExplainLabel>
          <ExplainValue>
            {dataUsed.length > 0 ? (
              <BadgeRow>
                {dataUsed.map((item) => <Badge key={item}>{item}</Badge>)}
              </BadgeRow>
            ) : 'No data categories reported'}
          </ExplainValue>
        </ReviewCard>

        <ReviewCard>
          <ExplainLabel>Missing Data</ExplainLabel>
          <ExplainValue>
            {missingData.length > 0 ? (
              <BadgeRow>
                {missingData.map((item) => <Badge key={item}>{item}</Badge>)}
              </BadgeRow>
            ) : 'No missing categories reported'}
          </ExplainValue>
        </ReviewCard>

        {signals.length > 0 && (
          <ReviewCard $fullWidth>
            <ExplainLabel>Review Signals</ExplainLabel>
            <ExplainValue>
              <ReviewList>
                {signals.map((signal) => (
                  <li key={signal}>{labelPlanningSignal(signal)}</li>
                ))}
              </ReviewList>
            </ExplainValue>
          </ReviewCard>
        )}

        {missingCritical.length > 0 && (
          <ReviewCard $fullWidth>
            <ExplainLabel>Critical Missing Inputs</ExplainLabel>
            <ExplainValue>
              <ReviewList>
                {missingCritical.map((item) => <li key={item}>{item}</li>)}
              </ReviewList>
            </ExplainValue>
          </ReviewCard>
        )}
      </ReviewGrid>

      {requiresReview && (
        <AcknowledgementLabel>
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => onAcknowledgedChange(event.target.checked)}
          />
          <span>
            I reviewed the Swan Coach planning signals and accept responsibility before assignment.
          </span>
        </AcknowledgementLabel>
      )}
    </ReviewSection>
  );
};

export default React.memo(SwanCoachPlanningReviewPanel);
