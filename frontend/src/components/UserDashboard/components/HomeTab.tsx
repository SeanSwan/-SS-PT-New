/**
 * FILE: HomeTab.tsx
 * PURPOSE: Source-of-truth Creator Observatory Home tab for /user-dashboard.
 */
import React, { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useSocialCoverBanner } from '../../Social/Feed/hooks/useSocialCoverBanner';
import UserDashboardBannerMediaLayer from './UserDashboardBannerMediaLayer';
import { getTransformationPhotos } from './ObservatoryShellAdapter';
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
  type VisionTarget,
} from './HomeTabVision.data';
import {
  buildCreatorStats,
  buildHomePostPayload,
  buildHomeTopBarActions,
  buildLatestPostView,
  parseUnreadNotificationCount,
  previewHomePostIntent,
  resolveHomeAvatarSrc,
  sumUnreadConversations,
} from './HomeTabViewModel';

// Workstream N3: the SAME embedded cover editor the feed tab uses — heavy
// profile machinery mounts only while editing.
const SocialCoverEditor = lazy(() => import('../../Social/Feed/components/SocialCoverEditor'));
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
  const { isElite, loading: subLoading } = useSubscription();
  const feedQuery = useSocialFeed({ limit: 4 });
  const notificationSummary = useNotificationSummary();
  // Messaging is elite-gated server-side — free tiers never poll it (402 by design).
  const messageSummary = useMessageSummary({
    enabled: isElite || user?.role === 'admin' || user?.role === 'trainer',
  });
  const createPost = useCreatePost();
  const [postText, setPostText] = useState('');
  const [activeMood, setActiveMood] = useState('achievement');
  const [activeLens, setActiveLens] = useState('reels');
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const posts = useMemo(() => (Array.isArray(feedQuery.data) ? feedQuery.data : []), [feedQuery.data]);
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
  // Workstream N2/N3: the identity header carries the user's REAL cover
  // composition (photo / collage / carousel / crossfade) — same machinery as
  // the feed cover studio. Null -> the decorative crystalline backdrop stays.
  // Closing the embedded editor bumps refreshKey so the cover refetches once.
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
  const [coverRefreshKey, setCoverRefreshKey] = useState(0);
  const coverBanner = useSocialCoverBanner(coverRefreshKey);
  const bannerLayer = coverBanner ? (
    <UserDashboardBannerMediaLayer
      backgroundImage={coverBanner.backgroundImage}
      bannerObjectPosition={coverBanner.bannerObjectPosition}
      bannerObjectFit={coverBanner.bannerObjectFit}
      bannerImageScale={coverBanner.bannerImageScale}
      bannerCollagePhotos={coverBanner.bannerCollagePhotos}
      bannerCollageLayout={coverBanner.bannerCollageLayout}
      bannerStickyCarousel={false}
    />
  ) : null;
  const latestPostView = useMemo(() => buildLatestPostView(posts, Date.now()), [posts]);
  const postIntentPreview = useMemo(
    () => (postText.trim().length >= 3 ? previewHomePostIntent(postText, activeMood) : null),
    [activeMood, postText],
  );
  const coverEditorSlot = coverEditorOpen ? (
    <Suspense fallback={null}>
      <SocialCoverEditor
        onClose={() => {
          setCoverEditorOpen(false);
          setCoverRefreshKey((key) => key + 1);
        }}
      />
    </Suspense>
  ) : null;
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
          bannerLayer={bannerLayer}
          onEditCover={() => setCoverEditorOpen((open) => !open)}
          coverEditorSlot={coverEditorSlot}
          postIntentPreview={postIntentPreview}
          latestPost={latestPostView}
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
          progressPercent={progressPercent}
          liveActivityItems={liveWidgets.liveActivityItems}
          liveActivityConnected={liveWidgets.liveActivityConnected}
          activeChallenge={liveWidgets.activeChallenge}
          challengeLoading={liveWidgets.challengeLoading}
          badges={liveWidgets.badges}
          leaderboardRows={liveWidgets.leaderboardRows}
          trendingTags={liveWidgets.trendingTags}
          trendingLoading={liveWidgets.trendingLoading}
          transformationPhotoUrls={transformationPhotoUrls}
          onAction={runAction}
          onLogWorkout={() => navigate(logWorkoutPath)}
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
