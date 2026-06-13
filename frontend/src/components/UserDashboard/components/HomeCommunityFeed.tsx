/**
 * ============================================================================
 * FILE: HomeCommunityFeed.tsx
 * PURPOSE: The REAL scrolling community feed inside Home's center column
 *          (workstream O2 — Home truly absorbs the retired Feed tab).
 *          Full PostCard interaction surface (reactions, comments, edit,
 *          delete, report, repost) + cursor-style infinite scroll.
 * HOW IT FITS: Lazy-mounted by HomeTabVisionCenter below the Quick Post
 *          composer, replacing the old single latest-post card. Reuses the
 *          battle-tested hooks/social/useSocialFeed (pagination + optimistic
 *          updates) and the Social/Feed PostCard — no forked feed logic.
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
import styled from 'styled-components';
import { Users } from 'lucide-react';
import PostCard from '../../Social/Feed/PostCard';
import { EmptyFeedWelcome } from '../../Social/Feed/components/SocialFeedPanels';
import { InfiniteScrollSentinel, Spinner } from '../../Social/Feed/styles/SocialFeedStyles';
import type { SocialFeedApi } from '../../../hooks/social/useSocialFeed';
import { Eyebrow } from './HomeTabVision.styles';

const FeedSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
`;

const FeedSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.25rem 0;
`;

const CenteredRow = styled.div`
  display: flex;
  justify-content: center;
  padding: 1.25rem 0;
`;

const ErrorCopy = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent);
  font: 700 0.9rem/1.5 var(--font-ui, 'Sora', sans-serif);
`;

const RetryButton = styled.button`
  align-self: flex-start;
  min-height: 44px;
  padding: 0 1.1rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 800 0.8rem/1 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;

  &:hover {
    border-color: var(--accent-secondary, #8B5CF6);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

interface HomeCommunityFeedProps {
  /** The single stateful feed mount, owned by HomeTab (O3 unification) —
      one fetch powers composer, spotlight, widgets, and this stream. */
  feed: SocialFeedApi;
}

const HomeCommunityFeed: React.FC<HomeCommunityFeedProps> = ({ feed }) => {
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feed.hasMore) return undefined;
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver((entries) => {
      const isVisible = entries.some((entry) => entry.isIntersecting);
      if (!isVisible || feed.isLoadingMore) return;
      void feed.loadMore();
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    return () => {
      observer.unobserve(sentinel);
      observer.disconnect();
    };
  }, [feed.hasMore, feed.isLoadingMore, feed.loadMore]);

  return (
    <FeedSection aria-label="Community feed">
      <FeedSectionHeader>
        <Eyebrow>
          <Users size={13} aria-hidden="true" />
          Community Feed
        </Eyebrow>
      </FeedSectionHeader>

      {feed.isLoading && (
        <CenteredRow>
          <Spinner $size={28} aria-label="Loading community feed" />
        </CenteredRow>
      )}

      {!feed.isLoading && feed.error && (
        <>
          <ErrorCopy>The community feed could not load.</ErrorCopy>
          <RetryButton type="button" onClick={() => void feed.refreshPosts()}>
            Try again
          </RetryButton>
        </>
      )}

      {!feed.isLoading && !feed.error && feed.posts.length === 0 && (
        <EmptyFeedWelcome
          showActions
          onBrowseChallenges={() => navigate('/user-dashboard/challenges')}
          onFindFriends={() => navigate('/user-dashboard/friends')}
        />
      )}

      {!feed.isLoading && !feed.error && feed.posts.map((post) => (
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

      {!feed.isLoading && !feed.error && feed.hasMore && (
        <InfiniteScrollSentinel ref={sentinelRef}>
          {feed.isLoadingMore && <Spinner $size={20} />}
        </InfiniteScrollSentinel>
      )}
    </FeedSection>
  );
};

export default HomeCommunityFeed;
