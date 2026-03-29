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
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search } from 'lucide-react';
import type { SearchUserResult } from './MessagingTypes';
import {
  ModalOverlay, ModalContent, ModalHeader, ModalTitle, CloseButton,
  SearchInput, UserList, UserItem, Avatar, UserName, UserRole,
  EmptyState, EmptySubtext, SkeletonLine,
} from './MessagingStyles';

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
                  <UserName>{user.firstName} {user.lastName}</UserName>
                  <UserRole>{user.role}</UserRole>
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
