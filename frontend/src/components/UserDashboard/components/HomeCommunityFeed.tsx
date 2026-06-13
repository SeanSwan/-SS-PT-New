/**
 * ============================================================================
 * FILE: HomeCommunityFeed.tsx
 * PURPOSE: The REAL scrolling community feed inside Home's center column
 *          (workstream O2 - Home truly absorbs the retired Feed tab).
 *          Full PostCard interaction surface (reactions, comments, edit,
 *          delete, report, repost) + cursor-style infinite scroll.
 * HOW IT FITS: Lazy-mounted by HomeTabVisionCenter below the Quick Post
 *          composer, replacing the old single latest-post card. Reuses the
 *          battle-tested hooks/social/useSocialFeed (pagination + optimistic
 *          updates) and the Social/Feed PostCard - no forked feed logic.
 * KEY DECISIONS:
 * - No cover studio / composer / stats here: Home's hero and Quick Post
 *   already own those facts (no-duplicate-facts card standard).
 * - Quick Post refresh rides the 'swan:social-post-created' event the hook
 *   already listens for (same contract as the Coach dock's inline share).
 * - Honest states: compact spinner, retry-able error, EmptyFeedWelcome with
 *   real Find Friends / Browse Challenges actions.
 * ============================================================================
 */
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import PostCard from '../../Social/Feed/PostCard';
import { EmptyFeedWelcome } from '../../Social/Feed/components/SocialFeedPanels';
import { InfiniteScrollSentinel, Spinner } from '../../Social/Feed/styles/SocialFeedStyles';
import type { SocialFeedApi } from '../../../hooks/social/useSocialFeed';
import { Eyebrow } from './HomeTabVision.styles';
import {
  CenteredRow,
  EndOfFeed,
  ErrorCopy,
  FeedHint,
  FeedSection,
  FeedSignalCopy,
  FeedSignalHeader,
  FeedStatePanel,
  FeedStatusPill,
  FeedTitle,
  FeedTitleRow,
  RetryButton,
} from './HomeCommunityFeed.styles';

interface HomeCommunityFeedProps {
  /** The single stateful feed mount, owned by HomeTab (O3 unification) -
      one fetch powers composer, spotlight, widgets, and this stream. */
  feed: SocialFeedApi;
}

type FeedNavigationHandlers = {
  onBrowseChallenges: () => void;
  onFindFriends: () => void;
};

type FeedBodyProps = FeedNavigationHandlers & {
  feed: SocialFeedApi;
  sentinelRef: React.RefObject<HTMLDivElement>;
};

const describeLivePostCount = (count: number): string =>
  `${count} live ${count === 1 ? 'post' : 'posts'}`;

const getFeedStatusLabel = (feed: SocialFeedApi): string => {
  if (feed.isLoading) return 'Loading';
  if (feed.error) return 'Needs retry';
  if (feed.posts.length === 0) return 'No posts yet';
  return describeLivePostCount(feed.posts.length);
};

const shouldLoadMore = (
  entries: IntersectionObserverEntry[],
  isLoadingMore: boolean,
): boolean => entries.some((entry) => entry.isIntersecting) && !isLoadingMore;

const useInfiniteFeedScroll = (
  feed: SocialFeedApi,
  sentinelRef: React.RefObject<HTMLDivElement>,
) => {
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!feed.hasMore || !sentinel) return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (shouldLoadMore(entries, feed.isLoadingMore)) void feed.loadMore();
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    return () => {
      observer.unobserve(sentinel);
      observer.disconnect();
    };
  }, [feed.hasMore, feed.isLoadingMore, feed.loadMore]);
};

const FeedLoadingState = () => (
  <FeedStatePanel aria-label="Community feed loading">
    <CenteredRow>
      <Spinner $size={28} aria-label="Loading community feed" />
    </CenteredRow>
  </FeedStatePanel>
);

const FeedErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <FeedStatePanel role="alert">
    <ErrorCopy>The community feed could not load.</ErrorCopy>
    <RetryButton type="button" onClick={onRetry}>
      Try again
    </RetryButton>
  </FeedStatePanel>
);

const FeedEmptyState = ({
  onBrowseChallenges,
  onFindFriends,
}: FeedNavigationHandlers) => (
  <EmptyFeedWelcome
    showActions
    onBrowseChallenges={onBrowseChallenges}
    onFindFriends={onFindFriends}
  />
);

const FeedPostStream = ({
  feed,
  sentinelRef,
}: Pick<FeedBodyProps, 'feed' | 'sentinelRef'>) => (
  <>
    {feed.posts.map((post) => (
      <PostCard
        key={post.id}
        post={post}
        onLike={() => (post.isLiked ? feed.unlikePost(post.id) : feed.likePost(post.id))}
        onReact={feed.reactToPost}
        onRemoveReaction={feed.removeReaction}
        onComment={feed.addComment}
        onEdit={feed.updatePost}
        onDelete={feed.deletePost}
        onReport={feed.reportPost}
        onRepost={feed.repostPost}
        onLoadComments={feed.loadComments}
      />
    ))}

    {feed.hasMore && (
      <InfiniteScrollSentinel ref={sentinelRef}>
        {feed.isLoadingMore && <Spinner $size={20} />}
      </InfiniteScrollSentinel>
    )}

    {!feed.hasMore && <EndOfFeed>You are caught up.</EndOfFeed>}
  </>
);

const FeedBody = ({
  feed,
  onBrowseChallenges,
  onFindFriends,
  sentinelRef,
}: FeedBodyProps) => {
  if (feed.isLoading) return <FeedLoadingState />;
  if (feed.error) return <FeedErrorState onRetry={() => void feed.refreshPosts()} />;
  if (feed.posts.length === 0) {
    return (
      <FeedEmptyState
        onBrowseChallenges={onBrowseChallenges}
        onFindFriends={onFindFriends}
      />
    );
  }
  return <FeedPostStream feed={feed} sentinelRef={sentinelRef} />;
};

const HomeCommunityFeed: React.FC<HomeCommunityFeedProps> = ({ feed }) => {
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const statusLabel = getFeedStatusLabel(feed);

  useInfiniteFeedScroll(feed, sentinelRef);

  return (
    <FeedSection aria-label="Community feed">
      <FeedSignalHeader>
        <FeedSignalCopy>
          <FeedTitleRow>
            <Eyebrow>
              <Users size={13} aria-hidden="true" />
              Community Feed
            </Eyebrow>
          </FeedTitleRow>
          <FeedTitle>Live community signal</FeedTitle>
          <FeedHint>
            Proof, questions, and coach-marked wins from the SwanStudios floor.
          </FeedHint>
        </FeedSignalCopy>
        <FeedStatusPill aria-live="polite">{statusLabel}</FeedStatusPill>
      </FeedSignalHeader>

      <FeedBody
        feed={feed}
        sentinelRef={sentinelRef}
        onBrowseChallenges={() => navigate('/user-dashboard/challenges')}
        onFindFriends={() => navigate('/user-dashboard/friends')}
      />
    </FeedSection>
  );
};

export default HomeCommunityFeed;
