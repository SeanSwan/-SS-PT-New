import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhotoGallery from './PhotoGallery';
import { filterPhotoItems, mapPostsToPhotoItems, validatePhotoFile } from './PhotoGallery.data';

const { mockCreatePost, mockRefreshPosts, mockRefreshProfile, mockUseProfile, mockUseSocialFeed } = vi.hoisted(() => ({
  mockCreatePost: vi.fn(),
  mockRefreshPosts: vi.fn(),
  mockRefreshProfile: vi.fn(),
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
  },
}));

describe('PhotoGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePost.mockResolvedValue({ id: 'new-post' });
    mockRefreshPosts.mockResolvedValue(undefined);
    mockRefreshProfile.mockResolvedValue(undefined);
    mockUseSocialFeed.mockReturnValue({
      createPost: mockCreatePost,
      refreshPosts: mockRefreshPosts,
    });
    mockUseProfile.mockReturnValue({
      refreshProfile: mockRefreshProfile,
      posts: [
        {
          id: 'photo-1',
          content: 'Fitness progress after training',
          mediaUrl: 'https://example.test/progress.jpg',
          likesCount: 8,
          commentsCount: 2,
          createdAt: '2026-05-09T00:00:00.000Z',
        },
        {
          id: 'photo-2',
          content: 'Nutrition meal prep',
          mediaUrl: 'https://example.test/meal.png',
          likesCount: 4,
          commentsCount: 1,
          createdAt: '2026-05-09T00:00:00.000Z',
        },
      ],
    });
  });

  it('renders photo posts and filters categories as pressed controls', async () => {
    const user = userEvent.setup();

    render(<PhotoGallery />);

    expect(screen.getByRole('button', { name: /Open photo: Fitness progress/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nutrition' }));
    expect(screen.getByRole('button', { name: 'Nutrition' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Open photo: Fitness progress/ })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Open photo: Nutrition meal prep/ })).toBeInTheDocument();
  });

  it('creates a social post with the selected image file and refreshes profile data', async () => {
    render(<PhotoGallery />);

    const file = new File(['image'], 'gallery-upload.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Photo gallery upload'), { target: { files: [file] } });

    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledWith({ content: 'Shared a photo', type: 'general', media: file });
    });
    expect(mockRefreshPosts).toHaveBeenCalledTimes(1);
    expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Photo shared to your gallery.')).toBeInTheDocument();
  });

  it('rejects non-image files before calling the social post API', () => {
    render(<PhotoGallery />);

    const file = new File(['not an image'], 'gallery-notes.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('Photo gallery upload'), { target: { files: [file] } });

    expect(mockCreatePost).not.toHaveBeenCalled();
    expect(screen.getByText('Select an image file to add to your gallery.')).toBeInTheDocument();
  });
});

describe('PhotoGallery data helpers', () => {
  it('filters out video posts and assigns deterministic fallback ids', () => {
    expect(mapPostsToPhotoItems([
      { content: 'clip', mediaUrl: 'https://example.test/video.mp4', likesCount: 1, commentsCount: 0 },
      { content: 'Progress check', mediaUrl: 'https://example.test/photo.jpg', likesCount: 3, commentsCount: 2 },
    ])).toEqual([
      {
        id: 'photo-0',
        url: 'https://example.test/photo.jpg',
        title: 'Progress check',
        likes: 3,
        comments: 2,
        createdAt: undefined,
        category: 'Progress',
      },
    ]);
  });

  it('filters by search and category using the mapped photo category', () => {
    const photos = mapPostsToPhotoItems([
      { id: 'one', content: 'Nutrition meal prep', mediaUrl: 'https://example.test/meal.png', likesCount: 1, commentsCount: 0 },
      { id: 'two', content: 'Community challenge', mediaUrl: 'https://example.test/team.png', likesCount: 1, commentsCount: 0 },
    ]);

    expect(filterPhotoItems(photos, 'meal', 'Nutrition')).toHaveLength(1);
    expect(filterPhotoItems(photos, 'meal', 'Community')).toHaveLength(0);
  });

  it('validates image type and size before upload', () => {
    const image = new File(['image'], 'safe.jpg', { type: 'image/jpeg' });
    expect(validatePhotoFile(image)).toBeNull();
  });
});
