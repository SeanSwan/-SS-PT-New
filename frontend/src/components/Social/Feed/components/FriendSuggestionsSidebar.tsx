/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: FriendSuggestionsSidebar                         ║
 * ║  PURPOSE: Desktop sidebar showing friend suggestions on feed ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────┐
 * │ People You May Know  [See All] │
 * ├────────────────────────────┤
 * │ 12 friends  ·  8 following │
 * ├────────────────────────────┤
 * │ [AV] Jane Doe              │
 * │      3 mutual   [+ Add]   │
 * │ [AV] John Smith            │
 * │      1 mutual   [+ Add]   │
 * │ [AV] Alex K.               │
 * │      5 mutual   [+ Add]   │
 * │ ... (up to 5 suggestions)  │
 * └────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[SocialFeed page] --> B[FriendSuggestionsSidebar]
 *   B --> C[SidebarCard]
 *   C --> D[QuickStats]
 *   C --> E[SuggestionItem x5]
 *   E --> F[Avatar]
 *   E --> G[UserInfo + MutualCount]
 *   E --> H[AddFriendButton]
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Button: "Add Friend"] -> sendFriendRequest(userId) -> POST /api/social/friendships/request/:id -> Shows "Sent" badge
 * [Link: "See All"]      -> navigates to /dashboard/client/community/friends
 * [Avatar / Name]        -> navigates to /profile/:id (future)
 *
 * DATA FLOW:
 * Props In:  { className? }
 * State:     { sentRequests: Set<string> }
 * API Calls: GET /api/social/friendships/suggestions (via useSocialFriends)
 *            GET /api/social/friendships (for friend count)
 * Events:    none
 * Children:  (styled components only)
 *
 * GAMIFICATION HOOKS:
 * - sendFriendRequest -> backend awards 200 XP on accepted referral
 */

import React, { useState, useMemo, useCallback } from 'react';
import { UserPlus, CheckCircle, Users, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocialFriends } from '../../../../hooks/social/useSocialFriends';
import {
  SidebarContainer,
  SidebarCard,
  SidebarHeader,
  SidebarTitle,
  SeeAllLink,
  QuickStats,
  StatItem,
  StatValue,
  StatLabel,
  SuggestionList,
  SuggestionItem,
  Avatar,
  UserInfo,
  UserName,
  MutualCount,
  AddFriendButton,
  RequestSentBadge,
  SkeletonBlock,
  SkeletonRow,
} from '../styles/SidebarStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// PURPOSE: Component prop interface
// ─────────────────────────────────────────────────────────────

interface FriendSuggestionsSidebarProps {
  /** Optional className for layout positioning from parent */
  className?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// PURPOSE: Max suggestions shown in sidebar
// ─────────────────────────────────────────────────────────────

const MAX_SUGGESTIONS = 5;
const SKELETON_COUNT = 4;

// ─────────────────────────────────────────────────────────────
// SECTION: Skeleton Loader
// PURPOSE: Frost Shimmer loading state per CLAUDE.md design system
// ─────────────────────────────────────────────────────────────

const SidebarSkeleton: React.FC = () => (
  <div role="status" aria-live="polite" aria-label="Loading friend suggestions">
    {Array.from({ length: SKELETON_COUNT }, (_, i) => (
      <SkeletonRow key={i}>
        <SkeletonBlock $width="40px" $height="40px" $borderRadius="50%" />
        <div style={{ flex: 1 }}>
          <SkeletonBlock $width="100px" $height="14px" />
          <SkeletonBlock
            $width="60px"
            $height="11px"
            style={{ marginTop: 4 }}
          />
        </div>
        <SkeletonBlock $width="64px" $height="36px" $borderRadius="8px" />
      </SkeletonRow>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Suggestion Row (memoized)
// PURPOSE: Single suggestion item — extracted for React.memo
// WHY: Rendered inside .map(), memo prevents unnecessary re-renders
// ─────────────────────────────────────────────────────────────

interface SuggestionRowProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    photo?: string;
    mutualFriendsCount?: number;
  };
  isSent: boolean;
  onAdd: (userId: string) => void;
}

const SuggestionRow = React.memo<SuggestionRowProps>(
  ({ user, isSent, onAdd }) => {
    // Initials fallback when no photo
    const initials = `${(user.firstName || '?')[0]}${(user.lastName || '?')[0]}`;

    return (
      <SuggestionItem>
        <Avatar $src={user.photo || undefined}>
          {!user.photo && initials}
        </Avatar>
        <UserInfo>
          <UserName>
            {user.firstName} {user.lastName}
          </UserName>
          <MutualCount>
            {user.mutualFriendsCount != null && user.mutualFriendsCount > 0
              ? `${user.mutualFriendsCount} mutual friend${user.mutualFriendsCount !== 1 ? 's' : ''}`
              : `@${user.username}`}
          </MutualCount>
        </UserInfo>

        {isSent ? (
          <RequestSentBadge>
            <CheckCircle size={14} />
            Sent
          </RequestSentBadge>
        ) : (
          <AddFriendButton
            onClick={() => onAdd(user.id)}
            aria-label={`Add ${user.firstName} ${user.lastName} as friend`}
          >
            <UserPlus size={14} />
            Add
          </AddFriendButton>
        )}
      </SuggestionItem>
    );
  }
);

SuggestionRow.displayName = 'SuggestionRow';

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// PURPOSE: Assembles sidebar card with stats, suggestions, skeleton
// ─────────────────────────────────────────────────────────────

const FriendSuggestionsSidebar: React.FC<FriendSuggestionsSidebarProps> = ({
  className,
}) => {
  const navigate = useNavigate();
  const {
    friends,
    friendSuggestions,
    isLoadingSuggestions,
    sendFriendRequest,
  } = useSocialFriends();

  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  // Limit to MAX_SUGGESTIONS for the sidebar view
  const visibleSuggestions = useMemo(
    () => friendSuggestions.slice(0, MAX_SUGGESTIONS),
    [friendSuggestions]
  );

  // Stable callback for sending friend requests
  const handleAdd = useCallback(
    async (userId: string) => {
      const success = await sendFriendRequest(userId);
      if (success) {
        setSentRequests((prev) => new Set(prev).add(userId));
      }
    },
    [sendFriendRequest]
  );

  const handleSeeAll = useCallback(() => {
    navigate('/dashboard/client/community/friends');
  }, [navigate]);

  return (
    <SidebarContainer className={className}>
      <SidebarCard>
        {/* Header */}
        <SidebarHeader>
          <SidebarTitle>People You May Know</SidebarTitle>
          <SeeAllLink onClick={handleSeeAll} aria-label="See all friend suggestions">
            See All
          </SeeAllLink>
        </SidebarHeader>

        {/* Quick Stats */}
        <QuickStats>
          <StatItem>
            <Users size={14} color="#60C0F0" aria-hidden="true" />
            <StatValue>{friends.length}</StatValue>
            <StatLabel>friends</StatLabel>
          </StatItem>
          <StatItem>
            <UserCheck size={14} color="#60C0F0" aria-hidden="true" />
            <StatValue>{friendSuggestions.length}</StatValue>
            <StatLabel>suggested</StatLabel>
          </StatItem>
        </QuickStats>

        {/* Suggestion List */}
        <SuggestionList>
          {isLoadingSuggestions ? (
            <SidebarSkeleton />
          ) : visibleSuggestions.length > 0 ? (
            visibleSuggestions.map((user) => (
              <SuggestionRow
                key={user.id}
                user={user}
                isSent={sentRequests.has(user.id)}
                onAdd={handleAdd}
              />
            ))
          ) : (
            <SuggestionItem
              style={{ justifyContent: 'center', padding: '24px 20px' }}
            >
              <MutualCount style={{ textAlign: 'center' }}>
                No suggestions right now. Check back later!
              </MutualCount>
            </SuggestionItem>
          )}
        </SuggestionList>
      </SidebarCard>
    </SidebarContainer>
  );
};

export default FriendSuggestionsSidebar;
