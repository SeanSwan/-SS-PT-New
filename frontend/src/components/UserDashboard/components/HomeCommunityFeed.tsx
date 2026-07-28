/**
 * ============================================================================
 * FILE: HomeCommunityFeed.tsx
 * PURPOSE: The REAL scrolling community feed inside Home's center column
 *          (workstream O2 - Home truly absorbs the retired Feed tab).
 *          Full PostCard interaction surface plus quiet enrichment cards.
 * ============================================================================
 */
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Users } from 'lucide-react';
import PostCard from '../../Social/Feed/PostCard';
import { EmptyFeedWelcome } from '../../Social/Feed/components/SocialFeedPanels';
import { InfiniteScrollSentinel, Spinner } from '../../Social/Feed/styles/SocialFeedStyles';
import type { Post } from '../../Social/Feed/types/PostCardTypes';
import type { SocialFeedApi } from '../../../hooks/social/useSocialFeed';
import type { FeedEnrichmentItem } from '../../../hooks/social/useFeedEnrichment';
import { Eyebrow } from './HomeTabVision.styles';
import { HomeFeedFocusBanner } from './HomeFeedFocusBanner';
import { HOME_FEED_ALL_FOCUS, isHomeFeedFocused, type HomeFeedFocus } from './HomeFeedFocus';
import { useHomeFeedFocusPosts } from './useHomeFeedFocusPosts';
import { CenteredRow, EndOfFeed, ErrorCopy, FeedEnrichmentCard, FeedEnrichmentCopy, FeedEnrichmentLabel, FeedEnrichmentLink, FeedEnrichmentMediaImage, FeedEnrichmentMediaVideo, FeedEnrichmentMeta, FeedEnrichmentStack, FeedEnrichmentSummary, FeedEnrichmentTitle, FeedHint, FeedSection, FeedSignalCopy, FeedSignalHeader, FeedStatePanel, FeedStatusPill, FeedTitle, FeedTitleRow, RetryButton } from './HomeCommunityFeed.styles';

interface HomeCommunityFeedProps {
  feed: SocialFeedApi;
  enrichmentItems?: FeedEnrichmentItem[];
  focus?: HomeFeedFocus;
  onClearFocus?: () => void;
}

type FeedNavigationHandlers = {
  onBrowseChallenges: () => void;
  onFindFriends: () => void;
};

type FeedBodyProps = FeedNavigationHandlers & {
  feed: SocialFeedApi;
  posts: Post[];
  enrichmentItems: FeedEnrichmentItem[];
  sentinelRef: React.RefObject<HTMLDivElement>;
  focusActive: boolean;
  focusLoading: boolean;
  focusError: Error | null;
  onFocusRetry: () => void;
  onClearFocus: () => void;
};

const sourceLabels: Record<FeedEnrichmentItem['source'], string> = {
  'nasa-apod': 'Space Spark',
  inaturalist: 'Nature Note',
  quotable: 'Momentum Cue',
  'swan-curated': 'Swan Cue',
};

const describeLivePostCount = (count: number): string =>
  `${count} live ${count === 1 ? 'post' : 'posts'}`;

const getFeedStatusLabel = (feed: SocialFeedApi): string => {
  if (feed.isLoading) return 'Loading';
  if (feed.error) return 'Needs retry';
  if (feed.posts.length === 0) return 'No posts yet';
  return describeLivePostCount(feed.posts.length);
};

const getFocusedStatusLabel = (count: number, loading: boolean): string => {
  if (loading) return 'Loading matches';
  return `${count} ${count === 1 ? 'match' : 'matches'}`;
};

const shouldLoadMore = (
  entries: IntersectionObserverEntry[],
  isLoadingMore: boolean,
): boolean => entries.some((entry) => entry.isIntersecting) && !isLoadingMore;

const useInfiniteFeedScroll = (
  feed: SocialFeedApi,
  sentinelRef: React.RefObject<HTMLDivElement>,
  disabled: boolean,
) => {
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (disabled || !feed.hasMore || !sentinel) return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (shouldLoadMore(entries, feed.isLoadingMore)) void feed.loadMore();
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    return () => {
      observer.unobserve(sentinel);
      observer.disconnect();
    };
  }, [disabled, feed.hasMore, feed.isLoadingMore, feed.loadMore]);
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
    <RetryButton type="button" onClick={onRetry}>Try again</RetryButton>
  </FeedStatePanel>
);

const FocusedFeedEmptyState = ({ onClearFocus }: { onClearFocus: () => void }) => (
  <FeedStatePanel aria-label="Focused community feed empty">
    <ErrorCopy>No posts matched this signal yet.</ErrorCopy>
    <RetryButton type="button" onClick={onClearFocus}>Back to all Home posts</RetryButton>
  </FeedStatePanel>
);

const FeedEmptyState = ({ onBrowseChallenges, onFindFriends }: FeedNavigationHandlers) => (
  <EmptyFeedWelcome
    showActions
    onBrowseChallenges={onBrowseChallenges}
    onFindFriends={onFindFriends}
  />
);

const FeedEnrichmentCardView = ({ item }: { item: FeedEnrichmentItem }) => (
  <FeedEnrichmentCard aria-label={`Swan Signal ${item.title}`}>
    <FeedEnrichmentCopy>
      <FeedEnrichmentLabel>Swan Signal</FeedEnrichmentLabel>
      <FeedEnrichmentMeta>{sourceLabels[item.source]} / {item.category}</FeedEnrichmentMeta>
      <FeedEnrichmentTitle>{item.title}</FeedEnrichmentTitle>
      <FeedEnrichmentSummary>{item.summary}</FeedEnrichmentSummary>
      {item.url && (
        <FeedEnrichmentLink href={item.url} target="_blank" rel="noopener noreferrer">
          Open source
          <ExternalLink size={14} aria-hidden="true" />
        </FeedEnrichmentLink>
      )}
    </FeedEnrichmentCopy>
    {item.mediaUrl && item.mediaType === 'video' && (
      <FeedEnrichmentMediaVideo src={item.mediaUrl} muted playsInline controls preload="metadata" />
    )}
    {item.mediaUrl && item.mediaType !== 'video' && (
      <FeedEnrichmentMediaImage src={item.mediaUrl} alt={item.title} loading="lazy" />
    )}
  </FeedEnrichmentCard>
);

const FeedEnrichmentCards = ({ items }: { items: FeedEnrichmentItem[] }) => {
  if (items.length === 0) return null;
  return (
    <FeedEnrichmentStack aria-label="Quiet feed enrichment">
      {items.map((item) => <FeedEnrichmentCardView key={item.id} item={item} />)}
    </FeedEnrichmentStack>
  );
};

const FeedPostStream = ({
  feed,
  posts,
  enrichmentItems,
  sentinelRef,
  showEnrichment,
}: Pick<FeedBodyProps, 'feed' | 'posts' | 'enrichmentItems' | 'sentinelRef'> & { showEnrichment: boolean }) => {
  const trailingEnrichment = showEnrichment && posts.length < 3 ? enrichmentItems.slice(0, 2) : [];

  return (
    <>
      {posts.map((post, index) => {
        const enrichmentIndex = Math.floor((index + 1) / 3) - 1;
        const showCard = showEnrichment && (index + 1) % 3 === 0 && enrichmentItems[enrichmentIndex];
        return (
          <React.Fragment key={post.id}>
            <PostCard
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
            {showCard && <FeedEnrichmentCardView item={enrichmentItems[enrichmentIndex]} />}
          </React.Fragment>
        );
      })}

      <FeedEnrichmentCards items={trailingEnrichment} />

      {showEnrichment && feed.hasMore && (
        <InfiniteScrollSentinel ref={sentinelRef}>
          {feed.isLoadingMore && <Spinner $size={20} />}
        </InfiniteScrollSentinel>
      )}

      {showEnrichment && !feed.hasMore && <EndOfFeed>You are caught up.</EndOfFeed>}
    </>
  );
};

const FeedBody = ({
  feed,
  posts,
  enrichmentItems,
  onBrowseChallenges,
  onFindFriends,
  sentinelRef,
  focusActive,
  focusLoading,
  focusError,
  onFocusRetry,
  onClearFocus,
}: FeedBodyProps) => {
  if (focusActive) {
    if (focusLoading) return <FeedLoadingState />;
    if (focusError) return <FeedErrorState onRetry={onFocusRetry} />;
    if (posts.length === 0) return <FocusedFeedEmptyState onClearFocus={onClearFocus} />;
    return <FeedPostStream feed={feed} posts={posts} enrichmentItems={[]} sentinelRef={sentinelRef} showEnrichment={false} />;
  }
  if (feed.isLoading) return <FeedLoadingState />;
  if (feed.error) return <FeedErrorState onRetry={() => void feed.refreshPosts()} />;
  if (feed.posts.length === 0) {
    return (
      <>
        <FeedEmptyState onBrowseChallenges={onBrowseChallenges} onFindFriends={onFindFriends} />
        <FeedEnrichmentCards items={enrichmentItems} />
      </>
    );
  }
  return <FeedPostStream feed={feed} posts={posts} enrichmentItems={enrichmentItems} sentinelRef={sentinelRef} showEnrichment />;
};

const HomeCommunityFeed: React.FC<HomeCommunityFeedProps> = ({
  feed,
  enrichmentItems = [],
  focus = HOME_FEED_ALL_FOCUS,
  onClearFocus = () => undefined,
}) => {
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const focusActive = isHomeFeedFocused(focus);
  const focusedFeed = useHomeFeedFocusPosts(focus, feed);
  const posts = focusActive ? focusedFeed.posts : feed.posts;
  const statusLabel = focusActive
    ? getFocusedStatusLabel(posts.length, focusedFeed.isLoading)
    : getFeedStatusLabel(feed);

  useInfiniteFeedScroll(feed, sentinelRef, focusActive);

  return (
    <FeedSection id="home-community-feed" tabIndex={-1} aria-label="Community feed">
      <FeedSignalHeader>
        <FeedSignalCopy>
          <FeedTitleRow>
            <Eyebrow>
              <Users size={13} aria-hidden="true" />
              Community Feed
            </Eyebrow>
          </FeedTitleRow>
          <FeedTitle>Live community signal</FeedTitle>
          <FeedHint>Proof, questions, and coach-marked wins from the SwanStudios floor.</FeedHint>
        </FeedSignalCopy>
        <FeedStatusPill aria-live="polite">{statusLabel}</FeedStatusPill>
      </FeedSignalHeader>

      <HomeFeedFocusBanner
        focus={focus}
        resultCount={posts.length}
        loading={focusedFeed.isLoading}
        onClearFocus={onClearFocus}
      />

      <FeedBody
        feed={feed}
        posts={posts}
        enrichmentItems={enrichmentItems}
        sentinelRef={sentinelRef}
        focusActive={focusActive}
        focusLoading={focusedFeed.isLoading}
        focusError={focusedFeed.error}
        onFocusRetry={focusedFeed.refetch}
        onClearFocus={onClearFocus}
        onBrowseChallenges={() => navigate('/user-dashboard/challenges')}
        onFindFriends={() => navigate('/user-dashboard/friends')}
      />
    </FeedSection>
  );
};

export default HomeCommunityFeed;
