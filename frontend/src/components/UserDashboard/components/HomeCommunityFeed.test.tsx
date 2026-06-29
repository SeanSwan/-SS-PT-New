import type React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '../../Social/Feed/types/PostCardTypes';
import type { SocialFeedApi } from '../../../hooks/social/useSocialFeed';
import type { FeedEnrichmentItem } from '../../../hooks/social/useFeedEnrichment';
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
    readOnly,
    contextSlot,
  }: {
    post: Post;
    onLike: () => void;
    onComment: (postId: string, content: string) => void;
    onLoadComments?: (postId: string) => void;
    readOnly?: boolean;
    contextSlot?: React.ReactNode;
  }) => (
    <article aria-label={`Post ${post.id}`} data-readonly={readOnly ? 'true' : 'false'}>
      <h3>{post.content}</h3>
      {post.user.photo && <img src={post.user.photo} alt={`avatar ${post.id}`} />}
      {post.mediaUrl && <img src={post.mediaUrl} alt={`media ${post.id}`} />}
      {!readOnly && (
        <>
          <button type="button" onClick={onLike}>
            Toggle like {post.id}
          </button>
          <button type="button" onClick={() => onComment(post.id, 'Strong work')}>
            Comment {post.id}
          </button>
          <button type="button" onClick={() => onLoadComments?.(post.id)}>
            Load comments {post.id}
          </button>
        </>
      )}
      {contextSlot}
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

const enrichmentItems: FeedEnrichmentItem[] = [
  {
    id: 'nasa-images-GSFC_20260628',
    kind: 'enrichment',
    source: 'nasa-images',
    category: 'space',
    title: 'Earth glows beyond the blue horizon',
    summary: 'A calm NASA Image Library spark for the community feed.',
    mediaType: 'image',
    mediaUrl: 'https://images.example.com/earth.jpg',
    url: 'https://images.nasa.gov/details/GSFC_20260628',
    publishedAt: '2026-06-28T00:00:00.000Z',
  },
  {
    id: 'nps-yose',
    kind: 'enrichment',
    source: 'nps',
    category: 'parks',
    title: 'Yosemite National Park',
    summary: 'A quick official park card that is separate from user posts.',
    mediaType: 'image',
    mediaUrl: 'https://www.nps.gov/common/uploads/structured_data/yose-valley.jpg',
    url: 'https://www.nps.gov/yose/index.htm',
    publishedAt: '2026-06-27T00:00:00.000Z',
  },
];
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

  it('inserts API-fed enrichment cards without treating them as user posts', () => {
    const posts = [
      buildPost({ id: 'post-1' }),
      buildPost({ id: 'post-2', content: 'Second real post' }),
      buildPost({ id: 'post-3', content: 'Third real post' }),
      buildPost({ id: 'post-4', content: 'Fourth real post' }),
    ];

    render(<HomeCommunityFeed feed={buildFeed({ posts })} enrichmentItems={enrichmentItems} />);

    expect(screen.getByText('4 live posts')).toBeInTheDocument();
    expect(screen.getAllByRole('article', { name: /Post post-/i })).toHaveLength(4);

    const enrichmentPost = screen.getByRole('article', {
      name: /Post feed-enrichment-nasa-images-GSFC_20260628/i,
    });
    expect(enrichmentPost).toHaveAttribute('data-readonly', 'true');
    expect(within(enrichmentPost).getByText(/Earth glows beyond the blue horizon/)).toBeInTheDocument();
    expect(within(enrichmentPost).getByAltText('avatar feed-enrichment-nasa-images-GSFC_20260628'))
      .toHaveAttribute('src', 'https://images.example.com/earth.jpg');
    expect(within(enrichmentPost).getByAltText('media feed-enrichment-nasa-images-GSFC_20260628'))
      .toHaveAttribute('src', 'https://images.example.com/earth.jpg');
    expect(within(enrichmentPost).getByRole('link', { name: /open source/i }))
      .toHaveAttribute('href', 'https://images.nasa.gov/details/GSFC_20260628');
    expect(within(enrichmentPost).queryByRole('button', { name: /toggle like/i })).not.toBeInTheDocument();
  });

  it('short feed still receives enrichment so early community timelines are not dead', () => {
    render(<HomeCommunityFeed feed={buildFeed({ posts: [buildPost()] })} enrichmentItems={enrichmentItems} />);

    expect(screen.getByText('1 live post')).toBeInTheDocument();
    expect(screen.getByText('QA lifted 200 pounds today')).toBeInTheDocument();
    expect(screen.getByText(/Earth glows beyond the blue horizon/)).toBeInTheDocument();
  });
  it('keeps the empty feed actions while showing quiet filler cards', () => {
    render(<HomeCommunityFeed feed={buildFeed()} enrichmentItems={enrichmentItems} />);

    expect(screen.getByLabelText('Empty feed welcome')).toBeInTheDocument();
    expect(screen.getByText(/Earth glows beyond the blue horizon/)).toBeInTheDocument();
    expect(screen.getByText(/Yosemite National Park/)).toBeInTheDocument();
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
