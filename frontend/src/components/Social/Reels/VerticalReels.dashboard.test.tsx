import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VerticalReels from './VerticalReels';

const useSocialFeedMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/social/useSocialFeed', () => ({
  useSocialFeed: useSocialFeedMock,
}));

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

const basePost = {
  id: 'reel-1',
  content: 'Trap bar PR from today',
  type: 'workout',
  createdAt: '2026-06-22T12:00:00.000Z',
  mediaUrl: '/uploads/reel.mp4?X-Amz-Signature=abc',
  mediaType: null,
  user: {
    id: 'member-1',
    firstName: 'Avery',
    lastName: 'Stone',
    username: 'avery',
    photo: '',
  },
  likesCount: 3,
  commentsCount: 2,
  isLiked: false,
};

const buildFeed = (overrides: Record<string, unknown> = {}) => ({
  posts: [],
  isLoading: false,
  error: null,
  refreshPosts: vi.fn(),
  likePost: vi.fn(),
  unlikePost: vi.fn(),
  loadComments: vi.fn(),
  ...overrides,
});

describe('VerticalReels dashboard frame', () => {
  const clipboardWriteMock = vi.fn();

  beforeEach(() => {
    useSocialFeedMock.mockReset();
    toastMock.mockReset();
    clipboardWriteMock.mockReset();
    clipboardWriteMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteMock },
    });
  });

  it('does not show a false empty state while the feed is loading', () => {
    useSocialFeedMock.mockReturnValue(buildFeed({ isLoading: true }));

    render(<VerticalReels frame="dashboard" />);

    expect(screen.getByText('Loading Reels')).toBeInTheDocument();
    expect(screen.queryByText('No media reels yet')).not.toBeInTheDocument();
  });

  it('shows a retry state when the feed fails before media loads', () => {
    const refreshPosts = vi.fn();
    useSocialFeedMock.mockReturnValue(buildFeed({
      error: new Error('feed failed'),
      refreshPosts,
    }));

    render(<VerticalReels frame="dashboard" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Reels need a reload');
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refreshPosts).toHaveBeenCalledTimes(1);
  });

  it('renders signed video URLs as videos instead of falling through to empty or image UI', () => {
    useSocialFeedMock.mockReturnValue(buildFeed({ posts: [basePost] }));

    const { container } = render(<VerticalReels frame="dashboard" />);
    const video = container.querySelector('video');

    expect(screen.getByRole('region', { name: 'SwanStudios Reels' })).toBeInTheDocument();
    expect(video).toHaveAttribute('src', '/uploads/reel.mp4?X-Amz-Signature=abc');
    expect(screen.getByRole('button', { name: /unmute reel/i })).toBeInTheDocument();
  });

  it('wires like, comments, and share actions instead of rendering dead buttons', () => {
    const likePost = vi.fn();
    const loadComments = vi.fn();
    useSocialFeedMock.mockReturnValue(buildFeed({
      posts: [basePost],
      likePost,
      loadComments,
    }));

    render(<VerticalReels frame="dashboard" />);

    fireEvent.click(screen.getByRole('button', { name: /swan react to avery stone/i }));
    fireEvent.click(screen.getByRole('button', { name: /show comments for avery stone/i }));
    fireEvent.click(screen.getByRole('button', { name: /copy share link for avery stone/i }));

    expect(likePost).toHaveBeenCalledWith('reel-1');
    expect(loadComments).toHaveBeenCalledWith('reel-1');
    expect(screen.getByText('Loading comments...')).toBeInTheDocument();
    expect(clipboardWriteMock).toHaveBeenCalledWith(`${window.location.origin}/social/posts/reel-1`);
  });

  it('removes an existing Swan reaction instead of double-liking an active reel', () => {
    const unlikePost = vi.fn();
    useSocialFeedMock.mockReturnValue(buildFeed({
      posts: [{ ...basePost, isLiked: true }],
      unlikePost,
    }));

    render(<VerticalReels frame="dashboard" />);
    fireEvent.click(screen.getByRole('button', { name: /remove swan reaction from avery stone/i }));

    expect(unlikePost).toHaveBeenCalledWith('reel-1');
  });
});
