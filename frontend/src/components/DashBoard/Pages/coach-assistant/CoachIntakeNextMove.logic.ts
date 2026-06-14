import type { PlaudIntakeSummary } from '../../../../services/plaudIntakeService';
import type { CoachIntakeQueueScope } from '../../../../services/coachIntakeService';

export interface CoachIntakeNextMove {
  label: string;
  detail: string;
  prompt: string;
}

function count(summary: PlaudIntakeSummary, key: keyof PlaudIntakeSummary): number {
  return Number(summary[key] || 0);
}

function scopedMove(summary: PlaudIntakeSummary, scope?: string): CoachIntakeNextMove | null {
  if (scope === 'ready_review' && count(summary, 'readyReview') > 0) {
    return readyReviewMove();
  }
  if (scope === 'needs_client' && count(summary, 'needsClient') > 0) {
    return needsClientMove();
  }
  if (scope === 'needs_clarification' && count(summary, 'needsClarification') > 0) {
    return needsClarificationMove();
  }
  if (scope === 'duplicate_hold' && count(summary, 'duplicateHold') > 0) {
    return duplicateHoldMove();
  }
  if (scope === 'failed' && count(summary, 'failed') > 0) {
    return failedMove();
  }
  return null;
}

function readyReviewMove(): CoachIntakeNextMove {
  return {
    label: 'Review ready draft',
    detail: 'Approve, reject, or hold the prepared draft after checking the facts.',
    prompt: 'Review ready Coach intake draft. Explain the approval, reject, or hold decision in the safest next step. Do not write, create, update, log, or submit any client or workout record.',
  };
}

function needsClientMove(): CoachIntakeNextMove {
  return {
    label: 'Resolve client hold',
    detail: 'Confirm the client before any draft can write to history.',
    prompt: 'Resolve Coach intake client hold. Explain what evidence should confirm the client match before any prepared draft is approved. Do not write, create, update, log, or submit any client or workout record.',
  };
}

function needsClarificationMove(): CoachIntakeNextMove {
  return {
    label: 'Answer clarification',
    detail: 'Close the narrow question blocking draft approval.',
    prompt: 'Answer Coach intake clarification hold. Identify the one missing detail needed before draft approval. Do not write, create, update, log, or submit any client or workout record.',
  };
}

function duplicateHoldMove(): CoachIntakeNextMove {
  return {
    label: 'Check duplicate risk',
    detail: 'Compare the hold before a duplicate workout reaches history.',
    prompt: 'Review Coach intake duplicate risk. Explain whether to keep holding, compare manually, discard, or proceed to explicit operator approval. Do not write, create, update, log, or submit any client or workout record.',
  };
}

function failedMove(): CoachIntakeNextMove {
  return {
    label: 'Recover failed intake',
    detail: 'Retry, hold, or discard failed media and proposal work.',
    prompt: 'Review failed Coach intake. Recommend retry processing, manual transcript upload, hold, or discard. Do not write, create, update, log, or submit any client or workout record.',
  };
}

export function buildCoachIntakeNextMove(
  summary: PlaudIntakeSummary,
  activeScope?: CoachIntakeQueueScope | string,
): CoachIntakeNextMove {
  const moveForScope = scopedMove(summary, activeScope);
  if (moveForScope) return moveForScope;

  if (count(summary, 'readyReview') > 0) {
    return readyReviewMove();
  }

  if (count(summary, 'needsClient') > 0) {
    return needsClientMove();
  }

  if (count(summary, 'needsClarification') > 0) {
    return needsClarificationMove();
  }

  if (count(summary, 'duplicateHold') > 0) {
    return duplicateHoldMove();
  }

  if (count(summary, 'failed') > 0) {
    return failedMove();
  }

  if (count(summary, 'actionable') > 0 || count(summary, 'total') > 0) {
    return {
      label: 'Review next intake',
      detail: 'Let the queue pick the next safe item so you do not hunt through filters.',
      prompt: 'Review next Coach intake. Tell me the next safe operator step and any approval gate before a workout or client record can be written.',
    };
  }

  return {
    label: 'Capture intake',
    detail: 'Upload or sync a voice note so Coach can prepare the next review item.',
    prompt: 'Set up the next Coach intake. Explain the fastest way to upload or sync a PLAUD voice note and keep final writes approval-gated.',
  };
}
