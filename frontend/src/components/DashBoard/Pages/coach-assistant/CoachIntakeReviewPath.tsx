/**
 * CoachIntakeReviewPath.tsx
 * =========================
 * Three-step operator path for the active Coach intake dossier.
 */
import React from 'react';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import {
  audioGate,
  clientGate,
  nextAction,
  timeAnchor,
  writeGate,
} from './CoachIntakeActiveDossier.logic';
import {
  ReviewPath,
  ReviewPathGrid,
  ReviewPathHeader,
  ReviewStep,
  StepCopy,
  StepIndex,
} from './CoachIntakeReviewPath.styles';

interface CoachIntakeReviewPathProps {
  item: CoachIntakeItem;
}

function clientReviewStatus(item: CoachIntakeItem): string {
  const gate = clientGate(item);
  if (gate === 'Client confirmation required') return 'Client check still needs confirmation';
  if (gate === 'Client confirmed') return 'Client check is complete';
  return 'Client check is pending';
}

function audioReviewStatus(item: CoachIntakeItem): string {
  const gate = audioGate(item);
  if (gate === 'Ordering review required') return 'Audio order needs review';
  if (gate === 'Audio order ready') return 'Audio sequence is ready';
  if (gate === 'Single audio piece') return 'Single audio piece is ready';
  return 'No audio evidence is attached';
}

function writeReviewStatus(item: CoachIntakeItem): string {
  const gate = writeGate(item);
  if (gate === 'Draft applied') return 'History reflects the applied draft. New edits need another approval.';
  if (gate === 'Draft rejected') return 'Rejected draft stays out of history unless a new draft is approved.';
  if (gate === 'Draft failed') return 'Failed draft stays blocked until it is recovered or replaced.';
  if (gate === 'Draft approved') return 'Approved draft is past review and ready for the final recorded state.';
  if (gate === 'Draft applying') return 'Draft is applying. Wait for the recorded result before acting again.';
  if (gate === 'Draft prepared for approval') return 'Prepared draft is waiting at the approval gate.';
  return 'Write stays locked until a prepared draft is approved.';
}

const CoachIntakeReviewPath: React.FC<CoachIntakeReviewPathProps> = ({ item }) => {
  const next = nextAction(item);
  const steps = [
    {
      index: '1',
      title: 'Verify first',
      detail: `${clientReviewStatus(item)}. ${audioReviewStatus(item)}. ${timeAnchor(item)}.`,
    },
    {
      index: '2',
      title: 'Use next action',
      detail: next.label,
    },
    {
      index: '3',
      title: 'Approval gate',
      detail: writeReviewStatus(item),
    },
  ];

  return (
    <ReviewPath aria-label="Intake review path">
      <ReviewPathHeader>
        <strong>Three-step review path</strong>
        <span>{'Verify -> draft -> approve'}</span>
      </ReviewPathHeader>
      <ReviewPathGrid>
        {steps.map((step) => (
          <ReviewStep key={step.index}>
            <StepIndex aria-hidden="true">{step.index}</StepIndex>
            <StepCopy>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </StepCopy>
          </ReviewStep>
        ))}
      </ReviewPathGrid>
    </ReviewPath>
  );
};

export default CoachIntakeReviewPath;
