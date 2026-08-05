/**
 * COMPONENT: FriendSuggestionRows
 * PURPOSE: Small presentation helpers for friend discovery rows and states.
 * FLOW: FriendSuggestions owns state; this file renders candidates, loading, and empty states.
 * UX: Keeps friend search/read states compact, touch-safe, and branch-light.
 */

import { CheckCircle, Search, UserPlus, Users } from 'lucide-react';
import type { FriendUser } from '../../../hooks/social/useSocialFriends.types';
import { cssUrlValue, sanitizeImageUrl } from '../../../utils/imageUrl';
import {
  Avatar,
  CenterBox,
  EmptyState,
  EmptyText,
  EmptyTitle,
  OutlineBtn,
  SentBadge,
  SkeletonBlock,
  SkeletonRow,
  SkeletonTextStack,
  Spinner,
  SuggestionItem,
  SuggestionList,
  UserInfo,
  UserName,
  Username,
} from './FriendSuggestions.styles';

type FriendSuggestionItemProps = {
  user: FriendUser;
  sentRequests: string[];
  onSendRequest: (userId: string) => void;
};

type FriendSuggestionListProps = {
  users: FriendUser[];
  sentRequests: string[];
  onSendRequest: (userId: string) => void;
};

type SuggestionsPanelProps = FriendSuggestionListProps & {
  isLoading: boolean;
};

type SearchPanelProps = FriendSuggestionListProps & {
  isSearching: boolean;
  searchQuery: string;
};

// Surnames are staff-only on member-facing directory responses, so this must
// tolerate an absent lastName rather than index into undefined.
const getInitials = (firstName?: string, lastName?: string) =>
  `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}` || '?';

function getStatusLabel(user: FriendUser, alreadySent: boolean) {
  if (alreadySent) return 'Request Sent';
  if (user.friendshipStatus === 'pending') return pendingStatusLabel(user.isRequester);
  if (user.friendshipStatus === 'accepted') return 'Friends';
  return null;
}

function pendingStatusLabel(isRequester?: boolean) {
  if (isRequester) return 'Request Sent';
  return 'Wants to connect';
}

function getSafeName(value: string) {
  return value || '?';
}

function getAvatarState(photo?: string) {
  const safePhoto = sanitizeImageUrl(photo || undefined);
  return {
    safePhoto,
    avatarImage: safePhoto ? cssUrlValue(safePhoto) : null,
  };
}

function AvatarInitials({ safePhoto, firstName, lastName }: { safePhoto: string | null; firstName: string; lastName: string }) {
  if (safePhoto) return null;
  return <>{getInitials(firstName, lastName)}</>;
}

function FriendSuggestionAction({
  fullName,
  statusLabel,
  userId,
  onSendRequest,
}: {
  fullName: string;
  statusLabel: string | null;
  userId: string;
  onSendRequest: (userId: string) => void;
}) {
  if (statusLabel) {
    return (
      <SentBadge>
        <CheckCircle size={16} />
        {statusLabel}
      </SentBadge>
    );
  }
  return (
    <OutlineBtn onClick={() => onSendRequest(userId)} aria-label={`Add ${fullName} as friend`}>
      <UserPlus size={16} /> Add Friend
    </OutlineBtn>
  );
}

function FriendSuggestionItem({ user, sentRequests, onSendRequest }: FriendSuggestionItemProps) {
  const firstName = getSafeName(user.firstName);
  const lastName = getSafeName(user.lastName);
  const fullName = `${firstName} ${lastName}`;
  const { safePhoto, avatarImage } = getAvatarState(user.photo);
  const statusLabel = getStatusLabel(user, sentRequests.includes(user.id));

  return (
    <SuggestionItem>
      <Avatar $backgroundImage={avatarImage}>
        <AvatarInitials safePhoto={safePhoto} firstName={firstName} lastName={lastName} />
      </Avatar>
      <UserInfo>
        <UserName>{fullName}</UserName>
        <Username>@{user.username}</Username>
      </UserInfo>
      <FriendSuggestionAction
        fullName={fullName}
        statusLabel={statusLabel}
        userId={user.id}
        onSendRequest={onSendRequest}
      />
    </SuggestionItem>
  );
}

function FriendSuggestionList({ users, sentRequests, onSendRequest }: FriendSuggestionListProps) {
  return (
    <SuggestionList>
      {users.map((user) => (
        <FriendSuggestionItem
          key={user.id}
          user={user}
          sentRequests={sentRequests}
          onSendRequest={onSendRequest}
        />
      ))}
    </SuggestionList>
  );
}

function FriendSuggestionLoadingRows() {
  return (
    <SuggestionList>
      {[1, 2, 3, 4].map((item) => (
        <SkeletonRow key={item}>
          <SkeletonBlock $width="44px" $height="44px" $borderRadius="50%" />
          <SkeletonTextStack>
            <SkeletonBlock $width="120px" $height="18px" />
            <SkeletonBlock $width="80px" $height="14px" />
          </SkeletonTextStack>
          <SkeletonBlock $width="110px" $height="36px" $borderRadius="6px" />
        </SkeletonRow>
      ))}
    </SuggestionList>
  );
}

export function FriendSuggestionsPanel({ users, isLoading, sentRequests, onSendRequest }: SuggestionsPanelProps) {
  if (isLoading) return <FriendSuggestionLoadingRows />;
  if (users.length) return <FriendSuggestionList users={users} sentRequests={sentRequests} onSendRequest={onSendRequest} />;
  return (
    <EmptyState>
      <Users size={48} />
      <EmptyTitle>No suggestions available</EmptyTitle>
      <EmptyText>Try searching for people you may know</EmptyText>
    </EmptyState>
  );
}

export function FriendSearchPanel({ users, isSearching, searchQuery, sentRequests, onSendRequest }: SearchPanelProps) {
  if (isSearching) return <CenterBox><Spinner /></CenterBox>;
  if (users.length) return <FriendSuggestionList users={users} sentRequests={sentRequests} onSendRequest={onSendRequest} />;
  if (searchQuery) {
    return (
      <EmptyState>
        <EmptyTitle>No results found for &quot;{searchQuery}&quot;</EmptyTitle>
        <EmptyText>Try a different search term</EmptyText>
      </EmptyState>
    );
  }
  return (
    <EmptyState>
      <Search size={48} />
      <EmptyTitle>Search for friends</EmptyTitle>
      <EmptyText>Find people by name or username</EmptyText>
    </EmptyState>
  );
}
