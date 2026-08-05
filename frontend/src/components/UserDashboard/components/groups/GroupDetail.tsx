/**
 * ============================================================================
 * FILE: GroupDetail.tsx
 * PURPOSE: One group's page — identity header, its OWN feed (full PostCard
 *          interaction surface), composer for members, member rail, chat link.
 * HOW IT FITS: Rendered by GroupsTab when ?g=<id> is present. The feed is a
 *          group-scoped useSocialFeed instance (same API as the Home feed).
 * ============================================================================
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock3, Globe, Lock, MessageCircle, Users } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useGroupDetail, useGroupMembershipActions, useGroupModeration, type CommunityGroup } from '../../../../hooks/social/useGroups';
import { useSocialFeed } from '../../../../hooks/social/useSocialFeed';
import PostCard from '../../../Social/Feed/PostCard';
import { InfiniteScrollSentinel, Spinner } from '../../../Social/Feed/styles/SocialFeedStyles';
import GroupComposer from './GroupComposer';
import GroupMemberRail from './GroupMemberRail';
import {
  DetailHeaderCard,
  DetailLayout,
  DetailTitleBlock,
  FeedColumn,
  LockedPanel,
} from './GroupDetail.styles';
import {
  EmptyStateCard,
  GroupEmojiTile,
  GroupMetaRow,
  PrimaryGroupButton,
  QuietGroupButton,
  StatusPill,
} from './GroupsShared.styles';
import { StyledBox } from '@/components/ui/StyledBox';

const CHAT_DASHBOARD_ROLES = new Set(['admin', 'trainer', 'client']);

interface GroupDetailProps {
  groupId: number;
  onBack: () => void;
}

const GroupDetail: React.FC<GroupDetailProps> = ({ groupId, onBack }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const detail = useGroupDetail(groupId);
  const actions = useGroupMembershipActions();
  const moderation = useGroupModeration(groupId);
  const group: CommunityGroup | null = detail.group;
  // Only fetch the feed once we know the viewer may see it — a private group's
  // 403 would otherwise fire an error toast behind the LockedPanel.
  const feed = useSocialFeed({ groupId, enabled: Boolean(group?.canViewContent) });
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isMutating, setIsMutating] = useState(false);

  const canModerate = Boolean(group?.canModerate);
  const isOwner = group?.myMembership?.role === 'owner';
  const isActiveMember = group?.myMembership?.status === 'active';
  const canOpenChat = Boolean(
    group?.conversationId && isActiveMember && CHAT_DASHBOARD_ROLES.has(String(user?.role)),
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!feed.hasMore || !sentinel || !group?.canViewContent) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !feed.isLoadingMore) void feed.loadMore();
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feed, feed.hasMore, feed.isLoadingMore, feed.loadMore, group?.canViewContent]);

  if (detail.isLoading) {
    return (
      <EmptyStateCard aria-label="Loading group">
        <Spinner $size={26} aria-label="Loading group" />
      </EmptyStateCard>
    );
  }

  if (detail.error || !group) {
    return (
      <EmptyStateCard role="alert">
        {detail.error ?? 'Unable to load this group.'}
        <QuietGroupButton type="button" onClick={onBack}>
          <ArrowLeft size={15} aria-hidden="true" />
          Back to groups
        </QuietGroupButton>
      </EmptyStateCard>
    );
  }

  const handleJoin = async () => {
    setIsMutating(true);
    try {
      const joined = await actions.joinGroup(group.id);
      await detail.refresh();
      // Only refresh the feed if the join actually granted content access
      // (public → active). A private join yields 'pending' → still locked.
      if (joined?.myMembership?.status === 'active') await feed.refreshPosts();
    } finally {
      setIsMutating(false);
    }
  };

  const handleLeave = async () => {
    setIsMutating(true);
    try {
      const left = await actions.leaveGroup(group.id);
      if (left) await detail.refresh();
    } finally {
      setIsMutating(false);
    }
  };

  const runModeration = async (action: Promise<boolean>) => {
    setIsMutating(true);
    try {
      const ok = await action;
      if (ok) await detail.refresh();
    } finally {
      setIsMutating(false);
    }
  };

  const handleTransfer = (userId: number) => {
    if (!window.confirm('Transfer ownership of this group? You will become a moderator.')) return;
    void runModeration(moderation.transferOwnership(userId));
  };

  const handleArchive = async () => {
    if (!window.confirm('Archive this group? It will be hidden from everyone. This cannot be undone from the app.')) return;
    setIsMutating(true);
    try {
      const ok = await moderation.archiveGroup();
      if (ok) onBack();
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <DetailLayout>
      <DetailHeaderCard>
        <QuietGroupButton type="button" onClick={onBack}>
          <ArrowLeft size={15} aria-hidden="true" />
          All groups
        </QuietGroupButton>
        <DetailTitleBlock>
          <GroupEmojiTile aria-hidden="true">{group.emoji || group.name.slice(0, 2).toUpperCase()}</GroupEmojiTile>
          <StyledBox as="div" $style={{ minWidth: 0 }}>
            <h2>{group.name}</h2>
            <GroupMetaRow>
              <span><Users size={13} aria-hidden="true" />{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
              <span>
                {group.privacy === 'private' ? <Lock size={13} aria-hidden="true" /> : <Globe size={13} aria-hidden="true" />}
                {group.privacy}
              </span>
              {group.lastActivityAt && (
                <span><Clock3 size={13} aria-hidden="true" />active {new Date(group.lastActivityAt).toLocaleDateString()}</span>
              )}
            </GroupMetaRow>
            {group.description && <p>{group.description}</p>}
          </StyledBox>
        </DetailTitleBlock>
        <StyledBox as="div" $style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {group.myMembership?.role && group.myMembership.role !== 'member' && group.myMembership.status === 'active' && (
            <StatusPill $tone="gold">{group.myMembership.role}</StatusPill>
          )}
          {group.myMembership?.status === 'pending' && (
            <StatusPill $tone="violet">Request pending</StatusPill>
          )}
          {!group.myMembership && (
            <PrimaryGroupButton type="button" onClick={handleJoin} disabled={isMutating}>
              {group.privacy === 'private' ? 'Request to join' : 'Join group'}
            </PrimaryGroupButton>
          )}
          {canOpenChat && (
            <PrimaryGroupButton
              type="button"
              onClick={() => navigate(`/dashboard/${user?.role}/messages`)}
            >
              <MessageCircle size={15} aria-hidden="true" />
              Group chat
            </PrimaryGroupButton>
          )}
          {isActiveMember && group.myMembership?.role !== 'owner' && (
            <QuietGroupButton type="button" onClick={handleLeave} disabled={isMutating}>
              Leave
            </QuietGroupButton>
          )}
          {isOwner && (
            <QuietGroupButton type="button" onClick={handleArchive} disabled={isMutating}>
              Archive group
            </QuietGroupButton>
          )}
        </StyledBox>
      </DetailHeaderCard>

      {!group.canViewContent ? (
        <LockedPanel role="note">
          <Lock size={22} aria-hidden="true" />
          {group.myMembership?.status === 'pending' ? (
            <>
              <strong>Request pending</strong>
              <span>A group moderator will review your request. The feed and chat unlock once you&apos;re approved.</span>
            </>
          ) : (
            <>
              <strong>This is a private group.</strong>
              <span>Request to join — a group moderator will approve you, then the feed and chat unlock.</span>
            </>
          )}
        </LockedPanel>
      ) : (
        <DetailLayout $split>
          <FeedColumn aria-label={`${group.name} feed`}>
            {group.canPost && <GroupComposer feed={feed} groupName={group.name} />}

            {feed.isLoading ? (
              <EmptyStateCard aria-label="Loading group feed">
                <Spinner $size={24} aria-label="Loading group feed" />
              </EmptyStateCard>
            ) : feed.error ? (
              <EmptyStateCard role="alert">
                The group feed could not load.
                <PrimaryGroupButton type="button" onClick={() => void feed.refreshPosts()}>
                  Try again
                </PrimaryGroupButton>
              </EmptyStateCard>
            ) : feed.posts.length === 0 ? (
              <EmptyStateCard>
                No posts here yet.
                {group.canPost ? ' Break the ice — your group is watching for the first post.' : ' Join to start the conversation.'}
              </EmptyStateCard>
            ) : (
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
              </>
            )}
          </FeedColumn>

          <GroupMemberRail
            members={detail.members}
            membersUnavailable={detail.membersUnavailable}
            ownerId={group.ownerId}
            canModerate={canModerate}
            isOwner={isOwner}
            isBusy={isMutating}
            onApprove={(uid) => void runModeration(moderation.approveMember(uid))}
            onDeny={(uid) => void runModeration(moderation.removeMember(uid))}
            onSetRole={(uid, role) => void runModeration(moderation.setRole(uid, role))}
            onRemove={(uid) => void runModeration(moderation.removeMember(uid))}
            onBan={(uid) => void runModeration(moderation.removeMember(uid, true))}
            onReinstate={(uid) => void runModeration(moderation.approveMember(uid))}
            onTransfer={handleTransfer}
          />
        </DetailLayout>
      )}
    </DetailLayout>
  );
};

export default GroupDetail;
