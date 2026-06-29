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
import type { Post } from '../../Social/Feed/types/PostCardTypes';
import { EmptyFeedWelcome } from '../../Social/Feed/components/SocialFeedPanels';
import { InfiniteScrollSentinel, Spinner } from '../../Social/Feed/styles/SocialFeedStyles';
import type { SocialFeedApi } from '../../../hooks/social/useSocialFeed';
import type { FeedEnrichmentItem } from '../../../hooks/social/useFeedEnrichment';
import { Eyebrow } from './HomeTabVision.styles';
import {
  CenteredRow,
  EndOfFeed,
  ErrorCopy,
  FeedEnrichmentLink,
  FeedEnrichmentMeta,
  FeedEnrichmentSourceBar,
  FeedEnrichmentStack,
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
  feed: SocialFeedApi;
  enrichmentItems?: FeedEnrichmentItem[];
}

type FeedNavigationHandlers = {
  onBrowseChallenges: () => void;
  onFindFriends: () => void;
};

type FeedBodyProps = FeedNavigationHandlers & {
  feed: SocialFeedApi;
  enrichmentItems: FeedEnrichmentItem[];
  sentinelRef: React.RefObject<HTMLDivElement>;
};

const sourceLabels: Record<FeedEnrichmentItem['source'], string> = {
  'nasa-images': 'NASA Image Library',
  smithsonian: 'Smithsonian Open Access',
  nps: 'National Park Service',
  'wikimedia-commons': 'Wikimedia Commons',
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

const sourceProfiles: Record<FeedEnrichmentItem['source'], Pick<Post['user'], 'firstName' | 'lastName' | 'username'>> = {
  'nasa-images': { firstName: 'NASA', lastName: 'Image Library', username: 'nasa-images' },
  smithsonian: { firstName: 'Smithsonian', lastName: 'Open Access', username: 'smithsonian-open-access' },
  nps: { firstName: 'National Park', lastName: 'Service', username: 'national-park-service' },
  'wikimedia-commons': { firstName: 'Wikimedia', lastName: 'Commons', username: 'wikimedia-commons' },
  'swan-curated': { firstName: 'Swan', lastName: 'Studios', username: 'swanstudios' },
};

const noopPostAction = () => undefined;

const buildEnrichmentPost = (item: FeedEnrichmentItem): Post => {
  const sourceProfile = sourceProfiles[item.source];
  const hasMediaImage = item.mediaType === 'image' && !!item.mediaUrl;
  const safeDate = item.publishedAt || new Date(0).toISOString();

  return {
    id: `feed-enrichment-${item.id}`,
    content: `${item.title}\n\n${item.summary}`,
    type: 'general',
    createdAt: safeDate,
    user: {
      id: `feed-enrichment-${item.source}`,
      ...sourceProfile,
      photo: hasMediaImage ? item.mediaUrl : undefined,
    },
    likesCount: 0,
    commentsCount: 0,
    isLiked: false,
    reactionCounts: { thumbs_up: 0, heart: 0, swan: 0 },
    userReactions: [],
    mediaUrl: item.mediaUrl,
    mediaType: item.mediaType || null,
    comments: [],
  };
};

const FeedEnrichmentSourceContext = ({ item }: { item: FeedEnrichmentItem }) => (
  <FeedEnrichmentSourceBar aria-label={`${sourceLabels[item.source]} source context`}>
    <FeedEnrichmentMeta>{sourceLabels[item.source]} / {item.category}</FeedEnrichmentMeta>
    {item.url && (
      <FeedEnrichmentLink href={item.url} target="_blank" rel="noopener noreferrer">
        Open source
        <ExternalLink size={14} aria-hidden="true" />
      </FeedEnrichmentLink>
    )}
  </FeedEnrichmentSourceBar>
);

const FeedEnrichmentCardView = ({ item }: { item: FeedEnrichmentItem }) => (
  <PostCard
    post={buildEnrichmentPost(item)}
    onLike={noopPostAction}
    onComment={noopPostAction}
    readOnly
    contextSlot={<FeedEnrichmentSourceContext item={item} />}
  />
);

const ENRICHMENT_INSERT_EVERY = 3;
const MAX_TRAILING_ENRICHMENT = 4;

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
  enrichmentItems,
  sentinelRef,
}: Pick<FeedBodyProps, 'feed' | 'enrichmentItems' | 'sentinelRef'>) => {
  const insertedEnrichmentCount = Math.floor(feed.posts.length / ENRICHMENT_INSERT_EVERY);
  const trailingEnrichment = enrichmentItems.slice(
    insertedEnrichmentCount,
    insertedEnrichmentCount + MAX_TRAILING_ENRICHMENT,
  );

  return (
    <>
      {feed.posts.map((post, index) => {
        const enrichmentIndex = Math.floor((index + 1) / ENRICHMENT_INSERT_EVERY) - 1;
        const showEnrichment = (index + 1) % ENRICHMENT_INSERT_EVERY === 0 && enrichmentItems[enrichmentIndex];
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
            {showEnrichment && <FeedEnrichmentCardView item={enrichmentItems[enrichmentIndex]} />}
          </React.Fragment>
        );
      })}

      <FeedEnrichmentCards items={trailingEnrichment} />

      {feed.hasMore && (
        <InfiniteScrollSentinel ref={sentinelRef}>
          {feed.isLoadingMore && <Spinner $size={20} />}
        </InfiniteScrollSentinel>
      )}

      {!feed.hasMore && <EndOfFeed>You are caught up.</EndOfFeed>}
    </>
  );
};

const FeedBody = ({
  feed,
  enrichmentItems,
  onBrowseChallenges,
  onFindFriends,
  sentinelRef,
}: FeedBodyProps) => {
  if (feed.isLoading) return <FeedLoadingState />;
  if (feed.error) return <FeedErrorState onRetry={() => void feed.refreshPosts()} />;
  if (feed.posts.length === 0) {
    return (
      <>
        <FeedEmptyState
          onBrowseChallenges={onBrowseChallenges}
          onFindFriends={onFindFriends}
        />
        <FeedEnrichmentCards items={enrichmentItems} />
      </>
    );
  }
  return <FeedPostStream feed={feed} enrichmentItems={enrichmentItems} sentinelRef={sentinelRef} />;
};

const HomeCommunityFeed: React.FC<HomeCommunityFeedProps> = ({
  feed,
  enrichmentItems = [],
}) => {
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
        enrichmentItems={enrichmentItems}
        sentinelRef={sentinelRef}
        onBrowseChallenges={() => navigate('/user-dashboard/challenges')}
        onFindFriends={() => navigate('/user-dashboard/friends')}
      />
    </FeedSection>
  );
};

export default HomeCommunityFeed;
