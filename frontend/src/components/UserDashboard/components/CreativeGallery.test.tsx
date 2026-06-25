import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreativeGallery from './CreativeGallery';
import { CREATIVE_GALLERY_ACCEPT } from './CreativeGallery.data';

const {
  mockCreatePost,
  mockLoggerError,
  mockLoggerLog,
  mockLoggerWarn,
  mockRefreshPosts,
  mockRefreshProfile,
  mockUseProfile,
  mockUseSocialFeed,
} = vi.hoisted(() => ({
  mockCreatePost: vi.fn(),
  mockLoggerError: vi.fn(),
  mockLoggerLog: vi.fn(),
  mockLoggerWarn: vi.fn(),
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
    error: mockLoggerError,
    log: mockLoggerLog,
    warn: mockLoggerWarn,
  },
}));

describe('CreativeGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePost.mockResolvedValue({});
    mockRefreshPosts.mockResolvedValue(undefined);
    mockRefreshProfile.mockResolvedValue(undefined);
    mockUseSocialFeed.mockReturnValue({ createPost: mockCreatePost, refreshPosts: mockRefreshPosts });
    mockUseProfile.mockReturnValue({
      refreshProfile: mockRefreshProfile,
      posts: [
        {
          id: 'media-1',
          content: 'A long creative video caption for the gallery card',
          mediaUrl: '/uploads/media.jpg',
          likesCount: 12,
        },
      ],
    });
  });

  it('renders media posts as gallery cards and keeps tags as pressed controls', async () => {
    const user = userEvent.setup();

    render(<CreativeGallery />);

    expect(screen.getByText(/A long creative video caption/)).toBeInTheDocument();
    const mediaButton = screen.getByRole('button', { name: /Play media: A long creative video caption/ });
    expect(mediaButton.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(
      mediaButton.querySelectorAll('svg').length,
    );
    await user.click(screen.getByRole('button', { name: 'Workout' }));
    expect(screen.getByRole('button', { name: 'Workout' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('groups creative tag filters under a named control group', () => {
    render(<CreativeGallery />);

    const filters = screen.getByRole('group', { name: 'Creative media filters' });
    expect(within(filters).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(filters).getByRole('button', { name: 'Workout' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('filters visible creative media by selected tag and explains empty filtered categories', async () => {
    const user = userEvent.setup();
    mockUseProfile.mockReturnValue({
      refreshProfile: mockRefreshProfile,
      posts: [
        {
          id: 'dance-media',
          content: 'Dance flow from class #Dance',
          mediaUrl: '/uploads/dance.png',
        },
        {
          id: 'workout-media',
          content: 'Workout finisher clip #Workout',
          mediaUrl: '/uploads/workout.png',
        },
      ],
    });

    render(<CreativeGallery />);

    await user.click(screen.getByRole('button', { name: 'Workout' }));

    expect(screen.getByText('Workout finisher clip #Workout')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Dance flow from class #Dance')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Wellness' }));

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'No wellness media yet' })).toHaveTextContent(
        'Try another filter or share new creative media for this category.',
      );
    });
  });

  it('opens creative video media in an accessible preview dialog and closes with Escape', async () => {
    const user = userEvent.setup();
    mockUseProfile.mockReturnValue({
      refreshProfile: mockRefreshProfile,
      posts: [
        {
          id: 'media-video',
          content: 'Training rhythm clip',
          mediaUrl: '/uploads/training-rhythm.mp4',
          likesCount: 22,
        },
      ],
    });

    render(<CreativeGallery />);

    const mediaButton = screen.getByRole('button', { name: 'Play media: Training rhythm clip' });
    await user.click(mediaButton);
    const dialog = screen.getByRole('dialog', { name: 'Training rhythm clip' });
    const video = within(dialog).getByLabelText('Training rhythm clip') as HTMLVideoElement;
    expect(video.tagName).toBe('VIDEO');
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('src', '/uploads/training-rhythm.mp4');
    expect(mockLoggerLog).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Training rhythm clip' })).not.toBeInTheDocument();
    });
    expect(mediaButton).toHaveFocus();
  });

  it('opens creative image media with focus on the close control', async () => {
    const user = userEvent.setup();

    render(<CreativeGallery />);

    await user.click(screen.getByRole('button', { name: /Play media: A long creative video caption/ }));
    const dialog = screen.getByRole('dialog', { name: /A long creative video caption/ });
    expect(within(dialog).getByRole('img', { name: /A long creative video caption/ })).toHaveAttribute(
      'src',
      '/uploads/media.jpg',
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close creative media preview' })).toHaveFocus();
    });
  });

  it('uses a concise action label for the creative upload card', () => {
    render(<CreativeGallery />);

    expect(screen.getByRole('button', { name: 'Share creative media' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Share Your Creativity' })).not.toBeInTheDocument();
  });

  it('disables both upload entry points during an active creative media upload', async () => {
    let resolvePost: ((value: unknown) => void) | undefined;
    mockCreatePost.mockReturnValueOnce(new Promise((resolve) => {
      resolvePost = resolve;
    }));
    render(<CreativeGallery />);

    const file = new File(['media'], 'training-clip.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText('Creative media upload'), { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Uploading...' })).toBeDisabled();
    });
    expect(screen.getByRole('button', { name: 'Share creative media' })).toBeDisabled();

    resolvePost?.({});
    await waitFor(() => {
      expect(mockRefreshPosts).toHaveBeenCalledTimes(1);
    });
  });

  it('creates a social post when a media file is selected without logging the file name', async () => {
    render(<CreativeGallery />);

    const file = new File(['media'], 'private-client-video.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText('Creative media upload'), { target: { files: [file] } });

    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledWith({
        content: expect.stringContaining('#SwanCreative'),
        type: 'art',
        visibility: 'friends',
        media: file,
      });
    });
    expect(mockRefreshPosts).toHaveBeenCalledTimes(1);
    expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status', { name: 'Creative media status' })).toHaveTextContent(
      'Creative media shared to your gallery.',
    );
    expect(mockCreatePost.mock.calls[0][0].content).not.toContain('private-client-video');
  });

  it('warns generically when creative media upload fails without error-level logging', async () => {
    mockCreatePost.mockRejectedValueOnce(new Error('S3AccessDenied private-bucket'));
    render(<CreativeGallery />);

    const file = new File(['media'], 'private-client-video.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText('Creative media upload'), { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('status', { name: 'Creative media status' })).toHaveTextContent(
        'Creative media upload failed. Please try again.',
      );
    });
    expect(mockLoggerWarn).toHaveBeenCalledWith('Unable to upload creative media');
    expect(mockLoggerError).not.toHaveBeenCalled();
    expect(document.body).not.toHaveTextContent(/S3AccessDenied|private-bucket/i);
  });

  it('rejects unsupported creative media with visible feedback before posting', () => {
    render(<CreativeGallery />);

    const file = new File(['notes'], 'training-notes.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('Creative media upload'), { target: { files: [file] } });

    expect(mockCreatePost).not.toHaveBeenCalled();
    expect(screen.getByRole('status', { name: 'Creative media status' })).toHaveTextContent(
      'Upload a JPG, PNG, WebP, MP4, WebM, MOV, or M4V file.',
    );
  });

  it('rejects oversized creative media before posting', () => {
    render(<CreativeGallery />);

    const oversized = new File([new Uint8Array(101 * 1024 * 1024)], 'long-session.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText('Creative media upload'), { target: { files: [oversized] } });

    expect(mockCreatePost).not.toHaveBeenCalled();
    expect(screen.getByRole('status', { name: 'Creative media status' })).toHaveTextContent(
      'Creative media must be 100MB or smaller.',
    );
  });

  it('uses the shared narrow accept list for creative uploads', () => {
    render(<CreativeGallery />);

    expect(screen.getByLabelText('Creative media upload')).toHaveAttribute('accept', CREATIVE_GALLERY_ACCEPT);
    expect(CREATIVE_GALLERY_ACCEPT).not.toContain('image/*');
    expect(CREATIVE_GALLERY_ACCEPT).not.toContain('video/*');
  });

  it('renders the empty state when no media posts exist', () => {
    mockUseProfile.mockReturnValue({ posts: [] });

    render(<CreativeGallery />);

    const emptyState = screen.getByRole('region', { name: 'No media yet' });
    expect(within(emptyState).getByText('Share photos and videos to build your creative gallery')).toBeInTheDocument();
    expect(emptyState.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(
      emptyState.querySelectorAll('svg').length,
    );
  });
});
