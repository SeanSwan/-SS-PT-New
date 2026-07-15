/**
 * ============================================================================
 * FILE: GroupsTab.tsx
 * PURPOSE: Container for the /user-dashboard/groups tab. Owns the hub↔detail
 *          switch via the ?g=<groupId> search param so group pages are
 *          deep-linkable without new route entries.
 * HOW IT FITS: Lazy-mounted by UserDashboardTabsV3 inside SectionChrome.
 * ============================================================================
 */
import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import GroupsHub from './GroupsHub';
import GroupDetail from './GroupDetail';
import type { CommunityGroup } from '../../../../hooks/social/useGroups';

const GroupsTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawGroupId = Number(searchParams.get('g'));
  const selectedGroupId = Number.isInteger(rawGroupId) && rawGroupId > 0 ? rawGroupId : null;

  const openGroup = useCallback((group: CommunityGroup) => {
    setSearchParams({ g: String(group.id) });
  }, [setSearchParams]);

  const backToHub = useCallback(() => {
    // Clear only ?g= — preserve any coexisting dashboard query params.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('g');
      return next;
    });
  }, [setSearchParams]);

  // key={selectedGroupId} forces a fresh GroupDetail (and fresh group-scoped
  // feed state) whenever the ?g= target changes — otherwise a direct group→
  // group URL jump would merge the previous group's posts into the new one.
  return selectedGroupId
    ? <GroupDetail key={selectedGroupId} groupId={selectedGroupId} onBack={backToHub} />
    : <GroupsHub onOpenGroup={openGroup} />;
};

export default GroupsTab;
