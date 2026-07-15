/**
 * GroupsSurface.contract — source locks for the 2026-07-14 Groups upgrade
 * =======================================================================
 * Locks: (1) groups is a first-class routable dashboard tab mounted in the
 * tab bar + panels; (2) Home carries the Your-Groups strip (groups are on
 * the MAIN page, not buried under Messages); (3) the group feed rides the
 * same stateful useSocialFeed API (groupId option); (4) the level-up
 * socket event now fires the real CelebrationPortal fireworks; (5) the
 * rank pill renders the gold segment treatment.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(path.resolve(here, rel), 'utf8');

describe('groups is a first-class dashboard surface', () => {
  it('groups is a routable tab id', () => {
    const typesSource = read('types/UserDashboardTypes.ts');
    expect(typesSource).toMatch(/'home',\s*\n\s*'groups',/);
  });

  it('the tab bar shows Groups and the panels mount GroupsTab', () => {
    const barSource = read('components/UserDashboardTabBarV3.tsx');
    const tabsSource = read('components/UserDashboardTabsV3.tsx');
    expect(barSource).toContain("{ id: 'groups', label: 'Groups', Icon: Users }");
    expect(tabsSource).toContain('<TabPanel id="groups"');
    expect(tabsSource).toContain("lazy(() => import('./groups/GroupsTab'))");
  });

  it('Home mounts the Your-Groups strip (main-page visibility mandate)', () => {
    const homeSource = read('components/HomeTab.tsx');
    expect(homeSource).toContain('<HomeGroupsStrip />');
  });

  it('the group feed rides the shared stateful feed API via groupId', () => {
    const hookSource = read('../../hooks/social/useSocialFeed.ts');
    expect(hookSource).toContain('groupId');
    expect(hookSource).toContain('/api/social/groups/${groupId}/feed');
    const detailSource = read('components/groups/GroupDetail.tsx');
    expect(detailSource).toMatch(/useSocialFeed\(\{ groupId/);
    expect(detailSource).toContain('onLoadComments={feed.loadComments}');
  });
});

describe('level-up celebration wiring (2026-07-14)', () => {
  it('the realtime hook fires the CelebrationPortal instead of a toast on level_up', () => {
    const realtimeSource = read('../../hooks/gamification/useGamificationRealtime.ts');
    expect(realtimeSource).toContain('useCelebrationOptional');
    expect(realtimeSource).toContain('celebrationRef.current.triggerLevelUp(newLevel)');
  });

  it('the dashboard shell mounts the realtime subscription', () => {
    const shellSource = read('UserDashboard.V3.tsx');
    expect(shellSource).toContain('useGamificationRealtime()');
  });

  it('the rank pill renders gold segments with a celebrate beat', () => {
    const heroSource = read('components/ObservatoryCoverHero.tsx');
    expect(heroSource).toContain('<RankGoldSegment');
    expect(heroSource).toContain('$celebrating={isCelebrating}');
    const styleSource = read('components/ObservatoryRankPill.styles.ts');
    expect(styleSource).toContain('--accent-gold');
    expect(styleSource).toMatch(/prefers-reduced-motion: no-preference/);
    // Gold text must sit on an opaque dark surface (WCAG fix — no compositing
    // against a bright user cover photo).
    expect(styleSource).toMatch(/var\(--bg-base, #0A0A0F\) 92%, #000/);
  });

  it('celebration handler holds celebration in a ref (no socket churn on mute toggle)', () => {
    const realtimeSource = read('../../hooks/gamification/useGamificationRealtime.ts');
    expect(realtimeSource).toContain('celebrationRef.current');
    expect(realtimeSource).not.toMatch(/\}, \[queryClient, toast, user\?\.id, celebration\]\)/);
  });

  it('group feed is gated by canViewContent (no 403 error toast behind LockedPanel)', () => {
    const detailSource = read('components/groups/GroupDetail.tsx');
    expect(detailSource).toContain('enabled: Boolean(group?.canViewContent)');
    const hookSource = read('../../hooks/social/useSocialFeed.ts');
    expect(hookSource).toContain('isExpectedGroupLock');
  });

  it('GroupDetail remounts on group switch via key (no stale cross-group feed)', () => {
    const tabSource = read('components/groups/GroupsTab.tsx');
    expect(tabSource).toMatch(/key=\{selectedGroupId\}/);
  });

  it('moderation UI wires the pending-approval + transfer endpoints', () => {
    const railSource = read('components/groups/GroupMemberRail.tsx');
    expect(railSource).toContain('onApprove');
    expect(railSource).toContain('Make owner');
    const hookSource = read('../../hooks/social/useGroups.ts');
    expect(hookSource).toContain('transferOwnership');
    expect(hookSource).toContain('approveMember');
  });
});
