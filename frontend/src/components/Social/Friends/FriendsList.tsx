import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Users, UserCheck } from 'lucide-react';
import { useSocialFriends } from '../../../hooks/social/useSocialFriends';
import FriendRequests from './FriendRequests';
import FriendSuggestions from './FriendSuggestions';
import { FriendsContent, FriendsLoadingCard } from './FriendsListRows';
import RemoveFriendConfirmDialog from './RemoveFriendConfirmDialog';
import {
  CardBody,
  CardPanel,
  CountRow,
  CountText,
  ActionBadge,
  FriendsContainer,
  HeaderLeft,
  HeaderRow,
  HeaderTitle,
  OutlineBtn,
  SearchBarWrapper,
  SearchIcon,
  SearchInput,
  TextBtn,
} from './FriendsList.styles';

type PendingRemoval = {
  friendshipId: string;
  friendName: string;
};

type Friend = ReturnType<typeof useSocialFriends>['friends'][number];

function filterFriends(friends: Friend[], searchQuery: string) {
  const query = searchQuery.toLowerCase();
  return friends.filter(friend => {
    const fullName = `${friend.firstName} ${friend.lastName}`.toLowerCase();
    const username = friend.username.toLowerCase();
    return fullName.includes(query) || username.includes(query);
  });
}

function requestCountLabel(count: number) {
  return `${count} ${count === 1 ? 'request' : 'requests'}`;
}

function RequestCountBadge({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return <ActionBadge>{label}</ActionBadge>;
}

function RemoveDialogSlot({
  busy,
  pendingRemoval,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  pendingRemoval: PendingRemoval | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!pendingRemoval) return null;
  return (
    <RemoveFriendConfirmDialog
      friendName={pendingRemoval.friendName}
      busy={busy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

/**
 * FriendsList Component
 * Displays a list of friends with search and filter capabilities
 */
const FriendsList: React.FC = () => {
  const navigate = useNavigate();
  const friendsApi = useSocialFriends();
  const { friends, friendRequests, isLoading, removeFriend } = friendsApi;
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequests, setShowRequests] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);

  const filteredFriends = filterFriends(friends, searchQuery);
  const friendRequestCountLabel = requestCountLabel(friendRequests.length);

  const requestRemoveFriend = (friendshipId: string, friendName: string) => {
    setPendingRemoval({ friendshipId, friendName });
  };

  const confirmRemoveFriend = async () => {
    if (!pendingRemoval) return;
    setIsRemovingFriend(true);
    try {
      await removeFriend(pendingRemoval.friendshipId);
      setPendingRemoval(null);
    } finally {
      setIsRemovingFriend(false);
    }
  };

  const handleViewProfile = (friendId: string) => {
    navigate(`/profile/${friendId}`);
  };

  if (isLoading) {
    return <FriendsLoadingCard />;
  }

  return (
    <FriendsContainer>
      <CardPanel>
        <CardBody>
          <HeaderRow>
            <HeaderLeft>
              <Users size={20} />
              <HeaderTitle>Friends</HeaderTitle>
            </HeaderLeft>
            <OutlineBtn onClick={() => setShowSuggestions(true)}>
              <UserPlus size={16} /> Add Friends
            </OutlineBtn>
          </HeaderRow>

          <SearchBarWrapper>
            <SearchIcon><Search size={18} /></SearchIcon>
            <SearchInput
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchBarWrapper>

          <CountRow>
            <CountText>
              {friends.length} {friends.length === 1 ? 'Friend' : 'Friends'}
            </CountText>
            <TextBtn
              onClick={() => setShowRequests(true)}
              aria-label={`Friend Requests, ${friendRequestCountLabel}`}
            >
              <UserCheck size={16} /> Friend Requests
              <RequestCountBadge label={friendRequestCountLabel} count={friendRequests.length} />
            </TextBtn>
          </CountRow>

          <FriendsContent
            friends={filteredFriends}
            hasAnyFriends={friends.length > 0}
            onFindFriends={() => setShowSuggestions(true)}
            onRemoveFriend={requestRemoveFriend}
            onViewProfile={handleViewProfile}
          />
        </CardBody>
      </CardPanel>

      <FriendRequests
        open={showRequests}
        onClose={() => setShowRequests(false)}
        friendsApi={friendsApi}
      />

      <FriendSuggestions
        open={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        friendsApi={friendsApi}
      />

      <RemoveDialogSlot
        busy={isRemovingFriend}
        pendingRemoval={pendingRemoval}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={confirmRemoveFriend}
      />
    </FriendsContainer>
  );
};

export default FriendsList;
