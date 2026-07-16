/**
 * ============================================================================
 * FILE: GroupCard.tsx
 * PURPOSE: One community group in the hub grid — identity, stats, join/open.
 * HOW IT FITS: Rendered by GroupsHub; navigation + membership handlers come
 *          from the parent so this stays presentational.
 * ============================================================================
 */
import React from 'react';
import { Clock3, Globe, Lock, Users } from 'lucide-react';
import type { CommunityGroup } from '../../../../hooks/social/useGroups';
import {
  CardActionsRow,
  GroupCardShell,
  GroupDescription,
  GroupEmojiTile,
  GroupIdentityRow,
  GroupMetaRow,
  GroupName,
  PrimaryGroupButton,
  QuietGroupButton,
  StatusPill,
} from './GroupsShared.styles';
import { StyledBox } from '@/components/ui/StyledBox';

interface GroupCardProps {
  group: CommunityGroup;
  onOpen: (group: CommunityGroup) => void;
  onJoin: (group: CommunityGroup) => void;
  isJoining?: boolean;
}

const monogram = (name: string) =>
  name.trim().slice(0, 2).toUpperCase() || 'SG';

const describeActivity = (iso: string | null): string | null => {
  if (!iso) return null;
  const deltaMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(deltaMs / 86_400_000);
  if (days <= 0) return 'Active today';
  if (days === 1) return 'Active yesterday';
  if (days < 30) return `Active ${days}d ago`;
  return null;
};

const GroupCard: React.FC<GroupCardProps> = ({ group, onOpen, onJoin, isJoining }) => {
  const membership = group.myMembership;
  const isMember = membership?.status === 'active';
  const isPending = membership?.status === 'pending';
  const activity = describeActivity(group.lastActivityAt);

  return (
    <GroupCardShell aria-label={`Group ${group.name}`}>
      <GroupIdentityRow>
        <GroupEmojiTile aria-hidden="true">
          {group.emoji || monogram(group.name)}
        </GroupEmojiTile>
        <StyledBox as="div" $style={{ minWidth: 0 }}>
          <GroupName>{group.name}</GroupName>
          <GroupMetaRow>
            <span>
              <Users size={13} aria-hidden="true" />
              {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
            </span>
            <span>
              {group.privacy === 'private'
                ? <Lock size={13} aria-hidden="true" />
                : <Globe size={13} aria-hidden="true" />}
              {group.privacy}
            </span>
            {activity && (
              <span>
                <Clock3 size={13} aria-hidden="true" />
                {activity}
              </span>
            )}
          </GroupMetaRow>
        </StyledBox>
      </GroupIdentityRow>

      {group.description && <GroupDescription>{group.description}</GroupDescription>}

      <CardActionsRow>
        {isMember ? (
          <>
            {membership?.role !== 'member' && (
              <StatusPill $tone="gold">{membership?.role}</StatusPill>
            )}
            <PrimaryGroupButton type="button" onClick={() => onOpen(group)}>
              Open group
            </PrimaryGroupButton>
          </>
        ) : isPending ? (
          <>
            <StatusPill $tone="violet">Request pending</StatusPill>
            <QuietGroupButton type="button" onClick={() => onOpen(group)}>
              Preview
            </QuietGroupButton>
          </>
        ) : (
          <>
            <PrimaryGroupButton
              type="button"
              onClick={() => onJoin(group)}
              disabled={isJoining}
            >
              {group.privacy === 'private' ? 'Request to join' : 'Join'}
            </PrimaryGroupButton>
            <QuietGroupButton type="button" onClick={() => onOpen(group)}>
              Preview
            </QuietGroupButton>
          </>
        )}
      </CardActionsRow>
    </GroupCardShell>
  );
};

export default React.memo(GroupCard);
