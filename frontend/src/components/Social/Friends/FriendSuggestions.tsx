import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { UserPlus, Search, Users, CheckCircle } from 'lucide-react';
import { useSocialFriends } from '../../../hooks/social/useSocialFriends';
import CustomModal from '../../UniversalMasterSchedule/ui/CustomModal';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const HeaderTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0;
`;

const Content = styled.div`
  padding: 0 24px 24px;
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  min-height: 44px;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#00ffff' : 'transparent'};
  color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -1px;

  &:hover {
    color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.9)'};
  }
`;

const SubText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 16px 0 8px;
`;

const SuggestionItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: background-color 0.2s ease;
`;

const Avatar = styled.div<{ $src?: string }>`
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

const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.span`
  font-size: 1rem;
  font-weight: 500;
  color: white;
  display: block;
`;

const Username = styled.span`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
`;

const SentBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #66bb6a;
  font-size: 0.875rem;
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
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SearchWrapper = styled.div`
  margin: 16px 0;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px 10px 40px;
  padding-right: 90px;
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

const SearchIconEl = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
`;

const SearchBtn = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  padding: 6px 12px;
  min-height: 32px;
  border-radius: 6px;
  border: none;
  background: rgba(0, 255, 255, 0.15);
  color: #00ffff;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) { background: rgba(0, 255, 255, 0.25); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  margin: 0 auto;
`;

const CenterBox = styled.div`
  display: flex;
  justify-content: center;
  padding: 32px 0;
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

const EmptyTitle = styled.p`
  font-size: 1rem;
  color: white;
  margin: 0 0 8px;
`;

const EmptyText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
`;

const FooterRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
`;

const CloseButton = styled.button`
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: rgba(0, 255, 255, 0.1);
  color: #00ffff;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: rgba(0, 255, 255, 0.2); }
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

interface FriendSuggestionsProps {
  open: boolean;
  onClose: () => void;
}

/**
 * FriendSuggestions Component
 * Displays user suggestions and allows sending friend requests
 */
const FriendSuggestions: React.FC<FriendSuggestionsProps> = ({ open, onClose }) => {
  const {
    friendSuggestions,
    isLoadingSuggestions,
    sendFriendRequest,
    searchUsers
  } = useSocialFriends();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchUsers(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSendRequest = async (userId: string) => {
    await sendFriendRequest(userId);
    setSentRequests([...sentRequests, userId]);
  };

  const renderUserItem = (user: any) => (
    <SuggestionItem key={user.id}>
      <Avatar $src={user.photo || undefined}>
        {!user.photo && `${user.firstName[0]}${user.lastName[0]}`}
      </Avatar>
      <UserInfo>
        <UserName>{user.firstName} {user.lastName}</UserName>
        <Username>@{user.username}</Username>
      </UserInfo>
      {sentRequests.includes(user.id) ? (
        <SentBadge>
          <CheckCircle size={16} /> Request Sent
        </SentBadge>
      ) : (
        <OutlineBtn onClick={() => handleSendRequest(user.id)}>
          <UserPlus size={16} /> Add Friend
        </OutlineBtn>
      )}
    </SuggestionItem>
  );

  return (
    <CustomModal isOpen={open} onClose={onClose} title="" size="medium">
      <ModalHeader>
        <UserPlus size={20} color="rgba(0, 255, 255, 0.8)" />
        <HeaderTitle>Find Friends</HeaderTitle>
      </ModalHeader>
      <Content>
        <TabBar>
          <TabButton $active={tabValue === 0} onClick={() => setTabValue(0)}>
            <Users size={16} /> Suggestions
          </TabButton>
          <TabButton $active={tabValue === 1} onClick={() => setTabValue(1)}>
            <Search size={16} /> Search
          </TabButton>
        </TabBar>

        {tabValue === 0 && (
          <>
            <SubText>People you may know</SubText>

            {isLoadingSuggestions ? (
              <div>
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', padding: '12px 0' }}>
                    <SkeletonBlock $width="40px" $height="40px" $borderRadius="50%" />
                    <div style={{ flex: 1, marginLeft: 12 }}>
                      <SkeletonBlock $width="120px" $height="18px" />
                      <SkeletonBlock $width="80px" $height="14px" style={{ marginTop: 4 }} />
                    </div>
                    <SkeletonBlock $width="100px" $height="36px" $borderRadius="6px" />
                  </div>
                ))}
              </div>
            ) : friendSuggestions.length > 0 ? (
              <div>
                {friendSuggestions.map(renderUserItem)}
              </div>
            ) : (
              <EmptyState>
                <Users size={48} />
                <EmptyTitle>No suggestions available</EmptyTitle>
                <EmptyText>Try searching for people you may know</EmptyText>
              </EmptyState>
            )}
          </>
        )}

        {tabValue === 1 && (
          <>
            <SearchWrapper>
              <SearchIconEl><Search size={18} /></SearchIconEl>
              <SearchInput
                placeholder="Search by name or username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              <SearchBtn
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isSearching}
              >
                {isSearching ? <Spinner /> : 'Search'}
              </SearchBtn>
            </SearchWrapper>

            {isSearching ? (
              <CenterBox><Spinner /></CenterBox>
            ) : searchResults.length > 0 ? (
              <div>
                {searchResults.map(renderUserItem)}
              </div>
            ) : searchQuery && !isSearching ? (
              <EmptyState>
                <EmptyTitle>No results found for "{searchQuery}"</EmptyTitle>
                <EmptyText>Try a different search term</EmptyText>
              </EmptyState>
            ) : (
              <EmptyState>
                <Search size={48} />
                <EmptyTitle>Search for friends</EmptyTitle>
                <EmptyText>Find people by name or username</EmptyText>
              </EmptyState>
            )}
          </>
        )}

        <FooterRow>
          <CloseButton onClick={onClose}>Close</CloseButton>
        </FooterRow>
      </Content>
    </CustomModal>
  );
};

export default FriendSuggestions;
