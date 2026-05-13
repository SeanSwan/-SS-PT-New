/**
 * FILE: HomeTab.tsx
 * PURPOSE: Source-of-truth Creator Observatory Home tab for /user-dashboard.
 */
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import { useSubscription } from '../../../hooks/useSubscription';
import {
  useCreatePost,
  useMessageSummary,
  useNotificationSummary,
  useSocialFeed,
} from '../../../hooks/useDashboardQueries';
import fallbackAvatar from '../../../assets/logo.svg';
import brandLogo from '../../../assets/Logo.png';
import type { ProfileStats, TabId } from '../types/UserDashboardTypes';
import type { FollowStats, SocialPost, UserProfile } from '../../../services/profileService';
import { sanitizeImageUrl } from '../../../utils/imageUrl';
import DailyHealthLoop from './DailyHealthLoop';
import SwanCoachActionLauncher from './SwanCoachActionLauncher';
import SwanCoachDock from './SwanCoachDock';
import { DockSkeleton } from './HomeTabActions.styles';
import { getLogWorkoutDashboardPath } from './swanCoachDashboardRoute';
import HomeTabVisionCenter from './HomeTabVisionCenter';
import HomeTabVisionLeftRail from './HomeTabVisionLeftRail';
import HomeTabVisionRightRail from './HomeTabVisionRightRail';
import { useHomeTabLiveWidgets } from './useHomeTabLiveWidgets';
import {
  clampPercent,
  compactNumber,
  MOBILE_NAV_ITEMS,
  QUICK_ACTIONS,
  type VisionTarget,
} from './HomeTabVision.data';
import {
  buildCreatorStats,
  buildHomePostPayload,
  buildHomeTopBarActions,
  parseUnreadNotificationCount,
  resolveHomeAvatarSrc,
  sumUnreadConversations,
} from './HomeTabViewModel';
import {
  CenterColumn,
  CreatorPage,
  CreatorShell,
  NextActionCopy,
  Panel,
  SupportShell,
} from './HomeTabVision.styles';
import {
  ButtonRow,
  GlassButton,
  MobileBottomNav,
  MobileNavButton,
} from './HomeTabVisionCards.styles';
interface HomeTabProps {
  onTabChange: (tab: TabId) => void;
  profile: UserProfile | null;
  displayStats: ProfileStats;
  profilePosts: SocialPost[];
  followStats: FollowStats | null;
  displayNameOverride: string;
  usernameOverride: string;
}
interface FeedPostPreview {
  content?: string;
  caption?: string;
  likesCount?: number;
  commentsCount?: number;
}
const HomeTab: React.FC<HomeTabProps> = ({
  onTabChange,
  profile,
  displayStats,
  profilePosts,
  followStats,
  displayNameOverride,
  usernameOverride,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile: gamProfile, levelProgress, leaderboard } = useGamificationData();
  const { isElite, loading: subLoading } = useSubscription();
  const feedQuery = useSocialFeed({ limit: 4 });
  const notificationSummary = useNotificationSummary();
  const messageSummary = useMessageSummary();
  const createPost = useCreatePost();
  const [postText, setPostText] = useState('');
  const [activeMood, setActiveMood] = useState('achievement');
  const [activeLens, setActiveLens] = useState('reels');
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const posts = useMemo(() => (Array.isArray(feedQuery.data) ? feedQuery.data : []), [feedQuery.data]);
  const latestPost = posts[0] as FeedPostPreview | undefined;
  const displayName = displayNameOverride || user?.firstName || user?.username || 'SwanCreator';
  const handle = `@${usernameOverride || user?.username || 'swancreator'}`;
  const avatarSrc = resolveHomeAvatarSrc({
    profilePhoto: sanitizeImageUrl(profile?.photo),
    authPhoto: sanitizeImageUrl(user?.profileImageUrl),
    fallbackAvatar,
  });
  const creatorStats = useMemo(() => buildCreatorStats({
    profileStats: displayStats,
    profilePosts,
    feedPosts: posts,
    followStats,
  }), [displayStats, followStats, posts, profilePosts]);
  const topBarActions = useMemo(() => buildHomeTopBarActions({
    inboxUnread: sumUnreadConversations(messageSummary.data),
    notificationUnread: parseUnreadNotificationCount(notificationSummary.data),
  }), [messageSummary.data, notificationSummary.data]);
  const level = levelProgress?.level ?? gamProfile?.data?.level ?? 1;
  const points = gamProfile?.data?.points ?? 0;
  const progressPercent = clampPercent(levelProgress?.progressPercent ?? gamProfile?.data?.nextLevelProgress);
  const tierName = levelProgress?.tierDisplay?.name ?? gamProfile?.data?.tier ?? 'Crystal Voyager';
  const streakDays = gamProfile?.data?.streakDays ?? 0;
  const pointsToNext = levelProgress?.pointsNeededForNext ?? gamProfile?.data?.nextLevelPoints ?? 0;
  const logWorkoutPath = getLogWorkoutDashboardPath(user?.role);
  const canPost = postText.trim().length >= 3 && !createPost.isPending;
  const hasEliteAccess = isElite || user?.role === 'admin' || user?.role === 'trainer';
  const latestCaption = latestPost?.caption || latestPost?.content || 'Discipline. Focus. Create. Keep the next move visible.';
  const liveWidgets = useHomeTabLiveWidgets({
    displayName,
    feedPosts: posts,
    achievements: gamProfile?.data?.achievements,
    leaderboard: leaderboard?.data,
    currentUserPoints: points,
  });

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] || null;
    setSelectedMedia(file);
    event.currentTarget.value = '';
  };

  const submitPost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canPost) return;
    await createPost.mutateAsync(buildHomePostPayload(postText, activeMood, selectedMedia));
    setPostText('');
    setSelectedMedia(null);
    setActiveLens('feed');
  };

  const runAction = (target: VisionTarget) => {
    if (target === 'log-workout') {
      navigate(logWorkoutPath);
      return;
    }
    if (target === 'schedule') {
      navigate('/dashboard/client/schedule');
      return;
    }
    if (target === 'reels') {
      navigate('/social/reels');
      return;
    }
    if (target === 'challenges') {
      navigate('/social/challenges');
      return;
    }
    setActiveLens(target);
    onTabChange(target);
  };

  return (
    <CreatorPage data-testid="creator-observatory-home">
      <CreatorShell>
        <HomeTabVisionLeftRail
          logoSrc={brandLogo}
          level={level}
          points={points}
          pointsToNext={pointsToNext}
          progressPercent={progressPercent}
          streakDays={streakDays}
          activeId={activeLens}
          onAction={runAction}
        />

        <HomeTabVisionCenter
          avatarSrc={avatarSrc}
          fallbackAvatarSrc={fallbackAvatar}
          displayName={displayName}
          handle={handle}
          tierName={tierName}
          level={level}
          points={points}
          postsCount={creatorStats.posts}
          followersCount={creatorStats.followers}
          followingCount={creatorStats.following}
          activeLens={activeLens}
          postText={postText}
          activeMood={activeMood}
          selectedMediaName={selectedMedia?.name}
          latestCaption={latestCaption}
          canPost={canPost}
          isPosting={createPost.isPending}
          onAction={runAction}
          onSetMood={setActiveMood}
          onAddMediaClick={() => mediaInputRef.current?.click()}
          onPostTextChange={setPostText}
          onSubmitPost={submitPost}
          topBarActions={topBarActions}
        />
        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleMediaSelect}
          hidden
        />

        <HomeTabVisionRightRail
          logoSrc={brandLogo}
          progressPercent={progressPercent}
          stories={liveWidgets.stories}
          liveActivityItems={liveWidgets.liveActivityItems}
          liveActivityConnected={liveWidgets.liveActivityConnected}
          activeChallenge={liveWidgets.activeChallenge}
          challengeLoading={liveWidgets.challengeLoading}
          badges={liveWidgets.badges}
          leaderboardRows={liveWidgets.leaderboardRows}
          trendingTags={liveWidgets.trendingTags}
          trendingLoading={liveWidgets.trendingLoading}
          onAction={runAction}
        />
      </CreatorShell>

      <SupportShell>
        <CenterColumn>
          <Panel>
            <DailyHealthLoop
              streakDays={streakDays}
              level={level}
              progressPercent={progressPercent}
              tierName={tierName}
              logWorkoutPath={logWorkoutPath}
              onTabChange={(tab) => onTabChange(tab as TabId)}
            />
          </Panel>

          {subLoading ? (
            <DockSkeleton aria-hidden="true" />
          ) : (
            <Panel>
              <SwanCoachDock
                isElite={hasEliteAccess}
                userName={displayName}
                userRole={user?.role}
                streakDays={streakDays}
                level={level}
                tierName={tierName}
                onTabChange={(tab) => onTabChange(tab as TabId)}
              />
              {hasEliteAccess && (
                <SwanCoachActionLauncher
                  userName={displayName}
                  userRole={user?.role}
                  streakDays={streakDays}
                  level={level}
                  onTabChange={(tab) => onTabChange(tab as TabId)}
                />
              )}
            </Panel>
          )}
        </CenterColumn>
        <Panel>
          <strong>Next Best Action</strong>
          <NextActionCopy>
            {compactNumber(points)} XP banked. Turn today into another visible proof point.
          </NextActionCopy>
          <ButtonRow>
            {QUICK_ACTIONS.map(({ id, label, Icon, target }) => (
              <GlassButton key={id} type="button" $variant="ghost" onClick={() => runAction(target)}>
                <Icon size={16} aria-hidden="true" />
                {label}
              </GlassButton>
            ))}
          </ButtonRow>
        </Panel>
      </SupportShell>

      <MobileBottomNav aria-label="Mobile dashboard navigation">
        {MOBILE_NAV_ITEMS.map(({ id, label, Icon, target }) => (
          <MobileNavButton key={id} type="button" $active={id === 'home'} onClick={() => runAction(target)}>
            <Icon size={18} aria-hidden="true" />
            {label}
          </MobileNavButton>
        ))}
      </MobileBottomNav>
    </CreatorPage>
  );
};

export default HomeTab;
