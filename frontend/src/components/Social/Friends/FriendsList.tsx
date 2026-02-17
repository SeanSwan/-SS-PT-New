import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Search, UserPlus, Users, UserCheck, UserX } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSocialFriends } from '../../../hooks/social/useSocialFriends';
import FriendRequests from './FriendRequests';
import FriendSuggestions from './FriendSuggestions';

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const FriendsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

const CardPanel = styled.div`
  border-radius: 12px;
  background: rgba(29, 31, 43, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
`;

const CardBody = styled.div`
  padding: 24px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0;
`;

const OutlineBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  min-height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(0, 255, 255, 0.4);
  background: transparent;
  color: #00ffff;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: rgba(0, 255, 255, 0.1); }
`;

const SearchBarWrapper = styled.div`
  margin-bottom: 16px;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px 10px 40px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;

  &::placeholder { color: rgba(255, 255, 255, 0.4); }
  &:focus { outline: none; border-color: rgba(0, 255, 255, 0.5); }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
`;

const CountRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const CountText = styled.span`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
`;

const TextBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  min-height: 36px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #00ffff;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: rgba(0, 255, 255, 0.05); }
`;

const FriendItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: background-color 0.2s ease;
`;

const FriendAvatar = styled.div<{ $src?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.$src ? `url(${props.$src}) center/cover` : 'rgba(0, 255, 255, 0.2)'};
  color: #00ffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
  margin-right: 12px;
`;

const FriendInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FriendName = styled.span`
  font-size: 1rem;
  font-weight: 500;
  color: white;
  display: block;
`;

const FriendUsername = styled.span`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
`;

const FriendActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const RemoveBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #ef5350;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover { background: rgba(244, 67, 54, 0.1); }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;

  svg { opacity: 0.5; margin-bottom: 16px; color: rgba(255, 255, 255, 0.5); }
`;

const EmptyTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0 0 8px;
`;

const EmptyText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 16px;
`;

const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: rgba(0, 255, 255, 0.15);
  color: #00ffff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: rgba(0, 255, 255, 0.25); }
`;

const SkeletonBlock = styled.div<{ $width?: string; $height?: string; $borderRadius?: string }>`
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  border-radius: ${props => props.$borderRadius || '4px'};
`;

/**
 * FriendsList Component
 * Displays a list of friends with search and filter capabilities
 */
const FriendsList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { friends, isLoading, removeFriend } = useSocialFriends();
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequests, setShowRequests] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredFriends = friends.filter(friend => {
    const fullName = `${friend.firstName} ${friend.lastName}`.toLowerCase();
    const username = friend.username.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || username.includes(query);
  });

  const handleRemoveFriend = async (friendId: string, friendshipId: string) => {
    if (window.confirm('Are you sure you want to remove this friend?')) {
      await removeFriend(friendshipId);
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
              <Users size={20} color="rgba(255,255,255,0.7)" />
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
              {filteredFriends.map((friend) => (
                <FriendItem key={friend.id}>
                  <FriendAvatar $src={friend.photo || undefined}>
                    {!friend.photo && `${friend.firstName[0]}${friend.lastName[0]}`}
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
                      onClick={() => handleRemoveFriend(friend.id, friend.friendshipId)}
                      title="Remove friend"
                      aria-label="Remove friend"
                    >
                      <UserX size={18} />
                    </RemoveBtn>
                  </FriendActions>
                </FriendItem>
              ))}
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
    </FriendsContainer>
  );
};

export default FriendsList;
