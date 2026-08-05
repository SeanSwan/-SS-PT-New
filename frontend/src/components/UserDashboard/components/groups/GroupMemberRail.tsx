/**
 * ============================================================================
 * FILE: GroupMemberRail.tsx
 * PURPOSE: Member list + moderator controls for a group (approve/deny pending
 *          requests, promote/demote, remove, transfer ownership).
 * HOW IT FITS: Rendered by GroupDetail; moderation actions come from
 *          useGroupModeration via the parent so this stays presentational-ish.
 * ============================================================================
 */
import React from 'react';
import { Ban, Check, Crown, Shield, Users, X } from 'lucide-react';
import type { GroupMemberEntry } from '../../../../hooks/social/useGroups';
import { MemberChip, MemberRail, MemberRailTitle, MemberActionRow } from './GroupDetail.styles';
import { QuietGroupButton, StatusPill } from './GroupsShared.styles';

interface GroupMemberRailProps {
  /** True when the members fetch failed — an empty rail is then unknown, not empty. */
  membersUnavailable?: boolean;
  members: GroupMemberEntry[];
  ownerId?: number;
  canModerate: boolean;
  isOwner: boolean;
  isBusy: boolean;
  onApprove: (userId: number) => void;
  onDeny: (userId: number) => void;
  onSetRole: (userId: number, role: 'member' | 'moderator') => void;
  onRemove: (userId: number) => void;
  onBan: (userId: number) => void;
  onReinstate: (userId: number) => void;
  onTransfer: (userId: number) => void;
}

const displayName = (entry: GroupMemberEntry) => {
  if (!entry.user) return 'Member';
  const full = `${entry.user.firstName ?? ''} ${entry.user.lastName ?? ''}`.trim();
  return full || entry.user.username || 'Member';
};

const GroupMemberRail: React.FC<GroupMemberRailProps> = ({
  membersUnavailable = false,
  members, ownerId, canModerate, isOwner, isBusy,
  onApprove, onDeny, onSetRole, onRemove, onBan, onReinstate, onTransfer,
}) => {
  const pending = members.filter((m) => m.status === 'pending');
  const active = members.filter((m) => m.status === 'active');
  const banned = members.filter((m) => m.status === 'banned');

  return (
    <MemberRail aria-label="Group members">
      <MemberRailTitle>
        <Users size={14} aria-hidden="true" />
        Members
      </MemberRailTitle>

      {canModerate && pending.length > 0 && (
        <>
          <MemberRailTitle as="h4">Requests ({pending.length})</MemberRailTitle>
          {pending.map((entry) => (
            <MemberChip key={`p-${entry.userId}`} $pending>
              {displayName(entry)}
              <MemberActionRow>
                <QuietGroupButton
                  type="button"
                  onClick={() => onApprove(entry.userId)}
                  disabled={isBusy}
                  aria-label={`Approve ${displayName(entry)}`}
                >
                  <Check size={15} aria-hidden="true" /> Approve
                </QuietGroupButton>
                <QuietGroupButton
                  type="button"
                  onClick={() => onDeny(entry.userId)}
                  disabled={isBusy}
                  aria-label={`Deny ${displayName(entry)}`}
                >
                  <X size={15} aria-hidden="true" /> Deny
                </QuietGroupButton>
              </MemberActionRow>
            </MemberChip>
          ))}
        </>
      )}

      {active.length === 0 ? (
        <MemberChip>{membersUnavailable ? "Couldn't load members" : 'No visible members yet'}</MemberChip>
      ) : (
        active.map((entry) => {
          const isGroupOwnerRow = entry.userId === ownerId || entry.role === 'owner';
          return (
            <MemberChip key={entry.userId}>
              {displayName(entry)}
              {entry.role !== 'member' && (
                <StatusPill $tone="gold">
                  {entry.role === 'owner' ? <Crown size={11} aria-hidden="true" /> : <Shield size={11} aria-hidden="true" />}
                  {entry.role}
                </StatusPill>
              )}
              {canModerate && !isGroupOwnerRow && (
                <MemberActionRow>
                  {isOwner && (
                    <QuietGroupButton
                      type="button"
                      onClick={() => onSetRole(entry.userId, entry.role === 'moderator' ? 'member' : 'moderator')}
                      disabled={isBusy}
                    >
                      {entry.role === 'moderator' ? 'Demote' : 'Make mod'}
                    </QuietGroupButton>
                  )}
                  {isOwner && (
                    <QuietGroupButton type="button" onClick={() => onTransfer(entry.userId)} disabled={isBusy}>
                      <Crown size={14} aria-hidden="true" /> Make owner
                    </QuietGroupButton>
                  )}
                  <QuietGroupButton
                    type="button"
                    onClick={() => onRemove(entry.userId)}
                    disabled={isBusy}
                    aria-label={`Remove ${displayName(entry)}`}
                  >
                    Remove
                  </QuietGroupButton>
                  <QuietGroupButton
                    type="button"
                    onClick={() => onBan(entry.userId)}
                    disabled={isBusy}
                    aria-label={`Ban ${displayName(entry)}`}
                  >
                    <Ban size={14} aria-hidden="true" /> Ban
                  </QuietGroupButton>
                </MemberActionRow>
              )}
            </MemberChip>
          );
        })
      )}

      {canModerate && banned.length > 0 && (
        <>
          <MemberRailTitle as="h4">Banned ({banned.length})</MemberRailTitle>
          {banned.map((entry) => (
            <MemberChip key={`b-${entry.userId}`} $pending>
              {displayName(entry)}
              <StatusPill $tone="violet">banned</StatusPill>
              <MemberActionRow>
                <QuietGroupButton
                  type="button"
                  onClick={() => onReinstate(entry.userId)}
                  disabled={isBusy}
                  aria-label={`Reinstate ${displayName(entry)}`}
                >
                  <Check size={15} aria-hidden="true" /> Reinstate
                </QuietGroupButton>
              </MemberActionRow>
            </MemberChip>
          ))}
        </>
      )}
    </MemberRail>
  );
};

export default GroupMemberRail;
