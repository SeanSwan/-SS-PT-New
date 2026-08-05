/**
 * COMPONENT: FriendsListRows
 * PURPOSE: Presentation helpers for the canonical friends list surface.
 * FLOW: FriendsList owns state and actions; this file renders loading, empty, and row states.
 */
import { UserPlus, Users, UserX } from 'lucide-react';
import type { SocialFriendsApi } from '../../../hooks/social/useSocialFriends';
import { sanitizeImageUrl, cssUrlValue } from '../../../utils/imageUrl';
import {
  CardBody,
  CardPanel,
  EmptyState,
  EmptyText,
  EmptyTitle,
  FriendActions,
  FriendAvatar,
  FriendInfo,
  FriendItem,
  FriendsContainer,
  FriendName,
  FriendsListBody,
  FriendUsername,
  HeaderLeft,
  HeaderRow,
  HeaderTitle,
  OutlineBtn,
  PrimaryBtn,
  RemoveBtn,
  SearchBarWrapper,
  SkeletonBlock,
  SkeletonFriendRow,
  SkeletonTextStack,
} from './FriendsList.styles';

type Friend = SocialFriendsApi['friends'][number];

type FriendRowProps = {
  friend: Friend;
  onRemoveFriend: (friendshipId: string, friendName: string) => void;
  onViewProfile: (friendId: string) => void;
};

type FriendsContentProps = {
  friends: Friend[];
  hasAnyFriends: boolean;
  onFindFriends: () => void;
  onRemoveFriend: (friendshipId: string, friendName: string) => void;
  onViewProfile: (friendId: string) => void;
};

function FriendRow({ friend, onRemoveFriend, onViewProfile }: FriendRowProps) {
  const safeFriendPhoto = sanitizeImageUrl(friend.photo || undefined);
  const friendAvatarImage = safeFriendPhoto ? cssUrlValue(safeFriendPhoto) : null;
  const fullName = `${friend.firstName} ${friend.lastName}`;

  return (
    <FriendItem>
      <FriendAvatar $backgroundImage={friendAvatarImage}>
        {!safeFriendPhoto && (`${friend.firstName?.[0] ?? ''}${friend.lastName?.[0] ?? ''}` || '?')}
      </FriendAvatar>
      <FriendInfo>
        <FriendName>{fullName}</FriendName>
        <FriendUsername>@{friend.username}</FriendUsername>
      </FriendInfo>
      <FriendActions>
        <OutlineBtn onClick={() => onViewProfile(friend.id)}>View Profile</OutlineBtn>
        <RemoveBtn
          onClick={() => onRemoveFriend(friend.friendshipId, fullName)}
          title="Remove friend"
          aria-label="Remove friend"
        >
          <UserX size={18} />
        </RemoveBtn>
      </FriendActions>
    </FriendItem>
  );
}

export function FriendsLoadingCard() {
  return (
    <FriendsContainer>
      <CardPanel>
        <CardBody>
          <HeaderRow>
            <HeaderLeft>
              <Users size={20} />
              <HeaderTitle>Friends</HeaderTitle>
            </HeaderLeft>
          </HeaderRow>
          <SearchBarWrapper>
            <SkeletonBlock $height="44px" $borderRadius="8px" />
          </SearchBarWrapper>
          {[1, 2, 3, 4, 5].map((item) => (
            <SkeletonFriendRow key={item}>
              <SkeletonBlock $width="40px" $height="40px" $borderRadius="50%" />
              <SkeletonTextStack>
                <SkeletonBlock $width="120px" $height="18px" />
                <SkeletonBlock $width="80px" $height="14px" />
              </SkeletonTextStack>
              <SkeletonBlock $width="100px" $height="36px" $borderRadius="6px" />
            </SkeletonFriendRow>
          ))}
        </CardBody>
      </CardPanel>
    </FriendsContainer>
  );
}

export function FriendsContent({
  friends,
  hasAnyFriends,
  onFindFriends,
  onRemoveFriend,
  onViewProfile,
}: FriendsContentProps) {
  if (!hasAnyFriends) {
    return (
      <EmptyState>
        <Users size={48} />
        <EmptyTitle>No friends yet</EmptyTitle>
        <EmptyText>Connect with other users to see them here</EmptyText>
        <PrimaryBtn onClick={onFindFriends}>
          <UserPlus size={16} /> Find Friends
        </PrimaryBtn>
      </EmptyState>
    );
  }

  return (
    <FriendsListBody>
      {friends.map((friend) => (
        <FriendRow
          key={friend.id}
          friend={friend}
          onRemoveFriend={onRemoveFriend}
          onViewProfile={onViewProfile}
        />
      ))}
    </FriendsListBody>
  );
}
