import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent, FormEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SocialFeedApi } from '../../../hooks/social/useSocialFeed';
import useHomeComposer from './useHomeComposer';

const createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`);
const revokeObjectURL = vi.fn();

function selectFile(
  handleMediaSelect: (event: ChangeEvent<HTMLInputElement>) => void,
  file: File,
) {
  const input = document.createElement('input');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  act(() => {
    handleMediaSelect({ currentTarget: input } as ChangeEvent<HTMLInputElement>);
  });
}

function renderComposer() {
  const createPost = vi.fn().mockResolvedValue({ id: 'post-1' });
  const hook = renderHook(() => useHomeComposer({
    createPost: createPost as unknown as SocialFeedApi['createPost'],
    isCreatingPost: false,
    latestSessionId: null,
  }));
  return { ...hook, createPost };
}

describe('useHomeComposer', () => {
  beforeEach(() => {
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores valid selected media and clears previous media errors', () => {
    const { result } = renderComposer();

    selectFile(result.current.handleMediaSelect, new File(['image'], 'proof.png', { type: 'image/png' }));

    expect(result.current.selectedMedia?.name).toBe('proof.png');
    expect(result.current.mediaError).toBeNull();
  });

  it('creates a local preview URL and lets users remove selected media before posting', () => {
    const { result } = renderComposer();
    const media = new File(['image'], 'proof.png', { type: 'image/png' });

    selectFile(result.current.handleMediaSelect, media);

    expect(result.current.selectedMediaPreviewUrl).toBe('blob:proof.png');
    expect(createObjectURL).toHaveBeenCalledWith(media);

    act(() => result.current.clearSelectedMedia());

    expect(result.current.selectedMedia).toBeNull();
    expect(result.current.selectedMediaPreviewUrl).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:proof.png');
  });

  it('defaults to auto-tag mode and submits selected media with inferred post type', async () => {
    const { result, createPost } = renderComposer();
    const media = new File(['image'], 'proof.png', { type: 'image/png' });

    expect(result.current.activeMood).toBe('community');
    selectFile(result.current.handleMediaSelect, media);
    act(() => result.current.setPostText('Finished leg day with 5 sets of squats'));

    await act(async () => {
      await result.current.submitPost({ preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>);
    });

    expect(createPost).toHaveBeenCalledWith(expect.objectContaining({
      type: 'workout',
      visibility: 'friends',
      media,
    }));
    expect(createPost.mock.calls[0][0].content).toContain('#WorkoutDiary');
  });

  it('rejects unsupported media and clears selected media', () => {
    const { result } = renderComposer();

    selectFile(result.current.handleMediaSelect, new File(['bad'], 'payload.exe', { type: 'application/x-msdownload' }));

    expect(result.current.selectedMedia).toBeNull();
    expect(result.current.mediaError).toMatch(/image or video/i);
  });
});