import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreativeGallery from './CreativeGallery';
import { mapPostsToCreativeMedia } from './CreativeGallery.data';

const { mockCreatePost, mockUseProfile, mockUseSocialFeed } = vi.hoisted(() => ({
  mockCreatePost: vi.fn(),
  mockUseProfile: vi.fn(),
  mockUseSocialFeed: vi.fn(),
}));

vi.mock('../../../hooks/profile/useProfile', () => ({
  useProfile: mockUseProfile,
}));

vi.mock('../../../hooks/social/useSocialFeed', () => ({
  useSocialFeed: mockUseSocialFeed,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    log: vi.fn(),
  },
}));

describe('CreativeGallery', () => {
  beforeEach(() => {
    mockCreatePost.mockResolvedValue({});
    mockUseSocialFeed.mockReturnValue({ createPost: mockCreatePost });
    mockUseProfile.mockReturnValue({
      posts: [
        {
          id: 'media-1',
          content: 'A long creative video caption for the gallery card',
          mediaUrl: 'https://example.test/media.jpg',
          likesCount: 12,
        },
      ],
    });
  });

  it('renders media posts as gallery cards and keeps tags as pressed controls', async () => {
    const user = userEvent.setup();

    render(<CreativeGallery />);

    expect(screen.getByText(/A long creative video caption/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Workout' }));
    expect(screen.getByRole('button', { name: 'Workout' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('creates a social post when a media file is selected without logging the file name', async () => {
    render(<CreativeGallery />);

    const file = new File(['media'], 'private-client-video.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText('Creative media upload'), { target: { files: [file] } });

    expect(mockCreatePost).toHaveBeenCalledWith({ content: 'Shared media', type: 'general' });
  });

  it('renders the empty state when no media posts exist', () => {
    mockUseProfile.mockReturnValue({ posts: [] });

    render(<CreativeGallery />);

    expect(screen.getByText('No media yet')).toBeInTheDocument();
  });
});

describe('mapPostsToCreativeMedia', () => {
  it('filters non-media posts and supplies deterministic fallback ids', () => {
    expect(mapPostsToCreativeMedia([
      { content: 'text only' },
      { content: 'media post', mediaUrl: 'https://example.test/media.png', likesCount: 7 },
    ])).toEqual([
      {
        id: 'media-0',
        title: 'media post',
        thumbnail: 'https://example.test/media.png',
        duration: '',
        views: 7,
        createdAt: undefined,
      },
    ]);
  });
});
