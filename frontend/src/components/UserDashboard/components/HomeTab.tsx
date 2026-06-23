/**
 * FILE: HomeTab.tsx
 * PURPOSE: Source-of-truth client dashboard Home tab for /user-dashboard.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
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
import { clampPercent } from './HomeTabVision.data';
import useHomeComposer from './useHomeComposer';
import {
  buildHomeTopBarActions,
  buildHomeTrainingProof,
  buildLatestPostView,
  parseUnreadNotificationCount,
  resolveHomeAvatarSrc,
  sumUnreadConversations,
} from './HomeTabViewModel';
import ClientDashboardHome from './ClientDashboardHome';
import type { ClientDashboardAction, ClientDashboardTarget } from './ClientDashboardHome.types';
import {
  buildAssignmentView,
  buildInsights,
  buildPerformanceScore,
  buildSessionPreview,
  buildTodaySnapshot,
  findClientRank,
} from './ClientDashboardHome.viewModel';
import { useCurrentClientWorkout } from '../../DashBoard/Pages/client-dashboard/observatory/useCurrentClientWorkout';
import { useUpcomingClientSession } from './useUpcomingClientSession';

interface HomeTabProps {
  onTabChange: (tab: TabId) => void;
  profile: UserProfile | null;
  displayStats: ProfileStats;
  profilePosts: SocialPost[];
  followStats: FollowStats | null;
  displayNameOverride: string;
  usernameOverride: string;
}

const featureWorkoutImage = '/images/parallax/video-library-bg.png';

const HomeTab: React.FC<HomeTabProps> = ({
  onTabChange,
  profile,
  displayNameOverride,
  usernameOverride,
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
  const upcomingSessionState = useUpcomingClientSession(user?.id);

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

  const level = levelProgress?.level ?? gamProfile?.data?.level ?? 1;
  const points = gamProfile?.data?.points ?? 0;
  const progressPercent = clampPercent(levelProgress?.progressPercent ?? gamProfile?.data?.nextLevelProgress);
  const tierName = levelProgress?.tierDisplay?.name ?? gamProfile?.data?.tier ?? 'Crystal Voyager';
  const streakDays = gamProfile?.data?.streakDays ?? 0;
  const pointsToNext = levelProgress?.pointsNeededForNext ?? gamProfile?.data?.nextLevelPoints ?? 0;
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

  const quickActions = useMemo<ClientDashboardAction[]>(() => [
    { label: 'Log Workout', path: logWorkoutPath },
    { label: 'Ask Coach', path: homeTrainingCoachPath },
    { label: 'View Progress', target: 'progress' },
    { label: 'Book Session', path: '/dashboard/client/schedule' },
  ], [homeTrainingCoachPath, logWorkoutPath]);

  const handleTarget = (target: ClientDashboardTarget) => {
    if (target === 'dashboard') onTabChange('home');
    if (target === 'progress') onTabChange('progress');
    if (target === 'nutrition') onTabChange('nutrition');
    if (target === 'challenges') onTabChange('challenges');
    if (target === 'notifications') onTabChange('notifications');
    if (target === 'profile') onTabChange('profile');
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
        topBarActions={topBarActions}
        quickActions={quickActions}
        todaySnapshot={todaySnapshot}
        assignment={assignment}
        sessionPreview={sessionPreview}
        trainingProof={trainingProof}
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
        mediaError={null}
        proofAttached={composer.proofAttached}
        postIntentLabel={composer.postIntentPreview?.label}
        postIntentTags={composer.postIntentPreview?.hashtags || []}
        canPost={composer.canPost}
        isPosting={communityFeed.isCreatingPost}
        onSetMood={composer.setActiveMood}
        onAddMediaClick={() => composer.mediaInputRef.current?.click()}
        onPostTextChange={composer.setPostText}
        onSubmitPost={composer.submitPost}
        onNavigate={navigate}
        onTarget={handleTarget}
        onShareProgress={shareProgress}
      />
      <input
        ref={composer.mediaInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={composer.handleMediaSelect}
        hidden
      />
    </>
  );
};

export default HomeTab;
