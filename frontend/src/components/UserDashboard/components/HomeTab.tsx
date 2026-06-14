/**
 * FILE: HomeTab.tsx
 * PURPOSE: Source-of-truth Creator Observatory Home tab for /user-dashboard.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useHomeCoverBanner } from './useHomeCoverBanner';
import { getTransformationPhotos } from './ObservatoryShellAdapter';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import { useFaction } from '../../../hooks/social/useFaction';
// O3 feed unification: ONE stateful feed mount powers the community stream,
// the Quick Post composer, the latest-post spotlight, and the live widgets.
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
import { useSubscription } from '../../../hooks/useSubscription';
import {
  useMessageSummary,
  useNotificationSummary,
  useWorkoutSessions,
} from '../../../hooks/useDashboardQueries';
import fallbackAvatar from '../../../assets/logo.svg';
import brandLogo from '../../../assets/Logo.png';
import type { ProfileStats, TabId } from '../types/UserDashboardTypes';
import type { FollowStats, SocialPost, UserProfile } from '../../../services/profileService';
import { sanitizeImageUrl } from '../../../utils/imageUrl';
import DailyHealthLoop from './DailyHealthLoop';
import HomeTrainingCommandStrip from './HomeTrainingCommandStrip';
import SwanCoachActionLauncher from './SwanCoachActionLauncher';
import SwanCoachDock from './SwanCoachDock';
import { DockSkeleton } from './HomeTabActions.styles';
import { getPersonalLogWorkoutDashboardPath } from './swanCoachDashboardRoute';
import {
  USER_HOME_TRAINING_PROMPT,
  buildUserDashboardTeachCoachRoute,
} from '../UserDashboardTeachCoachRoute';
import HomeTabVisionCenter from './HomeTabVisionCenter';
import HomeTabVisionLeftRail from './HomeTabVisionLeftRail';
import HomeTabVisionRightRail from './HomeTabVisionRightRail';
import { useHomeTabLiveWidgets } from './useHomeTabLiveWidgets';
import {
  clampPercent,
  type VisionTarget,
} from './HomeTabVision.data';
import HomeTabTrainingProof from './HomeTabTrainingProof';
import useHomeComposer from './useHomeComposer';
import {
  assessStreakRisk,
  buildCreatorStats,
  buildHomeTopBarActions,
  buildHomeTrainingProof,
  buildLatestPostView,
  parseUnreadNotificationCount,
  resolveHomeAvatarSrc,
  sumUnreadConversations,
} from './HomeTabViewModel';
import {
  CenterColumn,
  CreatorPage,
  CreatorShell,
  Panel,
  SupportShell,
} from './HomeTabVision.styles';
interface HomeTabProps {
  onTabChange: (tab: TabId) => void;
  profile: UserProfile | null;
  displayStats: ProfileStats;
  profilePosts: SocialPost[];
  followStats: FollowStats | null;
  displayNameOverride: string;
  usernameOverride: string;
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
  // Workstream O: Faction War lives on Home now (sole mount post-Feed-unmount).
  const { factions } = useFaction();
  const { isElite, loading: subLoading } = useSubscription();
  const communityFeed = useSocialFeed();
  const notificationSummary = useNotificationSummary();
  // Messaging is elite-gated server-side — free tiers never poll it (402 by design).
  const messageSummary = useMessageSummary({
    enabled: isElite || user?.role === 'admin' || user?.role === 'trainer',
  });
  const [activeLens, setActiveLens] = useState('reels');
  const posts = communityFeed.posts;
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
  const logWorkoutPath = getPersonalLogWorkoutDashboardPath();
  const homeTrainingCoachPath = buildUserDashboardTeachCoachRoute(USER_HOME_TRAINING_PROMPT);
  const hasEliteAccess = isElite || user?.role === 'admin' || user?.role === 'trainer';
  // Workstream N2/N3: the header's REAL cover + embedded editor (extracted hook).
  const { bannerLayer, coverEditorSlot, toggleCoverEditor } = useHomeCoverBanner();
  // Workstream N4: real training proof from logged workout sessions.
  const workoutSessions = useWorkoutSessions({ limit: 50 });
  const trainingProof = useMemo(
    () => buildHomeTrainingProof(workoutSessions.data, Date.now()),
    [workoutSessions.data],
  );
  // O3 streak rescue: live streak + no session today + evening = escalate.
  const streakAtRisk = useMemo(
    () => assessStreakRisk(workoutSessions.data, streakDays, Date.now()),
    [streakDays, workoutSessions.data],
  );
  // O3: Quick Post composer (extracted hook) — "Share my week" arms the
  // workout-proof attachment with the latest REAL session link.
  const composer = useHomeComposer({
    createPost: communityFeed.createPost,
    isCreatingPost: communityFeed.isCreatingPost,
    latestSessionId: trainingProof.latestSessionId,
  });
  const latestPostView = useMemo(() => buildLatestPostView(posts, Date.now()), [posts]);
  const transformationPhotoUrls = useMemo(
    () => getTransformationPhotos(profile as unknown as Record<string, unknown> | null)
      .map((photo) => sanitizeImageUrl(photo.url))
      .filter((url): url is string => !!url),
    [profile],
  );
  const liveWidgets = useHomeTabLiveWidgets({
    displayName,
    feedPosts: posts,
    achievements: gamProfile?.data?.achievements,
    leaderboard: leaderboard?.data,
    currentUserPoints: points,
  });

  const runAction = (target: VisionTarget) => {
    if (target === 'challenges') {
      // Challenges is a first-class dashboard tab post-merge (workstream N).
      onTabChange('challenges');
      return;
    }
    setActiveLens(target);
    onTabChange(target);
  };

  return (
    <CreatorPage data-testid="creator-observatory-home">
      <HomeTrainingCommandStrip
        coachPath={homeTrainingCoachPath}
        logWorkoutPath={logWorkoutPath}
        onNavigate={navigate}
        onProgress={() => onTabChange('progress')}
      />

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
          postText={composer.postText}
          activeMood={composer.activeMood}
          selectedMediaName={composer.selectedMedia?.name}
          communityFeed={communityFeed}
          proofAttached={composer.proofAttached}
          bannerLayer={bannerLayer}
          onEditCover={toggleCoverEditor}
          coverEditorSlot={coverEditorSlot}
          postIntentPreview={composer.postIntentPreview}
          latestPost={latestPostView}
          canPost={composer.canPost}
          isPosting={communityFeed.isCreatingPost}
          onAction={runAction}
          onSetMood={composer.setActiveMood}
          onAddMediaClick={() => composer.mediaInputRef.current?.click()}
          onPostTextChange={composer.setPostText}
          onSubmitPost={composer.submitPost}
          topBarActions={topBarActions}
        />
        <input
          ref={composer.mediaInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={composer.handleMediaSelect}
          hidden
        />

        <HomeTabVisionRightRail
          progressPercent={progressPercent}
          liveActivityItems={liveWidgets.liveActivityItems}
          liveActivityConnected={liveWidgets.liveActivityConnected}
          activeChallenge={liveWidgets.activeChallenge}
          challengeLoading={liveWidgets.challengeLoading}
          badges={liveWidgets.badges}
          leaderboardRows={liveWidgets.leaderboardRows}
          trendingTags={liveWidgets.trendingTags}
          trendingLoading={liveWidgets.trendingLoading}
          factions={factions}
          transformationPhotoUrls={transformationPhotoUrls}
          streakAtRisk={streakAtRisk}
          streakDays={streakDays}
          onAction={runAction}
          onLogWorkout={() => navigate(logWorkoutPath)}
        />
      </CreatorShell>

      <SupportShell>
        <CenterColumn>
          {/* Workstream N4: the Product Core Loop on Home — real progress
              proof from logged workouts, one tap from a shareable post. */}
          <Panel>
            <HomeTabTrainingProof
              proof={trainingProof}
              onShareProgress={composer.handleShareProgress}
            />
          </Panel>

          <Panel>
            <DailyHealthLoop
              streakDays={streakDays}
              level={level}
              progressPercent={progressPercent}
              tierName={tierName}
              logWorkoutPath={logWorkoutPath}
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
              />
              {hasEliteAccess && (
                <SwanCoachActionLauncher
                  userName={displayName}
                  userRole={user?.role}
                  streakDays={streakDays}
                  level={level}
                />
              )}
            </Panel>
          )}
        </CenterColumn>
      </SupportShell>
    </CreatorPage>
  );
};

export default HomeTab;
