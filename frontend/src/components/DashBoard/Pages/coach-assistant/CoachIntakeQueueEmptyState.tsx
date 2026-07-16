/**
 * CoachIntakeQueueEmptyState.tsx
 * ==============================
 * Scope-aware empty state for the Coach intake queue worklist.
 */

import type { CoachIntakeQueueScope } from '../../../../services/coachIntakeService';
import { ItemCard, ItemTitle, SourceChip } from './CoachIntakeWorkspace.styles';

interface EmptyStateCopy {
  title: string;
  detail: string;
  chip: string;
}

const EMPTY_STATE_BY_SCOPE: Record<CoachIntakeQueueScope, EmptyStateCopy> = {
  actionable: {
    title: 'No active intake items',
    detail: 'Attach audio, transcript, or PLAUD clips to start a review.',
    chip: 'Clear',
  },
  ready_review: {
    title: 'No ready drafts',
    detail: 'Prepared workout and onboarding drafts will appear here after Coach analysis.',
    chip: 'Ready clear',
  },
  needs_client: {
    title: 'No client-resolution holds',
    detail: 'Intake items needing client confirmation will appear here before any write is allowed.',
    chip: 'Clients clear',
  },
  needs_clarification: {
    title: 'No clarification holds',
    detail: 'Items waiting for a narrow Coach question will appear here before draft approval.',
    chip: 'Clarity clear',
  },
  duplicate_hold: {
    title: 'No duplicate-risk holds',
    detail: 'Potential duplicate logs will wait here until the operator compares and decides.',
    chip: 'Duplicates clear',
  },
  unprocessed: {
    title: 'No intake needing action',
    detail: 'New voice, transcript, and PLAUD intake appears here before it is ready for review.',
    chip: 'Action clear',
  },
  processing: {
    title: 'No processing intake items',
    detail: 'Transcribing, grouping, and proposal-building work will appear here while it is running.',
    chip: 'Processing clear',
  },
  failed: {
    title: 'No failed intake items',
    detail: 'Failed transcription, media fetch, and proposal jobs will appear here for recovery.',
    chip: 'Failures clear',
  },
};

interface CoachIntakeQueueEmptyStateProps {
  scope?: string;
}

function copyForScope(scope?: string): EmptyStateCopy {
  if (scope && Object.prototype.hasOwnProperty.call(EMPTY_STATE_BY_SCOPE, scope)) {
    return EMPTY_STATE_BY_SCOPE[scope as CoachIntakeQueueScope];
  }
  return EMPTY_STATE_BY_SCOPE.actionable;
}

export function CoachIntakeQueueEmptyState({ scope }: CoachIntakeQueueEmptyStateProps): JSX.Element {
  const copy = copyForScope(scope);

  return (
    <ItemCard>
      <ItemTitle>
        <strong>{copy.title}</strong>
        <span>{copy.detail}</span>
      </ItemTitle>
      <SourceChip>{copy.chip}</SourceChip>
    </ItemCard>
  );
}

export default CoachIntakeQueueEmptyState;
