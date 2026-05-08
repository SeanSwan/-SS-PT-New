import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CoachMessage } from './CoachMessage';
import type { CoachMessageData } from './SwanCoachTypes';

function assistantMessage(metadata: CoachMessageData['metadata']): CoachMessageData {
  return {
    id: 'msg-intake-error-safety',
    role: 'assistant',
    content: 'Coach intake update',
    timestamp: '2026-05-05T12:00:00.000Z',
    metadata,
  };
}

describe('CoachMessage intake error safety', () => {
  it('does not render arbitrary transcript upload failure details', () => {
    render(
      <CoachMessage
        message={assistantMessage({
          transcriptError: {
            kind: 'upload_failed',
            fileName: 'session-note.txt',
            fileSize: 1024,
            reason: 'do-not-render-private-transcript-detail',
          },
        })}
      />,
    );

    expect(screen.getByTestId('transcript-error-card')).toHaveTextContent(
      'The transcript could not be accepted. Check the file format and try again.',
    );
    expect(screen.queryByText(/do-not-render-private-transcript-detail/i)).not.toBeInTheDocument();
  });

  it('does not render arbitrary audio intake rejected summaries', () => {
    render(
      <CoachMessage
        message={assistantMessage({
          audioIntakeReceipt: {
            fileName: 'workout-audio.zip',
            acceptedCount: 1,
            rejectedCount: 2,
            nextActionLabel: 'Review next intake',
            rejectedSummary: 'clip-a.mp3: do-not-render-private-audio-detail',
          },
        })}
      />,
    );

    expect(screen.getByTestId('audio-intake-receipt-card')).toHaveTextContent(
      '2 audio files were not accepted. Check the format or size and retry.',
    );
    expect(screen.queryByText(/do-not-render-private-audio-detail/i)).not.toBeInTheDocument();
  });

  it('does not render arbitrary proposal preparation error messages', () => {
    render(
      <CoachMessage
        message={assistantMessage({
          coachActionProposalError: {
            code: 'UNSAFE_BACKEND_CODE',
            message: 'do-not-render-private-proposal-detail',
          },
        })}
      />,
    );

    expect(screen.getByText(/Proposal Preparation Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Coach could not prepare that draft safely/i)).toBeInTheDocument();
    expect(screen.queryByText(/do-not-render-private-proposal-detail/i)).not.toBeInTheDocument();
  });
});
