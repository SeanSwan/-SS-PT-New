/**
 * FILE: GroupManagementPanel.tsx
 * PURPOSE: Group chat rename, member, and role controls for messaging threads.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Crown, Search, ShieldCheck, UserMinus, UserPlus } from 'lucide-react';
import type { ConversationData, GroupRole, SearchUserResult } from './MessagingTypes';
import { participantDisplayName } from './messagingApiAdapters';
import { Avatar } from './MessagingStyles';
import {
  ActionButton,
  EmptyLine,
  GroupBody,
  GroupKicker,
  GroupPanel,
  GroupPanelHeader,
  GroupTitle,
  GroupTitleStack,
  InlineForm,
  MemberActions,
  MemberGrid,
  MemberIdentity,
  MemberMeta,
  MemberName,
  MemberRow,
  MiniToggle,
  RoleChip,
  RoleStrip,
  TextInput,
  ToggleButton,
  UserResultButton,
  UserResultList,
} from './GroupManagementPanel.styles';

interface Props {
  conversation: ConversationData;
  currentUserId: string | number;
  searchUsers: (query: string) => Promise<SearchUserResult[]>;
  onRename: (conversationId: string | number, name: string) => Promise<ConversationData | null>;
  onAddParticipants: (conversationId: string | number, participantIds: number[], adminIds?: number[]) => Promise<ConversationData | null>;
  onUpdateParticipantRole: (conversationId: string | number, userId: number, role: Exclude<GroupRole, 'owner'>) => Promise<ConversationData | null>;
  onRemoveParticipant: (conversationId: string | number, userId: number) => Promise<boolean>;
}

const getInitials = (user: Pick<SearchUserResult, 'firstName' | 'lastName'>): string =>
  `${(user.firstName?.[0] || '').toUpperCase()}${(user.lastName?.[0] || '').toUpperCase()}` || '?';

const labelForRole = (role?: GroupRole): string => {
  if (role === 'owner') return 'Owner';
  if (role === 'admin') return 'Admin';
  return 'Member';
};

const GroupManagementPanel: React.FC<Props> = ({
  conversation,
  currentUserId,
  searchUsers,
  onRename,
  onAddParticipants,
  onUpdateParticipantRole,
  onRemoveParticipant,
}) => {
  const [open, setOpen] = useState(true);
  const [nameDraft, setNameDraft] = useState(conversation.name || 'Swan Family');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [adminIds, setAdminIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const viewerRole = conversation.viewerRole || 'member';
  const isOwner = viewerRole === 'owner';
  const canManage = Boolean(conversation.canManage || viewerRole === 'owner' || viewerRole === 'admin');
  const memberIds = useMemo(() => new Set(conversation.participants.map(member => Number(member.id))), [conversation.participants]);
  const availableResults = useMemo(
    () => results.filter(user => !memberIds.has(Number(user.id))),
    [memberIds, results]
  );

  useEffect(() => {
    setNameDraft(conversation.name || 'Swan Family');
  }, [conversation.id, conversation.name]);

  useEffect(() => {
    if (!canManage) return undefined;
    const timer = setTimeout(async () => {
      const users = await searchUsers(query);
      setResults(users);
    }, 250);
    return () => clearTimeout(timer);
  }, [canManage, query, searchUsers]);

  const submitRename = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const nextName = nameDraft.trim() || 'Swan Family';
    setBusy(true);
    await onRename(conversation.id, nextName);
    setBusy(false);
  }, [conversation.id, nameDraft, onRename]);

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

  const submitAdd = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBusy(true);
    await onAddParticipants(conversation.id, [...selectedIds], [...adminIds].filter(id => selectedIds.has(id)));
    setSelectedIds(new Set());
    setAdminIds(new Set());
    setQuery('');
    setBusy(false);
  }, [adminIds, conversation.id, onAddParticipants, selectedIds]);

  const roleAction = useCallback(async (userId: number, role: Exclude<GroupRole, 'owner'>) => {
    setBusy(true);
    await onUpdateParticipantRole(conversation.id, userId, role);
    setBusy(false);
  }, [conversation.id, onUpdateParticipantRole]);

  const removeAction = useCallback(async (userId: number) => {
    setBusy(true);
    await onRemoveParticipant(conversation.id, userId);
    setBusy(false);
  }, [conversation.id, onRemoveParticipant]);

  return (
    <GroupPanel aria-label="Group controls">
      <GroupPanelHeader>
        <GroupTitleStack>
          <GroupKicker>Group Chat</GroupKicker>
          <GroupTitle>{conversation.name || 'Swan Family'}</GroupTitle>
        </GroupTitleStack>
        <ToggleButton type="button" onClick={() => setOpen(prev => !prev)} aria-expanded={open}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </ToggleButton>
      </GroupPanelHeader>

      <GroupBody $open={open}>
        <RoleStrip>
          <RoleChip $tone={viewerRole}>{viewerRole === 'owner' && <Crown size={13} />}{labelForRole(viewerRole)}</RoleChip>
          <RoleChip>{conversation.memberCount || conversation.participants.length} members</RoleChip>
          {canManage && <RoleChip $tone="admin"><ShieldCheck size={13} /> Admin tools</RoleChip>}
        </RoleStrip>

        {canManage && (
          <InlineForm onSubmit={submitRename}>
            <TextInput value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={80} aria-label="Group name" />
            <ActionButton type="submit" $primary disabled={busy}>Rename</ActionButton>
          </InlineForm>
        )}

        {canManage && (
          <>
            <InlineForm onSubmit={(event) => { event.preventDefault(); submitAdd(); }}>
              <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Add members" aria-label="Search members to add" />
              <ActionButton type="submit" $primary disabled={busy || selectedIds.size === 0}><UserPlus size={14} /> Add</ActionButton>
            </InlineForm>
            <UserResultList>
              {availableResults.length === 0 ? <EmptyLine>{query ? 'No available matches' : 'Search members to add'}</EmptyLine> : availableResults.map(user => {
                const selected = selectedIds.has(user.id);
                return (
                  <UserResultButton key={user.id} $selected={selected}>
                    <span>{participantDisplayName(user)} - {user.role}</span>
                    <MemberActions>
                      {isOwner && selected && (
                        <MiniToggle type="button" $active={adminIds.has(user.id)} onClick={() => toggleAdmin(user.id)}>
                          {adminIds.has(user.id) ? 'Admin' : 'Make admin'}
                        </MiniToggle>
                      )}
                      <ActionButton type="button" onClick={() => toggleSelected(user.id)}>
                        {selected ? <Check size={14} /> : <Search size={14} />} {selected ? 'Selected' : 'Select'}
                      </ActionButton>
                    </MemberActions>
                  </UserResultButton>
                );
              })}
            </UserResultList>
          </>
        )}

        <MemberGrid>
          {conversation.participants.map(member => {
            const role = member.groupRole || 'member';
            const isSelf = Number(member.id) === Number(currentUserId);
            const canRemove = role !== 'owner' && (isSelf || isOwner || (viewerRole === 'admin' && role === 'member'));
            return (
              <MemberRow key={member.id}>
                <MemberIdentity>
                  <Avatar $size={38}>{member.photo ? <img src={member.photo} alt="" /> : getInitials(member)}</Avatar>
                  <div>
                    <MemberName>{participantDisplayName(member)}{isSelf ? ' (you)' : ''}</MemberName>
                    <MemberMeta>{member.role} - {labelForRole(role)}</MemberMeta>
                  </div>
                </MemberIdentity>
                <MemberActions>
                  {isOwner && role !== 'owner' && (
                    <ActionButton type="button" disabled={busy} onClick={() => roleAction(member.id, role === 'admin' ? 'member' : 'admin')}>
                      <ShieldCheck size={14} /> {role === 'admin' ? 'Demote' : 'Promote'}
                    </ActionButton>
                  )}
                  {canRemove && (
                    <ActionButton type="button" $danger disabled={busy} onClick={() => removeAction(member.id)}>
                      <UserMinus size={14} /> {isSelf ? 'Leave' : 'Remove'}
                    </ActionButton>
                  )}
                </MemberActions>
              </MemberRow>
            );
          })}
        </MemberGrid>
      </GroupBody>
    </GroupPanel>
  );
};

export default React.memo(GroupManagementPanel);
