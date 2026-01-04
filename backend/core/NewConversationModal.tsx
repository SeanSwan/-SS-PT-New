import React, { useState } from 'react';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Search, User, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { useDebounce } from '../../hooks/useDebounce';

interface UserSearchResult {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
}

interface NewConversationModalProps {
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}

const NewConversationModal: React.FC<NewConversationModalProps> = ({ onClose, onConversationCreated }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const queryClient = useQueryClient();

  const { data: searchResults = [], isLoading } = useQuery<UserSearchResult[]>({
    queryKey: ['userSearch', debouncedSearchTerm],
    queryFn: async () => {
      if (debouncedSearchTerm.length < 2) return [];
      const response = await api.get('/api/messaging/users/search', {
        params: { q: debouncedSearchTerm },
      });
      return response.data;
    },
    enabled: debouncedSearchTerm.length >= 2,
  });

  const createConversationMutation = useMutation({
    mutationFn: (userId: number) => api.post('/api/messaging/conversations', {
      type: 'direct',
      participantIds: [userId],
    }),
    onSuccess: (response) => {
      toast.success('Conversation started!');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onConversationCreated(response.data.id);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start conversation.');
    },
  });

  const handleStartConversation = () => {
    if (selectedUser) {
      createConversationMutation.mutate(selectedUser.id);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>New Message</Title>
          <CloseButton onClick={onClose}><X size={24} /></CloseButton>
        </Header>
        <Content>
          <SearchContainer>
            <SearchIcon><Search size={20} /></SearchIcon>
            <SearchInput
              placeholder="Search for a user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchContainer>
          <ResultsList>
            {isLoading && <p>Searching...</p>}
            {!isLoading && debouncedSearchTerm.length >= 2 && searchResults.length === 0 && <p>No users found.</p>}
            {searchResults.map(user => (
              <UserItem key={user.id} onClick={() => setSelectedUser(user)} $selected={selectedUser?.id === user.id}>
                <Avatar src={user.photo}>
                  {!user.photo && <User size={20} />}
                </Avatar>
                <UserInfo>
                  <UserName>{user.firstName} {user.lastName}</UserName>
                  <UserHandle>@{user.username}</UserHandle>
                </UserInfo>
              </UserItem>
            ))}
          </ResultsList>
        </Content>
        <Footer>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleStartConversation} disabled={!selectedUser || createConversationMutation.isPending}>
            {createConversationMutation.isPending ? 'Starting...' : <><Send size={16} /> Start Conversation</>}
          </PrimaryButton>
        </Footer>
      </Modal>
    </Overlay>
  );
};

// NOTE: Using placeholder styled-components for brevity. In a real implementation, these would be imported from a shared UI kit.
const Overlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 1000;
`;
const Modal = styled.div`
  background: var(--dark-bg, #0a0e1a); border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2)); border-radius: 16px; width: 90%; max-width: 500px; display: flex; flex-direction: column;
`;
const Header = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 24px; border-bottom: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
`;
const Title = styled.h2`
  font-size: 24px; font-weight: 700; color: var(--text-primary, #FFFFFF); margin: 0;
`;
const CloseButton = styled.button`
  background: transparent; border: none; color: var(--text-secondary, #B8B8B8); cursor: pointer; padding: 8px;
`;
const Content = styled.div`
  padding: 24px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;
const Footer = styled.div`
  display: flex; justify-content: flex-end; gap: 12px; padding: 24px; border-top: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
`;
const PrimaryButton = styled.button`
  display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, var(--primary-cyan, #00CED1), var(--accent-purple, #9D4EDD)); color: var(--dark-bg); border: none; border-radius: 8px; padding: 12px 24px; font-weight: 600; cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const SecondaryButton = styled.button`
  background: transparent; color: var(--text-primary, #FFFFFF); border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2)); border-radius: 8px; padding: 12px 24px; font-weight: 600; cursor: pointer;
`;
const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 16px;
`;
const SearchIcon = styled.div`
  position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);
`;
const SearchInput = styled.input`
  width: 100%; padding: 12px 16px 12px 48px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 16px;
  &:focus { outline: none; border-color: var(--primary-cyan); }
`;
const ResultsList = styled.div`
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
`;
const UserItem = styled.div<{ $selected: boolean }>`
  display: flex; align-items: center; padding: 12px; border-radius: 8px; cursor: pointer;
  background: ${props => props.$selected ? 'rgba(0, 206, 209, 0.1)' : 'transparent'};
  border: 1px solid ${props => props.$selected ? 'var(--primary-cyan)' : 'transparent'};
  &:hover { background: rgba(255, 255, 255, 0.05); }
`;
const Avatar = styled.div<{ src?: string }>`
  width: 40px; height: 40px; border-radius: 50%; margin-right: 12px; background-color: var(--dark-bg);
  background-image: url(${props => props.src}); background-size: cover; display: flex; align-items: center; justify-content: center;
`;
const UserInfo = styled.div``;
const UserName = styled.div`
  font-weight: 600; color: var(--text-primary);
`;
const UserHandle = styled.div`
  font-size: 14px; color: var(--text-secondary);
`;

export default NewConversationModal;