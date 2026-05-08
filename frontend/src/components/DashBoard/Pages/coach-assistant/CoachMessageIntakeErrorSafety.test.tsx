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
    expect(screen.getByText(/Transcript file/i)).toBeInTheDocument();
    expect(screen.queryByText(/session-note\.txt/i)).not.toBeInTheDocument();
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
    expect(screen.getByText(/Audio intake/i)).toBeInTheDocument();
    expect(screen.queryByText(/workout-audio\.zip/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/do-not-render-private-audio-detail/i)).not.toBeInTheDocument();
  });

  it('does not render raw transcript review source filenames', () => {
    const { container } = render(
      <CoachMessage
        message={assistantMessage({
          transcriptReview: {
            fileName: 'Marcus-private@example.com.txt',
            fileSize: 1024,
            fileMimeType: 'text/plain',
            clientId: 1,
            parsedWorkout: { exercises: [] },
            transcript: 'safe fixture transcript',
          },
        })}
      />,
    );

    expect(screen.getByText(/Transcript file/i)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('Marcus-private@example.com');
    expect(container.innerHTML).not.toContain('private@example.com');
  });

  it('does not render raw logged-workout source filenames', () => {
    const { container } = render(
      <CoachMessage
        message={assistantMessage({
          transcriptResult: {
            clientId: 1,
            exerciseCount: 2,
            totalSets: 6,
            fileName: 'Marcus-private@example.com.pdf',
          },
        })}
      />,
    );

    expect(screen.getByText(/Transcript file/i)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('Marcus-private@example.com');
    expect(container.innerHTML).not.toContain('private@example.com');
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

  it('does not render arbitrary legacy client-create failure reasons', () => {
    render(
      <CoachMessage
        message={assistantMessage({
          clientCreateResult: {
            success: false,
            reason: 'do-not-render-private-client-create-detail',
          },
        })}
      />,
    );

    expect(screen.getByText(/Client Creation Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Client draft could not be created safely/i)).toBeInTheDocument();
    expect(screen.queryByText(/do-not-render-private-client-create-detail/i)).not.toBeInTheDocument();
  });

  it('does not render arbitrary legacy workout-import failure reasons', () => {
    render(
      <CoachMessage
        message={assistantMessage({
          workoutImportResults: [
            {
              success: false,
              date: '2026-05-05',
              reason: 'do-not-render-private-workout-import-detail',
            },
          ],
        })}
      />,
    );

    expect(screen.getByText(/Workout Import Results/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed: Workout import could not be completed safely/i)).toBeInTheDocument();
    expect(screen.queryByText(/do-not-render-private-workout-import-detail/i)).not.toBeInTheDocument();
  });
});
