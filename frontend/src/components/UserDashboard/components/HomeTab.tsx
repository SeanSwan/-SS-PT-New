/**
 * FILE: HomeTab.tsx
 * PURPOSE: Source-of-truth Creator Observatory Home tab for /user-dashboard.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getTransformationPhotos } from './ObservatoryShellAdapter';
import { getTier, getTierDisplay } from '../../../types/gamification';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import { useFaction } from '../../../hooks/social/useFaction';
// O3 feed unification: ONE stateful feed mount powers the community stream,
// the Quick Post composer, the latest-post spotlight, and the live widgets.
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
import { useFeedEnrichment } from '../../../hooks/social/useFeedEnrichment';
import { useSubscription } from '../../../hooks/useSubscription';
import { useMessageSummary, useNotificationSummary, useWorkoutSessions } from '../../../hooks/useDashboardQueries';
import brandLogo from '../../../assets/Logo.png';
import type { ProfileStats, TabId } from '../types/UserDashboardTypes';
import type { FollowStats, SocialPost, UserProfile } from '../../../services/profileService';
import { sanitizeImageUrl } from '../../../utils/imageUrl';
import HomeDashboardSearchPanel from './HomeDashboardSearchPanel';
import DailyHealthLoop from './DailyHealthLoop';
import HomeTrainingCommandStrip from './HomeTrainingCommandStrip';
import SwanCoachActionLauncher from './SwanCoachActionLauncher';
import SwanCoachDock from './SwanCoachDock';
import { DockSkeleton } from './HomeTabActions.styles';
import { getPersonalLogWorkoutDashboardPath } from './swanCoachDashboardRoute';
import { USER_HOME_TRAINING_PROMPT, buildUserDashboardTeachCoachRoute } from '../UserDashboardTeachCoachRoute';
import HomeTabVisionCenter from './HomeTabVisionCenter';
import HomeTabVisionLeftRail from './HomeTabVisionLeftRail';
import HomeTabVisionRightRail from './HomeTabVisionRightRail';
import { buildSidebarQuickStats } from './UserDashboardSidebarV3';
import { useHomeTabLiveWidgets } from './useHomeTabLiveWidgets';
import { type VisionTarget } from './HomeTabVision.data';
import HomeTabTrainingProof from './HomeTabTrainingProof';
import useHomeComposer, { HOME_COMPOSER_ACCEPT } from './useHomeComposer';
import { useHomeNutritionAction } from './useHomeNutritionAction';
import { useHomeFeedFocusController } from './useHomeFeedFocusController';
import { assessStreakRisk, buildHomeTopBarActions, buildHomeTrainingProof, buildLatestPostView, normalizeHomePercent, normalizeHomeWholeNumber, parseUnreadNotificationCount, sumUnreadConversations, type HomeTopBarTarget } from './HomeTabViewModel';
import { CreatorPage, CreatorShell, Panel } from './HomeTabVision.styles';
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
  displayNameOverride,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile: gamProfile, levelProgress, leaderboard } = useGamificationData();
  // Workstream O: Faction War lives on Home now (sole mount post-Feed-unmount).
  const { factions } = useFaction();
  const { isElite, loading: subLoading } = useSubscription();
  const communityFeed = useSocialFeed();
  const { items: feedEnrichmentItems } = useFeedEnrichment({ limit: 5 });
  const notificationSummary = useNotificationSummary();
  // Messaging is elite-gated server-side - free tiers never poll it (402 by design).
  const messageSummary = useMessageSummary({
    enabled: isElite || user?.role === 'admin' || user?.role === 'trainer',
  });
  const [activeLens, setActiveLens] = useState('reels');
  const [searchOpen, setSearchOpen] = useState(false);
  const { feedFocus, clearFeedFocus, focusActivity, focusTrending } = useHomeFeedFocusController();
  const posts = communityFeed.posts;
  const displayName = displayNameOverride || user?.firstName || user?.username || 'SwanCreator';
  const topBarActions = useMemo(() => buildHomeTopBarActions({
    inboxUnread: sumUnreadConversations(messageSummary.data),
    notificationUnread: parseUnreadNotificationCount(notificationSummary.data),
  }), [messageSummary.data, notificationSummary.data]);
  const level = normalizeHomeWholeNumber(levelProgress?.level ?? gamProfile?.data?.level, 1, 1);
  const points = normalizeHomeWholeNumber(gamProfile?.data?.points, 0, 0);
  const progressPercent = normalizeHomePercent(levelProgress?.progressPercent ?? gamProfile?.data?.nextLevelProgress);
  const tierName = levelProgress?.tierDisplay?.name ?? getTierDisplay(getTier(level)).name;
  const streakDays = normalizeHomeWholeNumber(gamProfile?.data?.streakDays, 0, 0);
  const pointsToNext = normalizeHomeWholeNumber(levelProgress?.pointsNeededForNext ?? gamProfile?.data?.nextLevelPoints, 0, 0);
  const logWorkoutPath = getPersonalLogWorkoutDashboardPath();
  const nutritionAction = useHomeNutritionAction();
  const homeTrainingCoachPath = buildUserDashboardTeachCoachRoute(USER_HOME_TRAINING_PROMPT);
  const hasEliteAccess = isElite || user?.role === 'admin' || user?.role === 'trainer';
  // Workstream N4: real training proof from logged workout sessions.
  const workoutSessions = useWorkoutSessions({ limit: 50 });
  const trainingProof = useMemo(
    () => buildHomeTrainingProof(workoutSessions.data, Date.now()),
    [workoutSessions.data],
  );
  const quickStats = useMemo(() => buildSidebarQuickStats({
    displayStats: { ...displayStats, points, level },
    canonicalLevel: level,
    streakDays,
    progressPercent,
    pointsToNext,
    trainingProof,
  }), [displayStats, level, points, pointsToNext, progressPercent, streakDays, trainingProof]);
  // O3 streak rescue: live streak + no session today + evening = escalate.
  const streakAtRisk = useMemo(
    () => assessStreakRisk(workoutSessions.data, streakDays, Date.now()),
    [streakDays, workoutSessions.data],
  );
  // O3: Quick Post composer (extracted hook) - "Share my week" arms the
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

  const supportPanels = (
    <>
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
          nutritionAction={nutritionAction}
          onOpenNutrition={() => onTabChange('nutrition')}
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
    </>
  );
  const runAction = (target: VisionTarget) => {
    if (target === 'challenges') {
      // Challenges is a first-class dashboard tab post-merge (workstream N).
      onTabChange('challenges');
      return;
    }
    setActiveLens(target);
    onTabChange(target);
  };

  const runUtilityAction = (target: HomeTopBarTarget) => {
    if (target === 'search') {
      setSearchOpen(true);
      return;
    }
    if (target === 'messages') {
      navigate('/dashboard/client/messages');
      return;
    }
    onTabChange('notifications');
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
          points={points}
          activeLens={activeLens}
          postText={composer.postText}
          activeMood={composer.activeMood}
          selectedMediaName={composer.selectedMedia?.name}
          selectedMediaPreviewUrl={composer.selectedMediaPreviewUrl}
          selectedMediaType={composer.selectedMedia?.type}
          mediaError={composer.mediaError}
          communityFeed={communityFeed}
          quickStats={quickStats}
          supportPanels={supportPanels}
          feedEnrichmentItems={feedEnrichmentItems}
          feedFocus={feedFocus}
          proofAttached={composer.proofAttached}
          postIntentPreview={composer.postIntentPreview}
          latestPost={latestPostView}
          canPost={composer.canPost}
          isPosting={communityFeed.isCreatingPost}
          onAction={runAction}
          onUtilityAction={runUtilityAction}
          onSetMood={composer.setActiveMood}
          onAddMediaClick={() => composer.mediaInputRef.current?.click()}
          onClearMedia={composer.clearSelectedMedia}
          onPostTextChange={composer.setPostText}
          onSubmitPost={composer.submitPost}
          onClearFeedFocus={clearFeedFocus}
          topBarActions={topBarActions}
        />
        <HomeDashboardSearchPanel
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onTarget={(target) => {
            setSearchOpen(false);
            runAction(target);
          }}
          onNavigate={(path) => {
            setSearchOpen(false);
            navigate(path);
          }}
        />
        <input
          ref={composer.mediaInputRef}
          type="file"
          aria-label="Attach media to quick post"
          accept={HOME_COMPOSER_ACCEPT}
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
          onActivitySelect={focusActivity}
          onTrendingSelect={focusTrending}
        />
      </CreatorShell>
    </CreatorPage>
  );
};

export default HomeTab;
