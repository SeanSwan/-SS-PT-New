import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaudClipUploader } from './PlaudClipUploader';

function makeFile(name: string, type: string): File {
  return new File(['fixture'], name, { type });
}

describe('PlaudClipUploader privacy-safe validation', () => {
  it('does not expose raw local filenames when every selected file is unsupported', () => {
    const onFiles = vi.fn();
    const { container } = render(<PlaudClipUploader isUploading={false} onFiles={onFiles} />);

    fireEvent.change(screen.getByTestId('plaud-uploader-input'), {
      target: {
        files: [
          makeFile('Marcus-private@example.com.exe', 'application/octet-stream'),
        ],
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/Unsupported file types/i);
    expect(container.innerHTML).not.toContain('Marcus-private@example.com');
    expect(container.innerHTML).not.toContain('private@example.com');
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('does not expose raw local filenames when skipping unsupported files', () => {
    const onFiles = vi.fn();
    const { container } = render(<PlaudClipUploader isUploading={false} onFiles={onFiles} />);

    fireEvent.change(screen.getByTestId('plaud-uploader-input'), {
      target: {
        files: [
          makeFile('workout-audio.mp3', 'audio/mpeg'),
          makeFile('Marcus-private@example.com.exe', 'application/octet-stream'),
        ],
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/Skipping unsupported/i);
    expect(container.innerHTML).not.toContain('Marcus-private@example.com');
    expect(container.innerHTML).not.toContain('private@example.com');
    expect(onFiles).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'workout-audio.mp3' }),
    ]);
  });
});
