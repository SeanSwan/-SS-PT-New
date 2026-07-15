/**
 * ============================================================================
 * FILE: GroupsHub.tsx
 * PURPOSE: The Groups tab hub — "Your groups" rail, discovery grid with
 *          search + category filters, and the create-group entry point.
 * HOW IT FITS: Rendered by GroupsTab when no group is selected. Selecting a
 *          card sets ?g=<id> (GroupsTab owns that URL state).
 * ============================================================================
 */
import React, { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { GROUP_CATEGORIES, useGroups, type CommunityGroup } from '../../../../hooks/social/useGroups';
import GroupCard from './GroupCard';
import CreateGroupModal from './CreateGroupModal';
import { Spinner } from '../../../Social/Feed/styles/SocialFeedStyles';
import {
  CategoryChip,
  CategoryChipRow,
  EmptyStateCard,
  GroupSearchInput,
  GroupsGrid,
  GroupsSurface,
  HubControlsRow,
  PrimaryGroupButton,
  SectionDivider,
} from './GroupsShared.styles';

interface GroupsHubProps {
  onOpenGroup: (group: CommunityGroup) => void;
}

const GroupsHub: React.FC<GroupsHubProps> = ({ onOpenGroup }) => {
  const hub = useGroups('discover');
  const [showCreate, setShowCreate] = useState(false);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const myGroups = useMemo(
    () => hub.groups.filter((g) => g.myMembership && g.myMembership.status !== 'banned'),
    [hub.groups],
  );
  const discoverGroups = useMemo(
    () => hub.groups.filter((g) => !g.myMembership || g.myMembership.status === 'banned'),
    [hub.groups],
  );

  const handleJoin = async (group: CommunityGroup) => {
    setJoiningId(group.id);
    try {
      const joined = await hub.joinGroup(group.id);
      if (joined?.myMembership?.status === 'active') onOpenGroup(joined);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <GroupsSurface>
      <HubControlsRow>
        <GroupSearchInput
          type="search"
          value={hub.search}
          onChange={(e) => hub.setSearch(e.target.value)}
          placeholder="Search groups…"
          aria-label="Search groups"
        />
        <PrimaryGroupButton type="button" onClick={() => setShowCreate(true)}>
          <Plus size={16} aria-hidden="true" />
          Create group
        </PrimaryGroupButton>
      </HubControlsRow>

      <CategoryChipRow aria-label="Filter by category">
        <CategoryChip
          type="button"
          $active={hub.category === null}
          onClick={() => hub.setCategory(null)}
        >
          All
        </CategoryChip>
        {GROUP_CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat}
            type="button"
            $active={hub.category === cat}
            onClick={() => hub.setCategory(hub.category === cat ? null : cat)}
          >
            {cat}
          </CategoryChip>
        ))}
      </CategoryChipRow>

      {hub.isLoading ? (
        <EmptyStateCard aria-label="Loading groups">
          <Spinner $size={26} aria-label="Loading groups" />
        </EmptyStateCard>
      ) : hub.error ? (
        <EmptyStateCard role="alert">
          {hub.error}
          <PrimaryGroupButton type="button" onClick={() => void hub.refresh()}>
            Try again
          </PrimaryGroupButton>
        </EmptyStateCard>
      ) : (
        <>
          {myGroups.length > 0 && (
            <>
              <SectionDivider>Your groups</SectionDivider>
              <GroupsGrid>
                {myGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onOpen={onOpenGroup}
                    onJoin={handleJoin}
                    isJoining={joiningId === group.id}
                  />
                ))}
              </GroupsGrid>
            </>
          )}

          <SectionDivider>Discover</SectionDivider>
          {discoverGroups.length === 0 ? (
            <EmptyStateCard>
              <Users size={26} aria-hidden="true" />
              {myGroups.length > 0
                ? 'No more groups to discover right now — start another one!'
                : 'No groups yet. Be the first to start one for your training circle.'}
              <PrimaryGroupButton type="button" onClick={() => setShowCreate(true)}>
                <Plus size={16} aria-hidden="true" />
                Create the first group
              </PrimaryGroupButton>
            </EmptyStateCard>
          ) : (
            <GroupsGrid>
              {discoverGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onOpen={onOpenGroup}
                  onJoin={handleJoin}
                  isJoining={joiningId === group.id}
                />
              ))}
            </GroupsGrid>
          )}
        </>
      )}

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreate={async (input) => {
            const created = await hub.createGroup(input);
            if (created) onOpenGroup(created);
            return created;
          }}
        />
      )}
    </GroupsSurface>
  );
};

export default GroupsHub;
