/**
 * ┌─── SUB-COMPONENT: NewConversationModal ────────────────────┐
 * │ PARENT: MessagingView                                       │
 * │ PURPOSE: Modal to search users and start a new DM           │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────┐                        │
 * │ │ New Message              [X]     │                        │
 * │ │ [Search users...]                │                        │
 * │ │ [Avatar] Sean Swan  · trainer    │                        │
 * │ │ [Avatar] Jane Doe   · client     │                        │
 * │ │ [Avatar] Alex Kim   · client     │                        │
 * │ └──────────────────────────────────┘                        │
 * │ Props: { isOpen, onClose, onStartConversation }             │
 * │ CLICK-OUTCOMES:                                             │
 * │ [UserItem] -> onStartConversation(userId) -> creates conv   │
 * │ [X] -> onClose()                                            │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Search, Users, GraduationCap } from 'lucide-react';
import styled from 'styled-components';
import type { SearchUserResult } from './MessagingTypes';
import { participantDisplayName } from './messagingApiAdapters';
import { useSocialFriends } from '../../../hooks/social/useSocialFriends';
import {
  ModalOverlay, ModalContent, ModalHeader, ModalTitle, CloseButton,
  SearchInput, UserList, UserItem, Avatar, UserName, UserRole,
  EmptyState, EmptySubtext, SkeletonLine,
} from './MessagingStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Quick-Access Styles
// ─────────────────────────────────────────────────────────────

const QuickSection = styled.div`
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
`;

const QuickLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, #94a3b8);
  margin-bottom: 6px;
  font-family: 'Sora', sans-serif;
`;

const QuickRow = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb { background: var(--accent-primary, #60C0F0); border-radius: 2px; }
`;

const QuickChip = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  min-height: 44px;
  transition: background 0.15s, border-color 0.15s;
  font-family: 'Plus Jakarta Sans', sans-serif;
  &:hover {
    background: var(--accent-primary-10, rgba(96, 192, 240, 0.1));
    border-color: var(--accent-primary, #60C0F0);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const ChipAvatar = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent-primary-10, rgba(96, 192, 240, 0.15));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const RoleBadge = styled.span<{ $role: string }>`
  font-size: 0.6rem;
  padding: 1px 5px;
  border-radius: 4px;
  background: ${({ $role }) =>
    $role === 'trainer' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(96, 192, 240, 0.15)'};
  color: ${({ $role }) =>
    $role === 'trainer' ? 'var(--accent-secondary, #8B5CF6)' : 'var(--accent-primary, #60C0F0)'};
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStartConversation: (userId: number) => void;
  searchUsers: (query: string) => Promise<SearchUserResult[]>;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const NewConversationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onStartConversation,
  searchUsers,
}) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<SearchUserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { friends, isLoading: friendsLoading } = useSocialFriends();

  // Split friends into trainers and regular friends for quick access
  const trainers = useMemo(() => friends.filter(f => f.role === 'trainer'), [friends]);
  const friendsList = useMemo(() => friends.filter(f => f.role !== 'trainer'), [friends]);

  // Load default users on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setLoading(true);
      searchUsers('').then(results => {
        setUsers(results);
        setLoading(false);
      });
      // Focus input after mount
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, searchUsers]);

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchUsers(value);
      setUsers(results);
      setLoading(false);
    }, 300);
  }, [searchUsers]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose} role="dialog" aria-modal="true" aria-label="New message">
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>New Message</ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close">
            <X size={18} />
          </CloseButton>
        </ModalHeader>

        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name or username..."
          aria-label="Search users"
        />

        {/* Quick-Access: Trainers + Friends */}
        {!query && !friendsLoading && (trainers.length > 0 || friendsList.length > 0) && (
          <>
            {trainers.length > 0 && (
              <QuickSection>
                <QuickLabel><GraduationCap size={12} /> Your Trainers</QuickLabel>
                <QuickRow>
                  {trainers.map(t => (
                    <QuickChip key={t.friendshipId} onClick={() => { onStartConversation(Number(t.id)); onClose(); }}>
                      <ChipAvatar>
                        {t.photo ? <img src={t.photo} alt="" /> : `${(t.firstName?.[0] || '').toUpperCase()}${(t.lastName?.[0] || '').toUpperCase()}`}
                      </ChipAvatar>
                      {t.firstName} {t.lastName?.[0]}.
                      <RoleBadge $role="trainer">Trainer</RoleBadge>
                    </QuickChip>
                  ))}
                </QuickRow>
              </QuickSection>
            )}
            {friendsList.length > 0 && (
              <QuickSection>
                <QuickLabel><Users size={12} /> Friends</QuickLabel>
                <QuickRow>
                  {friendsList.slice(0, 10).map(f => (
                    <QuickChip key={f.friendshipId} onClick={() => { onStartConversation(Number(f.id)); onClose(); }}>
                      <ChipAvatar>
                        {f.photo ? <img src={f.photo} alt="" /> : `${(f.firstName?.[0] || '').toUpperCase()}${(f.lastName?.[0] || '').toUpperCase()}`}
                      </ChipAvatar>
                      {f.firstName} {f.lastName?.[0]}.
                    </QuickChip>
                  ))}
                </QuickRow>
              </QuickSection>
            )}
          </>
        )}

        <UserList>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0.5rem' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem', alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(96,192,240,0.06)' }} />
                  <div style={{ flex: 1 }}>
                    <SkeletonLine $width="50%" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState>
              <EmptySubtext>
                {query ? `No users found for "${query}"` : 'No users available'}
              </EmptySubtext>
            </EmptyState>
          ) : (
            users.map(user => (
              <UserItem
                key={user.id}
                onClick={() => {
                  onStartConversation(user.id);
                  onClose();
                }}
              >
                <Avatar $size={40}>
                  {user.photo ? (
                    <img src={user.photo} alt={`${user.firstName} ${user.lastName} profile`} />
                  ) : (
                    `${(user.firstName?.[0] || '').toUpperCase()}${(user.lastName?.[0] || '').toUpperCase()}`
                  )}
                </Avatar>
                <div>
                  <UserName>{participantDisplayName(user)}</UserName>
                  <UserRole>{user.role}{user.username ? ` - @${user.username}` : ''}</UserRole>
                </div>
              </UserItem>
            ))
          )}
        </UserList>
      </ModalContent>
    </ModalOverlay>
  );
};

export default React.memo(NewConversationModal);
