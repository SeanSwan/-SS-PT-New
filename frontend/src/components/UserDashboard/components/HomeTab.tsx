/**
 * FILE: HomeTab.tsx
 * PURPOSE: Source-of-truth Creator Observatory Home tab for /user-dashboard.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import TodayTrainingModule from '../../DashBoard/shared/client-training/TodayTrainingModule';
import { clientTodayTrainingModuleEnabled } from '../../DashBoard/shared/client-training/todayTrainingFeatureFlag';
import { useCurrentClientWorkout } from '../../DashBoard/Pages/client-dashboard/observatory/useCurrentClientWorkout';
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
import HomeGroupsStrip from './groups/HomeGroupsStrip';
import useHomeComposer, { HOME_COMPOSER_ACCEPT } from './useHomeComposer';
import useDayBoundary, { dayClock } from '../hooks/useDayBoundary';
import { isDataKnown, resolveDataStatus } from '../hooks/resolveDataStatus';
import { useHomeNutritionAction } from './useHomeNutritionAction';
import {
  assessStreakRisk,
  buildHomeTopBarActions,
  buildHomeTrainingProof,
  buildLatestPostView,
  buildWeekTrainingDays,
  normalizeHomePercent,
  normalizeHomeWholeNumber,
  parseUnreadNotificationCount,
  sumUnreadConversations,
  type HomeTopBarTarget,
} from './HomeTabViewModel';
import { CreatorPage, CreatorShell, Panel } from './HomeTabVision.styles';
interface HomeTabProps {
  onTabChange: (tab: TabId) => void;
  profile: UserProfile | null;
  displayStats: ProfileStats;
  /** False when the profile-stats fetch failed and displayStats holds substituted zeros. */
  profileStatsKnown?: boolean;
  /** From the controller; HomeTab also resolves its own, this is the shell's view. */
  gamificationKnown?: boolean;
  profilePosts: SocialPost[];
  followStats: FollowStats | null;
  displayNameOverride: string;
  usernameOverride: string;
}
const HomeTab: React.FC<HomeTabProps> = ({
  onTabChange,
  profile,
  displayStats,
  profileStatsKnown = true,
  displayNameOverride,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentWorkoutState = useCurrentClientWorkout(user?.id);
  const todayTrainingEnabled = clientTodayTrainingModuleEnabled();
  const {
    profile: gamProfile,
    levelProgress,
    leaderboard,
    refetch: refetchGamification,
  } = useGamificationData();
  // The profile query owns level/XP/streak. When it fails, `levelProgress`
  // still resolves from a `?? 0` fallback — so the rail must be told, or it
  // reports Level 1 / 0 XP / 0 streak as if that were the member's record.
  // Uses the shared resolver: the hand-rolled `isError && !data` here read
  // FALSE for the whole pending window, which is exactly the hole this
  // workstream closed for sessions and left open for gamification.
  const gamificationStatus = resolveDataStatus(gamProfile);
  const gamificationUnavailable = !isDataKnown(gamificationStatus);
  // Workstream O: Faction War lives on Home now (sole mount post-Feed-unmount).
  const { factions } = useFaction();
  const { isElite, loading: subLoading } = useSubscription();
  const communityFeed = useSocialFeed();
  const { items: feedEnrichmentItems } = useFeedEnrichment({ limit: 8 });
  const notificationSummary = useNotificationSummary();
  // Messaging is elite-gated server-side - free tiers never poll it (402 by design).
  const messageSummary = useMessageSummary({
    enabled: isElite || user?.role === 'admin' || user?.role === 'trainer',
  });
  const [activeLens, setActiveLens] = useState('reels');
  const [searchOpen, setSearchOpen] = useState(false);
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
  // Recomputes at local midnight. Without it these memos hold the day they
  // first ran: an overnight tab kept yesterday's window, so the "(today)" ring
  // and its screen-reader label sat on the wrong day and a workout logged after
  // midnight lit no tile.
  const dayStart = useDayBoundary();
  const trainingProof = useMemo(
    () => buildHomeTrainingProof(workoutSessions.data, dayClock(dayStart)),
    [workoutSessions.data, dayStart],
  );
  // Trailing-7-day tiles come from real session dates, never from the streak
  // count — and the same failure gate as the proof card, so a fetch error
  // cannot render as seven "no workout logged" days.
  const weekTrainingDays = useMemo(
    () => buildWeekTrainingDays(workoutSessions.data, dayClock(dayStart)),
    [workoutSessions.data, dayStart],
  );
  // Never hand-roll this gate again — see resolveDataStatus for the three ways
  // it was got wrong. 'stale' matters here: a failed background refetch keeps
  // the cached list, which must still be shown but must offer a retry rather
  // than pass as current.
  const sessionsStatus = resolveDataStatus(workoutSessions);
  const sessionsKnown = isDataKnown(sessionsStatus);
  // buildHomeTrainingProof ALWAYS returns an object, so the `trainingProof ?`
  // guard inside buildSidebarQuickStats is dead on this path: the ticker
  // asserted "This Week 0 / Training Time 0m" through the whole pending window
  // and through any failure. Pass null until the record is actually known, and
  // the two tiles drop out instead of stating a zero.
  const quickStats = useMemo(() => buildSidebarQuickStats({
    displayStats: { ...displayStats, points, level },
    canonicalLevel: level,
    streakDays,
    progressPercent,
    pointsToNext,
    trainingProof: sessionsKnown ? trainingProof : null,
    profileStatsKnown,
    gamificationKnown: !gamificationUnavailable,
  }), [displayStats, level, points, pointsToNext, progressPercent, streakDays, trainingProof, sessionsKnown, gamificationUnavailable, profileStatsKnown]);
  // Rolling the window is not enough on its own: nothing else refetches (no
  // polling, no refetch-on-focus), so an overnight tab would slide to the new
  // day and still hold yesterday's session list — a workout logged at 00:30
  // would light no tile. Pull fresh sessions when the day actually changes.
  const refetchSessions = workoutSessions.refetch;
  const mountedDayRef = useRef(dayStart);
  useEffect(() => {
    if (mountedDayRef.current === dayStart) return;
    mountedDayRef.current = dayStart;
    void refetchSessions();
  }, [dayStart, refetchSessions]);

  // O3 streak rescue: live streak + no session today + evening = escalate.
  const streakAtRisk = useMemo(
    () => assessStreakRisk(workoutSessions.data, streakDays, dayClock(dayStart)),
    [streakDays, workoutSessions.data, dayStart],
  );
  // O3 Quick Post composer can attach the latest real workout-proof session.
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
        <HomeGroupsStrip />
      </Panel>
      <Panel>
        <HomeTabTrainingProof
          proof={trainingProof}
          sessionsStatus={sessionsStatus}
          onRetrySessions={() => { void workoutSessions.refetch(); }}
          onShareProgress={composer.handleShareProgress}
        />
      </Panel>

      <Panel>
        <DailyHealthLoop
          streakDays={streakDays}
          level={level}
          progressPercent={progressPercent}
          tierName={tierName}
          gamificationKnown={!gamificationUnavailable}
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
      {todayTrainingEnabled ? (
        <TodayTrainingModule state={currentWorkoutState} onNavigate={navigate} />
      ) : (
        <HomeTrainingCommandStrip
          coachPath={homeTrainingCoachPath}
          logWorkoutPath={logWorkoutPath}
          onNavigate={navigate}
          onProgress={() => onTabChange('progress')}
        />
      )}

      <CreatorShell>
        <HomeTabVisionLeftRail
          logoSrc={brandLogo}
          level={level}
          points={points}
          pointsToNext={pointsToNext}
          progressPercent={progressPercent}
          streakDays={streakDays}
          weekDays={weekTrainingDays}
          statsUnavailable={gamificationUnavailable}
          sessionsStatus={sessionsStatus}
          onRetryStats={refetchGamification}
          activeId={activeLens}
          onAction={runAction}
        />

        <HomeTabVisionCenter
          points={points}
          gamificationKnown={!gamificationUnavailable}
          activeLens={activeLens}
          postText={composer.postText}
          activeMood={composer.activeMood}
          selectedMediaName={composer.selectedMedia?.name}
          selectedMediaPreviewUrl={composer.selectedMediaPreviewUrl}
          selectedMediaType={composer.selectedMedia?.type}
          mediaError={composer.mediaError}
          quickStats={quickStats}
          communityFeed={communityFeed}
          supportPanels={supportPanels}
          feedEnrichmentItems={feedEnrichmentItems}
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
          gamificationKnown={!gamificationUnavailable}
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
    </CreatorPage>
  );
};

export default HomeTab;
