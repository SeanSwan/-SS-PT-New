import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '../../Social/Feed/types/PostCardTypes';
import type { SocialFeedApi } from '../../../hooks/social/useSocialFeed';
import HomeCommunityFeed from './HomeCommunityFeed';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../Social/Feed/PostCard', () => ({
  default: ({
    post,
    onLike,
    onComment,
    onLoadComments,
  }: {
    post: Post;
    onLike: () => void;
    onComment: (postId: string, content: string) => void;
    onLoadComments?: (postId: string) => void;
  }) => (
    <article aria-label={`Post ${post.id}`}>
      <h3>{post.content}</h3>
      <button type="button" onClick={onLike}>
        Toggle like {post.id}
      </button>
      <button type="button" onClick={() => onComment(post.id, 'Strong work')}>
        Comment {post.id}
      </button>
      <button type="button" onClick={() => onLoadComments?.(post.id)}>
        Load comments {post.id}
      </button>
    </article>
  ),
}));

vi.mock('../../Social/Feed/components/SocialFeedPanels', () => ({
  EmptyFeedWelcome: ({
    onBrowseChallenges,
    onFindFriends,
  }: {
    onBrowseChallenges: () => void;
    onFindFriends: () => void;
  }) => (
    <section aria-label="Empty feed welcome">
      <button type="button" onClick={onBrowseChallenges}>
        Browse Challenges
      </button>
      <button type="button" onClick={onFindFriends}>
        Find Friends
      </button>
    </section>
  ),
}));

let intersectionCallback: IntersectionObserverCallback | null = null;

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }

  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn((): IntersectionObserverEntry[] => []);
  unobserve = vi.fn();
}

const buildPost = (overrides: Partial<Post> = {}): Post => ({
  id: 'post-1',
  content: 'QA lifted 200 pounds today',
  type: 'workout',
  createdAt: '2026-06-13T12:00:00.000Z',
  user: {
    id: 'user-1',
    firstName: 'QA',
    lastName: 'Member',
    username: 'qa-member',
    role: 'client',
  },
  likesCount: 0,
  commentsCount: 1,
  isLiked: false,
  ...overrides,
});

const buildFeed = (overrides: Partial<SocialFeedApi> = {}): SocialFeedApi => ({
  posts: [],
  isLoading: false,
  error: null,
  hasMore: false,
  loadMore: vi.fn(),
  isLoadingMore: false,
  refreshPosts: vi.fn(),
  createPost: vi.fn(),
  isCreatingPost: false,
  likePost: vi.fn(),
  unlikePost: vi.fn(),
  reactToPost: vi.fn(),
  removeReaction: vi.fn(),
  addComment: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  reportPost: vi.fn(),
  repostPost: vi.fn(),
  getPostDetails: vi.fn(),
  loadComments: vi.fn(),
  ...overrides,
} as SocialFeedApi);

describe('HomeCommunityFeed', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    intersectionCallback = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the upgraded live-signal header and loading state', () => {
    render(<HomeCommunityFeed feed={buildFeed({ isLoading: true })} />);

    expect(screen.getByText('Live community signal')).toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading community feed')).toBeInTheDocument();
  });

  it('shows retry copy and routes the retry button through refreshPosts', () => {
    const refreshPosts = vi.fn();

    render(
      <HomeCommunityFeed
        feed={buildFeed({
          error: 'Feed unavailable',
          refreshPosts,
        })}
      />
    );

    expect(screen.getByText('Needs retry')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(refreshPosts).toHaveBeenCalledTimes(1);
  });

  it('uses real dashboard routes for the empty feed actions', () => {
    render(<HomeCommunityFeed feed={buildFeed()} />);

    expect(screen.getByText('No posts yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /browse challenges/i }));
    fireEvent.click(screen.getByRole('button', { name: /find friends/i }));

    expect(mockNavigate).toHaveBeenNthCalledWith(1, '/user-dashboard/challenges');
    expect(mockNavigate).toHaveBeenNthCalledWith(2, '/user-dashboard/friends');
  });

  it('renders posts and forwards the full interaction surface to PostCard', () => {
    const likePost = vi.fn();
    const unlikePost = vi.fn();
    const addComment = vi.fn();
    const loadComments = vi.fn();
    const likedPost = buildPost({ id: 'post-2', content: 'Liked post', isLiked: true });

    render(
      <HomeCommunityFeed
        feed={buildFeed({
          posts: [buildPost(), likedPost],
          likePost,
          unlikePost,
          addComment,
          loadComments,
        })}
      />
    );

    expect(screen.getByText('2 live posts')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /toggle like post-1/i }));
    fireEvent.click(screen.getByRole('button', { name: /toggle like post-2/i }));
    fireEvent.click(screen.getByRole('button', { name: /comment post-1/i }));
    fireEvent.click(screen.getByRole('button', { name: /load comments post-1/i }));

    expect(likePost).toHaveBeenCalledWith('post-1');
    expect(unlikePost).toHaveBeenCalledWith('post-2');
    expect(addComment).toHaveBeenCalledWith('post-1', 'Strong work');
    expect(loadComments).toHaveBeenCalledWith('post-1');
  });

  it('loads more posts only when the sentinel is visible and idle', () => {
    const loadMore = vi.fn();
    const { rerender } = render(
      <HomeCommunityFeed
        feed={buildFeed({
          posts: [buildPost()],
          hasMore: true,
          loadMore,
        })}
      />
    );

    act(() => {
      intersectionCallback?.([
        { isIntersecting: true } as IntersectionObserverEntry,
      ], {} as IntersectionObserver);
    });

    expect(loadMore).toHaveBeenCalledTimes(1);

    rerender(
      <HomeCommunityFeed
        feed={buildFeed({
          posts: [buildPost()],
          hasMore: true,
          isLoadingMore: true,
          loadMore,
        })}
      />
    );

    act(() => {
      intersectionCallback?.([
        { isIntersecting: true } as IntersectionObserverEntry,
      ], {} as IntersectionObserver);
    });

    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});
