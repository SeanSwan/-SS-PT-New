/**
 * coachIntakeGateSummary.test.mjs
 * ===============================
 * Locks PII-safe next-action labels for the Coach intake command surface.
 */
import { describe, expect, it } from 'vitest';

import {
  coachIntakeBlockingGate,
  coachIntakeNextAction,
} from '../../services/ai/coachIntakeGateSummary.mjs';

describe('coachIntakeGateSummary', () => {
  it('shows failed intake state before stale prepared-draft metadata', () => {
    const item = {
      kind: 'coach_intake',
      queueStatus: 'failed',
      latestProposalId: 'proposal-stale',
      latestProposal: { status: 'PENDING' },
    };

    expect(coachIntakeBlockingGate(item)).toBe('Intake failed');
    expect(coachIntakeNextAction(item)).toMatchObject({
      key: 'review_failed_intake',
      label: 'Review failed intake',
    });
  });

  it('shows processing state before stale prepared-draft metadata', () => {
    const item = {
      kind: 'coach_intake',
      queueStatus: 'processing',
      latestProposalId: 'proposal-stale',
      latestProposal: { status: 'PENDING' },
    };

    expect(coachIntakeBlockingGate(item)).toBe('Processing is still running');
    expect(coachIntakeNextAction(item)).toMatchObject({
      key: 'wait_for_processing',
      label: 'Wait for processing',
    });
  });

  it('does not ask the operator to review terminal proposal metadata', () => {
    const item = {
      kind: 'coach_intake',
      queueStatus: 'ready_review',
      latestProposalId: 'proposal-applied',
      latestProposal: { status: 'APPLIED' },
    };

    expect(coachIntakeBlockingGate(item)).toBe('Final write requires a prepared draft');
    expect(coachIntakeNextAction(item)).toMatchObject({
      key: 'prepare_draft_review',
      label: 'Prepare draft review',
    });
  });

  it('keeps draft preparation behind unresolved client confirmation', () => {
    const item = {
      kind: 'coach_intake',
      queueStatus: 'ready_review',
      needsClient: true,
    };

    expect(coachIntakeBlockingGate(item)).toBe('Client confirmation required');
    expect(coachIntakeNextAction(item)).toMatchObject({
      key: 'resolve_client',
      label: 'Ask Coach to resolve client',
    });
  });
});
