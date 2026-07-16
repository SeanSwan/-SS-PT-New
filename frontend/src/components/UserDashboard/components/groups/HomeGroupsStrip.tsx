/**
 * ============================================================================
 * FILE: HomeGroupsStrip.tsx
 * PURPOSE: Compact "Your Groups" rail on the Home tab — one-tap access to
 *          each group's feed plus the discover entry point. Groups are a
 *          first-class main-page surface, not buried under Messages.
 * HOW IT FITS: Mounted by HomeTab inside a support Panel. Self-contained
 *          (own data + navigation) to respect HomeTab's 300-line ceiling.
 * ============================================================================
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Users } from 'lucide-react';
import styled from 'styled-components';
import { useGroups } from '../../../../hooks/social/useGroups';
import { Eyebrow } from '../HomeTabVision.styles';

const StripRoot = styled.div`
  display: grid;
  gap: 0.6rem;
  min-width: 0;
`;

const StripHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
`;

const BrowseLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 44px;
  padding: 0 0.6rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const ChipRow = styled.div`
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  scrollbar-width: thin;
  min-width: 0;
`;

const GroupChip = styled.button`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0 0.85rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--surface-primary, #003080) 55%, transparent),
      color-mix(in srgb, var(--bg-elevated, #141419) 92%, transparent)
    );
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  max-width: 220px;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const MemberCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0 0.4rem;
  min-width: 1.3rem;
  height: 1.3rem;
  justify-content: center;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, transparent);
`;

const EmptyCopy = styled.button`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 44px;
  padding: 0.55rem 0.8rem;
  border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent);
  background: transparent;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent);
  font-size: 0.86rem;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const MAX_STRIP_GROUPS = 6;

const HomeGroupsStrip: React.FC = () => {
  const navigate = useNavigate();
  const { groups, isLoading, error, refresh } = useGroups('mine');

  const openGroup = (groupId: number) => navigate(`/user-dashboard/groups?g=${groupId}`);
  const browseGroups = () => navigate('/user-dashboard/groups');

  return (
    <StripRoot aria-label="Your groups">
      <StripHeader>
        <Eyebrow>
          <Users size={13} aria-hidden="true" />
          Your Groups
        </Eyebrow>
        <BrowseLink type="button" onClick={browseGroups}>
          Browse all
          <ChevronRight size={14} aria-hidden="true" />
        </BrowseLink>
      </StripHeader>

      {isLoading ? (
        <EmptyCopy type="button" onClick={browseGroups} aria-label="Loading your groups">
          Loading your groups…
        </EmptyCopy>
      ) : error ? (
        // Don't imply "no groups" on a transient failure — offer a retry.
        <EmptyCopy type="button" onClick={() => void refresh()} aria-label="Retry loading your groups">
          <Users size={16} aria-hidden="true" />
          Couldn&apos;t load your groups — tap to retry.
        </EmptyCopy>
      ) : groups.length === 0 ? (
        <EmptyCopy type="button" onClick={browseGroups}>
          <Users size={16} aria-hidden="true" />
          Find your training circle — browse groups or start your own.
        </EmptyCopy>
      ) : (
        <ChipRow role="list">
          {groups.slice(0, MAX_STRIP_GROUPS).map((group) => (
            <div role="listitem" key={group.id}>
              <GroupChip
                type="button"
                onClick={() => openGroup(group.id)}
                aria-label={`Open group ${group.name}${group.memberCount ? `, ${group.memberCount} members` : ''}`}
              >
                {group.emoji || '👥'}
                <span>{group.name}</span>
                {group.memberCount > 0 && <MemberCountBadge aria-hidden="true">{group.memberCount}</MemberCountBadge>}
                {group.myMembership?.status === 'pending' && <span aria-hidden="true">⏳</span>}
              </GroupChip>
            </div>
          ))}
        </ChipRow>
      )}
    </StripRoot>
  );
};

export default HomeGroupsStrip;
