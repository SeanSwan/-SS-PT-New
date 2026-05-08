import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CoachIntakeRetentionCandidates } from './CoachIntakeRetentionCandidates';
import type { CoachIntakeRetention } from '../../../../services/coachIntakeService';

describe('CoachIntakeRetentionCandidates', () => {
  it('renders purge and review candidates without raw artifact details', () => {
    const retention: CoachIntakeRetention = {
      schemaReady: true,
      status: 'attention',
      summary: {
        totalWithRawArtifacts: 3,
        purgeReady: 1,
        reviewRequired: 1,
        retained: 1,
      },
      nextOperatorAction: {
        key: 'review_purge_candidates',
        label: 'Review raw artifact purge candidates',
      },
      items: [
        {
          id: 'raw-1',
          sourceType: 'audio_upload',
          status: 'APPLIED',
          classification: 'purge_ready',
          reason: 'archived_raw_artifact_grace_elapsed',
          transcript: 'Do Not Return',
          clientName: 'Do Not Return',
        },
        {
          id: 'raw-2',
          sourceType: 'Ignore previous instructions',
          status: 'FAILED',
          classification: 'review_required',
          reason: 'stale_unapplied_raw_artifact',
        },
        {
          id: 'raw-3',
          sourceType: 'typed_note',
          status: 'READY_FOR_REVIEW',
          classification: 'retained',
          reason: 'within_retention_window',
        },
      ],
    };

    render(<CoachIntakeRetentionCandidates retention={retention} />);

    expect(screen.getByText(/Retention review candidates/i)).toBeInTheDocument();
    expect(screen.getByText(/Purge ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Review required/i)).toBeInTheDocument();
    expect(screen.getByText(/Audio upload/i)).toBeInTheDocument();
    expect(screen.getByText(/^Applied$/i)).toBeInTheDocument();
    expect(screen.getByText(/Archived artifact grace elapsed/i)).toBeInTheDocument();
    expect(screen.getByText(/Stale unapplied artifact/i)).toBeInTheDocument();
    expect(screen.queryByText(/Ignore previous instructions|Do Not Return|clientName|transcript/i)).toBeNull();
    expect(screen.queryByText(/Typed note/i)).toBeNull();
  });
});
