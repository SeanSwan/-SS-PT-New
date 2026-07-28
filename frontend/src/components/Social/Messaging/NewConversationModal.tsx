/**
 * FILE: NewConversationModal.tsx
 * PURPOSE: Start direct messages or create managed group chats.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Check, GraduationCap, MessageSquare, ShieldCheck, Users, X } from 'lucide-react';
import type { CreateConversationRequest, SearchUserResult } from './MessagingTypes';
import { participantDisplayName } from './messagingApiAdapters';
import { useSocialFriends } from '../../../hooks/social/useSocialFriends';
import {
  ModalOverlay, ModalContent, ModalHeader, ModalTitle, CloseButton,
  SearchInput, UserList, Avatar, UserName, UserRole,
  EmptyState, EmptySubtext, SkeletonLine,
} from './MessagingStyles';
import {
  AdminToggle,
  ChipAvatar,
  CreateButton,
  FooterBar,
  GroupNameInput,
  ModeTab,
  ModeTabs,
  LoadingResults,
  QuickChip,
  QuickLabel,
  QuickRow,
  QuickSection,
  RoleBadge,
  SelectableUserItem,
  SelectMark,
  SelectionSummary,
  UserText,
} from './NewConversationModal.styles';

type PickerMode = 'direct' | 'group';
type PickerUser = SearchUserResult & { friendshipId?: number | string };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStartConversation: (request: number | CreateConversationRequest) => void | Promise<unknown>;
  searchUsers: (query: string) => Promise<SearchUserResult[]>;
}

const getInitials = (user: Pick<SearchUserResult, 'firstName' | 'lastName'>): string =>
  `${(user.firstName?.[0] || '').toUpperCase()}${(user.lastName?.[0] || '').toUpperCase()}` || '?';

const normalizeFriend = (friend: any): PickerUser => ({
  id: Number(friend.id),
  firstName: friend.firstName || '',
  lastName: friend.lastName || '',
  username: friend.username || '',
  photo: friend.photo || null,
  role: friend.role === 'user' ? 'client' : friend.role || 'client',
  displayName: `${friend.firstName || ''} ${friend.lastName || ''}`.trim() || friend.username,
  lastActive: friend.lastActive || null,
  friendshipId: friend.friendshipId,
});

const NewConversationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onStartConversation,
  searchUsers,
}) => {
  const [mode, setMode] = useState<PickerMode>('direct');
  const [query, setQuery] = useState('');
  const [groupName, setGroupName] = useState('Swan Family');
  const [users, setUsers] = useState<SearchUserResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [adminIds, setAdminIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestRef = useRef(0);
  const { friends, isLoading: friendsLoading } = useSocialFriends();

  const friendUsers = useMemo(() => friends.map(normalizeFriend).filter(user => Number.isFinite(user.id)), [friends]);
  const trainers = useMemo(() => friendUsers.filter(f => f.role === 'trainer'), [friendUsers]);
  const friendsList = useMemo(() => friendUsers.filter(f => f.role !== 'trainer'), [friendUsers]);
  const knownUsersById = useMemo(() => {
    const entries = [...friendUsers, ...users].map(user => [Number(user.id), user] as const);
    return new Map(entries);
  }, [friendUsers, users]);
  const selectedUsers = useMemo(
    () => [...selectedIds].map(id => knownUsersById.get(id)).filter(Boolean) as SearchUserResult[],
    [knownUsersById, selectedIds]
  );

  useEffect(() => {
    if (!isOpen) return;
    setMode('direct');
    setQuery('');
    setGroupName('Swan Family');
    setSelectedIds(new Set());
    setAdminIds(new Set());
    setUsers([]);
    setLoading(false);
    searchRequestRef.current += 1;
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const normalizedQuery = value.trim().replace(/\s+/g, ' ');
    if (normalizedQuery.length < 2) {
      searchRequestRef.current += 1;
      setUsers([]);
      setLoading(false);
      return;
    }

    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchUsers(normalizedQuery);
        if (searchRequestRef.current === requestId) setUsers(results);
      } finally {
        if (searchRequestRef.current === requestId) setLoading(false);
      }
    }, 300);
  }, [searchUsers]);
  const toggleSelected = useCallback((userId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
        setAdminIds(adminPrev => {
          const adminNext = new Set(adminPrev);
          adminNext.delete(userId);
          return adminNext;
        });
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const toggleAdmin = useCallback((userId: number) => {
    setAdminIds(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  }, []);

  const startDirect = useCallback(async (userId: number) => {
    setSaving(true);
    await onStartConversation(userId);
    setSaving(false);
    onClose();
  }, [onClose, onStartConversation]);

  const createGroup = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    await onStartConversation({
      type: 'group',
      name: groupName.trim() || 'Swan Family',
      participantIds: [...selectedIds],
      adminIds: [...adminIds].filter(id => selectedIds.has(id)),
    });
    setSaving(false);
    onClose();
  }, [adminIds, groupName, onClose, onStartConversation, selectedIds]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderQuickChip = (user: PickerUser, label: string, showRole = false) => {
    const selected = selectedIds.has(user.id);
    return (
      <QuickChip
        key={user.friendshipId || user.id}
        $selected={selected}
        onClick={() => (mode === 'group' ? toggleSelected(user.id) : startDirect(user.id))}
      >
        <ChipAvatar>{user.photo ? <img src={user.photo} alt="" /> : getInitials(user)}</ChipAvatar>
        {label}
        {showRole && <RoleBadge $role={user.role}>{user.role}</RoleBadge>}
      </QuickChip>
    );
  };

  return (
    <ModalOverlay onClick={onClose} role="dialog" aria-modal="true" aria-label="New message">
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{mode === 'group' ? 'New Group' : 'New Message'}</ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close"><X size={18} /></CloseButton>
        </ModalHeader>

        <ModeTabs>
          <ModeTab $active={mode === 'direct'} onClick={() => setMode('direct')} type="button">
            <MessageSquare size={15} /> Direct
          </ModeTab>
          <ModeTab $active={mode === 'group'} onClick={() => setMode('group')} type="button">
            <Users size={15} /> Group
          </ModeTab>
        </ModeTabs>

        {mode === 'group' && (
          <GroupNameInput
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Group name"
            maxLength={80}
            aria-label="Group name"
          />
        )}

        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder="Search by name or username..."
          aria-label="Search users"
        />

        {!query && !friendsLoading && (trainers.length > 0 || friendsList.length > 0) && (
          <>
            {trainers.length > 0 && (
              <QuickSection>
                <QuickLabel><GraduationCap size={12} /> Trainers</QuickLabel>
                <QuickRow>{trainers.map(t => renderQuickChip(t, `${t.firstName} ${t.lastName?.[0] || ''}.`, true))}</QuickRow>
              </QuickSection>
            )}
            {friendsList.length > 0 && (
              <QuickSection>
                <QuickLabel><Users size={12} /> Friends</QuickLabel>
                <QuickRow>{friendsList.slice(0, 10).map(f => renderQuickChip(f, `${f.firstName} ${f.lastName?.[0] || ''}.`))}</QuickRow>
              </QuickSection>
            )}
          </>
        )}

        <UserList>
          {loading ? (
            <LoadingResults>
              {[1, 2, 3].map(i => <SkeletonLine key={i} $width={`${44 + i * 12}%`} />)}
            </LoadingResults>
          ) : users.length === 0 ? (
            <EmptyState><EmptySubtext>{query ? `No users found for "${query}"` : 'No users available'}</EmptySubtext></EmptyState>
          ) : users.map(user => {
            const selected = selectedIds.has(user.id);
            return (
              <SelectableUserItem
                key={user.id}
                $selected={selected}
                onClick={() => (mode === 'group' ? toggleSelected(user.id) : startDirect(user.id))}
              >
                <Avatar $size={40}>{user.photo ? <img src={user.photo} alt={`${user.firstName} ${user.lastName} profile`} /> : getInitials(user)}</Avatar>
                <UserText>
                  <UserName>{participantDisplayName(user)}</UserName>
                  <UserRole>{user.role}{user.username ? ` - @${user.username}` : ''}</UserRole>
                </UserText>
                {mode === 'group' && selected && (
                  <AdminToggle
                    type="button"
                    $active={adminIds.has(user.id)}
                    onClick={(event) => { event.stopPropagation(); toggleAdmin(user.id); }}
                  >
                    <ShieldCheck size={13} /> {adminIds.has(user.id) ? 'Admin' : 'Make admin'}
                  </AdminToggle>
                )}
                {mode === 'group' && <SelectMark $selected={selected}>{selected && <Check size={14} />}</SelectMark>}
              </SelectableUserItem>
            );
          })}
        </UserList>

        {mode === 'group' && (
          <FooterBar>
            <SelectionSummary>{selectedUsers.length} selected - {adminIds.size} admins</SelectionSummary>
            <CreateButton type="button" onClick={createGroup} disabled={saving || selectedIds.size === 0}>
              Create Group
            </CreateButton>
          </FooterBar>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};
export default React.memo(NewConversationModal);
