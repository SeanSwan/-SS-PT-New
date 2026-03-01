import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, Search, User, Users, Shield, Dumbbell, MessageCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

interface SearchUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  role?: string;
}

interface NewConversationModalProps {
  onClose: () => void;
  onConversationCreated?: (conversationId: string) => void;
}

type RoleFilter = 'all' | 'client' | 'trainer' | 'admin';

const NewConversationModal: React.FC<NewConversationModalProps> = ({
  onClose,
  onConversationCreated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  // Load suggested users on mount (no typing required)
  useEffect(() => {
    const loadSuggested = async () => {
      try {
        setLoadingSuggestions(true);
        const response = await api.get('/api/messaging/users/search');
        setSuggestedUsers(response.data || []);
      } catch (err) {
        console.error('Failed to load suggested users:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    loadSuggested();
  }, []);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Debounced user search
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const response = await api.get('/api/messaging/users/search', {
        params: { q: query },
      });
      setSearchResults(response.data || []);
    } catch (err) {
      console.error('User search failed:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchUsers]);

  // Determine which users to display (search results or suggestions)
  const displayUsers = searchQuery.length >= 2 ? searchResults : suggestedUsers;

  // Filter results by role
  const filteredResults = roleFilter === 'all'
    ? displayUsers
    : displayUsers.filter((u) => {
        const normalizedRole = u.role === 'user' ? 'client' : u.role;
        return normalizedRole === roleFilter;
      });

  // Count users by role for filter badges
  const roleCounts = {
    all: displayUsers.length,
    client: displayUsers.filter(u => (u.role === 'user' || u.role === 'client')).length,
    trainer: displayUsers.filter(u => u.role === 'trainer').length,
    admin: displayUsers.filter(u => u.role === 'admin').length,
  };

  const handleSelectUser = (user: SearchUser) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  const handleRemoveSelection = () => {
    setSelectedUser(null);
    searchInputRef.current?.focus();
  };

  const handleStartConversation = async () => {
    if (!selectedUser) {
      setError('Please select a user to message');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/messaging/conversations', {
        type: 'direct',
        participantIds: [selectedUser.id],
      });

      const conversation = response.data;
      const conversationId = String(conversation.id);

      // Invalidate conversations cache so the list refreshes
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      onClose();

      if (onConversationCreated) {
        onConversationCreated(conversationId);
      }
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to create conversation';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role?: string) => {
    const normalized = role === 'user' ? 'client' : role;
    switch (normalized) {
      case 'admin': return <Shield size={12} />;
      case 'trainer': return <Dumbbell size={12} />;
      case 'client': return <User size={12} />;
      default: return <Users size={12} />;
    }
  };

  const getRoleLabel = (role?: string) => {
    if (!role || role === 'user') return 'Client';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getNormalizedRole = (role?: string) => {
    if (!role || role === 'user') return 'client';
    return role;
  };

  const isShowingSuggestions = searchQuery.length < 2;

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <HeaderLeft>
            <MessageCircle size={20} color="#00CED1" />
            <ModalTitle>New Conversation</ModalTitle>
          </HeaderLeft>
          <CloseButton onClick={onClose} aria-label="Close">
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {/* Selected user chip */}
          {selectedUser ? (
            <SelectedUserChip>
              <ChipAvatar>
                {selectedUser.photo ? (
                  <img src={selectedUser.photo} alt="" />
                ) : (
                  <User size={16} />
                )}
              </ChipAvatar>
              <ChipInfo>
                <ChipName>
                  {selectedUser.firstName} {selectedUser.lastName}
                </ChipName>
                <RoleBadge $role={getNormalizedRole(selectedUser.role)}>
                  {getRoleIcon(selectedUser.role)}
                  {getRoleLabel(selectedUser.role)}
                </RoleBadge>
              </ChipInfo>
              <ChipRemove onClick={handleRemoveSelection} aria-label="Remove selection">
                <X size={14} />
              </ChipRemove>
            </SelectedUserChip>
          ) : (
            <>
              {/* Search input */}
              <SearchContainer>
                <SearchIcon>
                  <Search size={16} />
                </SearchIcon>
                <SearchInput
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, username, or email..."
                  disabled={loading}
                />
                {searching && <SearchSpinner />}
              </SearchContainer>

              {/* Role filter tabs */}
              <RoleFilterBar>
                {(['all', 'client', 'trainer', 'admin'] as RoleFilter[]).map((role) => (
                  <RoleFilterTab
                    key={role}
                    $active={roleFilter === role}
                    onClick={() => setRoleFilter(role)}
                  >
                    {role === 'all' ? 'All' : getRoleLabel(role)}
                    <RoleCount $active={roleFilter === role}>
                      {roleCounts[role]}
                    </RoleCount>
                  </RoleFilterTab>
                ))}
              </RoleFilterBar>

              {/* Section label */}
              <SectionLabel>
                {isShowingSuggestions ? 'Available Contacts' : 'Search Results'}
              </SectionLabel>

              {/* Users list (suggested or search results) */}
              <ResultsList>
                {(searching || loadingSuggestions) ? (
                  <ResultsMessage>
                    <SearchSpinnerInline />
                    {isShowingSuggestions ? 'Loading contacts...' : 'Searching...'}
                  </ResultsMessage>
                ) : filteredResults.length === 0 ? (
                  <EmptyState>
                    <EmptyIcon>
                      <Users size={32} />
                    </EmptyIcon>
                    <EmptyTitle>
                      {searchQuery.length >= 2
                        ? `No ${roleFilter === 'all' ? 'users' : roleFilter + 's'} found for "${searchQuery}"`
                        : roleFilter !== 'all'
                          ? `No ${roleFilter}s available`
                          : 'No users available'
                      }
                    </EmptyTitle>
                    <EmptyHint>
                      {searchQuery.length >= 2
                        ? 'Try a different name, username, or email'
                        : 'Check back later or contact support'
                      }
                    </EmptyHint>
                  </EmptyState>
                ) : (
                  filteredResults.map((user) => (
                    <ResultItem
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                    >
                      <ResultAvatar>
                        {user.photo ? (
                          <img src={user.photo} alt="" />
                        ) : (
                          <User size={18} />
                        )}
                      </ResultAvatar>
                      <ResultInfo>
                        <ResultName>
                          {user.firstName} {user.lastName}
                        </ResultName>
                        <ResultUsername>@{user.username}</ResultUsername>
                      </ResultInfo>
                      <RoleBadge $role={getNormalizedRole(user.role)}>
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </RoleBadge>
                    </ResultItem>
                  ))
                )}
              </ResultsList>
            </>
          )}

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <CancelButton type="button" onClick={onClose} disabled={loading}>
              Cancel
            </CancelButton>
            <SubmitButton
              onClick={handleStartConversation}
              disabled={loading || !selectedUser}
            >
              {loading ? 'Creating...' : 'Start Conversation'}
            </SubmitButton>
          </ButtonGroup>
        </ModalBody>
      </ModalContainer>
    </Overlay>
  );
};

export default NewConversationModal;

// ── Styled Components ──────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background: rgba(15, 15, 30, 0.97);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(120, 81, 169, 0.3);
  border-radius: 16px;
  width: 90%;
  max-width: 520px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(120, 81, 169, 0.1);
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ModalTitle = styled.h2`
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
  min-height: 44px;
  min-width: 44px;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
`;

// ── Search ──

const SearchContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 14px;
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
  display: flex;
`;

const SearchInput = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 14px 40px 14px 42px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s;
  min-height: 44px;

  &:focus {
    outline: none;
    border-color: #7851A9;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 2px rgba(120, 81, 169, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const SearchSpinner = styled.div`
  position: absolute;
  right: 14px;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-top-color: #00CED1;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const SearchSpinnerInline = styled.div`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-top-color: #00CED1;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
`;

// ── Role Filter ──

const RoleFilterBar = styled.div`
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 3px;
`;

const RoleFilterTab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 8px 8px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  ${({ $active }) =>
    $active
      ? `
        background: rgba(120, 81, 169, 0.3);
        color: #c4a0ff;
      `
      : `
        background: transparent;
        color: rgba(255, 255, 255, 0.5);
        &:hover {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.8);
        }
      `}
`;

const RoleCount = styled.span<{ $active: boolean }>`
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 8px;
  font-weight: 700;
  ${({ $active }) =>
    $active
      ? `background: rgba(196, 160, 255, 0.2); color: #c4a0ff;`
      : `background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.4);`}
`;

// ── Section Label ──

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(255, 255, 255, 0.35);
`;

// ── Search Results ──

const ResultsList = styled.div`
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
`;

const ResultItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
  gap: 12px;

  &:hover {
    background: rgba(120, 81, 169, 0.15);
  }

  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
`;

const ResultAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.5);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ResultInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ResultName = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ResultUsername = styled.div`
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// ── Empty State ──

const EmptyState = styled.div`
  padding: 32px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const EmptyIcon = styled.div`
  color: rgba(255, 255, 255, 0.15);
  margin-bottom: 4px;
`;

const EmptyTitle = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  font-weight: 500;
`;

const EmptyHint = styled.div`
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
`;

const ResultsMessage = styled.div`
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// ── Role Badge ──

const RoleBadge = styled.span<{ $role?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;

  ${({ $role }) => {
    switch ($role) {
      case 'admin':
        return `background: linear-gradient(135deg, rgba(120, 81, 169, 0.25), rgba(93, 63, 211, 0.25)); color: #c4a0ff; border: 1px solid rgba(120, 81, 169, 0.3);`;
      case 'trainer':
        return `background: rgba(0, 206, 209, 0.15); color: #00CED1; border: 1px solid rgba(0, 206, 209, 0.25);`;
      case 'client':
        return `background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.25);`;
      default:
        return `background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.6); border: 1px solid rgba(255, 255, 255, 0.1);`;
    }
  }}
`;

// ── Selected User Chip ──

const SelectedUserChip = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(120, 81, 169, 0.12);
  border: 1px solid rgba(120, 81, 169, 0.3);
  border-radius: 12px;
`;

const ChipAvatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.5);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ChipInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ChipName = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 15px;
`;

const ChipRemove = styled.button`
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  min-width: 32px;
  transition: all 0.2s;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
  }
`;

// ── Error ──

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
  padding: 12px 14px;
  color: #f87171;
  font-size: 13px;
`;

// ── Buttons ──

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 4px;
`;

const Button = styled.button`
  padding: 12px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  min-height: 44px;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
  }
`;

const SubmitButton = styled(Button)`
  background: linear-gradient(135deg, #7851A9 0%, #5D3FD3 100%);
  color: #fff;
  box-shadow: 0 4px 15px rgba(120, 81, 169, 0.3);

  &:hover:not(:disabled) {
    box-shadow: 0 6px 20px rgba(120, 81, 169, 0.4);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;
