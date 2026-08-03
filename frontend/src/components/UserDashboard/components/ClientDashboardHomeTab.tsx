/**
 * FILE: ClientDashboardHomeTab.tsx
 * PURPOSE: Premium client-dashboard home adapter for /dashboard/client/overview.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import { getTier, getTierDisplay } from '../../../types/gamification';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
import { useSubscription } from '../../../hooks/useSubscription';
import { useMacroSummary } from '../../../hooks/useMacroSummary';
import {
  useMessageSummary,
  useNotificationSummary,
  useWorkoutSessions,
} from '../../../hooks/useDashboardQueries';
import fallbackAvatar from '../../../assets/logo.svg';
import brandLogo from '../../../assets/Logo.png';
import crystalSwan from '../../../assets/crystal-swan.png';
import type { ProfileStats, TabId } from '../types/UserDashboardTypes';
import type { FollowStats, SocialPost, UserProfile } from '../../../services/profileService';
import { sanitizeImageUrl } from '../../../utils/imageUrl';
import { getPersonalLogWorkoutDashboardPath } from './swanCoachDashboardRoute';
import {
  USER_HOME_TRAINING_PROMPT,
  buildUserDashboardTeachCoachRoute,
} from '../UserDashboardTeachCoachRoute';
import { useHomeTabLiveWidgets } from './useHomeTabLiveWidgets';
import useHomeComposer, { HOME_COMPOSER_ACCEPT } from './useHomeComposer';
import {
  buildHomeTopBarActions,
  buildHomeTrainingProof,
  buildLatestPostView,
  normalizeHomePercent,
  normalizeHomeWholeNumber,
  parseUnreadNotificationCount,
  resolveHomeAvatarSrc,
  sumUnreadConversations,
} from './HomeTabViewModel';
import ClientDashboardHome from './ClientDashboardHome';
import ClientProgramShelf from '../../DashBoard/Pages/client-dashboard/plan/ClientProgramShelf';
import RestoreCard from './RestoreToday/RestoreCard';
import MuscleReadinessCard from './MuscleReadiness/MuscleReadinessCard';
import TodayTrainingModule from '../../DashBoard/shared/client-training/TodayTrainingModule';
import { clientTodayTrainingModuleEnabled } from '../../DashBoard/shared/client-training/todayTrainingFeatureFlag';
import type { ClientDashboardAction, ClientDashboardTarget } from './ClientDashboardHome.types';
import {
  buildAssignmentView,
  buildInsights,
  buildPerformanceScore,
  buildSessionPreview,
  buildTodaySnapshot,
  findClientRank,
} from './ClientDashboardHome.viewModel';
import { canBookSwanStudiosSessions } from '../../DashBoard/Pages/client-dashboard/observatory/ClientObservatoryData';
import { useCurrentClientWorkout } from '../../DashBoard/Pages/client-dashboard/observatory/useCurrentClientWorkout';
import { useUpcomingClientSession } from './useUpcomingClientSession';

interface ClientDashboardHomeTabProps {
  onTabChange: (tab: TabId) => void;
  profile: UserProfile | null;
  displayStats: ProfileStats;
  profilePosts: SocialPost[];
  followStats: FollowStats | null;
  displayNameOverride: string;
  usernameOverride: string;
  embedded?: boolean;
  backgroundSettings?: React.ReactNode;
}

const featureWorkoutImage = '/images/parallax/video-library-bg.png';

const ClientDashboardHomeTab: React.FC<ClientDashboardHomeTabProps> = ({
  onTabChange,
  profile,
  displayNameOverride,
  usernameOverride,
  embedded = false,
  backgroundSettings,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile: gamProfile, levelProgress, leaderboard } = useGamificationData();
  const { isElite } = useSubscription();
  const { summary: macroSummary, loading: macroSummaryLoading } = useMacroSummary();
  const communityFeed = useSocialFeed();
  const notificationSummary = useNotificationSummary();
  const hasEliteAccess = isElite || user?.role === 'admin' || user?.role === 'trainer';
  const messageSummary = useMessageSummary({ enabled: hasEliteAccess });
  const workoutSessions = useWorkoutSessions({ limit: 50 });
  const currentWorkoutState = useCurrentClientWorkout(user?.id);
  const todayTrainingEnabled = clientTodayTrainingModuleEnabled();
  const upcomingSessionState = useUpcomingClientSession(user?.id);
  const canBookSessions = canBookSwanStudiosSessions((user as { clientSource?: string } | null | undefined)?.clientSource);

  const posts = communityFeed.posts;
  const displayName = displayNameOverride || user?.firstName || user?.username || 'Swan Member';
  const handle = `@${usernameOverride || user?.username || 'swanmember'}`;
  const avatarSrc = resolveHomeAvatarSrc({
    profilePhoto: sanitizeImageUrl(profile?.photo),
    authPhoto: sanitizeImageUrl(user?.profileImageUrl),
    fallbackAvatar,
  });

  const topBarActions = useMemo(() => buildHomeTopBarActions({
    inboxUnread: sumUnreadConversations(messageSummary.data),
    notificationUnread: parseUnreadNotificationCount(notificationSummary.data),
  }), [messageSummary.data, notificationSummary.data]);

  const level = normalizeHomeWholeNumber(levelProgress?.level ?? gamProfile?.data?.level, 1, 1);
  const points = normalizeHomeWholeNumber(gamProfile?.data?.points, 0, 0);
  const progressPercent = normalizeHomePercent(levelProgress?.progressPercent ?? gamProfile?.data?.nextLevelProgress);
  const tierName = levelProgress?.tierDisplay?.name ?? getTierDisplay(getTier(level)).name;
  const streakDays = normalizeHomeWholeNumber(gamProfile?.data?.streakDays, 0, 0);
  // "points to next unlock" must be the REMAINING distance, not the full level
  // span. pointsNeededForNext is the span; subtract how far into the level the
  // user already is (hostile-review data-truth fix). Fallback keeps the old
  // source when the precise levelProgress fields are unavailable.
  const pointsRemainingToNext =
    levelProgress != null
      ? Math.max(0, (levelProgress.pointsNeededForNext ?? 0) - (levelProgress.pointsIntoLevel ?? 0))
      : (gamProfile?.data?.nextLevelPoints ?? 0);
  const pointsToNext = normalizeHomeWholeNumber(pointsRemainingToNext, 0, 0);
  const logWorkoutPath = getPersonalLogWorkoutDashboardPath();
  const homeTrainingCoachPath = buildUserDashboardTeachCoachRoute(USER_HOME_TRAINING_PROMPT);

  const trainingProof = useMemo(
    () => buildHomeTrainingProof(workoutSessions.data, Date.now()),
    [workoutSessions.data],
  );

  const composer = useHomeComposer({
    createPost: communityFeed.createPost,
    isCreatingPost: communityFeed.isCreatingPost,
    latestSessionId: trainingProof.latestSessionId,
  });

  const latestPostView = useMemo(() => buildLatestPostView(posts, Date.now()), [posts]);
  const liveWidgets = useHomeTabLiveWidgets({
    displayName,
    feedPosts: posts,
    achievements: gamProfile?.data?.achievements,
    leaderboard: leaderboard?.data,
    currentUserPoints: points,
  });

  const todaySnapshot = useMemo(() => buildTodaySnapshot({
    sessions: workoutSessions.data,
    proof: trainingProof,
    macroSummary,
    macroLoading: macroSummaryLoading,
  }), [macroSummary, macroSummaryLoading, trainingProof, workoutSessions.data]);

  const assignment = useMemo(() => buildAssignmentView(currentWorkoutState), [currentWorkoutState]);
  const sessionPreview = useMemo(() => buildSessionPreview(upcomingSessionState), [upcomingSessionState]);
  const insights = useMemo(
    () => buildInsights(trainingProof, progressPercent, streakDays),
    [progressPercent, streakDays, trainingProof],
  );
  const performanceScore = useMemo(
    () => buildPerformanceScore(trainingProof, progressPercent, streakDays),
    [progressPercent, streakDays, trainingProof],
  );
  const rankLabel = useMemo(
    () => findClientRank(liveWidgets.leaderboardRows, points, displayName),
    [displayName, liveWidgets.leaderboardRows, points],
  );

  // Panel launch review 2026-08-03 (gap e): the quick action must carry the
  // assignment-aware route the viewmodel already computed — a bare
  // ?loadPlan=today drops assignmentKey/assignmentType and routes completed or
  // trainer-led days into the logger instead of history/schedule. Fall back to
  // the bare logger path only while the assignment is loading/absent/errored.
  const assignmentSettled = !assignment.loading && !assignment.error && !assignment.empty;
  const quickLogPath = assignmentSettled ? assignment.actionPath : logWorkoutPath;

  const quickActions = useMemo<ClientDashboardAction[]>(() => [
    { label: 'Log Workout', path: quickLogPath },
    { label: 'Ask Coach', path: homeTrainingCoachPath },
    { label: 'View Progress', target: 'progress' },
    { label: 'View Challenges', target: 'challenges' },
    ...(canBookSessions ? [{ label: 'Book Session', path: '/dashboard/client/schedule' }] : []),
  ], [canBookSessions, homeTrainingCoachPath, quickLogPath]);

  const handleTarget = (target: ClientDashboardTarget) => {
    if (target === 'dashboard') onTabChange('home');
    if (target === 'progress') onTabChange('progress');
    if (target === 'nutrition') onTabChange('nutrition');
    if (target === 'challenges') onTabChange('challenges');
    if (target === 'notifications') onTabChange('notifications');
    if (target === 'messages') navigate('/dashboard/client/messages');
    if (target === 'search') navigate('/dashboard/client/overview');
    if (target === 'profile') onTabChange('profile');
    if (target === 'support') navigate('/support');
    if (target === 'workouts') navigate('/dashboard/client/workouts');
    if (target === 'coach') navigate(homeTrainingCoachPath);
    if (target === 'sessions') navigate('/dashboard/client/schedule');
  };

  const shareProgress = () => {
    composer.handleShareProgress(
      trainingProof.shareLine || 'Building my SwanStudios progress one session at a time.',
    );
  };

  return (
    <>
      <ClientDashboardHome
        embedded={embedded}
        backgroundSettings={backgroundSettings}
        programShelf={(
          <>
            {todayTrainingEnabled && (
              <TodayTrainingModule state={currentWorkoutState} onNavigate={navigate} />
            )}
            <ClientProgramShelf
              userId={user?.id}
              workout={currentWorkoutState.workout}
              planVault={currentWorkoutState.planVault}
              loading={currentWorkoutState.loading}
              error={currentWorkoutState.error}
              showTodayAssignment={!todayTrainingEnabled}
              /* Today's session (absorbed from TodaysAssignmentCard). It resolves its
                 own actionPath, so the logger gets assignmentKey/assignmentType and a
                 completed session routes to history instead of re-logging. */
              assignment={assignment}
              onNavigate={navigate}
            />
            {/* Restore (off-day recovery ritual) — slot priority per Kimi H5:
                assignment card wins; Restore renders full only on off-days,
                a collapsed cooldown strip on training days (decided by API). */}
            <RestoreCard userId={user?.id} onNavigate={navigate} />
            {/* CC-1: read-only "Recovery estimate" board (training-log estimate; trainer decides).
                Quiet-degrades to nothing on error — never a broken-looking home. */}
            <MuscleReadinessCard userId={user?.id} />
          </>
        )}
        logoSrc={brandLogo}
        swanHeroSrc={crystalSwan}
        featureImageSrc={featureWorkoutImage}
        avatarSrc={avatarSrc}
        fallbackAvatarSrc={fallbackAvatar}
        displayName={displayName}
        handle={handle}
        tierName={tierName}
        level={level}
        points={points}
        rankLabel={rankLabel}
        streakDays={streakDays}
        progressPercent={progressPercent}
        pointsToNext={pointsToNext}
        hasEliteAccess={hasEliteAccess}
        canBookSessions={canBookSessions}
        topBarActions={topBarActions}
        quickActions={quickActions}
        todaySnapshot={todaySnapshot}
        assignment={assignment}
        sessionPreview={sessionPreview}
        trainingProof={trainingProof}
        workoutHistorySettled={!workoutSessions.isLoading}
        insights={insights}
        performanceScore={performanceScore}
        macroSummary={macroSummary}
        macroLoading={macroSummaryLoading}
        activeChallenge={liveWidgets.activeChallenge}
        challengeLoading={liveWidgets.challengeLoading}
        badges={liveWidgets.badges}
        leaderboardRows={liveWidgets.leaderboardRows}
        trendingTags={liveWidgets.trendingTags}
        trendingLoading={liveWidgets.trendingLoading}
        liveActivityItems={liveWidgets.liveActivityItems}
        liveActivityConnected={liveWidgets.liveActivityConnected}
        latestPost={latestPostView}
        feedPosts={posts}
        feedLoading={communityFeed.isLoading}
        feedError={communityFeed.error}
        postText={composer.postText}
        activeMood={composer.activeMood}
        selectedMediaName={composer.selectedMedia?.name}
        selectedMediaPreviewUrl={composer.selectedMediaPreviewUrl}
        selectedMediaType={composer.selectedMedia?.type}
        mediaError={composer.mediaError}
        proofAttached={composer.proofAttached}
        postIntentLabel={composer.postIntentPreview?.label}
        postIntentTags={composer.postIntentPreview?.hashtags || []}
        canPost={composer.canPost}
        isPosting={communityFeed.isCreatingPost}
        onSetMood={composer.setActiveMood}
        onAddMediaClick={() => composer.mediaInputRef.current?.click()}
        onClearMedia={composer.clearSelectedMedia}
        onPostTextChange={composer.setPostText}
        onSubmitPost={composer.submitPost}
        onNavigate={navigate}
        onTarget={handleTarget}
        onShareProgress={shareProgress}
      />
      <input
        ref={composer.mediaInputRef}
        type="file"
        aria-label="Attach media to quick post"
        accept={HOME_COMPOSER_ACCEPT}
        onChange={composer.handleMediaSelect}
        hidden
      />
    </>
  );
};

export default ClientDashboardHomeTab;
