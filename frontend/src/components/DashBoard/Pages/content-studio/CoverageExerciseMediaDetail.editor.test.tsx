/**
 * Coverage Tracker media editor (2026-06-18)
 * ------------------------------------------
 * Consolidates exercise-media management into the Content Studio: pin an
 * exercise, edit its full video / short loop / thumbnail, Save -> the parent
 * PUTs /api/exercises/:id/media and re-fetches coverage. These tests lock the
 * editor contract + the http/https guard (mirrors the backend, blocks XSS URLs).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CoverageExerciseMediaDetail, { type CoverageExerciseMediaRecord } from './CoverageExerciseMediaDetail';

const ex = (over: Partial<CoverageExerciseMediaRecord> = {}): CoverageExerciseMediaRecord => ({
  id: 'uuid-1', name: 'Goblet Squat', exerciseType: 'strength', bodyPartCategory: 'Legs',
  difficulty: 200, source: 'swanstudios', hasLegacyVideo: false, catalogVideoCount: 0, covered: false, ...over,
});

describe('CoverageExerciseMediaDetail editor', () => {
  it('stays read-only (no edit affordance) when onSaveMedia is not provided', () => {
    render(<CoverageExerciseMediaDetail exercise={ex({ videoUrl: 'https://r2/x.mp4' })} />);
    expect(screen.queryByText(/Edit media|Add media/)).toBeNull();
  });

  it('opens pre-filled from current media and saves the validated fields', async () => {
    const onSaveMedia = vi.fn().mockResolvedValue(undefined);
    render(
      <CoverageExerciseMediaDetail
        exercise={ex({ videoUrl: 'https://r2.example.com/full.mp4' })}
        onSaveMedia={onSaveMedia}
      />,
    );
    fireEvent.click(screen.getByText('Edit media'));
    const videoInput = screen.getByLabelText(/Full video URL/i) as HTMLInputElement;
    expect(videoInput.value).toBe('https://r2.example.com/full.mp4'); // pre-filled from current media
    fireEvent.change(screen.getByLabelText(/Short loop URL/i), {
      target: { value: 'https://r2.example.com/loop.webm' },
    });
    fireEvent.click(screen.getByText('Save media'));
    await waitFor(() => expect(onSaveMedia).toHaveBeenCalledTimes(1));
    expect(onSaveMedia).toHaveBeenCalledWith('uuid-1', {
      videoUrl: 'https://r2.example.com/full.mp4',
      previewVideoUrl: 'https://r2.example.com/loop.webm',
      thumbnailUrl: null, // blank -> cleared
    });
  });

  it('blocks a non-http(s) URL (XSS guard) and never calls onSaveMedia', async () => {
    const onSaveMedia = vi.fn();
    render(<CoverageExerciseMediaDetail exercise={ex()} onSaveMedia={onSaveMedia} />);
    fireEvent.click(screen.getByText('Add media')); // no video yet -> "Add media"
    fireEvent.change(screen.getByLabelText(/Full video URL/i), {
      target: { value: 'javascript:alert(1)' },
    });
    fireEvent.click(screen.getByText('Save media'));
    expect(await screen.findByText(/http/i)).toBeTruthy(); // validation error surfaced
    expect(onSaveMedia).not.toHaveBeenCalled();
  });
});
