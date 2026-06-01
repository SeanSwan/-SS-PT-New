import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Users, UserCheck, UserX } from 'lucide-react';
import { useSocialFriends } from '../../../hooks/social/useSocialFriends';
import { sanitizeImageUrl, cssUrlValue } from '../../../utils/imageUrl';
import FriendRequests from './FriendRequests';
import FriendSuggestions from './FriendSuggestions';
import RemoveFriendConfirmDialog from './RemoveFriendConfirmDialog';
import {
  CardBody,
  CardPanel,
  CountRow,
  CountText,
  EmptyState,
  EmptyText,
  EmptyTitle,
  FriendActions,
  FriendAvatar,
  FriendInfo,
  FriendItem,
  FriendName,
  FriendsContainer,
  FriendUsername,
  HeaderLeft,
  HeaderRow,
  HeaderTitle,
  OutlineBtn,
  PrimaryBtn,
  RemoveBtn,
  SearchBarWrapper,
  SearchIcon,
  SearchInput,
  SkeletonBlock,
  TextBtn,
} from './FriendsList.styles';

type PendingRemoval = {
  friendshipId: string;
  friendName: string;
};

/**
 * FriendsList Component
 * Displays a list of friends with search and filter capabilities
 */
const FriendsList: React.FC = () => {
  const navigate = useNavigate();
  const { friends, isLoading, removeFriend } = useSocialFriends();
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequests, setShowRequests] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);

  const filteredFriends = friends.filter(friend => {
    const fullName = `${friend.firstName} ${friend.lastName}`.toLowerCase();
    const username = friend.username.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || username.includes(query);
  });

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
    return (
      <FriendsContainer>
        <CardPanel>
          <CardBody>
            <HeaderTitle style={{ marginBottom: 16 }}>Friends</HeaderTitle>
            <SearchBarWrapper>
              <SkeletonBlock $height="44px" $borderRadius="8px" />
            </SearchBarWrapper>
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', padding: '12px 0' }}>
                <SkeletonBlock $width="40px" $height="40px" $borderRadius="50%" />
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <SkeletonBlock $width="120px" $height="18px" />
                  <SkeletonBlock $width="80px" $height="14px" style={{ marginTop: 4 }} />
                </div>
                <SkeletonBlock $width="100px" $height="36px" $borderRadius="6px" />
              </div>
            ))}
          </CardBody>
        </CardPanel>
      </FriendsContainer>
    );
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
            <TextBtn onClick={() => setShowRequests(true)}>
              <UserCheck size={16} /> Friend Requests
            </TextBtn>
          </CountRow>

          {friends.length === 0 ? (
            <EmptyState>
              <Users size={48} />
              <EmptyTitle>No friends yet</EmptyTitle>
              <EmptyText>Connect with other users to see them here</EmptyText>
              <PrimaryBtn onClick={() => setShowSuggestions(true)}>
                <UserPlus size={16} /> Find Friends
              </PrimaryBtn>
            </EmptyState>
          ) : (
            <div>
              {filteredFriends.map((friend) => {
                const safeFriendPhoto = sanitizeImageUrl(friend.photo || undefined);
                const friendAvatarImage = safeFriendPhoto ? cssUrlValue(safeFriendPhoto) : null;

                return (
                  <FriendItem key={friend.id}>
                    <FriendAvatar $backgroundImage={friendAvatarImage}>
                      {!safeFriendPhoto && `${friend.firstName[0]}${friend.lastName[0]}`}
                    </FriendAvatar>
                    <FriendInfo>
                      <FriendName>{friend.firstName} {friend.lastName}</FriendName>
                      <FriendUsername>@{friend.username}</FriendUsername>
                    </FriendInfo>
                    <FriendActions>
                      <OutlineBtn onClick={() => handleViewProfile(friend.id)}>
                        View Profile
                      </OutlineBtn>
                      <RemoveBtn
                        onClick={() => requestRemoveFriend(
                          friend.friendshipId,
                          `${friend.firstName} ${friend.lastName}`,
                        )}
                        title="Remove friend"
                        aria-label="Remove friend"
                      >
                        <UserX size={18} />
                      </RemoveBtn>
                    </FriendActions>
                  </FriendItem>
                );
              })}
            </div>
          )}
        </CardBody>
      </CardPanel>

      <FriendRequests
        open={showRequests}
        onClose={() => setShowRequests(false)}
      />

      <FriendSuggestions
        open={showSuggestions}
        onClose={() => setShowSuggestions(false)}
      />

      {pendingRemoval && (
        <RemoveFriendConfirmDialog
          friendName={pendingRemoval.friendName}
          busy={isRemovingFriend}
          onCancel={() => setPendingRemoval(null)}
          onConfirm={confirmRemoveFriend}
        />
      )}
    </FriendsContainer>
  );
};

export default FriendsList;
