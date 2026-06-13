import React, { useState } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import type { FriendUser, SocialFriendsApi } from '../../../hooks/social/useSocialFriends';
import CustomModal from '../../UniversalMasterSchedule/ui/CustomModal';
import { FriendSearchPanel, FriendSuggestionsPanel } from './FriendSuggestionRows';
import {
  CloseButton,
  Content,
  FooterRow,
  HeaderTitle,
  ModalHeader,
  SearchBtn,
  SearchIconEl,
  SearchInput,
  SearchWrapper,
  Spinner,
  SubText,
  TabBar,
  TabButton,
} from './FriendSuggestions.styles';

interface FriendSuggestionsProps {
  open: boolean;
  onClose: () => void;
  friendsApi: SocialFriendsApi;
}

/**
 * FriendSuggestions Component
 * Displays user suggestions and allows sending friend requests.
 */
const FriendSuggestions: React.FC<FriendSuggestionsProps> = ({ open, onClose, friendsApi }) => {
  const {
    friendSuggestions,
    isLoadingSuggestions,
    sendFriendRequest,
    searchUsers,
  } = friendsApi;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') handleSearch();
  };

  const handleSendRequest = async (userId: string) => {
    const sent = await sendFriendRequest(userId);
    if (!sent) return;
    setSentRequests(prev => (prev.includes(userId) ? prev : [...prev, userId]));
  };

  const tabPanels = [
    <>
      <SubText>People you may know</SubText>
      <FriendSuggestionsPanel
        users={friendSuggestions}
        isLoading={isLoadingSuggestions}
        sentRequests={sentRequests}
        onSendRequest={handleSendRequest}
      />
    </>,
    <>
      <SearchWrapper>
        <SearchIconEl><Search size={18} /></SearchIconEl>
        <SearchInput
          placeholder="Search by name or username"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        <SearchBtn onClick={handleSearch} disabled={!searchQuery.trim() || isSearching}>
          {isSearching ? <Spinner /> : 'Search'}
        </SearchBtn>
      </SearchWrapper>

      <FriendSearchPanel
        users={searchResults}
        isSearching={isSearching}
        searchQuery={searchQuery}
        sentRequests={sentRequests}
        onSendRequest={handleSendRequest}
      />
    </>,
  ];

  return (
    <CustomModal isOpen={open} onClose={onClose} title="" size="md">
      <ModalHeader>
        <UserPlus size={20} />
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

        {tabPanels[tabValue]}

        <FooterRow>
          <CloseButton onClick={onClose}>Close</CloseButton>
        </FooterRow>
      </Content>
    </CustomModal>
  );
};

export default FriendSuggestions;
