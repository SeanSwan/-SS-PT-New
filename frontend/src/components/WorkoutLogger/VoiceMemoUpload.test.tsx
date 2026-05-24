import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceMemoUpload, {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_UPLOAD_FILE_SIZE_MB,
} from './VoiceMemoUpload';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: { post: postMock },
  }),
}));

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('file input not found');
  return input;
}

describe('VoiceMemoUpload', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('blocks files above the backend-aligned 20MB cap before upload', async () => {
    const onParsed = vi.fn();
    const { container } = render(<VoiceMemoUpload clientId={77} onParsed={onParsed} />);
    const file = new File([new Uint8Array(MAX_UPLOAD_FILE_SIZE_BYTES + 1)], 'too-large.wav', { type: 'audio/wav' });

    fireEvent.change(fileInput(container), { target: { files: [file] } });

    expect(await screen.findByText(new RegExp(`Maximum is ${MAX_UPLOAD_FILE_SIZE_MB}MB`, 'i'))).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('lets the trainer review a parsed result before applying it', async () => {
    const onParsed = vi.fn();
    postMock.mockResolvedValue({
      data: {
        success: true,
        transcript: 'Bench press three sets of ten.',
        parsedWorkout: {
          exercises: [{ exerciseName: 'Bench Press', sets: [{ setNumber: 1, weight: 135, reps: 10 }] }],
          confidence: 0.9,
        },
      },
    });

    const { container } = render(<VoiceMemoUpload clientId={77} onParsed={onParsed} />);
    const file = new File(['audio'], 'bench.wav', { type: 'audio/wav' });

    fireEvent.change(fileInput(container), { target: { files: [file] } });

    expect(await screen.findByText(/Parsed 1 exercises/i)).toBeInTheDocument();
    expect(postMock).toHaveBeenCalledWith(
      '/api/workout-logs/upload',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );

    fireEvent.click(screen.getByRole('button', { name: /apply to workout log/i }));

    await waitFor(() => {
      expect(onParsed).toHaveBeenCalledWith(
        expect.objectContaining({ exercises: expect.any(Array), confidence: 0.9 }),
        'Bench press three sets of ten.',
      );
    });
  });
});
